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

// A wider page than the shared default: status is filtered client-side after
// paging, so a bigger page keeps the "now playing" / "coming soon" carousels
// full (see useMovieData).
const PAGE_LIMIT = PAGINATION.PAGE_LIMIT_MAX;

// The API has no status field; "now playing" vs "coming soon" is a function of
// the release date.
const deriveStatus = (releaseDate: string): MovieStatus =>
  new Date(releaseDate).getTime() > Date.now() ? 'coming_soon' : 'now_playing';

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
  status: deriveStatus(releaseDate),
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

  getMoviesPaginated = (page = 1) =>
    Effect.tryPromise({
      try: async () =>
        toMoviePage(
          await apiRequest<PaginatedMovies>(
            `/movies${toQuery({ page, limit: PAGE_LIMIT })}`,
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

  getMoviesByGenrePaginated = (genreId: string, page = 1) =>
    Effect.tryPromise({
      try: async () =>
        toMoviePage(
          await apiRequest<PaginatedMovies>(
            `/movies${toQuery({ genreId, page, limit: PAGE_LIMIT })}`,
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
