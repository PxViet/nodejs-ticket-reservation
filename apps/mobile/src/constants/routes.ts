import { Href } from 'expo-router';

export const ROUTES = {
  // Main routes
  MOVIE_DETAILS: (id: string): Href => `/(main)/movies/${id}`,
  CHECKOUT: '/(main)/booking/checkout',
  CINEMA: '/(main)/booking/cinema',
  TICKET_DETAILS: (id: string): Href => `/(main)/tickets/${id}`,
  SEATS: '/(main)/booking/seats',
  CHECKOUT_SUCCESS: '/(main)/booking/checkout-success',

  // Profile routes
  PROFILE: '/(main)/profile',
  PROFILE_EDIT: '/(main)/profile/edit',
  PROFILE_CHANGE_PASSWORD: '/(main)/profile/change-password',

  // Auth routes
  LOGIN: '/(auth)/signin',
  SIGNUP: '/(auth)/signup',
  ONBOARDING: '/(auth)/onboarding',
  FORGOT_PASSWORD: '/(auth)/forgot-password',
  RESET_PASSWORD: '/(auth)/reset-password',
  CONFIRM_ACCOUNT: '/confirm-account',

  // Tab routes
  HOME: '/(main)/(tabs)',
  MY_TICKET: '/(main)/(tabs)/my-ticket',
  MY_WALLET: '/(main)/(tabs)/wallet',

  // Purchase routes
  PURCHASE_SUCCESS: '/(main)/purchase/purchase-success',
  TOP_UP: '/(main)/purchase/top-up',

  WELCOME: '/(main)/welcome',

  // Modal routes
  SEARCH: '/(main)/search',

  // Admin routes (RBAC-gated, see DDR-019) — no id creates, an id edits.
  ADMIN_MOVIE_FORM: (id?: string): Href =>
    id ? `/(main)/admin/movie-form?id=${id}` : '/(main)/admin/movie-form',
} as const;
