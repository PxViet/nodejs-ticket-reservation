export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    session: () => [...queryKeys.auth.all, 'session'] as const,
    user: (userId?: string) => [...queryKeys.auth.all, 'user', userId] as const,
  },

  // Movies
  movies: {
    all: ['movies'] as const,
    lists: () => [...queryKeys.movies.all, 'list'] as const,
    list: (filters?: { genreId?: string }) =>
      [...queryKeys.movies.lists(), filters] as const,
    infinite: (filters?: { genreId?: string }) =>
      [...queryKeys.movies.lists(), 'infinite', filters] as const,
    details: () => [...queryKeys.movies.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.movies.details(), id] as const,
    searchInfinite: (query: string) =>
      [...queryKeys.movies.all, 'search', 'infinite', query] as const,
  },

  // Genres
  genres: {
    all: ['genres'] as const,
    list: () => [...queryKeys.genres.all, 'list'] as const,
  },

  // Showtimes
  showtimes: {
    all: ['showtimes'] as const,
    lists: () => [...queryKeys.showtimes.all, 'list'] as const,
    list: (movieId: string, date: string, hallId?: string) =>
      [...queryKeys.showtimes.lists(), movieId, date, hallId] as const,
    detail: (id: string) => [...queryKeys.showtimes.all, 'detail', id] as const,
    seatMap: (showtimeId: string) =>
      [...queryKeys.showtimes.all, 'seat-map', showtimeId] as const,
    myHolds: (showtimeId: string) =>
      [...queryKeys.showtimes.all, 'my-holds', showtimeId] as const,
  },

  // Halls
  halls: {
    all: ['halls'] as const,
    list: () => [...queryKeys.halls.all, 'list'] as const,
  },

  // Wallet
  wallet: {
    all: ['wallet'] as const,
    detail: (userId?: string) => [...queryKeys.wallet.all, userId] as const,
    transactions: (userId?: string) =>
      [...queryKeys.wallet.all, 'transactions', userId] as const,
    transactionsInfinite: (userId?: string) =>
      [...queryKeys.wallet.all, 'transactions', 'infinite', userId] as const,
  },

  // Bookings
  bookings: {
    all: ['bookings'] as const,
    lists: () => [...queryKeys.bookings.all, 'list'] as const,
    list: (userId?: string, status?: string) =>
      [...queryKeys.bookings.lists(), userId, status] as const,
    infinite: (userId?: string, status?: string) =>
      [...queryKeys.bookings.lists(), 'infinite', userId, status] as const,
    detail: (id: string) => [...queryKeys.bookings.all, 'detail', id] as const,
  },

  // Tickets
  tickets: {
    all: ['tickets'] as const,
    lists: () => [...queryKeys.tickets.all, 'list'] as const,
    list: (userId?: string) => [...queryKeys.tickets.lists(), userId] as const,
    infinite: (userId?: string) =>
      [...queryKeys.tickets.lists(), 'infinite', userId] as const,
    detail: (id: string) => [...queryKeys.tickets.all, 'detail', id] as const,
  },

  // Profile
  profile: {
    all: ['profile'] as const,
    detail: (userId: string) => [...queryKeys.profile.all, userId] as const,
  },

  // Cinemas
  cinemas: {
    all: ['cinemas'] as const,
    lists: () => [...queryKeys.cinemas.all, 'list'] as const,
    list: (city?: string) => [...queryKeys.cinemas.lists(), city] as const,
    detail: (id: string) => [...queryKeys.cinemas.all, 'detail', id] as const,
  },
} as const;
