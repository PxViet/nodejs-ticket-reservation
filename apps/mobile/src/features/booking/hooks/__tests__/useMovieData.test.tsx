import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import { useMovieData } from '../useMovieData';
import * as useMoviesModule from '../useMovies';
import { MOVIE_STATUS } from '@/constants/status';
import { MovieStatus } from '../../schemas/movie';

jest.mock('../useMovies');

const mockUseMoviesInfinite =
  useMoviesModule.useMoviesInfinite as jest.MockedFunction<
    typeof useMoviesModule.useMoviesInfinite
  >;
const mockUseMoviesByGenreInfinite =
  useMoviesModule.useMoviesByGenreInfinite as jest.MockedFunction<
    typeof useMoviesModule.useMoviesByGenreInfinite
  >;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

// A page of the API-shaped infinite result: { data, page, hasMore }.
const pageOf = (movies: unknown[]) => ({
  data: movies,
  page: 1,
  hasMore: false,
});

const nowPlaying = [
  { id: '1', title: 'Movie 1', rating: 8.5, status: MOVIE_STATUS.NOW_PLAYING },
  { id: '2', title: 'Movie 2', rating: 7.2, status: MOVIE_STATUS.NOW_PLAYING },
  { id: '3', title: 'Movie 3', rating: 9.1, status: MOVIE_STATUS.NOW_PLAYING },
];

const baseQueryResult = {
  data: { pages: [pageOf(nowPlaying)] },
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
  isRefetching: false,
};

const emptyResult = { ...baseQueryResult, data: undefined };

describe('useMovieData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('All category (no genre)', () => {
    beforeEach(() => {
      mockUseMoviesInfinite.mockReturnValue(baseQueryResult as any);
      mockUseMoviesByGenreInfinite.mockReturnValue(emptyResult as any);
    });

    it('uses useMoviesInfinite and disables the genre query', () => {
      const { result } = renderHook(
        () =>
          useMovieData({
            status: MOVIE_STATUS.NOW_PLAYING as MovieStatus,
            genreId: undefined,
          }),
        { wrapper: createWrapper() },
      );

      expect(mockUseMoviesInfinite).toHaveBeenCalledWith({
        enabled: true,
        isComingSoon: false,
      });
      expect(mockUseMoviesByGenreInfinite).toHaveBeenCalledWith({
        genreId: '',
        enabled: false,
        isComingSoon: false,
      });
      expect(result.current.movies).toHaveLength(3);
    });

    it('sorts NOW_PLAYING by rating descending', () => {
      const { result } = renderHook(
        () => useMovieData({ status: MOVIE_STATUS.NOW_PLAYING as MovieStatus }),
        { wrapper: createWrapper() },
      );

      expect(result.current.movies.map(m => m.rating)).toEqual([9.1, 8.5, 7.2]);
    });

    it('filters by isComingSoon server-side rather than in the client', () => {
      const { result } = renderHook(
        () => useMovieData({ status: MOVIE_STATUS.NOW_PLAYING as MovieStatus }),
        { wrapper: createWrapper() },
      );

      expect(mockUseMoviesInfinite).toHaveBeenCalledWith(
        expect.objectContaining({ isComingSoon: false }),
      );
      expect(result.current.movies).toHaveLength(3);
    });

    it('limits to 10 movies', () => {
      const many = Array.from({ length: 15 }, (_, i) => ({
        id: `${i}`,
        title: `Movie ${i}`,
        rating: i,
        status: MOVIE_STATUS.NOW_PLAYING,
      }));
      mockUseMoviesInfinite.mockReturnValue({
        ...baseQueryResult,
        data: { pages: [pageOf(many)] },
      } as any);

      const { result } = renderHook(
        () => useMovieData({ status: MOVIE_STATUS.NOW_PLAYING as MovieStatus }),
        { wrapper: createWrapper() },
      );

      expect(result.current.movies).toHaveLength(10);
    });
  });

  describe('Genre category', () => {
    it('uses useMoviesByGenreInfinite with the genre id', () => {
      mockUseMoviesInfinite.mockReturnValue(emptyResult as any);
      mockUseMoviesByGenreInfinite.mockReturnValue(baseQueryResult as any);

      const { result } = renderHook(
        () =>
          useMovieData({
            status: MOVIE_STATUS.NOW_PLAYING as MovieStatus,
            genreId: 'g1',
          }),
        { wrapper: createWrapper() },
      );

      expect(mockUseMoviesInfinite).toHaveBeenCalledWith({
        enabled: false,
        isComingSoon: false,
      });
      expect(mockUseMoviesByGenreInfinite).toHaveBeenCalledWith({
        genreId: 'g1',
        enabled: true,
        isComingSoon: false,
      });
      expect(result.current.movies).toHaveLength(3);
    });
  });

  describe('COMING_SOON', () => {
    it('keeps the original order', () => {
      const soon = [
        { id: '1', title: 'A', status: MOVIE_STATUS.COMING_SOON },
        { id: '2', title: 'B', status: MOVIE_STATUS.COMING_SOON },
        { id: '3', title: 'C', status: MOVIE_STATUS.COMING_SOON },
      ];
      mockUseMoviesInfinite.mockReturnValue({
        ...baseQueryResult,
        data: { pages: [pageOf(soon)] },
      } as any);
      mockUseMoviesByGenreInfinite.mockReturnValue(emptyResult as any);

      const { result } = renderHook(
        () => useMovieData({ status: MOVIE_STATUS.COMING_SOON as MovieStatus }),
        { wrapper: createWrapper() },
      );

      expect(result.current.movies.map(m => m.id)).toEqual(['1', '2', '3']);
    });
  });

  describe('pass-through', () => {
    it('returns an empty array and forwards flags when there is no data', () => {
      mockUseMoviesInfinite.mockReturnValue({
        ...emptyResult,
        isLoading: true,
      } as any);
      mockUseMoviesByGenreInfinite.mockReturnValue(emptyResult as any);

      const { result } = renderHook(
        () => useMovieData({ status: MOVIE_STATUS.NOW_PLAYING as MovieStatus }),
        { wrapper: createWrapper() },
      );

      expect(result.current.movies).toEqual([]);
      expect(result.current.isLoading).toBe(true);
    });

    it('exposes fetchNextPage / refetch from the active query', () => {
      const fetchNextPage = jest.fn();
      const refetch = jest.fn();
      mockUseMoviesInfinite.mockReturnValue({
        ...baseQueryResult,
        fetchNextPage,
        refetch,
      } as any);
      mockUseMoviesByGenreInfinite.mockReturnValue(emptyResult as any);

      const { result } = renderHook(
        () => useMovieData({ status: MOVIE_STATUS.NOW_PLAYING as MovieStatus }),
        { wrapper: createWrapper() },
      );

      result.current.fetchNextPage();
      result.current.refetch();
      expect(fetchNextPage).toHaveBeenCalled();
      expect(refetch).toHaveBeenCalled();
    });
  });
});
