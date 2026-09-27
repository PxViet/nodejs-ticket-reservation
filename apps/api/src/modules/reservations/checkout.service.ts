import {
  BadRequestException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type Stripe from 'stripe';
import { DataSource } from 'typeorm';

import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type { PaymentResponseDto } from '../payments/dto/payment.dto';
import type { Payment } from '../payments/entities/payment.entity';
import { PaymentStatus } from '../payments/enums/payment-status.enum';
import { PaymentsService } from '../payments/payments.service';
import { isPaymentDecline, StripeService } from '../payments/stripe.service';
import { Showtime } from '../showtimes/entities/showtime.entity';
import type { CheckoutDto, CheckoutResponseDto } from './dto/checkout.dto';
import type { ReservationResponseDto } from './dto/reservation.dto';
import { SeatHold } from './entities/seat-hold.entity';
import { CheckoutStatus } from './enums/checkout-status.enum';
import { SeatHoldStatus } from './enums/seat-hold-status.enum';
import { ReservationsService } from './reservations.service';
import { withUniViolentRetry } from './utils/unique-violation-retry.util';

const CURRENCY = 'usd';
// Stripe's minimum charge in USD.
const MIN_AMOUNT_CENTS = 50;
const HOLDS_LAPSED_MESSAGE =
  'Your seats were released before the payment completed, so it was refunded';

// PaymentIntent states after which the payment can no longer succeed without
// a new confirmation — the payment is settled as failed.
const FAILED_INTENT_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  'requires_payment_method',
  'canceled',
]);

// Re-validation failures from DDR-002 that mean the charged seats can no
// longer be confirmed — the charge is refunded rather than kept.
const LAPSED_HOLD_CODES = new Set<string>([
  ErrorCode.SEAT_HOLD_EXPIRED,
  ErrorCode.SEAT_HOLD_NOT_OWNED,
]);

type Finalized =
  | { payment: Payment; reservation: ReservationResponseDto }
  | { payment: Payment; reservation?: undefined };

