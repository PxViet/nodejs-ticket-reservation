import { PROMO_CODE_STATUS } from '@/constants/status';
import { Seat } from '@/features/booking/schemas/cinema';

import { PromoCodeStatus } from '@/features/booking/schemas/movie';

export const formatCardNumber = (number?: string) => {
  if (!number) return '•••• •••• •••• ••••';

  // Remove all non-digits
  const cleaned = number.replace(/\D/g, '');

  // Format as groups of 4
  const match = cleaned.match(/.{1,4}/g);
  return match ? match.join(' ') : number;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$',
  eur: '€',
  gbp: '£',
};

/**
 * An amount in the currency's smallest unit, as the API and Stripe send it:
 * `(499, 'usd')` → `"$4.99"`. Formatted by hand rather than via
 * `Intl.NumberFormat`: Hermes only partially implements it, and a
 * non-integer amount with `maximumFractionDigits` set comes back as an empty
 * string on device.
 */
export const formatMinorUnits = (amount: number, currency = 'usd'): string => {
  const code = currency.toLowerCase();
  const value = (Math.abs(amount) / 100).toFixed(2);
  const [intPart = '0', fracPart = '00'] = value.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = amount < 0 ? '-' : '';
  const symbol = CURRENCY_SYMBOLS[code];

  return symbol
    ? `${sign}${symbol}${grouped}.${fracPart}`
    : `${sign}${grouped}.${fracPart} ${code.toUpperCase()}`;
};

/**
 * A dollar amount as the API sends prices (`showtimes.base_price`,
 * `tickets.price`, report totals): `8.5` → `"$8.50"`, `1250` →
 * `"$1,250.00"`. Everything in the app is priced in US dollars (ADR-018).
 */
export const formatUSD = (value: number | string): string => {
  const amount = typeof value === 'string' ? Number(value) : value;
  return formatMinorUnits(
    Number.isFinite(amount) ? Math.round(amount * 100) : 0,
    'usd',
  );
};

/** `'visa'` → `'Visa'`, `'amex'` → `'American Express'`. */
export const formatCardBrand = (brand: string): string => {
  const names: Record<string, string> = {
    amex: 'American Express',
    diners: 'Diners Club',
    jcb: 'JCB',
    mastercard: 'Mastercard',
    unionpay: 'UnionPay',
  };

  return names[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
};

/** `(4, 2031)` → `'04/31'`. */
export const formatCardExpiry = (month: number, year: number): string =>
  `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const weekday = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
  });

  const month = dateObj.toLocaleDateString('en-US', {
    month: 'short',
  });

  const day = dateObj.toLocaleDateString('en-US', {
    day: '2-digit',
  });

  return `${weekday} ${month} ${day}`;
};

export const formatTime = (
  value: string | Date,
  timeZone: string = 'UTC',
): string => {
  // Case 1: Date object
  if (value instanceof Date) {
    return formatDateObj(value, timeZone);
  }

  // Case 2: time-only string (HH:mm or HH:mm:ss)
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return value.slice(0, 5); // "00:00"
  }

  // Case 3: ISO string (Supabase)
  const normalized = value.replace(/\.(\d{3})\d+/, '.$1');
  const date = new Date(normalized);

  if (isNaN(date.getTime())) {
    return '--:--';
  }

  return formatDateObj(date, timeZone);
};

const formatDateObj = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(date);

export const generateBookingNumber = (): string => {
  return Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, '0');
};

export const generateTicketNumber = (): string => {
  const date = new Date().toISOString().split('T')[0]?.replace(/-/g, '') || '';
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `TKT-${date}-${random}`;
};

export const isExpired = (expiresAt: string): boolean => {
  return new Date(expiresAt) < new Date();
};

export const getTimeRemaining = (expiresAt: string): string => {
  const now = new Date().getTime();
  const expiry = new Date(expiresAt).getTime();
  const diff = expiry - now;

  if (diff <= 0) return 'Expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
};

export const calculateDiscount = (
  amount: number,
  discountType: PromoCodeStatus,
  discountValue: number,
  maxDiscount?: number,
): number => {
  let discount = 0;

  if (discountType === PROMO_CODE_STATUS.PERCENTAGE) {
    discount = (amount * discountValue) / 100;
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else {
    discount = discountValue;
  }

  return Math.min(discount, amount);
};

export const calculateTotalPrice = (price: number, seats: number): number => {
  return price * seats;
};

export const formatMovieDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}min`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}min`;
};

export const formatShowtimeDate = (
  showtime?: string,
  showDate?: Date | string,
): string => {
  if (showtime && showDate) {
    return `${formatTime(showtime)}, ${formatDate(showDate)}`;
  }
  if (showtime) {
    return formatTime(showtime);
  }
  if (showDate) {
    return formatDate(showDate);
  }
  return '';
};

// Rating is on the API's 0-10 scale (BR-03), rendered as 5 stars
// Each star represents 2 rating points
export const clampedRatingToStars = (rating: number) => {
  // Clamp rating between 0 and 10, then convert to the 0-5 star scale
  const clampedRating = Math.max(0, Math.min(10, rating)) / 2;

  // Calculate filled percentage for each star (each star represents 1 star point)
  const stars = Array.from({ length: 5 }, (_, index) => {
    const starValue = index + 1;
    if (clampedRating >= starValue) {
      return 1; // Fully filled
    } else if (clampedRating > index) {
      return clampedRating - index; // Partially filled
    }
    return 0; // Empty
  });

  return stars;
};

export const groupSeatsByRow = (seats: Seat[]): Record<string, Seat[]> => {
  const grouped: Record<string, Seat[]> = {};
  seats.forEach(seat => {
    if (!grouped[seat.row]) {
      grouped[seat.row] = [];
    }
    grouped[seat.row]?.push(seat);
  });
  return grouped;
};
