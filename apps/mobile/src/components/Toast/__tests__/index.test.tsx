import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

// Component
import { Toast } from '..';

// Mock the store
const mockUseToastStore = jest.fn();
jest.mock('@/stores/toast', () => ({
  useToastStore: () => mockUseToastStore(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('uniwind', () => ({
  useResolveClassNames: (classNames: string) => ({ className: classNames }),
  withUniwind: <T,>(Component: T) => Component,
}));

describe('Toast Component', () => {
  const mockHide = jest.fn();
  const mockShowSuccess = jest.fn();
  const mockShowError = jest.fn();
  const mockShowWarning = jest.fn();
  const mockShowInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseToastStore.mockReturnValue({
      toasts: [],
      hide: mockHide,
      showSuccess: mockShowSuccess,
      showError: mockShowError,
      showWarning: mockShowWarning,
      showInfo: mockShowInfo,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('should return null when no toasts are present', () => {
      const { toJSON } = render(<Toast />);
      expect(toJSON()).toBeNull();
    });

    it('should render success toast when toast is present', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '1',
            message: 'Success message',
            type: 'success',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByText } = render(<Toast />);
      expect(getByText('Success message')).toBeTruthy();
    });

    it('should render error toast when toast is present', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '2',
            message: 'Error message',
            type: 'error',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByText } = render(<Toast />);
      expect(getByText('Error message')).toBeTruthy();
    });

    it('should render warning toast', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '3',
            message: 'Warning message',
            type: 'warning',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByText } = render(<Toast />);
      expect(getByText('Warning message')).toBeTruthy();
    });

    it('should render info toast', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '4',
            message: 'Info message',
            type: 'info',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByText } = render(<Toast />);
      expect(getByText('Info message')).toBeTruthy();
    });

    it('should render multiple toasts simultaneously', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '1',
            message: 'First toast',
            type: 'success',
            duration: 3000,
          },
          {
            id: '2',
            message: 'Second toast',
            type: 'error',
            duration: 3000,
          },
          {
            id: '3',
            message: 'Third toast',
            type: 'info',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByText } = render(<Toast />);
      expect(getByText('First toast')).toBeTruthy();
      expect(getByText('Second toast')).toBeTruthy();
      expect(getByText('Third toast')).toBeTruthy();
    });

    it('should render toast with action button', () => {
      const mockActionPress = jest.fn();
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '1',
            message: 'Toast with action',
            type: 'success',
            duration: 5000,
            action: {
              label: 'UNDO',
              onPress: mockActionPress,
            },
          },
        ],
        hide: mockHide,
      });

      const { getByText } = render(<Toast />);
      expect(getByText('Toast with action')).toBeTruthy();
      expect(getByText('UNDO')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call hide with correct ID when toast is pressed', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: 'test-id-1',
            message: 'Test message',
            type: 'success',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByLabelText } = render(<Toast />);
      const touchable = getByLabelText('success toast: Test message');

      fireEvent.press(touchable);

      // Wait for animation to complete
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockHide).toHaveBeenCalledWith('test-id-1');
    });

    it('should call hide for specific toast when multiple toasts exist', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: 'toast-1',
            message: 'First toast',
            type: 'success',
            duration: 3000,
          },
          {
            id: 'toast-2',
            message: 'Second toast',
            type: 'error',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByLabelText } = render(<Toast />);
      const secondToast = getByLabelText('error toast: Second toast');

      fireEvent.press(secondToast);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockHide).toHaveBeenCalledWith('toast-2');
    });

    it('should have correct accessibility label', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '1',
            message: 'Test message',
            type: 'success',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByLabelText } = render(<Toast />);
      expect(getByLabelText('success toast: Test message')).toBeTruthy();
    });

    it('should have correct accessibility label for error', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '1',
            message: 'Error occurred',
            type: 'error',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByLabelText } = render(<Toast />);
      expect(getByLabelText('error toast: Error occurred')).toBeTruthy();
    });
  });

  describe('Action Buttons', () => {
    it('should call action onPress when action button is pressed', () => {
      const mockActionPress = jest.fn();
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: 'action-toast',
            message: 'Action toast',
            type: 'success',
            duration: 5000,
            action: {
              label: 'UNDO',
              onPress: mockActionPress,
            },
          },
        ],
        hide: mockHide,
      });

      const { getByLabelText } = render(<Toast />);
      const actionButton = getByLabelText('UNDO');

      fireEvent.press(actionButton);

      expect(mockActionPress).toHaveBeenCalledTimes(1);
    });

    it('should hide toast after action button is pressed', () => {
      const mockActionPress = jest.fn();
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: 'action-toast',
            message: 'Action toast',
            type: 'success',
            duration: 5000,
            action: {
              label: 'RETRY',
              onPress: mockActionPress,
            },
          },
        ],
        hide: mockHide,
      });

      const { getByLabelText } = render(<Toast />);
      const actionButton = getByLabelText('RETRY');

      fireEvent.press(actionButton);

      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(mockHide).toHaveBeenCalledWith('action-toast');
    });
  });

  describe('Auto Dismiss', () => {
    it('should auto dismiss after default duration (3000ms)', async () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: 'auto-dismiss',
            message: 'Auto dismiss test',
            type: 'success',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      render(<Toast />);

      // Fast-forward time to trigger auto dismiss
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      // Wait for animation to complete
      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockHide).toHaveBeenCalledWith('auto-dismiss');
      });
    });

    it('should auto dismiss after custom duration', async () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: 'custom-duration',
            message: 'Custom duration test',
            type: 'error',
            duration: 5000,
          },
        ],
        hide: mockHide,
      });

      render(<Toast />);

      // Should not dismiss before custom duration
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(mockHide).not.toHaveBeenCalled();

      // Should dismiss after custom duration
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      await waitFor(() => {
        expect(mockHide).toHaveBeenCalledWith('custom-duration');
      });
    });

    it('should clear timer when component unmounts', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: 'unmount-test',
            message: 'Test',
            type: 'success',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { unmount } = render(<Toast />);
      unmount();

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockHide).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '1',
            message: '',
            type: 'success',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByLabelText } = render(<Toast />);
      expect(getByLabelText('success toast: ')).toBeTruthy();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(200);
      mockUseToastStore.mockReturnValue({
        toasts: [
          {
            id: '1',
            message: longMessage,
            type: 'error',
            duration: 3000,
          },
        ],
        hide: mockHide,
      });

      const { getByText } = render(<Toast />);
      expect(getByText(longMessage)).toBeTruthy();
    });
  });
});
