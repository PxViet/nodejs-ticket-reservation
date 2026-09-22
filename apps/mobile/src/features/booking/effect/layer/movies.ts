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

      getMoviesPaginated: (page?: number, isComingSoon?: boolean) =>
        moviesServiceEffect.getMoviesPaginated(page, isComingSoon),

      searchMoviesPaginated: (query: string, page?: number) =>
        moviesServiceEffect.searchMoviesPaginated(query, page),

      getMoviesByGenrePaginated: (
        genreId: string,
        page?: number,
        isComingSoon?: boolean,
      ) =>
        moviesServiceEffect.getMoviesByGenrePaginated(
          genreId,
          page,
          isComingSoon,
        ),

      getGenres: () => moviesServiceEffect.getGenres(),
    } as const;
  }),
);
