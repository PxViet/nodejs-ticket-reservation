import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TextInput } from 'react-native';

// Constants
import { ERROR_MESSAGES } from '@/constants';

// Component
import { SignUpForm } from '../';

describe('SignUpForm Component', () => {
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    isPending: false,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      expect(getByTestId('signup-firstname-input')).toBeTruthy();
    });

    it('should render first and last name input fields', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      expect(getByTestId('signup-firstname-input')).toBeTruthy();
      expect(getByTestId('signup-lastname-input')).toBeTruthy();
    });

    it('should render email input field', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      expect(getByTestId('signup-email-input')).toBeTruthy();
    });

    it('should render password input field', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      expect(getByTestId('signup-password-input')).toBeTruthy();
    });

    it('should render confirm password input field', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      expect(getByTestId('signup-confirmpassword-input')).toBeTruthy();
    });

    it('should render submit button', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      expect(getByTestId('signup-submit-button')).toBeTruthy();
    });

    it('should display correct labels', () => {
      const { getByText } = render(<SignUpForm {...defaultProps} />);
      expect(getByText('First Name')).toBeTruthy();
      expect(getByText('Last Name')).toBeTruthy();
      expect(getByText('Email Address')).toBeTruthy();
      expect(getByText('Password')).toBeTruthy();
      expect(getByText('Confirm Password')).toBeTruthy();
    });
  });

  describe('Form Interaction', () => {
    it('should allow typing in first name input', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const firstNameInput = getByTestId('signup-firstname-input-input');

      fireEvent.changeText(firstNameInput, 'John');
      expect(firstNameInput.props.value).toBe('John');
    });

    it('should allow typing in last name input', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const lastNameInput = getByTestId('signup-lastname-input-input');

      fireEvent.changeText(lastNameInput, 'Doe');
      expect(lastNameInput.props.value).toBe('Doe');
    });

    it('should allow typing in email input', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const emailInput = getByTestId('signup-email-input-input');

      fireEvent.changeText(emailInput, 'test@example.com');
      expect(emailInput.props.value).toBe('test@example.com');
    });

    it('should allow typing in password input', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const passwordInput = getByTestId('signup-password-input-input');

      fireEvent.changeText(passwordInput, 'Test123!');
      expect(passwordInput.props.value).toBe('Test123!');
    });

    it('should allow typing in confirm password input', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const confirmPasswordInput = getByTestId(
        'signup-confirmpassword-input-input',
      );

      fireEvent.changeText(confirmPasswordInput, 'Test123!');
      expect(confirmPasswordInput.props.value).toBe('Test123!');
    });

    it('should focus last name input when first name input submits', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const firstNameInput = getByTestId('signup-firstname-input-input');

      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

      fireEvent(firstNameInput, 'submitEditing');

      expect(focusSpy).toHaveBeenCalledTimes(1);

      focusSpy.mockRestore();
    });

    it('should focus email input when last name input submits', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const lastNameInput = getByTestId('signup-lastname-input-input');

      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

      fireEvent(lastNameInput, 'submitEditing');

      expect(focusSpy).toHaveBeenCalledTimes(1);

      focusSpy.mockRestore();
    });

    it('should focus password input when email input submits', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const emailInput = getByTestId('signup-email-input-input');

      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

      fireEvent(emailInput, 'submitEditing');

      expect(focusSpy).toHaveBeenCalledTimes(1);

      focusSpy.mockRestore();
    });

    it('should focus confirm password input when password input submits', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const passwordInput = getByTestId('signup-password-input-input');

      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

      fireEvent(passwordInput, 'submitEditing');

      expect(focusSpy).toHaveBeenCalledTimes(1);

      focusSpy.mockRestore();
    });
  });

  describe('Form Validation', () => {
    it('should disable submit button when form is empty', () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const submitButton = getByTestId('signup-submit-button');

      expect(submitButton.props.disabled).toBe(undefined);
    });

    it('should show validation error for invalid first name', async () => {
      const { getByTestId, queryByTestId } = render(
        <SignUpForm {...defaultProps} />,
      );
      const firstNameInput = getByTestId('signup-firstname-input-input');

      fireEvent.changeText(firstNameInput, 'A');
      fireEvent(firstNameInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('signup-firstname-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show validation error for invalid email', async () => {
      const { getByTestId, queryByTestId } = render(
        <SignUpForm {...defaultProps} />,
      );
      const emailInput = getByTestId('signup-email-input-input');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('signup-email-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show validation error for invalid password', async () => {
      const { getByTestId, queryByTestId } = render(
        <SignUpForm {...defaultProps} />,
      );
      const passwordInput = getByTestId('signup-password-input-input');

      fireEvent.changeText(passwordInput, 'short');
      fireEvent(passwordInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('signup-password-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show validation error when passwords do not match', async () => {
      const { getByTestId, queryByTestId } = render(
        <SignUpForm {...defaultProps} />,
      );
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const lastNameInput = getByTestId('signup-lastname-input-input');
      const emailInput = getByTestId('signup-email-input-input');
      const passwordInput = getByTestId('signup-password-input-input');
      const confirmPasswordInput = getByTestId(
        'signup-confirmpassword-input-input',
      );

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@');
      fireEvent.changeText(confirmPasswordInput, 'Different123!@');
      fireEvent(confirmPasswordInput, 'blur');

      await waitFor(() => {
        expect(
          queryByTestId('signup-confirmpassword-input-error'),
        ).toBeTruthy();
      });
      expect(
        getByTestId('signup-confirmpassword-input-error'),
      ).toHaveTextContent(ERROR_MESSAGES.PASSWORD_NOT_MATCH);
    });

    it('should not call onSubmit when passwords do not match', async () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const lastNameInput = getByTestId('signup-lastname-input-input');
      const emailInput = getByTestId('signup-email-input-input');
      const passwordInput = getByTestId('signup-password-input-input');
      const confirmPasswordInput = getByTestId(
        'signup-confirmpassword-input-input',
      );
      const submitButton = getByTestId('signup-submit-button');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@');
      fireEvent.changeText(confirmPasswordInput, 'Different123!@');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with form data when valid form is submitted', async () => {
      const { getByTestId } = render(<SignUpForm {...defaultProps} />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const lastNameInput = getByTestId('signup-lastname-input-input');
      const emailInput = getByTestId('signup-email-input-input');
      const passwordInput = getByTestId('signup-password-input-input');
      const confirmPasswordInput = getByTestId(
        'signup-confirmpassword-input-input',
      );
      const submitButton = getByTestId('signup-submit-button');

      fireEvent.changeText(firstNameInput, 'John');
      fireEvent.changeText(lastNameInput, 'Doe');
      fireEvent.changeText(emailInput, 'john@example.com');
      fireEvent.changeText(passwordInput, 'Test123!@');
      fireEvent.changeText(confirmPasswordInput, 'Test123!@');

      await waitFor(() => {
        expect(submitButton.props.disabled).toBe(undefined);
      });

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          password: 'Test123!@',
        });
      });
    });
  });
});
