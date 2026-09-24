// Effect
import { Effect } from 'effect';

// Constants
import { API_CONFIG, queryKeys } from '@/constants';

// React Query
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Effect Services
import { MoviesService } from '@/features/booking/effect/services/movies';
import { MoviesServiceLayer } from '@/features/booking/effect/layer/movies';
import type { MoviePage } from '@/features/booking/services/movies';

interface UseMoviesOptions {
  enabled?: boolean;
  isComingSoon?: boolean;
}

interface UseMoviesByGenreOptions extends UseMoviesOptions {
  genreId: string;
}

interface UseSearchMoviesInfiniteOptions extends UseMoviesOptions {
  searchQuery?: string;
}

// The API pages are one-indexed (DDR-011) and carry `hasMore` in `meta`.
const nextPage = (lastPage: MoviePage) =>
  lastPage.hasMore ? lastPage.page + 1 : undefined;

export const useMoviesInfinite = (options: UseMoviesOptions = {}) => {
  const { enabled = true, isComingSoon } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.movies.infinite({ isComingSoon }),
    queryFn: ({ pageParam }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const moviesService = yield* MoviesService;
          return yield* moviesService.getMoviesPaginated(
            pageParam,
            isComingSoon,
          );
        }),
        MoviesServiceLayer,
      ),
    getNextPageParam: nextPage,
    initialPageParam: 1,
    enabled,
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });
};

export const useMovie = (id: string) => {
  return useQuery({
    queryKey: queryKeys.movies.detail(id),
    queryFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const moviesService = yield* MoviesService;
          return yield* moviesService.getMovieById(id);
        }),
        MoviesServiceLayer,
      ),
    enabled: !!id,
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });
};

export const useSearchMoviesInfinite = (
  options: UseSearchMoviesInfiniteOptions = {},
) => {
  const { searchQuery, enabled = true } = options;

  const isSearching = Boolean(searchQuery && searchQuery.trim().length > 0);

  const infiniteQuery = useInfiniteQuery({
    queryKey: isSearching
      ? queryKeys.movies.searchInfinite(searchQuery!)
      : queryKeys.movies.infinite(),

    queryFn: ({ pageParam }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const moviesService = yield* MoviesService;
          return isSearching
            ? yield* moviesService.searchMoviesPaginated(
                searchQuery!,
                pageParam,
              )
            : yield* moviesService.getMoviesPaginated(pageParam);
        }),
        MoviesServiceLayer,
      ),

    getNextPageParam: nextPage,
    initialPageParam: 1,
    enabled,
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });

  // Flatten the pages into a single movie array.
  const movies = infiniteQuery.data?.pages.flatMap(page => page.data) ?? [];

  return {
    ...infiniteQuery,
    movies,
  };
};

export const useMoviesByGenreInfinite = (options: UseMoviesByGenreOptions) => {
  const { genreId, enabled = true, isComingSoon } = options;

  return useInfiniteQuery({
    queryKey: queryKeys.movies.infinite({ genreId, isComingSoon }),
    queryFn: ({ pageParam }) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const moviesService = yield* MoviesService;
          return yield* moviesService.getMoviesByGenrePaginated(
            genreId,
            pageParam,
            isComingSoon,
          );
        }),
        MoviesServiceLayer,
      ),
    getNextPageParam: nextPage,
    initialPageParam: 1,
    enabled: enabled && genreId.length > 0,
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });
};
