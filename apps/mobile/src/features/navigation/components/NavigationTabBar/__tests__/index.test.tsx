import { TAB_BAR_THEME } from '@/constants';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { NavigationTabBar } from '..';

// Mock uniwind
jest.mock('uniwind', () => ({
  useResolveClassNames: jest.fn((className: string) => {
    if (className === 'text-text-alternative') {
      return { color: '#888888' };
    }
    if (className === 'text-text-white') {
      return { color: '#FFFFFF' };
    }
    return { color: '#000000' };
  }),
}));

// Mock utils
jest.mock('@/utils/platform', () => ({
  isIOS: jest.fn(() => false),
}));

jest.mock('@/utils/cn', () => ({
  cn: jest.fn((...classes: any[]) => classes.filter(Boolean).join(' ')),
}));

// Mock Typo component
jest.mock('@/components/Typo', () => ({
  Typo: ({ children, className, ...props }: any) => {
    const { Text } = require('react-native');
    return (
      <Text className={className} {...props}>
        {children}
      </Text>
    );
  },
}));

// Mock icon components
jest.mock('@/icons/HomeIcon', () => ({
  HomeIcon: 'HomeIcon',
}));

jest.mock('@/icons/HomeOutlineIcon', () => ({
  HomeOutlineIcon: 'HomeOutlineIcon',
}));

jest.mock('@/icons/WalletIcon', () => ({
  WalletIcon: 'WalletIcon',
}));

jest.mock('@/icons/WalletOutlineIcon', () => ({
  WalletOutlineIcon: 'WalletOutlineIcon',
}));

jest.mock('@/icons/TicketIcon', () => ({
  TicketIcon: 'TicketIcon',
}));

jest.mock('@/icons/TicketOutlineIcon', () => ({
  TicketOutlineIcon: 'TicketOutlineIcon',
}));

// Mock NAVIGATION_BOTTOM_TABS constant - it's an array, not an object
jest.mock('@/constants', () => {
  const { HomeIcon } = require('@/icons/HomeIcon');
  const { HomeOutlineIcon } = require('@/icons/HomeOutlineIcon');
  const { WalletIcon } = require('@/icons/WalletIcon');
  const { WalletOutlineIcon } = require('@/icons/WalletOutlineIcon');
  const { TicketIcon } = require('@/icons/TicketIcon');
  const { TicketOutlineIcon } = require('@/icons/TicketOutlineIcon');

  return {
    NAVIGATION_BOTTOM_TABS: [
      {
        TITLE: 'Movies',
        NAME: 'index',
        ICON: HomeIcon,
        ICON_INACTIVE: HomeOutlineIcon,
      },
      {
        TITLE: 'Wallet',
        NAME: 'wallet',
        ICON: WalletIcon,
        ICON_INACTIVE: WalletOutlineIcon,
      },
      {
        TITLE: 'My Ticket',
        NAME: 'my-ticket',
        ICON: TicketIcon,
        ICON_INACTIVE: TicketOutlineIcon,
      },
    ],
    TAB_BAR_THEME: {
      ACTIVE_BORDER_COLOR: '#1dc7f7',
    },
  };
});

