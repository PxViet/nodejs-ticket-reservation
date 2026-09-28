import { BookingStatus } from '@/features/booking/schemas/booking';

// Constants
import { BOOKING_STATUS } from './status';

export const ERROR_MESSAGES = {
  PHONE_NUMBER_REQUIRED: 'Phone number is required',
  UNKNOWN_ERROR: 'Something went wrong. Please try again later.',
  AUTHENTICATION_CANCELLED: 'Authentication was cancelled',
  OAUTH_AUTHENTICATION_FAILED: 'OAuth authentication failed',
  FAILED_TO_PARSE_AUTHENTICATION_TOKENS_FROM_CALLBACK_URL:
    'Failed to parse authentication tokens from callback URL',
  UPDATE_PROFILE_ERROR: 'Failed to update profile. Please try again later.',
  GET_PROFILE_ERROR: 'Failed to get profile. Please try again later.',
  DELETE_AVATAR_ERROR: 'Failed to delete avatar. Please try again later.',
  UPLOAD_AVATAR_ERROR: 'Failed to upload avatar. Please try again later.',
  INVALID_TICKET: 'Invalid ticket',
  TICKET_ALREADY_USED: 'Ticket already used',
  NO_RESULT_RETURNED: 'No result returned',
  NOT_FOUND: 'not found',
  BOOKING_NOT_FOUND: 'Booking not found',
  CANCEL_BOOKING_FAILED: 'Failed to cancel booking',
  TICKET_EXPIRED: 'Ticket expired',
  TICKET_INVALID_FORMAT: 'Invalid QR code format',
  EMAIL_REQUIRED: 'Email is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  PASSWORD_REQUIRED: 'Password is required',
  FULL_NAME_REQUIRED: 'Full name is required',
  FULL_NAME_MIN_LENGTH: (length: number) =>
    `Full name must be at least ${length} characters`,
  FULL_NAME_MAX_LENGTH: (length: number) =>
    `Full name must not exceed ${length} characters`,
  FIRST_NAME_REQUIRED: 'First name is required',
  LAST_NAME_REQUIRED: 'Last name is required',
  NAME_MIN_LENGTH: (length: number) => `Must be at least ${length} characters`,
  NAME_MAX_LENGTH: (length: number) => `Must not exceed ${length} characters`,
  PASSWORD_MIN_LENGTH: (length: number) =>
    `Password must be at least ${length} characters`,
  PASSWORD_UPPERCASE: 'Password must contain at least one uppercase letter',
  PASSWORD_LOWERCASE: 'Password must contain at least one lowercase letter',
  PASSWORD_SPECIAL_CHAR: 'Password must contain at least one special character',
  CONFIRM_PASSWORD_REQUIRED: 'Please confirm your password',
  PASSWORD_NOT_MATCH: 'Passwords do not match',
  TAKE_PICTURE_ERROR: 'Failed to take picture. Please try again.',
  LOGIN_FAILED: 'Login failed. Please try again.',
  INVALID_EMAIL_PASSWORD: 'Invalid email or password. Please try again.',
  GOOGLE_SIGN_IN_FAILED: 'Google Sign In Failed',
  FACEBOOK_SIGN_IN_FAILED: 'Facebook Sign In Failed',
  SIGNUP_FAILED: 'Sign Up Failed',
  MOVIE_NETWORK_ERROR:
    'We’re having trouble loading movies. Please try again later.',
  TICKET_NETWORK_ERROR:
    'We’re having trouble loading tickets. Please try again later.',
  LOCATION_PERMISSION_DENIED: 'Permission to access location was denied',
  INVALID_PHONE_NUMBER: 'Invalid phone number format',
  UPDATE_FAILED: 'Update failed',
  UPDATE_PROFILE_FAILED: 'Failed to update profile',
  CHECKOUT_FAILED: 'Failed to create your booking',
  CHECKOUT_DECLINED: 'Your payment was declined.',
  CHECKOUT_REFUNDED:
    'Your seats were released before the payment completed, so it was refunded. Please pick your seats again.',
  PAYMENTS_LOAD_FAILED: 'Could not load your payments.',
  PAYMENT_METHODS_LOAD_FAILED: 'Could not load your saved cards.',
  ADD_CARD_FAILED: 'Could not save your card. Please try again.',
  SELECT_CARD_REQUIRED: 'Choose a card to pay with.',
  UPDATE_PASSWORD_FAILED: 'Failed to update password. Please try again.',
  SOMETHING_WENT_WRONG: 'Something went wrong. Please try again later.',
  TICKET_VALIDATION_FAILED: 'Failed to validate ticket. Please try again.',
};

export const MESSAGES = {
  TICKET_VALIDATED_SUCCESS: 'Ticket validated successfully',
  PERMISSION_REQUIRED: 'Permission Required',
  CAMERA_ROLL_PERMISSION_REQUIRED:
    'Sorry, we need camera roll permissions to make this work!',
  CAMERA_PERMISSION_REQUIRED:
    'Sorry, we need camera permissions to take photos!',
  SIGNUP_SUCCESS: 'Sign up successful',
  SIGNIN_SUCCESS: 'Successfully signed in!',
  ACCOUNT_CREATED: 'Your account is ready. Enjoy the movies!',
  NO_RESULT_FOUND: 'No results found. Please try a different search.',
  NO_TICKETS: 'Start your movie journey by booking a ticket',
  NO_ACTIVE_TICKETS: 'Book a movie to see your active tickets here',
  NO_EXPIRED_TICKETS: 'Your expired and used tickets will appear here',
  UPDATE_SUCCESS: 'Update successful',
  PROFILE_UPDATE_SUCCESS: 'Profile updated successfully',
  CHECKOUT_SUCCESS_TITLE: 'Happy Watching!',
  CHECKOUT_SUCCESS_DESCRIPTION: 'You have successfully bought the ticket.',
  CHECKOUT_PROCESSING:
    'Your payment is processing. Your ticket will appear once it is confirmed.',
  ADD_CARD_SUCCESS: 'Card saved',
  PASSWORD_UPDATE_SUCCESS: 'Your password has been changed successfully',
};

export const UNACTIVE_MESSAGE: Record<string, string> = {
  [BOOKING_STATUS.ACTIVE as BookingStatus]: '',
  [BOOKING_STATUS.EXPIRED as BookingStatus]:
    'This ticket has expired and can no longer be used.',
  [BOOKING_STATUS.USED as BookingStatus]:
    'This ticket has already been scanned and used.',
  [BOOKING_STATUS.CANCELLED as BookingStatus]:
    'This booking has been cancelled.',
};
