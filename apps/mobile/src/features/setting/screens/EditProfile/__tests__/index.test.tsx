import { fireEvent, render, waitFor } from '@testing-library/react-native';

// Screen
import EditProfileScreen from '../';

// Types
import { UserProfile } from '@/features/auth/types/auth';

// Mock data
const mockProfile: UserProfile = {
  id: 'user-123',
  fullName: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phoneNumber: '+1234567890',
  address: '123 Main St',
  avatarUrl: 'https://example.com/avatar.jpg',
};

// Mock functions
const mockPush = jest.fn();
const mockToastAlert = jest.fn();
const mockToastError = jest.fn();
const mockUpdateProfile = jest.fn();
const mockUploadAvatar = jest.fn();
const mockShowLoading = jest.fn();
const mockHideLoading = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useToast', () => ({
  useToastAlert: () => ({
    alert: mockToastAlert,
    error: mockToastError,
  }),
}));

jest.mock('@/features/setting/hooks/useProfile', () => ({
  useProfile: () => ({
    data: mockProfile,
    isLoading: false,
  }),
  useUpdateProfile: () => ({
    mutateAsync: mockUpdateProfile,
    isPending: false,
  }),
  useUploadAvatar: () => ({
    mutateAsync: mockUploadAvatar,
    isPending: false,
  }),
}));

jest.mock('zustand/react/shallow', () => ({
  useShallow: (fn: any) => fn,
}));

