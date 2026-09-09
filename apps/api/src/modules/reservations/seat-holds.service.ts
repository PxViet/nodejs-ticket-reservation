import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { NOT_BOOKABLE_STATUSES, UNIQUE_VIOLATION } from '../../common/constant';
import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import { Seat } from '../showtimes/entities/seat.entity';
import { Showtime } from '../showtimes/entities/showtime.entity';
import { ShowtimeStatus } from '../showtimes/enums/showtime-status.enum';
import type {
  ActiveSeatHoldResponseDto,
  CreateSeatHoldDto,
  HoldSeatsResponseDto,
  SeatHoldQueryDto,
} from './dto/seat-hold.dto';
import { SeatHold } from './entities/seat-hold.entity';
import { SeatHoldStatus } from './enums/seat-hold-status.enum';

@Injectable()
export class SeatHoldsService {
  constructor(
    @InjectRepository(SeatHold)
    private readonly seatHolds: Repository<SeatHold>,
    @InjectRepository(Showtime)
    private readonly showtimes: Repository<Showtime>,
    @InjectRepository(Seat)
    private readonly seats: Repository<Seat>,
  ) {}

  // ADR-007: the partial unique index uq_seat_hold_active is the actual
  // overbooking guarantee — this method just gets a well-formed INSERT to it
  // and translates the 23505 a losing concurrent request gets back.
  async holdSeats(
    showtimeId: string,
    { seatIds }: CreateSeatHoldDto,
    userId: string,
  ): Promise<HoldSeatsResponseDto> {
    const showtime = await this.showtimes.findOne({
      where: { id: showtimeId },
    });

    if (!showtime) {
      throw new NotFoundException(`Showtime with id ${showtimeId} not found`);
    }

    this.assertBookable(showtime.status);

    const seats = await this.seats.find({
      where: { id: In(seatIds), hallId: showtime.hallId, isActive: true },
    });

    if (seats.length !== seatIds.length) {
      throw new BadRequestException(
        "One or more seats do not exist in this showtime's hall",
      );
    }

    const seatLabelsById = new Map(
      seats.map((seat) => [seat.id, seat.seatLabel]),
    );

    try {
      const holds = await this.seatHolds.manager.transaction(async (manager) =>
        manager.save(
          SeatHold,
          seatIds.map((seatId) =>
            manager.create(SeatHold, { showtimeId, seatId, userId }),
          ),
        ),
      );

      return {
        holds: holds.map(({ id, seatId, status, heldUntil }) => ({
          id,
          seatId,
          seatLabel: seatLabelsById.get(seatId)!,
          showtimeId,
          status,
          heldUntil,
        })),
      };
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new AppException(
          ErrorCode.SEAT_UNAVAILABLE,
          'One or more selected seats are no longer available',
          HttpStatus.CONFLICT,
        );
      }
      throw error;
    }
  }

  // The 60s expiry sweep (BR-27) may not have run yet, so heldUntil is
  // re-checked here rather than trusting status alone — same reasoning as
  // the re-check inside confirmReservation (DDR-002).
  async findMyActiveHolds(
    userId: string,
    { page, limit, skip, showtimeId }: SeatHoldQueryDto,
  ): Promise<PaginatedResponseDto<ActiveSeatHoldResponseDto>> {
    const qb = this.seatHolds
      .createQueryBuilder('h')
      .where('h.userId = :userId', { userId })
      .andWhere('h.status = :status', { status: SeatHoldStatus.HELD })
      .andWhere('h.heldUntil > :now', { now: new Date() })
      .orderBy('h.createdAt', 'ASC')
      .skip(skip)
      .take(limit);

    if (showtimeId) {
      qb.andWhere('h.showtimeId = :showtimeId', { showtimeId });
    }

    const [holds, total] = await qb.getManyAndCount();

    if (holds.length === 0) {
      return { data: [], meta: { page, limit, total, hasMore: false } };
    }

    const seats = await this.seats.find({
      where: { id: In(holds.map((hold) => hold.seatId)) },
    });
    const seatLabelsById = new Map(
      seats.map((seat) => [seat.id, seat.seatLabel]),
    );

    const showtimeIds = [...new Set(holds.map((hold) => hold.showtimeId))];
    const showtimes = await this.showtimes.find({
      where: { id: In(showtimeIds) },
    });
    const priceByShowtimeId = new Map(
      showtimes.map((showtime) => [showtime.id, showtime.basePrice]),
    );

    const data = holds.map(({ id, seatId, showtimeId, status, heldUntil }) => ({
      id,
      seatId,
      seatLabel: seatLabelsById.get(seatId)!,
      showtimeId,
      status,
      heldUntil,
      price: priceByShowtimeId.get(showtimeId)!,
    }));

    return {
      data,
      meta: { page, limit, total, hasMore: skip + holds.length < total },
    };
  }

  // ADR-008: HELD's only voluntary exit is RELEASED. Locked with
  // pessimistic_write first (DDR-002's order) to avoid racing a concurrent
  // confirmReservation call over the same hold.
  async releaseHold(id: string, userId: string): Promise<void> {
    await this.seatHolds.manager.transaction(async (manager) => {
      const hold = await manager
        .getRepository(SeatHold)
        .createQueryBuilder('h')
        .setLock('pessimistic_write')
        .where('h.id = :id', { id })
        .getOne();

      if (!hold) {
        throw new NotFoundException(`Seat hold with id ${id} not found`);
      }

      if (hold.userId !== userId) {
        throw new AppException(
          ErrorCode.SEAT_HOLD_NOT_OWNED,
          'This seat hold does not belong to you',
          HttpStatus.FORBIDDEN,
        );
      }

      if (hold.status !== SeatHoldStatus.HELD) {
        throw new BadRequestException('This seat hold is not currently held');
      }

      await manager.update(SeatHold, id, { status: SeatHoldStatus.RELEASED });
    });
  }

  private assertBookable(status: ShowtimeStatus): void {
    if (NOT_BOOKABLE_STATUSES.has(status)) {
      throw new AppException(
        ErrorCode.SHOWTIME_NOT_BOOKABLE,
        `A ${status} showtime cannot be booked`,
        HttpStatus.CONFLICT,
      );
    }
  }
}
