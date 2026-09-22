import { useMemo } from 'react';
import { MovieStatus } from '@/features/booking/schemas/movie';
import { useMoviesByGenreInfinite, useMoviesInfinite } from './useMovies';
import { MOVIE_STATUS } from '@/constants/status';

interface UseMovieDataParams {
  status: MovieStatus;
  // A genre id from `GET /genres`; undefined means the "All" tab.
  genreId?: string;
  enabled?: boolean;
}

export const useMovieData = ({
  status,
  genreId,
  enabled = true,
}: UseMovieDataParams) => {
  const isAllCategory = !genreId;
  const isComingSoon = status === MOVIE_STATUS.COMING_SOON;

  // Fetch all movies, filtered server-side by isComingSoon
  const allMoviesQuery = useMoviesInfinite({
    enabled: enabled && isAllCategory,
    isComingSoon,
  });

  // Fetch movies by genre, filtered server-side by isComingSoon
  const genreMoviesQuery = useMoviesByGenreInfinite({
    genreId: genreId ?? '',
    enabled: enabled && !isAllCategory,
    isComingSoon,
  });

  // Select active query based on category
  const activeQuery = isAllCategory ? allMoviesQuery : genreMoviesQuery;

  // Process and memoize movies data
  const movies = useMemo(() => {
    if (!activeQuery.data?.pages) return [];

    const flatMovies = activeQuery.data.pages.flatMap(page => page.data);

    // Sort by rating for NOW_PLAYING, keep order for COMING_SOON
    if (status === MOVIE_STATUS.NOW_PLAYING) {
      return flatMovies
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 10);
    }

    return flatMovies.slice(0, 10);
  }, [activeQuery.data, status]);

  return {
    movies,
    isLoading: activeQuery.isLoading,
    isFetchingNextPage: activeQuery.isFetchingNextPage,
    hasNextPage: activeQuery.hasNextPage,
    fetchNextPage: activeQuery.fetchNextPage,
    refetch: activeQuery.refetch,
    isRefetching: activeQuery.isRefetching,
  };
};
