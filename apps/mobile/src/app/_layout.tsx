import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { Fragment, useEffect, useRef } from 'react';

// Uniwind
import { Uniwind, useUniwind } from 'uniwind';

// React Query
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Router
import { Stack, useRouter, useSegments } from 'expo-router';

// SplashScreen
import * as SplashScreen from 'expo-splash-screen';

// Font
import {
  Montserrat_300Light,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  useFonts,
} from '@expo-google-fonts/montserrat';

// Constants
import { ROUTES, SCREEN_COLOR_PRIMARY, SCREENS } from '@/constants';

// Hooks
import { useAuth } from '@/features/auth/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// HTTP
import { ApiError } from '@/services/api/client';

// Components
import { Loading } from '@/components/Loading';
import { Toast } from '@/components/Toast';

// Error Boundary
export { ErrorBoundary } from '@/components/ErrorBoundary';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();
SystemUI.setBackgroundColorAsync(SCREEN_COLOR_PRIMARY);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A recoverable 401 is retried inside `apiRequest` and never lands here;
      // one that reaches this point means the session is already gone, so don't
      // retry it.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.status === 401) &&
        failureCount < 2,
      staleTime: 60 * 1000, // 1 minute
    },
  },
});

const StorybookEnabled = process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === 'true';

export const unstable_settings = {
  initialRouteName: StorybookEnabled ? SCREENS.STORYBOOK : SCREENS.AUTH.LAYOUT,
};

const RootLayout = () => {
  const { theme } = useUniwind();
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Track previous authentication state to detect logout vs fresh install
  const prevIsAuthenticatedRef = useRef<boolean | null>(null);
  const hasInitializedRef = useRef(false);

  // Initialize push notifications
  usePushNotifications();

  const [loaded, error] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    Uniwind.setTheme('dark');
  }, []);

  // Handle authentication routing
  useEffect(() => {
    if (isLoading || !loaded) return;

    if (StorybookEnabled) {
      // If storybook is enabled, do not perform any redirects
      SplashScreen.hideAsync();
      return;
    }

    // Track if this is the first initialization
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevIsAuthenticatedRef.current = isAuthenticated;
    }

    const inAuthGroup = segments[0] === SCREENS.AUTH.LAYOUT;

    if (!isAuthenticated && !inAuthGroup) {
      // Detect logout: user was authenticated before but now is not
      // Fresh install: user was never authenticated (prevIsAuthenticatedRef is null or false)
      const wasAuthenticatedBefore = prevIsAuthenticatedRef.current === true;
      const isLogout = wasAuthenticatedBefore && !isAuthenticated;

      // Only redirect to signin if user logged out (was authenticated before)
      // Otherwise, redirect to onboarding for new users
      router.replace(isLogout ? ROUTES.LOGIN : ROUTES.ONBOARDING);
    } else if (isAuthenticated && inAuthGroup) {
      const currentScreen = segments[segments.length - 1];

      const isComingFromRegister = currentScreen === SCREENS.AUTH.SIGNUP;

      if (isComingFromRegister) {
        router.replace(ROUTES.WELCOME);
      } else {
        router.replace(ROUTES.HOME);
      }
    }

    // Update previous authentication state
    prevIsAuthenticatedRef.current = isAuthenticated;

    // Hide splash screen
    SplashScreen.hideAsync();
  }, [isAuthenticated, segments, isLoading, loaded, router]);

  if (!loaded) {
    return null;
  }

  return (
    <Fragment>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: SCREEN_COLOR_PRIMARY },
          }}
        >
          {/* Storybook - Only accessible when enabled */}
          <Stack.Protected guard={StorybookEnabled}>
            <Stack.Screen name={SCREENS.STORYBOOK} />
          </Stack.Protected>

          {/* Auth screens - Only accessible when NOT authenticated */}
          <Stack.Protected guard={!isAuthenticated}>
            <Stack.Screen name={SCREENS.AUTH.LAYOUT} />
          </Stack.Protected>

          {/* Protected screens - Only accessible when authenticated */}
          <Stack.Protected guard={isAuthenticated}>
            <Stack.Screen name={SCREENS.MAIN.LAYOUT} />
          </Stack.Protected>
        </Stack>
        <StatusBar style={theme === 'light' ? 'dark' : 'light'} />
        <Toast />
        <Loading />
      </QueryClientProvider>
    </Fragment>
  );
};

export default RootLayout;
