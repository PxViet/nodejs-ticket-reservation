import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { StripeService } from './../src/modules/payments/stripe.service';

interface ShowtimeSeatDto {
  seatId: string;
  status: 'available' | 'held' | 'reserved';
}

interface ShowtimeListItemDto {
  id: string;
  status: string;
  showDate: string;
  availableSeats: number;
}

// Stripe stands in for the network: a card id is `pm_<customer id>`, so the
// fake can answer BR-38's ownership check, and every charge succeeds.
const fakeStripe = {
  publishableKey: 'pk_test_e2e',
  createCustomer: (userId: string) => Promise.resolve({ id: `cus_${userId}` }),
  createSetupIntent: () => Promise.resolve({ client_secret: 'seti_secret' }),
  createEphemeralKey: () => Promise.resolve({ secret: 'ek_secret' }),
  retrievePaymentMethod: (id: string) =>
    Promise.resolve({
      id,
      customer: id.replace(/^pm_/, ''),
      card: { brand: 'visa', last4: '4242' },
    }),
  createPaymentIntent: ({
    amountCents,
    currency,
    paymentId,
  }: {
    amountCents: number;
    currency: string;
    paymentId: string;
  }) =>
    Promise.resolve({
      id: `pi_${paymentId}`,
      status: 'succeeded',
      amount: amountCents,
      currency,
      metadata: { paymentId },
    }),
  createRefund: (_pi: string, paymentId: string) =>
    Promise.resolve({ id: `re_${paymentId}` }),
};

