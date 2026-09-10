// Effect
import { Effect, Context } from 'effect';

// Error
import { SettingError } from '../../error';

// Types
import {
  ChangePasswordData,
  UpdateProfileData,
  UserProfile,
} from '@/features/auth/types/auth';

export class ProfileService extends Context.Tag('ProfileServiceTag')<
  ProfileService,
  {
    readonly getProfile: () => Effect.Effect<UserProfile, SettingError, never>;

    readonly updateProfile: (
      data: UpdateProfileData,
    ) => Effect.Effect<UserProfile, SettingError, never>;

    readonly changePassword: (
      data: ChangePasswordData,
    ) => Effect.Effect<void, SettingError, never>;

    readonly uploadAvatar: (
      userId: string,
      file: { uri: string; type?: string; name?: string },
    ) => Effect.Effect<string, SettingError, never>;

    readonly deleteAvatar: (
      avatarUrl: string,
    ) => Effect.Effect<void, SettingError, never>;
  }
>() {}
