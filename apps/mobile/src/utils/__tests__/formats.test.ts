import { Seat, SeatStatus } from '@/features/booking/schemas/cinema';
import { PromoCodeStatus } from '@/features/booking/schemas/movie';
import { PROMO_CODE_STATUS, SEAT_STATUS } from '@/constants/status';
import {
  calculateDiscount,
  calculateTotalPrice,
  clampedRatingToStars,
  formatCardBrand,
  formatCardExpiry,
  formatCardNumber,
  formatDate,
  formatMinorUnits,
  formatMovieDuration,
  formatShowtimeDate,
  formatTime,
  formatUSD,
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

describe('formatUSD', () => {
  it('formats a dollar price with two decimals', () => {
    expect(formatUSD(8.5)).toBe('$8.50');
    expect(formatUSD(14)).toBe('$14.00');
  });

  it('groups thousands with commas', () => {
    expect(formatUSD(1250)).toBe('$1,250.00');
    expect(formatUSD(1234567.891)).toBe('$1,234,567.89');
  });

  it('keeps a multi-seat total exact — 3 × $8.50', () => {
    expect(formatUSD(8.5 * 3)).toBe('$25.50');
    // Float noise must not leak into the cents.
    expect(formatUSD(0.1 + 0.2)).toBe('$0.30');
  });

  it('accepts a numeric string, as a report row may send one', () => {
    expect(formatUSD('42.5')).toBe('$42.50');
  });

  it('treats undefined / NaN / Infinity as $0.00', () => {
    expect(formatUSD(undefined as unknown as number)).toBe('$0.00');
    expect(formatUSD(NaN)).toBe('$0.00');
    expect(formatUSD(Infinity)).toBe('$0.00');
    expect(formatUSD('invalid')).toBe('$0.00');
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
    const stars = clampedRatingToStars(7);
    expect(stars).toHaveLength(5);
  });

  it('should clamp rating between 0 and 10', () => {
    const starsNegative = clampedRatingToStars(-1);
    const starsHigh = clampedRatingToStars(20);
    expect(starsNegative.every(s => s === 0)).toBe(true);
    expect(starsHigh.every(s => s === 1)).toBe(true);
  });

  it('should return fully filled stars for rating >= star value', () => {
    const stars = clampedRatingToStars(6);
    expect(stars[0]).toBe(1); // First star
    expect(stars[1]).toBe(1); // Second star
    expect(stars[2]).toBe(1); // Third star
    expect(stars[3]).toBe(0); // Fourth star
  });

  it('should return partial fill for fractional rating', () => {
    const stars = clampedRatingToStars(7);
    expect(stars[3]).toBe(0.5); // Fourth star partially filled
  });

  it('should map a 10-point rating to half as many stars', () => {
    const stars = clampedRatingToStars(7.5);
    expect(stars).toEqual([1, 1, 1, 0.75, 0]);
  });

  it('should return all zeros for zero rating', () => {
    const stars = clampedRatingToStars(0);
    expect(stars.every(s => s === 0)).toBe(true);
  });

  it('should return all ones for rating of 10', () => {
    const stars = clampedRatingToStars(10);
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

describe('formatMinorUnits', () => {
  it('formats cents with a known symbol', () => {
    expect(formatMinorUnits(499)).toBe('$4.99');
    expect(formatMinorUnits(123456, 'USD')).toBe('$1,234.56');
    expect(formatMinorUnits(500, 'eur')).toBe('€5.00');
  });

  it('keeps the sign of a negative amount', () => {
    expect(formatMinorUnits(-250)).toBe('-$2.50');
  });

  it('suffixes the code of a currency without a symbol', () => {
    expect(formatMinorUnits(1000, 'sgd')).toBe('10.00 SGD');
  });
});

describe('formatCardBrand', () => {
  it('names the brands Stripe abbreviates', () => {
    expect(formatCardBrand('amex')).toBe('American Express');
    expect(formatCardBrand('mastercard')).toBe('Mastercard');
  });

  it('capitalises any other brand', () => {
    expect(formatCardBrand('visa')).toBe('Visa');
    expect(formatCardBrand('discover')).toBe('Discover');
  });
});

describe('formatCardExpiry', () => {
  it('pads the month and keeps the last two year digits', () => {
    expect(formatCardExpiry(4, 2031)).toBe('04/31');
    expect(formatCardExpiry(12, 2030)).toBe('12/30');
  });
});
