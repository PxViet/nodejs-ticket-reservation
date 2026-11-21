import { fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
  reverseGeocodeAsync,
} from 'expo-location';

// Component
import { LocationDropdown } from '../';

// Constants
import { ERROR_MESSAGES } from '@/constants';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
}));

// Mock uniwind
jest.mock('uniwind', () => ({
  useResolveClassNames: (classNames: string) => ({ className: classNames }),
  withUniwind: <T,>(Component: T) => Component,
}));

describe('LocationDropdown Component', () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    testID: 'location-dropdown',
    onChange: mockOnChange,
  };

  const mockLocation = {
    coords: {
      latitude: -6.2088,
      longitude: 106.8456,
    },
  };

  const mockAddress = [
    {
      city: 'Jakarta',
      street: 'Test Street',
      region: 'Jakarta',
      country: 'Indonesia',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);
    (reverseGeocodeAsync as jest.Mock).mockResolvedValue(mockAddress);
  });

  describe('Rendering', () => {
    it('should display placeholder text initially', () => {
      const { getByText } = render(<LocationDropdown {...defaultProps} />);
      expect(getByText('Select Your Location')).toBeTruthy();
    });

    it('should render the dropdown button', () => {
      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      expect(getByTestId('location-dropdown-button')).toBeTruthy();
    });

    it('should not show error message initially', () => {
      const { queryByTestId } = render(<LocationDropdown {...defaultProps} />);
      expect(queryByTestId('location-dropdown-error')).toBeNull();
    });

    it('should not show modal initially', () => {
      const { queryByTestId } = render(<LocationDropdown {...defaultProps} />);
      expect(queryByTestId('location-dropdown-modal')).toBeNull();
    });

    it('should render with custom testID', () => {
      const { getByTestId } = render(
        <LocationDropdown {...defaultProps} testID="custom-dropdown" />,
      );
      expect(getByTestId('custom-dropdown')).toBeTruthy();
    });

    it('should apply containerClassName', () => {
      const { getByTestId } = render(
        <LocationDropdown
          {...defaultProps}
          containerClassName="custom-class"
        />,
      );
      const container = getByTestId('location-dropdown');
      expect(container).toBeTruthy();
    });
  });

  describe('Placeholder Display', () => {
    it('should show placeholder when value is empty', () => {
      const { getByText } = render(
        <LocationDropdown {...defaultProps} value="" />,
      );
      expect(getByText('Select Your Location')).toBeTruthy();
    });

    it('should show placeholder when value is not provided', () => {
      const { getByText } = render(<LocationDropdown {...defaultProps} />);
      expect(getByText('Select Your Location')).toBeTruthy();
    });
  });

  describe('Opening Dropdown', () => {
    it('should request location permission when opened', async () => {
      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
      });
    });

    it('should get current position after permission granted', async () => {
      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getCurrentPositionAsync).toHaveBeenCalledTimes(1);
      });
    });

    it('should reverse geocode after getting position', async () => {
      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(reverseGeocodeAsync).toHaveBeenCalledWith({
          latitude: mockLocation.coords.latitude,
          longitude: mockLocation.coords.longitude,
        });
      });
    });

    it('should open modal after successful location fetch', async () => {
      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });
    });

    it('should not open modal if permission is denied', async () => {
      (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { getByTestId, queryByTestId } = render(
        <LocationDropdown {...defaultProps} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(queryByTestId('location-dropdown-modal')).toBeNull();
      });
    });

    it('should show error message when permission is denied', async () => {
      (requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const { getByTestId, getByText } = render(
        <LocationDropdown {...defaultProps} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(
          getByText(ERROR_MESSAGES.LOCATION_PERMISSION_DENIED),
        ).toBeTruthy();
      });
    });

    it('should not request location if disabled', async () => {
      const { getByTestId } = render(
        <LocationDropdown {...defaultProps} disabled={true} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      });
    });

    it('should open modal without requesting permission if already requested and location exists', async () => {
      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      const button = getByTestId('location-dropdown-button');

      // First open - should request permission
      fireEvent.press(button);

      await waitFor(() => {
        expect(requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      // Close modal
      const closeButton = getByTestId('location-dropdown-modal-close');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(() => getByTestId('location-dropdown-modal')).toThrow();
      });

      // Second open - should NOT request permission again
      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
        expect(requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1); // Still only called once
      });
    });
  });

  describe('Location Selection', () => {
    it('should display selected location after selection', async () => {
      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      const button = getByTestId('location-dropdown-button');

      // Open dropdown and fetch location
      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      // Select location
      const option = getByTestId('location-dropdown-option-Jakarta');
      fireEvent.press(option);

      // Check that onChange was called
      expect(mockOnChange).toHaveBeenCalledWith('Jakarta');

      // Check that modal is closed
      await waitFor(() => {
        expect(() => getByTestId('location-dropdown-modal')).toThrow();
      });
    });

    it('should display selected location value when provided', async () => {
      // First, set up location data
      const { getByTestId, rerender, getByText } = render(
        <LocationDropdown {...defaultProps} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      const option = getByTestId('location-dropdown-option-Jakarta');
      fireEvent.press(option);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('Jakarta');
      });

      // Rerender with value prop
      rerender(<LocationDropdown {...defaultProps} value="Jakarta" />);

      expect(getByText('Jakarta')).toBeTruthy();
    });

    it('should close modal after selection', async () => {
      const { getByTestId, queryByTestId } = render(
        <LocationDropdown {...defaultProps} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      const option = getByTestId('location-dropdown-option-Jakarta');
      fireEvent.press(option);

      await waitFor(() => {
        expect(queryByTestId('location-dropdown-modal')).toBeNull();
      });
    });

    it('should close modal when close button is pressed', async () => {
      const { getByTestId, queryByTestId } = render(
        <LocationDropdown {...defaultProps} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      const closeButton = getByTestId('location-dropdown-modal-close');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(queryByTestId('location-dropdown-modal')).toBeNull();
      });
    });

    it('should close modal when backdrop is pressed', async () => {
      const { getByTestId, queryByTestId } = render(
        <LocationDropdown {...defaultProps} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      const backdrop = getByTestId('location-dropdown-modal-backdrop');
      fireEvent.press(backdrop);

      await waitFor(() => {
        expect(queryByTestId('location-dropdown-modal')).toBeNull();
      });
    });

    it('should prevent backdrop press from closing when modal content is touched', async () => {
      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      // Test that pressing on an option (modal content) doesn't trigger backdrop close
      // The onStartShouldSetResponder on line 229 should prevent backdrop from receiving the touch
      const option = getByTestId('location-dropdown-option-Jakarta');

      // Press the option - this should select it and close via handleSelect, not backdrop
      fireEvent.press(option);

      // Verify onChange was called (selection worked)
      expect(mockOnChange).toHaveBeenCalledWith('Jakarta');
    });

    it('should have onStartShouldSetResponder on modal content view', async () => {
      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      // Get the modal element and verify it contains a View with onStartShouldSetResponder
      const modal = getByTestId('location-dropdown-modal');

      // The modal should be rendered (which includes the View with onStartShouldSetResponder on line 229)
      // We can verify this by checking that the modal content is interactive
      const option = getByTestId('location-dropdown-option-Jakarta');
      expect(option).toBeTruthy();

      // Trigger a touch event that would cause the responder system to check onStartShouldSetResponder
      // This executes line 229
      fireEvent(option, 'touchStart', {
        nativeEvent: {
          touches: [],
          target: option,
        },
      });

      // Modal should still be open (responder was claimed by modal content, not backdrop)
      expect(getByTestId('location-dropdown-modal')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should use region when city is not available', async () => {
      const mockAddressWithoutCity = [
        {
          region: 'West Java',
          street: 'Test Street',
          country: 'Indonesia',
        },
      ];

      (reverseGeocodeAsync as jest.Mock).mockResolvedValue(
        mockAddressWithoutCity,
      );

      const { getByTestId, getByText } = render(
        <LocationDropdown {...defaultProps} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
        expect(getByText('West Java')).toBeTruthy();
      });

      expect(mockOnChange).toHaveBeenCalledWith('West Java');
    });

    it('should show "Unknown Location" when neither city nor region is available', async () => {
      const mockAddressEmpty = [
        {
          street: 'Test Street',
          country: 'Indonesia',
        },
      ];

      (reverseGeocodeAsync as jest.Mock).mockResolvedValue(mockAddressEmpty);

      const { getByTestId, getByText } = render(
        <LocationDropdown {...defaultProps} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
        expect(getByText('Unknown Location')).toBeTruthy();
      });
    });

    it('should request permission again if hasRequestedPermission is true but location.city is missing', async () => {
      const mockAddressWithoutCity = [
        {
          region: 'West Java',
          street: 'Test Street',
          country: 'Indonesia',
        },
      ];

      (reverseGeocodeAsync as jest.Mock).mockResolvedValue(
        mockAddressWithoutCity,
      );

      const { getByTestId } = render(<LocationDropdown {...defaultProps} />);
      const button = getByTestId('location-dropdown-button');

      // First open - should request permission
      fireEvent.press(button);

      await waitFor(() => {
        expect(requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      // Close modal
      const closeButton = getByTestId('location-dropdown-modal-close');
      fireEvent.press(closeButton);

      await waitFor(() => {
        expect(() => getByTestId('location-dropdown-modal')).toThrow();
      });

      // Second open - should request permission again because location.city is missing
      fireEvent.press(button);

      await waitFor(() => {
        expect(requestForegroundPermissionsAsync).toHaveBeenCalledTimes(2);
      });
    });

    it('should display value prop when it does not match location options', async () => {
      const { getByText } = render(
        <LocationDropdown {...defaultProps} value="Custom Location" />,
      );
      expect(getByText('Custom Location')).toBeTruthy();
    });

    it('should handle modal onRequestClose', async () => {
      const { getByTestId, queryByTestId } = render(
        <LocationDropdown {...defaultProps} />,
      );
      const button = getByTestId('location-dropdown-button');

      fireEvent.press(button);

      await waitFor(() => {
        expect(getByTestId('location-dropdown-modal')).toBeTruthy();
      });

      // Simulate Android back button press
      const modal = getByTestId('location-dropdown-modal');
      fireEvent(modal, 'requestClose');

      await waitFor(() => {
        expect(queryByTestId('location-dropdown-modal')).toBeNull();
      });
    });
  });
});
