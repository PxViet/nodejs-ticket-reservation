import { Effect, Layer } from 'effect';

// Services
import { profileService } from '../../services/profile';

// Types
import {
  ChangePasswordData,
  UpdateProfileData,
} from '@/features/auth/types/auth';

// Effect
import { ProfileService } from '../services/profile';

export const ProfileServiceLayer = Layer.effect(
  ProfileService,
  Effect.gen(function* () {
    return {
      getProfile: () => profileService.getProfile(),

      updateProfile: (data: UpdateProfileData) =>
        profileService.updateProfile(data),

      changePassword: (data: ChangePasswordData) =>
        profileService.changePassword(data),

      uploadAvatar: (
        userId: string,
        file: { uri: string; type?: string; name?: string },
      ) => profileService.uploadAvatar(userId, file),

      deleteAvatar: (avatarUrl: string) =>
        profileService.deleteAvatar(avatarUrl),
    } as const;
  }),
);
