// Effect
import { Effect } from 'effect';

// Types
import { Cinema } from '@/features/booking/schemas/cinema';

// Error
import { CinemaError } from '@/features/booking/error/cinema';

const NOT_IMPLEMENTED =
  'Cinema data is not available yet — the API has no cinema entity.';

/**
 * Not implemented yet — `@movea/api`'s showtime model has no cinema entity
 * above a hall (see `schemas/showtime.ts`), and Supabase's `cinemas` table is
 * no longer wired up. Kept as a stub so any remaining caller still compiles.
 */
export class CinemaServiceEffect {
  private static instance: CinemaServiceEffect;

  private constructor() {}

  static getInstance(): CinemaServiceEffect {
    if (!CinemaServiceEffect.instance) {
      CinemaServiceEffect.instance = new CinemaServiceEffect();
    }
    return CinemaServiceEffect.instance;
  }

  getCinemas = (): Effect.Effect<Cinema[], CinemaError> =>
    Effect.fail(CinemaError.cinemaNotFound(NOT_IMPLEMENTED));

  getCinemaById = (_id: string): Effect.Effect<Cinema, CinemaError> =>
    Effect.fail(CinemaError.cinemaNotFound(NOT_IMPLEMENTED));

  getCinemasByCity = (_city: string): Effect.Effect<Cinema[], CinemaError> =>
    Effect.fail(CinemaError.cinemaNotFound(NOT_IMPLEMENTED));
}

export const cinemaServiceEffect = CinemaServiceEffect.getInstance();
