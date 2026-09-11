import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
} from 'react';
import {
  Animated,
  TextInput,
  TouchableOpacity,
  View,
  type NativeSyntheticEvent,
  type TargetedEvent,
  type TextInputProps,
} from 'react-native';

// Icons
import { EyeIcon } from '@/icons/EyeIcon';
import { EyeOffIcon } from '@/icons/EyeOffIcon';

// Utils
import { cn } from '@/utils/cn';
import { isAndroid } from '@/utils/platform';

// Components
import { Typo } from '../Typo';

export type InputReturnType = 'done' | 'next' | 'go' | 'search' | 'send';

export interface InputProps extends Omit<TextInputProps, 'placeholder'> {
  label: string;
  error?: string;
  testID?: string;
  onChangeText: (text: string) => void;
  containerClassName?: string;
  innerClassName?: string;
  ref?: Ref<TextInput>;
}

export const Input = memo(
  ({
    label,
    value = '',
    error,
    testID,
    onChangeText,
    onFocus,
    onBlur,
    secureTextEntry,
    containerClassName,
    innerClassName,
    ref,
    ...rest
  }: InputProps) => {
    const inputRef = useRef<TextInput>(null);
    const [isFocused, setIsFocused] = useState(false);

    // animated value for the label position and size
    const [animatedValue] = useState(new Animated.Value(value ? 1 : 0));
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);

    const handleFocus = useCallback(
      (e: NativeSyntheticEvent<TargetedEvent>) => {
        setIsFocused(true);
        // if the value is not empty, animate the label position and size to 1
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        onFocus?.(e);
      },
      [animatedValue, onFocus],
    );

    const handleLabelPress = useCallback(() => {
      // Focus the input when label is clicked
      inputRef.current?.focus();
    }, [inputRef]);

    const handleBlur = useCallback(
      (e: NativeSyntheticEvent<TargetedEvent>) => {
        setIsFocused(false);
        // if the value is empty, animate the label position and size to 0
        if (!value || value.length === 0) {
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
        onBlur?.(e);
      },
      [animatedValue, onBlur, value],
    );

    const togglePasswordVisibility = useCallback(() => {
      setIsPasswordVisible(prev => !prev);
    }, []);

    useEffect(() => {
      const hasValue = value && value.length > 0;
      const shouldBeAtTop = hasValue || isFocused;

      Animated.timing(animatedValue, {
        toValue: shouldBeAtTop ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, [value, isFocused, animatedValue]);

    // Animated label position and size based on the value
    const labelTransform = useMemo(
      () => [
        {
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -26],
            ...(isAndroid() && { outputRange: [0, -24] }),
          }),
        },
      ],
      [animatedValue],
    );

    const borderColor = useMemo(
      () =>
        error
          ? 'border-red'
          : isFocused
            ? 'border-primary'
            : 'border-overlay-soft',
      [error, isFocused],
    );

    const labelColor = useMemo(
      () =>
        error ? 'text-red' : isFocused ? 'text-primary' : 'text-overlay-soft',
      [error, isFocused],
    );

    return (
      <View className={cn(`w-full`, containerClassName)} testID={testID}>
        <View className="relative">
          {/* Floating Label */}
          <Animated.View
            className="bg-dark-blue px-1 z-1 left-4 absolute"
            style={{
              top: 14,
              transform: labelTransform,
            }}
          >
            <Animated.Text
              accessible
              accessibilityRole="text"
              accessibilityLabel={label}
              allowFontScaling={false}
              onPress={handleLabelPress}
            >
              <Typo
                size="sm"
                allowFontScaling={false}
                weight="regular"
                className={labelColor}
              >
                {label}
              </Typo>
            </Animated.Text>
          </Animated.View>

          {/* Text Input */}
          <TextInput
            ref={node => {
              inputRef.current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${label} input field`}
            allowFontScaling={false}
            value={value}
            secureTextEntry={secureTextEntry && !isPasswordVisible}
            testID={`${testID}-input`}
            className={cn(
              'w-full h-12 px-4 pb-0.5 text-white text-sm border rounded-base',
              innerClassName,
              isAndroid() && 'pb-1.5',
              borderColor,
            )}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            {...rest}
          />

          {/* Password Toggle Icon */}
          {secureTextEntry && (
            <TouchableOpacity
              activeOpacity={0.8}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Toggle password visibility"
              accessibilityHint="Toggle password visibility"
              className="absolute right-4 top-3"
              testID={`${testID}-password-toggle`}
              onPress={togglePasswordVisibility}
            >
              {isPasswordVisible ? <EyeIcon /> : <EyeOffIcon />}
            </TouchableOpacity>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <Typo
            accessibilityRole="alert"
            accessibilityLabel={error}
            size="xs"
            weight="regular"
            className="text-red mt-1 ml-4"
            testID={`${testID}-error`}
          >
            {error}
          </Typo>
        )}
      </View>
    );
  },
);

Input.displayName = 'Input';
