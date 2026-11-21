import { memo, type Ref } from 'react';
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { type TextInputInstance } from 'react-native';

// Components
import { Input, type InputReturnType } from '@/components/Input';

interface EmailInputProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label?: string;
  testID: string;
  ref?: Ref<TextInputInstance>;
  returnKeyType?: InputReturnType;
  onSubmitEditing?: () => void;
}

const EmailInputInner = <T extends FieldValues>({
  control,
  name,
  label = 'Email Address',
  testID,
  ref,
  returnKeyType = 'next',
  onSubmitEditing,
}: EmailInputProps<T>) => (
  <Controller
    control={control}
    name={name}
    render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
      <Input
        ref={ref}
        accessibilityRole="text"
        accessibilityLabel={`${label} input field`}
        accessibilityHint="Enter your email address"
        label={label}
        value={value}
        error={error?.message}
        testID={testID}
        keyboardType="email-address"
        returnKeyType={returnKeyType}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChange}
        onBlur={onBlur}
        onSubmitEditing={onSubmitEditing}
      />
    )}
  />
);

EmailInputInner.displayName = 'EmailInput';

export const EmailInput = memo(EmailInputInner) as typeof EmailInputInner;
