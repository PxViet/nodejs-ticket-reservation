import { Effect, Layer } from 'effect';

// Types
import type { CheckoutRequest } from '../../schemas/payments';

// Effect
import { paymentsServiceEffect } from '../../services/payments';

// Service
import { PaymentsService } from '../services/payments';

export const PaymentsServiceLayer = Layer.effect(
  PaymentsService,
  Effect.gen(function* () {
    return {
      getPaymentMethods: () => paymentsServiceEffect.getPaymentMethods(),

      getPayments: (page?: number) => paymentsServiceEffect.getPayments(page),

      addCard: () => paymentsServiceEffect.addCard(),

      checkout: (request: CheckoutRequest) =>
        paymentsServiceEffect.checkout(request),
    } as const;
  }),
);
