import { memo, useRef } from 'react';
import { Resolver, useForm } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import { effectTsResolver } from '@hookform/resolvers/effect-ts';

// Components
import { Button } from '@/components/Button';
import { EmailInput } from '@/components/EmailInput';
import { PasswordInput } from '@/components/PasswordInput';

// Constants
import {
  SignInFormData,
  signInSchema as signInSchemaEffect,
} from '@/constants';

interface SignInFormProps {
  isPending: boolean;
  onSubmit: (data: SignInFormData) => void;
}

export const SignInForm = memo(({ isPending, onSubmit }: SignInFormProps) => {
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SignInFormData>({
    resolver: effectTsResolver(
      signInSchemaEffect,
    ) as unknown as Resolver<SignInFormData>,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const isDisabled = isSubmitting || isPending || !isDirty;

  const handleEmailSubmit = () => {
    passwordRef.current?.focus();
  };

  const handleSubmitForm = (data: SignInFormData): void => {
    onSubmit(data);
  };

  return (
    <View className="w-full" testID="signin-form">
      {/* Email Address Input */}
      <View className={errors.email ? 'gap-4' : 'gap-9'}>
        <EmailInput
          ref={emailRef}
          control={control}
          name="email"
          testID="signin-email-input"
          onSubmitEditing={handleEmailSubmit}
        />

        {/* Password Input */}
        <PasswordInput
          ref={passwordRef}
          control={control}
          name="password"
          testID="signin-password-input"
          returnKeyType="done"
          containerClassName={errors.password ? 'mb-1' : 'mb-3'}
        />
      </View>

      {/* Submit Button */}
      <Button
        onPress={handleSubmit(handleSubmitForm)}
        disabled={isDisabled}
        className="mt-2"
        accessibilityHint="Sign in to your account"
        testID="signin-submit-button"
        title="Sign In"
        accessibilityLabel="Sign In"
      />
    </View>
  );
});

SignInForm.displayName = 'SignInForm';
