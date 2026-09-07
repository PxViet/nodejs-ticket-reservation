import { Effect, Layer } from 'effect';

// Effect
import { moviesServiceEffect } from '../../services/movies';

// Service
import { MoviesService } from '../services/movies';

export const MoviesServiceLayer = Layer.effect(
  MoviesService,
  Effect.gen(function* () {
    return {
      getMovieById: (id: string) => moviesServiceEffect.getMovieById(id),

      getMoviesPaginated: (page?: number) =>
        moviesServiceEffect.getMoviesPaginated(page),

      searchMoviesPaginated: (query: string, page?: number) =>
        moviesServiceEffect.searchMoviesPaginated(query, page),

      getMoviesByGenrePaginated: (genreId: string, page?: number) =>
        moviesServiceEffect.getMoviesByGenrePaginated(genreId, page),

      getGenres: () => moviesServiceEffect.getGenres(),
    } as const;
  }),
);
