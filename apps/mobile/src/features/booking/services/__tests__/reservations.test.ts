// HTTP
import { ApiError, apiRequest } from '@/services/api/client';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Services
import {
  ReservationsServiceEffect,
  reservationsServiceEffect,
} from '../reservations';

jest.mock('@/services/api/client', () => ({
  ...jest.requireActual('@/services/api/client'),
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.Mock;

const API_SHOWTIME = {
  id: 'show1',
  movieId: 'movie1',
  hallId: 'hall1',
  showDate: '2026-09-07',
  showTime: '19:30:00',
  endTime: '21:30:00',
  basePrice: 75000,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  totalSeats: 100,
  seatsTaken: 12,
  availableSeats: 88,
  hall: { id: 'hall1', name: 'Hall 1', hallType: 'IMAX' },
  movie: {
    id: 'movie1',
    title: 'Movie 1',
    durationMinutes: 120,
    posterUrl: 'https://example.com/p.jpg',
    language: 'en',
    rating: 7.5,
  },
};

const API_TICKET = {
  id: 'ticket1',
  seatId: 'seat1',
  seatLabel: 'A1',
  ticketNumber: 'TKT-001',
  price: 75000,
  status: 'valid',
};

const API_RESERVATION = {
  id: 'res1',
  reservationNumber: 'RSV-001',
  userId: 'user1',
  showtimeId: 'show1',
  status: 'confirmed',
  tickets: [API_TICKET],
  totalSeats: 1,
  totalAmount: 75000,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const API_RESERVATION_SUMMARY = {
  id: 'res1',
  reservationNumber: 'RSV-001',
  showtimeId: 'show1',
  status: 'confirmed',
  totalSeats: 1,
  totalAmount: 75000,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const apiPage = (items: unknown[], page = 1, hasMore = false) => ({
  data: items,
  meta: { page, limit: 20, total: items.length, hasMore },
});

const byPath = (routes: Record<string, unknown>) => (path: string) => {
  const match = Object.entries(routes).find(([route]) =>
    path.startsWith(route),
  );
  if (!match) throw new Error(`unexpected path: ${path}`);
  const [, value] = match;
  if (value instanceof Error) return Promise.reject(value);
  return Promise.resolve(value);
};

describe('ReservationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(ReservationsServiceEffect.getInstance()).toBe(
      reservationsServiceEffect,
    );
  });

  describe('confirmReservation', () => {
    it('posts the hold ids and returns the confirmed reservation', async () => {
      mockApiRequest.mockResolvedValue(API_RESERVATION);

      const reservation = await runEffectForQuery(
        reservationsServiceEffect.confirmReservation(['hold1']),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/reservations', {
        method: 'POST',
        body: { holdIds: ['hold1'] },
        auth: true,
      });
      expect(reservation).toMatchObject({
        id: 'res1',
        reservationNumber: 'RSV-001',
      });
    });

    it('carries the API errorCode onto the tagged error', async () => {
      mockApiRequest.mockRejectedValue(
        new ApiError(409, 'HOLD_EXPIRED', 'hold expired'),
      );

      await expect(
        runEffectForQuery(
          reservationsServiceEffect.confirmReservation(['hold1']),
        ),
      ).rejects.toMatchObject({
        message: 'hold expired',
        errorCode: 'HOLD_EXPIRED',
      });
    });
  });

  describe('getMinePaginated', () => {
    it('fetches a page and enriches each row with its showtime', async () => {
      mockApiRequest.mockImplementation(
        byPath({
          '/reservations/me': apiPage([API_RESERVATION_SUMMARY]),
          '/showtimes/': API_SHOWTIME,
        }),
      );

      const result = await runEffectForQuery(
        reservationsServiceEffect.getMinePaginated(1),
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/reservations/me?page=1&limit=20',
        { auth: true },
      );
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'res1',
        showtime: { id: 'show1', movie: { title: 'Movie 1' } },
      });
      expect(result.page).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('falls back to no showtime when the enrichment lookup fails', async () => {
      mockApiRequest.mockImplementation(
        byPath({
          '/reservations/me': apiPage([API_RESERVATION_SUMMARY]),
          '/showtimes/': new Error('not found'),
        }),
      );

      const result = await runEffectForQuery(
        reservationsServiceEffect.getMinePaginated(1),
      );

      expect(result.data[0]?.showtime).toBeUndefined();
    });

    it('includes a status filter when given', async () => {
      mockApiRequest.mockImplementation(
        byPath({
          '/reservations/me': apiPage([]),
        }),
      );

      await runEffectForQuery(
        reservationsServiceEffect.getMinePaginated(1, 'cancelled'),
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/reservations/me?page=1&limit=20&status=cancelled',
        { auth: true },
      );
    });

    it('fails with the underlying message', async () => {
      mockApiRequest.mockRejectedValue(new Error('offline'));

      await expect(
        runEffectForQuery(reservationsServiceEffect.getMinePaginated(1)),
      ).rejects.toThrow('offline');
    });
  });

  describe('getById', () => {
    it('fetches one reservation and enriches it with its showtime', async () => {
      mockApiRequest.mockImplementation(
        byPath({
          '/reservations/res1': API_RESERVATION,
          '/showtimes/': API_SHOWTIME,
        }),
      );

      const reservation = await runEffectForQuery(
        reservationsServiceEffect.getById('res1'),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/reservations/res1', {
        auth: true,
      });
      expect(reservation).toMatchObject({
        id: 'res1',
        tickets: [{ id: 'ticket1', seatLabel: 'A1' }],
        showtime: { id: 'show1' },
      });
    });

    it('fails with the underlying message', async () => {
      mockApiRequest.mockRejectedValue(new Error('not found'));

      await expect(
        runEffectForQuery(reservationsServiceEffect.getById('nope')),
      ).rejects.toThrow('not found');
    });
  });

  describe('cancel', () => {
    it('posts to the cancel endpoint and returns the updated reservation', async () => {
      mockApiRequest.mockResolvedValue({
        ...API_RESERVATION,
        status: 'cancelled',
      });

      const reservation = await runEffectForQuery(
        reservationsServiceEffect.cancel('res1'),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/reservations/res1/cancel', {
        method: 'POST',
        auth: true,
      });
      expect(reservation.status).toBe('cancelled');
    });

    it('carries the API errorCode onto the tagged error', async () => {
      mockApiRequest.mockRejectedValue(
        new ApiError(404, 'RESERVATION_NOT_FOUND', 'not found'),
      );

      await expect(
        runEffectForQuery(reservationsServiceEffect.cancel('nope')),
      ).rejects.toMatchObject({
        message: 'not found',
        errorCode: 'RESERVATION_NOT_FOUND',
      });
    });
  });
});
