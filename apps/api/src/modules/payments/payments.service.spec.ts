import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type Stripe from 'stripe';

import { ErrorCode } from '../../common/exceptions/error-codes';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UserRole } from '../users/enums/user-role.enum';
import { PaymentCustomer } from './entities/payment-customer.entity';
import { Payment } from './entities/payment.entity';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';

function mockManager() {
  const qb: Record<string, jest.Mock> = {};
  for (const method of ['setLock', 'where']) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getOneOrFail = jest.fn();

  return {
    qb,
    getRepository: jest.fn(() => ({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    })),
    update: jest.fn(),
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let manager: ReturnType<typeof mockManager>;
  let paymentsRepo: {
    manager: { transaction: jest.Mock };
    findOneBy: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let customersRepo: Record<string, jest.Mock>;
  let insertQb: Record<string, jest.Mock>;
  let stripe: {
    publishableKey: string;
    createCustomer: jest.Mock;
    createSetupIntent: jest.Mock;
    createEphemeralKey: jest.Mock;
    listCards: jest.Mock;
    retrievePaymentMethod: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'a@example.com',
    role: UserRole.USER,
  } as AuthenticatedUser;

  const payment = (overrides: Partial<Payment> = {}): Payment =>
    ({
      id: PAYMENT_ID,
      userId: 'user-1',
      showtimeId: 'st1',
      holdIds: ['hold-1'],
      status: PaymentStatus.PENDING,
      amountCents: 850,
      currency: 'usd',
      stripePaymentIntentId: null,
      reservationId: null,
      ...overrides,
    }) as Payment;

  beforeEach(async () => {
    manager = mockManager();

    paymentsRepo = {
      manager: {
        transaction: jest.fn((cb: (m: typeof manager) => unknown) =>
          cb(manager),
        ),
      },
      findOneBy: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    insertQb = {};
    for (const method of ['insert', 'values', 'orIgnore']) {
      insertQb[method] = jest.fn().mockReturnValue(insertQb);
    }
    insertQb.execute = jest.fn();
    customersRepo = {
      findOneBy: jest
        .fn()
        .mockResolvedValue({ userId: 'user-1', stripeCustomerId: 'cus_1' }),
      createQueryBuilder: jest.fn().mockReturnValue(insertQb),
    };
    stripe = {
      publishableKey: 'pk_test_1',
      createCustomer: jest.fn().mockResolvedValue({ id: 'cus_new' }),
      createSetupIntent: jest
        .fn()
        .mockResolvedValue({ client_secret: 'seti_1_secret' }),
      createEphemeralKey: jest.fn().mockResolvedValue({ secret: 'ek_1' }),
      listCards: jest.fn().mockResolvedValue([]),
      retrievePaymentMethod: jest.fn().mockResolvedValue({
        id: 'pm_1',
        customer: 'cus_1',
        card: { brand: 'visa', last4: '4242' },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentsRepo },
        {
          provide: getRepositoryToken(PaymentCustomer),
          useValue: customersRepo,
        },
        { provide: StripeService, useValue: stripe },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  describe('createSetupIntent', () => {
    it('reuses the caller’s Stripe Customer', async () => {
      const result = await service.createSetupIntent(user);

      expect(stripe.createCustomer).not.toHaveBeenCalled();
      expect(result).toEqual({
        setupIntentClientSecret: 'seti_1_secret',
        ephemeralKeySecret: 'ek_1',
        customerId: 'cus_1',
        publishableKey: 'pk_test_1',
      });
    });

    it('creates the Customer lazily on the first add-card', async () => {
      customersRepo.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ stripeCustomerId: 'cus_new' });

      const result = await service.createSetupIntent(user);

      expect(stripe.createCustomer).toHaveBeenCalledWith(
        'user-1',
        'a@example.com',
      );
      expect(insertQb.values).toHaveBeenCalledWith({
        userId: 'user-1',
        stripeCustomerId: 'cus_new',
      });
      expect(insertQb.orIgnore).toHaveBeenCalled();
      expect(result.customerId).toBe('cus_new');
    });

    it('answers with the row that won a concurrent first add-card', async () => {
      customersRepo.findOneBy
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ stripeCustomerId: 'cus_winner' });

      const result = await service.createSetupIntent(user);

      expect(result.customerId).toBe('cus_winner');
    });
  });

  describe('assertOwnPaymentMethod', () => {
    it('returns the Customer and card summary for the caller’s own card', async () => {
      await expect(
        service.assertOwnPaymentMethod('user-1', 'pm_1'),
      ).resolves.toEqual({ customerId: 'cus_1', brand: 'visa', last4: '4242' });
    });

    it('BR-38: someone else’s card is PAYMENT_METHOD_NOT_FOUND', async () => {
      stripe.retrievePaymentMethod.mockResolvedValue({
        id: 'pm_1',
        customer: 'cus_other',
      });

      await expect(
        service.assertOwnPaymentMethod('user-1', 'pm_1'),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_METHOD_NOT_FOUND,
      });
    });

    it('BR-38: an unknown card is the same answer', async () => {
      stripe.retrievePaymentMethod.mockResolvedValue(null);

      await expect(
        service.assertOwnPaymentMethod('user-1', 'pm_1'),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_METHOD_NOT_FOUND,
      });
    });

    it('rejects every card for a user with no Customer yet', async () => {
      customersRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.assertOwnPaymentMethod('user-1', 'pm_1'),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_METHOD_NOT_FOUND,
      });
      expect(stripe.retrievePaymentMethod).not.toHaveBeenCalled();
    });
  });

  describe('settleFailed', () => {
    it('BR-40: settles a pending payment as failed', async () => {
      manager.qb.getOneOrFail.mockResolvedValue(payment());

      const result = await service.settleFailed(
        PAYMENT_ID,
        'pi_1',
        'card_declined',
        'Declined',
      );

      expect(manager.qb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(manager.update).toHaveBeenCalledWith(
        Payment,
        PAYMENT_ID,
        expect.objectContaining({ status: PaymentStatus.FAILED }),
      );
    });

    it('BR-40: never moves a terminal payment', async () => {
      manager.qb.getOneOrFail.mockResolvedValue(
        payment({ status: PaymentStatus.SUCCEEDED }),
      );

      const result = await service.settleFailed(
        PAYMENT_ID,
        'pi_1',
        null,
        'Declined',
      );

      expect(result.status).toBe(PaymentStatus.SUCCEEDED);
      expect(manager.update).not.toHaveBeenCalled();
    });
  });

  describe('findForPaymentIntent', () => {
    const intent = (
      overrides: Partial<Stripe.PaymentIntent> = {},
    ): Stripe.PaymentIntent =>
      ({
        id: 'pi_1',
        amount: 850,
        currency: 'usd',
        metadata: { paymentId: PAYMENT_ID },
        ...overrides,
      }) as Stripe.PaymentIntent;

    it('finds the payment by the id in the metadata', async () => {
      paymentsRepo.findOneBy.mockResolvedValue(payment());

      await expect(service.findForPaymentIntent(intent())).resolves.toEqual(
        payment(),
      );
      expect(paymentsRepo.findOneBy).toHaveBeenCalledWith({ id: PAYMENT_ID });
    });

    it('never settles from a PaymentIntent with a different amount', async () => {
      paymentsRepo.findOneBy.mockResolvedValue(payment());

      await expect(
        service.findForPaymentIntent(intent({ amount: 1 })),
      ).resolves.toBeNull();
    });

    it('never settles a payment already tied to another PaymentIntent', async () => {
      paymentsRepo.findOneBy.mockResolvedValue(
        payment({ stripePaymentIntentId: 'pi_other' }),
      );

      await expect(service.findForPaymentIntent(intent())).resolves.toBeNull();
    });
  });

  describe('findOwned', () => {
    it('is PAYMENT_NOT_FOUND for someone else’s payment', async () => {
      paymentsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOwned('user-1', PAYMENT_ID),
      ).rejects.toMatchObject({ errorCode: ErrorCode.PAYMENT_NOT_FOUND });
      expect(paymentsRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: PAYMENT_ID, userId: 'user-1' },
        }),
      );
    });

    it('is PAYMENT_NOT_FOUND for an id that is not a UUID', async () => {
      await expect(service.findOwned('user-1', 'nope')).rejects.toMatchObject({
        errorCode: ErrorCode.PAYMENT_NOT_FOUND,
      });
      expect(paymentsRepo.findOne).not.toHaveBeenCalled();
    });
  });
});
