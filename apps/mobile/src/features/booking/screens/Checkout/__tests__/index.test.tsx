import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import CheckoutScreen from '../index';

// Mock dependencies
const mockDismissAll = jest.fn();
const mockReplace = jest.fn();
const mockCreateBooking = jest.fn();
const mockShowLoading = jest.fn();
const mockHideLoading = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockScheduleTicketExpiration = jest.fn();
const mockScheduleShowReminder = jest.fn();

let mockIsPending = false;
let mockWalletData = { id: 'wallet1', balance: 1000, userId: 'user1' };

jest.mock('expo-router', () => ({
  useRouter: () => ({
    dismissAll: mockDismissAll,
    replace: mockReplace,
  }),
}));

jest.mock('@/features/booking/hooks/useBookings', () => ({
  useCreateBooking: () => ({
    mutate: mockCreateBooking,
    get isPending() {
      return mockIsPending;
    },
  }),
}));

jest.mock('@/features/wallet/hooks/useWallet', () => ({
  useWallet: () => ({
    get data() {
      return mockWalletData;
    },
  }),
}));

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

jest.mock('@/features/auth/store/auth', () => ({
  useAuthStore: (selector: any) =>
    selector({
      user: { id: 'user1', email: 'test@example.com' },
    }),
}));

const mockGetTotalAmount = jest.fn(() => 100);
const mockUseBookingStore = jest.fn((selector: any) =>
  selector({
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
      basePrice: 50,
      hall: {
        id: 'hall1',
        name: 'Hall 1',
        hallType: 'IMAX',
      },
    },
    selectedSeats: [
      { seatId: 'seat-A1', seatLabel: 'A1' },
      { seatId: 'seat-A2', seatLabel: 'A2' },
    ],
    reservationId: 'reservation123',
    promoCode: null,
    discountAmount: 0,
    getTotalAmount: mockGetTotalAmount,
  }),
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

