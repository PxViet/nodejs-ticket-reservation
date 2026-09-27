import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import Stripe from 'stripe';

import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { PaymentsService } from '../payments/payments.service';
import { StripeService } from '../payments/stripe.service';
import { UserRole } from '../users/enums/user-role.enum';
import { CheckoutService } from './checkout.service';
import type { SeatHold } from './entities/seat-hold.entity';
import { CheckoutStatus } from './enums/checkout-status.enum';
import { SeatHoldStatus } from './enums/seat-hold-status.enum';
import { ReservationsService } from './reservations.service';

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';
const HOLD_ID = '22222222-2222-4222-8222-222222222222';

function mockManager() {
  const holdQb: Record<string, jest.Mock> = {};
  for (const method of ['setLock', 'where', 'andWhere']) {
    holdQb[method] = jest.fn().mockReturnValue(holdQb);
  }
  holdQb.getMany = jest.fn();

  return {
    holdQb,
    getRepository: jest.fn(() => ({
      createQueryBuilder: jest.fn().mockReturnValue(holdQb),
    })),
    findOneOrFail: jest.fn().mockResolvedValue({ id: 'st1', basePrice: 8.5 }),
  };
}

function paymentIntent(
  overrides: Partial<Stripe.PaymentIntent> = {},
): Stripe.PaymentIntent {
  return {
    id: 'pi_1',
    status: 'succeeded',
    amount: 1700,
    currency: 'usd',
    client_secret: 'pi_1_secret',
    metadata: { paymentId: PAYMENT_ID },
    last_payment_error: null,
    ...overrides,
  } as Stripe.PaymentIntent;
}

