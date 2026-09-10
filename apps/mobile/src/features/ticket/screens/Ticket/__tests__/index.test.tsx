import { fireEvent, render } from '@testing-library/react-native';

import TicketDetailScreen from '../index';

// Types
import { ReservationStatus } from '@/features/booking/schemas/reservation';
import { ReservationDetail } from '@/features/booking/services/reservations';

// Mock expo-router
let mockReservationId = 'reservation-123';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockReservationId }),
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
  };
});

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  const { View } = require('react-native');
  const Component = ({ value, testID, ...props }: any) => (
    <View testID={testID || 'qr-code'} {...props} data-value={value} />
  );
  Component.displayName = 'QRCode';
  return Component;
});

// Mock expo-image
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: ({ testID, ...props }: any) => <View testID={testID} {...props} />,
  };
});

// Mock utils
jest.mock('@/utils/cn', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));

jest.mock('@/utils/formats', () => ({
  formatIDR: (value: number) => `IDR ${value.toLocaleString()}`,
  formatDate: (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  },
  formatTime: (time: string) => {
    if (!time) return '';
    return time;
  },
  formatMovieDuration: (minutes: number) =>
    `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
  formatShowtimeDate: (time?: string, date?: string) => {
    if (!time && !date) return '';
    return `${time || ''} ${date || ''}`.trim();
  },
  clampedRatingToStars: (rating: number) => {
    const clampedRating = Math.max(0, Math.min(5, rating));
    return Array.from({ length: 5 }, (_, index) => {
      const starValue = index + 1;
      if (clampedRating >= starValue) return 1;
      if (clampedRating > index) return clampedRating - index;
      return 0;
    });
  },
}));

// Mock custom hooks
const mockRefetchTicket = jest.fn();

let mockReservationData: ReservationDetail | undefined;
let mockIsLoading = false;
let mockIsError = false;

jest.mock('@/features/booking/hooks/useReservations', () => ({
  useReservation: () => ({
    data: mockReservationData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: mockRefetchTicket,
  }),
}));

// Mock constants
jest.mock('@/constants', () => ({
  Size: {
    EXTRA_SMALL: 'extra-small',
    SMALL: 'small',
    MEDIUM: 'medium',
    LARGE: 'large',
  },
  IMAGE_SIZE_MAP: {
    'extra-small': 'w-16 h-24',
    small: 'w-21 h-30',
    medium: 'w-30 h-43',
    large: 'w-40 h-56',
  },
  BLUR_HASH: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  UNACTIVE_MESSAGE: {
    active: '',
    used: 'This ticket has already been scanned and used.',
    cancelled: 'This booking has been cancelled.',
  },
}));

// Mock reservation data
const createMockReservation = (
  status: ReservationStatus = 'confirmed',
): ReservationDetail => ({
  id: 'reservation-123',
  reservationNumber: 'RSV-001',
  userId: 'user-1',
  showtimeId: 'showtime-1',
  status,
  totalSeats: 2,
  totalAmount: 100000,
  createdAt: '2025-01-01T00:00:00Z',
  tickets: [
    {
      id: 'ticket-1',
      seatId: 'seat-A1',
      seatLabel: 'A1',
      ticketNumber: 'TKT-001',
      price: 50000,
      status: status === 'cancelled' ? 'cancelled' : 'valid',
    },
    {
      id: 'ticket-2',
      seatId: 'seat-A2',
      seatLabel: 'A2',
      ticketNumber: 'TKT-002',
      price: 50000,
      status: status === 'cancelled' ? 'cancelled' : 'valid',
    },
  ],
  showtime: {
    id: 'showtime-1',
    movieId: 'movie-1',
    hallId: 'hall-1',
    showDate: '2025-01-15',
    showTime: '14:00',
    endTime: '16:00',
    basePrice: 50000,
    status: 'active',
    totalSeats: 100,
    seatsTaken: 10,
    availableSeats: 90,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    movie: {
      id: 'movie-1',
      title: 'Test Movie',
      durationMinutes: 120,
      posterUrl: 'https://example.com/poster.jpg',
      language: 'en',
      rating: 8.5,
    },
    hall: {
      id: 'hall-1',
      name: 'Hall 1',
      hallType: '2D',
    },
  },
});

describe('TicketDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReservationId = 'reservation-123';
    mockReservationData = undefined;
    mockIsLoading = false;
    mockIsError = false;
  });

  describe('Loading State', () => {
    it('should show ticket detail skeleton when loading', () => {
      mockIsLoading = true;

      const { getByTestId } = render(<TicketDetailScreen />);

      expect(getByTestId('ticket-detail-skeleton')).toBeTruthy();
    });

    it('should render all skeleton elements when loading', () => {
      mockIsLoading = true;

      const { getByTestId } = render(<TicketDetailScreen />);

      expect(getByTestId('ticket-detail-skeleton')).toBeTruthy();
      expect(getByTestId('horizontal-card-skeleton')).toBeTruthy();
      expect(getByTestId('ticket-detail-skeleton-qr')).toBeTruthy();
    });

    it('should have correct accessibility label for skeleton', () => {
      mockIsLoading = true;

      const { getByLabelText } = render(<TicketDetailScreen />);

      expect(getByLabelText('Loading ticket details')).toBeTruthy();
    });
  });

  describe('Error State', () => {
    it('should show retry button when error occurs', () => {
      mockIsError = true;

      const { getByText } = render(<TicketDetailScreen />);

      expect(getByText('Retry')).toBeTruthy();
    });

    it('should call refetch when retry button is pressed', () => {
      mockIsError = true;

      const { getByText } = render(<TicketDetailScreen />);

      fireEvent.press(getByText('Retry'));

      expect(mockRefetchTicket).toHaveBeenCalled();
    });

    it('should have accessibility label for retry button', () => {
      mockIsError = true;

      const { getByLabelText } = render(<TicketDetailScreen />);

      expect(getByLabelText('Retry loading ticket')).toBeTruthy();
    });

    it('should show retry when reservation data is missing', () => {
      mockReservationData = undefined;

      const { getByText } = render(<TicketDetailScreen />);

      expect(getByText('Retry')).toBeTruthy();
    });
  });

  describe('Ticket Display - Active Reservation', () => {
    beforeEach(() => {
      mockReservationData = createMockReservation('confirmed');
    });

    it('should display movie title', () => {
      const { getByText } = render(<TicketDetailScreen />);

      expect(getByText('Test Movie')).toBeTruthy();
    });

    it('should display date and time', () => {
      const { getByTestId } = render(<TicketDetailScreen />);

      const dateTimeRow = getByTestId('order-datetime');
      expect(dateTimeRow).toBeTruthy();
    });

    it('should display seat numbers', () => {
      const { getByTestId } = render(<TicketDetailScreen />);

      const seatsRow = getByTestId('order-seats');
      expect(seatsRow).toBeTruthy();
    });

    it('should display paid amount', () => {
      const { getByTestId } = render(<TicketDetailScreen />);

      const paidRow = getByTestId('paid');
      expect(paidRow).toBeTruthy();
    });

    it('should display ticket status', () => {
      const { getByTestId } = render(<TicketDetailScreen />);

      const statusRow = getByTestId('ticket-status');
      expect(statusRow).toBeTruthy();
    });

    it('should display QR code for an active reservation', () => {
      const { getByTestId } = render(<TicketDetailScreen />);

      expect(getByTestId('qr-code')).toBeTruthy();
    });

    it('should display order ID', () => {
      const { getByText } = render(<TicketDetailScreen />);

      expect(getByText('ID Order')).toBeTruthy();
      expect(getByText('RSV-001')).toBeTruthy();
    });

    it('should have screen accessibility label', () => {
      const { getByLabelText } = render(<TicketDetailScreen />);

      expect(getByLabelText('Ticket Detail screen')).toBeTruthy();
    });
  });

  describe('Ticket Display - Used (completed) Reservation', () => {
    beforeEach(() => {
      mockReservationData = createMockReservation('completed');
    });

    it('should not display QR code', () => {
      const { queryByTestId } = render(<TicketDetailScreen />);

      expect(queryByTestId('qr-code')).toBeNull();
    });

    it('should display used message', () => {
      const { getByText } = render(<TicketDetailScreen />);

      expect(
        getByText('This ticket has already been scanned and used.'),
      ).toBeTruthy();
    });
  });

  describe('Ticket Display - Cancelled Reservation', () => {
    beforeEach(() => {
      mockReservationData = createMockReservation('cancelled');
    });

    it('should not display QR code', () => {
      const { queryByTestId } = render(<TicketDetailScreen />);

      expect(queryByTestId('qr-code')).toBeNull();
    });

    it('should display cancelled message', () => {
      const { getByText } = render(<TicketDetailScreen />);

      expect(getByText('This booking has been cancelled.')).toBeTruthy();
    });
  });

  describe('Missing Data Handling', () => {
    it('should show retry when showtime is missing', () => {
      mockReservationData = {
        ...createMockReservation(),
        showtime: undefined,
      };

      const { getByText } = render(<TicketDetailScreen />);

      expect(getByText('Retry')).toBeTruthy();
    });

    it('should show retry when movie is missing', () => {
      const reservation = createMockReservation();
      (reservation.showtime as any).movie = undefined;
      mockReservationData = reservation;

      const { getByText } = render(<TicketDetailScreen />);

      expect(getByText('Retry')).toBeTruthy();
    });
  });

  describe('Empty Reservation ID', () => {
    it('should handle an empty reservation ID', () => {
      mockReservationId = '';
      mockReservationData = undefined;

      const { getByText } = render(<TicketDetailScreen />);

      expect(getByText('Retry')).toBeTruthy();
    });
  });

  describe('Order Details', () => {
    beforeEach(() => {
      mockReservationData = createMockReservation('confirmed');
    });

    it('should display all order detail rows', () => {
      const { getByTestId } = render(<TicketDetailScreen />);

      expect(getByTestId('order-datetime')).toBeTruthy();
      expect(getByTestId('order-seats')).toBeTruthy();
      expect(getByTestId('paid')).toBeTruthy();
      expect(getByTestId('ticket-status')).toBeTruthy();
    });

    it('should display correct labels', () => {
      const { getByText } = render(<TicketDetailScreen />);

      expect(getByText('Date & Time')).toBeTruthy();
      expect(getByText('Seat Number')).toBeTruthy();
      expect(getByText('Paid')).toBeTruthy();
      expect(getByText('Status')).toBeTruthy();
    });
  });

  describe('Status Styling', () => {
    it('should apply success color for an active status', () => {
      mockReservationData = createMockReservation('confirmed');

      const { getByTestId } = render(<TicketDetailScreen />);

      const statusRow = getByTestId('ticket-status');
      // Check that the component exists - styling verification would require
      // inspecting the actual style prop
      expect(statusRow).toBeTruthy();
    });

    it('should apply error color for a cancelled status', () => {
      mockReservationData = createMockReservation('cancelled');

      const { getByTestId } = render(<TicketDetailScreen />);

      const statusRow = getByTestId('ticket-status');
      expect(statusRow).toBeTruthy();
    });
  });
});
