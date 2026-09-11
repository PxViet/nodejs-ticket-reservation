// Effect
import { Effect } from 'effect';

// React Query
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Constants
import { queryKeys } from '@/constants';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Types
import type {
  CreateMovieRequest,
  UpdateMovieRequest,
} from '@movea/api-contract';

// Effect Services
import { AdminMoviesService } from '@/features/admin/effect/services/movies';
import { AdminMoviesServiceLayer } from '@/features/admin/effect/layer/movies';

// A create/update/delete changes both the admin list and the public
// catalogue (`GET /movies` — the same endpoint, just a different token), so
// both cache namespaces are invalidated together.
const invalidateMovieCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
) => {
  queryClient.invalidateQueries({ queryKey: queryKeys.adminMovies.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.movies.all });
};

export const useCreateMovie = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMovieRequest) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const moviesService = yield* AdminMoviesService;
          return yield* moviesService.createMovie(payload);
        }),
        AdminMoviesServiceLayer,
      ),
    onSuccess: () => invalidateMovieCaches(queryClient),
  });
};

export const useUpdateMovie = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateMovieRequest;
    }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const moviesService = yield* AdminMoviesService;
          return yield* moviesService.updateMovie(id, payload);
        }),
        AdminMoviesServiceLayer,
      ),
    onSuccess: () => invalidateMovieCaches(queryClient),
  });
};

export const useDeleteMovie = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const moviesService = yield* AdminMoviesService;
          return yield* moviesService.deleteMovie(id);
        }),
        AdminMoviesServiceLayer,
      ),
    onSuccess: () => invalidateMovieCaches(queryClient),
  });
};
