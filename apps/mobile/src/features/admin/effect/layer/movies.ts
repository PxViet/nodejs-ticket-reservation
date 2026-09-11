import { Effect, Layer } from 'effect';

// Effect
import { adminMoviesServiceEffect } from '../../services/movies';

// Service
import { AdminMoviesService } from '../services/movies';

export const AdminMoviesServiceLayer = Layer.effect(
  AdminMoviesService,
  Effect.gen(function* () {
    return {
      getMoviesPaginated: (page?: number, title?: string) =>
        adminMoviesServiceEffect.getMoviesPaginated(page, title),

      getMovieById: (id: string) => adminMoviesServiceEffect.getMovieById(id),

      createMovie: payload => adminMoviesServiceEffect.createMovie(payload),

      updateMovie: (id, payload) =>
        adminMoviesServiceEffect.updateMovie(id, payload),

      deleteMovie: (id: string) => adminMoviesServiceEffect.deleteMovie(id),
    } as const;
  }),
);
