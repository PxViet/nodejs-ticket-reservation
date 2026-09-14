import { memo, ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// Uniwind
import { withUniwind } from 'uniwind';

const StyledSafeAreaView = withUniwind(SafeAreaView);
const StyledKeyboardAvoidingView = withUniwind(KeyboardAvoidingView);

interface KeyboardStickyLayoutProps {
  children: ReactNode;
}

/**
 * Screen shell for a form whose submit button stays pinned outside the
 * scroll area. Deliberately not `KeyboardLayout`: that wraps everything in
 * one ScrollView, leaving no way to keep a footer button outside of it while
 * the fields above scroll independently — pair this with
 * `StickyFooterScrollView` inside the form itself.
 */
export const KeyboardStickyLayout = memo(
  ({ children }: KeyboardStickyLayoutProps) => {
    const insets = useSafeAreaInsets();

    return (
      <StyledSafeAreaView edges={['bottom']} className="flex-1 bg-bg-primary">
        <StyledKeyboardAvoidingView
          className="flex-1"
          behavior="padding"
          keyboardVerticalOffset={Platform.select({
            ios: -insets.bottom,
            android: 0,
          })}
        >
          {children}
        </StyledKeyboardAvoidingView>
      </StyledSafeAreaView>
    );
  },
);

KeyboardStickyLayout.displayName = 'KeyboardStickyLayout';
