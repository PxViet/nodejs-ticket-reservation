import { useEffect } from 'react';

// Stores
import { useAuthStore } from '@/features/auth/store/auth';

export const useAuth = () => {
  const { user, session, isLoading, isAuthenticated, initialize, signOut } =
    useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // ADR-006: the role travels on the access token (`GET /auth/me`), so no
  // extra request is needed to gate admin-only UI. This is a UX convenience
  // only — the actual authorization boundary is the API's RolesGuard.
  const isAdmin = user?.role === 'admin';

  return {
    user,
    session,
    isLoading,
    isAuthenticated,
    isAdmin,
    signOut,
  };
};
