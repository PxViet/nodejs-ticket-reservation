import { useEffect } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';
import { useShallow } from 'zustand/react/shallow';

// Hooks
import { useSignUp } from '@/features/auth/hooks/useSignUp';

// Types
import { SignUpData } from '@/features/auth/types/auth';

// Components
import { SignUpForm } from '@/features/auth/components/SignUpForm';

// Store
import { useLoadingStore } from '@/stores/loading';

const StyledSafeAreaView = withUniwind(SafeAreaView);
const StyledKeyboardAvoidingView = withUniwind(KeyboardAvoidingView);

const SignupScreen = () => {
  const insets = useSafeAreaInsets();
  const { mutate: signUp, isPending: isSigningUp } = useSignUp();

  const { showLoading, hideLoading } = useLoadingStore(
    useShallow(state => ({
      showLoading: state.showLoading,
      hideLoading: state.hideLoading,
    })),
  );

  // No layout overlay here — drive the global one instead
  useEffect(() => {
    if (!isSigningUp) return;

    showLoading('Creating your account');

    return hideLoading;
  }, [isSigningUp, showLoading, hideLoading]);

  const handleSubmit = (data: SignUpData) => {
    signUp(data);
  };

  return (
    <StyledSafeAreaView edges={['bottom']} className="flex-1 bg-bg-primary">
      {/* Not `KeyboardLayout`: that wraps everything in one ScrollView, which
          leaves no way to keep the Sign Up button outside of it and pinned to
          the bottom while the fields above scroll. */}
      <StyledKeyboardAvoidingView
        className="flex-1"
        behavior="padding"
        keyboardVerticalOffset={Platform.select({
          ios: -insets.bottom,
          android: 0,
        })}
      >
        <SignUpForm isPending={isSigningUp} onSubmit={handleSubmit} />
      </StyledKeyboardAvoidingView>
    </StyledSafeAreaView>
  );
};

export default SignupScreen;