describe('CheckoutScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTotalAmount.mockReturnValue(100);
    mockIsPending = false;
    mockWalletData = { id: 'wallet1', balance: 1000, userId: 'user1' };
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('checkout-button')).toBeTruthy();
    });

    it('should render horizontal card', () => {
      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('horizontal-card')).toBeTruthy();
    });

    it('should render all order detail rows', () => {
      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      expect(getByTestId('order-id')).toBeTruthy();
      expect(getByTestId('order-hall')).toBeTruthy();
      expect(getByTestId('order-datetime')).toBeTruthy();
      expect(getByTestId('order-seats')).toBeTruthy();
      expect(getByTestId('order-price')).toBeTruthy();
      expect(getByTestId('order-total')).toBeTruthy();
      expect(getByTestId('wallet-balance')).toBeTruthy();
    });

    it('should render checkout button', () => {
      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });
      expect(getByTestId('checkout-button')).toBeTruthy();
    });

    it('should display reservation ID when available', () => {
      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });
      const orderId = getByTestId('order-id');
      expect(orderId).toBeTruthy();
    });

    it('should display default order ID when reservation ID is not available', () => {
      mockUseBookingStore.mockImplementationOnce((selector: any) =>
        selector({
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
            basePrice: 50,
            hall: {
              id: 'hall1',
              name: 'Hall 1',
              hallType: 'IMAX',
            },
          },
          selectedSeats: [{ seatId: 'seat-A1', seatLabel: 'A1' }],
          reservationId: null,
          promoCode: null,
          discountAmount: 0,
          getTotalAmount: mockGetTotalAmount,
        }),
      );

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });
      const orderId = getByTestId('order-id');
      expect(orderId).toBeTruthy();
    });
  });

  describe('Checkout Flow', () => {
    it('should call createBooking with correct data on checkout', () => {
      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      expect(mockShowLoading).toHaveBeenCalledWith('Creating your booking...');
      expect(mockCreateBooking).toHaveBeenCalledWith(
        {
          userId: 'user1',
          showtimeId: 'showtime1',
          seats: ['A1', 'A2'],
          totalAmount: 100,
        },
        expect.any(Object),
      );
    });

    it('should include promoCodeId when promoCode is available', () => {
      mockUseBookingStore.mockImplementationOnce((selector: any) =>
        selector({
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
            basePrice: 50,
            hall: {
              id: 'hall1',
              name: 'Hall 1',
              hallType: 'IMAX',
            },
          },
          selectedSeats: [{ seatId: 'seat-A1', seatLabel: 'A1' }],
          reservationId: 'reservation123',
          promoCode: 'PROMO123',
          discountAmount: 10,
          getTotalAmount: mockGetTotalAmount,
        }),
      );

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        {
          userId: 'user1',
          showtimeId: 'showtime1',
          seats: ['A1'],
          totalAmount: 100,
          promoCodeId: 'PROMO123',
          discountAmount: 10,
        },
        expect.any(Object),
      );
    });

    it('should include discountAmount when greater than 0', () => {
      mockUseBookingStore.mockImplementationOnce((selector: any) =>
        selector({
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
            basePrice: 50,
            hall: {
              id: 'hall1',
              name: 'Hall 1',
              hallType: 'IMAX',
            },
          },
          selectedSeats: [{ seatId: 'seat-A1', seatLabel: 'A1' }],
          reservationId: 'reservation123',
          promoCode: null,
          discountAmount: 20,
          getTotalAmount: mockGetTotalAmount,
        }),
      );

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          discountAmount: 20,
        }),
        expect.any(Object),
      );
    });

    it('should not include discountAmount when 0', () => {
      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.not.objectContaining({
          discountAmount: expect.anything(),
        }),
        expect.any(Object),
      );
    });
  });

  describe('Success Flow', () => {
    it('should schedule notifications on successful booking', async () => {
      const mockBooking = {
        id: 'booking1',
        userId: 'user1',
        showtimeId: 'showtime1',
        tickets: [{ id: 'ticket1' }, { id: 'ticket2' }],
      };

      let onSuccessCallback: (booking: any) => Promise<void>;
      mockCreateBooking.mockImplementation((data, callbacks) => {
        onSuccessCallback = callbacks.onSuccess;
      });

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockCreateBooking).toHaveBeenCalled();
      });

      if (onSuccessCallback!) {
        await onSuccessCallback(mockBooking);
      }

      expect(mockScheduleTicketExpiration).toHaveBeenCalledTimes(2);
      expect(mockScheduleShowReminder).toHaveBeenCalledTimes(2);
      expect(mockToastSuccess).toHaveBeenCalledWith(
        'Booking confirmed! You will receive reminders before the show.',
      );
      expect(mockDismissAll).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalled();
    });

    it('should handle missing showtime or movie gracefully in notifications', async () => {
      mockUseBookingStore.mockImplementationOnce((selector: any) =>
        selector({
          selectedMovie: null,
          selectedShowtime: null,
          selectedSeats: [{ seatId: 'seat-A1', seatLabel: 'A1' }],
          reservationId: 'reservation123',
          promoCode: null,
          discountAmount: 0,
          getTotalAmount: mockGetTotalAmount,
        }),
      );

      const mockBooking = {
        id: 'booking1',
        userId: 'user1',
        showtimeId: 'showtime1',
        tickets: [{ id: 'ticket1' }],
      };

      let onSuccessCallback: (booking: any) => Promise<void>;
      mockCreateBooking.mockImplementation((data, callbacks) => {
        onSuccessCallback = callbacks.onSuccess;
      });

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockCreateBooking).toHaveBeenCalled();
      });

      if (onSuccessCallback!) {
        await onSuccessCallback(mockBooking);
      }

      // Should not schedule notifications when showtime/movie is missing
      expect(mockScheduleTicketExpiration).not.toHaveBeenCalled();
      expect(mockScheduleShowReminder).not.toHaveBeenCalled();
      // But should still show success and navigate
      expect(mockToastSuccess).toHaveBeenCalled();
      expect(mockDismissAll).toHaveBeenCalled();
    });

    it('should handle notification scheduling errors gracefully', async () => {
      mockScheduleTicketExpiration.mockRejectedValueOnce(
        new Error('Notification error'),
      );

      const mockBooking = {
        id: 'booking1',
        userId: 'user1',
        showtimeId: 'showtime1',
        tickets: [{ id: 'ticket1' }],
      };

      let onSuccessCallback: (booking: any) => Promise<void>;
      mockCreateBooking.mockImplementation((data, callbacks) => {
        onSuccessCallback = callbacks.onSuccess;
      });

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockCreateBooking).toHaveBeenCalled();
      });

      if (onSuccessCallback!) {
        await onSuccessCallback(mockBooking);
      }

      // Should still complete checkout even if notifications fail
      expect(mockToastSuccess).toHaveBeenCalled();
      expect(mockDismissAll).toHaveBeenCalled();
    });

    it('should handle booking with no tickets', async () => {
      const mockBooking = {
        id: 'booking1',
        userId: 'user1',
        showtimeId: 'showtime1',
        tickets: [],
      };

      let onSuccessCallback: (booking: any) => Promise<void>;
      mockCreateBooking.mockImplementation((data, callbacks) => {
        onSuccessCallback = callbacks.onSuccess;
      });

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockCreateBooking).toHaveBeenCalled();
      });

      if (onSuccessCallback!) {
        await onSuccessCallback(mockBooking);
      }

      // Should not schedule notifications for empty tickets
      expect(mockScheduleTicketExpiration).not.toHaveBeenCalled();
      expect(mockScheduleShowReminder).not.toHaveBeenCalled();
      // But should still show success
      expect(mockToastSuccess).toHaveBeenCalled();
    });
  });

  describe('Error Flow', () => {
    it('should handle booking creation error', async () => {
      const mockError = new Error('Booking failed');
      let onErrorCallback: (error: Error) => void;
      mockCreateBooking.mockImplementation((data, callbacks) => {
        onErrorCallback = callbacks.onError;
      });

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockCreateBooking).toHaveBeenCalled();
      });

      if (onErrorCallback!) {
        onErrorCallback(mockError);
      }

      expect(mockToastError).toHaveBeenCalledWith('Booking failed');
    });

    it('should use default error message when error message is missing', async () => {
      const mockError = new Error('');
      let onErrorCallback: (error: Error) => void;
      mockCreateBooking.mockImplementation((data, callbacks) => {
        onErrorCallback = callbacks.onError;
      });

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      await waitFor(() => {
        expect(mockCreateBooking).toHaveBeenCalled();
      });

      if (onErrorCallback!) {
        onErrorCallback(mockError);
      }

      expect(mockToastError).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing showtime ID', () => {
      mockUseBookingStore.mockImplementationOnce((selector: any) =>
        selector({
          selectedMovie: {
            id: 'movie1',
            title: 'Test Movie',
            posterUrl: 'https://example.com/poster.jpg',
            rating: 4.5,
            genre: ['Action'],
            durationMinutes: 120,
          },
          selectedShowtime: null,
          selectedSeats: [{ seatId: 'seat-A1', seatLabel: 'A1' }],
          reservationId: 'reservation123',
          promoCode: null,
          discountAmount: 0,
          getTotalAmount: mockGetTotalAmount,
        }),
      );

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          showtimeId: '',
        }),
        expect.any(Object),
      );
    });

    it('should handle empty seats array', () => {
      mockUseBookingStore.mockImplementationOnce((selector: any) =>
        selector({
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
            basePrice: 50,
            hall: {
              id: 'hall1',
              name: 'Hall 1',
              hallType: 'IMAX',
            },
          },
          selectedSeats: [],
          reservationId: 'reservation123',
          promoCode: null,
          discountAmount: 0,
          getTotalAmount: mockGetTotalAmount,
        }),
      );

      const { getByTestId } = render(<CheckoutScreen />, {
        wrapper: createWrapper(),
      });

      const button = getByTestId('checkout-button');
      fireEvent.press(button);

      expect(mockCreateBooking).toHaveBeenCalledWith(
        expect.objectContaining({
          seats: [],
        }),
        expect.any(Object),
      );
    });
  });
});
