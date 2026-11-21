import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { useRouter } from 'expo-router';
import { memo, useCallback, useRef } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { type TextInputInstance, View } from 'react-native';

// Components
import { Button } from '@/components/Button';
import { PasswordInput } from '@/components/PasswordInput';

// Hooks
import { useUpdatePassword } from '@/hooks/useSession';
import { useToastAlert } from '@/hooks/useToast';

// Constants
import {
  ChangePasswordFormData,
  changePasswordSchema as changePasswordSchemaEffect,
  ERROR_MESSAGES,
  MESSAGES,
  ToastType,
} from '@/constants';

export const ChangePasswordForm = memo(() => {
  const toast = useToastAlert();
  const router = useRouter();
  const { mutate: updatePassword, isPending } = useUpdatePassword();

  const currentPasswordRef = useRef<TextInputInstance>(null);
  const newPasswordRef = useRef<TextInputInstance>(null);
  const confirmPasswordRef = useRef<TextInputInstance>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ChangePasswordFormData>({
    resolver: effectTsResolver(
      changePasswordSchemaEffect,
    ) as unknown as Resolver<ChangePasswordFormData>,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const isDisabled = isSubmitting || isPending || !isDirty;

  const handleCurrentPasswordSubmit = useCallback(() => {
    newPasswordRef.current?.focus();
  }, []);

  const handleNewPasswordSubmit = useCallback(() => {
    confirmPasswordRef.current?.focus();
  }, []);

  const handleSubmitForm = useCallback(
    (data: ChangePasswordFormData): void => {
      updatePassword(data, {
        onSuccess: () => {
          toast.alert(
            MESSAGES.UPDATE_SUCCESS,
            MESSAGES.PASSWORD_UPDATE_SUCCESS,
            [
              {
                text: 'OK',
                onPress: () => {
                  router.back();
                },
              },
            ],
            { type: ToastType.SUCCESS },
          );
        },
        onError: error => {
          toast.alert(
            ERROR_MESSAGES.UPDATE_FAILED,
            error instanceof Error
              ? error.message
              : ERROR_MESSAGES.UPDATE_PASSWORD_FAILED,
            [],
            { type: ToastType.ERROR },
          );
        },
      });
    },
    [router, toast, updatePassword],
  );

  return (
    <View className="flex-1 justify-between">
      <View className="w-full">
        {/* Current Password Input */}
        <View className={errors.currentPassword ? 'mb-4' : 'mb-9'}>
          <PasswordInput
            ref={currentPasswordRef}
            control={control}
            name="currentPassword"
            testID="current-password-input"
            onSubmitEditing={handleCurrentPasswordSubmit}
          />
        </View>

        {/* New Password Input */}
        <View className={errors.newPassword ? 'mb-4' : 'mb-9'}>
          <PasswordInput
            ref={newPasswordRef}
            control={control}
            name="newPassword"
            label="Password"
            testID="new-password-input"
            onSubmitEditing={handleNewPasswordSubmit}
          />
        </View>

        {/* Confirm Password Input */}
        <View className={errors.confirmPassword ? 'mb-6' : 'mb-5'}>
          <PasswordInput
            ref={confirmPasswordRef}
            control={control}
            name="confirmPassword"
            testID="confirm-password-input"
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Submit Button */}
      <View className="mb-12">
        <Button
          accessible
          disabled={isDisabled}
          testID="change-password-submit-button"
          title="Change Password"
          accessibilityLabel="Change Password"
          onPress={handleSubmit(handleSubmitForm)}
        />
      </View>
    </View>
  );
});

ChangePasswordForm.displayName = 'ChangePasswordForm';
