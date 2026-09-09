import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { ErrorCode } from '../../common/exceptions/error-codes';
import { Seat } from '../showtimes/entities/seat.entity';
import { Showtime } from '../showtimes/entities/showtime.entity';
import { ShowtimeStatus } from '../showtimes/enums/showtime-status.enum';
import { SeatHold } from './entities/seat-hold.entity';
import { SeatHoldStatus } from './enums/seat-hold-status.enum';
import { SeatHoldsService } from './seat-holds.service';

function mockQueryBuilder(result: { holds: SeatHold[]; total: number }) {
  const qb = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    setLock: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([result.holds, result.total]),
    getOne: jest.fn().mockResolvedValue(result.holds[0] ?? null),
  };
  return qb;
}

// heldUntil/status/id are DB-computed defaults, so the mock save() populates
// them the same way Postgres's RETURNING clause would for a real insert.
function mockManager() {
  return {
    create: jest.fn((_entityClass: unknown, data: unknown) => data),
    save: jest.fn((_entityClass: unknown, data: Record<string, unknown>[]) =>
      Promise.resolve(
        data.map((row, index) => ({
          id: `hold-${index}`,
          status: SeatHoldStatus.HELD,
          heldUntil: new Date('2026-01-01T00:10:00Z'),
          ...row,
        })),
      ),
    ),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

describe('SeatHoldsService', () => {
  let service: SeatHoldsService;
  let seatHoldsRepo: {
    manager: { transaction: jest.Mock } & ReturnType<typeof mockManager>;
    createQueryBuilder: jest.Mock;
  };
  let showtimesRepo: { findOne: jest.Mock; find: jest.Mock };
  let seatsRepo: { find: jest.Mock };
  let manager: ReturnType<typeof mockManager>;
  let findManyQb: ReturnType<typeof mockQueryBuilder>;
  let releaseQb: ReturnType<typeof mockQueryBuilder>;

  const showtime = {
    id: 'st1',
    hallId: 'h1',
    status: ShowtimeStatus.SCHEDULED,
    basePrice: 12,
  } as Showtime;

  const seat = { id: 'seat-a1', hallId: 'h1', seatLabel: 'A1' } as Seat;

  const activeHold = {
    id: 'hold-1',
    seatId: 'seat-a1',
    showtimeId: 'st1',
    userId: 'user-1',
    status: SeatHoldStatus.HELD,
    heldUntil: new Date('2026-01-01T00:10:00Z'),
  } as SeatHold;

  beforeEach(async () => {
    manager = mockManager();
    findManyQb = mockQueryBuilder({ holds: [activeHold], total: 1 });
    releaseQb = mockQueryBuilder({ holds: [activeHold], total: 1 });
    (manager as { getRepository?: jest.Mock }).getRepository = jest.fn(() => ({
      createQueryBuilder: jest.fn(() => releaseQb),
    }));
    seatHoldsRepo = {
      manager: {
        transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
        ...manager,
      },
      createQueryBuilder: jest.fn(() => findManyQb),
    };
    showtimesRepo = {
      findOne: jest.fn().mockResolvedValue(showtime),
      find: jest.fn().mockResolvedValue([showtime]),
    };
    seatsRepo = { find: jest.fn().mockResolvedValue([seat]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatHoldsService,
        { provide: getRepositoryToken(SeatHold), useValue: seatHoldsRepo },
        { provide: getRepositoryToken(Showtime), useValue: showtimesRepo },
        { provide: getRepositoryToken(Seat), useValue: seatsRepo },
      ],
    }).compile();

    service = module.get(SeatHoldsService);
  });

  it('holds the requested seats for the authenticated user, never a client-supplied one', async () => {
    const result = await service.holdSeats(
      'st1',
      { seatIds: ['seat-a1'] },
      'user-1',
    );

    expect(manager.create).toHaveBeenCalledWith(SeatHold, {
      showtimeId: 'st1',
      seatId: 'seat-a1',
      userId: 'user-1',
    });
    expect(result).toEqual({
      holds: [
        {
          id: 'hold-0',
          seatId: 'seat-a1',
          seatLabel: 'A1',
          showtimeId: 'st1',
          status: SeatHoldStatus.HELD,
          heldUntil: new Date('2026-01-01T00:10:00Z'),
        },
      ],
    });
  });

  it('throws NotFoundException for a missing showtime', async () => {
    showtimesRepo.findOne.mockResolvedValue(null);

    await expect(
      service.holdSeats('missing', { seatIds: ['seat-a1'] }, 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it.each([ShowtimeStatus.CANCELLED, ShowtimeStatus.COMPLETED])(
    'rejects a %s showtime with SHOWTIME_NOT_BOOKABLE',
    async (status) => {
      showtimesRepo.findOne.mockResolvedValue({ ...showtime, status });

      await expect(
        service.holdSeats('st1', { seatIds: ['seat-a1'] }, 'user-1'),
      ).rejects.toMatchObject({ errorCode: ErrorCode.SHOWTIME_NOT_BOOKABLE });
    },
  );

  it('throws BadRequestException when a seat does not belong to the hall', async () => {
    seatsRepo.find.mockResolvedValue([]);

    await expect(
      service.holdSeats('st1', { seatIds: ['seat-a1'] }, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('translates a unique-violation race loss into SEAT_UNAVAILABLE', async () => {
    seatHoldsRepo.manager.transaction.mockRejectedValue({ code: '23505' });

    await expect(
      service.holdSeats('st1', { seatIds: ['seat-a1'] }, 'user-1'),
    ).rejects.toMatchObject({ errorCode: ErrorCode.SEAT_UNAVAILABLE });
  });

  it('rethrows an unrelated database error unchanged', async () => {
    const dbError = new Error('connection reset');
    seatHoldsRepo.manager.transaction.mockRejectedValue(dbError);

    await expect(
      service.holdSeats('st1', { seatIds: ['seat-a1'] }, 'user-1'),
    ).rejects.toThrow(dbError);
  });

  describe('findMyActiveHolds', () => {
    const query = { page: 1, limit: 20, skip: 0 };

    it("returns the user's active holds with seat label and price", async () => {
      const result = await service.findMyActiveHolds('user-1', query);

      expect(findManyQb.where).toHaveBeenCalledWith('h.userId = :userId', {
        userId: 'user-1',
      });
      expect(findManyQb.andWhere).toHaveBeenCalledWith('h.status = :status', {
        status: SeatHoldStatus.HELD,
      });
      expect(result).toEqual({
        data: [
          {
            id: 'hold-1',
            seatId: 'seat-a1',
            seatLabel: 'A1',
            showtimeId: 'st1',
            status: SeatHoldStatus.HELD,
            heldUntil: activeHold.heldUntil,
            price: 12,
          },
        ],
        meta: { page: 1, limit: 20, total: 1, hasMore: false },
      });
    });

    it('filters by showtimeId when given', async () => {
      await service.findMyActiveHolds('user-1', {
        ...query,
        showtimeId: 'st1',
      });

      expect(findManyQb.andWhere).toHaveBeenCalledWith(
        'h.showtimeId = :showtimeId',
        { showtimeId: 'st1' },
      );
    });

    it('returns an empty page without loading seats or showtimes', async () => {
      findManyQb.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findMyActiveHolds('user-1', query);

      expect(result).toEqual({
        data: [],
        meta: { page: 1, limit: 20, total: 0, hasMore: false },
      });
      expect(seatsRepo.find).not.toHaveBeenCalled();
      expect(showtimesRepo.find).not.toHaveBeenCalled();
    });
  });

  describe('releaseHold', () => {
    it('releases a HELD hold owned by the caller', async () => {
      await service.releaseHold('hold-1', 'user-1');

      expect(releaseQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(manager.update).toHaveBeenCalledWith(SeatHold, 'hold-1', {
        status: SeatHoldStatus.RELEASED,
      });
    });

    it('throws NotFoundException when the hold does not exist', async () => {
      releaseQb.getOne.mockResolvedValue(null);

      await expect(service.releaseHold('missing', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws SEAT_HOLD_NOT_OWNED for another user's hold", async () => {
      releaseQb.getOne.mockResolvedValue({
        ...activeHold,
        userId: 'other-user',
      });

      await expect(
        service.releaseHold('hold-1', 'user-1'),
      ).rejects.toMatchObject({ errorCode: ErrorCode.SEAT_HOLD_NOT_OWNED });
    });

    it('throws BadRequestException when the hold is not currently held', async () => {
      releaseQb.getOne.mockResolvedValue({
        ...activeHold,
        status: SeatHoldStatus.CONFIRMED,
      });

      await expect(service.releaseHold('hold-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
