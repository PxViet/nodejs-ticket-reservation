import { memo, useMemo, type Ref } from 'react';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { type TextInputInstance } from 'react-native';

// Components
import { Input, type InputReturnType } from '@/components/Input';

type PasswordFieldType =
  'password' | 'currentPassword' | 'newPassword' | 'confirmPassword';

interface PasswordInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  testID: string;
  ref?: Ref<TextInputInstance>;
  returnKeyType?: InputReturnType;
  containerClassName?: string;
  onSubmitEditing?: () => void;
}

const LABEL_MAP: Record<PasswordFieldType, string> = {
  password: 'Password',
  currentPassword: 'Current Password',
  newPassword: 'New Password',
  confirmPassword: 'Confirm Password',
};

const PasswordInputInner = <T extends FieldValues>({
  control,
  name,
  label,
  testID,
  ref,
  returnKeyType = 'next',
  containerClassName,
  onSubmitEditing,
}: PasswordInputProps<T>) => {
  const resolvedLabel = useMemo(
    () => label ?? LABEL_MAP[name as PasswordFieldType] ?? 'Password',
    [label, name],
  );

  return (
    <Controller
      control={control}
      name={name}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <Input
          ref={ref}
          accessibilityRole="text"
          accessibilityLabel={`${resolvedLabel} input field`}
          accessibilityHint={`Type your ${resolvedLabel.toLowerCase()}`}
          label={resolvedLabel}
          value={value}
          error={error?.message}
          testID={testID}
          secureTextEntry
          returnKeyType={returnKeyType}
          autoCapitalize="none"
          autoCorrect={false}
          containerClassName={containerClassName}
          onChangeText={onChange}
          onBlur={onBlur}
          onSubmitEditing={onSubmitEditing}
        />
      )}
    />
  );
};

PasswordInputInner.displayName = 'PasswordInput';

export const PasswordInput = memo(
  PasswordInputInner,
) as typeof PasswordInputInner;
