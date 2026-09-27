import { UNIQUE_VIOLATION } from '../../../common/constant';

const MAX_REFERENCE_ATTEMPTS = 3;

// DDR-004: a 23505 from the confirmation transaction is a reservation_number
// or ticket_number collision — retrying the whole attempt regenerates both,
// which also covers two reservation_numbers (differing only by date) that
// yield the same 6-char suffix and so the same ticket_number.
export async function withUniViolentRetry<T>(
  attempt: () => Promise<T>,
  attemptsLeft = MAX_REFERENCE_ATTEMPTS,
): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (
      (error as { code?: string }).code === UNIQUE_VIOLATION &&
      attemptsLeft > 1
    ) {
      return withUniViolentRetry(attempt, attemptsLeft - 1);
    }
    throw error;
  }
}
