import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import Stripe from 'stripe';

import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/exceptions/error-codes';
import { TokenPackage } from './entities/token-package.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { Wallet } from './entities/wallet.entity';
import { TopUpStatus } from './enums/top-up-status.enum';
import { WalletTransactionStatus } from './enums/wallet-transaction-status.enum';
import { WalletTransactionType } from './enums/wallet-transaction-type.enum';
import { StripeService } from './stripe.service';
import { WalletsService } from './wallets.service';

const TRANSACTION_ID = '11111111-1111-4111-8111-111111111111';
const PACKAGE_ID = '22222222-2222-4222-8222-222222222222';

function mockLockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  for (const method of ['setLock', 'where']) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getOneOrFail = jest.fn();
  return qb;
}

function mockManager() {
  const transactionQb = mockLockQueryBuilder();
  const walletQb = mockLockQueryBuilder();

  return {
    transactionQb,
    walletQb,
    getRepository: jest.fn((entity: unknown) => {
      if (entity === WalletTransaction) {
        return { createQueryBuilder: jest.fn().mockReturnValue(transactionQb) };
      }
      if (entity === Wallet) {
        return { createQueryBuilder: jest.fn().mockReturnValue(walletQb) };
      }
      throw new Error(`unexpected getRepository(${String(entity)})`);
    }),
    findOneByOrFail: jest.fn(),
    update: jest.fn(),
  };
}

function paymentIntent(
  overrides: Partial<Stripe.PaymentIntent> = {},
): Stripe.PaymentIntent {
  return {
    id: 'pi_1',
    status: 'succeeded',
    amount: 1000,
    currency: 'usd',
    client_secret: 'pi_1_secret',
    metadata: { walletTransactionId: TRANSACTION_ID },
    last_payment_error: null,
    ...overrides,
  } as Stripe.PaymentIntent;
}

