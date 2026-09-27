import {
  BadRequestException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, Repository } from 'typeorm';

import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import { dateTimeToInstant } from '../../common/utils/time.util';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Seat } from '../showtimes/entities/seat.entity';
import { Showtime } from '../showtimes/entities/showtime.entity';
import { UserRole } from '../users/enums/user-role.enum';
import type {
  ReservationListQueryDto,
  ReservationResponseDto,
  ReservationSummaryResponseDto,
  TicketResponseDto,
} from './dto/reservation.dto';
import { Reservation } from './entities/reservation.entity';
import { SeatHold } from './entities/seat-hold.entity';
import { Ticket } from './entities/ticket.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { SeatHoldStatus } from './enums/seat-hold-status.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import {
  generateReservationNumber,
  generateTicketNumber,
  reservationSuffix,
} from './utils/reference-number.util';

type TicketWithLabel = Ticket & { seatLabel: string };

export interface ConfirmHoldsParams {
  holdIds: string[];
  userId: string;
  showtimeId: string;
  /** What each ticket was actually charged — the payment's amount per seat (DDR-025). */
  unitPrice: number;
}

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservations: Repository<Reservation>,
  ) {}

  // DDR-002: lock the holds, re-validate them, then write — fixed order, on
  // the caller's transaction. Since ADR-018 the only caller is
  // CheckoutService.finalize, which has already locked the payment row and
  // commits the reservation together with the payment it settles (DDR-025).
  // This only ever updates existing seat_holds rows (never inserts), so a
  // 23505 here can only be a reservation_number or ticket_number collision
  // (DDR-004) — the caller retries the whole transaction with
  // withUniViolentRetry, which regenerates both.
  async confirmHolds(
    manager: EntityManager,
    { holdIds, userId, showtimeId, unitPrice }: ConfirmHoldsParams,
  ): Promise<ReservationResponseDto> {
    const holds = await manager
      .getRepository(SeatHold)
      .createQueryBuilder('h')
      .setLock('pessimistic_write')
      .where('h.id IN (:...ids)', { ids: holdIds })
      .andWhere('h.userId = :userId', { userId })
      .getMany();

    if (holds.length !== holdIds.length) {
      throw new AppException(
        ErrorCode.SEAT_HOLD_NOT_OWNED,
        'One or more holds do not belong to you',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      holds.some(
        (hold) =>
          hold.status !== SeatHoldStatus.HELD || hold.heldUntil < new Date(),
      )
    ) {
      throw new AppException(
        ErrorCode.SEAT_HOLD_EXPIRED,
        'One or more holds are no longer held',
        HttpStatus.CONFLICT,
      );
    }

    // Every hold must be for the showtime the payment was priced against.
    if (holds.some((hold) => hold.showtimeId !== showtimeId)) {
      throw new BadRequestException(
        'All holds in a reservation must belong to the same showtime',
      );
    }

    const seats = await manager.getRepository(Seat).find({
      where: { id: In(holds.map((hold) => hold.seatId)) },
    });

    const seatLabelsById = new Map(
      seats.map((seat) => [seat.id, seat.seatLabel]),
    );

    const reservationNumber = generateReservationNumber();

    const suffix = reservationSuffix(reservationNumber);

    const reservation = await manager.save(
      Reservation,
      manager.create(Reservation, {
        reservationNumber,
        userId,
        showtimeId,
        status: ReservationStatus.CONFIRMED,
      }),
    );

    // BR-31: reservation and its tickets land in the same transaction —
    // holdIds is validated non-empty by the DTO, so never zero tickets.
    const tickets = await manager.save(
      Ticket,
      holds.map((hold, index) =>
        manager.create(Ticket, {
          reservationId: reservation.id,
          seatId: hold.seatId,
          ticketNumber: generateTicketNumber(suffix, index + 1),
          price: unitPrice,
          status: TicketStatus.VALID,
        }),
      ),
    );

    await manager.update(
      SeatHold,
      { id: In(holdIds) },
      { status: SeatHoldStatus.CONFIRMED, reservationId: reservation.id },
    );

    const ticketsWithLabel: TicketWithLabel[] = tickets.map((ticket) => ({
      ...ticket,
      seatLabel: seatLabelsById.get(ticket.seatId)!,
    }));

    return this.toResponse(reservation, ticketsWithLabel);
  }

  async findMine(
    userId: string,
    { page, limit, skip, status }: ReservationListQueryDto,
  ): Promise<PaginatedResponseDto<ReservationSummaryResponseDto>> {
    const qb = this.reservations
      .createQueryBuilder('reservation')
      .leftJoinAndSelect('reservation.tickets', 'tickets')
      .where('reservation.userId = :userId', { userId })
      .orderBy('reservation.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('reservation.status = :status', { status });
    }

    const [reservations, total] = await qb.getManyAndCount();

    return {
      data: reservations.map((reservation) => this.toSummary(reservation)),
      meta: {
        page,
        limit,
        total,
        hasMore: skip + reservations.length < total,
      },
    };
  }

  // BR-34: the owner can always read their own reservation; an admin can
  // read any reservation but does not gain the ability to act as its owner.
  async findOne(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.findWithTickets(id);

    if (
      reservation.userId !== currentUser.id &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('This reservation does not belong to you');
    }

    return this.toResponse(
      reservation,
      reservation.tickets.map((ticket) => ({
        ...ticket,
        seatLabel: ticket.seat.seatLabel,
      })),
    );
  }

  // BR-34/docs: owner-only, no admin override — unlike findOne above.
  async cancel(id: string, userId: string): Promise<ReservationResponseDto> {
    return this.reservations.manager.transaction(async (manager) => {
      const reservation = await manager.findOne(Reservation, {
        where: { id },
        relations: { showtime: true, tickets: { seat: true } },
      });

      if (!reservation) {
        throw new NotFoundException(`Reservation with id ${id} not found`);
      }
      if (reservation.userId !== userId) {
        throw new ForbiddenException('This reservation does not belong to you');
      }

      this.assertCancellable(reservation);

      await manager.update(Reservation, id, {
        status: ReservationStatus.CANCELLED,
      });

      // ADR-008: CONFIRMED holds' only legal exit is RELEASED — this is what
      // actually frees the seats uq_seat_hold_active was blocking on.
      await manager.update(
        SeatHold,
        { reservationId: id, status: SeatHoldStatus.CONFIRMED },
        { status: SeatHoldStatus.RELEASED },
      );

      await manager.update(
        Ticket,
        { reservationId: id, status: TicketStatus.VALID },
        { status: TicketStatus.CANCELLED },
      );

      const ticketsWithLabel: TicketWithLabel[] = reservation.tickets.map(
        (ticket) => ({
          ...ticket,
          status: TicketStatus.CANCELLED,
          seatLabel: ticket.seat.seatLabel,
        }),
      );

      return this.toResponse(
        { ...reservation, status: ReservationStatus.CANCELLED },
        ticketsWithLabel,
      );
    });
  }

  private async findWithTickets(
    id: string,
  ): Promise<Reservation & { tickets: (Ticket & { seat: Seat })[] }> {
    const reservation = await this.reservations.findOne({
      where: { id },
      relations: { tickets: { seat: true } },
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with id ${id} not found`);
    }

    return reservation;
  }

  // BR-29: a reservation may be cancelled only while its showtime is still
  // upcoming. BR-24: only a currently CONFIRMED reservation may move at all.
  private assertCancellable(
    reservation: Reservation & { showtime: Showtime },
  ): void {
    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new AppException(
        ErrorCode.RESERVATION_NOT_CANCELLABLE,
        'Only a confirmed reservation can be cancelled',
        HttpStatus.CONFLICT,
      );
    }

    const { showDate, showTime } = reservation.showtime;
    if (dateTimeToInstant(showDate, showTime) <= new Date()) {
      throw new AppException(
        ErrorCode.RESERVATION_NOT_CANCELLABLE,
        'This showtime has already started',
        HttpStatus.CONFLICT,
      );
    }
  }

  private toResponse(
    reservation: Reservation,
    tickets: TicketWithLabel[],
  ): ReservationResponseDto {
    const ticketDtos = tickets.map((ticket) => this.toTicketResponse(ticket));

    return {
      id: reservation.id,
      reservationNumber: reservation.reservationNumber,
      userId: reservation.userId,
      showtimeId: reservation.showtimeId,
      status: reservation.status,
      tickets: ticketDtos,
      totalSeats: ticketDtos.length,
      totalAmount: ticketDtos.reduce((sum, ticket) => sum + ticket.price, 0),
      createdAt: reservation.createdAt,
    };
  }

  private toTicketResponse(ticket: TicketWithLabel): TicketResponseDto {
    const { id, seatId, seatLabel, ticketNumber, price, status } = ticket;
    return { id, seatId, seatLabel, ticketNumber, price, status };
  }

  private toSummary(
    reservation: Reservation & { tickets: Ticket[] },
  ): ReservationSummaryResponseDto {
    const { id, reservationNumber, showtimeId, status, tickets, createdAt } =
      reservation;

    return {
      id,
      reservationNumber,
      showtimeId,
      status,
      totalSeats: tickets.length,
      totalAmount: tickets.reduce((sum, ticket) => sum + ticket.price, 0),
      createdAt,
    };
  }
}
