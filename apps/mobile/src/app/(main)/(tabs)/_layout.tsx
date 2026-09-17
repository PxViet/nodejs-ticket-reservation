import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Expo
import { Tabs } from 'expo-router';

// Constants
import {
  ADMIN_NAVIGATION_BOTTOM_TABS,
  NAVIGATION_BOTTOM_TABS,
  SCREEN_COLOR_PRIMARY,
  TABS,
} from '@/constants';

// Hooks
import { useAuth } from '@/features/auth/hooks/useAuth';

// Components
import { MainHeader } from '@/features/navigation/components/MainHeader';
import { NavigationTabBar } from '@/features/navigation/components/NavigationTabBar';

// Error Boundary
export { ErrorBoundary } from '@/components/ErrorBoundary';

const TabLayout = () => {
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();

  // DDR-019: the three tab slots are reused, not duplicated, for the admin
  // role — same route names (`index`/`wallet`/`my-ticket`), different
  // titles/icons and (inside each route file) different screen content.
  const BOTTOM_TAB = isAdmin
    ? ADMIN_NAVIGATION_BOTTOM_TABS
    : NAVIGATION_BOTTOM_TABS;

  return (
    <Tabs
      tabBar={props => (
        <NavigationTabBar
          bottomInset={insets.bottom}
          bottomTabs={BOTTOM_TAB}
          {...(props as unknown as BottomTabBarProps)}
        />
      )}
      screenOptions={{
        sceneStyle: {
          backgroundColor: SCREEN_COLOR_PRIMARY,
        },
        header: props => (
          <MainHeader
            isLeftTitle={props.route.name !== TABS.WALLET.NAME}
            isRenderUserProfile={
              !isAdmin && props.route.name === TABS.HOME.NAME
            }
            topInset={insets.top}
            {...props}
          />
        ),
      }}
    >
      {BOTTOM_TAB.map(({ NAME, TITLE }) => (
        <Tabs.Screen
          key={NAME}
          name={NAME}
          options={{
            title: TITLE,
          }}
        />
      ))}
    </Tabs>
  );
};

export default TabLayout;
