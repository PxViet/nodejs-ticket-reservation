import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, In } from 'typeorm';

import { ErrorCode } from '../../common/exceptions/error-codes';
import { Seat } from '../showtimes/entities/seat.entity';
import { Showtime } from '../showtimes/entities/showtime.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { Reservation } from './entities/reservation.entity';
import { SeatHold } from './entities/seat-hold.entity';
import { Ticket } from './entities/ticket.entity';
import { ReservationStatus } from './enums/reservation-status.enum';
import { SeatHoldStatus } from './enums/seat-hold-status.enum';
import { TicketStatus } from './enums/ticket-status.enum';
import { ReservationsService } from './reservations.service';

function mockSeatHoldQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  for (const method of ['setLock', 'where', 'andWhere']) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue([]);
  return qb;
}

function mockManager(seatHoldQb: ReturnType<typeof mockSeatHoldQueryBuilder>) {
  return {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === SeatHold) {
        return { createQueryBuilder: jest.fn().mockReturnValue(seatHoldQb) };
      }
      if (entity === Seat) {
        return { find: jest.fn().mockResolvedValue([]) };
      }
      throw new Error(`unexpected getRepository(${String(entity)})`);
    }),
    findOneOrFail: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((_entity: unknown, data: unknown) => data),
    save: jest.fn((_entity: unknown, data: unknown) => {
      if (Array.isArray(data)) {
        return Promise.resolve(
          (data as Record<string, unknown>[]).map((row, index) => ({
            id: `ticket-${index}`,
            createdAt: new Date('2026-01-01T00:00:00Z'),
            ...row,
          })),
        );
      }
      return Promise.resolve({
        id: 'res-1',
        createdAt: new Date('2026-01-01T00:00:00Z'),
        ...(data as Record<string, unknown>),
      });
    }),
    update: jest.fn(),
  };
}

