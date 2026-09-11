import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Constants
import { queryKeys } from '@/constants';

// Hooks
import {
  useCreateMovie,
  useDeleteMovie,
  useUpdateMovie,
} from '../useAdminMovieMutations';

// Services
import { adminMoviesServiceEffect } from '@/features/admin/services/movies';

jest.mock('@/features/admin/services/movies', () => ({
  adminMoviesServiceEffect: {
    createMovie: jest.fn(),
    updateMovie: jest.fn(),
    deleteMovie: jest.fn(),
  },
}));

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

  return { Wrapper, queryClient };
};

describe('useCreateMovie', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a movie and invalidates both the admin and public movie caches', async () => {
    const created = { id: '1', title: 'New Movie' };
    (adminMoviesServiceEffect.createMovie as jest.Mock).mockReturnValue(
      Effect.succeed(created),
    );
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateMovie(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ title: 'New Movie' } as any);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adminMoviesServiceEffect.createMovie).toHaveBeenCalledWith({
      title: 'New Movie',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.adminMovies.all,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.movies.all,
    });
  });
});

describe('useUpdateMovie', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates a movie by id and invalidates both caches', async () => {
    const updated = { id: '1', title: 'Renamed' };
    (adminMoviesServiceEffect.updateMovie as jest.Mock).mockReturnValue(
      Effect.succeed(updated),
    );
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateMovie(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ id: '1', payload: { title: 'Renamed' } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adminMoviesServiceEffect.updateMovie).toHaveBeenCalledWith('1', {
      title: 'Renamed',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.adminMovies.all,
    });
  });
});

describe('useDeleteMovie', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deactivates a movie by id and invalidates both caches', async () => {
    (adminMoviesServiceEffect.deleteMovie as jest.Mock).mockReturnValue(
      Effect.succeed(undefined),
    );
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDeleteMovie(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(adminMoviesServiceEffect.deleteMovie).toHaveBeenCalledWith('1');
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.movies.all,
    });
  });

  it('surfaces a failure', async () => {
    (adminMoviesServiceEffect.deleteMovie as jest.Mock).mockReturnValue(
      Effect.fail(new Error('nope')),
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useDeleteMovie(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
