import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react-native';
import { ScrollView } from 'react-native';

import CheckoutScreen from '../index';

// Error
import { PaymentsError } from '@/features/payments/error/payments';

// Mock dependencies
const mockDismissAll = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockCheckout = jest.fn();
const mockAddCard = jest.fn();
const mockRefetchCards = jest.fn();
const mockShowLoading = jest.fn();
const mockHideLoading = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockScheduleTicketExpiration = jest.fn();
const mockScheduleShowReminder = jest.fn();

const VISA = {
  id: 'pm_visa',
  brand: 'visa',
  last4: '4242',
  expMonth: 4,
  expYear: 2031,
};
const MASTERCARD = {
  id: 'pm_mc',
  brand: 'mastercard',
  last4: '4444',
  expMonth: 1,
  expYear: 2030,
};

let mockIsPaying = false;
let mockIsAddingCard = false;
let mockCards: {
  data?: (typeof VISA)[];
  isLoading: boolean;
  isError: boolean;
};

jest.mock('expo-router', () => ({
  useRouter: () => ({
    dismissAll: mockDismissAll,
    replace: mockReplace,
    back: mockBack,
  }),
}));

jest.mock('@/features/payments/hooks/usePayments', () => ({
  usePaymentMethods: () => ({ ...mockCards, refetch: mockRefetchCards }),
  useAddCard: () => ({
    mutateAsync: mockAddCard,
    get isPending() {
      return mockIsAddingCard;
    },
  }),
  useCheckout: () => ({
    mutate: mockCheckout,
    get isPending() {
      return mockIsPaying;
    },
  }),
}));

jest.mock('@/icons/AddIcon', () => ({ AddIcon: () => null }));

jest.mock('@/hooks/useToast', () => ({
  useToastAlert: () => ({
    success: mockToastSuccess,
    error: mockToastError,
  }),
}));

jest.mock('@/hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({
    scheduleTicketExpiration: mockScheduleTicketExpiration,
    scheduleShowReminder: mockScheduleShowReminder,
  }),
}));

const mockGetTotalAmount = jest.fn(() => 17);

const bookingState = (overrides: Record<string, unknown> = {}) => ({
  selectedMovie: {
    id: 'movie1',
    title: 'Test Movie',
    posterUrl: 'https://example.com/poster.jpg',
    rating: 4.5,
    genre: ['Action'],
    durationMinutes: 120,
  },
  selectedShowtime: {
    id: 'showtime1',
    movieId: 'movie1',
    hallId: 'hall1',
    showDate: '2024-01-15',
    showTime: '14:00',
    endTime: '16:00',
    basePrice: 8.5,
    hall: {
      id: 'hall1',
      name: 'Hall 1',
      hallType: 'IMAX',
    },
  },
  selectedSeats: [
    { seatId: 'seat-A1', seatLabel: 'A1', holdId: 'hold-1' },
    { seatId: 'seat-A2', seatLabel: 'A2', holdId: 'hold-2' },
  ],
  holdIds: ['hold-1', 'hold-2'],
  getTotalAmount: mockGetTotalAmount,
  ...overrides,
});

const mockUseBookingStore = jest.fn((selector: any) =>
  selector(bookingState()),
);

jest.mock('@/features/booking/store/booking', () => ({
  useBookingStore: (selector: any) => mockUseBookingStore(selector),
}));

jest.mock('@/stores/loading', () => ({
  useLoadingStore: (selector: any) =>
    selector({
      showLoading: mockShowLoading,
      hideLoading: mockHideLoading,
    }),
}));

const RESERVATION = {
  id: 'reservation1',
  reservationNumber: 'RSV-1',
  userId: 'user1',
  showtimeId: 'showtime1',
  status: 'confirmed',
  totalSeats: 2,
  totalAmount: 17,
  createdAt: '2024-01-15T00:00:00.000Z',
  tickets: [{ id: 'ticket1' }, { id: 'ticket2' }],
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryClientWrapper';

  return Wrapper;
};

const renderCheckout = () =>
  render(<CheckoutScreen />, { wrapper: createWrapper() });

// Press checkout and hand back the callbacks the screen passed to mutate.
const pressCheckout = (getByTestId: (id: string) => any) => {
  fireEvent.press(getByTestId('checkout-button'));
  return mockCheckout.mock.calls[0][1] as {
    onSuccess: (outcome: unknown) => Promise<void>;
    onError: (error: PaymentsError) => void;
  };
};

