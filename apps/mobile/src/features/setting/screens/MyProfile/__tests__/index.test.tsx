import { fireEvent, render } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Screen
import MyProfileScreen from '../';

// Types
import { UserProfile } from '@/features/auth/types/auth';

// Mock data
const mockProfile: UserProfile = {
  id: 'user-123',
  fullName: 'John Doe',
  email: 'john@example.com',
  phoneNumber: '+1234567890',
  address: '123 Main St',
  avatarUrl: 'https://example.com/avatar.jpg',
};

// Mock functions
const mockPush = jest.fn();
const mockSignOut = jest.fn();
const mockToastInfo = jest.fn();
const mockToastSuccess = jest.fn();
const mockSendTestNotification = jest.fn();
const mockCancelAllScheduledNotifications = jest.fn();
const mockRegisterForPushNotifications = jest.fn();
const mockAlert = jest.spyOn(Alert, 'alert');

// Control loading state
let mockIsLoading = false;
let mockIsAdmin = false;

jest.mock('expo-router', () => ({
  router: {
    push: (route: string) => mockPush(route),
  },
}));

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    signOut: mockSignOut,
    isAdmin: mockIsAdmin,
    user: {
      app_metadata: {
        provider: 'email',
      },
    },
  }),
}));

jest.mock('@/features/setting/hooks/useProfile', () => ({
  useProfile: () => ({
    data: mockIsLoading ? null : mockProfile,
    isLoading: mockIsLoading,
  }),
}));

jest.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    sendTestNotification: mockSendTestNotification,
  }),
}));

jest.mock('@/hooks/useToast', () => ({
  useToastAlert: () => ({
    info: mockToastInfo,
    success: mockToastSuccess,
  }),
}));

