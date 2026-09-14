import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { TextInput } from 'react-native';

// Component
import { EditProfileForm } from '../';

// Types
import { UserProfile } from '@/features/auth/types/auth';

// Mock dependencies
const mockOnSubmit = jest.fn();

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('EditProfileForm Component', () => {
  const mockUserInfo: UserProfile = {
    id: 'user-123',
    fullName: 'John Doe',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phoneNumber: '+1234567890',
    address: '123 Main St',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  const defaultProps = {
    userInfo: mockUserInfo,
    isPending: false,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      expect(getByTestId('signup-firstname-input')).toBeTruthy();
    });

    it('should render first and last name input fields', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      expect(getByTestId('signup-firstname-input')).toBeTruthy();
      expect(getByTestId('signup-lastname-input')).toBeTruthy();
    });

    it('should render email input field', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      expect(getByTestId('signup-email-input')).toBeTruthy();
    });

    it('should render address input field', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      expect(getByTestId('edit-address-input')).toBeTruthy();
    });

    it('should render phone number input field', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      expect(getByTestId('edit-phone-number-input')).toBeTruthy();
    });

    it('should render submit button', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      expect(getByTestId('update-my-profile-submit-button')).toBeTruthy();
    });

    it('should display correct labels', () => {
      const { getByText } = render(<EditProfileForm {...defaultProps} />);
      expect(getByText('First Name')).toBeTruthy();
      expect(getByText('Last Name')).toBeTruthy();
      expect(getByText('Email Address')).toBeTruthy();
      expect(getByText('Address')).toBeTruthy();
      expect(getByText('Phone Number')).toBeTruthy();
    });

    it('should display submit button with correct text', () => {
      const { getByText } = render(<EditProfileForm {...defaultProps} />);
      expect(getByText('Update My Profile')).toBeTruthy();
    });

    it('should display default values from userInfo', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);

      const firstNameInput = getByTestId('signup-firstname-input-input');
      const lastNameInput = getByTestId('signup-lastname-input-input');
      const emailInput = getByTestId('signup-email-input-input');
      const addressInput = getByTestId('edit-address-input-input');
      const phoneNumberInput = getByTestId('edit-phone-number-input-input');

      expect(firstNameInput.props.value).toBe('John');
      expect(lastNameInput.props.value).toBe('Doe');
      expect(emailInput.props.value).toBe('john@example.com');
      expect(addressInput.props.value).toBe('123 Main St');
      expect(phoneNumberInput.props.value).toBe('+1234567890');
    });
  });

  describe('Form Interaction', () => {
    it('should allow typing in first name input', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const firstNameInput = getByTestId('signup-firstname-input-input');

      fireEvent.changeText(firstNameInput, 'Jane');
      expect(firstNameInput.props.value).toBe('Jane');
    });

    it('should allow typing in last name input', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const lastNameInput = getByTestId('signup-lastname-input-input');

      fireEvent.changeText(lastNameInput, 'Smith');
      expect(lastNameInput.props.value).toBe('Smith');
    });

    it('should allow typing in email input', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const emailInput = getByTestId('signup-email-input-input');

      fireEvent.changeText(emailInput, 'jane@example.com');
      expect(emailInput.props.value).toBe('jane@example.com');
    });

    it('should allow typing in address input', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const addressInput = getByTestId('edit-address-input-input');

      fireEvent.changeText(addressInput, '456 Oak Ave');
      expect(addressInput.props.value).toBe('456 Oak Ave');
    });

    it('should allow typing in phone number input', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const phoneNumberInput = getByTestId('edit-phone-number-input-input');

      fireEvent.changeText(phoneNumberInput, '+9876543210');
      expect(phoneNumberInput.props.value).toBe('+9876543210');
    });

    it('should focus last name input when first name input submits', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const firstNameInput = getByTestId('signup-firstname-input-input');

      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

      fireEvent(firstNameInput, 'submitEditing');

      expect(focusSpy).toHaveBeenCalledTimes(1);

      focusSpy.mockRestore();
    });

    it('should focus email input when last name input submits', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const lastNameInput = getByTestId('signup-lastname-input-input');

      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

      fireEvent(lastNameInput, 'submitEditing');

      expect(focusSpy).toHaveBeenCalledTimes(1);

      focusSpy.mockRestore();
    });

    it('should focus address input when email input submits', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const emailInput = getByTestId('signup-email-input-input');

      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

      fireEvent(emailInput, 'submitEditing');

      expect(focusSpy).toHaveBeenCalledTimes(1);

      focusSpy.mockRestore();
    });

    it('should focus phone number input when address input submits', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const addressInput = getByTestId('edit-address-input-input');

      const focusSpy = jest.spyOn(TextInput.prototype, 'focus');

      fireEvent(addressInput, 'submitEditing');

      expect(focusSpy).toHaveBeenCalledTimes(1);

      focusSpy.mockRestore();
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when first name is empty', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const firstNameInput = getByTestId('signup-firstname-input-input');

      fireEvent.changeText(firstNameInput, '');
      fireEvent(firstNameInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('signup-firstname-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show validation error when first name is too short', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const firstNameInput = getByTestId('signup-firstname-input-input');

      fireEvent.changeText(firstNameInput, 'A');
      fireEvent(firstNameInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('signup-firstname-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show validation error when last name is empty', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const lastNameInput = getByTestId('signup-lastname-input-input');

      fireEvent.changeText(lastNameInput, '');
      fireEvent(lastNameInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('signup-lastname-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show validation error when email is invalid', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const emailInput = getByTestId('signup-email-input-input');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('signup-email-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show validation error when email is empty', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const emailInput = getByTestId('signup-email-input-input');

      fireEvent.changeText(emailInput, '');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('signup-email-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should show validation error for invalid phone number format', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const phoneNumberInput = getByTestId('edit-phone-number-input-input');

      fireEvent.changeText(phoneNumberInput, 'invalid-phone');
      fireEvent(phoneNumberInput, 'blur');

      await waitFor(() => {
        const errorMessage = queryByTestId('edit-phone-number-input-error');
        expect(errorMessage).toBeTruthy();
      });
    });

    it('should not show error when all fields are valid', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );

      const firstNameInput = getByTestId('signup-firstname-input-input');
      const emailInput = getByTestId('signup-email-input-input');

      fireEvent.changeText(firstNameInput, 'Valid');
      fireEvent(firstNameInput, 'blur');

      fireEvent.changeText(emailInput, 'valid@email.com');
      fireEvent(emailInput, 'blur');

      await waitFor(() => {
        expect(queryByTestId('signup-firstname-input-error')).toBeNull();
        expect(queryByTestId('signup-email-input-error')).toBeNull();
      });
    });

    it('should show validation error when phone number is too short', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const phoneNumberInput = getByTestId('edit-phone-number-input-input');

      fireEvent.changeText(phoneNumberInput, '99');
      fireEvent(phoneNumberInput, 'blur');

      await waitFor(() => {
        expect(queryByTestId('edit-phone-number-input-error')).toBeTruthy();
      });
    });

    it('should accept a local phone number starting with 0', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const phoneNumberInput = getByTestId('edit-phone-number-input-input');

      fireEvent.changeText(phoneNumberInput, '0912345678');
      fireEvent(phoneNumberInput, 'blur');

      await waitFor(() => {
        expect(queryByTestId('edit-phone-number-input-error')).toBeNull();
      });
    });

    it('should allow empty address field', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const addressInput = getByTestId('edit-address-input-input');

      fireEvent.changeText(addressInput, '');
      fireEvent(addressInput, 'blur');

      await waitFor(() => {
        expect(queryByTestId('edit-address-input-error')).toBeNull();
      });
    });

    it('should allow empty phone number field', async () => {
      const { getByTestId, queryByTestId } = render(
        <EditProfileForm {...defaultProps} />,
      );
      const phoneNumberInput = getByTestId('edit-phone-number-input-input');

      fireEvent.changeText(phoneNumberInput, '');
      fireEvent(phoneNumberInput, 'blur');

      await waitFor(() => {
        expect(queryByTestId('edit-phone-number-input-error')).toBeNull();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with only dirty fields on submit', async () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'New');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          firstName: 'New',
        });
      });
    });

    it('should include multiple dirty fields in submission', async () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const addressInput = getByTestId('edit-address-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'Updated');
      fireEvent.changeText(addressInput, 'New Address');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          firstName: 'Updated',
          address: 'New Address',
        });
      });
    });

    it('should not call onSubmit when no fields are dirty', async () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).not.toHaveBeenCalled();
      });
    });

    it('should call onSubmit when the profile has no avatar', async () => {
      const { avatarUrl: _avatarUrl, ...userWithoutAvatar } = mockUserInfo;

      const { getByTestId } = render(
        <EditProfileForm {...defaultProps} userInfo={userWithoutAvatar} />,
      );
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'New');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          firstName: 'New',
        });
      });
    });

    it('should call onSubmit when the profile has no phone number', async () => {
      const { phoneNumber: _phoneNumber, ...userWithoutPhone } = mockUserInfo;

      const { getByTestId } = render(
        <EditProfileForm {...defaultProps} userInfo={userWithoutPhone} />,
      );
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'New');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          firstName: 'New',
        });
      });
    });

    it('should call onSubmit when the user removes their phone number', async () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const phoneNumberInput = getByTestId('edit-phone-number-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(phoneNumberInput, '');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          phoneNumber: '',
        });
      });
    });

    it('should handle phone number update', async () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const phoneNumberInput = getByTestId('edit-phone-number-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(phoneNumberInput, '+9876543210');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          phoneNumber: '+9876543210',
        });
      });
    });
  });

  describe('Button State', () => {
    it('should have submit button disabled when form is not dirty', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const submitButton = getByTestId('update-my-profile-submit-button');

      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('should have submit button enabled when form is dirty', async () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'New');

      await waitFor(() => {
        expect(submitButton.props.accessibilityState?.disabled).toBe(false);
      });
    });

    it('should have submit button disabled when isPending is true', () => {
      const { getByTestId } = render(
        <EditProfileForm {...defaultProps} isPending={true} />,
      );
      const submitButton = getByTestId('update-my-profile-submit-button');

      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });
  });

  describe('Empty User Info', () => {
    it('should render with empty userInfo', () => {
      const { getByTestId } = render(
        <EditProfileForm
          userInfo={undefined}
          isPending={false}
          onSubmit={mockOnSubmit}
        />,
      );

      expect(getByTestId('signup-firstname-input')).toBeTruthy();
    });

    it('should handle null address and phoneNumber values', () => {
      const userWithNulls: UserProfile = {
        id: 'user-456',
        fullName: 'Test User',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        address: undefined,
        phoneNumber: undefined,
      };

      const { getByTestId } = render(
        <EditProfileForm
          userInfo={userWithNulls}
          isPending={false}
          onSubmit={mockOnSubmit}
        />,
      );

      const addressInput = getByTestId('edit-address-input-input');
      const phoneNumberInput = getByTestId('edit-phone-number-input-input');

      expect(addressInput.props.value).toBe('');
      expect(phoneNumberInput.props.value).toBe('');
    });
  });

  describe('Accessibility', () => {
    it('should render avatar container', () => {
      const { getByTestId } = render(<EditProfileForm {...defaultProps} />);
      expect(getByTestId('avatar-container')).toBeTruthy();
    });
  });

  describe('Snapshot', () => {
    it('should match snapshot', () => {
      const { toJSON } = render(<EditProfileForm {...defaultProps} />);
      expect(toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with empty userInfo', () => {
      const { toJSON } = render(
        <EditProfileForm
          userInfo={undefined}
          isPending={false}
          onSubmit={mockOnSubmit}
        />,
      );
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
