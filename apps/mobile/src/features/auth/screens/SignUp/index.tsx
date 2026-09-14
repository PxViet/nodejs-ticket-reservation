import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

// Hooks
import { useSignUp } from '@/features/auth/hooks/useSignUp';

// Types
import { SignUpData } from '@/features/auth/types/auth';

// Components
import { SignUpForm } from '@/features/auth/components/SignUpForm';

// Layout
import { KeyboardStickyLayout } from '@/layouts/KeyboardStickyLayout';

// Store
import { useLoadingStore } from '@/stores/loading';

const SignupScreen = () => {
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
    <KeyboardStickyLayout>
      <SignUpForm isPending={isSigningUp} onSubmit={handleSubmit} />
    </KeyboardStickyLayout>
  );
};

export default SignupScreen;
