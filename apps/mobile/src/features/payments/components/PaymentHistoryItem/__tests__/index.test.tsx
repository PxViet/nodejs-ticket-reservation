import { fireEvent, render } from '@testing-library/react-native';

import { PaymentHistoryItem } from '../index';

// Types
import type { PaymentWithShowtime } from '@/features/payments/schemas/payments';

jest.mock('@/icons/MovieTopUpIcon', () => ({ MovieTopUpIcon: () => null }));

const payment = (
  overrides: Partial<PaymentWithShowtime> = {},
): PaymentWithShowtime =>
  ({
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
    ...overrides,
  }) as PaymentWithShowtime;

describe('PaymentHistoryItem', () => {
  it('shows the movie, the dollar amount and the card charged', () => {
    const { getByTestId } = render(<PaymentHistoryItem payment={payment()} />);

    expect(getByTestId('payment-title')).toHaveTextContent('Dune: Part Two');
    expect(getByTestId('payment-amount')).toHaveTextContent('-$17.00');
    expect(getByTestId('payment-details')).toHaveTextContent(
      '2 seats · Visa •••• 4242',
    );
    expect(getByTestId('payment-reservation')).toHaveTextContent(
      'RSV-20260926-ABC123',
    );
    expect(getByTestId('payment-status')).toHaveTextContent('Paid');
  });

  it('falls back to a generic title when the showtime could not be loaded', () => {
    const { getByTestId } = render(
      <PaymentHistoryItem payment={payment({ showtime: undefined })} />,
    );

    expect(getByTestId('payment-title')).toHaveTextContent('Movie ticket');
  });

  it.each([
    ['pending', 'Processing'],
    ['failed', 'Failed'],
    ['refunded', 'Refunded'],
  ] as const)('labels a %s payment as %s', (status, label) => {
    const { getByTestId } = render(
      <PaymentHistoryItem payment={payment({ status })} />,
    );

    expect(getByTestId('payment-status')).toHaveTextContent(label);
    // Nothing was taken, so no minus sign.
    expect(getByTestId('payment-amount')).toHaveTextContent('$17.00');
  });

  it('shows why a payment failed', () => {
    const { getByTestId } = render(
      <PaymentHistoryItem
        payment={payment({
          status: 'failed',
          reservationId: undefined,
          reservationNumber: undefined,
          failureMessage: 'Your card was declined.',
        })}
      />,
    );

    expect(getByTestId('payment-failure')).toHaveTextContent(
      'Your card was declined.',
    );
  });

  it('opens a paid payment', () => {
    const onPress = jest.fn();
    const paid = payment();
    const { getByTestId } = render(
      <PaymentHistoryItem payment={paid} onPress={onPress} />,
    );

    fireEvent.press(getByTestId('payment-pay-1'));

    expect(onPress).toHaveBeenCalledWith(paid);
  });

  it('does not open a payment that has no ticket', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PaymentHistoryItem
        payment={payment({ status: 'failed' })}
        onPress={onPress}
      />,
    );

    fireEvent.press(getByTestId('payment-pay-1'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
