import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import type Stripe from 'stripe';
import { EntityManager, Repository } from 'typeorm';

import type { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import type {
  PaymentMethodResponseDto,
  SetupIntentResponseDto,
} from './dto/payment-method.dto';
import type {
  PaymentListQueryDto,
  PaymentResponseDto,
} from './dto/payment.dto';
import { PaymentCustomer } from './entities/payment-customer.entity';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { StripeService } from './stripe.service';

const DEFAULT_DECLINE_MESSAGE = 'The payment was declined';

/** The caller's own card, as checked by assertOwnPaymentMethod (BR-38). */
export interface OwnedPaymentMethod {
  customerId: string;
  brand: string | null;
  last4: string | null;
}

export interface CreatePendingPaymentParams {
  userId: string;
  showtimeId: string;
  holdIds: string[];
  amountCents: number;
  currency: string;
  paymentMethodId: string;
  cardBrand: string | null;
  cardLast4: string | null;
}

// ADR-018, DDR-025: Stripe customers, saved cards and the payments table.
// It knows nothing about reservations — ReservationsModule's CheckoutService
// drives it, passing its own EntityManager where a write must share a
// transaction with the reservation (the same pattern as ADR-001's rule that no
// module reaches into another's repositories).
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(PaymentCustomer)
    private readonly customers: Repository<PaymentCustomer>,
    private readonly stripe: StripeService,
  ) {}

  // ADR-018 rule 1: the card is entered in Stripe's PaymentSheet on the
  // device; we hand out only what that sheet needs.
  async createSetupIntent(
    user: AuthenticatedUser,
  ): Promise<SetupIntentResponseDto> {
    const customerId = await this.ensureCustomer(user);

    const [setupIntent, ephemeralKey] = await Promise.all([
      this.stripe.createSetupIntent(customerId),
      this.stripe.createEphemeralKey(customerId),
    ]);

    return {
      setupIntentClientSecret: setupIntent.client_secret!,
      ephemeralKeySecret: ephemeralKey.secret!,
      customerId,
      publishableKey: this.stripe.publishableKey,
    };
  }

  async listPaymentMethods(
    userId: string,
    { page, limit, skip }: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<PaymentMethodResponseDto>> {
    const customerId = await this.findCustomerId(userId);
    const cards = customerId ? await this.stripe.listCards(customerId) : [];

    const data = cards
      .slice(skip, skip + limit)
      .map((card) => this.toPaymentMethodResponse(card));

    return {
      data,
      meta: {
        page,
        limit,
        total: cards.length,
        hasMore: skip + data.length < cards.length,
      },
    };
  }

  async findMine(
    userId: string,
    { page, limit, skip, status }: PaymentListQueryDto,
  ): Promise<PaginatedResponseDto<PaymentResponseDto>> {
    const qb = this.payments
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.reservation', 'reservation')
      .where('payment.userId = :userId', { userId })
      .orderBy('payment.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (status) {
      qb.andWhere('payment.status = :status', { status });
    }

    const [payments, total] = await qb.getManyAndCount();

    return {
      data: payments.map((payment) => this.toResponse(payment)),
      meta: {
        page,
        limit,
        total,
        hasMore: skip + payments.length < total,
      },
    };
  }

  // Unknown and someone else's are the same answer (BR-34).
  async findOwned(userId: string, id: string): Promise<Payment> {
    const payment = isUUID(id)
      ? await this.payments.findOne({
          where: { id, userId },
          relations: { reservation: true },
        })
      : null;

    if (!payment) {
      throw new AppException(
        ErrorCode.PAYMENT_NOT_FOUND,
        'Payment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return payment;
  }

  // BR-38: the card must belong to the caller's own Stripe Customer, which is
  // resolved from the authenticated user. Unknown and someone else's are the
  // same answer, so the response reveals nothing about other customers.
  async assertOwnPaymentMethod(
    userId: string,
    paymentMethodId: string,
  ): Promise<OwnedPaymentMethod> {
    const customerId = await this.findCustomerId(userId);
    const paymentMethod = customerId
      ? await this.stripe.retrievePaymentMethod(paymentMethodId)
      : null;

    const owner =
      typeof paymentMethod?.customer === 'string'
        ? paymentMethod.customer
        : paymentMethod?.customer?.id;

    if (!customerId || owner !== customerId) {
      throw new AppException(
        ErrorCode.PAYMENT_METHOD_NOT_FOUND,
        'Payment method not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      customerId,
      brand: paymentMethod?.card?.brand ?? null,
      last4: paymentMethod?.card?.last4 ?? null,
    };
  }

  // DDR-025: a pending payment whose holds overlap these ones. Read inside
  // the caller's transaction, after its hold locks — so two checkouts for the
  // same seats serialise on the holds and the second sees the first's row.
  findPendingOverlapping(
    manager: EntityManager,
    userId: string,
    holdIds: string[],
  ): Promise<Payment[]> {
    return manager
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .where('payment.userId = :userId', { userId })
      .andWhere('payment.status = :status', { status: PaymentStatus.PENDING })
      .andWhere('payment.holdIds && :holdIds::uuid[]', { holdIds })
      .getMany();
  }

  createPending(
    manager: EntityManager,
    params: CreatePendingPaymentParams,
  ): Promise<Payment> {
    return manager.save(
      Payment,
      manager.create(Payment, { ...params, status: PaymentStatus.PENDING }),
    );
  }

  // DDR-025: every settle path locks the payment row first, then (via
  // DDR-002) the holds — one lock order, so the paths cannot deadlock.
  lock(manager: EntityManager, id: string): Promise<Payment> {
    return manager
      .getRepository(Payment)
      .createQueryBuilder('payment')
      .setLock('pessimistic_write')
      .where('payment.id = :id', { id })
      .getOneOrFail();
  }

  async markSucceeded(
    manager: EntityManager,
    payment: Payment,
    paymentIntentId: string,
    reservationId: string,
  ): Promise<Payment> {
    const settled = {
      status: PaymentStatus.SUCCEEDED,
      stripePaymentIntentId: paymentIntentId,
      reservationId,
    };
    await manager.update(Payment, payment.id, settled);

    return { ...payment, ...settled };
  }

  // BR-40: lock the row, return it unchanged unless it is pending.
  settleFailed(
    id: string,
    paymentIntentId: string | null,
    failureCode: string | null,
    failureMessage: string,
  ): Promise<Payment> {
    return this.settle(id, (payment) => ({
      status: PaymentStatus.FAILED,
      stripePaymentIntentId: paymentIntentId ?? payment.stripePaymentIntentId,
      failureCode,
      failureMessage,
    }));
  }

  settleRefunded(
    id: string,
    paymentIntentId: string,
    refundId: string,
    failureCode: string,
    failureMessage: string,
  ): Promise<Payment> {
    return this.settle(id, () => ({
      status: PaymentStatus.REFUNDED,
      stripePaymentIntentId: paymentIntentId,
      stripeRefundId: refundId,
      failureCode,
      failureMessage,
    }));
  }

  async attachPaymentIntent(
    id: string,
    paymentIntentId: string,
  ): Promise<void> {
    await this.payments.update(
      { id, status: PaymentStatus.PENDING },
      { stripePaymentIntentId: paymentIntentId },
    );
  }

  // The payment id travels in the PaymentIntent's metadata, so the webhook
  // can find its row even if it arrives before the synchronous path recorded
  // the PaymentIntent id. A row already tied to a different PaymentIntent, or
  // with a different amount, is never settled from this one.
  async findForPaymentIntent({
    id,
    metadata,
    amount,
    currency,
  }: Stripe.PaymentIntent): Promise<Payment | null> {
    const paymentId = metadata?.paymentId;

    const payment =
      paymentId && isUUID(paymentId)
        ? await this.payments.findOneBy({ id: paymentId })
        : await this.payments.findOneBy({ stripePaymentIntentId: id });

    if (!payment) {
      return null;
    }

    if (
      (payment.stripePaymentIntentId && payment.stripePaymentIntentId !== id) ||
      payment.amountCents !== amount ||
      payment.currency !== currency
    ) {
      this.logger.warn(
        `PaymentIntent ${id} does not match payment ${payment.id}; not settling`,
      );
      return null;
    }

    return payment;
  }

  describeFailure({ last_payment_error }: Stripe.PaymentIntent): {
    code: string | null;
    message: string;
  } {
    return {
      code:
        last_payment_error?.decline_code ?? last_payment_error?.code ?? null,
      message: last_payment_error?.message ?? DEFAULT_DECLINE_MESSAGE,
    };
  }

  paymentFailed(message: string = DEFAULT_DECLINE_MESSAGE): AppException {
    return new AppException(
      ErrorCode.PAYMENT_FAILED,
      message,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  toResponse(payment: Payment): PaymentResponseDto {
    const {
      id,
      status,
      amountCents,
      currency,
      cardBrand,
      cardLast4,
      showtimeId,
      holdIds,
      reservationId,
      reservation,
      failureMessage,
      createdAt,
    } = payment;

    return {
      id,
      status,
      amountCents,
      currency,
      cardBrand: cardBrand ?? undefined,
      cardLast4: cardLast4 ?? undefined,
      showtimeId,
      seatCount: holdIds.length,
      reservationId: reservationId ?? undefined,
      reservationNumber: reservation?.reservationNumber,
      failureMessage: failureMessage ?? undefined,
      createdAt,
    };
  }

  private settle(
    id: string,
    changes: (payment: Payment) => Partial<Payment>,
  ): Promise<Payment> {
    return this.payments.manager.transaction(async (manager) => {
      const payment = await this.lock(manager, id);

      if (payment.status !== PaymentStatus.PENDING) {
        return payment;
      }

      const settled = changes(payment);
      await manager.update(Payment, payment.id, settled);

      return { ...payment, ...settled };
    });
  }

  // DDR-025: the Customer is created lazily, on the first add-card. Stripe's
  // idempotency key makes a concurrent first request return the same
  // Customer, and ON CONFLICT makes only one of them write the row.
  private async ensureCustomer({
    id: userId,
    email,
  }: AuthenticatedUser): Promise<string> {
    const existing = await this.findCustomerId(userId);
    if (existing) {
      return existing;
    }

    const customer = await this.stripe.createCustomer(userId, email);

    await this.customers
      .createQueryBuilder()
      .insert()
      .values({ userId, stripeCustomerId: customer.id })
      .orIgnore()
      .execute();

    return (await this.findCustomerId(userId))!;
  }

  private async findCustomerId(userId: string): Promise<string | null> {
    const customer = await this.customers.findOneBy({ userId });
    return customer?.stripeCustomerId ?? null;
  }

  private toPaymentMethodResponse({
    id,
    card,
  }: Stripe.PaymentMethod): PaymentMethodResponseDto {
    return {
      id,
      brand: card?.brand ?? 'unknown',
      last4: card?.last4 ?? '',
      expMonth: card?.exp_month ?? 0,
      expYear: card?.exp_year ?? 0,
    };
  }
}