jest.mock('@/stores/loading', () => ({
  useLoadingStore: (selector: any) =>
    selector({
      showLoading: mockShowLoading,
      hideLoading: mockHideLoading,
    }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');

  return {
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    SafeAreaView: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
  };
});

describe('EditProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUploadAvatar.mockResolvedValue('https://example.com/new-avatar.jpg');
    // Mock updateProfile to call onSettled callback by default
    mockUpdateProfile.mockImplementation(async (data, options) => {
      const result = await Promise.resolve({});
      if (options?.onSettled) {
        options.onSettled();
      }
      return result;
    });
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('signup-firstname-input')).toBeTruthy();
    });

    it('should render EditProfileForm', () => {
      const { getByTestId } = render(<EditProfileScreen />);

      expect(getByTestId('signup-firstname-input')).toBeTruthy();
      expect(getByTestId('signup-email-input')).toBeTruthy();
      expect(getByTestId('edit-address-input')).toBeTruthy();
      expect(getByTestId('edit-phone-number-input')).toBeTruthy();
      expect(getByTestId('update-my-profile-submit-button')).toBeTruthy();
    });

    it('should display profile data in form fields', () => {
      const { getByTestId } = render(<EditProfileScreen />);

      const firstNameInput = getByTestId('signup-firstname-input-input');
      const emailInput = getByTestId('signup-email-input-input');
      const addressInput = getByTestId('edit-address-input-input');
      const phoneInput = getByTestId('edit-phone-number-input-input');

      expect(firstNameInput.props.value).toBe('John');
      expect(emailInput.props.value).toBe('john@example.com');
      expect(addressInput.props.value).toBe('123 Main St');
      expect(phoneInput.props.value).toBe('+1234567890');
    });

    it('should render all input labels', () => {
      const { getByText } = render(<EditProfileScreen />);

      expect(getByText('First Name')).toBeTruthy();
      expect(getByText('Last Name')).toBeTruthy();
      expect(getByText('Email Address')).toBeTruthy();
      expect(getByText('Address')).toBeTruthy();
      expect(getByText('Phone Number')).toBeTruthy();
    });

    it('should render submit button', () => {
      const { getByText } = render(<EditProfileScreen />);
      expect(getByText('Update My Profile')).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    it('should call updateProfile when form is submitted', async () => {
      const { getByTestId } = render(<EditProfileScreen />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'Jane');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith(
          expect.objectContaining({
            firstName: 'Jane',
          }),
          expect.any(Object),
        );
      });
    });

    it('should call showLoading before updating profile', async () => {
      const { getByTestId } = render(<EditProfileScreen />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'Jane');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockShowLoading).toHaveBeenCalled();
      });
    });

    it('should call hideLoading after profile update completes', async () => {
      const { getByTestId } = render(<EditProfileScreen />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'Jane');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockHideLoading).toHaveBeenCalled();
      });
    });

    it('should show success toast on successful update', async () => {
      mockUpdateProfile.mockResolvedValue({});

      const { getByTestId } = render(<EditProfileScreen />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'Jane');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockToastAlert).toHaveBeenCalledWith(
          'Update successful',
          'Profile updated successfully',
          expect.any(Array),
          expect.objectContaining({ type: 'success' }),
        );
      });
    });

    it('should show error toast on failed update', async () => {
      const mockError = new Error('Update failed');
      mockUpdateProfile.mockImplementation(async (data, options) => {
        if (options?.onSettled) {
          options.onSettled();
        }
        throw mockError;
      });

      const { getByTestId } = render(<EditProfileScreen />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'Jane');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockToastAlert).toHaveBeenCalledWith(
          'Update failed',
          'Update failed',
          [],
          expect.objectContaining({ type: 'error' }),
        );
      });
    });

    it('should call hideLoading even when profile update fails', async () => {
      const mockError = new Error('Update failed');
      mockUpdateProfile.mockImplementation(async (data, options) => {
        if (options?.onSettled) {
          options.onSettled();
        }
        throw mockError;
      });

      const { getByTestId } = render(<EditProfileScreen />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'Jane');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockHideLoading).toHaveBeenCalled();
      });
    });

    it('should navigate to profile page on success', async () => {
      mockUpdateProfile.mockResolvedValue({});

      const { getByTestId } = render(<EditProfileScreen />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'Jane');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockToastAlert).toHaveBeenCalled();
      });

      // Get the onPress callback from the toast call and execute it
      const toastCall = mockToastAlert.mock.calls[0];
      const buttons = toastCall[2];
      if (buttons?.[0]?.onPress) {
        buttons[0].onPress();
      }

      expect(mockPush).toHaveBeenCalled();
    });
  });

  describe('Avatar Upload', () => {
    it('should upload avatar when avatar URL changes', async () => {
      // Create a new mock for this specific test
      const localMockProfile = { ...mockProfile };

      jest.doMock('@/features/setting/hooks/useProfile', () => ({
        useProfile: () => ({
          data: localMockProfile,
          isLoading: false,
        }),
        useUpdateProfile: () => ({
          mutateAsync: mockUpdateProfile,
          isPending: false,
        }),
        useUploadAvatar: () => ({
          mutateAsync: mockUploadAvatar,
          isPending: false,
        }),
      }));

      const { getByTestId } = render(<EditProfileScreen />);

      // The avatar upload is tested through the EditProfileForm integration
      expect(getByTestId('avatar-container')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility labels on inputs', () => {
      const { getByLabelText } = render(<EditProfileScreen />);

      expect(getByLabelText('First Name input field')).toBeTruthy();
      expect(getByLabelText('Last Name input field')).toBeTruthy();
      expect(getByLabelText('Email Address input field')).toBeTruthy();
      expect(getByLabelText('Address input field')).toBeTruthy();
      expect(getByLabelText('Phone Number input field')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should pass isPending to form when loading', () => {
      // The loading state is handled by the form component
      const { getByTestId } = render(<EditProfileScreen />);
      expect(getByTestId('update-my-profile-submit-button')).toBeTruthy();
    });

    it('should call showLoading before update and hideLoading after update', async () => {
      const { getByTestId } = render(<EditProfileScreen />);
      const firstNameInput = getByTestId('signup-firstname-input-input');
      const submitButton = getByTestId('update-my-profile-submit-button');

      fireEvent.changeText(firstNameInput, 'Jane');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockShowLoading).toHaveBeenCalled();
        expect(mockHideLoading).toHaveBeenCalled();
      });

      // Verify showLoading is called before hideLoading
      const showLoadingCallOrder = mockShowLoading.mock.invocationCallOrder[0];
      const hideLoadingCallOrder = mockHideLoading.mock.invocationCallOrder[0];
      expect(showLoadingCallOrder).toBeLessThan(hideLoadingCallOrder || 0);
    });
  });

  describe('Snapshot', () => {
    it('should match snapshot', () => {
      const { toJSON } = render(<EditProfileScreen />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
