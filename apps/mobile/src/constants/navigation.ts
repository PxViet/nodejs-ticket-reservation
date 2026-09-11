import { ComponentType } from 'react';
import { SvgProps } from 'react-native-svg';

// Icons
import { HomeIcon } from '@/icons/HomeIcon';
import { TicketIcon } from '@/icons/TicketIcon';
import { WalletIcon } from '@/icons/WalletIcon';
import { HomeOutlineIcon } from '@/icons/HomeOutlineIcon';
import { TicketOutlineIcon } from '@/icons/TicketOutlineIcon';
import { WalletOutlineIcon } from '@/icons/WalletOutlineIcon';
import { ReportIcon } from '@/icons/ReportIcon';
import { ReportOutlineIcon } from '@/icons/ReportOutlineIcon';
import { ProfileNavIcon } from '@/icons/ProfileNavIcon';
import { ProfileNavOutlineIcon } from '@/icons/ProfileNavOutlineIcon';

export const SCREENS = {
  // Main screens
  MAIN: {
    LAYOUT: '(main)',
    WELCOME: 'welcome',
    MOVIES: 'movies/[id]',
    TICKETS: 'tickets/[id]',
    PROFILE: 'profile/index',
    PROFILE_EDIT: 'profile/edit',
    PROFILE_CHANGE_PASSWORD: 'profile/change-password',

    // Booking
    CINEMA: 'booking/cinema',
    SEATS: 'booking/seats',
    CHECKOUT: 'booking/checkout',
    CHECKOUT_SUCCESS: 'booking/checkout-success',

    // Purchase
    PURCHASE_SUCCESS: 'purchase/purchase-success',
    TOP_UP: 'purchase/top-up',

    // Modal screens
    SEARCH: 'search',

    // Admin (RBAC-gated, see DDR-019)
    ADMIN_MOVIE_FORM: 'admin/movie-form',
  },

  // Auth screens
  AUTH: {
    LAYOUT: '(auth)',
    SIGNIN: 'signin',
    SIGNUP: 'signup',
    ONBOARDING: 'onboarding',
    FORGOT_PASSWORD: 'forgot-password',
    RESET_PASSWORD: 'reset-password',
  },

  // Tab screens
  TABS: {
    LAYOUT: '(tabs)',
    HOME: 'index',
  },

  STORYBOOK: '(storybook)/index',
} as const;

export const TABS = {
  HOME: {
    NAME: 'index',
    TITLE: 'Movies',
  },
  WALLET: {
    NAME: 'wallet',
    TITLE: 'Wallet',
  },
  MY_TICKET: {
    NAME: 'my-ticket',
    TITLE: 'My Ticket',
  },
} as const;

/** One bottom-tab slot's title/icon config, shared by the customer and admin
 * tab sets (DDR-019) so `NavigationTabBar`/`TabBarItem` can accept either. */
export interface BottomTabConfig {
  TITLE: string;
  NAME: string;
  ICON: ComponentType<SvgProps>;
  ICON_INACTIVE: ComponentType<SvgProps>;
}

export const NAVIGATION_BOTTOM_TABS: BottomTabConfig[] = [
  {
    TITLE: TABS.HOME.TITLE,
    NAME: TABS.HOME.NAME,
    ICON: HomeIcon,
    ICON_INACTIVE: HomeOutlineIcon,
  },
  {
    TITLE: TABS.WALLET.TITLE,
    NAME: TABS.WALLET.NAME,
    ICON: WalletIcon,
    ICON_INACTIVE: WalletOutlineIcon,
  },
  {
    TITLE: TABS.MY_TICKET.TITLE,
    NAME: TABS.MY_TICKET.NAME,
    ICON: TicketIcon,
    ICON_INACTIVE: TicketOutlineIcon,
  },
];

// DDR-019: an admin gets the same three tab slots (`index`/`wallet`/`my-ticket`)
// as a regular customer, retitled and re-iconed for admin tasks — not a fourth
// tab, and not a separate navigator. Movies/Wallet/My Ticket are not useful to
// an admin account, so the slots are repurposed for movie management, reports
// and (still) their own profile.
export const ADMIN_TABS = {
  MOVIES: {
    NAME: TABS.HOME.NAME,
    TITLE: 'Manage Movies',
  },
  REPORTS: {
    NAME: TABS.WALLET.NAME,
    TITLE: 'Reports',
  },
  PROFILE: {
    NAME: TABS.MY_TICKET.NAME,
    TITLE: 'Profile',
  },
} as const;

export const ADMIN_NAVIGATION_BOTTOM_TABS: BottomTabConfig[] = [
  {
    TITLE: ADMIN_TABS.MOVIES.TITLE,
    NAME: ADMIN_TABS.MOVIES.NAME,
    ICON: HomeIcon,
    ICON_INACTIVE: HomeOutlineIcon,
  },
  {
    TITLE: ADMIN_TABS.REPORTS.TITLE,
    NAME: ADMIN_TABS.REPORTS.NAME,
    ICON: ReportIcon,
    ICON_INACTIVE: ReportOutlineIcon,
  },
  {
    TITLE: ADMIN_TABS.PROFILE.TITLE,
    NAME: ADMIN_TABS.PROFILE.NAME,
    ICON: ProfileNavIcon,
    ICON_INACTIVE: ProfileNavOutlineIcon,
  },
];
