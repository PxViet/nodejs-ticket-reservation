import { memo, useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';

// Components
import { Typo } from '@/components/Typo';

// Types
import type { PaymentMethod } from '@/features/payments/schemas/payments';

// Utils
import { cn } from '@/utils/cn';
import { formatCardBrand, formatCardExpiry } from '@/utils/formats';

interface PaymentMethodItemProps {
  paymentMethod: PaymentMethod;
  isSelected: boolean;
  onSelect: (paymentMethod: PaymentMethod) => void;
}

/** A saved card — Stripe's display fields only; the number never leaves Stripe. */
export const PaymentMethodItem = memo(
  ({ paymentMethod, isSelected, onSelect }: PaymentMethodItemProps) => {
    const { brand, last4, expMonth, expYear } = paymentMethod;
    const brandName = formatCardBrand(brand);

    const handlePress = useCallback(() => {
      onSelect(paymentMethod);
    }, [paymentMethod, onSelect]);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        testID={`payment-method-${paymentMethod.id}`}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={`${brandName} ending in ${last4}, expires ${formatCardExpiry(expMonth, expYear)}`}
        className={cn(
          'flex-row items-center gap-4 p-4 rounded-lg border',
          isSelected
            ? 'bg-bg-quaternary border-primary'
            : 'bg-bg-quaternary border-bg-quaternary',
        )}
      >
        {/* Brand badge */}
        <View className="w-12 h-8 rounded-sm bg-dark-blue items-center justify-center">
          <Typo size="3xs" weight="semibold" className="uppercase">
            {brand}
          </Typo>
        </View>

        <View className="flex-1 gap-1">
          <Typo size="sm" weight="medium">
            {`${brandName} •••• ${last4}`}
          </Typo>
          <Typo size="2xs" className="text-gradient-medium">
            {`Expires ${formatCardExpiry(expMonth, expYear)}`}
          </Typo>
        </View>

        {/* Radio */}
        <View
          className={cn(
            'w-5 h-5 rounded-full border-2 items-center justify-center',
            isSelected ? 'border-primary' : 'border-overlay-soft',
          )}
        >
          {isSelected && (
            <View className="w-2.5 h-2.5 rounded-full bg-primary" />
          )}
        </View>
      </TouchableOpacity>
    );
  },
);

PaymentMethodItem.displayName = 'PaymentMethodItem';
