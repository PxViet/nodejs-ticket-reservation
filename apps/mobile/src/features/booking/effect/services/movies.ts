// Effect
import { Effect, Context } from 'effect';

// Contract
import type { Genre } from '@movea/api-contract';

// Schema
import { Movie } from '../../schemas/movie';
import { MovieError } from '../../error/movie';

// Service
import { MoviePage } from '../../services/movies';

export class MoviesService extends Context.Tag('MoviesServiceTag')<
  MoviesService,
  {
    readonly getMovieById: (
      id: string,
    ) => Effect.Effect<Movie, MovieError, never>;

    readonly getMoviesPaginated: (
      page?: number,
    ) => Effect.Effect<MoviePage, MovieError, never>;

    readonly searchMoviesPaginated: (
      query: string,
      page?: number,
    ) => Effect.Effect<MoviePage, MovieError, never>;

    readonly getMoviesByGenrePaginated: (
      genreId: string,
      page?: number,
    ) => Effect.Effect<MoviePage, MovieError, never>;

    readonly getGenres: () => Effect.Effect<Genre[], MovieError, never>;
  }
>() {}
