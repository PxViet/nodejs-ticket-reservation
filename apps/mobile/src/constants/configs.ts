// Icons
import { ChangeLanguageIcon } from '@/icons/ChangeLanguageIcon';
import { EditProfileIcon } from '@/icons/EditProfileIcon';
import { HelpCenterIcon } from '@/icons/HelpCenterIcon';
import { LikeIcon } from '@/icons/LikeIcon';
import { LockIcon } from '@/icons/LockIcon';
import { LogoutIcon } from '@/icons/LogoutIcon';
import { MyWalletIcon } from '@/icons/MyWalletIcon';

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_SESSION: 'user_session',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  AUTH_KEYS: 'supabase.auth.token',
  AUTH_REFRESH_TOKEN: 'supabase.auth.refresh_token',
  USER_PIN: 'user_pin',
  BIOMETRIC_KEY: 'biometric_key',
};

export const SECURE_STORE_SIZE_LIMIT = 2048; // bytes (iOS limit)

// Session data field classification
export const SENSITIVE_SESSION_FIELDS = [
  'access_token',
  'refresh_token',
  'provider_token',
  'provider_refresh_token',
];

export const NON_SENSITIVE_SESSION_FIELDS = [
  'user',
  'expires_at',
  'expires_in',
  'token_type',
];

export const API_CONFIG = {
  SEAT_RESERVATION_TIMEOUT: 10 * 60 * 1000,
  TICKET_EXPIRY_TIME: 24 * 60 * 60 * 1000,
  QUERY_STALE_TIME: 5 * 60 * 1000,
  MOVIE_STALE_TIME: 2 * 60 * 1000,
  BOOKING_STALE_TIME: 1 * 60 * 1000,
};

export const PAGINATION = {
  PAGE_OFFSET: 0,
  PAGE_LIMIT: 10,
  PAGE_LIMIT_MAX: 20,
};

export const TAB_BAR_THEME = {
  BACKGROUND_COLOR: '#051138',
  ACTIVE_COLOR: '#fff',
  INACTIVE_COLOR: '#42476a',
  ACTIVE_BORDER_COLOR: '#1dc7f7',
  LABEL_STYLE: {
    fontSize: 12,
    fontWeight: '300',
    marginTop: 4,
  },
  ICON_SIZE: 24,
} as const;

export const SCREEN_COLOR_PRIMARY = '#0B0F2F';

export const TOAST_DURATION = 3000;

export const TEXT_MAX_LENGTH = 150;

// The API has no wallet/payment module yet, so checkout skips the balance
// check. Flip this back on once wallet lands.
export const IS_WALLET_ENABLED =
  process.env.EXPO_PUBLIC_IS_WALLET_ENABLED === 'true';

export const TOP_UP_MIN_AMOUNT = 10000;
export const TOP_UP_MAX_AMOUNT = 10000000;
export const TOP_UP_AMOUNTS = [
  50000, 100000, 150000, 200000, 250000, 500000, 750000, 1000000,
];

export const ROWS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;
export const COLUMN_COUNT = 10;
export const BOOKED_PROBABILITY = 0.2;
export const DAY_LABELS = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
] as const;
export const DAY_COUNT = 5;
export const MAX_MINUTES = 23 * 60;

export const SETTING_ITEMS = [
  {
    TITLE: 'Edit',
    ICON: EditProfileIcon,
    TEST_ID: 'edit',
  },
  {
    TITLE: 'My Wallet',
    ICON: MyWalletIcon,
    TEST_ID: 'my_wallet',
  },
  {
    TITLE: 'Change Language',
    ICON: ChangeLanguageIcon,
    TEST_ID: 'change_language',
  },
  {
    TITLE: 'Help Center',
    ICON: HelpCenterIcon,
    TEST_ID: 'help_center',
  },
  {
    TITLE: 'Rate Movea App',
    ICON: LikeIcon,
    TEST_ID: 'rate_app',
  },
  {
    TITLE: 'Change Password',
    ICON: LockIcon,
    TEST_ID: 'change_password',
  },
  {
    TITLE: 'Logout',
    ICON: LogoutIcon,
    TEST_ID: 'logout',
  },
];
