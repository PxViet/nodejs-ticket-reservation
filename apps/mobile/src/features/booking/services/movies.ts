// Effect
import { Effect } from 'effect';

// HTTP
import { apiRequest } from '@/services/api/client';
import { messageOf, toQuery } from '@/services/api/helpers';

// Types
import type {
  Movie as ApiMovie,
  PaginatedGenres,
  PaginatedMovies,
} from '@movea/api-contract';
import { Movie, MovieStatus } from '../schemas/movie';

// Constants
import { PAGINATION } from '@/constants';

// Error
import { MovieError } from '@/features/booking/error/movie';

// A wider page than the shared default keeps the "now playing" / "coming
// soon" carousels full even though each is now filtered server-side (see
// useMovieData).
const PAGE_LIMIT = PAGINATION.PAGE_LIMIT_MAX;

// The API's isComingSoon is derived from releaseDate at read time; this just
// maps it onto the client's status vocabulary.
const toStatus = (isComingSoon: boolean): MovieStatus =>
  isComingSoon ? 'coming_soon' : 'now_playing';

const toMovie = ({
  id,
  title,
  synopsis,
  posterUrl,
  durationMinutes,
  language,
  releaseDate,
  rating,
  genres,
  isComingSoon,
  createdAt,
  updatedAt,
}: ApiMovie): Movie => ({
  id,
  title,
  synopsis: synopsis ?? '',
  posterUrl: posterUrl ?? '',
  durationMinutes,
  language,
  releaseDate,
  rating: rating ?? 0,
  genre: genres.map(({ name }) => name),
  status: toStatus(isComingSoon),
  createdAt,
  updatedAt,
});

export interface MoviePage {
  data: Movie[];
  page: number;
  hasMore: boolean;
}

const toMoviePage = ({ data, meta }: PaginatedMovies): MoviePage => ({
  data: data.map(toMovie),
  page: meta.page,
  hasMore: meta.hasMore,
});

export class MoviesServiceEffect {
  private static instance: MoviesServiceEffect;

  private constructor() {}

  static getInstance(): MoviesServiceEffect {
    if (!MoviesServiceEffect.instance) {
      MoviesServiceEffect.instance = new MoviesServiceEffect();
    }
    return MoviesServiceEffect.instance;
  }

  getMovieById = (id: string) =>
    Effect.tryPromise({
      try: async () => toMovie(await apiRequest<ApiMovie>(`/movies/${id}`)),
      catch: (error: unknown) => MovieError.movieNotFound(messageOf(error)),
    });

  getMoviesPaginated = (page = 1, isComingSoon?: boolean) =>
    Effect.tryPromise({
      try: async () =>
        toMoviePage(
          await apiRequest<PaginatedMovies>(
            `/movies${toQuery({ page, limit: PAGE_LIMIT, isComingSoon })}`,
          ),
        ),
      catch: (error: unknown) => MovieError.movieNotFound(messageOf(error)),
    });

  searchMoviesPaginated = (query: string, page = 1) =>
    Effect.tryPromise({
      try: async () =>
        toMoviePage(
          await apiRequest<PaginatedMovies>(
            `/movies${toQuery({ title: query, page, limit: PAGE_LIMIT })}`,
          ),
        ),
      catch: (error: unknown) => MovieError.searchFailed(messageOf(error)),
    });

  getMoviesByGenrePaginated = (
    genreId: string,
    page = 1,
    isComingSoon?: boolean,
  ) =>
    Effect.tryPromise({
      try: async () =>
        toMoviePage(
          await apiRequest<PaginatedMovies>(
            `/movies${toQuery({ genreId, page, limit: PAGE_LIMIT, isComingSoon })}`,
          ),
        ),
      catch: (error: unknown) => MovieError.movieNotFound(messageOf(error)),
    });

  getGenres = () =>
    Effect.tryPromise({
      try: async () => {
        const { data } = await apiRequest<PaginatedGenres>(
          `/genres${toQuery({ limit: 100 })}`,
        );
        return data;
      },
      catch: (error: unknown) => MovieError.movieNetworkError(messageOf(error)),
    });
}

export const moviesServiceEffect = MoviesServiceEffect.getInstance();