describe('CheckoutService', () => {
  let service: CheckoutService;
  let manager: ReturnType<typeof mockManager>;
  let dataSource: { transaction: jest.Mock };
  let payments: Record<string, jest.Mock>;
  let reservations: { confirmHolds: jest.Mock };
  let stripe: Record<string, jest.Mock>;

  const user = {
    id: 'user-1',
    email: 'a@example.com',
    role: UserRole.USER,
  } as AuthenticatedUser;

  const dto = { holdIds: [HOLD_ID, 'hold-2'], paymentMethodId: 'pm_1' };

  const hold = (overrides: Partial<SeatHold> = {}): SeatHold =>
    ({
      id: HOLD_ID,
      showtimeId: 'st1',
      seatId: 'seat-a1',
      userId: 'user-1',
      status: SeatHoldStatus.HELD,
      heldUntil: new Date('2099-01-01T00:00:00Z'),
      ...overrides,
    }) as SeatHold;

  const pendingPayment = (overrides: Partial<Payment> = {}): Payment =>
    ({
      id: PAYMENT_ID,
      userId: 'user-1',
      showtimeId: 'st1',
      holdIds: dto.holdIds,
      status: PaymentStatus.PENDING,
      amountCents: 1700,
      currency: 'usd',
      paymentMethodId: 'pm_1',
      stripePaymentIntentId: null,
      ...overrides,
    }) as Payment;

  const reservation = { id: 'res-1', status: 'confirmed' };

  beforeEach(async () => {
    manager = mockManager();
    manager.holdQb.getMany.mockResolvedValue([
      hold(),
      hold({ id: 'hold-2', seatId: 'seat-a2' }),
    ]);
    dataSource = {
      transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
    };

    payments = {
      assertOwnPaymentMethod: jest.fn().mockResolvedValue({
        customerId: 'cus_1',
        brand: 'visa',
        last4: '4242',
      }),
      findPendingOverlapping: jest.fn().mockResolvedValue([]),
      createPending: jest.fn((_m: unknown, params: Partial<Payment>) =>
        Promise.resolve(pendingPayment(params)),
      ),
      lock: jest.fn().mockResolvedValue(pendingPayment()),
      markSucceeded: jest.fn(
        (_m: unknown, payment: Payment, piId: string, reservationId: string) =>
          Promise.resolve({
            ...payment,
            status: PaymentStatus.SUCCEEDED,
            stripePaymentIntentId: piId,
            reservationId,
          }),
      ),
      settleFailed: jest.fn(),
      settleRefunded: jest.fn((id: string) =>
        Promise.resolve(pendingPayment({ id, status: PaymentStatus.REFUNDED })),
      ),
      attachPaymentIntent: jest.fn(),
      findForPaymentIntent: jest.fn().mockResolvedValue(pendingPayment()),
      findOwned: jest.fn(),
      toResponse: jest.fn((payment: Payment) => ({
        id: payment.id,
        status: payment.status,
      })),
      describeFailure: jest.fn().mockReturnValue({
        code: 'card_declined',
        message: 'Your card was declined.',
      }),
      paymentFailed: jest.fn(
        (message = 'The payment was declined') =>
          new AppException(
            ErrorCode.PAYMENT_FAILED,
            message,
            HttpStatus.PAYMENT_REQUIRED,
          ),
      ),
    };
    reservations = {
      confirmHolds: jest.fn().mockResolvedValue(reservation),
    };
    stripe = {
      createPaymentIntent: jest.fn().mockResolvedValue(paymentIntent()),
      retrievePaymentIntent: jest.fn(),
      createRefund: jest.fn().mockResolvedValue({ id: 're_1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: getDataSourceToken(), useValue: dataSource },
        { provide: PaymentsService, useValue: payments },
        { provide: ReservationsService, useValue: reservations },
        { provide: StripeService, useValue: stripe },
      ],
    }).compile();

    service = module.get(CheckoutService);
  });

  describe('checkout', () => {
    it('prices on the server, charges, then confirms the reservation', async () => {
      const result = await service.checkout(user, dto);

      expect(manager.holdQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(manager.holdQb.andWhere).toHaveBeenCalledWith(
        'h.userId = :userId',
        { userId: 'user-1' },
      );
      // BR-36: 2 seats × $8.50
      expect(payments.createPending).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          amountCents: 1700,
          currency: 'usd',
          cardBrand: 'visa',
          cardLast4: '4242',
        }),
      );
      expect(stripe.createPaymentIntent).toHaveBeenCalledWith({
        amountCents: 1700,
        currency: 'usd',
        customerId: 'cus_1',
        paymentMethodId: 'pm_1',
        paymentId: PAYMENT_ID,
      });
      expect(reservations.confirmHolds).toHaveBeenCalledWith(manager, {
        holdIds: dto.holdIds,
        userId: 'user-1',
        showtimeId: 'st1',
        unitPrice: 8.5,
      });
      expect(result).toEqual({
        status: CheckoutStatus.SUCCEEDED,
        paymentId: PAYMENT_ID,
        reservation,
      });
    });

    it('DDR-002: never calls Stripe while a transaction is open', async () => {
      let open = 0;
      dataSource.transaction.mockImplementation(
        async (cb: (m: typeof manager) => unknown) => {
          open += 1;
          try {
            return await cb(manager);
          } finally {
            open -= 1;
          }
        },
      );
      stripe.createPaymentIntent.mockImplementation(() => {
        expect(open).toBe(0);
        return Promise.resolve(paymentIntent());
      });

      await service.checkout(user, dto);

      expect(stripe.createPaymentIntent).toHaveBeenCalled();
    });

    it('BR-38: rejects a card that is not the caller’s before any write', async () => {
      payments.assertOwnPaymentMethod.mockRejectedValue(
        new AppException(
          ErrorCode.PAYMENT_METHOD_NOT_FOUND,
          'Payment method not found',
          HttpStatus.NOT_FOUND,
        ),
      );

      await expect(service.checkout(user, dto)).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_METHOD_NOT_FOUND,
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('throws SEAT_HOLD_NOT_OWNED without charging when a hold is not the caller’s', async () => {
      manager.holdQb.getMany.mockResolvedValue([hold()]);

      await expect(service.checkout(user, dto)).rejects.toMatchObject({
        errorCode: ErrorCode.SEAT_HOLD_NOT_OWNED,
      });
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('throws SEAT_HOLD_EXPIRED without charging for a lapsed hold', async () => {
      manager.holdQb.getMany.mockResolvedValue([
        hold(),
        hold({ id: 'hold-2', heldUntil: new Date('2000-01-01T00:00:00Z') }),
      ]);

      await expect(service.checkout(user, dto)).rejects.toMatchObject({
        errorCode: ErrorCode.SEAT_HOLD_EXPIRED,
      });
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('rejects a total below the card minimum', async () => {
      manager.findOneOrFail.mockResolvedValue({ id: 'st1', basePrice: 0.2 });

      await expect(service.checkout(user, dto)).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_AMOUNT_TOO_SMALL,
      });
    });

    it('resumes an identical pending payment instead of creating another', async () => {
      payments.findPendingOverlapping.mockResolvedValue([pendingPayment()]);

      await service.checkout(user, {
        ...dto,
        holdIds: [...dto.holdIds].reverse(),
      });

      expect(payments.createPending).not.toHaveBeenCalled();
      expect(stripe.createPaymentIntent).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: PAYMENT_ID }),
      );
    });

    it('throws PAYMENT_IN_PROGRESS when another pending payment covers these seats', async () => {
      payments.findPendingOverlapping.mockResolvedValue([
        pendingPayment({ paymentMethodId: 'pm_other' }),
      ]);

      await expect(service.checkout(user, dto)).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_IN_PROGRESS,
      });
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('settles a declined card as failed and answers 402', async () => {
      stripe.createPaymentIntent.mockRejectedValue(
        new Stripe.errors.StripeCardError({
          type: 'card_error',
          message: 'Your card was declined.',
          code: 'card_declined',
          decline_code: 'generic_decline',
        }),
      );

      await expect(service.checkout(user, dto)).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_FAILED,
      });
      expect(payments.settleFailed).toHaveBeenCalledWith(
        PAYMENT_ID,
        null,
        'generic_decline',
        'Your card was declined.',
      );
      expect(reservations.confirmHolds).not.toHaveBeenCalled();
    });

    it('leaves the payment pending when Stripe does not answer', async () => {
      const unavailable = new AppException(
        ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE,
        'unavailable',
        HttpStatus.BAD_GATEWAY,
      );
      stripe.createPaymentIntent.mockRejectedValue(unavailable);

      await expect(service.checkout(user, dto)).rejects.toBe(unavailable);
      expect(payments.settleFailed).not.toHaveBeenCalled();
    });

    it('returns the client secret when 3-D Secure is required', async () => {
      stripe.createPaymentIntent.mockResolvedValue(
        paymentIntent({ status: 'requires_action' }),
      );

      const result = await service.checkout(user, dto);

      expect(payments.attachPaymentIntent).toHaveBeenCalledWith(
        PAYMENT_ID,
        'pi_1',
      );
      expect(result).toEqual({
        status: CheckoutStatus.REQUIRES_ACTION,
        paymentId: PAYMENT_ID,
        clientSecret: 'pi_1_secret',
      });
      expect(reservations.confirmHolds).not.toHaveBeenCalled();
    });

    it('returns processing for a payment Stripe is still settling', async () => {
      stripe.createPaymentIntent.mockResolvedValue(
        paymentIntent({ status: 'processing' }),
      );

      const result = await service.checkout(user, dto);

      expect(result).toEqual({
        status: CheckoutStatus.PROCESSING,
        paymentId: PAYMENT_ID,
      });
    });

    it('refunds and answers PAYMENT_REFUNDED when the holds lapsed during the charge', async () => {
      reservations.confirmHolds.mockRejectedValue(
        new AppException(
          ErrorCode.SEAT_HOLD_EXPIRED,
          'One or more holds are no longer held',
          HttpStatus.CONFLICT,
        ),
      );

      await expect(service.checkout(user, dto)).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_REFUNDED,
      });
      expect(stripe.createRefund).toHaveBeenCalledWith('pi_1', PAYMENT_ID);
      expect(payments.settleRefunded).toHaveBeenCalledWith(
        PAYMENT_ID,
        'pi_1',
        're_1',
        ErrorCode.SEAT_HOLD_EXPIRED,
        expect.any(String),
      );
    });
  });

  describe('finalize', () => {
    it('is a no-op for a payment that is no longer pending', async () => {
      const settled = pendingPayment({ status: PaymentStatus.SUCCEEDED });
      payments.lock.mockResolvedValue(settled);

      const result = await service.finalize(PAYMENT_ID, 'pi_1');

      expect(result).toEqual({ payment: settled });
      expect(reservations.confirmHolds).not.toHaveBeenCalled();
      expect(payments.markSucceeded).not.toHaveBeenCalled();
    });

    it('locks the payment before DDR-002 locks the holds', async () => {
      const order: string[] = [];
      payments.lock.mockImplementation(() => {
        order.push('payment');
        return Promise.resolve(pendingPayment());
      });
      reservations.confirmHolds.mockImplementation(() => {
        order.push('holds');
        return Promise.resolve(reservation);
      });

      await service.finalize(PAYMENT_ID, 'pi_1');

      expect(order).toEqual(['payment', 'holds']);
    });

    it('leaves the payment pending when the refund call fails, so a retry refunds it', async () => {
      reservations.confirmHolds.mockRejectedValue(
        new AppException(
          ErrorCode.SEAT_HOLD_EXPIRED,
          'expired',
          HttpStatus.CONFLICT,
        ),
      );
      stripe.createRefund.mockRejectedValueOnce(
        new AppException(
          ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE,
          'unavailable',
          HttpStatus.BAD_GATEWAY,
        ),
      );

      await expect(service.finalize(PAYMENT_ID, 'pi_1')).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE,
      });
      expect(payments.settleRefunded).not.toHaveBeenCalled();

      await service.finalize(PAYMENT_ID, 'pi_1');

      expect(stripe.createRefund).toHaveBeenCalledTimes(2);
      expect(payments.settleRefunded).toHaveBeenCalledTimes(1);
    });

    it('rethrows anything that is not a lapsed hold', async () => {
      reservations.confirmHolds.mockRejectedValue(new Error('db down'));

      await expect(service.finalize(PAYMENT_ID, 'pi_1')).rejects.toThrow(
        'db down',
      );
      expect(stripe.createRefund).not.toHaveBeenCalled();
    });
  });

  describe('handleStripeEvent', () => {
    const event = (
      type: string,
      object: Stripe.PaymentIntent = paymentIntent(),
    ): Stripe.Event =>
      ({ id: 'evt_1', type, data: { object } }) as unknown as Stripe.Event;

    it('finalizes on payment_intent.succeeded', async () => {
      await service.handleStripeEvent(event('payment_intent.succeeded'));

      expect(reservations.confirmHolds).toHaveBeenCalled();
    });

    it('settles failed on payment_intent.payment_failed', async () => {
      await service.handleStripeEvent(
        event(
          'payment_intent.payment_failed',
          paymentIntent({ status: 'requires_payment_method' }),
        ),
      );

      expect(payments.settleFailed).toHaveBeenCalledWith(
        PAYMENT_ID,
        'pi_1',
        'card_declined',
        'Your card was declined.',
      );
    });

    it('ignores events for PaymentIntents that are not ours', async () => {
      payments.findForPaymentIntent.mockResolvedValue(null);

      await service.handleStripeEvent(event('payment_intent.succeeded'));

      expect(payments.lock).not.toHaveBeenCalled();
    });

    it('ignores unrelated event types', async () => {
      await service.handleStripeEvent(event('customer.created'));

      expect(payments.findForPaymentIntent).not.toHaveBeenCalled();
    });
  });

  describe('findStatus', () => {
    it('reconciles a pending payment from Stripe before answering', async () => {
      payments.findOwned
        .mockResolvedValueOnce(
          pendingPayment({ stripePaymentIntentId: 'pi_1' }),
        )
        .mockResolvedValueOnce(
          pendingPayment({ status: PaymentStatus.SUCCEEDED }),
        );
      stripe.retrievePaymentIntent.mockResolvedValue(paymentIntent());

      const result = await service.findStatus(user, PAYMENT_ID);

      expect(reservations.confirmHolds).toHaveBeenCalled();
      expect(result).toEqual({
        id: PAYMENT_ID,
        status: PaymentStatus.SUCCEEDED,
      });
    });

    it('answers with the row as it is when Stripe is unavailable', async () => {
      payments.findOwned.mockResolvedValue(
        pendingPayment({ stripePaymentIntentId: 'pi_1' }),
      );
      stripe.retrievePaymentIntent.mockRejectedValue(
        new AppException(
          ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE,
          'unavailable',
          HttpStatus.BAD_GATEWAY,
        ),
      );

      const result = await service.findStatus(user, PAYMENT_ID);

      expect(result.status).toBe(PaymentStatus.PENDING);
    });
  });
});
