import { fireEvent, render } from '@testing-library/react-native';

import MyTicketScreen from '../index';

// Types
import { ReservationStatus } from '@/features/booking/schemas/reservation';
import { ReservationWithShowtime } from '@/features/booking/services/reservations';

// Mock expo-router
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    push: (route: string) => mockPush(route),
  },
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
  formatIDR: (value: string | number) => `IDR ${value}`,
  formatMovieDuration: (minutes: number) =>
    `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
  formatShowtimeDate: (time?: string, date?: string) => {
    if (!time && !date) return '';
    return `${time || ''} ${date || ''}`.trim();
  },
}));

// Mock custom hooks
const mockFetchNextPage = jest.fn();
const mockRefetch = jest.fn();

let mockReservationsData:
  | {
      pages: {
        data: ReservationWithShowtime[];
        page: number;
        hasMore: boolean;
      }[];
    }
  | undefined;
let mockIsLoading = false;
let mockIsError = false;
let mockError: Error | null = null;
let mockIsFetchingNextPage = false;
let mockHasNextPage = false;
let mockIsRefetching = false;

jest.mock('@/features/booking/hooks/useReservations', () => ({
  useReservationsInfinite: () => ({
    data: mockReservationsData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    error: mockError,
    isFetchingNextPage: mockIsFetchingNextPage,
    hasNextPage: mockHasNextPage,
    fetchNextPage: mockFetchNextPage,
    refetch: mockRefetch,
    isRefetching: mockIsRefetching,
  }),
}));

// Mock constants
jest.mock('@/constants', () => ({
  ERROR_MESSAGES: {
    TICKET_NETWORK_ERROR:
      "We're having trouble loading tickets. Please try again later.",
  },
  MESSAGES: {
    NO_TICKETS: 'Start your movie journey by booking a ticket',
    NO_ACTIVE_TICKETS: 'Book a movie to see your active tickets here',
    NO_EXPIRED_TICKETS: 'Your expired and used tickets will appear here',
  },
  ROUTES: {
    HOME: '/(main)/home',
    TICKET_DETAILS: (id: string) => `/(main)/tickets/${id}`,
  },
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
  TABS_FOOTER_HEIGHT: 80,
  TICKET_TABS: [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'expired', label: 'Expired' },
  ],
}));

// Mock reservation data
const createMockReservation = (
  id: string,
  status: ReservationStatus = 'confirmed',
): ReservationWithShowtime => ({
  id,
  reservationNumber: `RSV-${id}`,
  showtimeId: 'showtime-1',
  status,
  totalSeats: 1,
  totalAmount: 50000,
  createdAt: '2025-01-01T00:00:00Z',
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
      title: `Test Movie ${id}`,
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

const page = (
  data: ReservationWithShowtime[],
  pageNumber = 1,
  hasMore = false,
) => ({ data, page: pageNumber, hasMore });

describe('MyTicketScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReservationsData = undefined;
    mockIsLoading = false;
    mockIsError = false;
    mockError = null;
    mockIsFetchingNextPage = false;
    mockHasNextPage = false;
    mockIsRefetching = false;
  });

  describe('Loading State', () => {
    it('should show skeleton cards when loading', () => {
      mockIsLoading = true;
      mockReservationsData = { pages: [] };

      const { getAllByTestId } = render(<MyTicketScreen />);

      const skeletons = getAllByTestId('horizontal-card-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render multiple skeleton cards when loading', () => {
      mockIsLoading = true;
      mockReservationsData = { pages: [] };

      const { getAllByTestId } = render(<MyTicketScreen />);

      const skeletons = getAllByTestId('horizontal-card-skeleton');
      expect(skeletons.length).toBe(3);
    });
  });

  describe('Error State', () => {
    it('should show error message when loading fails', () => {
      mockIsError = true;
      mockError = new Error('Network error');
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      expect(
        getByText(
          "We're having trouble loading tickets. Please try again later.",
        ),
      ).toBeTruthy();
      expect(getByText('Network error')).toBeTruthy();
    });

    it('should show retry button on error', () => {
      mockIsError = true;
      mockError = new Error('Network error');
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('Retry')).toBeTruthy();
    });

    it('should call refetch when retry button is pressed', () => {
      mockIsError = true;
      mockError = new Error('Network error');
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      fireEvent.press(getByText('Retry'));

      expect(mockRefetch).toHaveBeenCalled();
    });

    it('should show default error message when error has no message', () => {
      mockIsError = true;
      mockError = new Error('');
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('Please try again')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty message when no tickets', () => {
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('No tickets yet')).toBeTruthy();
      expect(
        getByText('Start your movie journey by booking a ticket'),
      ).toBeTruthy();
    });

    it('should show Book Now button when no tickets', () => {
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('Book Now')).toBeTruthy();
    });

    it('should navigate to home when Book Now is pressed', () => {
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      fireEvent.press(getByText('Book Now'));

      expect(mockPush).toHaveBeenCalledWith('/(main)/home');
    });

    it('should show active tickets empty message when active tab selected', () => {
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      // Switch to Active tab
      fireEvent.press(getByText('Active'));

      expect(getByText('No active tickets')).toBeTruthy();
      expect(
        getByText('Book a movie to see your active tickets here'),
      ).toBeTruthy();
    });

    it('should show expired tickets empty message when expired tab selected', () => {
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      // Switch to Expired tab
      fireEvent.press(getByText('Expired'));

      expect(getByText('No expired tickets')).toBeTruthy();
      expect(
        getByText('Your expired and used tickets will appear here'),
      ).toBeTruthy();
    });
  });

  describe('Ticket Display', () => {
    it('should display tickets when data is available', () => {
      const reservation = createMockReservation('1');
      mockReservationsData = { pages: [page([reservation])] };

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('Test Movie 1')).toBeTruthy();
    });

    it('should display multiple tickets', () => {
      const reservations = [
        createMockReservation('1'),
        createMockReservation('2'),
        createMockReservation('3'),
      ];
      mockReservationsData = { pages: [page(reservations)] };

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('Test Movie 1')).toBeTruthy();
      expect(getByText('Test Movie 2')).toBeTruthy();
      expect(getByText('Test Movie 3')).toBeTruthy();
    });

    it('should navigate to ticket details when ticket is pressed', () => {
      const reservation = createMockReservation('reservation-123');
      mockReservationsData = { pages: [page([reservation])] };

      const { getByText } = render(<MyTicketScreen />);

      fireEvent.press(getByText('Test Movie reservation-123'));

      expect(mockPush).toHaveBeenCalledWith('/(main)/tickets/reservation-123');
    });
  });

  describe('Tab Filtering', () => {
    it('should show all tickets by default', () => {
      const reservations = [
        createMockReservation('1', 'confirmed'),
        createMockReservation('2', 'completed'),
        createMockReservation('3', 'cancelled'),
      ];
      mockReservationsData = { pages: [page(reservations)] };

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('Test Movie 1')).toBeTruthy();
      expect(getByText('Test Movie 2')).toBeTruthy();
      expect(getByText('Test Movie 3')).toBeTruthy();
    });

    it('should filter active tickets when Active tab is selected', () => {
      const reservations = [
        createMockReservation('1', 'confirmed'),
        createMockReservation('2', 'completed'),
      ];
      mockReservationsData = { pages: [page(reservations)] };

      const { getByText, queryByText } = render(<MyTicketScreen />);

      // Switch to Active tab
      fireEvent.press(getByText('Active'));

      expect(getByText('Test Movie 1')).toBeTruthy();
      expect(queryByText('Test Movie 2')).toBeNull();
    });

    it('should filter expired tickets when Expired tab is selected', () => {
      const reservations = [
        createMockReservation('1', 'confirmed'),
        createMockReservation('2', 'completed'),
        createMockReservation('3', 'cancelled'),
      ];
      mockReservationsData = { pages: [page(reservations)] };

      const { getByText, queryByText } = render(<MyTicketScreen />);

      // Switch to Expired tab
      fireEvent.press(getByText('Expired'));

      expect(queryByText('Test Movie 1')).toBeNull();
      expect(getByText('Test Movie 2')).toBeTruthy();
      expect(getByText('Test Movie 3')).toBeTruthy();
    });

    it('should switch back to All tab', () => {
      const reservations = [
        createMockReservation('1', 'confirmed'),
        createMockReservation('2', 'completed'),
      ];
      mockReservationsData = { pages: [page(reservations)] };

      const { getByText } = render(<MyTicketScreen />);

      // Switch to Active tab
      fireEvent.press(getByText('Active'));
      // Switch back to All
      fireEvent.press(getByText('All'));

      expect(getByText('Test Movie 1')).toBeTruthy();
      expect(getByText('Test Movie 2')).toBeTruthy();
    });
  });

  describe('Pagination', () => {
    it('should call fetchNextPage when end is reached and hasNextPage', () => {
      const reservation = createMockReservation('1');
      mockReservationsData = { pages: [page([reservation])] };
      mockHasNextPage = true;

      const { getByLabelText } = render(<MyTicketScreen />);

      const list = getByLabelText(/Tickets list/);
      fireEvent(list, 'onEndReached');

      expect(mockFetchNextPage).toHaveBeenCalled();
    });

    it('should not call fetchNextPage when no next page', () => {
      const reservation = createMockReservation('1');
      mockReservationsData = { pages: [page([reservation])] };
      mockHasNextPage = false;

      const { getByLabelText } = render(<MyTicketScreen />);

      const list = getByLabelText(/Tickets list/);
      fireEvent(list, 'onEndReached');

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it('should not call fetchNextPage when already fetching', () => {
      const reservation = createMockReservation('1');
      mockReservationsData = { pages: [page([reservation])] };
      mockHasNextPage = true;
      mockIsFetchingNextPage = true;

      const { getByLabelText } = render(<MyTicketScreen />);

      const list = getByLabelText(/Tickets list/);
      fireEvent(list, 'onEndReached');

      expect(mockFetchNextPage).not.toHaveBeenCalled();
    });

    it('should show loading footer when fetching next page', () => {
      const reservation = createMockReservation('1');
      mockReservationsData = { pages: [page([reservation])] };
      mockIsFetchingNextPage = true;

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('Loading more tickets...')).toBeTruthy();
    });
  });

  describe('Pull to Refresh', () => {
    it('should call refetch on refresh', async () => {
      const reservation = createMockReservation('1');
      mockReservationsData = { pages: [page([reservation])] };

      const { getByLabelText } = render(<MyTicketScreen />);

      const list = getByLabelText(/Tickets list/);
      const refreshControl = list.props.refreshControl;

      await refreshControl.props.onRefresh();

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have accessibility label for screen', () => {
      mockReservationsData = { pages: [] };

      const { getByLabelText } = render(<MyTicketScreen />);

      expect(getByLabelText('My Ticket screen')).toBeTruthy();
    });

    it('should have accessibility label for tickets list', () => {
      const reservation = createMockReservation('1');
      mockReservationsData = { pages: [page([reservation])] };

      const { getByLabelText } = render(<MyTicketScreen />);

      expect(getByLabelText(/Tickets list showing 1 all tickets/)).toBeTruthy();
    });

    it('should update accessibility label based on filter', () => {
      const reservations = [
        createMockReservation('1', 'confirmed'),
        createMockReservation('2', 'confirmed'),
      ];
      mockReservationsData = { pages: [page(reservations)] };

      const { getByLabelText, getByText } = render(<MyTicketScreen />);

      // Switch to Active tab
      fireEvent.press(getByText('Active'));

      expect(
        getByLabelText(/Tickets list showing 2 active tickets/),
      ).toBeTruthy();
    });

    it('should have accessibility label for loading more', () => {
      const reservation = createMockReservation('1');
      mockReservationsData = { pages: [page([reservation])] };
      mockIsFetchingNextPage = true;

      const { getByLabelText } = render(<MyTicketScreen />);

      expect(getByLabelText('Loading more tickets')).toBeTruthy();
    });

    it('should have accessibility role for error state', () => {
      mockIsError = true;
      mockError = new Error('Error');
      mockReservationsData = { pages: [] };

      const { UNSAFE_queryAllByProps } = render(<MyTicketScreen />);

      const alertElements = UNSAFE_queryAllByProps({
        accessibilityRole: 'alert',
      });
      expect(alertElements.length).toBeGreaterThan(0);
    });

    it('should have accessibility label for retry button', () => {
      mockIsError = true;
      mockError = new Error('Error');
      mockReservationsData = { pages: [] };

      const { getByLabelText } = render(<MyTicketScreen />);

      expect(getByLabelText('Retry loading tickets')).toBeTruthy();
    });

    it('should have accessibility label for book now button', () => {
      mockReservationsData = { pages: [] };

      const { getByLabelText } = render(<MyTicketScreen />);

      expect(getByLabelText('Book a movie ticket')).toBeTruthy();
    });

    it('should have accessibility label for pull to refresh', () => {
      const reservation = createMockReservation('1');
      mockReservationsData = { pages: [page([reservation])] };

      const { getByLabelText } = render(<MyTicketScreen />);

      const list = getByLabelText(/Tickets list/);
      expect(list.props.refreshControl.props.accessibilityLabel).toBe(
        'Pull to refresh tickets',
      );
    });
  });

  describe('Tabs Display', () => {
    it('should render all tab options', () => {
      mockReservationsData = { pages: [] };

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('All')).toBeTruthy();
      expect(getByText('Active')).toBeTruthy();
      expect(getByText('Expired')).toBeTruthy();
    });
  });

  describe('Ticket with Missing Data', () => {
    it('should not render a reservation without a resolved showtime/movie', () => {
      const reservation = {
        ...createMockReservation('1'),
        showtime: undefined,
      };
      mockReservationsData = { pages: [page([reservation])] };

      const { queryByText } = render(<MyTicketScreen />);

      expect(queryByText('Test Movie 1')).toBeNull();
    });
  });

  describe('Multiple Pages', () => {
    it('should flatten multiple pages of tickets', () => {
      const page1 = [createMockReservation('1'), createMockReservation('2')];
      const page2 = [createMockReservation('3'), createMockReservation('4')];
      mockReservationsData = { pages: [page(page1), page(page2, 2, false)] };

      const { getByText } = render(<MyTicketScreen />);

      expect(getByText('Test Movie 1')).toBeTruthy();
      expect(getByText('Test Movie 2')).toBeTruthy();
      expect(getByText('Test Movie 3')).toBeTruthy();
      expect(getByText('Test Movie 4')).toBeTruthy();
    });
  });
});
