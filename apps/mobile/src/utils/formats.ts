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

export const formatCurrency = (amount: number, currency = 'IDR'): string => {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Add space between currency symbol and amount (e.g., "Rp 150.000" instead of "Rp150.000")
  return formatted.replace(/([A-Za-z]+)(\d)/, '$1 $2');
};

/**
 * Format number to IDR currency format with dot separator
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "IDR 200.000")
 */
export function formatIDR(
  value: number | string,
  options?: {
    showCurrency?: boolean;
    decimals?: number;
  },
): string {
  const { showCurrency = true, decimals } = options || {};

  const amount =
    typeof value === 'string'
      ? Number(value.replace(/\./g, '').replace(',', '.'))
      : value;

  if (!Number.isFinite(amount)) {
    return showCurrency ? 'IDR 0' : '0';
  }

  // Format by hand rather than via `Number#toLocaleString(locale, …)`: Hermes
  // only partially implements `Intl.NumberFormat`, and a non-integer amount with
  // `maximumFractionDigits` set comes back as an empty string on device — the
  // total then renders as "IDR " alone.
  //
  // With an explicit `decimals` the amount is fixed to that precision (padded).
  // Without one the exact value is kept — never rounded — so a price like
  // basePrice 8.5 × 3 seats shows as "IDR 25,5", not "IDR 26".
  const absStr =
    decimals === undefined
      ? String(parseFloat(Math.abs(amount).toFixed(10))) // strip float noise only
      : Math.abs(amount).toFixed(decimals);
  const [intPart = '0', fracPart] = absStr.split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = amount < 0 ? '-' : '';
  const formattedNumber = fracPart
    ? `${sign}${grouped},${fracPart}`
    : `${sign}${grouped}`;

  return showCurrency ? `IDR ${formattedNumber}` : formattedNumber;
}

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
