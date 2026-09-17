/**
 * Tab constants for movie filtering and detail views
 */

import { BOOKING_STATUS } from '@/constants/status';

/**
 * Internal constant for movie detail page tabs
 * Used to construct the DETAIL_MOVIE_TABS array
 */
const MOVIE_TABS = {
  ABOUT_MOVIE: {
    ID: 'about_movie',
    LABEL: 'About Movie',
  },
  REVIEW: {
    ID: 'review',
    LABEL: 'Review',
  },
} as const;

/**
 * Array of tabs for movie detail pages
 * Used to switch between "About Movie" and "Review" sections
 * on individual movie detail screens
 */
export const DETAIL_MOVIE_TABS = [
  { id: MOVIE_TABS.ABOUT_MOVIE.ID, label: MOVIE_TABS.ABOUT_MOVIE.LABEL },
  { id: MOVIE_TABS.REVIEW.ID, label: MOVIE_TABS.REVIEW.LABEL },
];

/**
 * Array of tabs for ticket pages
 * Used to switch between "All", "Active", and "Expired" tabs
 * on individual ticket screens
 */
export const TICKET_TABS = [
  { id: 'all', label: 'All' },
  { id: BOOKING_STATUS.ACTIVE, label: 'Active' },
  { id: BOOKING_STATUS.EXPIRED, label: 'Expired' },
];

// Rating is stored on the API's 0-10 scale (BR-03), so filter buckets are
// ranges over that scale rather than a 0-5 star threshold.
export const RATING_FILTERS = [
  { id: 'all', label: 'All Ratings', minRating: 0, maxRating: 10 },
  { id: '9-10', label: '9-10', minRating: 9, maxRating: 10 },
  { id: '7-8', label: '7-8', minRating: 7, maxRating: 8 },
  { id: '5-6', label: '5-6', minRating: 5, maxRating: 6 },
  { id: '3-4', label: '3-4', minRating: 3, maxRating: 4 },
  { id: '0-2', label: '0-2', minRating: 0, maxRating: 2 },
];
