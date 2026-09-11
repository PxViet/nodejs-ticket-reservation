// Effect
import { Effect } from 'effect';

// Stores
import { useAuthStore } from '@/features/auth/store/auth';

// Types
import { SignInData } from '@/features/auth/types/auth';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// React Query
import { useMutation } from '@tanstack/react-query';

// Effect Services
import { AuthService } from '@/features/auth/effect/services';
import { AuthServiceLayer } from '@/features/auth/layer';

// No success toast — signing in takes the user straight to the app, which is
// feedback enough; the caller (SignInScreen) already shows a toast on error.
export const useSignIn = () => {
  const setSession = useAuthStore(state => state.setSession);

  return useMutation({
    mutationFn: async (data: SignInData) => {
      const result = await runEffectForQuery(
        Effect.gen(function* () {
          const authService = yield* AuthService;
          return yield* authService.signIn(data);
        }),
        AuthServiceLayer,
      );
      return result;
    },
    onSuccess: data => {
      setSession(data.session);
    },
  });
};