describe('NavigationTabBar', () => {
  const mockNavigateToTab = jest.fn();
  const mockEmit = jest.fn(event => ({
    ...event,
    defaultPrevented: false,
  }));

  const createMockProps = (
    overrides?: Partial<BottomTabBarProps>,
  ): BottomTabBarProps => ({
    state: {
      routes: [
        { key: 'index-key', name: 'index', path: undefined },
        { key: 'wallet-key', name: 'wallet', path: undefined },
        { key: 'my-ticket-key', name: 'my-ticket', path: undefined },
      ],
      index: 0,
      routeNames: ['index', 'wallet', 'my-ticket'],
      history: [],
      type: 'tab',
      key: 'tab-key',
      stale: false,
      preloadedRouteKeys: [],
    } as any,
    descriptors: {
      'index-key': {
        options: {
          title: 'Movies',
          tabBarAccessibilityLabel: 'index tab',
          tabBarButtonTestID: 'tab-button-index',
        },
        navigation: {} as any,
        render: jest.fn(),
        route: { key: 'index-key', name: 'index', params: undefined },
      },
      'wallet-key': {
        options: {
          title: 'Wallet',
          tabBarAccessibilityLabel: 'wallet tab',
          tabBarButtonTestID: 'tab-button-wallet',
        },
        navigation: {} as any,
        render: jest.fn(),
        route: { key: 'wallet-key', name: 'wallet', params: undefined },
      },
      'my-ticket-key': {
        options: {
          title: 'My Ticket',
          tabBarAccessibilityLabel: 'my-ticket tab',
          tabBarButtonTestID: 'tab-button-my-ticket',
        },
        navigation: {} as any,
        render: jest.fn(),
        route: { key: 'my-ticket-key', name: 'my-ticket', params: undefined },
      },
    } as any,
    emitter: { emit: mockEmit } as any,
    navigateToTab: mockNavigateToTab,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all tabs correctly', () => {
      const props = createMockProps();
      const { getByText } = render(<NavigationTabBar {...props} />);

      expect(getByText('Movies')).toBeTruthy();
      expect(getByText('Wallet')).toBeTruthy();
      expect(getByText('My Ticket')).toBeTruthy();
    });

    it('should render with custom bottomInset', () => {
      const props = createMockProps();
      const { getByLabelText } = render(
        <NavigationTabBar {...props} bottomInset={32} />,
      );

      const tabBar = getByLabelText('Main navigation tabs');
      expect(tabBar.props.style.paddingBottom).toBe(48);
    });

    it('should render with default bottomInset when not provided', () => {
      const props = createMockProps();
      const { getByLabelText } = render(<NavigationTabBar {...props} />);

      const tabBar = getByLabelText('Main navigation tabs');
      expect(tabBar.props.style.paddingBottom).toBe(40);
    });

    it('should show active indicator for focused tab', () => {
      const props = createMockProps();
      const { getByTestId } = render(<NavigationTabBar {...props} />);

      const indicator = getByTestId('tab-indicator-index-key');
      expect(indicator).toBeTruthy();
      expect(indicator.props.style.backgroundColor).toBe(
        TAB_BAR_THEME.ACTIVE_BORDER_COLOR,
      );
    });

    it('should not show active indicator for unfocused tabs', () => {
      const props = createMockProps();
      const { queryByTestId } = render(<NavigationTabBar {...props} />);

      expect(queryByTestId('tab-indicator-wallet-key')).toBeNull();
      expect(queryByTestId('tab-indicator-my-ticket-key')).toBeNull();
    });

    it('should skip rendering tabs without config', () => {
      const props = createMockProps({
        state: {
          routes: [
            { key: 'index-key', name: 'index', path: undefined },
            { key: 'unknown-key', name: 'unknown', path: undefined },
          ],
          index: 0,
          routeNames: ['index', 'unknown'],
          history: [],
          type: 'tab',
          key: 'tab-key',
          stale: false,
          preloadedRouteKeys: [],
        } as any,
        descriptors: {
          'index-key': {
            options: { title: 'Movies' },
            navigation: {} as any,
            render: jest.fn(),
            route: { key: 'index-key', name: 'index', params: undefined },
          },
          'unknown-key': {
            options: { title: 'Unknown' },
            navigation: {} as any,
            render: jest.fn(),
            route: { key: 'unknown-key', name: 'unknown', params: undefined },
          },
        } as any,
      });

      const { getByText, queryByText } = render(
        <NavigationTabBar {...props} />,
      );

      expect(getByText('Movies')).toBeTruthy();
      expect(queryByText('Unknown')).toBeNull();
    });
  });

  describe('Navigation Interactions', () => {
    it('should navigate to tab on press when not focused', () => {
      const props = createMockProps();
      const { getByText } = render(<NavigationTabBar {...props} />);

      const walletTab = getByText('Wallet');
      fireEvent.press(walletTab);

      expect(mockEmit).toHaveBeenCalledWith({
        type: 'tabPress',
        target: 'wallet-key',
        canPreventDefault: true,
      });
      expect(mockNavigateToTab).toHaveBeenCalledWith('wallet-key');
    });

    it('should not navigate when tab is already focused', () => {
      const props = createMockProps();
      const { getByText } = render(<NavigationTabBar {...props} />);

      const moviesTab = getByText('Movies');
      fireEvent.press(moviesTab);

      expect(mockEmit).toHaveBeenCalledWith({
        type: 'tabPress',
        target: 'index-key',
        canPreventDefault: true,
      });
      expect(mockNavigateToTab).not.toHaveBeenCalled();
    });

    it('should not navigate when event is prevented', () => {
      mockEmit.mockReturnValueOnce({
        type: 'tabPress',
        target: 'wallet-key',
        defaultPrevented: true,
      });

      const props = createMockProps();
      const { getByText } = render(<NavigationTabBar {...props} />);

      const walletTab = getByText('Wallet');
      fireEvent.press(walletTab);

      expect(mockEmit).toHaveBeenCalled();
      expect(mockNavigateToTab).not.toHaveBeenCalled();
    });

    it('should emit tab long press event', () => {
      const props = createMockProps();
      const { getByText } = render(<NavigationTabBar {...props} />);

      const moviesTab = getByText('Movies');
      fireEvent(moviesTab, 'onLongPress');

      expect(mockEmit).toHaveBeenCalledWith({
        type: 'tabLongPress',
        target: 'index-key',
      });
    });
  });

  describe('Disabled Routes', () => {
    it('should not navigate when tab is disabled', () => {
      const props = createMockProps();
      const { getByText } = render(
        <NavigationTabBar {...props} disabledRoutes={['wallet']} />,
      );

      const walletTab = getByText('Wallet');
      fireEvent.press(walletTab);

      expect(mockEmit).not.toHaveBeenCalled();
      expect(mockNavigateToTab).not.toHaveBeenCalled();
    });

    it('should not emit long press event when tab is disabled', () => {
      const props = createMockProps();
      const { getByText } = render(
        <NavigationTabBar {...props} disabledRoutes={['wallet']} />,
      );

      const walletTab = getByText('Wallet');
      fireEvent(walletTab, 'onLongPress');

      expect(mockEmit).not.toHaveBeenCalled();
    });

    it('should allow navigation for enabled tabs when some are disabled', () => {
      const props = createMockProps();
      const { getByText } = render(
        <NavigationTabBar {...props} disabledRoutes={['wallet']} />,
      );

      const myTicketTab = getByText('My Ticket');
      fireEvent.press(myTicketTab);

      expect(mockEmit).toHaveBeenCalled();
      expect(mockNavigateToTab).toHaveBeenCalledWith('my-ticket-key');
    });
  });

  describe('Styling', () => {
    it('should apply focused text style to active tab', () => {
      const props = createMockProps();
      const { getByText } = render(<NavigationTabBar {...props} />);

      const moviesTab = getByText('Movies');
      expect(moviesTab.props.className).toContain('text-text-white');
    });

    it('should apply unfocused text style to inactive tabs', () => {
      const props = createMockProps();
      const { getByText } = render(<NavigationTabBar {...props} />);

      const walletTab = getByText('Wallet');
      expect(walletTab.props.className).toContain('text-text-white/70');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty routes array', () => {
      const props = createMockProps({
        state: {
          routes: [],
          index: 0,
          routeNames: [],
          history: [],
          type: 'tab',
          key: 'tab-key',
          stale: false,
          preloadedRouteKeys: [],
        } as any,
        descriptors: {},
      });

      const { getByLabelText } = render(<NavigationTabBar {...props} />);

      expect(getByLabelText('Main navigation tabs')).toBeTruthy();
    });

    it('should use route name as label when title is not provided', () => {
      const props = createMockProps({
        descriptors: {
          'index-key': {
            options: {},
            navigation: {} as any,
            render: jest.fn(),
            route: { key: 'index-key', name: 'index', params: undefined },
          },
          'wallet-key': {
            options: {},
            navigation: {} as any,
            render: jest.fn(),
            route: { key: 'wallet-key', name: 'wallet', params: undefined },
          },
          'my-ticket-key': {
            options: {},
            navigation: {} as any,
            render: jest.fn(),
            route: {
              key: 'my-ticket-key',
              name: 'my-ticket',
              params: undefined,
            },
          },
        } as any,
      });

      const { getByText } = render(<NavigationTabBar {...props} />);

      expect(getByText('index')).toBeTruthy();
      expect(getByText('wallet')).toBeTruthy();
      expect(getByText('my-ticket')).toBeTruthy();
    });

    it('should handle undefined disabledRoutes prop', () => {
      const props = createMockProps();
      const { getByText } = render(<NavigationTabBar {...props} />);

      const walletTab = getByText('Wallet');
      fireEvent.press(walletTab);

      expect(mockNavigateToTab).toHaveBeenCalledWith('wallet-key');
    });

    it('should handle empty disabledRoutes array', () => {
      const props = createMockProps();
      const { getByText } = render(
        <NavigationTabBar {...props} disabledRoutes={[]} />,
      );

      const walletTab = getByText('Wallet');
      fireEvent.press(walletTab);

      expect(mockNavigateToTab).toHaveBeenCalledWith('wallet-key');
    });
  });

  describe('Component Display Name', () => {
    it('should have correct display name', () => {
      expect(NavigationTabBar.displayName).toBe('NavigationTabBar');
    });
  });
});
