// Effect
import { Effect } from 'effect';

// Types
import { SignInData, SignUpData } from '../../types/auth';

// Services
import { authServiceEffect } from '../../services/auth.effect';

export class AuthService extends Effect.Service<AuthService>()(
  'AuthServiceTag',
  {
    effect: Effect.gen(function* () {
      return {
        signUp: (data: SignUpData) => authServiceEffect.signUp(data),

        signIn: (data: SignInData) => authServiceEffect.signIn(data),

        signOut: () => authServiceEffect.signOut(),

        getSession: () => authServiceEffect.getSession(),

        refreshSession: () => authServiceEffect.refreshSession(),

        resetPassword: (email: string) =>
          authServiceEffect.resetPassword(email),
      } as const;
    }),
  },
) {}
