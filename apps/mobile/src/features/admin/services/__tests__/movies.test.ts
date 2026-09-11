// HTTP
import { ApiError, apiRequest } from '@/services/api/client';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Error
import { AdminMovieError } from '@/features/admin/error/movie';

// Services
import { AdminMoviesServiceEffect, adminMoviesServiceEffect } from '../movies';

jest.mock('@/services/api/client', () => ({
  ...jest.requireActual('@/services/api/client'),
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.Mock;

// `GET /movies/:id` payload — genres are {id,name} objects (unlike the
// public catalogue's `Movie`, which only needs the name).
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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  genres: [{ id: 'g1', name: 'Action' }],
};

const apiPage = (items: unknown[], page = 1, hasMore = false) => ({
  data: items,
  meta: { page, limit: 20, total: items.length, hasMore },
});

describe('AdminMoviesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be a singleton', () => {
    expect(AdminMoviesServiceEffect.getInstance()).toBe(
      adminMoviesServiceEffect,
    );
  });

  describe('getMoviesPaginated', () => {
    it('requests a one-indexed page with auth, so an admin token also gets inactive movies', async () => {
      mockApiRequest.mockResolvedValue(apiPage([API_MOVIE], 1, true));

      const result = await runEffectForQuery(
        adminMoviesServiceEffect.getMoviesPaginated(1),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/movies?page=1&limit=20', {
        auth: true,
      });
      expect(result).toEqual({
        data: [expect.objectContaining({ id: 'movie1', isActive: true })],
        page: 1,
        hasMore: true,
      });
    });

    it('passes a title filter for the search box', async () => {
      mockApiRequest.mockResolvedValue(apiPage([], 1, false));

      await runEffectForQuery(
        adminMoviesServiceEffect.getMoviesPaginated(2, 'bat'),
      );

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/movies?page=2&limit=20&title=bat',
        { auth: true },
      );
    });

    it('keeps genres as {id, name} so the form can preselect them', async () => {
      mockApiRequest.mockResolvedValue(apiPage([API_MOVIE]));

      const result = await runEffectForQuery(
        adminMoviesServiceEffect.getMoviesPaginated(1),
      );

      expect(result.data[0]?.genres).toEqual([{ id: 'g1', name: 'Action' }]);
    });

    it('throws an AdminMovieError when the request fails', async () => {
      mockApiRequest.mockRejectedValue(new Error('boom'));

      await expect(
        runEffectForQuery(adminMoviesServiceEffect.getMoviesPaginated(1)),
      ).rejects.toBeInstanceOf(AdminMovieError);
    });
  });

  describe('getMovieById', () => {
    it('fetches with auth so an admin can see an inactive movie', async () => {
      mockApiRequest.mockResolvedValue(API_MOVIE);

      const movie = await runEffectForQuery(
        adminMoviesServiceEffect.getMovieById('movie1'),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/movies/movie1', {
        auth: true,
      });
      expect(movie).toMatchObject({ id: 'movie1', title: 'Movie 1' });
    });
  });

  describe('createMovie', () => {
    it('POSTs the payload with auth', async () => {
      mockApiRequest.mockResolvedValue(API_MOVIE);

      const payload = {
        title: 'New Movie',
        durationMinutes: 100,
        language: 'en',
        releaseDate: '2026-01-01',
        genreIds: ['g1'],
      };

      await runEffectForQuery(
        adminMoviesServiceEffect.createMovie(payload as any),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/movies', {
        method: 'POST',
        body: payload,
        auth: true,
      });
    });

    it('surfaces MOVIE_REQUIRES_GENRE as a friendly message', async () => {
      mockApiRequest.mockRejectedValue(
        new ApiError(400, 'MOVIE_REQUIRES_GENRE', 'genreIds must not be empty'),
      );

      await expect(
        runEffectForQuery(
          adminMoviesServiceEffect.createMovie({ genreIds: [] } as any),
        ),
      ).rejects.toMatchObject({
        message: 'Pick at least one genre.',
      });
    });

    it('falls back to the API message for any other failure', async () => {
      mockApiRequest.mockRejectedValue(
        new ApiError(409, 'GENRE_NAME_ALREADY_EXISTS', 'already exists'),
      );

      await expect(
        runEffectForQuery(adminMoviesServiceEffect.createMovie({} as any)),
      ).rejects.toMatchObject({ message: 'already exists' });
    });
  });

  describe('updateMovie', () => {
    it('PATCHes the payload with auth', async () => {
      mockApiRequest.mockResolvedValue(API_MOVIE);

      await runEffectForQuery(
        adminMoviesServiceEffect.updateMovie('movie1', { title: 'Renamed' }),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/movies/movie1', {
        method: 'PATCH',
        body: { title: 'Renamed' },
        auth: true,
      });
    });
  });

  describe('deleteMovie', () => {
    it('DELETEs with auth — a soft deactivate, not a hard delete (ADR-010)', async () => {
      mockApiRequest.mockResolvedValue(undefined);

      await runEffectForQuery(adminMoviesServiceEffect.deleteMovie('movie1'));

      expect(mockApiRequest).toHaveBeenCalledWith('/movies/movie1', {
        method: 'DELETE',
        auth: true,
      });
    });

    it('throws an AdminMovieError when the request fails', async () => {
      mockApiRequest.mockRejectedValue(new Error('nope'));

      await expect(
        runEffectForQuery(adminMoviesServiceEffect.deleteMovie('movie1')),
      ).rejects.toBeInstanceOf(AdminMovieError);
    });
  });
});
