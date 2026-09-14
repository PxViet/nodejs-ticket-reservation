import { apiRequest } from '@/services/api/client';
import { runEffectForQuery } from '@/utils/effect';
import { ProfileService, profileService } from '../profile';

jest.mock('@/services/api/client', () => ({
  apiRequest: jest.fn(),
}));

const mockApiRequest = apiRequest as jest.Mock;

// `GET /users/me` payload — the API models the name as firstName/lastName.
const API_PROFILE = {
  id: 'user1',
  email: 'user1@example.com',
  firstName: 'New',
  lastName: 'Name',
  phoneNumber: null,
  dateOfBirth: null,
  address: null,
  avatarUrl: null,
  role: 'user',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('ProfileService', () => {
  let service: ProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = ProfileService.getInstance();
  });

  it('should be a singleton', () => {
    const instance1 = ProfileService.getInstance();
    const instance2 = ProfileService.getInstance();
    expect(instance1).toBe(instance2);
    expect(instance1).toBe(profileService);
  });

  describe('getProfile', () => {
    it('fetches the authenticated user profile from /users/me', async () => {
      mockApiRequest.mockResolvedValue(API_PROFILE);

      const profile = await runEffectForQuery(service.getProfile());

      expect(mockApiRequest).toHaveBeenCalledWith('/users/me', { auth: true });
      expect(profile).toEqual({
        id: 'user1',
        email: 'user1@example.com',
        firstName: 'New',
        lastName: 'Name',
        fullName: 'New Name',
        phoneNumber: undefined,
        address: undefined,
        avatarUrl: undefined,
        createdAt: API_PROFILE.createdAt,
        updatedAt: API_PROFILE.updatedAt,
      });
    });

    it('throws a SettingError if the request fails', async () => {
      mockApiRequest.mockRejectedValue(new Error('Fetch profile failed'));

      await expect(runEffectForQuery(service.getProfile())).rejects.toThrow(
        'Fetch profile failed',
      );
    });
  });

  describe('updateProfile', () => {
    it('sends the API-mappable fields to PATCH /users/me, dropping email', async () => {
      mockApiRequest.mockResolvedValue({ ...API_PROFILE, address: '1 New St' });

      const profile = await runEffectForQuery(
        service.updateProfile({
          firstName: 'Jane',
          lastName: 'Roe',
          email: 'ignored@example.com',
          address: '1 New St',
          phoneNumber: '0123456789',
        }),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/users/me', {
        method: 'PATCH',
        body: {
          firstName: 'Jane',
          lastName: 'Roe',
          address: '1 New St',
          phoneNumber: '0123456789',
        },
        auth: true,
      });
      expect(profile.address).toBe('1 New St');
      expect(profile.fullName).toBe('New Name');
    });

    it('throws a SettingError if the update fails', async () => {
      mockApiRequest.mockRejectedValue(new Error('Update failed'));

      await expect(
        runEffectForQuery(service.updateProfile({})),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('changePassword', () => {
    it('sends both passwords to PATCH /users/me/password in one call', async () => {
      mockApiRequest.mockResolvedValue(undefined);

      await runEffectForQuery(
        service.changePassword({
          currentPassword: 'oldPassword',
          newPassword: 'newPassword',
        }),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/users/me/password', {
        method: 'PATCH',
        body: { currentPassword: 'oldPassword', newPassword: 'newPassword' },
        auth: true,
      });
    });

    it('throws a SettingError if the current password is rejected', async () => {
      mockApiRequest.mockRejectedValue(
        new Error('Current password is incorrect'),
      );

      await expect(
        runEffectForQuery(
          service.changePassword({
            currentPassword: 'wrongPassword',
            newPassword: 'newPassword',
          }),
        ),
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  // Not implemented yet — the API has no upload endpoint and Supabase
  // Storage is no longer wired up. See SettingError.uploadAvatarError.
  describe('uploadAvatar', () => {
    it('fails with a not-available SettingError', async () => {
      await expect(
        runEffectForQuery(
          service.uploadAvatar('user1', { uri: 'file://avatar.jpg' }),
        ),
      ).rejects.toThrow('Avatar upload is not available yet.');
    });
  });

  describe('deleteAvatar', () => {
    it('fails with a not-available SettingError', async () => {
      await expect(
        runEffectForQuery(
          service.deleteAvatar('https://example.com/avatars/old.jpg'),
        ),
      ).rejects.toThrow('Avatar upload is not available yet.');
    });
  });
});
