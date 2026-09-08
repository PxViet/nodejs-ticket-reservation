import { fireEvent, render } from '@testing-library/react-native';

import CheckoutSuccessScreen from '../index';

// Constants
import { MESSAGES } from '@/constants';

// Mock dependencies
const mockReplace = jest.fn();
const mockSetSeats = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

const mockUseBookingStore = jest.fn((selector: any) =>
  selector({
    setSeats: mockSetSeats,
  }),
);

jest.mock('@/features/booking/store/booking', () => ({
  useBookingStore: (selector: any) => mockUseBookingStore(selector),
}));

describe('CheckoutSuccessScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseBookingStore.mockImplementation((selector: any) =>
      selector({
        setSeats: mockSetSeats,
      }),
    );
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<CheckoutSuccessScreen />);
      expect(getByTestId('confirmation-state')).toBeTruthy();
    });

    it('should render ConfirmationState with correct props', () => {
      const { getByTestId, getByText } = render(<CheckoutSuccessScreen />);

      expect(getByTestId('confirmation-state')).toBeTruthy();
      expect(getByText(MESSAGES.CHECKOUT_SUCCESS_TITLE)).toBeTruthy();
      expect(getByText(MESSAGES.CHECKOUT_SUCCESS_DESCRIPTION)).toBeTruthy();
    });

    it('should render "My Ticket" button', () => {
      const { getByText } = render(<CheckoutSuccessScreen />);
      expect(getByText('My Ticket')).toBeTruthy();
    });

    it('should render "Back to home" link', () => {
      const { getByText } = render(<CheckoutSuccessScreen />);
      expect(getByText('Discover new movies?')).toBeTruthy();
      expect(getByText('Back to home')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate to MY_TICKET when "My Ticket" button is pressed', () => {
      const { getByText } = render(<CheckoutSuccessScreen />);
      const button = getByText('My Ticket').parent;

      fireEvent.press(button!);

      expect(mockReplace).toHaveBeenCalledWith('/(main)/(tabs)/my-ticket');
    });

    it('should navigate to HOME when "Back to home" is pressed', () => {
      const { getByText } = render(<CheckoutSuccessScreen />);
      const pressable = getByText('Back to home').parent;

      fireEvent.press(pressable!);

      expect(mockReplace).toHaveBeenCalledWith('/(main)/(tabs)');
    });
  });

  describe('Seat Clearing', () => {
    it('should clear the selected seats when "My Ticket" button is pressed', () => {
      const { getByText } = render(<CheckoutSuccessScreen />);
      const button = getByText('My Ticket').parent;

      fireEvent.press(button!);

      expect(mockSetSeats).toHaveBeenCalledWith([]);
    });

    it('should clear the selected seats when "Back to home" is pressed', () => {
      const { getByText } = render(<CheckoutSuccessScreen />);
      const pressable = getByText('Back to home').parent;

      fireEvent.press(pressable!);

      expect(mockSetSeats).toHaveBeenCalledWith([]);
    });

    it('should still navigate after clearing seats', () => {
      const { getByText } = render(<CheckoutSuccessScreen />);
      const button = getByText('My Ticket').parent;

      fireEvent.press(button!);

      expect(mockSetSeats).toHaveBeenCalledWith([]);
      expect(mockReplace).toHaveBeenCalledWith('/(main)/(tabs)/my-ticket');
    });
  });
});
