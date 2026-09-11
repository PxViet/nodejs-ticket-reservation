// Effect
import { Context, Effect } from 'effect';

// Types
import type {
  CreateMovieRequest,
  UpdateMovieRequest,
} from '@movea/api-contract';

// Error
import { AdminMovieError } from '../../error/movie';

// Service
import { AdminMovie, AdminMoviePage } from '../../services/movies';

export class AdminMoviesService extends Context.Tag('AdminMoviesServiceTag')<
  AdminMoviesService,
  {
    readonly getMoviesPaginated: (
      page?: number,
      title?: string,
    ) => Effect.Effect<AdminMoviePage, AdminMovieError, never>;

    readonly getMovieById: (
      id: string,
    ) => Effect.Effect<AdminMovie, AdminMovieError, never>;

    readonly createMovie: (
      payload: CreateMovieRequest,
    ) => Effect.Effect<AdminMovie, AdminMovieError, never>;

    readonly updateMovie: (
      id: string,
      payload: UpdateMovieRequest,
    ) => Effect.Effect<AdminMovie, AdminMovieError, never>;

    readonly deleteMovie: (
      id: string,
    ) => Effect.Effect<void, AdminMovieError, never>;
  }
>() {}
