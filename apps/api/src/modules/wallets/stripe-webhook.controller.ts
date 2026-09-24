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

import { StripeService } from './stripe.service';
import { WalletsService } from './wallets.service';

// ADR-017 rule 4: the first unauthenticated write endpoint. It is trusted
// only through the Stripe-Signature check over the raw body (rawBody: true in
// main.ts), and exempt from JWT and the throttler. Excluded from the OpenAPI
// document — Stripe calls it, not the mobile client.
@ApiExcludeController()
@SkipThrottle()
@Controller('payments/stripe')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly walletsService: WalletsService,
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

    await this.walletsService.handleStripeEvent(event);

    return { received: true };
  }
}
