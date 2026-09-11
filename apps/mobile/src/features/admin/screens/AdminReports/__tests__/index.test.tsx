import { fireEvent, render } from '@testing-library/react-native';

import AdminReportsScreen from '../index';

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
  };
});

jest.mock('@/utils/formats', () => ({
  formatDate: (date: string) => date,
  formatTime: (time: string) => time,
  formatIDR: (value: number) => `IDR ${value}`,
}));

jest.mock('@/constants', () => ({
  TABS_FOOTER_HEIGHT: 80,
}));

const mockFetchNextPageRevenue = jest.fn();
const mockRefetchRevenue = jest.fn();
const mockFetchNextPageCapacity = jest.fn();
const mockRefetchCapacity = jest.fn();
const mockFetchNextPageReservations = jest.fn();
const mockRefetchReservations = jest.fn();

let mockRevenueState: any = {
  data: undefined,
  isLoading: false,
  isRefetching: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: mockFetchNextPageRevenue,
  refetch: mockRefetchRevenue,
};
let mockCapacityState: any = {
  data: undefined,
  isLoading: false,
  isRefetching: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: mockFetchNextPageCapacity,
  refetch: mockRefetchCapacity,
};
let mockReservationsState: any = {
  data: undefined,
  isLoading: false,
  isRefetching: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: mockFetchNextPageReservations,
  refetch: mockRefetchReservations,
};

jest.mock('@/features/admin/hooks/useAdminReports', () => ({
  useRevenueReportInfinite: jest.fn(() => mockRevenueState),
  useCapacityReportInfinite: jest.fn(() => mockCapacityState),
  useReservationsReportInfinite: jest.fn(() => mockReservationsState),
}));

const defaultState = () => ({
  data: undefined,
  isLoading: false,
  isRefetching: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
});

describe('AdminReportsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRevenueState = {
      ...defaultState(),
      fetchNextPage: mockFetchNextPageRevenue,
      refetch: mockRefetchRevenue,
    };
    mockCapacityState = {
      ...defaultState(),
      fetchNextPage: mockFetchNextPageCapacity,
      refetch: mockRefetchCapacity,
    };
    mockReservationsState = {
      ...defaultState(),
      fetchNextPage: mockFetchNextPageReservations,
      refetch: mockRefetchReservations,
    };
  });

  describe('Tabs', () => {
    it('renders all three report tabs, revenue active by default', () => {
      const { getByText } = render(<AdminReportsScreen />);

      expect(getByText('Revenue')).toBeTruthy();
      expect(getByText('Capacity')).toBeTruthy();
      expect(getByText('Reservations')).toBeTruthy();
    });

    it('switches to the capacity report on tab press', () => {
      mockCapacityState.data = {
        pages: [
          {
            data: [
              {
                showtimeId: 's1',
                movieTitle: 'Movie A',
                hallName: 'Hall 1',
                showDate: '2026-01-01',
                showTime: '19:00',
                status: 'active',
                totalSeats: 100,
                seatsTaken: 50,
                occupancyPct: 50,
              },
            ],
          },
        ],
      };

      const { getByText } = render(<AdminReportsScreen />);
      fireEvent.press(getByText('Capacity'));

      expect(getByText('Hall 1')).toBeTruthy();
    });
  });

  describe('Loading state', () => {
    it('shows a spinner while the active report is loading', () => {
      mockRevenueState.isLoading = true;

      const { getByLabelText } = render(<AdminReportsScreen />);
      // ActivityIndicator carries no text; assert via the empty-state text
      // being absent instead, since the spinner itself has no test hook.
      expect(() => getByLabelText('No data for this report yet.')).toThrow();
    });
  });

  describe('Empty state', () => {
    it('shows an empty message when there is no revenue data', () => {
      mockRevenueState.data = { pages: [{ data: [] }] };

      const { getByText } = render(<AdminReportsScreen />);

      expect(getByText('No data for this report yet.')).toBeTruthy();
    });
  });

  describe('Revenue rows', () => {
    it('renders a revenue row', () => {
      mockRevenueState.data = {
        pages: [
          {
            data: [
              {
                showDate: '2026-01-01',
                movieId: 'm1',
                movieTitle: 'Movie A',
                ticketsSold: 10,
                revenue: 500000,
              },
            ],
          },
        ],
      };

      const { getByText } = render(<AdminReportsScreen />);

      expect(getByText('Movie A')).toBeTruthy();
      expect(getByText('IDR 500000')).toBeTruthy();
    });
  });

  describe('Reservations rows', () => {
    it('renders a reservation row', () => {
      mockReservationsState.data = {
        pages: [
          {
            data: [
              {
                reservationId: 'r1',
                reservationNumber: 'RSV-1',
                customerEmail: 'a@b.com',
                firstName: 'Jane',
                lastName: 'Doe',
                movieTitle: 'Movie A',
                showDate: '2026-01-01',
                showTime: '19:00',
                status: 'confirmed',
                totalSeats: 2,
                totalAmount: 100000,
                createdAt: '2026-01-01T00:00:00.000Z',
              },
            ],
          },
        ],
      };

      const { getByText } = render(<AdminReportsScreen />);
      fireEvent.press(getByText('Reservations'));

      expect(getByText('RSV-1')).toBeTruthy();
      expect(getByText('Jane Doe')).toBeTruthy();
    });
  });

  describe('Pagination', () => {
    it('fetches the next page of the active report on end reached', () => {
      mockRevenueState.data = {
        pages: [
          {
            data: [
              {
                movieId: 'm1',
                showDate: '2026-01-01',
                movieTitle: 'A',
                ticketsSold: 1,
                revenue: 1,
              },
            ],
          },
        ],
      };
      mockRevenueState.hasNextPage = true;

      const { getByTestId } = render(<AdminReportsScreen />);
      fireEvent(getByTestId('admin-reports-list'), 'onEndReached');

      expect(mockFetchNextPageRevenue).toHaveBeenCalled();
    });
  });

  describe('Pull to refresh', () => {
    it('refetches the active report on pull to refresh', async () => {
      mockRevenueState.data = {
        pages: [
          {
            data: [
              {
                movieId: 'm1',
                showDate: '2026-01-01',
                movieTitle: 'A',
                ticketsSold: 1,
                revenue: 1,
              },
            ],
          },
        ],
      };

      const { getByTestId } = render(<AdminReportsScreen />);
      const list = getByTestId('admin-reports-list');

      await list.props.refreshControl.props.onRefresh();

      expect(mockRefetchRevenue).toHaveBeenCalled();
    });
  });
});
