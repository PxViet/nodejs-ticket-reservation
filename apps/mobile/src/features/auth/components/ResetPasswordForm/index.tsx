import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { useCallback, useRef } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { TextInput, View } from 'react-native';

// Components
import { Button } from '@/components/Button';
import { PasswordInput } from '@/components/PasswordInput';
import { Typo } from '@/components/Typo';

// Constants
import {
  ERROR_MESSAGES,
  ResetPasswordFormData,
  resetPasswordSchema as resetPasswordSchemaEffect,
  ToastType,
} from '@/constants';

// Hooks
import { useToastAlert } from '@/hooks/useToast';

export const ResetPasswordForm = () => {
  const toast = useToastAlert();

  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ResetPasswordFormData>({
    resolver: effectTsResolver(
      resetPasswordSchemaEffect,
    ) as unknown as Resolver<ResetPasswordFormData>,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const isDisabled = isSubmitting || !isDirty;

  const handleNewPasswordSubmit = useCallback(() => {
    confirmPasswordRef.current?.focus();
  }, []);

  // Not implemented yet — the API has no password-reset-by-email endpoint,
  // and Supabase's recovery-link session handling is no longer wired up.
  const handleSubmitForm = useCallback(() => {
    toast.alert(
      ERROR_MESSAGES.UPDATE_FAILED,
      'Password reset via email is not available yet.',
      [],
      { type: ToastType.ERROR },
    );
  }, [toast]);

  return (
    <View className="flex-1 justify-between" testID="reset-password-form">
      <View className="w-full">
        <Typo size="2xl" weight="semibold" className="mb-2">
          Reset Password
        </Typo>
        <Typo size="base" className="text-text-secondary mb-8">
          Enter your new password below
        </Typo>

        {/* New Password Input */}
        <View className={errors.newPassword ? 'mb-4' : 'mb-9'}>
          <PasswordInput
            ref={newPasswordRef}
            control={control}
            name="newPassword"
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
      <Button
        accessible
        disabled={isDisabled}
        testID="reset-password-submit-button"
        title="Reset Password"
        accessibilityLabel="Reset Password"
        onPress={handleSubmit(handleSubmitForm)}
      />
    </View>
  );
};
