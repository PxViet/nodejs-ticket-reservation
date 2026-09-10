import { PushToken } from '@/types/notification';

const NOT_IMPLEMENTED =
  'Push-token registration is not available yet — the API has no endpoint for it.';

/**
 * Not implemented yet — the API has no push-token registration endpoint, and
 * Supabase's `push_tokens` table is no longer wired up. Kept as a stub so
 * `usePushNotifications` still compiles; its call site already swallows this
 * rejection (registration is best-effort there).
 */
export class PushTokenService {
  private static instance: PushTokenService;

  private constructor() {}

  static getInstance(): PushTokenService {
    if (!PushTokenService.instance) {
      PushTokenService.instance = new PushTokenService();
    }
    return PushTokenService.instance;
  }

  async savePushToken(
    _userId: string,
    _expoPushToken: string,
    _platform: 'ios' | 'android',
    _deviceId?: string,
  ): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getUserPushTokens(_userId: string): Promise<PushToken[]> {
    return [];
  }

  async deactivatePushToken(
    _userId: string,
    _expoPushToken: string,
  ): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async deletePushToken(
    _userId: string,
    _expoPushToken: string,
  ): Promise<void> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

export const pushTokenService = PushTokenService.getInstance();
