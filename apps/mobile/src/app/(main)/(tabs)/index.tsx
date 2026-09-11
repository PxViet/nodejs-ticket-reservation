import AdminMoviesScreen from '@/features/admin/screens/AdminMovies';
import HomeScreen from '@/features/booking/screens/Home';
import { useAuth } from '@/features/auth/hooks/useAuth';

// DDR-019: this tab slot renders movie management for an admin and the
// customer catalogue otherwise — see `(tabs)/_layout.tsx` for the matching
// title/icon swap.
const IndexTab = () => {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminMoviesScreen /> : <HomeScreen />;
};

export default IndexTab;
