import { CinemaServiceEffect, cinemaServiceEffect } from '../cinema';
import { runEffectForQuery } from '@/utils/effect';

const NOT_AVAILABLE = 'Cinema data is not available yet';

describe('CinemaService', () => {
  let service: CinemaServiceEffect;

  beforeEach(() => {
    service = CinemaServiceEffect.getInstance();
  });

  it('should be a singleton', () => {
    const instance1 = CinemaServiceEffect.getInstance();
    const instance2 = CinemaServiceEffect.getInstance();
    expect(instance1).toBe(instance2);
    expect(instance1).toBe(cinemaServiceEffect);
  });

  // Not implemented yet — the API's showtime model has no cinema entity, and
  // Supabase's `cinemas` table is no longer wired up.
  describe('getCinemas', () => {
    it('fails with a not-available CinemaError', async () => {
      await expect(runEffectForQuery(service.getCinemas())).rejects.toThrow(
        NOT_AVAILABLE,
      );
    });
  });

  describe('getCinemaById', () => {
    it('fails with a not-available CinemaError', async () => {
      await expect(
        runEffectForQuery(service.getCinemaById('cinema1')),
      ).rejects.toThrow(NOT_AVAILABLE);
    });
  });

  describe('getCinemasByCity', () => {
    it('fails with a not-available CinemaError', async () => {
      await expect(
        runEffectForQuery(service.getCinemasByCity('Test City')),
      ).rejects.toThrow(NOT_AVAILABLE);
    });
  });
});
