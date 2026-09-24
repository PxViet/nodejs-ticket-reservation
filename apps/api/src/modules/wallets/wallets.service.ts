import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isUUID } from 'class-validator';
import type Stripe from 'stripe';
import { EntityManager, IsNull, Repository } from 'typeorm';

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
  CreateTopUpDto,
  TopUpDetailResponseDto,
  TopUpResponseDto,
} from './dto/top-up.dto';
import type {
  WalletResponseDto,
  WalletTransactionListQueryDto,
  WalletTransactionResponseDto,
} from './dto/wallet.dto';
import { TokenPackage } from './entities/token-package.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { TopUpStatus } from './enums/top-up-status.enum';
import { WalletTransactionStatus } from './enums/wallet-transaction-status.enum';
import { WalletTransactionType } from './enums/wallet-transaction-type.enum';
import { isPaymentDecline, StripeService } from './stripe.service';
import { toTokenPackageResponse } from './token-packages.service';

const DEFAULT_DECLINE_MESSAGE = 'The payment was declined';

// PaymentIntent states after which the payment can no longer succeed without
// a new confirmation — the ledger row is settled as failed.
const FAILED_INTENT_STATUSES = new Set<Stripe.PaymentIntent.Status>([
  'requires_payment_method',
  'canceled',
]);

