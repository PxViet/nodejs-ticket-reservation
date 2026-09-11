import {
  BottomTabNavigationEventMap,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { ComponentType, memo, useCallback } from 'react';
import { ColorValue, Pressable, View } from 'react-native';
import { SvgProps } from 'react-native-svg';

// Constants
import {
  BottomTabConfig,
  NAVIGATION_BOTTOM_TABS,
  TAB_BAR_THEME,
} from '@/constants';

// Utils
import { cn } from '@/utils/cn';

// Components
import { Typo } from '@/components/Typo';
import {
  NavigationHelpers,
  NavigationRoute,
  ParamListBase,
} from '@react-navigation/native';

interface TabBarItemProps {
  route: NavigationRoute<ParamListBase, string>;
  options: BottomTabNavigationOptions;
  isFocused: boolean;
  isDisabled?: boolean;
  navigation: NavigationHelpers<ParamListBase, BottomTabNavigationEventMap>;
  colorActive?: ColorValue;
  colorInactive?: ColorValue;
  bottomTabs?: BottomTabConfig[];
}

export const TabBarItem = memo(
  ({
    route,
    options,
    isFocused,
    isDisabled,
    navigation,
    colorActive,
    colorInactive,
    bottomTabs = NAVIGATION_BOTTOM_TABS,
  }: TabBarItemProps) => {
    const tabConfig = Object.values(bottomTabs).find(
      tab => tab.NAME === route.name,
    );

    const label = options.title || route.name;

    const renderTabBarIcon = useCallback(
      (
        Icon: ComponentType<SvgProps>,
        focused = false,
        disabled = false,
        size = 24,
        colorActive?: ColorValue,
        colorInactive?: ColorValue,
      ) => {
        const color = disabled
          ? colorInactive
          : focused
            ? colorActive
            : colorInactive;

        return (
          <Icon
            width={size}
            height={size}
            color={color}
            testID={`icon-${Icon.name}-${focused}-${disabled}`}
          />
        );
      },
      [],
    );

    const onPress = useCallback(() => {
      if (isDisabled) return;
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    }, [isDisabled, isFocused, navigation, route.key, route.name]);

    const onLongPress = useCallback(() => {
      if (isDisabled) return;
      navigation.emit({
        type: 'tabLongPress',
        target: route.key,
      });
    }, [isDisabled, navigation, route.key]);

    if (!tabConfig) return null;

    const IconComponent = isFocused ? tabConfig.ICON : tabConfig.ICON_INACTIVE;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityState={{ selected: isFocused, disabled: isDisabled }}
        accessibilityLabel={options.tabBarAccessibilityLabel || label}
        accessibilityHint={`Navigates to the ${label} screen`}
        testID={options.tabBarButtonTestID}
        onPress={onPress}
        onLongPress={onLongPress}
        className="flex-1 items-center justify-center pt-5 gap-0.5"
        disabled={isDisabled}
      >
        {renderTabBarIcon(
          IconComponent,
          isFocused,
          isDisabled,
          24,
          colorActive,
          colorInactive,
        )}
        <Typo
          weight="medium"
          size="3xs"
          className={cn('text-text-white/70', isFocused && 'text-text-white')}
        >
          {label}
        </Typo>
        {isFocused && (
          <View
            testID={`tab-indicator-${route.key}`}
            className="absolute top-0 right-0 h-0.5 w-11 left-1/2 -translate-x-1/2 rounded-full"
            style={{
              backgroundColor: TAB_BAR_THEME.ACTIVE_BORDER_COLOR,
            }}
            accessible={false}
            importantForAccessibility="no"
          />
        )}
      </Pressable>
    );
  },
);

TabBarItem.displayName = 'TabBarItem';
