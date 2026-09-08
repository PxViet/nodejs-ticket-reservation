import { Seat, SeatStatus } from '@/features/booking/schemas/cinema';
import { PromoCodeStatus } from '@/features/booking/schemas/movie';
import { PROMO_CODE_STATUS, SEAT_STATUS } from '@/constants/status';
import {
  calculateDiscount,
  calculateTotalPrice,
  clampedRatingToStars,
  formatCardNumber,
  formatCurrency,
  formatDate,
  formatIDR,
  formatMovieDuration,
  formatShowtimeDate,
  formatTime,
  generateBookingNumber,
  generateTicketNumber,
  getTimeRemaining,
  groupSeatsByRow,
  isExpired,
} from '../formats';

// Mock Seat type
const createMockSeat = (seat: Seat) => ({
  id: seat.id,
  row: seat.row,
  number: seat.number,
  status: seat.status,
});

describe('formatCardNumber', () => {
  it('should return masked card number when number is undefined', () => {
    expect(formatCardNumber()).toBe('•••• •••• •••• ••••');
  });

  it('should format card number with spaces', () => {
    expect(formatCardNumber('1234567890123456')).toBe('1234 5678 9012 3456');
  });

  it('should remove non-digits before formatting', () => {
    expect(formatCardNumber('1234-5678-9012-3456')).toBe('1234 5678 9012 3456');
  });

  it('should handle partial card numbers', () => {
    expect(formatCardNumber('1234')).toBe('1234');
    expect(formatCardNumber('12345678')).toBe('1234 5678');
  });

  it('should handle empty string', () => {
    expect(formatCardNumber('')).toBe('•••• •••• •••• ••••');
  });
});

describe('formatCurrency', () => {
  it('should format amount as IDR currency', () => {
    const result = formatCurrency(150000);
    expect(result).toContain('Rp');
    expect(result).toContain('150');
  });

  it('should add space between currency and amount', () => {
    const result = formatCurrency(150000);
    expect(result).toMatch(/Rp\s+\d/);
  });

  it('should handle zero amount', () => {
    const result = formatCurrency(0);
    expect(result).toContain('0');
  });

  it('should handle large amounts', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1.000.000');
  });
});

describe('formatIDR', () => {
  it('should format number with currency prefix', () => {
    expect(formatIDR(150000)).toBe('IDR 150.000');
  });

  it('should format number without currency prefix', () => {
    expect(formatIDR(150000, { showCurrency: false })).toBe('150.000');
  });

  it('should handle string input', () => {
    expect(formatIDR('150000')).toBe('IDR 150.000');
  });

  it('should handle string with dots and commas without rounding', () => {
    expect(formatIDR('150.000,50')).toBe('IDR 150.000,5');
  });

  it('should handle decimals', () => {
    expect(formatIDR(150000.5, { decimals: 2 })).toBe('IDR 150.000,50');
  });

  it('should return IDR 0 for invalid input', () => {
    expect(formatIDR('invalid')).toBe('IDR 0');
  });

  it('should return 0 without currency for invalid input when showCurrency is false', () => {
    expect(formatIDR('invalid', { showCurrency: false })).toBe('0');
  });

  it('should handle zero', () => {
    expect(formatIDR(0)).toBe('IDR 0');
  });

  it('keeps a non-integer amount exact, no rounding (basePrice 8.5 x seats)', () => {
    // Regression: Hermes' partial Intl returned "" here, so the total showed
    // as "IDR " with no number; and the value must not be rounded to whole units.
    expect(formatIDR(8.5)).toBe('IDR 8,5');
    expect(formatIDR(8.5 * 3)).toBe('IDR 25,5');
    expect(formatIDR(42.5, { showCurrency: false })).toBe('42,5');
    expect(formatIDR(14 * 4)).toBe('IDR 56');
  });

  it('always renders a digit after the currency for finite input', () => {
    for (const n of [0, 1, 8.5, 17, 25.5, 1234567, 999999.99]) {
      expect(formatIDR(n)).toMatch(/^IDR \d/);
    }
  });

  it('treats undefined / NaN / Infinity as IDR 0', () => {
    expect(formatIDR(undefined as unknown as number)).toBe('IDR 0');
    expect(formatIDR(NaN)).toBe('IDR 0');
    expect(formatIDR(Infinity)).toBe('IDR 0');
  });
});

describe('formatDate', () => {
  it('should format date string', () => {
    const result = formatDate('2024-01-15');
    expect(result).toMatch(/^\w{3} \w{3} \d{2}$/);
  });

  it('should format Date object', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date);
    expect(result).toMatch(/^\w{3} \w{3} \d{2}$/);
  });

  it('should include weekday, month, and day', () => {
    const result = formatDate('2024-01-15');
    const parts = result.split(' ');
    expect(parts).toHaveLength(3);
  });
});

