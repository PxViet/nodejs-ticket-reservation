// Effect
import { Effect } from 'effect';

// Constants
import { API_CONFIG, queryKeys } from '@/constants';

// React Query
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Effect Services
import { AdminMoviesService } from '@/features/admin/effect/services/movies';
import { AdminMoviesServiceLayer } from '@/features/admin/effect/layer/movies';
import type { AdminMoviePage } from '@/features/admin/services/movies';

// The API pages are one-indexed (DDR-011) and carry `hasMore` in `meta`.
const nextPage = (lastPage: AdminMoviePage) =>
  lastPage.hasMore ? lastPage.page + 1 : undefined;

/** The admin movie list — includes inactive movies (admin token, DDR-014),
 * optionally filtered by title so an admin can find an existing movie fast. */
export const useAdminMoviesInfinite = (search = '') =>
  useInfiniteQuery({
    queryKey: queryKeys.adminMovies.infinite(search || undefined),
    queryFn: ({ pageParam }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const moviesService = yield* AdminMoviesService;
          return yield* moviesService.getMoviesPaginated(
            pageParam,
            search || undefined,
          );
        }),
        AdminMoviesServiceLayer,
      ),
    getNextPageParam: nextPage,
    initialPageParam: 1,
    staleTime: API_CONFIG.MOVIE_STALE_TIME,
  });

/** One movie for the edit form. Disabled in create mode (no `id`). */
export const useAdminMovie = (id?: string) =>
  useQuery({
    queryKey: queryKeys.adminMovies.detail(id ?? ''),
    queryFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const moviesService = yield* AdminMoviesService;
          return yield* moviesService.getMovieById(id!);
        }),
        AdminMoviesServiceLayer,
      ),
    enabled: !!id,
    staleTime: API_CONFIG.MOVIE_STALE_TIME,
  });
