import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Hooks
import { useAdminMovie, useAdminMoviesInfinite } from '../useAdminMovies';

// Services
import { adminMoviesServiceEffect } from '@/features/admin/services/movies';

// Error
import { AdminMovieError } from '@/features/admin/error/movie';

jest.mock('@/features/admin/services/movies', () => ({
  adminMoviesServiceEffect: {
    getMoviesPaginated: jest.fn(),
    getMovieById: jest.fn(),
  },
}));

const page = (ids: string[], pageNumber: number, hasMore: boolean) => ({
  data: ids.map(id => ({ id, title: `Movie ${id}`, isActive: true })),
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

describe('useAdminMoviesInfinite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the first page with no search term', async () => {
    (adminMoviesServiceEffect.getMoviesPaginated as jest.Mock).mockReturnValue(
      Effect.succeed(page(['1', '2'], 1, false)),
    );

    const { result } = renderHook(() => useAdminMoviesInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adminMoviesServiceEffect.getMoviesPaginated).toHaveBeenCalledWith(
      1,
      undefined,
    );
    expect(result.current.data?.pages[0]?.data).toHaveLength(2);
  });

  it('passes a non-empty search term through as the title filter', async () => {
    (adminMoviesServiceEffect.getMoviesPaginated as jest.Mock).mockReturnValue(
      Effect.succeed(page([], 1, false)),
    );

    const { result } = renderHook(() => useAdminMoviesInfinite('bat'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adminMoviesServiceEffect.getMoviesPaginated).toHaveBeenCalledWith(
      1,
      'bat',
    );
  });

  it('advances to page 2 when the last page reports hasMore', async () => {
    (adminMoviesServiceEffect.getMoviesPaginated as jest.Mock)
      .mockReturnValueOnce(Effect.succeed(page(['1'], 1, true)))
      .mockReturnValueOnce(Effect.succeed(page(['2'], 2, false)));

    const { result } = renderHook(() => useAdminMoviesInfinite(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages.length).toBe(2));
    expect(adminMoviesServiceEffect.getMoviesPaginated).toHaveBeenNthCalledWith(
      2,
      2,
      undefined,
    );
  });
});

describe('useAdminMovie', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches a movie by id', async () => {
    const movie = { id: '1', title: 'Movie 1', isActive: true };
    (adminMoviesServiceEffect.getMovieById as jest.Mock).mockReturnValue(
      Effect.succeed(movie),
    );

    const { result } = renderHook(() => useAdminMovie('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(adminMoviesServiceEffect.getMovieById).toHaveBeenCalledWith('1');
    expect(result.current.data).toEqual(movie);
  });

  it('does not fetch when id is undefined (create mode)', () => {
    renderHook(() => useAdminMovie(undefined), { wrapper: createWrapper() });
    expect(adminMoviesServiceEffect.getMovieById).not.toHaveBeenCalled();
  });

  it('surfaces an AdminMovieError', async () => {
    (adminMoviesServiceEffect.getMovieById as jest.Mock).mockReturnValue(
      Effect.fail(AdminMovieError.loadFailed('not found')),
    );

    const { result } = renderHook(() => useAdminMovie('1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(AdminMovieError);
  });
});
