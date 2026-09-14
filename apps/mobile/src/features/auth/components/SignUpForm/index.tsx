import { memo, useCallback, useRef } from 'react';
import { Controller, Resolver, useForm } from 'react-hook-form';
import { ScrollView, TextInput, View } from 'react-native';
import { effectTsResolver } from '@hookform/resolvers/effect-ts';

// Components
import { Button } from '@/components/Button';
import { EmailInput } from '@/components/EmailInput';
import { Input } from '@/components/Input';
import { PasswordInput } from '@/components/PasswordInput';

// Types
import { SignUpData } from '@/features/auth/types/auth';

// Constants
import {
  SignUpFormData,
  signUpSchema as signUpSchemaEffect,
} from '@/constants';

interface SignUpFormProps {
  isPending: boolean;
  onSubmit: (data: SignUpData) => void;
}

export const SignUpForm = memo(({ isPending, onSubmit }: SignUpFormProps) => {
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SignUpFormData>({
    resolver: effectTsResolver(
      signUpSchemaEffect,
    ) as unknown as Resolver<SignUpFormData>,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const isDisabled = isSubmitting || isPending || !isDirty;

  const handleFirstNameSubmit = useCallback(() => {
    lastNameRef.current?.focus();
  }, []);

  const handleLastNameSubmit = useCallback(() => {
    emailRef.current?.focus();
  }, []);

  const handleEmailSubmit = useCallback(() => {
    passwordRef.current?.focus();
  }, []);

  const handlePasswordSubmit = useCallback(() => {
    confirmPasswordRef.current?.focus();
  }, []);

  const handleSubmitForm = useCallback(
    (data: SignUpFormData): void => {
      const signUpData: SignUpData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
      };
      onSubmit(signUpData);
    },
    [onSubmit],
  );

  return (
    <View className="flex-1 w-full" testID="signup-form">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* First Name Input */}
        <View className={errors.firstName ? 'mb-4' : 'mb-9'}>
          <Controller
            control={control}
            name="firstName"
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <Input
                ref={firstNameRef}
                accessibilityRole="text"
                accessibilityLabel="First Name input field"
                accessibilityHint="Type your first name"
                label="First Name"
                value={value}
                error={error?.message}
                testID="signup-firstname-input"
                returnKeyType="next"
                autoCapitalize="words"
                autoCorrect={false}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={handleFirstNameSubmit}
              />
            )}
          />
        </View>

        {/* Last Name Input */}
        <View className={errors.lastName ? 'mb-4' : 'mb-9'}>
          <Controller
            control={control}
            name="lastName"
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <Input
                ref={lastNameRef}
                accessibilityRole="text"
                accessibilityLabel="Last Name input field"
                accessibilityHint="Type your last name"
                label="Last Name"
                value={value}
                error={error?.message}
                testID="signup-lastname-input"
                returnKeyType="next"
                autoCapitalize="words"
                autoCorrect={false}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={handleLastNameSubmit}
              />
            )}
          />
        </View>

        {/* Email Address Input */}
        <View className={errors.email ? 'mb-4' : 'mb-9'}>
          <EmailInput
            ref={emailRef}
            control={control}
            name="email"
            testID="signup-email-input"
            onSubmitEditing={handleEmailSubmit}
          />
        </View>

        {/* Password Input */}
        <View className={errors.password ? 'mb-4' : 'mb-9'}>
          <PasswordInput
            ref={passwordRef}
            control={control}
            name="password"
            testID="signup-password-input"
            onSubmitEditing={handlePasswordSubmit}
          />
        </View>

        {/* Confirm Password Input */}
        <View className={errors.confirmPassword ? 'mb-6' : 'mb-5'}>
          <PasswordInput
            ref={confirmPasswordRef}
            control={control}
            name="confirmPassword"
            testID="signup-confirmpassword-input"
            returnKeyType="done"
            containerClassName={errors.confirmPassword ? 'mb-1' : 'mb-7'}
          />
        </View>
      </ScrollView>

      {/* Sticky footer — stays put while the fields above scroll. */}
      <View className="px-4 pt-3 pb-6">
        <Button
          accessible
          disabled={isDisabled}
          testID="signup-submit-button"
          title="Sign Up"
          accessibilityLabel="Sign Up"
          accessibilityHint="Sign up to your account"
          onPress={handleSubmit(handleSubmitForm)}
        />
      </View>
    </View>
  );
});

SignUpForm.displayName = 'SignUpForm';
