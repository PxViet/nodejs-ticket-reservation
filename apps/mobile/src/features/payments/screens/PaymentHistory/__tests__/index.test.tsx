import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import PaymentHistoryScreen from '../index';

// Constants
import { ROUTES } from '@/constants';

// Types
import type { PaymentWithShowtime } from '@/features/payments/schemas/payments';

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

// FlashList measures its viewport natively; a plain list renders every row.
jest.mock('@shopify/flash-list', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    FlashList: ({
      data,
      renderItem,
      keyExtractor,
      ListHeaderComponent,
      ListEmptyComponent,
      ListFooterComponent,
      onEndReached,
      accessibilityLabel,
    }: any) => (
      <View testID="payments-list" accessibilityLabel={accessibilityLabel}>
        <ListHeaderComponent />
        {data.length === 0 ? (
          <ListEmptyComponent />
        ) : (
          data.map((item: any) => (
            <View key={keyExtractor(item)}>{renderItem({ item })}</View>
          ))
        )}
        <ListFooterComponent />
        <View testID="end-reached" onTouchEnd={onEndReached} />
      </View>
    ),
  };
});

jest.mock('@/icons/MovieTopUpIcon', () => ({ MovieTopUpIcon: () => null }));

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRefetch = jest.fn();
const mockFetchNextPage = jest.fn();

type HistoryState = {
  data?: { pages: { data: PaymentWithShowtime[] }[] };
  isLoading: boolean;
  isError: boolean;
  error?: Error | null;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
};

let mockHistory: HistoryState;

jest.mock('@/features/payments/hooks/usePayments', () => ({
  usePaymentsInfinite: () => ({
    ...mockHistory,
    refetch: mockRefetch,
    fetchNextPage: mockFetchNextPage,
    isRefetching: false,
  }),
}));

const PAID = {
  id: 'pay-1',
  status: 'succeeded',
  amountCents: 1700,
  currency: 'usd',
  cardBrand: 'visa',
  cardLast4: '4242',
  showtimeId: 'st-1',
  seatCount: 2,
  reservationId: 'res-1',
  reservationNumber: 'RSV-20260926-ABC123',
  createdAt: '2026-09-26T10:00:00.000Z',
  showtime: { movie: { title: 'Dune: Part Two' } },
} as PaymentWithShowtime;

const withPayments = (payments: PaymentWithShowtime[], hasNextPage = false) => {
  mockHistory = {
    data: { pages: [{ data: payments }] },
    isLoading: false,
    isError: false,
    isFetchingNextPage: false,
    hasNextPage,
  };
};

describe('PaymentHistoryScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    withPayments([PAID]);
  });

  it('lists the customer’s payments in dollars', () => {
    const { getByText } = render(<PaymentHistoryScreen />);

    expect(getByText('Recent Payments')).toBeTruthy();
    expect(getByText('Dune: Part Two')).toBeTruthy();
    expect(getByText('-$17.00')).toBeTruthy();
  });

  it('opens the ticket for a paid payment', () => {
    const { getByTestId } = render(<PaymentHistoryScreen />);

    fireEvent.press(getByTestId('payment-pay-1'));

    expect(mockPush).toHaveBeenCalledWith(ROUTES.TICKET_DETAILS('res-1'));
  });

  it('shows skeletons while the first page loads', () => {
    mockHistory = {
      isLoading: true,
      isError: false,
      isFetchingNextPage: false,
      hasNextPage: false,
    };

    const { getByTestId } = render(<PaymentHistoryScreen />);

    expect(getByTestId('payments-loading')).toBeTruthy();
  });

  it('offers a retry when the history fails to load', () => {
    mockHistory = {
      isLoading: false,
      isError: true,
      error: new Error('Could not load your payments.'),
      isFetchingNextPage: false,
      hasNextPage: false,
    };

    const { getByText, getByLabelText } = render(<PaymentHistoryScreen />);

    expect(getByText('Could not load your payments.')).toBeTruthy();
    fireEvent.press(getByLabelText('Retry loading payments'));
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('points a customer with no payments at the movies', () => {
    withPayments([]);

    const { getByText, getByLabelText } = render(<PaymentHistoryScreen />);

    expect(getByText('No payments yet')).toBeTruthy();
    fireEvent.press(getByLabelText('Browse movies'));
    expect(mockPush).toHaveBeenCalledWith(ROUTES.HOME);
  });

  it('loads the next page only while there is one', () => {
    withPayments([PAID], true);
    const { getByTestId, rerender } = render(<PaymentHistoryScreen />);

    fireEvent(getByTestId('end-reached'), 'touchEnd');
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);

    withPayments([PAID], false);
    rerender(<PaymentHistoryScreen />);
    fireEvent(getByTestId('end-reached'), 'touchEnd');
    expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
  });
});
