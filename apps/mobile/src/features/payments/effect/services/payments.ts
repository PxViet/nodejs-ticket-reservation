// Effect
import { Context, Effect } from 'effect';

// Types
import type {
  CheckoutOutcome,
  CheckoutRequest,
  PaymentMethod,
  PaymentsPage,
  PaymentWithShowtime,
} from '../../schemas/payments';

// Error
import { PaymentsError } from '../../error/payments';

export class PaymentsService extends Context.Tag('PaymentsServiceTag')<
  PaymentsService,
  {
    readonly getPaymentMethods: () => Effect.Effect<
      PaymentMethod[],
      PaymentsError,
      never
    >;

    readonly getPayments: (
      page?: number,
    ) => Effect.Effect<PaymentsPage<PaymentWithShowtime>, PaymentsError, never>;

    readonly addCard: () => Effect.Effect<void, PaymentsError, never>;

    readonly checkout: (
      request: CheckoutRequest,
    ) => Effect.Effect<CheckoutOutcome, PaymentsError, never>;
  }
>() {}
