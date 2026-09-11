import { renderHook } from '@testing-library/react-native';

// Mock dependencies
import { useAuthStore } from '@/features/auth/store/auth';
import { useAuth } from '../useAuth';

const mockInitialize = jest.fn();
const mockSignOut = jest.fn();

const mockUser = { id: '1', email: 'test@example.com', role: 'user' };
const mockSession = { user: mockUser, accessToken: 'token' };

jest.mock('@/features/auth/store/auth', () => ({
  useAuthStore: jest.fn(),
}));

describe('useAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useAuthStore as unknown as jest.Mock).mockReturnValue({
      user: mockUser,
      session: mockSession,
      isLoading: false,
      isAuthenticated: true,
      initialize: mockInitialize,
      signOut: mockSignOut,
    });
  });

  describe('Initialization', () => {
    it('should call initialize on mount', () => {
      renderHook(() => useAuth());

      expect(mockInitialize).toHaveBeenCalledTimes(1);
    });

    it('should return correct values from store', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.signOut).toBe(mockSignOut);
    });
  });

  describe('Return Values', () => {
    it('should return user from store', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBe(mockUser);
    });

    it('should return session from store', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.session).toBe(mockSession);
    });

    it('should return isLoading from store', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: mockUser,
        session: mockSession,
        isLoading: true,
        isAuthenticated: false,
        initialize: mockInitialize,
        signOut: mockSignOut,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });

    it('should return isAuthenticated from store', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        initialize: mockInitialize,
        signOut: mockSignOut,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return signOut function from store', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.signOut).toBe(mockSignOut);
      expect(typeof result.current.signOut).toBe('function');
    });
  });

  describe('isAdmin', () => {
    it('should be false for a regular user (DDR-019)', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isAdmin).toBe(false);
    });

    it('should be true when the token role is admin', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: { ...mockUser, role: 'admin' },
        session: mockSession,
        isLoading: false,
        isAuthenticated: true,
        initialize: mockInitialize,
        signOut: mockSignOut,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAdmin).toBe(true);
    });

    it('should be false when there is no signed-in user', () => {
      (useAuthStore as unknown as jest.Mock).mockReturnValue({
        user: null,
        session: null,
        isLoading: false,
        isAuthenticated: false,
        initialize: mockInitialize,
        signOut: mockSignOut,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAdmin).toBe(false);
    });
  });
});
