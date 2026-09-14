import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

// Constants
import { ERROR_MESSAGES, MESSAGES, ROUTES, ToastType } from '@/constants';

// Hooks
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
} from '@/features/setting/hooks/useProfile';
import { useToastAlert } from '@/hooks/useToast';

// Types
import { UpdateProfileData } from '@/features/auth/types/auth';

// Components
import { EditProfileForm } from '@/features/setting/components/EditProfileForm';

// Layout
import { KeyboardStickyLayout } from '@/layouts/KeyboardStickyLayout';

// Store
import { useLoadingStore } from '@/stores/loading';

const EditProfileScreen = () => {
  const toast = useToastAlert();
  const router = useRouter();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending: isUpdating } =
    useUpdateProfile();
  const { mutateAsync: uploadAvatar, isPending: isUploading } =
    useUploadAvatar();

  const { showLoading, hideLoading } = useLoadingStore(
    useShallow(state => ({
      showLoading: state.showLoading,
      hideLoading: state.hideLoading,
    })),
  );

  const isLoading = isProfileLoading || isUpdating || isUploading;

  const handleSubmit = async (data: UpdateProfileData) => {
    let avatarUploadUrl: string | undefined = undefined;

    // Only update avatar if it has changed
    if (data.avatarUrl && data.avatarUrl !== profile?.avatarUrl) {
      try {
        avatarUploadUrl = await uploadAvatar({
          userId: profile?.id!,
          file: {
            uri: data.avatarUrl!,
          },
        });
      } catch {
        toast.error(ERROR_MESSAGES.UPDATE_PROFILE_FAILED);
      }
    }

    try {
      // Update profile
      const updatePayload = {
        ...data,
        ...(avatarUploadUrl ? { avatarUrl: avatarUploadUrl } : {}),
      };

      showLoading();

      await updateProfile(updatePayload, {
        onSettled: hideLoading,
      });

      toast.alert(
        MESSAGES.UPDATE_SUCCESS,
        MESSAGES.PROFILE_UPDATE_SUCCESS,
        [{ onPress: () => router.push(ROUTES.PROFILE) }],
        {
          type: ToastType.SUCCESS,
          mode: 'auto',
        },
      );
    } catch (error) {
      toast.alert(
        ERROR_MESSAGES.UPDATE_FAILED,
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.UPDATE_PROFILE_FAILED,
        [],
        { type: ToastType.ERROR },
      );
    }
  };

  return (
    <KeyboardStickyLayout>
      <EditProfileForm
        userInfo={profile}
        isPending={isLoading}
        onSubmit={handleSubmit}
      />
    </KeyboardStickyLayout>
  );
};

export default EditProfileScreen;
