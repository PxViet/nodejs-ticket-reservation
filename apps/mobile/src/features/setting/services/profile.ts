// HTTP
import { apiRequest } from '@/services/api/client';

// Types
import type {
  ChangePasswordRequest,
  UserProfile as ApiUserProfile,
  UpdateUserProfileRequest,
} from '@movea/api-contract';
import {
  ChangePasswordData,
  UpdateProfileData,
  UserProfile,
} from '@/features/auth/types/auth';

// Utils
import { Effect } from 'effect';
import { SettingError } from '../error';

const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : '';

// TODO(profile-migration): drop once screens read firstName/lastName directly
// and `UserProfile` is the contract type. Until then this keeps the shape the
// setting screens already consume.
const toUserProfile = ({
  id,
  email,
  firstName,
  lastName,
  phoneNumber,
  address,
  avatarUrl,
  createdAt,
  updatedAt,
}: ApiUserProfile): UserProfile => ({
  id,
  email,
  firstName,
  lastName,
  fullName: [firstName, lastName].filter(Boolean).join(' '),
  phoneNumber: phoneNumber ?? undefined,
  address: address ?? undefined,
  avatarUrl: avatarUrl ?? undefined,
  createdAt,
  updatedAt,
});

// `PATCH /users/me` accepts the fields below. `email` is intentionally
// dropped: it is not editable via the API.
const toUpdateRequest = ({
  firstName,
  lastName,
  phoneNumber,
  address,
  avatarUrl,
}: UpdateProfileData): UpdateUserProfileRequest => ({
  ...(firstName != null && { firstName }),
  ...(lastName != null && { lastName }),
  ...(phoneNumber != null && { phoneNumber }),
  ...(address != null && { address }),
  ...(avatarUrl != null && { avatarUrl }),
});

export class ProfileService {
  private static instance: ProfileService;

  private constructor() {}

  static getInstance(): ProfileService {
    if (!ProfileService.instance) {
      ProfileService.instance = new ProfileService();
    }
    return ProfileService.instance;
  }

  /**
   * Get the authenticated user's profile — `GET /users/me`.
   */
  getProfile = () =>
    Effect.tryPromise({
      try: async () => {
        const dto = await apiRequest<ApiUserProfile>('/users/me', {
          auth: true,
        });
        return toUserProfile(dto);
      },
      catch: (error: unknown) => SettingError.getProfileError(messageOf(error)),
    });

  /**
   * Update the authenticated user's profile — `PATCH /users/me`.
   */
  updateProfile = (data: UpdateProfileData) =>
    Effect.tryPromise({
      try: async () => {
        const dto = await apiRequest<ApiUserProfile>('/users/me', {
          method: 'PATCH',
          body: toUpdateRequest(data),
          auth: true,
        });
        return toUserProfile(dto);
      },
      catch: (error: unknown) =>
        SettingError.updateProfileError(messageOf(error)),
    });

  /**
   * Change the authenticated user's password — `PATCH /users/me/password`.
   * The API proves the current password itself (DDR-013), so this is a
   * single round trip rather than a separate verify-then-update pair.
   */
  changePassword = ({ currentPassword, newPassword }: ChangePasswordData) =>
    Effect.tryPromise({
      try: () =>
        apiRequest<void>('/users/me/password', {
          method: 'PATCH',
          body: {
            currentPassword,
            newPassword,
          } satisfies ChangePasswordRequest,
          auth: true,
        }),
      catch: (error: unknown) =>
        SettingError.changePasswordError(messageOf(error)),
    });

  /**
   * Upload avatar and return URL.
   *
   * Not implemented yet — the API has no upload endpoint, and Supabase
   * Storage is no longer wired up. Kept as a stub so the edit-profile screen
   * still compiles and renders until this is built against `@movea/api`.
   */
  uploadAvatar = (
    _userId: string,
    _file: { uri: string; type?: string; name?: string },
  ) =>
    Effect.fail(
      SettingError.uploadAvatarError('Avatar upload is not available yet.'),
    );

  /**
   * Delete an existing avatar.
   *
   * Not implemented yet — see `uploadAvatar`.
   */
  deleteAvatar = (_avatarUrl: string) =>
    Effect.fail(
      SettingError.deleteAvatarError('Avatar upload is not available yet.'),
    );
}

export const profileService = ProfileService.getInstance();
