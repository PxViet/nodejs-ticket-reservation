// HTTP
import { apiRequest } from '@/services/api/client';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Services
import { ShowtimesServiceEffect, showtimesServiceEffect } from '../showtimes';

jest.mock('@/services/api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.Mock;

// `GET /showtimes` payload — the hall comes nested; there is no cinema above it.
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

const apiPage = (items: unknown[], page = 1, hasMore = false) => ({
  data: items,
  meta: { page, limit: 20, total: items.length, hasMore },
});

describe('ShowtimesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(ShowtimesServiceEffect.getInstance()).toBe(showtimesServiceEffect);
  });

  describe('getShowtimes', () => {
    it('fetches a movie’s schedule for a date and unwraps the page', async () => {
      mockApiRequest.mockResolvedValue(apiPage([API_SHOWTIME]));

      const showtimes = await runEffectForQuery(
        showtimesServiceEffect.getShowtimes('movie1', '2026-09-07'),
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/showtimes?movieId=movie1&date=2026-09-07&page=1&limit=20',
      );
      expect(showtimes).toHaveLength(1);
      expect(showtimes[0]).toMatchObject({
        id: 'show1',
        basePrice: 75000,
        hall: { id: 'hall1', name: 'Hall 1', hallType: 'IMAX' },
      });
    });

    it('narrows the request to one hall when a hallId is given', async () => {
      mockApiRequest.mockResolvedValue(apiPage([]));

      await runEffectForQuery(
        showtimesServiceEffect.getShowtimes('movie1', '2026-09-07', 'hall1'),
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/showtimes?movieId=movie1&date=2026-09-07&hallId=hall1&page=1&limit=20',
      );
    });

    it('omits a null hall and movie rather than faking them', async () => {
      mockApiRequest.mockResolvedValue(
        apiPage([{ ...API_SHOWTIME, hall: null, movie: null }]),
      );

      const showtimes = await runEffectForQuery(
        showtimesServiceEffect.getShowtimes('movie1', '2026-09-07'),
      );

      expect(showtimes[0]).not.toHaveProperty('hall');
      expect(showtimes[0]).not.toHaveProperty('movie');
    });

    it('fails with the underlying message', async () => {
      mockApiRequest.mockRejectedValue(new Error('boom'));

      await expect(
        runEffectForQuery(
          showtimesServiceEffect.getShowtimes('movie1', '2026-09-07'),
        ),
      ).rejects.toThrow('boom');
    });
  });

  describe('getShowtimeById', () => {
    it('fetches one showtime and adapts it', async () => {
      mockApiRequest.mockResolvedValue(API_SHOWTIME);

      const showtime = await runEffectForQuery(
        showtimesServiceEffect.getShowtimeById('show1'),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/showtimes/show1');
      expect(showtime).toMatchObject({ id: 'show1', hallId: 'hall1' });
    });

    it('defaults a missing poster and rating on the nested movie', async () => {
      mockApiRequest.mockResolvedValue({
        ...API_SHOWTIME,
        movie: { ...API_SHOWTIME.movie, posterUrl: null, rating: null },
      });

      const showtime = await runEffectForQuery(
        showtimesServiceEffect.getShowtimeById('show1'),
      );

      expect(showtime.movie).toMatchObject({ posterUrl: '', rating: 0 });
    });

    it('fails with the underlying message', async () => {
      mockApiRequest.mockRejectedValue(new Error('not found'));

      await expect(
        runEffectForQuery(showtimesServiceEffect.getShowtimeById('nope')),
      ).rejects.toThrow('not found');
    });
  });

  describe('getHalls', () => {
    it('fetches the plain array /halls answers with', async () => {
      mockApiRequest.mockResolvedValue([
        { id: 'hall1', name: 'Hall 1', hallType: 'IMAX', totalSeats: 100 },
      ]);

      const halls = await runEffectForQuery(showtimesServiceEffect.getHalls());

      expect(mockApiRequest).toHaveBeenCalledWith('/halls');
      expect(halls).toEqual([
        { id: 'hall1', name: 'Hall 1', hallType: 'IMAX', totalSeats: 100 },
      ]);
    });

    it('fails with the underlying message', async () => {
      mockApiRequest.mockRejectedValue(new Error('offline'));

      await expect(
        runEffectForQuery(showtimesServiceEffect.getHalls()),
      ).rejects.toThrow('offline');
    });
  });
});
