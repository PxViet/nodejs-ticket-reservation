import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../auth';

// Import the mocked modules to get references to the mock functions
import { authServiceEffect } from '@/features/auth/services/auth.effect';
import { Effect } from 'effect';
import { secureStorage } from '@/services/storage/secure';

// Mock dependencies - declare but don't initialize yet
let mockGetSession: jest.Mock;
let mockSignOut: jest.Mock;
let mockClear: jest.Mock;

jest.mock('@/features/auth/services/auth.effect', () => ({
  authServiceEffect: {
    getSession: jest.fn(),
    signOut: jest.fn(),
  },
}));

jest.mock('@/services/storage/secure', () => ({
  secureStorage: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
    getSession: jest.fn().mockResolvedValue(null),
    setSession: jest.fn().mockResolvedValue(undefined),
    removeSession: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    // Get references to the mocked functions
    mockGetSession = authServiceEffect.getSession as jest.Mock;
    mockSignOut = authServiceEffect.signOut as jest.Mock;
    mockClear = secureStorage.clear as jest.Mock;

    // Clear all mocks
    jest.clearAllMocks();

    // Reset store state
    const store = useAuthStore.getState();
    store.reset();
    useAuthStore.setState({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
    });
  });

  describe('setUser', () => {
    it('should update user and isAuthenticated state', () => {
      const mockUser = { id: '1', email: 'test@example.com' } as any;

      act(() => {
        useAuthStore.getState().setUser(mockUser);
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set isAuthenticated to false when user is null', () => {
      act(() => {
        useAuthStore.getState().setUser(null);
      });

      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setSession', () => {
    it('should update session, user, and isAuthenticated state', () => {
      const mockUser = { id: '1', email: 'test@example.com' } as any;
      const mockSession = {
        user: mockUser,
        access_token: 'token',
      } as any;

      act(() => {
        useAuthStore.getState().setSession(mockSession);
      });

      const state = useAuthStore.getState();
      expect(state.session).toEqual(mockSession);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should set user and isAuthenticated to false when session is null', () => {
      act(() => {
        useAuthStore.getState().setSession(null);
      });

      const state = useAuthStore.getState();
      expect(state.session).toBe(null);
      expect(state.user).toBe(null);
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('should update isLoading state', () => {
      act(() => {
        useAuthStore.getState().setLoading(false);
      });

      expect(useAuthStore.getState().isLoading).toBe(false);

      act(() => {
        useAuthStore.getState().setLoading(true);
      });

      expect(useAuthStore.getState().isLoading).toBe(true);
    });
  });

  describe('initialize', () => {
    it('should set loading to false even when session is null', async () => {
      mockGetSession.mockReturnValue(Effect.succeed(null));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBe(null);
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should successfully initialize with valid session', async () => {
      const mockUser = { id: '1', email: 'test@example.com' } as any;
      const mockSession = {
        user: mockUser,
        access_token: 'token',
      } as any;

      mockGetSession.mockReturnValue(Effect.succeed(mockSession));

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization error and reset state', async () => {
      mockGetSession.mockReturnValue(
        Effect.fail(new Error('Session fetch failed')),
      );

      const { result } = renderHook(() => useAuthStore());

      await act(async () => {
        await result.current.initialize();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.session).toBe(null);
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('signOut', () => {
    it('should successfully sign out and clear state', async () => {
      const mockUser = { id: '1', email: 'test@example.com' } as any;
      const mockSession = {
        user: mockUser,
        access_token: 'token',
      } as any;

      mockSignOut.mockReturnValue(Effect.succeed(undefined));
      mockClear.mockResolvedValue(undefined);

      act(() => {
        useAuthStore.getState().setSession(mockSession);
      });

      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      await act(async () => {
        await useAuthStore.getState().signOut();
      });

      const finalState = useAuthStore.getState();
      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockClear).toHaveBeenCalledTimes(1);
      expect(finalState.user).toBe(null);
      expect(finalState.session).toBe(null);
      expect(finalState.isAuthenticated).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      act(() => {
        useAuthStore.getState().setUser({ id: '1' } as any);
        useAuthStore.getState().setSession({ access_token: 'token' } as any);
        useAuthStore.getState().setLoading(false);
      });

      act(() => {
        useAuthStore.getState().reset();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBe(null);
      expect(state.session).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
    });
  });
});