// ADR-018 / DDR-025: charge, then confirm. No Stripe call is ever made with a
// transaction open, and DDR-002's step order runs unchanged inside finalize.
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly reservationsService: ReservationsService,
    private readonly paymentsService: PaymentsService,
    private readonly stripe: StripeService,
  ) {}

  async checkout(
    user: AuthenticatedUser,
    { holdIds, paymentMethodId }: CheckoutDto,
  ): Promise<CheckoutResponseDto> {
    // BR-38: a Stripe call, so it runs before any transaction opens.
    const card = await this.paymentsService.assertOwnPaymentMethod(
      user.id,
      paymentMethodId,
    );

    const payment = await this.dataSource.transaction(async (manager) => {
      const holds = await manager
        .getRepository(SeatHold)
        .createQueryBuilder('h')
        .setLock('pessimistic_write')
        .where('h.id IN (:...ids)', { ids: holdIds })
        .andWhere('h.userId = :userId', { userId: user.id })
        .getMany();

      this.assertHoldsPayable(holds, holdIds);

      const { showtimeId } = holds[0];
      const { basePrice } = await manager.findOneOrFail(Showtime, {
        where: { id: showtimeId },
      });

      // BR-36: priced here, from the showtime row — never from the request.
      const amountCents = Math.round(basePrice * 100) * holds.length;
      if (amountCents < MIN_AMOUNT_CENTS) {
        throw new AppException(
          ErrorCode.PAYMENT_AMOUNT_TOO_SMALL,
          'This booking is below the minimum card payment',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const pending = await this.paymentsService.findPendingOverlapping(
        manager,
        user.id,
        holdIds,
      );

      // A retry of the same request — after a timeout or a 502 — resumes the
      // same payment, so Stripe's idempotency key returns the same
      // PaymentIntent instead of charging twice.
      const resumable = pending.find(
        (candidate) =>
          candidate.paymentMethodId === paymentMethodId &&
          sameHolds(candidate.holdIds, holdIds),
      );
      if (resumable && pending.length === 1) {
        return resumable;
      }
      if (pending.length) {
        throw new AppException(
          ErrorCode.PAYMENT_IN_PROGRESS,
          'A payment for these seats is already in progress',
          HttpStatus.CONFLICT,
        );
      }

      return this.paymentsService.createPending(manager, {
        userId: user.id,
        showtimeId,
        holdIds,
        amountCents,
        currency: CURRENCY,
        paymentMethodId,
        cardBrand: card.brand,
        cardLast4: card.last4,
      });
    });

    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent = await this.stripe.createPaymentIntent({
        amountCents: payment.amountCents,
        currency: payment.currency,
        customerId: card.customerId,
        paymentMethodId,
        paymentId: payment.id,
      });
    } catch (error) {
      if (!isPaymentDecline(error)) {
        // No answer from Stripe: the row stays pending, and a retry resumes
        // it or the webhook settles it if the charge did go through.
        throw error;
      }

      const message = error.message || undefined;
      await this.paymentsService.settleFailed(
        payment.id,
        error.payment_intent?.id ?? null,
        error.decline_code ?? error.code ?? null,
        message ?? 'The payment was declined',
      );
      throw this.paymentsService.paymentFailed(message);
    }

    return this.resolve(payment, paymentIntent);
  }

  // The client polls this after 3-D Secure. A pending payment asks Stripe
  // directly, so a challenge finished on the device is settled even before
  // the webhook arrives.
  async findStatus(
    user: AuthenticatedUser,
    paymentId: string,
  ): Promise<PaymentResponseDto> {
    let payment = await this.paymentsService.findOwned(user.id, paymentId);

    if (
      payment.status === PaymentStatus.PENDING &&
      payment.stripePaymentIntentId
    ) {
      await this.reconcile(payment.stripePaymentIntentId);
      payment = await this.paymentsService.findOwned(user.id, paymentId);
    }

    return this.paymentsService.toResponse(payment);
  }

  // ADR-018 rule 4: settle whatever the synchronous path and the poll did
  // not. Every other event, and any PaymentIntent that is not one of our
  // checkouts, is acknowledged and ignored.
  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    if (
      event.type !== 'payment_intent.succeeded' &&
      event.type !== 'payment_intent.payment_failed' &&
      event.type !== 'payment_intent.canceled'
    ) {
      return;
    }

    await this.settleFromPaymentIntent(event.data.object);
  }

  // DDR-025: the one idempotent settle, shared by the synchronous path, the
  // poll and the webhook. The payment row is locked first, then DDR-002 locks
  // the holds — one lock order for every path. A second call for the same
  // payment is a no-op.
  async finalize(
    paymentId: string,
    paymentIntentId: string,
  ): Promise<Finalized> {
    let charged: Payment | undefined;

    try {
      return await withUniViolentRetry(() =>
        this.dataSource.transaction(async (manager) => {
          const payment = await this.paymentsService.lock(manager, paymentId);
          charged = payment;

          if (payment.status !== PaymentStatus.PENDING) {
            return { payment };
          }

          const reservation = await this.reservationsService.confirmHolds(
            manager,
            {
              holdIds: payment.holdIds,
              userId: payment.userId,
              showtimeId: payment.showtimeId,
              unitPrice: payment.amountCents / payment.holdIds.length / 100,
            },
          );

          const settled = await this.paymentsService.markSucceeded(
            manager,
            payment,
            paymentIntentId,
            reservation.id,
          );

          return { payment: settled, reservation };
        }),
      );
    } catch (error) {
      if (!charged || !isLapsedHoldError(error)) {
        throw error;
      }

      // The transaction rolled back — nothing was written. The card was
      // charged for seats we can no longer give, so the money goes back. If
      // this refund call fails the row stays pending, and the next poll or
      // webhook redelivery refunds it with the same idempotency key.
      const refund = await this.stripe.createRefund(paymentIntentId, paymentId);
      this.logger.warn(
        `Payment ${paymentId} refunded: holds lapsed before confirmation`,
      );

      const payment = await this.paymentsService.settleRefunded(
        paymentId,
        paymentIntentId,
        refund.id,
        error.errorCode,
        HOLDS_LAPSED_MESSAGE,
      );
      return { payment };
    }
  }

  private async resolve(
    payment: Payment,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<CheckoutResponseDto> {
    const paymentId = payment.id;

    switch (paymentIntent.status) {
      case 'succeeded': {
        const settled = await this.finalize(paymentId, paymentIntent.id);
        return this.toSucceeded(settled);
      }
      case 'requires_action':
        await this.paymentsService.attachPaymentIntent(
          paymentId,
          paymentIntent.id,
        );
        return {
          status: CheckoutStatus.REQUIRES_ACTION,
          paymentId,
          clientSecret: paymentIntent.client_secret!,
        };
      case 'processing':
        await this.paymentsService.attachPaymentIntent(
          paymentId,
          paymentIntent.id,
        );
        return { status: CheckoutStatus.PROCESSING, paymentId };
      default: {
        const { code, message } =
          this.paymentsService.describeFailure(paymentIntent);
        await this.paymentsService.settleFailed(
          paymentId,
          paymentIntent.id,
          code,
          message,
        );
        throw this.paymentsService.paymentFailed(message);
      }
    }
  }

  // A resumed payment may already be settled by the webhook; answer with
  // what actually happened to it.
  private toSucceeded({
    payment,
    reservation,
  }: Finalized): CheckoutResponseDto {
    switch (payment.status) {
      case PaymentStatus.SUCCEEDED:
        return {
          status: CheckoutStatus.SUCCEEDED,
          paymentId: payment.id,
          reservation,
        };
      case PaymentStatus.REFUNDED:
        throw new AppException(
          ErrorCode.PAYMENT_REFUNDED,
          payment.failureMessage ?? HOLDS_LAPSED_MESSAGE,
          HttpStatus.CONFLICT,
        );
      case PaymentStatus.FAILED:
        throw this.paymentsService.paymentFailed(
          payment.failureMessage ?? undefined,
        );
      default:
        return { status: CheckoutStatus.PROCESSING, paymentId: payment.id };
    }
  }

  // A provider outage leaves the row as it is rather than failing the poll.
  private async reconcile(paymentIntentId: string): Promise<void> {
    try {
      const paymentIntent =
        await this.stripe.retrievePaymentIntent(paymentIntentId);
      await this.settleFromPaymentIntent(paymentIntent);
    } catch (error) {
      if (error instanceof AppException) {
        return;
      }
      throw error;
    }
  }

  // Shared by the webhook and reconcile: settle a payment from whatever state
  // its PaymentIntent is in now.
  private async settleFromPaymentIntent(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<void> {
    const payment =
      await this.paymentsService.findForPaymentIntent(paymentIntent);
    if (!payment || payment.status !== PaymentStatus.PENDING) {
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      await this.finalize(payment.id, paymentIntent.id);
      return;
    }

    if (FAILED_INTENT_STATUSES.has(paymentIntent.status)) {
      const { code, message } =
        this.paymentsService.describeFailure(paymentIntent);
      await this.paymentsService.settleFailed(
        payment.id,
        paymentIntent.id,
        code,
        message,
      );
      return;
    }

    await this.paymentsService.attachPaymentIntent(
      payment.id,
      paymentIntent.id,
    );
  }

  // The same checks DDR-002 makes, before any money moves — so a checkout for
  // a lapsed or foreign hold fails without touching the card.
  private assertHoldsPayable(holds: SeatHold[], holdIds: string[]): void {
    if (holds.length !== holdIds.length) {
      throw new AppException(
        ErrorCode.SEAT_HOLD_NOT_OWNED,
        'One or more holds do not belong to you',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      holds.some(
        (hold) =>
          hold.status !== SeatHoldStatus.HELD || hold.heldUntil < new Date(),
      )
    ) {
      throw new AppException(
        ErrorCode.SEAT_HOLD_EXPIRED,
        'One or more holds are no longer held',
        HttpStatus.CONFLICT,
      );
    }

    const { showtimeId } = holds[0];
    if (holds.some((hold) => hold.showtimeId !== showtimeId)) {
      throw new BadRequestException(
        'All holds in a reservation must belong to the same showtime',
      );
    }
  }
}

function sameHolds(a: string[], b: string[]): boolean {
  const set = new Set(a);
  return a.length === b.length && b.every((id) => set.has(id));
}

function isLapsedHoldError(error: unknown): error is AppException {
  return (
    error instanceof AppException && LAPSED_HOLD_CODES.has(error.errorCode)
  );
}
