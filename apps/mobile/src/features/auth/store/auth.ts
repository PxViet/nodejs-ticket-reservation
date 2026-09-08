import { Effect } from 'effect';
import { create } from 'zustand';

// Effect
import { AuthService } from '../effect/services';
import { AuthServiceLayer } from '../layer';

// Types
import { AuthSession, AuthUser } from '@/features/auth/types/auth';

// Store
import { registerSessionExpiredHandler } from '@/services/api/session';
import { secureStorage } from '@/services/storage/secure';

// Utils
import { runEffectForQuery } from '@/utils/effect';

interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  setUser: (user: AuthUser | null) => void;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: user => set({ user, isAuthenticated: !!user }),

  setSession: session =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session?.user,
    }),

  setLoading: isLoading => set({ isLoading }),

  initialize: async () => {
    try {
      set({ isLoading: true });
      const session = await runEffectForQuery(
        Effect.gen(function* () {
          const authService = yield* AuthService;
          return yield* authService.getSession();
        }),
        AuthServiceLayer,
      );

      if (session) {
        set({
          session,
          user: session.user,
          isAuthenticated: true,
        });
      }
    } catch {
      set({ user: null, session: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      await runEffectForQuery(
        Effect.gen(function* () {
          const authService = yield* AuthService;
          return yield* authService.signOut();
        }),
        AuthServiceLayer,
      );
      await secureStorage.clear();
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      });
    } catch (error) {
      throw error;
    }
  },

  reset: () =>
    set({
      user: null,
      session: null,
      isLoading: false,
      isAuthenticated: false,
    }),
}));

// When the HTTP client can no longer rotate an expired token pair, drop the
// session so the root layout redirects to sign-in.
registerSessionExpiredHandler(() => {
  useAuthStore.getState().reset();
});
