// Effect
import { Effect, Schedule } from 'effect';

// Stripe
import {
  handleNextAction,
  initPaymentSheet,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';

// HTTP
import { apiRequest } from '@/services/api/client';
import { codeOf, messageOf, toQuery } from '@/services/api/helpers';

// Types
import type {
  PaginatedPaymentMethods,
  PaginatedPayments,
  Reservation as ApiReservation,
} from '@movea/api-contract';
import type { Reservation } from '@/features/booking/schemas/reservation';
import type { Showtime } from '@/features/booking/schemas/showtime';
import type {
  CheckoutOutcome,
  CheckoutRequest,
  CheckoutResponse,
  Payment,
  PaymentMethod,
  PaymentsPage,
  PaymentWithShowtime,
  SetupIntent,
} from '@/features/payments/schemas/payments';

// Effect Services
import { showtimesServiceEffect } from '@/features/booking/services/showtimes';

// Constants
import {
  CHECKOUT_POLL_ATTEMPTS,
  CHECKOUT_POLL_INTERVAL_MS,
  ERROR_MESSAGES,
  PAGINATION,
  STRIPE_MERCHANT_DISPLAY_NAME,
  STRIPE_RETURN_URL,
} from '@/constants';
import { CHECKOUT_STATUS, PAYMENT_STATUS } from '@/constants/status';

// Error
import {
  PAYMENT_SHEET_CANCELED,
  PaymentsError,
} from '@/features/payments/error/payments';

const PAGE_LIMIT = PAGINATION.PAGE_LIMIT_MAX;

const loadError = (fallback: string) => (error: unknown) =>
  PaymentsError.loadFailed(messageOf(error) || fallback, codeOf(error));

const addCardError = (error: unknown) =>
  PaymentsError.addCardFailed(
    messageOf(error) || ERROR_MESSAGES.ADD_CARD_FAILED,
    codeOf(error),
  );

const checkoutError = (error: unknown) =>
  PaymentsError.checkoutFailed(
    messageOf(error) || ERROR_MESSAGES.CHECKOUT_FAILED,
    codeOf(error),
  );

// Re-read a checkout payment while it is `pending`, a fixed number of times,
// and hand back the last read — settled or not.
const pollUntilSettled = Schedule.recurs(CHECKOUT_POLL_ATTEMPTS).pipe(
  Schedule.addDelay(() => CHECKOUT_POLL_INTERVAL_MS),
  Schedule.whileInput(
    (payment: Payment) => payment.status === PAYMENT_STATUS.PENDING,
  ),
  Schedule.passthrough,
);

// One lookup per distinct showtime on the page, not one per payment.
const withShowtimes = async (
  payments: Payment[],
): Promise<PaymentWithShowtime[]> => {
  const ids = [...new Set(payments.map(payment => payment.showtimeId))];
  const showtimes = new Map<string, Showtime | undefined>(
    await Promise.all(
      ids.map(
        async id =>
          [
            id,
            await Effect.runPromise(
              showtimesServiceEffect.getShowtimeById(id),
            ).catch(() => undefined),
          ] as const,
      ),
    ),
  );

  return payments.map(payment => ({
    ...payment,
    showtime: showtimes.get(payment.showtimeId),
  }));
};

const getReservation = (id: string) =>
  Effect.tryPromise({
    try: () =>
      apiRequest<ApiReservation>(`/reservations/${id}`, {
        auth: true,
      }) as Promise<Reservation>,
    catch: checkoutError,
  });

/**
 * The client's side of ADR-018. The API owns every price and every Stripe
 * object; this client only does what Stripe must do on the device — the card
 * entry (PaymentSheet in setup mode) and, when the bank asks, 3-D Secure.
 * Nothing here ever handles a card number.
 */
export class PaymentsServiceEffect {
  private static instance: PaymentsServiceEffect;

  private constructor() {}

  static getInstance(): PaymentsServiceEffect {
    if (!PaymentsServiceEffect.instance) {
      PaymentsServiceEffect.instance = new PaymentsServiceEffect();
    }
    return PaymentsServiceEffect.instance;
  }

  getPaymentMethods = () =>
    Effect.tryPromise({
      try: async (): Promise<PaymentMethod[]> =>
        (
          await apiRequest<PaginatedPaymentMethods>(
            `/payment-methods${toQuery({ limit: PAGE_LIMIT })}`,
            { auth: true },
          )
        ).data,
      catch: loadError(ERROR_MESSAGES.PAYMENT_METHODS_LOAD_FAILED),
    });

  getPayments = (page = 1) =>
    Effect.tryPromise({
      try: async (): Promise<PaymentsPage<PaymentWithShowtime>> => {
        const { data, meta } = await apiRequest<PaginatedPayments>(
          `/payments${toQuery({ page, limit: PAGE_LIMIT })}`,
          { auth: true },
        );
        return {
          data: await withShowtimes(data),
          page: meta.page,
          hasMore: meta.hasMore,
        };
      },
      catch: loadError(ERROR_MESSAGES.PAYMENTS_LOAD_FAILED),
    });

  /**
   * Add a card through Stripe's PaymentSheet in setup mode. The API opens a
   * SetupIntent on the caller's own Stripe Customer (BR-38) and hands back the
   * ephemeral key the sheet needs; the card is entered and saved inside the
   * sheet. PaymentSheet does not report the new card's id — the caller
   * refetches the saved cards to find it.
   */
  addCard = () =>
    Effect.gen(function* () {
      const intent = yield* Effect.tryPromise({
        try: () =>
          apiRequest<SetupIntent>('/payment-methods/setup-intent', {
            method: 'POST',
            auth: true,
          }),
        catch: addCardError,
      });

      const init = yield* Effect.tryPromise({
        try: () =>
          initPaymentSheet({
            merchantDisplayName: STRIPE_MERCHANT_DISPLAY_NAME,
            customerId: intent.customerId,
            customerEphemeralKeySecret: intent.ephemeralKeySecret,
            setupIntentClientSecret: intent.setupIntentClientSecret,
            returnURL: STRIPE_RETURN_URL,
          }),
        catch: addCardError,
      });

      if (init.error) {
        return yield* Effect.fail(
          PaymentsError.addCardFailed(
            init.error.localizedMessage ||
              init.error.message ||
              ERROR_MESSAGES.ADD_CARD_FAILED,
            init.error.code,
          ),
        );
      }

      const presented = yield* Effect.tryPromise({
        try: () => presentPaymentSheet(),
        catch: addCardError,
      });

      if (presented.error?.code === PAYMENT_SHEET_CANCELED) {
        return yield* Effect.fail(PaymentsError.addCardCanceled());
      }

      if (presented.error) {
        return yield* Effect.fail(
          PaymentsError.addCardFailed(
            presented.error.localizedMessage ||
              presented.error.message ||
              ERROR_MESSAGES.ADD_CARD_FAILED,
            presented.error.code,
          ),
        );
      }
    });

  getCheckout = (paymentId: string) =>
    Effect.tryPromise({
      try: () =>
        apiRequest<Payment>(`/reservations/checkout/${paymentId}`, {
          auth: true,
        }),
      catch: checkoutError,
    });

  /**
   * Pay for held seats with a saved card. The server prices and charges it
   * (BR-36) and confirms the reservation only once the card is charged
   * (ADR-018). A `requires_action` answer is handed to Stripe for 3-D Secure,
   * and anything not yet settled is polled until the webhook settles it.
   */
  checkout = (request: CheckoutRequest) => {
    const getCheckout = this.getCheckout;

    return Effect.gen(function* () {
      const response = yield* Effect.tryPromise({
        try: () =>
          apiRequest<CheckoutResponse>('/reservations/checkout', {
            method: 'POST',
            body: request,
            auth: true,
          }),
        catch: checkoutError,
      });

      if (
        response.status === CHECKOUT_STATUS.SUCCEEDED &&
        response.reservation
      ) {
        return {
          status: CHECKOUT_STATUS.SUCCEEDED,
          paymentId: response.paymentId,
          reservation: response.reservation as Reservation,
        } satisfies CheckoutOutcome;
      }

      if (
        response.status === CHECKOUT_STATUS.REQUIRES_ACTION &&
        response.clientSecret
      ) {
        const action = yield* Effect.tryPromise({
          try: () =>
            handleNextAction(response.clientSecret!, STRIPE_RETURN_URL),
          catch: checkoutError,
        });

        if (action.error) {
          return yield* Effect.fail(
            PaymentsError.checkoutFailed(
              action.error.localizedMessage ||
                action.error.message ||
                ERROR_MESSAGES.CHECKOUT_DECLINED,
              action.error.code,
            ),
          );
        }
      }

      const payment = yield* getCheckout(response.paymentId).pipe(
        Effect.repeat(pollUntilSettled),
      );

      switch (payment.status) {
        case PAYMENT_STATUS.SUCCEEDED:
          return {
            status: CHECKOUT_STATUS.SUCCEEDED,
            paymentId: payment.id,
            reservation: yield* getReservation(payment.reservationId!),
          } satisfies CheckoutOutcome;
        case PAYMENT_STATUS.FAILED:
          return yield* Effect.fail(
            PaymentsError.checkoutFailed(
              payment.failureMessage || ERROR_MESSAGES.CHECKOUT_DECLINED,
            ),
          );
        case PAYMENT_STATUS.REFUNDED:
          return yield* Effect.fail(
            PaymentsError.checkoutFailed(
              payment.failureMessage || ERROR_MESSAGES.CHECKOUT_REFUNDED,
              'PAYMENT_REFUNDED',
            ),
          );
        default:
          return {
            status: CHECKOUT_STATUS.PROCESSING,
            paymentId: payment.id,
          } satisfies CheckoutOutcome;
      }
    });
  };
}

export const paymentsServiceEffect = PaymentsServiceEffect.getInstance();
