// Effect
import { Effect } from 'effect';

// Stripe
import {
  handleNextAction,
  initPaymentSheet,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';

// HTTP
import { ApiError, apiRequest } from '@/services/api/client';

// Utils
import { runEffectForQuery } from '@/utils/effect';

// Error
import {
  isAddCardCanceled,
  PaymentsError,
} from '@/features/payments/error/payments';

// Services
import { showtimesServiceEffect } from '@/features/booking/services/showtimes';
import { PaymentsServiceEffect, paymentsServiceEffect } from '../payments';

jest.mock('@/services/api/client', () => ({
  ...jest.requireActual('@/services/api/client'),
  apiRequest: jest.fn(),
}));

jest.mock('@/features/booking/services/showtimes', () => ({
  showtimesServiceEffect: { getShowtimeById: jest.fn() },
}));

// Poll without waiting so the settle tests run in real time.
jest.mock('@/constants', () => ({
  ...jest.requireActual('@/constants'),
  CHECKOUT_POLL_INTERVAL_MS: 0,
  CHECKOUT_POLL_ATTEMPTS: 3,
}));

const mockApiRequest = apiRequest as jest.Mock;
const mockInitPaymentSheet = initPaymentSheet as jest.Mock;
const mockPresentPaymentSheet = presentPaymentSheet as jest.Mock;
const mockHandleNextAction = handleNextAction as jest.Mock;
const mockGetShowtimeById = showtimesServiceEffect.getShowtimeById as jest.Mock;

const apiPage = (items: unknown[], page = 1, hasMore = false) => ({
  data: items,
  meta: { page, limit: 20, total: items.length, hasMore },
});

const payment = (
  status: 'pending' | 'succeeded' | 'failed' | 'refunded',
  extra = {},
) => ({
  id: 'pay-1',
  status,
  amountCents: 1700,
  currency: 'usd',
  showtimeId: 'st-1',
  seatCount: 2,
  createdAt: '2026-09-26T00:00:00.000Z',
  ...(status === 'succeeded' ? { reservationId: 'res-1' } : {}),
  ...extra,
});

const RESERVATION = { id: 'res-1', status: 'confirmed', tickets: [] };

const SETUP_INTENT = {
  setupIntentClientSecret: 'seti_1_secret',
  ephemeralKeySecret: 'ek_1',
  customerId: 'cus_1',
  publishableKey: 'pk_test_1',
};

const request = { holdIds: ['hold-1', 'hold-2'], paymentMethodId: 'pm_123' };

const failureOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    return error as PaymentsError;
  }
  throw new Error('expected the effect to fail');
};