describe('formatTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should format Date object', () => {
    const date = new Date('2024-01-15T14:30:00');
    const result = formatTime(date);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should format time-only string (HH:mm)', () => {
    expect(formatTime('14:30')).toBe('14:30');
  });

  it('should format time-only string (HH:mm:ss)', () => {
    expect(formatTime('14:30:45')).toBe('14:30');
  });

  it('should format ISO string', () => {
    const result = formatTime('2024-01-15T14:30:00.000Z');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('should return --:-- for invalid date', () => {
    expect(formatTime('invalid')).toBe('--:--');
  });

  it('should handle timezone parameter', () => {
    const date = new Date('2024-01-15T14:30:00Z');
    const result = formatTime(date, 'Asia/Jakarta');
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});

describe('generateBookingNumber', () => {
  it('should generate 8-digit number', () => {
    const number = generateBookingNumber();
    expect(number).toHaveLength(8);
    expect(number).toMatch(/^\d{8}$/);
  });

  it('should generate different numbers', () => {
    const numbers = Array.from({ length: 10 }, () => generateBookingNumber());
    const unique = new Set(numbers);
    // At least some should be different (very unlikely all same)
    expect(unique.size).toBeGreaterThan(1);
  });
});

describe('generateTicketNumber', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should generate ticket number with TKT prefix', () => {
    const number = generateTicketNumber();
    expect(number).toMatch(/^TKT-/);
  });

  it('should include date in YYYYMMDD format', () => {
    const number = generateTicketNumber();
    expect(number).toContain('20240115');
  });

  it('should include 6-digit random number', () => {
    const number = generateTicketNumber();
    const parts = number.split('-');
    expect(parts[2]).toHaveLength(6);
    expect(parts[2]).toMatch(/^\d{6}$/);
  });

  it('should have correct format', () => {
    const number = generateTicketNumber();
    expect(number).toMatch(/^TKT-\d{8}-\d{6}$/);
  });
});

describe('isExpired', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return true for past date', () => {
    jest.setSystemTime(new Date('2024-01-15'));
    expect(isExpired('2024-01-14')).toBe(true);
  });

  it('should return false for future date', () => {
    jest.setSystemTime(new Date('2024-01-15'));
    expect(isExpired('2024-01-16')).toBe(false);
  });

  it('should return false for current date', () => {
    const now = new Date();
    expect(isExpired(now.toISOString())).toBe(false);
  });
});

describe('getTimeRemaining', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return "Expired" for past date', () => {
    jest.setSystemTime(new Date('2024-01-15T10:00:00'));
    expect(getTimeRemaining('2024-01-15T09:00:00')).toBe('Expired');
  });

  it('should return hours and minutes for future date', () => {
    jest.setSystemTime(new Date('2024-01-15T10:00:00'));
    const result = getTimeRemaining('2024-01-15T12:30:00');
    expect(result).toContain('h');
    expect(result).toContain('m');
  });

  it('should return only minutes if less than an hour', () => {
    jest.setSystemTime(new Date('2024-01-15T10:00:00'));
    const result = getTimeRemaining('2024-01-15T10:30:00');
    expect(result).toContain('m remaining');
    expect(result).not.toContain('h');
  });
});

describe('calculateDiscount', () => {
  it('should calculate percentage discount', () => {
    expect(
      calculateDiscount(
        1000,
        PROMO_CODE_STATUS.PERCENTAGE as PromoCodeStatus,
        10,
      ),
    ).toBe(100);
  });

  it('should apply max discount for percentage', () => {
    expect(
      calculateDiscount(
        1000,
        PROMO_CODE_STATUS.PERCENTAGE as PromoCodeStatus,
        10,
        50,
      ),
    ).toBe(50);
  });

  it('should calculate fixed discount', () => {
    expect(
      calculateDiscount(
        1000,
        PROMO_CODE_STATUS.FIXED_AMOUNT as PromoCodeStatus,
        100,
      ),
    ).toBe(100);
  });

  it('should not exceed amount', () => {
    expect(
      calculateDiscount(
        100,
        PROMO_CODE_STATUS.FIXED_AMOUNT as PromoCodeStatus,
        200,
      ),
    ).toBe(100);
  });

  it('should handle zero amount', () => {
    expect(
      calculateDiscount(0, PROMO_CODE_STATUS.PERCENTAGE as PromoCodeStatus, 10),
    ).toBe(0);
  });
});