describe('CheckoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTotalAmount.mockReturnValue(17);
    mockIsPaying = false;
    mockIsAddingCard = false;
    mockCards = { data: [VISA, MASTERCARD], isLoading: false, isError: false };
    mockUseBookingStore.mockImplementation((selector: any) =>
      selector(bookingState()),
    );
  });

  describe('Rendering', () => {
    it('should render the movie and every order row', () => {
      const { getByTestId } = renderCheckout();

      expect(getByTestId('horizontal-card')).toBeTruthy();
      expect(getByTestId('order-hall')).toBeTruthy();
      expect(getByTestId('order-datetime')).toBeTruthy();
      expect(getByTestId('order-seats')).toBeTruthy();
      expect(getByTestId('order-price')).toBeTruthy();
      expect(getByTestId('order-total')).toBeTruthy();
    });

    it('should price the order in US dollars', () => {
      const { getByText } = renderCheckout();

      expect(getByText('$8.50 x 2')).toBeTruthy();
      expect(getByText('$17.00')).toBeTruthy();
      expect(getByText('Pay $17.00')).toBeTruthy();
    });

    it('should list the saved cards with the first one selected', () => {
      const { getByTestId } = renderCheckout();

      expect(
        getByTestId('payment-method-pm_visa').props.accessibilityState,
      ).toEqual({ selected: true });
      expect(
        getByTestId('payment-method-pm_mc').props.accessibilityState,
      ).toEqual({ selected: false });
    });

    it('should show a loader while the cards load', () => {
      mockCards = { data: undefined, isLoading: true, isError: false };

      const { getByTestId } = renderCheckout();

      expect(getByTestId('payment-methods-loading')).toBeTruthy();
    });

    it('should offer a retry when the cards fail to load', () => {
      mockCards = { data: undefined, isLoading: false, isError: true };

      const { getByTestId } = renderCheckout();
      fireEvent.press(getByTestId('payment-methods-retry'));

      expect(mockRefetchCards).toHaveBeenCalled();
    });

    it('should ask for a card and block checkout when none is saved', () => {
      mockCards = { data: [], isLoading: false, isError: false };

      const { getByTestId } = renderCheckout();

      expect(getByTestId('payment-methods-empty')).toBeTruthy();
      expect(getByTestId('checkout-button').props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });
  });

  describe('Layout', () => {
    it('should scroll the order and cards together', () => {
      const { UNSAFE_getByType } = renderCheckout();
      const scrollView = within(UNSAFE_getByType(ScrollView));

      expect(scrollView.getByTestId('horizontal-card')).toBeTruthy();
      expect(scrollView.getByTestId('order-total')).toBeTruthy();
      expect(scrollView.getByTestId('payment-method-pm_visa')).toBeTruthy();
      expect(scrollView.getByTestId('add-card-button')).toBeTruthy();
    });

    it('should pin the Pay button outside the scroll area', () => {
      const { UNSAFE_getByType, getByTestId } = renderCheckout();
      const scrollView = within(UNSAFE_getByType(ScrollView));

      expect(getByTestId('checkout-button')).toBeTruthy();
      expect(scrollView.queryByTestId('checkout-button')).toBeNull();
    });
  });

  describe('Choosing a card', () => {
    it('should pay with the card the customer picks', () => {
      const { getByTestId } = renderCheckout();

      fireEvent.press(getByTestId('payment-method-pm_mc'));
      pressCheckout(getByTestId);

      expect(mockCheckout).toHaveBeenCalledWith(
        { holdIds: ['hold-1', 'hold-2'], paymentMethodId: 'pm_mc' },
        expect.any(Object),
      );
    });

    it('should select a newly added card straight away', async () => {
      mockCards = { data: [VISA], isLoading: false, isError: false };
      mockAddCard.mockResolvedValue(undefined);
      mockRefetchCards.mockResolvedValue({ data: [MASTERCARD, VISA] });

      const { getByTestId, rerender } = renderCheckout();

      await act(async () => {
        fireEvent.press(getByTestId('add-card-button'));
      });

      expect(mockAddCard).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('Card saved');

      // The refetched list reaches the screen through the query.
      mockCards = {
        data: [MASTERCARD, VISA],
        isLoading: false,
        isError: false,
      };
      rerender(<CheckoutScreen />);

      pressCheckout(getByTestId);
      expect(mockCheckout).toHaveBeenCalledWith(
        expect.objectContaining({ paymentMethodId: 'pm_mc' }),
        expect.any(Object),
      );
    });

    it('should stay quiet when the customer closes the card sheet', async () => {
      mockAddCard.mockRejectedValue(PaymentsError.addCardCanceled());

      const { getByTestId } = renderCheckout();

      await act(async () => {
        fireEvent.press(getByTestId('add-card-button'));
      });

      expect(mockToastError).not.toHaveBeenCalled();
      expect(mockRefetchCards).not.toHaveBeenCalled();
    });

    it('should report a card that could not be saved', async () => {
      mockAddCard.mockRejectedValue(
        PaymentsError.addCardFailed('Your card was declined.'),
      );

      const { getByTestId } = renderCheckout();

      await act(async () => {
        fireEvent.press(getByTestId('add-card-button'));
      });

      expect(mockToastError).toHaveBeenCalledWith('Your card was declined.');
    });
  });

  describe('Checkout Flow', () => {
    it('should pay for the held seats with the selected card', () => {
      const { getByTestId } = renderCheckout();

      pressCheckout(getByTestId);

      expect(mockShowLoading).toHaveBeenCalledWith(
        'Processing your payment...',
      );
      expect(mockCheckout).toHaveBeenCalledWith(
        { holdIds: ['hold-1', 'hold-2'], paymentMethodId: 'pm_visa' },
        expect.objectContaining({ onSettled: mockHideLoading }),
      );
    });

    it('should not pay while a payment is in flight', () => {
      mockIsPaying = true;

      const { getByTestId } = renderCheckout();

      expect(getByTestId('checkout-button').props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });
  });

  describe('Success Flow', () => {
    it('should schedule notifications and show success once paid', async () => {
      const { getByTestId } = renderCheckout();
      const { onSuccess } = pressCheckout(getByTestId);

      await onSuccess({
        status: 'succeeded',
        paymentId: 'pay-1',
        reservation: RESERVATION,
      });

      expect(mockScheduleTicketExpiration).toHaveBeenCalledTimes(2);
      expect(mockScheduleShowReminder).toHaveBeenCalledTimes(2);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Booking confirmed! You will receive reminders before the show.',
      );
      expect(mockDismissAll).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(
        '/(main)/booking/checkout-success',
      );
    });

    it('should still finish when notifications cannot be scheduled', async () => {
      mockScheduleTicketExpiration.mockRejectedValueOnce(
        new Error('Notification error'),
      );

      const { getByTestId } = renderCheckout();
      const { onSuccess } = pressCheckout(getByTestId);

      await onSuccess({
        status: 'succeeded',
        paymentId: 'pay-1',
        reservation: RESERVATION,
      });

      expect(mockToastSuccess).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith(
        '/(main)/booking/checkout-success',
      );
    });

    it('should send the customer to their payments while Stripe is still processing', async () => {
      const { getByTestId } = renderCheckout();
      const { onSuccess } = pressCheckout(getByTestId);

      await onSuccess({ status: 'processing', paymentId: 'pay-1' });

      expect(mockScheduleTicketExpiration).not.toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.stringContaining('processing'),
      );
      expect(mockReplace).toHaveBeenCalledWith('/(main)/(tabs)/wallet');
    });
  });

  describe('Error Flow', () => {
    it('should show the decline and let the customer try another card', async () => {
      const { getByTestId } = renderCheckout();
      const { onError } = pressCheckout(getByTestId);

      onError(PaymentsError.checkoutFailed('Your card was declined.'));

      expect(mockToastError).toHaveBeenCalledWith('Your card was declined.');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it.each(['SEAT_HOLD_EXPIRED', 'PAYMENT_REFUNDED'])(
      'should send the customer back to pick seats on %s',
      code => {
        const { getByTestId } = renderCheckout();
        const { onError } = pressCheckout(getByTestId);

        onError(PaymentsError.checkoutFailed('Seats released', code));

        expect(mockToastError).toHaveBeenCalledWith('Seats released');
        expect(mockBack).toHaveBeenCalled();
      },
    );

    it('should refuse to pay with no held seats', async () => {
      mockUseBookingStore.mockImplementation((selector: any) =>
        selector(bookingState({ holdIds: [] })),
      );

      const { getByTestId } = renderCheckout();

      await waitFor(() =>
        expect(getByTestId('checkout-button').props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: true }),
        ),
      );
      expect(mockCheckout).not.toHaveBeenCalled();
    });
  });
});