describe('WalletsService', () => {
  let service: WalletsService;
  let manager: ReturnType<typeof mockManager>;
  let walletsRepo: Record<string, jest.Mock>;
  let transactionsRepo: Record<string, jest.Mock> & {
    manager: { transaction: jest.Mock };
  };
  let tokenPackagesRepo: Record<string, jest.Mock>;
  let stripe: Record<string, jest.Mock>;

  const wallet = (overrides: Partial<Wallet> = {}): Wallet =>
    ({
      id: 'wallet-1',
      userId: 'user-1',
      balance: 50,
      stripeCustomerId: 'cus_1',
      ...overrides,
    }) as Wallet;

  const tokenPackage = {
    id: PACKAGE_ID,
    code: 'POPULAR_250',
    name: 'Popular',
    tokens: 250,
    priceCents: 1000,
    currency: 'usd',
    isActive: true,
  } as TokenPackage;

  const pendingRow = (
    overrides: Partial<WalletTransaction> = {},
  ): WalletTransaction =>
    ({
      id: TRANSACTION_ID,
      walletId: 'wallet-1',
      type: WalletTransactionType.TOP_UP,
      status: WalletTransactionStatus.PENDING,
      tokens: 250,
      amountCents: 1000,
      currency: 'usd',
      tokenPackageId: PACKAGE_ID,
      stripePaymentIntentId: null,
      failureCode: null,
      failureMessage: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    }) as WalletTransaction;

  beforeEach(async () => {
    manager = mockManager();

    walletsRepo = {
      findOneByOrFail: jest.fn().mockResolvedValue(wallet()),
      update: jest.fn(),
    };
    transactionsRepo = {
      manager: {
        transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
      },
      create: jest.fn((data: unknown) => data),
      save: jest.fn((data: Partial<WalletTransaction>) =>
        Promise.resolve(pendingRow(data)),
      ),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
    };
    tokenPackagesRepo = {
      findOne: jest.fn().mockResolvedValue(tokenPackage),
    };
    stripe = {
      retrievePaymentMethod: jest
        .fn()
        .mockResolvedValue({ id: 'pm_1', customer: 'cus_1' }),
      createPaymentIntent: jest.fn().mockResolvedValue(paymentIntent()),
      retrievePaymentIntent: jest.fn(),
      createCustomer: jest.fn(),
      createSetupIntent: jest.fn(),
      createEphemeralKey: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        { provide: getRepositoryToken(Wallet), useValue: walletsRepo },
        {
          provide: getRepositoryToken(WalletTransaction),
          useValue: transactionsRepo,
        },
        {
          provide: getRepositoryToken(TokenPackage),
          useValue: tokenPackagesRepo,
        },
        { provide: StripeService, useValue: stripe },
      ],
    }).compile();

    service = module.get(WalletsService);
  });

  describe('topUp', () => {
    const dto = { tokenPackageId: PACKAGE_ID, paymentMethodId: 'pm_1' };

    it('rejects an unknown or inactive package', async () => {
      tokenPackagesRepo.findOne.mockResolvedValue(null);

      await expect(service.topUp('user-1', dto)).rejects.toMatchObject({
        errorCode: ErrorCode.TOKEN_PACKAGE_NOT_FOUND,
      });
      expect(tokenPackagesRepo.findOne).toHaveBeenCalledWith({
        where: { id: PACKAGE_ID, isActive: true },
      });
    });

    it('BR-38: rejects a card that belongs to another Stripe customer', async () => {
      stripe.retrievePaymentMethod.mockResolvedValue({
        id: 'pm_1',
        customer: 'cus_someone_else',
      });

      await expect(service.topUp('user-1', dto)).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_METHOD_NOT_FOUND,
      });
      expect(transactionsRepo.save).not.toHaveBeenCalled();
      expect(stripe.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('rejects any card when the wallet has no Stripe customer yet', async () => {
      walletsRepo.findOneByOrFail.mockResolvedValue(
        wallet({ stripeCustomerId: null }),
      );

      await expect(service.topUp('user-1', dto)).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_METHOD_NOT_FOUND,
      });
      expect(stripe.retrievePaymentMethod).not.toHaveBeenCalled();
    });

    it('BR-36: prices the charge from the package row and commits a pending row first', async () => {
      manager.transactionQb.getOneOrFail.mockResolvedValue(pendingRow());
      manager.walletQb.getOneOrFail.mockResolvedValue(wallet());

      await service.topUp('user-1', dto);

      expect(transactionsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: WalletTransactionStatus.PENDING,
          tokens: 250,
          amountCents: 1000,
          currency: 'usd',
        }),
      );
      expect(transactionsRepo.save.mock.invocationCallOrder[0]).toBeLessThan(
        stripe.createPaymentIntent.mock.invocationCallOrder[0],
      );
      expect(stripe.createPaymentIntent).toHaveBeenCalledWith({
        amountCents: 1000,
        currency: 'usd',
        customerId: 'cus_1',
        paymentMethodId: 'pm_1',
        walletId: 'wallet-1',
        transactionId: TRANSACTION_ID,
      });
    });

    it('credits the wallet and returns succeeded when Stripe charges immediately', async () => {
      manager.transactionQb.getOneOrFail.mockResolvedValue(pendingRow());
      manager.walletQb.getOneOrFail.mockResolvedValue(wallet());

      const result = await service.topUp('user-1', dto);

      expect(manager.update).toHaveBeenCalledWith(Wallet, 'wallet-1', {
        balance: 300,
      });
      expect(manager.update).toHaveBeenCalledWith(
        WalletTransaction,
        TRANSACTION_ID,
        {
          status: WalletTransactionStatus.SUCCEEDED,
          stripePaymentIntentId: 'pi_1',
        },
      );
      expect(result).toMatchObject({
        status: TopUpStatus.SUCCEEDED,
        transactionId: TRANSACTION_ID,
        balance: 300,
        transaction: {
          status: WalletTransactionStatus.SUCCEEDED,
          tokenPackage: { id: PACKAGE_ID, code: 'POPULAR_250' },
        },
      });
    });

    it('returns requires_action with the client secret for 3-D Secure, leaving the row pending', async () => {
      stripe.createPaymentIntent.mockResolvedValue(
        paymentIntent({ status: 'requires_action' }),
      );

      const result = await service.topUp('user-1', dto);

      expect(result).toEqual({
        status: TopUpStatus.REQUIRES_ACTION,
        transactionId: TRANSACTION_ID,
        clientSecret: 'pi_1_secret',
      });
      expect(transactionsRepo.update).toHaveBeenCalledWith(
        { id: TRANSACTION_ID, status: WalletTransactionStatus.PENDING },
        { stripePaymentIntentId: 'pi_1' },
      );
      expect(transactionsRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('settles the row as failed and answers 402 when the card is declined', async () => {
      manager.transactionQb.getOneOrFail.mockResolvedValue(pendingRow());
      stripe.createPaymentIntent.mockRejectedValue(
        new Stripe.errors.StripeCardError({
          type: 'card_error',
          message: 'Your card has insufficient funds.',
          code: 'card_declined',
          decline_code: 'insufficient_funds',
          payment_intent: { id: 'pi_declined' },
        } as never),
      );

      const error = (await service
        .topUp('user-1', dto)
        .catch((e: unknown) => e)) as AppException;

      expect(error.errorCode).toBe(ErrorCode.PAYMENT_FAILED);
      expect(error.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      expect(error.message).toBe('Your card has insufficient funds.');
      expect(manager.update).toHaveBeenCalledWith(
        WalletTransaction,
        TRANSACTION_ID,
        {
          status: WalletTransactionStatus.FAILED,
          stripePaymentIntentId: 'pi_declined',
          failureCode: 'insufficient_funds',
          failureMessage: 'Your card has insufficient funds.',
        },
      );
      expect(manager.update).not.toHaveBeenCalledWith(
        Wallet,
        expect.anything(),
        expect.anything(),
      );
    });

    it('leaves the row pending for the webhook when Stripe gives no answer', async () => {
      const unavailable = new AppException(
        ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE,
        'down',
        HttpStatus.BAD_GATEWAY,
      );
      stripe.createPaymentIntent.mockRejectedValue(unavailable);

      await expect(service.topUp('user-1', dto)).rejects.toBe(unavailable);
      expect(transactionsRepo.manager.transaction).not.toHaveBeenCalled();
    });
  });

  describe('settleSucceeded', () => {
    it('BR-37: is a no-op for a row that is already settled', async () => {
      manager.transactionQb.getOneOrFail.mockResolvedValue(
        pendingRow({ status: WalletTransactionStatus.SUCCEEDED }),
      );
      manager.findOneByOrFail.mockResolvedValue(wallet({ balance: 300 }));

      const result = await service.settleSucceeded(TRANSACTION_ID, 'pi_1');

      expect(result.balance).toBe(300);
      expect(manager.walletQb.getOneOrFail).not.toHaveBeenCalled();
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('locks the ledger row before the wallet', async () => {
      manager.transactionQb.getOneOrFail.mockResolvedValue(pendingRow());
      manager.walletQb.getOneOrFail.mockResolvedValue(wallet());

      await service.settleSucceeded(TRANSACTION_ID, 'pi_1');

      expect(manager.transactionQb.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(manager.walletQb.setLock).toHaveBeenCalledWith(
        'pessimistic_write',
      );
      expect(
        manager.transactionQb.getOneOrFail.mock.invocationCallOrder[0],
      ).toBeLessThan(manager.walletQb.getOneOrFail.mock.invocationCallOrder[0]);
    });
  });

  describe('settleFailed', () => {
    it('BR-40: never moves a succeeded row to failed', async () => {
      manager.transactionQb.getOneOrFail.mockResolvedValue(
        pendingRow({ status: WalletTransactionStatus.SUCCEEDED }),
      );

      await service.settleFailed(TRANSACTION_ID, 'pi_1', 'x', 'declined');

      expect(manager.update).not.toHaveBeenCalled();
    });
  });

  describe('handleStripeEvent', () => {
    const event = (type: string, object: Stripe.PaymentIntent) =>
      ({ type, data: { object } }) as Stripe.Event;

    it('credits the top-up named in the metadata on payment_intent.succeeded', async () => {
      transactionsRepo.findOneBy.mockResolvedValue(pendingRow());
      manager.transactionQb.getOneOrFail.mockResolvedValue(pendingRow());
      manager.walletQb.getOneOrFail.mockResolvedValue(wallet());

      await service.handleStripeEvent(
        event('payment_intent.succeeded', paymentIntent()),
      );

      expect(transactionsRepo.findOneBy).toHaveBeenCalledWith({
        id: TRANSACTION_ID,
      });
      expect(manager.update).toHaveBeenCalledWith(Wallet, 'wallet-1', {
        balance: 300,
      });
    });

    it('settles as failed on payment_intent.payment_failed', async () => {
      transactionsRepo.findOneBy.mockResolvedValue(pendingRow());
      manager.transactionQb.getOneOrFail.mockResolvedValue(pendingRow());

      await service.handleStripeEvent(
        event(
          'payment_intent.payment_failed',
          paymentIntent({
            status: 'requires_payment_method',
            last_payment_error: {
              code: 'card_declined',
              message: 'Your card was declined.',
            } as Stripe.PaymentIntent.LastPaymentError,
          }),
        ),
      );

      expect(manager.update).toHaveBeenCalledWith(
        WalletTransaction,
        TRANSACTION_ID,
        expect.objectContaining({
          status: WalletTransactionStatus.FAILED,
          failureMessage: 'Your card was declined.',
        }),
      );
    });

    it('does not settle a row whose amount differs from the PaymentIntent', async () => {
      transactionsRepo.findOneBy.mockResolvedValue(pendingRow());

      await service.handleStripeEvent(
        event('payment_intent.succeeded', paymentIntent({ amount: 1 })),
      );

      expect(transactionsRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('ignores a PaymentIntent that is not one of our top-ups', async () => {
      transactionsRepo.findOneBy.mockResolvedValue(null);

      await service.handleStripeEvent(
        event('payment_intent.succeeded', paymentIntent({ metadata: {} })),
      );

      expect(transactionsRepo.findOneBy).toHaveBeenCalledWith({
        stripePaymentIntentId: 'pi_1',
      });
      expect(transactionsRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('acknowledges and ignores unrelated event types', async () => {
      await service.handleStripeEvent({
        type: 'customer.created',
      } as Stripe.Event);

      expect(transactionsRepo.findOneBy).not.toHaveBeenCalled();
    });
  });

  describe('findTopUp', () => {
    it('answers TOP_UP_NOT_FOUND for an id that is not a uuid', async () => {
      await expect(
        service.findTopUp('user-1', 'not-a-uuid'),
      ).rejects.toMatchObject({ errorCode: ErrorCode.TOP_UP_NOT_FOUND });
      expect(transactionsRepo.findOne).not.toHaveBeenCalled();
    });

    it("scopes the lookup to the caller's own wallet", async () => {
      transactionsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findTopUp('user-1', TRANSACTION_ID),
      ).rejects.toMatchObject({ errorCode: ErrorCode.TOP_UP_NOT_FOUND });
      expect(transactionsRepo.findOne).toHaveBeenCalledWith({
        where: {
          id: TRANSACTION_ID,
          walletId: 'wallet-1',
          type: WalletTransactionType.TOP_UP,
        },
      });
    });

    it('reconciles a pending top-up against Stripe and credits it', async () => {
      transactionsRepo.findOne.mockResolvedValue(
        pendingRow({ stripePaymentIntentId: 'pi_1' }),
      );
      stripe.retrievePaymentIntent.mockResolvedValue(paymentIntent());
      transactionsRepo.findOneBy.mockResolvedValue(
        pendingRow({ stripePaymentIntentId: 'pi_1' }),
      );
      manager.transactionQb.getOneOrFail.mockResolvedValue(pendingRow());
      manager.walletQb.getOneOrFail.mockResolvedValue(wallet());
      walletsRepo.findOneByOrFail
        .mockResolvedValueOnce(wallet())
        .mockResolvedValueOnce(wallet({ balance: 300 }));

      const result = await service.findTopUp('user-1', TRANSACTION_ID);

      expect(result).toMatchObject({
        status: WalletTransactionStatus.SUCCEEDED,
        balance: 300,
      });
    });
  });

  describe('createSetupIntent', () => {
    it('creates the Stripe customer lazily and stores it only if still unset', async () => {
      walletsRepo.findOneByOrFail.mockResolvedValue(
        wallet({ stripeCustomerId: null }),
      );
      stripe.createCustomer.mockResolvedValue({ id: 'cus_new' });
      walletsRepo.update.mockResolvedValue({ affected: 1 });
      stripe.createSetupIntent.mockResolvedValue({ client_secret: 'seti_s' });
      stripe.createEphemeralKey.mockResolvedValue({ secret: 'ek_s' });

      const result = await service.createSetupIntent({
        id: 'user-1',
        email: 'a@example.com',
      } as never);

      expect(stripe.createCustomer).toHaveBeenCalledWith(
        'wallet-1',
        'a@example.com',
      );
      expect(walletsRepo.update).toHaveBeenCalledWith(
        { id: 'wallet-1', stripeCustomerId: expect.anything() },
        { stripeCustomerId: 'cus_new' },
      );
      expect(result).toMatchObject({
        customerId: 'cus_new',
        setupIntentClientSecret: 'seti_s',
        ephemeralKeySecret: 'ek_s',
      });
    });
  });
});
