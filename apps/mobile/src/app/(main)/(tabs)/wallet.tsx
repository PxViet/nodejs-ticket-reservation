import AdminReportsScreen from '@/features/admin/screens/AdminReports';
import PaymentHistoryScreen from '@/features/payments/screens/PaymentHistory';
import { useAuth } from '@/features/auth/hooks/useAuth';

// DDR-019: this tab slot renders admin reporting instead of the customer's
// payment history for an admin account.
const WalletTab = () => {
  const { isAdmin } = useAuth();

  return isAdmin ? <AdminReportsScreen /> : <PaymentHistoryScreen />;
};

export default WalletTab;
