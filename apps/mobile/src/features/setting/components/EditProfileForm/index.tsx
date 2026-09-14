import { effectTsResolver } from '@hookform/resolvers/effect-ts';
import { memo, useCallback, useRef } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { TextInput, View } from 'react-native';

// Components
import { Button } from '@/components/Button';
import { EmailInput } from '@/components/EmailInput';
import { Input } from '@/components/Input';
import { StickyFooterScrollView } from '@/components/StickyFooterScrollView';
import { EditableAvatar } from '@/features/camera/components/EditableAvatar';

// Types
import { UpdateProfileData, UserProfile } from '@/features/auth/types/auth';

// Constants
import {
  EditProfileFormData,
  editProfileSchema as editProfileSchemaEffect,
} from '@/constants';

interface EditProfileProps {
  userInfo?: UserProfile;
  isPending: boolean;
  onSubmit: (data: UpdateProfileData) => void;
}

export const EditProfileForm = memo(
  ({ isPending, userInfo, onSubmit }: EditProfileProps) => {
    const firstNameRef = useRef<TextInput>(null);
    const lastNameRef = useRef<TextInput>(null);
    const emailRef = useRef<TextInput>(null);
    const addressRef = useRef<TextInput>(null);
    const phoneNumberRef = useRef<TextInput>(null);

    const {
      control,
      handleSubmit,
      formState: { errors, isSubmitting, isDirty, dirtyFields },
    } = useForm<EditProfileFormData>({
      resolver: effectTsResolver(
        editProfileSchemaEffect,
      ) as unknown as Resolver<EditProfileFormData>,
      mode: 'onBlur',
      reValidateMode: 'onBlur',
      // The profile omits fields the user never set, but the schema only
      // accepts null/strings — an undefined avatarUrl fails validation on a
      // field with no visible error, so submit would silently do nothing.
      defaultValues: {
        ...userInfo,
        avatarUrl: userInfo?.avatarUrl ?? null,
        address: userInfo?.address ?? '',
        phoneNumber: userInfo?.phoneNumber ?? '',
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
      addressRef.current?.focus();
    }, []);

    const handleAddressSubmit = useCallback(() => {
      phoneNumberRef.current?.focus();
    }, []);

    const handleSubmitForm = useCallback(
      (data: EditProfileFormData): void => {
        const dataUpdated = Object.keys(dirtyFields).reduce((acc, key) => {
          const fieldKey = key as keyof EditProfileFormData;
          const value = data[fieldKey];

          // Include the field if it's dirty
          if (dirtyFields[fieldKey]) {
            (acc as any)[fieldKey] = value || '';
          }

          return acc;
        }, {} as Partial<UpdateProfileData>);

        if (Object.keys(dataUpdated).length > 0) {
          onSubmit(dataUpdated);
        }
      },
      [dirtyFields, onSubmit],
    );

    return (
      <StickyFooterScrollView
        contentContainerClassName="px-6 pt-4 pb-6"
        footerClassName="px-6 pt-3 pb-6"
        footer={
          <Button
            accessible
            disabled={isDisabled}
            testID="update-my-profile-submit-button"
            title="Update My Profile"
            accessibilityLabel="Update My Profile"
            onPress={handleSubmit(handleSubmitForm)}
          />
        }
      >
        <Controller
          control={control}
          name="avatarUrl"
          render={({ field: { value, onChange } }) => (
            <View className="items-center mt-4 mb-12">
              <EditableAvatar
                initialSource={value}
                source={value}
                accessibilityLabel="Select avatar"
                onChangeImage={uri => onChange(uri)}
              />
            </View>
          )}
        />

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
        <View className={errors.email ? 'mb-4' : 'mb-9'}>
          {/* Email Address Input */}
          <EmailInput
            ref={emailRef}
            control={control}
            name="email"
            testID="signup-email-input"
            onSubmitEditing={handleEmailSubmit}
          />
        </View>
        <View className={errors.address ? 'mb-4' : 'mb-9'}>
          {/* Address Input */}
          <Controller
            control={control}
            name="address"
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <Input
                ref={addressRef}
                accessibilityRole="text"
                accessibilityLabel="Address input field"
                label="Address"
                value={value || ''}
                error={error?.message}
                testID="edit-address-input"
                autoCapitalize="none"
                returnKeyType="next"
                autoCorrect={false}
                onChangeText={onChange}
                onBlur={onBlur}
                onSubmitEditing={handleAddressSubmit}
              />
            )}
          />
        </View>
        <View className={errors.phoneNumber ? 'mb-6' : 'mb-5'}>
          {/* Phone Number Input */}
          <Controller
            control={control}
            name="phoneNumber"
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <Input
                ref={phoneNumberRef}
                accessibilityRole="text"
                accessibilityLabel="Phone Number input field"
                label="Phone Number"
                value={value || ''}
                error={error?.message}
                testID="edit-phone-number-input"
                containerClassName={`${errors.phoneNumber ? 'mb-1' : 'mb-7'}`}
                autoCapitalize="none"
                returnKeyType="done"
                keyboardType="phone-pad"
                inputMode="tel"
                autoCorrect={false}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
        </View>
      </StickyFooterScrollView>
    );
  },
);

EditProfileForm.displayName = 'EditProfileForm';