describe('ReservationsService', () => {
  let service: ReservationsService;
  let reservationsRepo: {
    manager: { transaction: jest.Mock };
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
  };
  let seatHoldQb: ReturnType<typeof mockSeatHoldQueryBuilder>;
  let manager: ReturnType<typeof mockManager>;

  const showtime = {
    id: 'st1',
    hallId: 'h1',
    basePrice: 10,
    showDate: '2026-09-01',
    showTime: '19:00:00',
    endTime: '21:00:00',
  } as Showtime;

  const hold = (overrides: Partial<SeatHold> = {}): SeatHold =>
    ({
      id: 'hold-1',
      showtimeId: 'st1',
      seatId: 'seat-a1',
      userId: 'user-1',
      status: SeatHoldStatus.HELD,
      heldUntil: new Date('2099-01-01T00:00:00Z'),
      ...overrides,
    }) as SeatHold;

  beforeEach(async () => {
    seatHoldQb = mockSeatHoldQueryBuilder();
    manager = mockManager(seatHoldQb);
    manager.findOneOrFail.mockResolvedValue(showtime);

    reservationsRepo = {
      manager: {
        transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
      },
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: reservationsRepo,
        },
      ],
    }).compile();

    service = module.get(ReservationsService);
  });

  describe('confirmHolds', () => {
    const params = {
      holdIds: ['hold-1'],
      userId: 'user-1',
      showtimeId: 'st1',
      unitPrice: 12.5,
    };

    it('locks the holds, writes the reservation and tickets, and confirms the holds', async () => {
      seatHoldQb.getMany.mockResolvedValue([hold()]);

      const result = await service.confirmHolds(
        manager as unknown as EntityManager,
        params,
      );

      expect(seatHoldQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(seatHoldQb.andWhere).toHaveBeenCalledWith('h.userId = :userId', {
        userId: 'user-1',
      });
      expect(manager.update).toHaveBeenCalledWith(
        SeatHold,
        { id: In(['hold-1']) },
        { status: SeatHoldStatus.CONFIRMED, reservationId: 'res-1' },
      );
      expect(result.status).toBe(ReservationStatus.CONFIRMED);
      expect(result.showtimeId).toBe('st1');
      expect(result.totalSeats).toBe(1);
      expect(result.reservationNumber).toMatch(/^RSV-\d{8}-[0-9A-Z]{6}$/);
      expect(result.tickets[0].ticketNumber).toMatch(/^TKT-[0-9A-Z]{6}-01$/);
    });

    it('DDR-025: prices each ticket at what the payment charged, not the showtime', async () => {
      seatHoldQb.getMany.mockResolvedValue([hold()]);

      const result = await service.confirmHolds(
        manager as unknown as EntityManager,
        params,
      );

      expect(result.tickets[0].price).toBe(12.5);
      expect(result.totalAmount).toBe(12.5);
    });

    it('throws SEAT_HOLD_NOT_OWNED when a hold id does not resolve for this user', async () => {
      seatHoldQb.getMany.mockResolvedValue([]);

      await expect(
        service.confirmHolds(manager as unknown as EntityManager, params),
      ).rejects.toMatchObject({ errorCode: ErrorCode.SEAT_HOLD_NOT_OWNED });
    });

    it('throws SEAT_HOLD_EXPIRED for a hold that is no longer HELD', async () => {
      seatHoldQb.getMany.mockResolvedValue([
        hold({ status: SeatHoldStatus.RELEASED }),
      ]);

      await expect(
        service.confirmHolds(manager as unknown as EntityManager, params),
      ).rejects.toMatchObject({ errorCode: ErrorCode.SEAT_HOLD_EXPIRED });
    });

    it('throws SEAT_HOLD_EXPIRED for a hold past its held_until', async () => {
      seatHoldQb.getMany.mockResolvedValue([
        hold({ heldUntil: new Date('2000-01-01T00:00:00Z') }),
      ]);

      await expect(
        service.confirmHolds(manager as unknown as EntityManager, params),
      ).rejects.toMatchObject({ errorCode: ErrorCode.SEAT_HOLD_EXPIRED });
    });

    it('rejects holds for a showtime other than the one paid for', async () => {
      seatHoldQb.getMany.mockResolvedValue([
        hold({ id: 'hold-1', showtimeId: 'st1' }),
        hold({ id: 'hold-2', showtimeId: 'st2' }),
      ]);

      await expect(
        service.confirmHolds(manager as unknown as EntityManager, {
          ...params,
          holdIds: ['hold-1', 'hold-2'],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    const reservation = {
      id: 'r1',
      userId: 'user-1',
      reservationNumber: 'RSV-20260101-ABCDEF',
      showtimeId: 'st1',
      status: ReservationStatus.CONFIRMED,
      createdAt: new Date('2026-01-01'),
      tickets: [
        {
          id: 't1',
          seatId: 'seat-a1',
          ticketNumber: 'TKT-ABCDEF-01',
          price: 10,
          status: TicketStatus.VALID,
          seat: { seatLabel: 'A1' },
        },
      ],
    } as unknown as Reservation & { tickets: (Ticket & { seat: Seat })[] };

    it('returns the reservation for its owner', async () => {
      reservationsRepo.findOne.mockResolvedValue(reservation);

      const result = await service.findOne('r1', {
        id: 'user-1',
        role: UserRole.USER,
      } as never);

      expect(result.tickets[0].seatLabel).toBe('A1');
    });

    it('returns the reservation for an admin who is not the owner', async () => {
      reservationsRepo.findOne.mockResolvedValue(reservation);

      await expect(
        service.findOne('r1', { id: 'user-2', role: UserRole.ADMIN } as never),
      ).resolves.toMatchObject({ id: 'r1' });
    });

    it('rejects a non-owner, non-admin caller', async () => {
      reservationsRepo.findOne.mockResolvedValue(reservation);

      await expect(
        service.findOne('r1', { id: 'user-2', role: UserRole.USER } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for a missing reservation', async () => {
      reservationsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOne('missing', {
          id: 'user-1',
          role: UserRole.USER,
        } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancel', () => {
    const cancellableReservation = {
      id: 'r1',
      userId: 'user-1',
      reservationNumber: 'RSV-20260101-ABCDEF',
      showtimeId: 'st1',
      status: ReservationStatus.CONFIRMED,
      createdAt: new Date('2026-01-01'),
      showtime: {
        showDate: '2099-01-01',
        showTime: '19:00:00',
      },
      tickets: [
        {
          id: 't1',
          seatId: 'seat-a1',
          ticketNumber: 'TKT-ABCDEF-01',
          price: 10,
          status: TicketStatus.VALID,
          seat: { seatLabel: 'A1' },
        },
      ],
    } as unknown as Reservation;

    it('cancels the reservation and cascades to its holds and tickets', async () => {
      manager.findOne.mockResolvedValue(cancellableReservation);

      const result = await service.cancel('r1', 'user-1');

      expect(manager.update).toHaveBeenCalledWith(Reservation, 'r1', {
        status: ReservationStatus.CANCELLED,
      });
      expect(manager.update).toHaveBeenCalledWith(
        SeatHold,
        { reservationId: 'r1', status: SeatHoldStatus.CONFIRMED },
        { status: SeatHoldStatus.RELEASED },
      );
      expect(manager.update).toHaveBeenCalledWith(
        Ticket,
        { reservationId: 'r1', status: TicketStatus.VALID },
        { status: TicketStatus.CANCELLED },
      );
      expect(result.status).toBe(ReservationStatus.CANCELLED);
      expect(result.tickets[0].status).toBe(TicketStatus.CANCELLED);
    });

    it("rejects cancelling someone else's reservation", async () => {
      manager.findOne.mockResolvedValue(cancellableReservation);

      await expect(service.cancel('r1', 'someone-else')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects cancelling an already-cancelled reservation', async () => {
      manager.findOne.mockResolvedValue({
        ...cancellableReservation,
        status: ReservationStatus.CANCELLED,
      });

      await expect(service.cancel('r1', 'user-1')).rejects.toMatchObject({
        errorCode: ErrorCode.RESERVATION_NOT_CANCELLABLE,
      });
    });

    it('rejects cancelling once the showtime has started', async () => {
      manager.findOne.mockResolvedValue({
        ...cancellableReservation,
        showtime: { showDate: '2000-01-01', showTime: '19:00:00' },
      });

      await expect(service.cancel('r1', 'user-1')).rejects.toMatchObject({
        errorCode: ErrorCode.RESERVATION_NOT_CANCELLABLE,
      });
    });

    it('throws NotFoundException for a missing reservation', async () => {
      manager.findOne.mockResolvedValue(null);

      await expect(service.cancel('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findMine', () => {
    it("paginates the caller's reservations, optionally filtered by status", async () => {
      const qb: Record<string, jest.Mock> = {};
      for (const method of [
        'leftJoinAndSelect',
        'where',
        'andWhere',
        'orderBy',
        'skip',
        'take',
      ]) {
        qb[method] = jest.fn().mockReturnValue(qb);
      }
      qb.getManyAndCount = jest.fn().mockResolvedValue([
        [
          {
            id: 'r1',
            reservationNumber: 'RSV-20260101-ABCDEF',
            showtimeId: 'st1',
            status: ReservationStatus.CONFIRMED,
            createdAt: new Date('2026-01-01'),
            tickets: [{ price: 10 }, { price: 10 }],
          },
        ],
        1,
      ]);
      reservationsRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMine('user-1', {
        page: 1,
        limit: 20,
        skip: 0,
        status: ReservationStatus.CONFIRMED,
      });

      expect(qb.where).toHaveBeenCalledWith('reservation.userId = :userId', {
        userId: 'user-1',
      });
      expect(qb.andWhere).toHaveBeenCalledWith('reservation.status = :status', {
        status: ReservationStatus.CONFIRMED,
      });
      expect(result.data[0]).toMatchObject({ totalSeats: 2, totalAmount: 20 });
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        hasMore: false,
      });
    });
  });
});
