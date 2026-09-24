import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Hooks
import {
  useMovie,
  useMoviesByGenreInfinite,
  useMoviesInfinite,
  useSearchMoviesInfinite,
} from '../useMovies';

// Services
import { moviesServiceEffect } from '@/features/booking/services/movies';

// Types
import { MovieError } from '@/features/booking/error/movie';

jest.mock('@/features/booking/services/movies', () => ({
  moviesServiceEffect: {
    getMoviesPaginated: jest.fn(),
    getMovieById: jest.fn(),
    searchMoviesPaginated: jest.fn(),
    getMoviesByGenrePaginated: jest.fn(),
  },
}));

const page = (ids: string[], pageNumber: number, hasMore: boolean) => ({
  data: ids.map(id => ({ id, title: `Movie ${id}`, status: 'now_playing' })),
  page: pageNumber,
  hasMore,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

describe('useMoviesInfinite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the first (one-indexed) page', async () => {
    (moviesServiceEffect.getMoviesPaginated as jest.Mock).mockReturnValue(
      Effect.succeed(page(['1', '2'], 1, false)),
    );

    const { result } = renderHook(() => useMoviesInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(moviesServiceEffect.getMoviesPaginated).toHaveBeenCalledWith(
      1,
      undefined,
    );
    expect(result.current.data?.pages[0]?.data).toHaveLength(2);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('advances to page 2 when the last page reports hasMore', async () => {
    (moviesServiceEffect.getMoviesPaginated as jest.Mock)
      .mockReturnValueOnce(Effect.succeed(page(['1', '2'], 1, true)))
      .mockReturnValueOnce(Effect.succeed(page(['3'], 2, false)));

    const { result } = renderHook(() => useMoviesInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));
    expect(moviesServiceEffect.getMoviesPaginated).toHaveBeenNthCalledWith(
      2,
      2,
      undefined,
    );
    expect(result.current.hasNextPage).toBe(false);
  });

  it('does not fetch when disabled', () => {
    renderHook(() => useMoviesInfinite({ enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(moviesServiceEffect.getMoviesPaginated).not.toHaveBeenCalled();
  });

  it('passes isComingSoon through to the service', async () => {
    (moviesServiceEffect.getMoviesPaginated as jest.Mock).mockReturnValue(
      Effect.succeed(page(['1'], 1, false)),
    );

    const { result } = renderHook(
      () => useMoviesInfinite({ isComingSoon: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(moviesServiceEffect.getMoviesPaginated).toHaveBeenCalledWith(
      1,
      true,
    );
  });
});

describe('useMoviesByGenreInfinite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes the genre id to the service', async () => {
    (
      moviesServiceEffect.getMoviesByGenrePaginated as jest.Mock
    ).mockReturnValue(Effect.succeed(page(['1'], 1, false)));

    const { result } = renderHook(
      () => useMoviesByGenreInfinite({ genreId: 'g1' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(moviesServiceEffect.getMoviesByGenrePaginated).toHaveBeenCalledWith(
      'g1',
      1,
      undefined,
    );
  });

  it('does not fetch for an empty genre id', () => {
    renderHook(() => useMoviesByGenreInfinite({ genreId: '' }), {
      wrapper: createWrapper(),
    });

    expect(
      moviesServiceEffect.getMoviesByGenrePaginated,
    ).not.toHaveBeenCalled();
  });
});

describe('useSearchMoviesInfinite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('browses via getMoviesPaginated when the query is empty', async () => {
    (moviesServiceEffect.getMoviesPaginated as jest.Mock).mockReturnValue(
      Effect.succeed(page(['1', '2'], 1, false)),
    );

    const { result } = renderHook(() => useSearchMoviesInfinite({}), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(moviesServiceEffect.getMoviesPaginated).toHaveBeenCalledWith(
      1,
      undefined,
    );
    expect(result.current.movies).toHaveLength(2);
  });

  it('searches via searchMoviesPaginated and flattens pages', async () => {
    (moviesServiceEffect.searchMoviesPaginated as jest.Mock).mockReturnValue(
      Effect.succeed(page(['1'], 1, false)),
    );

    const { result } = renderHook(
      () => useSearchMoviesInfinite({ searchQuery: 'bat' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(moviesServiceEffect.searchMoviesPaginated).toHaveBeenCalledWith(
      'bat',
      1,
    );
    expect(result.current.movies).toEqual([
      expect.objectContaining({ id: '1' }),
    ]);
  });
});

describe('useMovie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches a movie by id', async () => {
    const movie = { id: '1', title: 'Movie 1', status: 'now_playing' };
    (moviesServiceEffect.getMovieById as jest.Mock).mockReturnValue(
      Effect.succeed(movie),
    );

    const { result } = renderHook(() => useMovie('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(moviesServiceEffect.getMovieById).toHaveBeenCalledWith('1');
    expect(result.current.data).toEqual(movie);
  });

  it('does not fetch when id is empty', () => {
    renderHook(() => useMovie(''), { wrapper: createWrapper() });
    expect(moviesServiceEffect.getMovieById).not.toHaveBeenCalled();
  });

  it('surfaces a MovieError', async () => {
    (moviesServiceEffect.getMovieById as jest.Mock).mockReturnValue(
      Effect.fail(MovieError.movieNotFound('nope')),
    );

    const { result } = renderHook(() => useMovie('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(MovieError);
    expect((result.current.error as MovieError).message).toBe('nope');
  });
});
