import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { memo } from 'react';
import { View } from 'react-native';
import { useResolveClassNames } from 'uniwind';

// Constants
import { BottomTabConfig, NAVIGATION_BOTTOM_TABS } from '@/constants';

// Utils
import { cn } from '@/utils/cn';
import { isIOS } from '@/utils/platform';

// Components
import { TabBarItem } from './TabBarItem';

type CustomTabBarProps = BottomTabBarProps & {
  disabledRoutes?: string[];
  bottomInset?: number;
  /**
   * Which tab config (title/icon per route name) to render. Defaults to the
   * customer tab set; the admin tab set (DDR-019) reuses the same route
   * names with different titles/icons, so this is a prop rather than a
   * second static import inside `TabBarItem`.
   */
  bottomTabs?: BottomTabConfig[];
};

export const NavigationTabBar = memo(
  ({
    disabledRoutes,
    state,
    descriptors,
    navigation,
    bottomInset = 24,
    bottomTabs = NAVIGATION_BOTTOM_TABS,
  }: CustomTabBarProps) => {
    const colorIconInActive = useResolveClassNames('text-text-alternative');
    const colorActive = useResolveClassNames('text-text-white');

    return (
      <View
        className={cn(`flex-row border-0 bg-deep-blue`, isIOS() && 'shadow-md')}
        accessibilityLabel="Main navigation tabs"
        accessibilityHint="Tap to select a tab"
        style={{
          paddingBottom: bottomInset + 16,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key] || {};
          const isFocused = state.index === index;
          const isDisabled = disabledRoutes?.includes(route.name);

          return (
            <TabBarItem
              key={route.key}
              route={route}
              options={options || {}}
              isFocused={isFocused}
              isDisabled={isDisabled}
              navigation={navigation}
              colorActive={colorActive.color}
              colorInactive={colorIconInActive.color}
              bottomTabs={bottomTabs}
            />
          );
        })}
      </View>
    );
  },
);

NavigationTabBar.displayName = 'NavigationTabBar';
