import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import MyWalletScreen from '../index';

// Constants
import { ROUTES } from '@/constants';
import { GENRE_MOVIE } from '@/constants/movie';
import {
  BOOKING_STATUS,
  MOVIE_STATUS,
  PAYMENT_STATUS,
  SHOWTIME_STATUS,
  WALLET_TRANSACTION_STATUS,
  WALLET_TRANSACTION_TYPE,
} from '@/constants/status';

// Types
import { Wallet, WalletTransaction } from '@/features/wallet/schemas/wallet';
import { Booking } from '@/features/booking/schemas/booking';

// Mock expo-image with ImageBackground
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: View,
    ImageBackground: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
  };
});

// Mock dependencies
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  Href: {},
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock data
const mockWallet: Wallet = {
  id: 'wallet1',
  userId: 'user1',
  balance: 500000,
  currency: 'IDR',
  cardNumber: '6032 1506 4207 2004',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockProfile = {
  id: 'user1',
  fullName: 'John Doe',
  email: 'john@example.com',
};

const mockTransactions: WalletTransaction[] = [
  {
    id: 'tx1',
    walletId: 'wallet1',
    transactionType: WALLET_TRANSACTION_TYPE.PAYMENT,
    amount: 100000,
    balanceBefore: 400000,
    balanceAfter: 500000,
    description: 'Top up wallet',
    status: WALLET_TRANSACTION_STATUS.COMPLETED,
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'tx2',
    walletId: 'wallet1',
    transactionType: WALLET_TRANSACTION_TYPE.PAYMENT,
    amount: 50000,
    balanceBefore: 500000,
    balanceAfter: 450000,
    description: 'Movie ticket purchase',
    status: WALLET_TRANSACTION_STATUS.COMPLETED,
    createdAt: '2024-01-02T00:00:00Z',
    booking: {
      id: 'booking1',
      userId: 'user1',
      showtimeId: 'showtime1',
      totalAmount: 50000,
      bookingNumber: '1234567890',
      totalSeats: 1,
      seatNumbers: ['A1'],
      subtotal: 50000,
      discountAmount: 0,
      paymentMethod: 'credit_card',
      paymentStatus: PAYMENT_STATUS.PAID,
      bookingStatus: BOOKING_STATUS.ACTIVE,
      expiresAt: '2024-01-02T12:00:00Z',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      showtime: {
        id: 'showtime1',
        movieId: 'movie1',
        cinemaHallId: 'hall1',
        showDate: '2024-01-02',
        showTime: '14:00',
        endTime: '16:00',
        price: 50000,
        availableSeats: 100,
        status: SHOWTIME_STATUS.ACTIVE,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        movie: {
          id: 'movie1',
          title: 'Test Movie',
          posterUrl: 'https://example.com/poster.jpg',
          synopsis: 'Test synopsis',
          trailerUrl: ['https://example.com/trailer.mp4'],
          durationMinutes: 120,
          releaseDate: '2024-01-01',
          status: MOVIE_STATUS.NOW_PLAYING,
          rating: 4.5,
          genre: [GENRE_MOVIE.ACTION, GENRE_MOVIE.DRAMA],
          castCrew: {
            actors: [],
            directors: [],
            producers: [],
            writers: [],
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        cinemaHall: {
          id: 'hall1',
          cinemaId: 'cinema1',
          name: 'Hall 1',
          seatLayout: [],
          totalSeats: 100,
          cinema: {
            id: 'cinema1',
            name: 'Cinema One',
            city: 'Jakarta',
            location: 'Jakarta',
            address: '123 Main St',
            isActive: true,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
          hallType: 'VIP',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      },
    } as unknown as Booking,
  },
];

// Mock hooks state
let mockWalletData: Wallet | undefined = mockWallet;
let mockIsLoadingWallet = false;
let mockIsWalletError = false;
let mockTransactionsData: { pages: WalletTransaction[][] } | undefined = {
  pages: [mockTransactions],
};
let mockIsLoadingTransactions = false;
let mockIsTransactionsError = false;
let mockTransactionsError: Error | null = null;
let mockIsFetchingNextPage = false;
let mockHasNextPage = false;
let mockIsRefetching = false;
let mockIsLoadingProfile = false;

const mockRefetchWallet = jest.fn();
const mockRefetchTransactions = jest.fn();
const mockFetchNextPage = jest.fn();

jest.mock('@/features/wallet/hooks/useWallet', () => ({
  useWallet: () => ({
    data: mockWalletData,
    isLoading: mockIsLoadingWallet,
    isError: mockIsWalletError,
    refetch: mockRefetchWallet,
  }),
  useTransactionsInfinite: () => ({
    data: mockTransactionsData,
    isLoading: mockIsLoadingTransactions,
    isError: mockIsTransactionsError,
    error: mockTransactionsError,
    isFetchingNextPage: mockIsFetchingNextPage,
    hasNextPage: mockHasNextPage,
    fetchNextPage: mockFetchNextPage,
    refetch: mockRefetchTransactions,
    isRefetching: mockIsRefetching,
  }),
}));

jest.mock('@/features/setting/hooks/useProfile', () => ({
  useProfile: () => ({
    data: mockProfile,
    isLoading: mockIsLoadingProfile,
  }),
}));

// Reset mocks before each test
const resetMocks = () => {
  mockWalletData = mockWallet;
  mockIsLoadingWallet = false;
  mockIsWalletError = false;
  mockTransactionsData = { pages: [mockTransactions] };
  mockIsLoadingTransactions = false;
  mockIsTransactionsError = false;
  mockTransactionsError = null;
  mockIsFetchingNextPage = false;
  mockHasNextPage = false;
  mockIsRefetching = false;
  mockIsLoadingProfile = false;
};

describe('MyWalletScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  describe('Loading State', () => {
    it('should show wallet card skeleton when wallet is loading', () => {
      mockIsLoadingWallet = true;
      mockWalletData = undefined;

      const { getByTestId } = render(<MyWalletScreen />);

      expect(getByTestId('wallet-card-skeleton')).toBeTruthy();
    });

    it('should show wallet card skeleton when profile is loading', () => {
      mockIsLoadingProfile = true;

      const { getByTestId } = render(<MyWalletScreen />);

      expect(getByTestId('wallet-card-skeleton')).toBeTruthy();
    });

    it('should show transaction skeletons when transactions are loading', () => {
      mockIsLoadingTransactions = true;
      mockTransactionsData = { pages: [] };

      const { getAllByTestId } = render(<MyWalletScreen />);

      const skeletons = getAllByTestId('horizontal-card-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show both wallet and transaction skeletons when all are loading', () => {
      mockIsLoadingWallet = true;
      mockIsLoadingTransactions = true;
      mockWalletData = undefined;
      mockTransactionsData = { pages: [] };

      const { getByTestId, getAllByTestId } = render(<MyWalletScreen />);

      expect(getByTestId('wallet-card-skeleton')).toBeTruthy();
      const skeletons = getAllByTestId('horizontal-card-skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Wallet Card', () => {
    it('should render wallet card with correct data', () => {
      const { getByTestId, getByText } = render(<MyWalletScreen />);

      expect(getByTestId('wallet-card')).toBeTruthy();
      expect(getByTestId('wallet-card-name')).toBeTruthy();
      expect(getByTestId('wallet-card-number')).toBeTruthy();
      expect(getByTestId('wallet-balance')).toBeTruthy();
      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should navigate to top up when wallet card is pressed', () => {
      const { getByTestId } = render(<MyWalletScreen />);

      const walletCard = getByTestId('wallet-card');
      fireEvent.press(walletCard);

      expect(mockPush).toHaveBeenCalledWith(ROUTES.TOP_UP);
    });

    it('should show retry button when wallet has error', () => {
      mockIsWalletError = true;

      const { getByText } = render(<MyWalletScreen />);

      expect(getByText('Retry')).toBeTruthy();
    });

    it('should call refetchWallet when retry button is pressed', () => {
      mockIsWalletError = true;

      const { getByText } = render(<MyWalletScreen />);

      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);

      expect(mockRefetchWallet).toHaveBeenCalled();
    });

    it('should render wallet card name', () => {
      const { getByTestId } = render(<MyWalletScreen />);
      expect(getByTestId('wallet-card-name')).toBeTruthy();
    });
  });

  describe('Transactions', () => {
    it('should render transaction list header', () => {
      const { getByText } = render(<MyWalletScreen />);

      expect(getByText('Recent Transactions')).toBeTruthy();
    });

    it('should render transaction items', () => {
      const { getAllByTestId, getByTestId } = render(<MyWalletScreen />);

      // First transaction without booking should render as Transaction component
      expect(getAllByTestId('transaction').length).toBeGreaterThan(0);
      // Second transaction with booking should render as HorizontalCard
      expect(getByTestId('horizontal-card')).toBeTruthy();
    });

    it('should render movie card for transactions with booking', () => {
      const { getByText } = render(<MyWalletScreen />);

      expect(getByText('Test Movie')).toBeTruthy();
      expect(getByText('Cinema One')).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no transactions', () => {
      mockTransactionsData = { pages: [[]] };

      const { getByText } = render(<MyWalletScreen />);

      expect(getByText('No transactions yet')).toBeTruthy();
      expect(
        getByText('Top up your wallet to start booking tickets'),
      ).toBeTruthy();
    });

    it('should render Book Now button in empty state', () => {
      mockTransactionsData = { pages: [[]] };

      const { getByText } = render(<MyWalletScreen />);

      expect(getByText('Book Now')).toBeTruthy();
    });

    it('should navigate to top up when Book Now is pressed', () => {
      mockTransactionsData = { pages: [[]] };

      const { getByText } = render(<MyWalletScreen />);

      const bookNowButton = getByText('Book Now');
      fireEvent.press(bookNowButton);

      expect(mockPush).toHaveBeenCalledWith(ROUTES.TOP_UP);
    });
  });

  describe('Error State', () => {
    it('should show error state when transactions fail to load', () => {
      mockTransactionsData = { pages: [[]] };
      mockIsTransactionsError = true;
      mockTransactionsError = new Error('Network error');

      const { getByText } = render(<MyWalletScreen />);

      expect(getByText('Failed to load transactions')).toBeTruthy();
      expect(getByText('Network error')).toBeTruthy();
    });

    it('should show default error message when no error message', () => {
      mockTransactionsData = { pages: [[]] };
      mockIsTransactionsError = true;
      mockTransactionsError = null;

      const { getByText } = render(<MyWalletScreen />);

      expect(getByText('Please try again')).toBeTruthy();
    });

    it('should call refetch when retry button is pressed in error state', () => {
      mockTransactionsData = { pages: [[]] };
      mockIsTransactionsError = true;

      const { getAllByText } = render(<MyWalletScreen />);

      const retryButtons = getAllByText('Retry');
      // Find the retry button in the error state
      fireEvent.press(retryButtons[retryButtons.length - 1]!);

      expect(mockRefetchTransactions).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('should show footer loading when fetching next page', () => {
      mockIsFetchingNextPage = true;

      const { getByText, UNSAFE_getAllByType } = render(<MyWalletScreen />);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ActivityIndicator } = require('react-native');

      const indicators = UNSAFE_getAllByType(ActivityIndicator);
      expect(indicators.length).toBeGreaterThan(0);
      expect(getByText('Loading more transactions...')).toBeTruthy();
    });
  });

  describe('Refresh Control', () => {
    it('should refresh wallet and transactions when pulled to refresh', async () => {
      mockRefetchWallet.mockResolvedValue({});
      mockRefetchTransactions.mockResolvedValue({});

      const { UNSAFE_getByType } = render(<MyWalletScreen />);
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { RefreshControl } = require('react-native');

      const refreshControl = UNSAFE_getByType(RefreshControl);
      await refreshControl.props.onRefresh();

      await waitFor(() => {
        expect(mockRefetchWallet).toHaveBeenCalled();
        expect(mockRefetchTransactions).toHaveBeenCalled();
      });
    });
  });

  describe('Floating Top Up Button', () => {
    it('should render floating top up button', () => {
      const { getByTestId } = render(<MyWalletScreen />);

      expect(getByTestId('wallet-icon')).toBeTruthy();
    });

    it('should navigate to top up when floating button is pressed', () => {
      const { getByTestId } = render(<MyWalletScreen />);

      const topUpIcon = getByTestId('wallet-icon');
      const topUpButton = topUpIcon.parent;
      if (topUpButton) {
        fireEvent.press(topUpButton);
      }

      expect(mockPush).toHaveBeenCalledWith(ROUTES.TOP_UP);
    });
  });

  describe('Accessibility', () => {
    it('should have accessibility label for wallet card', () => {
      const { getByTestId } = render(<MyWalletScreen />);

      const walletCard = getByTestId('wallet-card');
      expect(walletCard.props.accessibilityLabel).toBe(
        'Wallet balance 500000 IDR',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle transaction without booking showtime', () => {
      mockTransactionsData = {
        pages: [
          [
            {
              id: 'tx1',
              walletId: 'wallet1',
              transactionType: WALLET_TRANSACTION_TYPE.PAYMENT,
              amount: 50000,
              balanceBefore: 100000,
              balanceAfter: 50000,
              description: 'Payment',
              status: WALLET_TRANSACTION_STATUS.COMPLETED,
              createdAt: '2024-01-01T00:00:00Z',
              booking: {
                id: 'booking1',
                userId: 'user1',
                showtimeId: 'showtime1',
                totalSeats: 1,
                seatNumbers: ['A1'],
                subtotal: 50000,
                bookingNumber: '1234567890',
                discountAmount: 0,
                paymentMethod: 'credit_card',
                paymentStatus: PAYMENT_STATUS.PAID,
                bookingStatus: BOOKING_STATUS.ACTIVE,
                totalAmount: 50000,
                expiresAt: '2024-01-02T12:00:00Z',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
                showtime: {
                  id: 'showtime1',
                  movieId: 'movie1',
                  cinemaHallId: 'hall1',
                  showDate: '2024-01-02',
                  showTime: '14:00',
                  endTime: '16:00',
                  price: 50000,
                  availableSeats: 100,
                  status: SHOWTIME_STATUS.ACTIVE,
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-01T00:00:00Z',
                },
              } as unknown as Booking,
            },
          ],
        ],
      };
    });
    mockTransactionsData = { pages: [mockTransactions] };
    mockIsLoadingTransactions = false;
    mockIsTransactionsError = false;
    mockTransactionsError = null;
    it('should handle empty pages array', () => {
      mockTransactionsData = { pages: [] };

      const { getByText } = render(<MyWalletScreen />);

      expect(getByText('No transactions yet')).toBeTruthy();
    });
  });
});
