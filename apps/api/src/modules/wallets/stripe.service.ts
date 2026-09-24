import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import type { StripeConfig } from '../../config/stripe.config';

const RESOURCE_MISSING = 'resource_missing';
// Stripe's list endpoints cap a page at 100 — the same cap as DDR-005.
const MAX_LIST_LIMIT = 100;

export interface CreatePaymentIntentParams {
  amountCents: number;
  currency: string;
  customerId: string;
  paymentMethodId: string;
  walletId: string;
  /** The pending ledger row — also the idempotency key (ADR-017). */
  transactionId: string;
}

// ADR-017: the only file that talks to Stripe. It holds Stripe ids only —
// no card data ever passes through here. Every call is made outside a
// database transaction (DDR-002's rule, rule 3 of ADR-017).
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly client: Stripe;
  private readonly config: StripeConfig;

  constructor(configService: ConfigService) {
    this.config = configService.getOrThrow<StripeConfig>('stripe');
    this.client = new Stripe(this.config.secretKey, { maxNetworkRetries: 2 });
  }

  get publishableKey(): string {
    return this.config.publishableKey;
  }

  // Keyed on the wallet, so two concurrent first add-card requests get the
  // same Customer back instead of creating two.
  createCustomer(walletId: string, email: string): Promise<Stripe.Customer> {
    return this.call(() =>
      this.client.customers.create(
        { email, metadata: { walletId } },
        { idempotencyKey: `customer-${walletId}` },
      ),
    );
  }

  createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    return this.call(() =>
      this.client.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      }),
    );
  }

  // PaymentSheet needs an ephemeral key to list and save the customer's
  // cards on the device without holding our secret key.
  createEphemeralKey(customerId: string): Promise<Stripe.EphemeralKey> {
    return this.call(() =>
      this.client.ephemeralKeys.create(
        { customer: customerId },
        { apiVersion: Stripe.API_VERSION },
      ),
    );
  }

  async listCards(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const { data } = await this.call(() =>
      this.client.customers.listPaymentMethods(customerId, {
        type: 'card',
        limit: MAX_LIST_LIMIT,
      }),
    );
    return data;
  }

  async hasCard(customerId: string): Promise<boolean> {
    const { data } = await this.call(() =>
      this.client.customers.listPaymentMethods(customerId, {
        type: 'card',
        limit: 1,
      }),
    );
    return data.length > 0;
  }

  // Null for an id Stripe does not know, so the caller can answer
  // PAYMENT_METHOD_NOT_FOUND the same way as for someone else's card (BR-38).
  retrievePaymentMethod(
    paymentMethodId: string,
  ): Promise<Stripe.PaymentMethod | null> {
    return this.call(async () => {
      try {
        return await this.client.paymentMethods.retrieve(paymentMethodId);
      } catch (error) {
        if (isResourceMissing(error)) {
          return null;
        }
        throw error;
      }
    });
  }

  createPaymentIntent({
    amountCents,
    currency,
    customerId,
    paymentMethodId,
    walletId,
    transactionId,
  }: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
    return this.call(() =>
      this.client.paymentIntents.create(
        {
          amount: amountCents,
          currency,
          customer: customerId,
          payment_method: paymentMethodId,
          payment_method_types: ['card'],
          confirm: true,
          metadata: { walletId, walletTransactionId: transactionId },
        },
        { idempotencyKey: `top-up-${transactionId}` },
      ),
    );
  }

  retrievePaymentIntent(
    paymentIntentId: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.call(() =>
      this.client.paymentIntents.retrieve(paymentIntentId),
    );
  }

  // ADR-017: the webhook route is trusted only through this check.
  constructWebhookEvent(
    rawBody: Buffer | undefined,
    signature: string | undefined,
  ): Stripe.Event {
    if (!rawBody || !signature) {
      throw this.invalidSignature();
    }

    try {
      return this.client.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.webhookSecret,
      );
    } catch {
      throw this.invalidSignature();
    }
  }

  // A declined card is a business outcome the caller settles as failed, so
  // it passes through untouched. Anything else Stripe throws means we could
  // not get an answer — reported as the provider being unavailable.
  private async call<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (isPaymentDecline(error)) {
        throw error;
      }

      this.logger.error(
        `Stripe request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new AppException(
        ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE,
        'The payment provider is unavailable, please try again',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  private invalidSignature(): AppException {
    return new AppException(
      ErrorCode.STRIPE_WEBHOOK_SIGNATURE_INVALID,
      'Webhook signature is missing or invalid',
      HttpStatus.BAD_REQUEST,
    );
  }
}

// A card decline, or any request error that already produced a
// PaymentIntent (e.g. an authentication failure) — the payment was attempted
// and definitively did not go through.
export function isPaymentDecline(
  error: unknown,
): error is InstanceType<typeof Stripe.errors.StripeError> {
  return (
    error instanceof Stripe.errors.StripeCardError ||
    (error instanceof Stripe.errors.StripeError &&
      error.payment_intent !== undefined)
  );
}

function isResourceMissing(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === RESOURCE_MISSING
  );
}