jest.mock('@/services/notification/push-notification', () => ({
  pushNotificationService: {
    cancelAllScheduledNotifications: () =>
      mockCancelAllScheduledNotifications(),
    registerForPushNotifications: () => mockRegisterForPushNotifications(),
  },
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

describe('MyProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsLoading = false;
    mockIsAdmin = false;
    mockRegisterForPushNotifications.mockResolvedValue('mock-token');
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByText } = render(<MyProfileScreen />);
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should render user profile information', () => {
      const { getByText } = render(<MyProfileScreen />);

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('john@example.com')).toBeTruthy();
    });

    it('should render avatar', () => {
      const { getByTestId } = render(<MyProfileScreen />);
      expect(getByTestId('avatar-container')).toBeTruthy();
    });

    it('should render all setting items', () => {
      const { getByTestId } = render(<MyProfileScreen />);

      expect(getByTestId('edit')).toBeTruthy();
      expect(getByTestId('payment_history')).toBeTruthy();
      expect(getByTestId('change_language')).toBeTruthy();
      expect(getByTestId('help_center')).toBeTruthy();
      expect(getByTestId('rate_app')).toBeTruthy();
      expect(getByTestId('change_password')).toBeTruthy();
      expect(getByTestId('logout')).toBeTruthy();
    });

    it('should render setting item titles', () => {
      const { getByText } = render(<MyProfileScreen />);

      expect(getByText('Edit')).toBeTruthy();
      expect(getByText('Payment History')).toBeTruthy();
      expect(getByText('Change Language')).toBeTruthy();
      expect(getByText('Help Center')).toBeTruthy();
      expect(getByText('Rate Movea App')).toBeTruthy();
      expect(getByText('Change Password')).toBeTruthy();
      expect(getByText('Logout')).toBeTruthy();
    });
  });

  describe('Admin role', () => {
    it('should hide Payment History for an admin', () => {
      mockIsAdmin = true;

      const { queryByTestId, getByTestId } = render(<MyProfileScreen />);

      expect(queryByTestId('payment_history')).toBeNull();
      expect(getByTestId('edit')).toBeTruthy();
      expect(getByTestId('logout')).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when profile is loading', () => {
      mockIsLoading = true;

      const { getByText, getByLabelText } = render(<MyProfileScreen />);

      expect(getByText('Loading profile...')).toBeTruthy();
      expect(getByLabelText('Loading Profile')).toBeTruthy();
    });

    it('should not show profile content when loading', () => {
      mockIsLoading = true;

      const { queryByText } = render(<MyProfileScreen />);

      expect(queryByText('John Doe')).toBeNull();
      expect(queryByText('john@example.com')).toBeNull();
    });
  });

  describe('Setting Item Actions', () => {
    it('should navigate to edit profile when Edit is pressed', () => {
      const { getByTestId } = render(<MyProfileScreen />);
      const editItem = getByTestId('edit');

      fireEvent.press(editItem);

      expect(mockPush).toHaveBeenCalledWith('/(main)/profile/edit');
    });

    it('should navigate to change password when Change Password is pressed', () => {
      const { getByTestId } = render(<MyProfileScreen />);
      const changePasswordItem = getByTestId('change_password');

      fireEvent.press(changePasswordItem);

      expect(mockPush).toHaveBeenCalledWith('/(main)/profile/change-password');
    });

    it('should call signOut when Logout is pressed', () => {
      const { getByTestId } = render(<MyProfileScreen />);
      const logoutItem = getByTestId('logout');

      fireEvent.press(logoutItem);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('should navigate to payment history on Payment History press', () => {
      const { getByTestId } = render(<MyProfileScreen />);

      fireEvent.press(getByTestId('payment_history'));

      expect(mockPush).toHaveBeenCalledWith('/(main)/(tabs)/wallet');
    });

    it('should handle Change Language press', () => {
      const { getByTestId } = render(<MyProfileScreen />);
      const changeLanguageItem = getByTestId('change_language');

      // Should not throw when pressed (returns null)
      expect(() => fireEvent.press(changeLanguageItem)).not.toThrow();
    });

    it('should show rate app alert when Rate Flutix App is pressed', () => {
      const { getByTestId } = render(<MyProfileScreen />);
      const rateAppItem = getByTestId('rate_app');

      fireEvent.press(rateAppItem);

      expect(mockAlert).toHaveBeenCalledWith(
        'Enjoying Movea?',
        'Please take a moment to rate us ⭐',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Later', style: 'cancel' }),
          expect.objectContaining({ text: 'Rate now' }),
        ]),
      );
    });

    it('should handle Rate now button press in alert', () => {
      const { getByTestId } = render(<MyProfileScreen />);
      const rateAppItem = getByTestId('rate_app');

      fireEvent.press(rateAppItem);

      // Get the Rate now button callback and call it
      const alertCall = mockAlert.mock.calls[0];
      const buttons = alertCall?.[2] as {
        text?: string;
        onPress?: () => void;
      }[];
      const rateNowButton = buttons?.find(btn => btn.text === 'Rate now');

      // Should not throw when onPress is called (returns null)
      expect(() => rateNowButton?.onPress?.()).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have correct accessibility labels', () => {
      const { getByLabelText } = render(<MyProfileScreen />);

      expect(getByLabelText('Profile screen')).toBeTruthy();
      expect(getByLabelText('Profile avatar')).toBeTruthy();
    });

    it('should have accessibility labels on setting items', () => {
      const { getByLabelText } = render(<MyProfileScreen />);

      expect(getByLabelText('Edit setting')).toBeTruthy();
      expect(getByLabelText('Payment History setting')).toBeTruthy();
      expect(getByLabelText('Change Language setting')).toBeTruthy();
      expect(getByLabelText('Help Center setting')).toBeTruthy();
      expect(getByLabelText('Rate Movea App setting')).toBeTruthy();
      expect(getByLabelText('Change Password setting')).toBeTruthy();
      expect(getByLabelText('Logout setting')).toBeTruthy();
    });
  });

  describe('Snapshot', () => {
    it('should match snapshot', () => {
      const { toJSON } = render(<MyProfileScreen />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