describe('calculateTotalPrice', () => {
  it('should multiply price by seats', () => {
    expect(calculateTotalPrice(50000, 2)).toBe(100000);
  });

  it('should handle zero seats', () => {
    expect(calculateTotalPrice(50000, 0)).toBe(0);
  });

  it('should handle zero price', () => {
    expect(calculateTotalPrice(0, 2)).toBe(0);
  });
});

describe('formatMovieDuration', () => {
  it('should format hours and minutes', () => {
    expect(formatMovieDuration(90)).toBe('1h 30min');
  });

  it('should format only hours', () => {
    expect(formatMovieDuration(120)).toBe('2h');
  });

  it('should format only minutes', () => {
    expect(formatMovieDuration(45)).toBe('45min');
  });

  it('should handle zero', () => {
    expect(formatMovieDuration(0)).toBe('0min');
  });
});

describe('formatShowtimeDate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should format both showtime and date', () => {
    const result = formatShowtimeDate('14:30', new Date('2024-01-15'));
    expect(result).toContain('14:30');
    expect(result).toContain(',');
  });

  it('should format only showtime', () => {
    expect(formatShowtimeDate('14:30')).toBe('14:30');
  });

  it('should format only date', () => {
    const result = formatShowtimeDate(undefined, new Date('2024-01-15'));
    expect(result).toMatch(/^\w{3} \w{3} \d{2}$/);
  });

  it('should return empty string when both are undefined', () => {
    expect(formatShowtimeDate()).toBe('');
  });
});

describe('clampedRatingToStars', () => {
  it('should return 5 star values', () => {
    const stars = clampedRatingToStars(3.5);
    expect(stars).toHaveLength(5);
  });

  it('should clamp rating between 0 and 5', () => {
    const starsNegative = clampedRatingToStars(-1);
    const starsHigh = clampedRatingToStars(10);
    expect(starsNegative.every(s => s >= 0 && s <= 1)).toBe(true);
    expect(starsHigh.every(s => s >= 0 && s <= 1)).toBe(true);
  });

  it('should return fully filled stars for rating >= star value', () => {
    const stars = clampedRatingToStars(3);
    expect(stars[0]).toBe(1); // First star
    expect(stars[1]).toBe(1); // Second star
    expect(stars[2]).toBe(1); // Third star
    expect(stars[3]).toBe(0); // Fourth star
  });

  it('should return partial fill for fractional rating', () => {
    const stars = clampedRatingToStars(3.5);
    expect(stars[3]).toBe(0.5); // Fourth star partially filled
  });

  it('should return all zeros for zero rating', () => {
    const stars = clampedRatingToStars(0);
    expect(stars.every(s => s === 0)).toBe(true);
  });

  it('should return all ones for rating >= 5', () => {
    const stars = clampedRatingToStars(5);
    expect(stars.every(s => s === 1)).toBe(true);
  });
});

describe('groupSeatsByRow', () => {
  it('should group seats by row', () => {
    const seats = [
      createMockSeat({
        id: 'A1',
        row: 'A',
        number: 1,
        status: SEAT_STATUS.AVAILABLE as SeatStatus,
      }),
      createMockSeat({
        id: 'A2',
        row: 'A',
        number: 2,
        status: SEAT_STATUS.AVAILABLE as SeatStatus,
      }),
      createMockSeat({
        id: 'B1',
        row: 'B',
        number: 1,
        status: SEAT_STATUS.AVAILABLE as SeatStatus,
      }),
      createMockSeat({
        id: 'B2',
        row: 'B',
        number: 2,
        status: SEAT_STATUS.AVAILABLE as SeatStatus,
      }),
    ];

    const result = groupSeatsByRow(seats);
    expect(result).toHaveProperty('A');
    expect(result).toHaveProperty('B');
    expect(result.A).toHaveLength(2);
    expect(result.B).toHaveLength(2);
  });

  it('should handle empty array', () => {
    expect(groupSeatsByRow([])).toEqual({});
  });

  it('should preserve seat order within row', () => {
    const seats = [
      createMockSeat({
        id: 'A1',
        row: 'A',
        number: 1,
        status: SEAT_STATUS.AVAILABLE as SeatStatus,
      }),
      createMockSeat({
        id: 'A2',
        row: 'A',
        number: 2,
        status: SEAT_STATUS.AVAILABLE as SeatStatus,
      }),
      createMockSeat({
        id: 'A3',
        row: 'A',
        number: 3,
        status: SEAT_STATUS.AVAILABLE as SeatStatus,
      }),
    ];

    const result = groupSeatsByRow(seats);
    expect(result.A?.[0]?.number).toBe(1);
    expect(result.A?.[1]?.number).toBe(2);
    expect(result.A?.[2]?.number).toBe(3);
  });
});
