import { ComponentType } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgProps } from 'react-native-svg';
import { useShallow } from 'zustand/react/shallow';

// Expo
import { NativeStackHeaderProps, usePathname, useRouter } from 'expo-router';

// Components
import { Typo } from '@/components/Typo';

// Icons
import { ArrowBackIcon } from '@/icons/ArrowBackIcon';

// Constants
import { ROUTES, SCREENS } from '@/constants';

// Utils
import { cn } from '@/utils/cn';
import { getHeaderTitle, isScreenPathname } from '@/utils/convert';

// Stores
import { useBookingStore } from '@/features/booking/store/booking';
import { useMovieStore } from '@/stores/movie';

export interface ScreenHeaderProps extends NativeStackHeaderProps {
  title?: string;
  showBackButton?: boolean;
  rightIcon?: ComponentType<SvgProps>;
  leftIcon?: ComponentType<SvgProps>;
  topInset?: number;
}

export const ScreenHeader = ({
  title,
  showBackButton = true,
  rightIcon,
  leftIcon,
  topInset,
}: ScreenHeaderProps) => {
  // SDK 58: Constants.statusBarHeight is read once at launch from a deprecated
  // iOS API and comes back 0 under iOS 26 scenes, putting the header under the
  // status bar. The safe-area inset is measured live.
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  // Dynamic header title from store
  const { selectedMovie, clearSelectedMovie } = useMovieStore(
    useShallow(state => ({
      selectedMovie: state.selectedMovie,
      clearSelectedMovie: state.clearSelectedMovie,
    })),
  );

  const { selectedSeats, setSeats } = useBookingStore(
    useShallow(state => ({
      selectedSeats: state.selectedSeats,
      setSeats: state.setSeats,
    })),
  );

  // Screen type checks
  const isProfileScreen = isScreenPathname(pathname, SCREENS.MAIN.PROFILE);
  const isCinemaScreen = isScreenPathname(pathname, SCREENS.MAIN.CINEMA);
  const isSeatScreen = isScreenPathname(pathname, SCREENS.MAIN.SEATS);

  const headerTitle =
    title ||
    getHeaderTitle(pathname) ||
    (!isSeatScreen && selectedMovie?.title);

  const handleGoBack = () => {
    // Profile screen: Replace navigation to home instead of going back
    // This prevents returning to auth screens after login
    if (isProfileScreen) {
      return router.replace(ROUTES.HOME);
    }

    // Clear dynamic header title only when leaving Cinema screen
    // This ensures the movie title persists through the booking flow (Cinema → Seats → Checkout)
    // but clears when user exits the booking flow by going back from Cinema
    if (selectedMovie?.title && isCinemaScreen) clearSelectedMovie();

    // Seats screen: Clear all selected seats when user navigates away
    // This resets the booking state to avoid stale seat selections
    if (selectedSeats.length > 0 && isSeatScreen) {
      setSeats([]);
    }

    router.back();
  };

  const LeftIcon = leftIcon;
  const RightIcon = rightIcon;

  return (
    <View
      className="bg-bg-primary"
      style={{ paddingTop: topInset ?? insets.top }}
    >
      <View className="flex-row justify-between px-6 py-6">
        {/* Left Section */}
        <View className={cn('flex-1 items-start')}>
          {showBackButton && router.canGoBack() && (
            <TouchableOpacity
              accessible
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Navigate to the previous screen"
              onPress={handleGoBack}
            >
              {LeftIcon ? (
                <LeftIcon />
              ) : (
                <ArrowBackIcon width={20} height={20} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Center Section - Title */}
        {headerTitle && (
          <View accessible className="w-46 items-center">
            <Typo
              size="2xl"
              weight="semibold"
              className="leading-7 text-center"
              accessibilityRole="header"
              accessibilityLabel={headerTitle}
              accessibilityHint={headerTitle}
            >
              {headerTitle}
            </Typo>
          </View>
        )}

        {/* Right Section */}
        <View
          accessible
          className="flex-1 items-end"
          accessibilityLabel="Right section"
        >
          {RightIcon && <RightIcon />}
        </View>
      </View>
    </View>
  );
};

ScreenHeader.displayName = 'ScreenHeader';
