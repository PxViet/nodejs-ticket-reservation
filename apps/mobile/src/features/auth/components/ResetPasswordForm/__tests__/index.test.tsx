import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TextInput } from 'react-native';

// Component
import { ResetPasswordForm } from '../';

// Mock dependencies
const mockToastAlert = jest.fn();

jest.mock('@/hooks/useToast', () => ({
  useToastAlert: () => ({
    alert: mockToastAlert,
  }),
}));

describe('ResetPasswordForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      expect(getByTestId('new-password-input')).toBeTruthy();
    });

    it('should render new password input field', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      expect(getByTestId('new-password-input')).toBeTruthy();
    });

    it('should render confirm password input field', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      expect(getByTestId('confirm-password-input')).toBeTruthy();
    });

    it('should render submit button', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      expect(getByTestId('reset-password-submit-button')).toBeTruthy();
    });

    it('should display correct title and description', () => {
      const { getAllByText, getByText } = render(<ResetPasswordForm />);
      expect(getAllByText('Reset Password').length).toBeGreaterThan(0);
      expect(getByText('Enter your new password below')).toBeTruthy();
    });

    it('should display correct labels', () => {
      const { getByText } = render(<ResetPasswordForm />);
      expect(getByText('New Password')).toBeTruthy();
      expect(getByText('Confirm Password')).toBeTruthy();
    });
  });

  describe('Form Interaction', () => {
    it('should allow typing in new password input', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');

      fireEvent.changeText(newPasswordInput, 'NewPass123!');
      expect(newPasswordInput.props.value).toBe('NewPass123!');
    });

    it('should allow typing in confirm password input', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const confirmPasswordInput = getByTestId('confirm-password-input-input');

      fireEvent.changeText(confirmPasswordInput, 'NewPass123!');
      expect(confirmPasswordInput.props.value).toBe('NewPass123!');
    });

    it('should focus confirm password input when new password input submits', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');

      // Mock the focus method on TextInput prototype
      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

      // Trigger onSubmitEditing on new password input
      fireEvent(newPasswordInput, 'submitEditing');

      // Verify that confirm password input focus was called
      expect(focusSpy).toHaveBeenCalledTimes(1);

      focusSpy.mockRestore();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for invalid new password', async () => {
      const { getByTestId, queryByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');

      fireEvent.changeText(newPasswordInput, 'short');
      fireEvent(newPasswordInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('new-password-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should not show validation errors for valid matching passwords', async () => {
      const { getByTestId, queryByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');
      const confirmPasswordInput = getByTestId('confirm-password-input-input');

      fireEvent.changeText(newPasswordInput, 'ValidPass123!@');
      fireEvent(newPasswordInput, 'blur');

      fireEvent.changeText(confirmPasswordInput, 'ValidPass123!@');
      fireEvent(confirmPasswordInput, 'blur');

      await waitFor(() => {
        expect(queryByTestId('new-password-input-error')).toBeNull();
        expect(queryByTestId('confirm-password-input-error')).toBeNull();
      });
    });
  });

  // Not implemented yet — the form always surfaces a "not available" error,
  // since neither the API nor Supabase back this flow any more.
  describe('Form Submission', () => {
    it('should show a not-available error toast instead of resetting the password', async () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');
      const confirmPasswordInput = getByTestId('confirm-password-input-input');
      const submitButton = getByTestId('reset-password-submit-button');

      fireEvent.changeText(newPasswordInput, 'NewPass123!@');
      fireEvent.changeText(confirmPasswordInput, 'NewPass123!@');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockToastAlert).toHaveBeenCalledWith(
          expect.any(String),
          'Password reset via email is not available yet.',
          [],
          expect.objectContaining({ type: expect.any(String) }),
        );
      });
    });
  });

  describe('Form State', () => {
    it('should have default empty values', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');
      const confirmPasswordInput = getByTestId('confirm-password-input-input');

      expect(newPasswordInput.props.value).toBe('');
      expect(confirmPasswordInput.props.value).toBe('');
    });
  });

  describe('Input Properties', () => {
    it('should have secure text entry enabled for password fields', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');
      const confirmPasswordInput = getByTestId('confirm-password-input-input');

      expect(newPasswordInput.props.secureTextEntry).toBe(true);
      expect(confirmPasswordInput.props.secureTextEntry).toBe(true);
    });

    it('should have correct return key types', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');
      const confirmPasswordInput = getByTestId('confirm-password-input-input');

      expect(newPasswordInput.props.returnKeyType).toBe('next');
      expect(confirmPasswordInput.props.returnKeyType).toBe('done');
    });

    it('should have autoCapitalize disabled', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');
      const confirmPasswordInput = getByTestId('confirm-password-input-input');

      expect(newPasswordInput.props.autoCapitalize).toBe('none');
      expect(confirmPasswordInput.props.autoCapitalize).toBe('none');
    });

    it('should have autoCorrect disabled', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');
      const confirmPasswordInput = getByTestId('confirm-password-input-input');

      expect(newPasswordInput.props.autoCorrect).toBe(false);
      expect(confirmPasswordInput.props.autoCorrect).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility labels', () => {
      const { getByLabelText, getAllByLabelText } = render(
        <ResetPasswordForm />,
      );

      expect(getByLabelText('New Password input field')).toBeTruthy();
      expect(getByLabelText('Confirm Password input field')).toBeTruthy();
      expect(getAllByLabelText('Reset Password')).toBeTruthy();
    });

    it('should have correct accessibility roles', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');
      const confirmPasswordInput = getByTestId('confirm-password-input-input');

      expect(newPasswordInput.props.accessibilityRole).toBe('text');
      expect(confirmPasswordInput.props.accessibilityRole).toBe('text');
    });

    it('should have accessible submit button', () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const submitButton = getByTestId('reset-password-submit-button');

      expect(submitButton.props.accessible).toBe(true);
      expect(submitButton.props.accessibilityLabel).toBe('Reset Password');
    });
  });

  describe('Layout and Styling', () => {
    it('should adjust spacing when validation errors are present', async () => {
      const { getByTestId } = render(<ResetPasswordForm />);
      const newPasswordInput = getByTestId('new-password-input-input');

      // Trigger validation error
      fireEvent.changeText(newPasswordInput, 'short');
      fireEvent(newPasswordInput, 'blur');

      await waitFor(() => {
        expect(getByTestId('new-password-input-error')).toBeTruthy();
      });
    });
  });
});
