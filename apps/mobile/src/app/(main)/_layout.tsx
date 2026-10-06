import { StripeProvider } from '@stripe/stripe-react-native';
import { Stack } from 'expo-router';

// Constants
import {
  SCREEN_COLOR_PRIMARY,
  SCREENS,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_URL_SCHEME,
} from '@/constants';

// Hooks
import { useAuth } from '@/features/auth/hooks/useAuth';

// Components
import { ScreenHeader } from '@/features/navigation/components/ScreenHeader';

// Error Boundary
export { ErrorBoundary } from '@/components/ErrorBoundary';

const MainLayout = () => {
  const { isAdmin } = useAuth();

  // ADR-018: only a signed-in customer can add a card or pay at checkout, so
  // Stripe is initialised here rather than in the root layout.
  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      urlScheme={STRIPE_URL_SCHEME}
    >
      <Stack
        screenOptions={{
          header: ScreenHeader,
          contentStyle: { backgroundColor: SCREEN_COLOR_PRIMARY },
        }}
      >
        <Stack.Screen
          name={SCREENS.MAIN.WELCOME}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name={SCREENS.TABS.LAYOUT}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name={SCREENS.MAIN.MOVIES}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name={SCREENS.MAIN.CINEMA} />
        <Stack.Screen name={SCREENS.MAIN.TICKETS} />
        <Stack.Screen name={SCREENS.MAIN.SEATS} />
        <Stack.Screen
          name={SCREENS.MAIN.CHECKOUT_SUCCESS}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name={SCREENS.MAIN.CHECKOUT} />
        <Stack.Screen
          name={SCREENS.MAIN.SEARCH}
          options={{
            presentation: 'containedModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name={SCREENS.MAIN.PROFILE} />
        <Stack.Screen name={SCREENS.MAIN.PROFILE_EDIT} />
        <Stack.Screen name={SCREENS.MAIN.PROFILE_CHANGE_PASSWORD} />

        {/* Admin only (DDR-019). This is a UX guard, not the authorization
            boundary — the API's RolesGuard (ADR-006) is what actually protects
            the underlying movie-mutation endpoints. */}
        <Stack.Protected guard={isAdmin}>
          <Stack.Screen name={SCREENS.MAIN.ADMIN_MOVIE_FORM} />
        </Stack.Protected>
      </Stack>
    </StripeProvider>
  );
};

export default MainLayout;
