import { registerAs } from '@nestjs/config';

export interface StripeConfig {
  /** Server-side secret key — never leaves the API. */
  secretKey: string;
  /** Returned to the mobile client so it can initialise Stripe's SDK. */
  publishableKey: string;
  /** Verifies the `Stripe-Signature` header on the webhook route. */
  webhookSecret: string;
}

// ADR-017: the three variables the Stripe integration needs.
export const stripeConfig = registerAs('stripe', (): StripeConfig => ({
  secretKey: process.env.STRIPE_SECRET_KEY ?? '',
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
}));
