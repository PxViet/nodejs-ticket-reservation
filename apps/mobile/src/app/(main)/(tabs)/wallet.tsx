import AdminReportsScreen from '@/features/admin/screens/AdminReports';
import MyWalletScreen from '@/features/wallet/screens/MyWallet';
import { useAuth } from '@/features/auth/hooks/useAuth';

// DDR-019: this tab slot renders admin reporting instead of the wallet for
// an admin account.
const WalletTab = () => {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminReportsScreen /> : <MyWalletScreen />;
};

export default WalletTab;
