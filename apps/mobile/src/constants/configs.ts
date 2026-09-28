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

// ADR-018: a publishable key is safe to ship in the client; it must be the
// pair of the API's STRIPE_SECRET_KEY or SetupIntents will not confirm.
export const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

// Where Stripe returns after a bank's 3-D Secure page. `scheme` in app.config.ts.
export const STRIPE_URL_SCHEME = 'movieticketbooking';
export const STRIPE_RETURN_URL = `${STRIPE_URL_SCHEME}://stripe-redirect`;

// The name PaymentSheet shows the customer when they add a card.
export const STRIPE_MERCHANT_DISPLAY_NAME = 'Movea';

// A checkout the synchronous response left unsettled (3-D Secure, or Stripe
// still processing) is polled until the webhook settles it (ADR-018 rule 4),
// then handed back as still processing.
export const CHECKOUT_POLL_INTERVAL_MS = 1500;
export const CHECKOUT_POLL_ATTEMPTS = 8;

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
    TITLE: 'Payment History',
    ICON: MyWalletIcon,
    TEST_ID: 'payment_history',
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
