import MyProfileScreen from '@/features/setting/screens/MyProfile';
import MyTicketScreen from '@/features/ticket/screens/MyTicket';
import { useAuth } from '@/features/auth/hooks/useAuth';

// DDR-019: an admin has no tickets to browse, so this slot becomes their own
// profile (edit info, change password, logout) — reusing the same screen a
// customer reaches from the header avatar rather than building a second one.
const MyTicketTab = () => {
  const { isAdmin } = useAuth();

  return isAdmin ? <MyProfileScreen /> : <MyTicketScreen />;
};

export default MyTicketTab;