describe('PaymentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitPaymentSheet.mockResolvedValue({});
    mockPresentPaymentSheet.mockResolvedValue({});
  });

  it('should be a singleton', () => {
    expect(PaymentsServiceEffect.getInstance()).toBe(paymentsServiceEffect);
  });

  describe('getPaymentMethods', () => {
    it('lists the caller’s saved cards with auth', async () => {
      const card = { id: 'pm_1', brand: 'visa', last4: '4242' };
      mockApiRequest.mockResolvedValue(apiPage([card]));

      const result = await runEffectForQuery(
        paymentsServiceEffect.getPaymentMethods(),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/payment-methods?limit=20', {
        auth: true,
      });
      expect(result).toEqual([card]);
    });

    it('carries the API errorCode onto the tagged error', async () => {
      mockApiRequest.mockRejectedValue(
        new ApiError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'Stripe is down'),
      );

      const error = await failureOf(
        runEffectForQuery(paymentsServiceEffect.getPaymentMethods()),
      );

      expect(error.code).toBe('PAYMENT_PROVIDER_UNAVAILABLE');
      expect(error.message).toBe('Stripe is down');
    });
  });

  describe('getPayments', () => {
    it('pages the history and enriches each row with its showtime once', async () => {
      const showtime = { id: 'st-1', movie: { title: 'Dune' } };
      mockApiRequest.mockResolvedValue(
        apiPage(
          [payment('succeeded'), payment('failed', { id: 'pay-2' })],
          2,
          true,
        ),
      );
      mockGetShowtimeById.mockReturnValue(Effect.succeed(showtime));

      const result = await runEffectForQuery(
        paymentsServiceEffect.getPayments(2),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/payments?page=2&limit=20', {
        auth: true,
      });
      expect(mockGetShowtimeById).toHaveBeenCalledTimes(1);
      expect(result.page).toBe(2);
      expect(result.hasMore).toBe(true);
      expect(result.data.map(row => row.showtime)).toEqual([
        showtime,
        showtime,
      ]);
    });

    it('keeps the row when its showtime cannot be loaded', async () => {
      mockApiRequest.mockResolvedValue(apiPage([payment('succeeded')]));
      mockGetShowtimeById.mockReturnValue(Effect.fail(new Error('gone')));

      const result = await runEffectForQuery(
        paymentsServiceEffect.getPayments(),
      );

      expect(result.data[0]?.showtime).toBeUndefined();
    });
  });

  describe('addCard', () => {
    it('opens PaymentSheet in setup mode with the API’s intent', async () => {
      mockApiRequest.mockResolvedValue(SETUP_INTENT);

      await runEffectForQuery(paymentsServiceEffect.addCard());

      expect(mockApiRequest).toHaveBeenCalledWith(
        '/payment-methods/setup-intent',
        { method: 'POST', auth: true },
      );
      expect(mockInitPaymentSheet).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 'cus_1',
          customerEphemeralKeySecret: 'ek_1',
          setupIntentClientSecret: 'seti_1_secret',
        }),
      );
      expect(mockPresentPaymentSheet).toHaveBeenCalled();
    });

    it('reports a closed sheet as a cancel, not a failure', async () => {
      mockApiRequest.mockResolvedValue(SETUP_INTENT);
      mockPresentPaymentSheet.mockResolvedValue({
        error: { code: 'Canceled', message: 'The payment flow was canceled' },
      });

      const error = await failureOf(
        runEffectForQuery(paymentsServiceEffect.addCard()),
      );

      expect(isAddCardCanceled(error)).toBe(true);
    });

    it('fails with Stripe’s message when the sheet cannot start', async () => {
      mockApiRequest.mockResolvedValue(SETUP_INTENT);
      mockInitPaymentSheet.mockResolvedValue({
        error: { code: 'Failed', message: 'Invalid ephemeral key' },
      });

      const error = await failureOf(
        runEffectForQuery(paymentsServiceEffect.addCard()),
      );

      expect(error.message).toBe('Invalid ephemeral key');
      expect(isAddCardCanceled(error)).toBe(false);
      expect(mockPresentPaymentSheet).not.toHaveBeenCalled();
    });
  });

  describe('checkout', () => {
    it('returns the reservation when the card is charged at once', async () => {
      mockApiRequest.mockResolvedValue({
        status: 'succeeded',
        paymentId: 'pay-1',
        reservation: RESERVATION,
      });

      const result = await runEffectForQuery(
        paymentsServiceEffect.checkout(request),
      );

      expect(mockApiRequest).toHaveBeenCalledWith('/reservations/checkout', {
        method: 'POST',
        body: request,
        auth: true,
      });
      expect(result).toEqual({
        status: 'succeeded',
        paymentId: 'pay-1',
        reservation: RESERVATION,
      });
      expect(mockHandleNextAction).not.toHaveBeenCalled();
    });

    it('runs 3-D Secure, then polls until the payment settles', async () => {
      mockApiRequest
        .mockResolvedValueOnce({
          status: 'requires_action',
          paymentId: 'pay-1',
          clientSecret: 'pi_1_secret',
        })
        .mockResolvedValueOnce(payment('pending'))
        .mockResolvedValueOnce(payment('succeeded'))
        .mockResolvedValueOnce(RESERVATION);
      mockHandleNextAction.mockResolvedValue({ paymentIntent: {} });

      const result = await runEffectForQuery(
        paymentsServiceEffect.checkout(request),
      );

      expect(mockHandleNextAction).toHaveBeenCalledWith(
        'pi_1_secret',
        expect.any(String),
      );
      expect(mockApiRequest).toHaveBeenCalledWith(
        '/reservations/checkout/pay-1',
        { auth: true },
      );
      expect(mockApiRequest).toHaveBeenLastCalledWith('/reservations/res-1', {
        auth: true,
      });
      expect(result).toEqual({
        status: 'succeeded',
        paymentId: 'pay-1',
        reservation: RESERVATION,
      });
    });

    it('fails when the customer abandons 3-D Secure', async () => {
      mockApiRequest.mockResolvedValueOnce({
        status: 'requires_action',
        paymentId: 'pay-1',
        clientSecret: 'pi_1_secret',
      });
      mockHandleNextAction.mockResolvedValue({
        error: { code: 'Canceled', message: 'Authentication canceled' },
      });

      const error = await failureOf(
        runEffectForQuery(paymentsServiceEffect.checkout(request)),
      );

      expect(error.message).toBe('Authentication canceled');
    });

    it('hands back processing when Stripe has not settled after polling', async () => {
      mockApiRequest
        .mockResolvedValueOnce({ status: 'processing', paymentId: 'pay-1' })
        .mockResolvedValue(payment('pending'));

      const result = await runEffectForQuery(
        paymentsServiceEffect.checkout(request),
      );

      expect(result).toEqual({ status: 'processing', paymentId: 'pay-1' });
      // The first read plus three retries.
      expect(mockApiRequest).toHaveBeenCalledTimes(5);
    });

    it('fails with Stripe’s decline reason', async () => {
      mockApiRequest
        .mockResolvedValueOnce({ status: 'processing', paymentId: 'pay-1' })
        .mockResolvedValueOnce(
          payment('failed', { failureMessage: 'Your card was declined.' }),
        );

      const error = await failureOf(
        runEffectForQuery(paymentsServiceEffect.checkout(request)),
      );

      expect(error.message).toBe('Your card was declined.');
    });

    it('fails with PAYMENT_REFUNDED when the seats were lost mid-payment', async () => {
      mockApiRequest
        .mockResolvedValueOnce({ status: 'processing', paymentId: 'pay-1' })
        .mockResolvedValueOnce(payment('refunded'));

      const error = await failureOf(
        runEffectForQuery(paymentsServiceEffect.checkout(request)),
      );

      expect(error.code).toBe('PAYMENT_REFUNDED');
    });

    it('carries the API errorCode when the checkout is refused', async () => {
      mockApiRequest.mockRejectedValue(
        new ApiError(409, 'SEAT_HOLD_EXPIRED', 'One or more holds expired'),
      );

      const error = await failureOf(
        runEffectForQuery(paymentsServiceEffect.checkout(request)),
      );

      expect(error.code).toBe('SEAT_HOLD_EXPIRED');
      expect(error.message).toBe('One or more holds expired');
    });
  });
});
