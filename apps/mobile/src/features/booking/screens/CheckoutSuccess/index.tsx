import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, View } from 'react-native';

// Constants
import { MESSAGES, ROUTES } from '@/constants';

// Components
import { Button } from '@/components/Button';
import { ConfirmationState } from '@/components/ConfirmationState';
import { Typo } from '@/components/Typo';

// Icons
import { TicketCheckedIcon } from '@/icons/TicketCheckedIcon';

// Stores
import { useBookingStore } from '@/features/booking/store/booking';

const CheckoutSuccessScreen = () => {
  const router = useRouter();
  const setSeats = useBookingStore(state => state.setSeats);

  const handleClearSeats = useCallback(() => {
    setSeats([]);
  }, [setSeats]);

  const handleNavigateToMyTicket = useCallback(() => {
    handleClearSeats();
    router.replace(ROUTES.MY_TICKET);
  }, [router, handleClearSeats]);

  const handleNavigateToHome = useCallback(() => {
    handleClearSeats();
    router.replace(ROUTES.HOME);
  }, [router, handleClearSeats]);

  return (
    <View className="flex-1 bg-dark-blue items-center justify-center gap-18">
      <ConfirmationState
        icon={TicketCheckedIcon}
        title={MESSAGES.CHECKOUT_SUCCESS_TITLE}
        description={MESSAGES.CHECKOUT_SUCCESS_DESCRIPTION}
      />
      <View className="w-full px-11 gap-4">
        <Button
          title="My Ticket"
          isPrimary
          onPress={handleNavigateToMyTicket}
          accessible
          accessibilityRole="button"
          accessibilityLabel="My Ticket"
          accessibilityHint="Go to my ticket screen"
        />
        <View className="flex-row justify-center items-center gap-1">
          <Typo weight="regular" size="xs">
            Discover new movies?
          </Typo>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Back to home"
            accessibilityHint="Navigates to the home screen"
            onPress={handleNavigateToHome}
          >
            <Typo className="text-text-currency" weight="medium" size="sm">
              Back to home
            </Typo>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default CheckoutSuccessScreen;
