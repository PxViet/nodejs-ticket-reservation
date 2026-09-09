import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

interface ShowtimeSeatDto {
  seatId: string;
  status: 'available' | 'held' | 'reserved';
}

interface ShowtimeListItemDto {
  id: string;
  status: string;
  availableSeats: number;
}

// Requires a reachable database — run `pnpm run db:up` first. This is the
// test that exercises ADR-007's actual guarantee: uq_seat_hold_active, not
// application code, decides who wins a race for the same seat.
describe('Seat holds (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  // The seed (SeedService, runs on every bootstrap) always leaves at least
  // one scheduled showtime with free seats, so this needs no admin fixtures.
  async function findBookableSeat(): Promise<{
    showtimeId: string;
    seatId: string;
  }> {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/showtimes?limit=100')
      .expect(200);

    const showtime = (listRes.body.data as ShowtimeListItemDto[]).find(
      (s) => s.status === 'scheduled' && s.availableSeats > 0,
    );
    if (!showtime) {
      throw new Error('Seed produced no bookable showtime with free seats');
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

    return { showtimeId: showtime.id, seatId: seat.seatId };
  }

  async function findBookableSeats(
    count: number,
  ): Promise<{ showtimeId: string; seatIds: string[] }> {
    const listRes = await request(app.getHttpServer())
      .get('/api/v1/showtimes?limit=100')
      .expect(200);

    const showtime = (listRes.body.data as ShowtimeListItemDto[]).find(
      (s) => s.status === 'scheduled' && s.availableSeats >= count,
    );
    if (!showtime) {
      throw new Error(`Seed produced no showtime with ${count} free seats`);
    }

    const seatsRes = await request(app.getHttpServer())
      .get(`/api/v1/showtimes/${showtime.id}/seats`)
      .expect(200);

    const seatIds = (seatsRes.body as ShowtimeSeatDto[])
      .filter((s) => s.status === 'available')
      .slice(0, count)
      .map((s) => s.seatId);

    return { showtimeId: showtime.id, seatIds };
  }

  it('lets exactly one of two simultaneous holds on the same seat win', async () => {
    const [tokenA, tokenB] = await Promise.all([
      registerAndLogin('user-a'),
      registerAndLogin('user-b'),
    ]);
    const { showtimeId, seatId } = await findBookableSeat();

    const hold = (token: string) =>
      request(app.getHttpServer())
        .post(`/api/v1/showtimes/${showtimeId}/hold`)
        .set('Authorization', `Bearer ${token}`)
        .send({ seatIds: [seatId] });

    const [resA, resB] = await Promise.all([hold(tokenA), hold(tokenB)]);
    const results = [resA, resB];

    const winners = results.filter((r) => r.status === 201);
    const losers = results.filter((r) => r.status === 409);

    // The actual guarantee: uq_seat_hold_active lets exactly one INSERT
    // succeed, no matter how the two requests interleave.
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(1);
    expect(losers[0].body.errorCode).toBe('SEAT_UNAVAILABLE');
    expect(winners[0].body.holds).toEqual([
      expect.objectContaining({ seatId, showtimeId, status: 'held' }),
    ]);
  });

  it('fails the whole multi-seat request when one seat in it is already taken, leaving the rest free', async () => {
    const [tokenA, tokenB] = await Promise.all([
      registerAndLogin('picker'),
      registerAndLogin('rival'),
    ]);
    const { showtimeId, seatIds } = await findBookableSeats(3);
    const [a1, a2, a3] = seatIds;

    // B takes A3 first — in the real flow this could equally be a CONFIRMED
    // reservation; uq_seat_hold_active blocks on held OR confirmed alike.
    await request(app.getHttpServer())
      .post(`/api/v1/showtimes/${showtimeId}/hold`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ seatIds: [a3] })
      .expect(201);

    // A, still holding an out-of-date seat map, asks for all three at once.
    const res = await request(app.getHttpServer())
      .post(`/api/v1/showtimes/${showtimeId}/hold`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ seatIds: [a1, a2, a3] });

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('SEAT_UNAVAILABLE');

    // All-or-nothing: A1 and A2 were free and wanted, but the batch failed
    // as one transaction, so neither got held for A either.
    const seatsRes = await request(app.getHttpServer())
      .get(`/api/v1/showtimes/${showtimeId}/seats`)
      .expect(200);
    const byId = new Map(
      (seatsRes.body as ShowtimeSeatDto[]).map((s) => [s.seatId, s.status]),
    );
    expect(byId.get(a1)).toBe('available');
    expect(byId.get(a2)).toBe('available');
    expect(byId.get(a3)).toBe('held');
  });

  it('rejects a hold with a token-less request', async () => {
    const { showtimeId, seatId } = await findBookableSeat();

    const res = await request(app.getHttpServer())
      .post(`/api/v1/showtimes/${showtimeId}/hold`)
      .send({ seatIds: [seatId] });

    expect(res.status).toBe(401);
  });

  it("lists the caller's active holds and lets them resume checkout", async () => {
    const [tokenA, tokenB] = await Promise.all([
      registerAndLogin('resume-mine'),
      registerAndLogin('resume-other'),
    ]);
    const { showtimeId, seatId } = await findBookableSeat();

    await request(app.getHttpServer())
      .post(`/api/v1/showtimes/${showtimeId}/hold`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ seatIds: [seatId] })
      .expect(201);

    const mineRes = await request(app.getHttpServer())
      .get('/api/v1/seat-holds/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(mineRes.body.data).toEqual([
      expect.objectContaining({ seatId, showtimeId, status: 'held' }),
    ]);
    expect(typeof mineRes.body.data[0].price).toBe('number');

    // The hold belongs to A, so B sees none of it in their own list.
    const otherRes = await request(app.getHttpServer())
      .get('/api/v1/seat-holds/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(otherRes.body.data).toEqual([]);

    // Filtering by showtimeId narrows the same result, doesn't hide it.
    const filteredRes = await request(app.getHttpServer())
      .get(`/api/v1/seat-holds/me?showtimeId=${showtimeId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(filteredRes.body.data).toHaveLength(1);
  });

  it('releases a held seat, freeing it for another user to hold', async () => {
    const [tokenA, tokenB] = await Promise.all([
      registerAndLogin('release-mine'),
      registerAndLogin('release-other'),
    ]);
    const { showtimeId, seatId } = await findBookableSeat();

    const holdRes = await request(app.getHttpServer())
      .post(`/api/v1/showtimes/${showtimeId}/hold`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ seatIds: [seatId] })
      .expect(201);
    const holdId = holdRes.body.holds[0].id as string;

    await request(app.getHttpServer())
      .delete(`/api/v1/seat-holds/${holdId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(204);

    const mineRes = await request(app.getHttpServer())
      .get('/api/v1/seat-holds/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(mineRes.body.data).toEqual([]);

    // The seat is truly free again, not just absent from A's list.
    await request(app.getHttpServer())
      .post(`/api/v1/showtimes/${showtimeId}/hold`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ seatIds: [seatId] })
      .expect(201);
  });

  it("rejects releasing another user's hold with SEAT_HOLD_NOT_OWNED", async () => {
    const [tokenA, tokenB] = await Promise.all([
      registerAndLogin('owned-mine'),
      registerAndLogin('owned-other'),
    ]);
    const { showtimeId, seatId } = await findBookableSeat();

    const holdRes = await request(app.getHttpServer())
      .post(`/api/v1/showtimes/${showtimeId}/hold`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ seatIds: [seatId] })
      .expect(201);
    const holdId = holdRes.body.holds[0].id as string;

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/seat-holds/${holdId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('SEAT_HOLD_NOT_OWNED');
  });

  it('returns 404 when releasing an unknown hold id', async () => {
    const token = await registerAndLogin('release-missing');

    const res = await request(app.getHttpServer())
      .delete('/api/v1/seat-holds/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
