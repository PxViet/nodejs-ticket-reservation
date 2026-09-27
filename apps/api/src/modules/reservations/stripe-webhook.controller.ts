import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  type RawBodyRequest,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';

import { StripeService } from '../payments/stripe.service';
import { CheckoutService } from './checkout.service';

// ADR-018 rule 4: the only unauthenticated write endpoint. It is trusted
// only through the Stripe-Signature check over the raw body (rawBody: true in
// main.ts), and exempt from JWT and the throttler. Excluded from the OpenAPI
// document — Stripe calls it, not the mobile client. It lives here rather than
// in PaymentsModule because settling a checkout writes the reservation, and
// the dependency runs Reservations → Payments only.
@ApiExcludeController()
@SkipThrottle()
@Controller('payments/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const event = this.stripeService.constructWebhookEvent(
      req.rawBody,
      signature,
    );

    await this.checkoutService.handleStripeEvent(event);

    return { received: true };
  }
}