// Requires a reachable database — run `pnpm run db:up` first. Exercises
// ADR-018's checkout end to end — hold -> pay -> confirm (DDR-002) -> cancel —
// with Stripe faked.
describe('Reservations (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StripeService)
      .useValue(fakeStripe)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  function uniqueEmail(name: string): string {
    return `e2e-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  }

  async function registerAndLogin(name: string): Promise<string> {
    const email = uniqueEmail(name);
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: name })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return (loginRes.body as { accessToken: string }).accessToken;
  }

  // Adds a card the way PaymentSheet would, and returns its id.
  async function addCard(token: string): Promise<string> {
    const setupRes = await request(app.getHttpServer())
      .post('/api/v1/payment-methods/setup-intent')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    return `pm_${(setupRes.body as { customerId: string }).customerId}`;
  }

  function checkout(token: string, holdIds: string[], paymentMethodId: string) {
    return request(app.getHttpServer())
      .post('/api/v1/reservations/checkout')
      .set('Authorization', `Bearer ${token}`)
      .send({ holdIds, paymentMethodId });
  }

  // The seed (SeedService) always leaves a scheduled showtime with free
  // seats, so this needs no admin fixtures.
  async function holdASeat(
    token: string,
  ): Promise<{ showtimeId: string; seatId: string; holdId: string }> {
    // Nothing flips showtime.status as real time passes (that gap is
    // documented in decisions-vs-code.md), so "scheduled" alone doesn't mean
    // "hasn't started yet" — ask for tomorrow's schedule so BR-29 cancellation
    // always has a genuinely upcoming showtime to work with, however long ago
    // the database was seeded.
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/showtimes?limit=100&date=${tomorrow}`)
      .expect(200);

    const showtime = (listRes.body.data as ShowtimeListItemDto[]).find(
      (s) =>
        s.status === 'scheduled' &&
        s.availableSeats > 0 &&
        s.showDate >= tomorrow,
    );
    if (!showtime) {
      throw new Error(
        'Seed produced no upcoming bookable showtime with free seats',
      );
    }

    const seatsRes = await request(app.getHttpServer())
      .get(`/api/v1/showtimes/${showtime.id}/seats`)
      .expect(200);
    const seat = (seatsRes.body as ShowtimeSeatDto[]).find(
      (s) => s.status === 'available',
    );
    if (!seat) {
      throw new Error('Showtime reported free seats but seat map has none');
    }

    const holdRes = await request(app.getHttpServer())
      .post(`/api/v1/showtimes/${showtime.id}/hold`)
      .set('Authorization', `Bearer ${token}`)
      .send({ seatIds: [seat.seatId] })
      .expect(201);

    return {
      showtimeId: showtime.id,
      seatId: seat.seatId,
      holdId: (holdRes.body.holds as { id: string }[])[0].id,
    };
  }

  it('pays for a held seat and confirms it, then rejects paying for the same hold again', async () => {
    const token = await registerAndLogin('booker');
    const card = await addCard(token);
    const { showtimeId, seatId, holdId } = await holdASeat(token);

    const checkoutRes = await checkout(token, [holdId], card).expect(201);
    expect(checkoutRes.body.status).toBe('succeeded');
    const confirmRes = { body: checkoutRes.body.reservation };

    expect(confirmRes.body).toMatchObject({
      status: 'confirmed',
      showtimeId,
      totalSeats: 1,
      tickets: [expect.objectContaining({ seatId, status: 'valid' })],
    });
    expect(confirmRes.body.reservationNumber).toMatch(
      /^RSV-\d{8}-[0-9A-Z]{6}$/,
    );

    const seatsAfterConfirm = await request(app.getHttpServer())
      .get(`/api/v1/showtimes/${showtimeId}/seats`)
      .expect(200);
    const seatStatus = (seatsAfterConfirm.body as ShowtimeSeatDto[]).find(
      (s) => s.seatId === seatId,
    )?.status;
    expect(seatStatus).toBe('reserved');

    const secondAttempt = await checkout(token, [holdId], card);
    expect(secondAttempt.status).toBe(409);
    expect(secondAttempt.body.errorCode).toBe('SEAT_HOLD_EXPIRED');

    const paymentsRes = await request(app.getHttpServer())
      .get('/api/v1/payments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(paymentsRes.body.data).toEqual([
      expect.objectContaining({
        id: checkoutRes.body.paymentId,
        status: 'succeeded',
        currency: 'usd',
        cardLast4: '4242',
        reservationNumber: confirmRes.body.reservationNumber,
      }),
    ]);
  });

  it("BR-38: rejects paying with another customer's card", async () => {
    const token = await registerAndLogin('thief');
    await addCard(token);
    const victimCard = await addCard(await registerAndLogin('victim'));
    const { holdId } = await holdASeat(token);

    const res = await checkout(token, [holdId], victimCard);
    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('PAYMENT_METHOD_NOT_FOUND');
  });

  it('no longer confirms a reservation without payment', async () => {
    const token = await registerAndLogin('freeloader');
    const { holdId } = await holdASeat(token);

    const res = await request(app.getHttpServer())
      .post('/api/v1/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ holdIds: [holdId] });
    expect(res.status).toBe(404);
  });

  it('cancels a reservation and frees the seat again', async () => {
    const token = await registerAndLogin('canceller');
    const { showtimeId, seatId, holdId } = await holdASeat(token);

    const confirmRes = {
      body: (await checkout(token, [holdId], await addCard(token)).expect(201))
        .body.reservation,
    };
    const reservationId = confirmRes.body.id as string;

    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(cancelRes.body.status).toBe('cancelled');
    expect(cancelRes.body.tickets[0].status).toBe('cancelled');

    const seatsAfterCancel = await request(app.getHttpServer())
      .get(`/api/v1/showtimes/${showtimeId}/seats`)
      .expect(200);
    const seatStatus = (seatsAfterCancel.body as ShowtimeSeatDto[]).find(
      (s) => s.seatId === seatId,
    )?.status;
    expect(seatStatus).toBe('available');
  });

  it('lets the owner read a reservation but not a different user', async () => {
    const ownerToken = await registerAndLogin('owner');
    const otherToken = await registerAndLogin('stranger');
    const { holdId } = await holdASeat(ownerToken);

    const confirmRes = {
      body: (
        await checkout(ownerToken, [holdId], await addCard(ownerToken)).expect(
          201,
        )
      ).body.reservation,
    };
    const reservationId = confirmRes.body.id as string;

    await request(app.getHttpServer())
      .get(`/api/v1/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const strangerRes = await request(app.getHttpServer())
      .get(`/api/v1/reservations/${reservationId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(strangerRes.status).toBe(403);
    expect(strangerRes.body.errorCode).toBe('FORBIDDEN');
  });

  it('lists the confirmed reservation under GET /reservations/me', async () => {
    const token = await registerAndLogin('lister');
    const { holdId } = await holdASeat(token);

    const confirmRes = {
      body: (await checkout(token, [holdId], await addCard(token)).expect(201))
        .body.reservation,
    };

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/reservations/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listRes.body.data).toContainEqual(
      expect.objectContaining({ id: confirmRes.body.id, status: 'confirmed' }),
    );
  });
});
