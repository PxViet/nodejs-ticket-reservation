import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { Effect } from 'effect';
import React from 'react';

// Constants
import { queryKeys } from '@/constants';

// Hooks
import { useProfile, useUpdateProfile, useUploadAvatar } from '../useProfile';

// Types
import { UserProfile } from '@/features/auth/types/auth';

// Utils
import { profileService } from '../../services/profile';

jest.mock('@/features/setting/services/profile', () => ({
  profileService: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    uploadAvatar: jest.fn(),
  },
}));

const mockUser = { id: 'user-123', email: 'test@example.com' };
const mockProfile: UserProfile = {
  id: 'user-123',
  fullName: 'John Doe',
  email: 'test@example.com',
  phoneNumber: '+1234567890',
  address: '123 Main St',
  avatarUrl: 'https://example.com/avatar.jpg',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Mock auth store
const mockUseAuthStore = jest.fn();

jest.mock('@/features/auth/store/auth', () => ({
  useAuthStore: (selector: any) => mockUseAuthStore(selector),
}));

// Helper to setup store mocks
const setupStoreMocks = (user: any = mockUser) => {
  mockUseAuthStore.mockImplementation((selector: any) => {
    if (selector) {
      return selector({ user });
    }
    return { user };
  });
};

// Helper to create wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return { Wrapper, queryClient };
};

describe('useProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStoreMocks();
  });

  it('should fetch profile when user exists', async () => {
    (profileService.getProfile as jest.Mock).mockReturnValue(
      Effect.succeed(mockProfile),
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useProfile(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(profileService.getProfile).toHaveBeenCalledWith();
    expect(result.current.data).toEqual(mockProfile);
  });

  it('should handle error when fetch fails', async () => {
    const mockError = new Error('Failed to fetch profile');
    (profileService.getProfile as jest.Mock).mockReturnValue(
      Effect.fail(mockError),
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useProfile(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should use correct query key', async () => {
    (profileService.getProfile as jest.Mock).mockReturnValue(
      Effect.succeed(mockProfile),
    );
    const { Wrapper, queryClient } = createWrapper();

    renderHook(() => useProfile(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(
        queryClient.getQueryState(queryKeys.profile.detail('user-123')),
      ).toBeTruthy();
    });
  });
});

describe('useUpdateProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStoreMocks();
  });

  it('should update profile successfully', async () => {
    const updatedProfile = { ...mockProfile, fullName: 'Jane Doe' };
    (profileService.updateProfile as jest.Mock).mockReturnValue(
      Effect.succeed(updatedProfile),
    );
    const { Wrapper, queryClient } = createWrapper();

    queryClient.setQueryData(queryKeys.profile.detail('user-123'), mockProfile);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ firstName: 'Jane' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(profileService.updateProfile).toHaveBeenCalledWith({
      firstName: 'Jane',
    });
    expect(result.current.data).toEqual(updatedProfile);
  });

  it('should perform optimistic update', async () => {
    const updatedProfile = { ...mockProfile, fullName: 'Jane Doe' };
    (profileService.updateProfile as jest.Mock).mockReturnValue(
      Effect.succeed(updatedProfile),
    );
    const { Wrapper, queryClient } = createWrapper();

    queryClient.setQueryData(queryKeys.profile.detail('user-123'), mockProfile);

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ firstName: 'Jane' });
    });

    // Check optimistic update was applied
    const optimisticData = queryClient.getQueryData<UserProfile>(
      queryKeys.profile.detail('user-123'),
    );
    expect(optimisticData?.fullName).toStrictEqual('John Doe');
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should invalidate queries on settled', async () => {
    const updatedProfile = { ...mockProfile, fullName: 'Jane Doe' };
    (profileService.updateProfile as jest.Mock).mockReturnValue(
      Effect.succeed(updatedProfile),
    );
    const { Wrapper, queryClient } = createWrapper();

    queryClient.setQueryData(queryKeys.profile.detail('user-123'), mockProfile);
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ firstName: 'Jane' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.profile.detail('user-123'),
    });
  });

  it('should handle null previous profile in optimistic update', async () => {
    const updatedProfile = { ...mockProfile, fullName: 'Jane Doe' };
    (profileService.updateProfile as jest.Mock).mockReturnValue(
      Effect.succeed(updatedProfile),
    );
    const { Wrapper } = createWrapper();

    // Don't set initial query data - should handle null case

    const { result } = renderHook(() => useUpdateProfile(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.mutate({ firstName: 'Jane' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(profileService.updateProfile).toHaveBeenCalledWith({
      firstName: 'Jane',
    });
  });
});

describe('useUploadAvatar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupStoreMocks();
  });

  it('should upload avatar successfully', async () => {
    const newAvatarUrl = 'https://example.com/new-avatar.jpg';
    (profileService.uploadAvatar as jest.Mock).mockReturnValue(
      Effect.succeed(newAvatarUrl),
    );
    const { Wrapper, queryClient } = createWrapper();

    queryClient.setQueryData(queryKeys.profile.detail('user-123'), mockProfile);

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: Wrapper,
    });

    const mockFile = {
      uri: 'file://path/to/image.jpg',
      name: 'image.jpg',
      type: 'image/jpeg',
    };

    act(() => {
      result.current.mutate({ userId: 'user-123', file: mockFile });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(profileService.uploadAvatar).toHaveBeenCalledWith(
      'user-123',
      mockFile,
    );
    expect(result.current.data).toBe(newAvatarUrl);
  });

  it('should handle error when upload fails', async () => {
    const mockError = new Error('Upload failed');
    (profileService.uploadAvatar as jest.Mock).mockReturnValue(
      Effect.fail(mockError),
    );
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: Wrapper,
    });

    const mockFile = {
      uri: 'file://path/to/image.jpg',
      name: 'image.jpg',
      type: 'image/jpeg',
    };

    act(() => {
      result.current.mutate({ userId: 'user-123', file: mockFile });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(mockError);
  });

  it('should invalidate profile query on success', async () => {
    const newAvatarUrl = 'https://example.com/new-avatar.jpg';
    (profileService.uploadAvatar as jest.Mock).mockReturnValue(
      Effect.succeed(newAvatarUrl),
    );
    const { Wrapper, queryClient } = createWrapper();

    queryClient.setQueryData(queryKeys.profile.detail('user-123'), mockProfile);
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: Wrapper,
    });

    const mockFile = {
      uri: 'file://path/to/image.jpg',
      name: 'image.jpg',
      type: 'image/jpeg',
    };

    act(() => {
      result.current.mutate({ userId: 'user-123', file: mockFile });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.profile.detail('user-123'),
    });
  });

  it('should handle null profile in cache gracefully', async () => {
    const newAvatarUrl = 'https://example.com/new-avatar.jpg';
    (profileService.uploadAvatar as jest.Mock).mockReturnValue(
      Effect.succeed(newAvatarUrl),
    );
    const { Wrapper, queryClient } = createWrapper();

    // Don't set initial query data - profile is null

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: Wrapper,
    });

    const mockFile = {
      uri: 'file://path/to/image.jpg',
      name: 'image.jpg',
      type: 'image/jpeg',
    };

    act(() => {
      result.current.mutate({ userId: 'user-123', file: mockFile });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Profile cache should remain undefined/null
    const profileData = queryClient.getQueryData<UserProfile>(
      queryKeys.profile.detail('user-123'),
    );
    expect(profileData).toBeUndefined();
  });
});
