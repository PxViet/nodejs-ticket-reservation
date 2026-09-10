import { PushTokenService, pushTokenService } from '../push-token';

describe('PushTokenService', () => {
  let service: PushTokenService;

  beforeEach(() => {
    service = PushTokenService.getInstance();
  });

  it('should be a singleton', () => {
    const instance1 = PushTokenService.getInstance();
    const instance2 = PushTokenService.getInstance();
    expect(instance1).toBe(instance2);
    expect(instance1).toBe(pushTokenService);
  });

  // Not implemented yet — the API has no push-token endpoint and Supabase's
  // push_tokens table is no longer wired up.
  describe('savePushToken', () => {
    it('rejects with a not-available error', async () => {
      await expect(
        service.savePushToken('user1', 'token1', 'ios'),
      ).rejects.toThrow('Push-token registration is not available yet');
    });
  });

  describe('getUserPushTokens', () => {
    it('returns an empty list', async () => {
      await expect(service.getUserPushTokens('user1')).resolves.toEqual([]);
    });
  });

  describe('deactivatePushToken', () => {
    it('rejects with a not-available error', async () => {
      await expect(
        service.deactivatePushToken('user1', 'token1'),
      ).rejects.toThrow('Push-token registration is not available yet');
    });
  });

  describe('deletePushToken', () => {
    it('rejects with a not-available error', async () => {
      await expect(service.deletePushToken('user1', 'token1')).rejects.toThrow(
        'Push-token registration is not available yet',
      );
    });
  });
});