interface SettledTopUp {
  transaction: WalletTransaction;
  balance: number;
}

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(Wallet) private readonly wallets: Repository<Wallet>,
    @InjectRepository(WalletTransaction)
    private readonly transactions: Repository<WalletTransaction>,
    @InjectRepository(TokenPackage)
    private readonly tokenPackages: Repository<TokenPackage>,
    private readonly stripe: StripeService,
  ) {}

  // BR-39: runs inside the caller's transaction, so a user never exists
  // without a wallet — AuthService.register() and the admin seed.
  createForUser(manager: EntityManager, userId: string): Promise<Wallet> {
    return manager.save(Wallet, manager.create(Wallet, { userId }));
  }

  async getMine(userId: string): Promise<WalletResponseDto> {
    const wallet = await this.findByUserId(userId);

    return {
      id: wallet.id,
      balance: wallet.balance,
      hasPaymentMethod: await this.hasPaymentMethod(wallet),
    };
  }

  async findTransactions(
    userId: string,
    { page, limit, skip, type, status }: WalletTransactionListQueryDto,
  ): Promise<PaginatedResponseDto<WalletTransactionResponseDto>> {
    const wallet = await this.findByUserId(userId);

    const qb = this.transactions
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.tokenPackage', 'tokenPackage')
      .where('transaction.walletId = :walletId', { walletId: wallet.id })
      .orderBy('transaction.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (type) {
      qb.andWhere('transaction.type = :type', { type });
    }
    if (status) {
      qb.andWhere('transaction.status = :status', { status });
    }

    const [transactions, total] = await qb.getManyAndCount();

    return {
      data: transactions.map((transaction) =>
        this.toTransactionResponse(transaction),
      ),
      meta: {
        page,
        limit,
        total,
        hasMore: skip + transactions.length < total,
      },
    };
  }

  // ADR-017 rule 1: the card is entered in Stripe's sheet on the device; we
  // hand out only what that sheet needs.
  async createSetupIntent({
    id: userId,
    email,
  }: AuthenticatedUser): Promise<SetupIntentResponseDto> {
    const wallet = await this.findByUserId(userId);
    const customerId = await this.ensureStripeCustomer(wallet, email);

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
    const { stripeCustomerId } = await this.findByUserId(userId);
    const cards = stripeCustomerId
      ? await this.stripe.listCards(stripeCustomerId)
      : [];

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

  async topUp(
    userId: string,
    { tokenPackageId, paymentMethodId }: CreateTopUpDto,
  ): Promise<TopUpResponseDto> {
    const wallet = await this.findByUserId(userId);

    const tokenPackage = await this.tokenPackages.findOne({
      where: { id: tokenPackageId, isActive: true },
    });
    if (!tokenPackage) {
      throw new AppException(
        ErrorCode.TOKEN_PACKAGE_NOT_FOUND,
        'This token package does not exist or is no longer available',
        HttpStatus.NOT_FOUND,
      );
    }

    const customerId = await this.assertOwnPaymentMethod(
      wallet,
      paymentMethodId,
    );

    const transaction = await this.transactions.save(
      this.transactions.create({
        walletId: wallet.id,
        type: WalletTransactionType.TOP_UP,
        status: WalletTransactionStatus.PENDING,
        tokens: tokenPackage.tokens,
        amountCents: tokenPackage.priceCents,
        currency: tokenPackage.currency,
        tokenPackageId: tokenPackage.id,
      }),
    );

    let paymentIntent: Stripe.PaymentIntent;

    try {
      paymentIntent = await this.stripe.createPaymentIntent({
        amountCents: tokenPackage.priceCents,
        currency: tokenPackage.currency,
        customerId,
        paymentMethodId,
        walletId: wallet.id,
        transactionId: transaction.id,
      });
    } catch (error) {
      if (!isPaymentDecline(error)) {
        // No answer from Stripe: the row stays pending, and the webhook
        // settles it if the charge did go through.
        throw error;
      }

      const message = error.message || DEFAULT_DECLINE_MESSAGE;
      await this.settleFailed(
        transaction.id,
        error.payment_intent?.id ?? null,
        error.decline_code ?? error.code ?? null,
        message,
      );
      throw this.paymentFailed(message);
    }

    return this.resolveTopUp({ ...transaction, tokenPackage }, paymentIntent);
  }

  async findTopUp(userId: string, id: string): Promise<TopUpDetailResponseDto> {
    const wallet = await this.findByUserId(userId);

    let transaction = isUUID(id)
      ? await this.transactions.findOne({
          where: {
            id,
            walletId: wallet.id,
            type: WalletTransactionType.TOP_UP,
          },
        })
      : null;

    if (!transaction) {
      throw new AppException(
        ErrorCode.TOP_UP_NOT_FOUND,
        'Top-up not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      transaction.status === WalletTransactionStatus.PENDING &&
      transaction.stripePaymentIntentId
    ) {
      transaction = await this.reconcile(transaction);
    }

    const { balance } = await this.wallets.findOneByOrFail({ id: wallet.id });

    return {
      id: transaction.id,
      status: transaction.status,
      tokens: transaction.tokens,
      amountCents: transaction.amountCents!,
      currency: transaction.currency!,
      failureMessage: transaction.failureMessage ?? undefined,
      balance,
    };
  }

  // ADR-017 rule 4: payment_intent.succeeded and payment_intent.payment_failed
  // settle whatever the synchronous path did not. Every other event, and any
  // PaymentIntent that is not one of our top-ups, is acknowledged and ignored.
  async handleStripeEvent(event: Stripe.Event): Promise<void> {
    if (
      event.type !== 'payment_intent.succeeded' &&
      event.type !== 'payment_intent.payment_failed'
    ) {
      return;
    }

    await this.settleFromPaymentIntent(event.data.object);
  }

  // DDR-024 / BR-37: lock the ledger row, return unchanged unless it is
  // pending, then lock the wallet and credit it in the same transaction. A
  // second call for the same row — the webhook after the synchronous path,
  // or the reverse — is a no-op.
  settleSucceeded(
    transactionId: string,
    paymentIntentId: string,
  ): Promise<SettledTopUp> {
    return this.transactions.manager.transaction(async (manager) => {
      const transaction = await this.lockTransaction(manager, transactionId);

      if (transaction.status !== WalletTransactionStatus.PENDING) {
        const { balance } = await manager.findOneByOrFail(Wallet, {
          id: transaction.walletId,
        });
        return { transaction, balance };
      }

      const wallet = await manager
        .getRepository(Wallet)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.id = :id', { id: transaction.walletId })
        .getOneOrFail();

      // DDR-024: the one code path that writes wallets.balance.
      const balance = wallet.balance + transaction.tokens;
      await manager.update(Wallet, wallet.id, { balance });

      const settled = {
        status: WalletTransactionStatus.SUCCEEDED,
        stripePaymentIntentId: paymentIntentId,
      };
      await manager.update(WalletTransaction, transaction.id, settled);

      return { transaction: { ...transaction, ...settled }, balance };
    });
  }

  // BR-40: same guard as settleSucceeded — a terminal row never moves.
  settleFailed(
    transactionId: string,
    paymentIntentId: string | null,
    failureCode: string | null,
    failureMessage: string,
  ): Promise<WalletTransaction> {
    return this.transactions.manager.transaction(async (manager) => {
      const transaction = await this.lockTransaction(manager, transactionId);

      if (transaction.status !== WalletTransactionStatus.PENDING) {
        return transaction;
      }

      const settled = {
        status: WalletTransactionStatus.FAILED,
        stripePaymentIntentId:
          paymentIntentId ?? transaction.stripePaymentIntentId,
        failureCode,
        failureMessage,
      };
      await manager.update(WalletTransaction, transaction.id, settled);

      return { ...transaction, ...settled };
    });
  }

  private async resolveTopUp(
    transaction: WalletTransaction,
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<TopUpResponseDto> {
    const transactionId = transaction.id;

    switch (paymentIntent.status) {
      case 'succeeded': {
        const settled = await this.settleSucceeded(
          transactionId,
          paymentIntent.id,
        );
        return {
          status: TopUpStatus.SUCCEEDED,
          transactionId,
          transaction: this.toTransactionResponse({
            ...settled.transaction,
            tokenPackage: transaction.tokenPackage,
          }),
          balance: settled.balance,
        };
      }
      case 'requires_action':
        await this.attachPaymentIntent(transactionId, paymentIntent.id);
        return {
          status: TopUpStatus.REQUIRES_ACTION,
          transactionId,
          clientSecret: paymentIntent.client_secret!,
        };
      case 'processing':
        await this.attachPaymentIntent(transactionId, paymentIntent.id);
        return { status: TopUpStatus.PENDING, transactionId };
      default: {
        const { code, message } = this.describeFailure(paymentIntent);
        await this.settleFailed(transactionId, paymentIntent.id, code, message);
        throw this.paymentFailed(message);
      }
    }
  }

  // Polling a pending top-up asks Stripe directly, so a 3-D Secure challenge
  // finished on the device is credited even before the webhook arrives. A
  // provider outage here leaves the row as it is rather than failing the poll.
  private async reconcile(
    transaction: WalletTransaction,
  ): Promise<WalletTransaction> {
    try {
      const paymentIntent = await this.stripe.retrievePaymentIntent(
        transaction.stripePaymentIntentId!,
      );
      return (await this.settleFromPaymentIntent(paymentIntent)) ?? transaction;
    } catch (error) {
      if (error instanceof AppException) {
        return transaction;
      }
      throw error;
    }
  }

  // Shared by the webhook and reconcile: settle a ledger row from whatever
  // state its PaymentIntent is in now. Returns null if it is not our top-up.
  private async settleFromPaymentIntent(
    paymentIntent: Stripe.PaymentIntent,
  ): Promise<WalletTransaction | null> {
    const transaction = await this.findTransactionFor(paymentIntent);
    if (!transaction) {
      return null;
    }

    if (paymentIntent.status === 'succeeded') {
      const { transaction: settled } = await this.settleSucceeded(
        transaction.id,
        paymentIntent.id,
      );
      return settled;
    }

    if (FAILED_INTENT_STATUSES.has(paymentIntent.status)) {
      const { code, message } = this.describeFailure(paymentIntent);
      return this.settleFailed(transaction.id, paymentIntent.id, code, message);
    }

    return transaction;
  }

  // The ledger id travels in the PaymentIntent's metadata, so the webhook can
  // find its row even if it arrives before the synchronous path recorded the
  // PaymentIntent id. A row already tied to a different PaymentIntent, or
  // with a different amount, is never settled from this one.
  private async findTransactionFor({
    id,
    metadata,
    amount,
    currency,
  }: Stripe.PaymentIntent): Promise<WalletTransaction | null> {
    const transactionId = metadata?.walletTransactionId;

    const transaction =
      transactionId && isUUID(transactionId)
        ? await this.transactions.findOneBy({ id: transactionId })
        : await this.transactions.findOneBy({ stripePaymentIntentId: id });

    if (!transaction) {
      return null;
    }

    if (
      (transaction.stripePaymentIntentId &&
        transaction.stripePaymentIntentId !== id) ||
      transaction.amountCents !== amount ||
      transaction.currency !== currency
    ) {
      this.logger.warn(
        `PaymentIntent ${id} does not match wallet transaction ${transaction.id}; not settling`,
      );
      return null;
    }

    return transaction;
  }

  private attachPaymentIntent(
    transactionId: string,
    paymentIntentId: string,
  ): Promise<unknown> {
    return this.transactions.update(
      { id: transactionId, status: WalletTransactionStatus.PENDING },
      { stripePaymentIntentId: paymentIntentId },
    );
  }

  private lockTransaction(
    manager: EntityManager,
    id: string,
  ): Promise<WalletTransaction> {
    return manager
      .getRepository(WalletTransaction)
      .createQueryBuilder('transaction')
      .setLock('pessimistic_write')
      .where('transaction.id = :id', { id })
      .getOneOrFail();
  }

  // ADR-017: the Customer is created lazily, on the first add-card. Stripe's
  // idempotency key makes a concurrent first request return the same
  // Customer, and the IS NULL guard makes only one of them write it.
  private async ensureStripeCustomer(
    wallet: Wallet,
    email: string,
  ): Promise<string> {
    if (wallet.stripeCustomerId) {
      return wallet.stripeCustomerId;
    }

    const customer = await this.stripe.createCustomer(wallet.id, email);

    const { affected } = await this.wallets.update(
      { id: wallet.id, stripeCustomerId: IsNull() },
      { stripeCustomerId: customer.id },
    );
    if (affected) {
      return customer.id;
    }

    const { stripeCustomerId } = await this.wallets.findOneByOrFail({
      id: wallet.id,
    });
    return stripeCustomerId!;
  }

  // BR-38: the card must belong to the caller's own Stripe Customer, which is
  // resolved from the authenticated user. Unknown and someone else's are the
  // same answer, so the response reveals nothing about other customers.
  private async assertOwnPaymentMethod(
    { stripeCustomerId }: Wallet,
    paymentMethodId: string,
  ): Promise<string> {
    const paymentMethod = stripeCustomerId
      ? await this.stripe.retrievePaymentMethod(paymentMethodId)
      : null;

    const owner =
      typeof paymentMethod?.customer === 'string'
        ? paymentMethod.customer
        : paymentMethod?.customer?.id;

    if (!stripeCustomerId || owner !== stripeCustomerId) {
      throw new AppException(
        ErrorCode.PAYMENT_METHOD_NOT_FOUND,
        'Payment method not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return stripeCustomerId;
  }

  // GET /wallet stays readable when Stripe is down — it reports no saved card
  // rather than failing the whole wallet screen.
  private async hasPaymentMethod({
    stripeCustomerId,
  }: Wallet): Promise<boolean> {
    if (!stripeCustomerId) {
      return false;
    }

    try {
      return await this.stripe.hasCard(stripeCustomerId);
    } catch (error) {
      if (error instanceof AppException) {
        return false;
      }
      throw error;
    }
  }

  private findByUserId(userId: string): Promise<Wallet> {
    return this.wallets.findOneByOrFail({ userId });
  }

  private describeFailure({ last_payment_error }: Stripe.PaymentIntent): {
    code: string | null;
    message: string;
  } {
    return {
      code:
        last_payment_error?.decline_code ?? last_payment_error?.code ?? null,
      message: last_payment_error?.message ?? DEFAULT_DECLINE_MESSAGE,
    };
  }

  private paymentFailed(message: string): AppException {
    return new AppException(
      ErrorCode.PAYMENT_FAILED,
      message,
      HttpStatus.PAYMENT_REQUIRED,
    );
  }

  private toTransactionResponse(
    transaction: WalletTransaction,
  ): WalletTransactionResponseDto {
    const {
      id,
      type,
      status,
      tokens,
      amountCents,
      currency,
      tokenPackage,
      failureMessage,
      createdAt,
    } = transaction;

    return {
      id,
      type,
      status,
      tokens,
      amountCents,
      currency,
      tokenPackage: tokenPackage
        ? toTokenPackageResponse(tokenPackage)
        : undefined,
      failureMessage: failureMessage ?? undefined,
      createdAt,
    };
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
