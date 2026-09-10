import { Effect } from 'effect';
import { useMutation, useQuery } from '@tanstack/react-query';

// Constants
import { API_CONFIG } from '@/constants';

// Types
import { ChangePasswordData } from '@/features/auth/types/auth';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Effect Services
import { AuthService } from '@/features/auth/effect/services';
import { AuthServiceLayer } from '@/features/auth/layer';
import { ProfileService } from '@/features/setting/effect/services/profile';
import { ProfileServiceLayer } from '@/features/setting/effect/layer/profile';

export const useSession = () => {
  return useQuery({
    queryKey: ['session'],
    queryFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const authService = yield* AuthService;
          return yield* authService.getSession();
        }),
        AuthServiceLayer,
      ),
    staleTime: API_CONFIG.QUERY_STALE_TIME,
  });
};

export const useRefreshSession = () => {
  return useMutation({
    mutationFn: () =>
      runEffectForQuery(
        Effect.gen(function* () {
          const authService = yield* AuthService;
          return yield* authService.refreshSession();
        }),
        AuthServiceLayer,
      ),
  });
};

/**
 * Request a password-reset email.
 *
 * Not implemented yet — see `AuthServiceEffect.resetPassword`.
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async (email: string) => {
      await runEffectForQuery(
        Effect.gen(function* () {
          const authService = yield* AuthService;
          return yield* authService.resetPassword(email);
        }),
        AuthServiceLayer,
      );
      return { success: true };
    },
  });
};

/**
 * Change the authenticated user's password via `PATCH /users/me/password`.
 * The API proves the current password itself (DDR-013) in one round trip.
 */
export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: (data: ChangePasswordData) =>
      runEffectForQuery(
        Effect.gen(function* () {
          const profileService = yield* ProfileService;
          yield* profileService.changePassword(data);
        }),
        ProfileServiceLayer,
      ).then(() => ({ success: true })),
  });
};
