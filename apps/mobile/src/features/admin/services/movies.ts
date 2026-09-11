// Effect
import { Effect } from 'effect';

// HTTP
import { apiRequest } from '@/services/api/client';
import { codeOf, messageOf, toQuery } from '@/services/api/helpers';

// Types
import type {
  CreateMovieRequest,
  Movie as ApiMovie,
  PaginatedMovies,
  UpdateMovieRequest,
} from '@movea/api-contract';

// Constants
import { PAGINATION } from '@/constants';

// Error
import { AdminMovieError } from '@/features/admin/error/movie';

const PAGE_LIMIT = PAGINATION.PAGE_LIMIT_MAX;

/** A movie as the admin list/form need it — the raw catalogue shape, genres
 * kept as `{id, name}` (not just names) so the form can preselect them. */
export interface AdminMovie {
  id: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  durationMinutes: number;
  language: string;
  releaseDate: string;
  rating: number;
  isActive: boolean;
  genres: { id: string; name: string }[];
}

const toAdminMovie = ({
  id,
  title,
  synopsis,
  posterUrl,
  durationMinutes,
  language,
  releaseDate,
  rating,
  isActive,
  genres,
}: ApiMovie): AdminMovie => ({
  id,
  title,
  synopsis: synopsis ?? '',
  posterUrl: posterUrl ?? '',
  durationMinutes,
  language,
  releaseDate,
  rating: rating ?? 0,
  isActive,
  genres,
});

export interface AdminMoviePage {
  data: AdminMovie[];
  page: number;
  hasMore: boolean;
}

const toAdminMoviePage = ({ data, meta }: PaginatedMovies): AdminMoviePage => ({
  data: data.map(toAdminMovie),
  page: meta.page,
  hasMore: meta.hasMore,
});

// A validation failure from the service (e.g. MOVIE_REQUIRES_GENRE) reads
// better than the generic "Bad Request" the API's message otherwise carries.
const saveErrorMessage = (error: unknown): string => {
  const code = codeOf(error);
  if (code === 'MOVIE_REQUIRES_GENRE') return 'Pick at least one genre.';
  return messageOf(error) || 'Could not save the movie.';
};

export class AdminMoviesServiceEffect {
  private static instance: AdminMoviesServiceEffect;

  private constructor() {}

  static getInstance(): AdminMoviesServiceEffect {
    if (!AdminMoviesServiceEffect.instance) {
      AdminMoviesServiceEffect.instance = new AdminMoviesServiceEffect();
    }
    return AdminMoviesServiceEffect.instance;
  }

  // `auth: true` matters here beyond authorization: DDR-014's
  // `OptionalJwtAuthGuard` derives `includeInactive` from the caller's role,
  // so an authenticated admin request is what surfaces deactivated movies.
  getMoviesPaginated = (page = 1, title?: string) =>
    Effect.tryPromise({
      try: async () =>
        toAdminMoviePage(
          await apiRequest<PaginatedMovies>(
            `/movies${toQuery({ page, limit: PAGE_LIMIT, title })}`,
            { auth: true },
          ),
        ),
      catch: (error: unknown) =>
        AdminMovieError.loadFailed(
          messageOf(error) || 'Could not load movies.',
        ),
    });

  getMovieById = (id: string) =>
    Effect.tryPromise({
      try: async () =>
        toAdminMovie(
          await apiRequest<ApiMovie>(`/movies/${id}`, { auth: true }),
        ),
      catch: (error: unknown) =>
        AdminMovieError.loadFailed(messageOf(error) || 'Could not load movie.'),
    });

  createMovie = (payload: CreateMovieRequest) =>
    Effect.tryPromise({
      try: async () =>
        toAdminMovie(
          await apiRequest<ApiMovie>('/movies', {
            method: 'POST',
            body: payload,
            auth: true,
          }),
        ),
      catch: (error: unknown) =>
        AdminMovieError.saveFailed(saveErrorMessage(error)),
    });

  updateMovie = (id: string, payload: UpdateMovieRequest) =>
    Effect.tryPromise({
      try: async () =>
        toAdminMovie(
          await apiRequest<ApiMovie>(`/movies/${id}`, {
            method: 'PATCH',
            body: payload,
            auth: true,
          }),
        ),
      catch: (error: unknown) =>
        AdminMovieError.saveFailed(saveErrorMessage(error)),
    });

  // ADR-010: this deactivates the movie (`is_active = false`), it does not
  // hard-delete the row — reservation/ticket history stays intact.
  deleteMovie = (id: string) =>
    Effect.tryPromise({
      try: () =>
        apiRequest<void>(`/movies/${id}`, { method: 'DELETE', auth: true }),
      catch: (error: unknown) =>
        AdminMovieError.deleteFailed(
          messageOf(error) || 'Could not deactivate the movie.',
        ),
    });
}

export const adminMoviesServiceEffect = AdminMoviesServiceEffect.getInstance();
