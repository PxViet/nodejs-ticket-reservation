import { memo, useCallback, useMemo } from 'react';
import { TouchableOpacity, TouchableOpacityProps, View } from 'react-native';

// Components
import { Typo } from '@/components/Typo';

// Icons
import { MovieTopUpIcon } from '@/icons/MovieTopUpIcon';

// Types
import type {
  PaymentStatus,
  PaymentWithShowtime,
} from '@/features/payments/schemas/payments';

// Utils
import { cn } from '@/utils/cn';
import {
  formatCardBrand,
  formatMinorUnits,
  formatShowtimeDate,
} from '@/utils/formats';

// Constants
import { PAYMENT_STATUS } from '@/constants/status';

interface PaymentHistoryItemProps extends Omit<
  TouchableOpacityProps,
  'children' | 'onPress'
> {
  payment: PaymentWithShowtime;
  /** Only a paid checkout has a ticket to open. */
  onPress?: (payment: PaymentWithShowtime) => void;
  className?: string;
}

const STATUS_BADGE: Record<
  PaymentStatus,
  { label: string; containerClassName: string; textClassName: string }
> = {
  [PAYMENT_STATUS.SUCCEEDED]: {
    label: 'Paid',
    containerClassName: 'bg-bg-success/15',
    textClassName: 'text-text-success',
  },
  [PAYMENT_STATUS.PENDING]: {
    label: 'Processing',
    containerClassName: 'bg-bg-warning/15',
    textClassName: 'text-text-warning',
  },
  [PAYMENT_STATUS.FAILED]: {
    label: 'Failed',
    containerClassName: 'bg-bg-danger/15',
    textClassName: 'text-text-error',
  },
  [PAYMENT_STATUS.REFUNDED]: {
    label: 'Refunded',
    containerClassName: 'bg-bg-quaternary',
    textClassName: 'text-text-currency',
  },
};

// A paid checkout reads as money out; a failed or refunded one moved nothing.
const AMOUNT_COLOR: Record<PaymentStatus, string> = {
  [PAYMENT_STATUS.SUCCEEDED]: 'text-text-error',
  [PAYMENT_STATUS.PENDING]: 'text-gradient-medium',
  [PAYMENT_STATUS.FAILED]: 'text-gradient-medium line-through',
  [PAYMENT_STATUS.REFUNDED]: 'text-gradient-medium line-through',
};

/** One checkout payment (DDR-025) — the movie, what was charged, to which card. */
export const PaymentHistoryItem = memo(
  ({ payment, onPress, className = '', ...rest }: PaymentHistoryItemProps) => {
    const {
      status,
      amountCents,
      currency,
      cardBrand,
      cardLast4,
      seatCount,
      reservationNumber,
      failureMessage,
      createdAt,
      showtime,
    } = payment;

    const title = showtime?.movie?.title ?? 'Movie ticket';
    const badge = STATUS_BADGE[status];
    const amount = formatMinorUnits(amountCents, currency);
    const isPaid = status === PAYMENT_STATUS.SUCCEEDED;

    const dateText = useMemo(
      () => formatShowtimeDate(createdAt, createdAt),
      [createdAt],
    );

    const handlePress = useCallback(() => {
      onPress?.(payment);
    }, [onPress, payment]);

    return (
      <TouchableOpacity
        accessible
        testID={`payment-${payment.id}`}
        activeOpacity={isPaid && onPress ? 0.8 : 1}
        disabled={!isPaid || !onPress}
        onPress={handlePress}
        accessibilityRole={isPaid && onPress ? 'button' : 'text'}
        accessibilityLabel={`${title}, ${amount}, ${badge.label}`}
        className={cn('w-full flex-row rounded-xl pr-4 gap-4', className)}
        {...rest}
      >
        <View className="flex-1 justify-center border-b border-overlay-soft/20">
          <View className="flex-row items-center gap-2">
            <Typo
              size="base"
              weight="medium"
              className="leading-5 shrink"
              numberOfLines={1}
              testID="payment-title"
            >
              {title}
            </Typo>
            <View
              className={cn('rounded-sm px-2 py-0.5', badge.containerClassName)}
              testID="payment-status"
            >
              <Typo size="3xs" weight="medium" className={badge.textClassName}>
                {badge.label}
              </Typo>
            </View>
          </View>

          <View className="gap-1 pb-1">
            {/* Amount and card */}
            <View className="flex-row items-center gap-2">
              <Typo
                size="sm"
                weight="medium"
                className={AMOUNT_COLOR[status]}
                testID="payment-amount"
              >
                {isPaid ? `-${amount}` : amount}
              </Typo>
              <Typo
                size="2xs"
                className="text-gradient-medium"
                testID="payment-details"
              >
                {[
                  `${seatCount} ${seatCount === 1 ? 'seat' : 'seats'}`,
                  cardLast4 &&
                    `${formatCardBrand(cardBrand ?? 'card')} •••• ${cardLast4}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Typo>
            </View>

            {reservationNumber && (
              <Typo
                size="2xs"
                className="text-gradient-medium"
                testID="payment-reservation"
              >
                {reservationNumber}
              </Typo>
            )}

            {/* Stripe's decline reason, or why it was refunded — safe to show */}
            {!isPaid && failureMessage && (
              <Typo
                size="2xs"
                className="text-text-error"
                testID="payment-failure"
              >
                {failureMessage}
              </Typo>
            )}

            {dateText && (
              <Typo
                size="sm"
                weight="regular"
                className="text-white"
                testID="payment-date"
              >
                {dateText}
              </Typo>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  },
);

PaymentHistoryItem.displayName = 'PaymentHistoryItem';
