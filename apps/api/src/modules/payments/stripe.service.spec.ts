import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { ErrorCode } from '../../common/exceptions/error-codes';
import { StripeService } from './stripe.service';

describe('StripeService', () => {
  const webhookSecret = 'whsec_test_secret';
  let service: StripeService;

  beforeEach(() => {
    const configService = {
      getOrThrow: jest.fn().mockReturnValue({
        secretKey: 'sk_test_dummy',
        publishableKey: 'pk_test_dummy',
        webhookSecret,
      }),
    } as unknown as ConfigService;

    service = new StripeService(configService);
  });

  describe('constructWebhookEvent', () => {
    const payload = JSON.stringify({
      id: 'evt_1',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', object: 'payment_intent' } },
    });

    it('accepts a body signed with the endpoint secret', () => {
      const signature = Stripe.webhooks.generateTestHeaderString({
        payload,
        secret: webhookSecret,
      });

      const event = service.constructWebhookEvent(
        Buffer.from(payload),
        signature,
      );

      expect(event.type).toBe('payment_intent.succeeded');
    });

    it('rejects a body signed with another secret', () => {
      const signature = Stripe.webhooks.generateTestHeaderString({
        payload,
        secret: 'whsec_someone_else',
      });

      expect(() =>
        service.constructWebhookEvent(Buffer.from(payload), signature),
      ).toThrow(
        expect.objectContaining({
          errorCode: ErrorCode.STRIPE_WEBHOOK_SIGNATURE_INVALID,
        }),
      );
    });

    it('rejects a body altered after signing', () => {
      const signature = Stripe.webhooks.generateTestHeaderString({
        payload,
        secret: webhookSecret,
      });

      expect(() =>
        service.constructWebhookEvent(
          Buffer.from(payload.replace('pi_1', 'pi_2')),
          signature,
        ),
      ).toThrow(
        expect.objectContaining({
          errorCode: ErrorCode.STRIPE_WEBHOOK_SIGNATURE_INVALID,
        }),
      );
    });

    it('rejects a request with no signature header', () => {
      expect(() =>
        service.constructWebhookEvent(Buffer.from(payload), undefined),
      ).toThrow(
        expect.objectContaining({
          errorCode: ErrorCode.STRIPE_WEBHOOK_SIGNATURE_INVALID,
        }),
      );
    });
  });
});
