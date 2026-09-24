// HTTP
import { apiRequest } from '@/services/api/client';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Services
import { MoviesServiceEffect, moviesServiceEffect } from '../movies';

jest.mock('@/services/api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.Mock;

// `GET /movies/:id` payload — genres are {id,name} objects, no status field.
const API_MOVIE = {
  id: 'movie1',
  title: 'Movie 1',
  synopsis: 'Synopsis',
  posterUrl: 'https://example.com/p.jpg',
  durationMinutes: 120,
  language: 'en',
  releaseDate: '2000-01-01',
  rating: 7.5,
  isActive: true,
  isComingSoon: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  genres: [{ id: 'g1', name: 'Action' }],
};

const apiPage = (items: unknown[], page = 1, hasMore = false) => ({
  data: items,
  meta: { page, limit: 20, total: items.length, hasMore },
});

describe('MoviesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(MoviesServiceEffect.getInstance()).toBe(moviesServiceEffect);
  });

  describe('getMovieById', () => {
    it('fetches a movie from /movies/:id and adapts it', async () => {
      mockApiRequest.mockResolvedValue(API_MOVIE);

      const movie = await runEffectForQuery(
        moviesServiceEffect.getMovieById('movie1'),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/movies/movie1');
      expect(movie).toMatchObject({
        id: 'movie1',
        genre: ['Action'],
        rating: 7.5,
        // 2000 release date → already showing
        status: 'now_playing',
      });
    });

    it('throws a MovieError when the request fails', async () => {
      mockApiRequest.mockRejectedValue(new Error('boom'));

      await expect(
        runEffectForQuery(moviesServiceEffect.getMovieById('movie1')),
      ).rejects.toThrow('boom');
    });
  });

  describe('getMoviesPaginated', () => {
    it('requests a one-indexed page and returns { data, page, hasMore }', async () => {
      mockApiRequest.mockResolvedValue(apiPage([API_MOVIE], 1, true));

      const result = await runEffectForQuery(
        moviesServiceEffect.getMoviesPaginated(1),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/movies?page=1&limit=20');
      expect(result).toEqual({
        data: [
          expect.objectContaining({ id: 'movie1', status: 'now_playing' }),
        ],
        page: 1,
        hasMore: true,
      });
    });

    it('maps isComingSoon: true onto status: coming_soon', async () => {
      mockApiRequest.mockResolvedValue(
        apiPage([{ ...API_MOVIE, isComingSoon: true }], 1, false),
      );

      const result = await runEffectForQuery(
        moviesServiceEffect.getMoviesPaginated(1),
      );

      expect(result.data[0]).toMatchObject({ status: 'coming_soon' });
    });

    it('passes isComingSoon through as a query param', async () => {
      mockApiRequest.mockResolvedValue(apiPage([], 1, false));

      await runEffectForQuery(moviesServiceEffect.getMoviesPaginated(1, true));

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/movies?page=1&limit=20&isComingSoon=true',
      );
    });
  });

  describe('searchMoviesPaginated', () => {
    it('passes the query as ?title=', async () => {
      mockApiRequest.mockResolvedValue(apiPage([], 1, false));

      await runEffectForQuery(
        moviesServiceEffect.searchMoviesPaginated('bat', 2),
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/movies?title=bat&page=2&limit=20',
      );
    });
  });

  describe('getMoviesByGenrePaginated', () => {
    it('passes the genre id as ?genreId=', async () => {
      mockApiRequest.mockResolvedValue(apiPage([], 1, false));

      await runEffectForQuery(
        moviesServiceEffect.getMoviesByGenrePaginated('g1', 1),
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/movies?genreId=g1&page=1&limit=20',
      );
    });

    it('passes isComingSoon through as a query param', async () => {
      mockApiRequest.mockResolvedValue(apiPage([], 1, false));

      await runEffectForQuery(
        moviesServiceEffect.getMoviesByGenrePaginated('g1', 1, false),
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/movies?genreId=g1&page=1&limit=20&isComingSoon=false',
      );
    });
  });

  describe('getGenres', () => {
    it('fetches the genre list from /genres', async () => {
      const genres = [{ id: 'g1', name: 'Action' }];
      mockApiRequest.mockResolvedValue(apiPage(genres));

      const result = await runEffectForQuery(moviesServiceEffect.getGenres());

      expect(mockApiRequest).toHaveBeenCalledWith('/genres?limit=100');
      expect(result).toEqual(genres);
    });
  });
});
