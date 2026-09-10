// Constants
import { PAGINATION } from '@/constants';

// Types
import { Wallet, WalletTransaction } from '@/features/wallet/schemas/wallet';

const NOT_IMPLEMENTED =
  'Wallet is not available yet — apps/api has no wallet/payment module (DDR-010).';

/**
 * Not implemented yet — DDR-010 puts payment processing out of scope for the
 * whole system, and Supabase's `wallets`/`wallet_transactions` tables are no
 * longer wired up. Kept as a stub so the wallet screens still compile and
 * render until a real wallet/payment API exists.
 */
export class WalletService {
  private static instance: WalletService;

  private constructor() {}

  static getInstance(): WalletService {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  async createWallet(_userId: string, _cardNumber?: string): Promise<Wallet> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getWallet(_userId: string): Promise<Wallet> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getTransactions(
    _userId: string,
    _limit = PAGINATION.PAGE_LIMIT_MAX,
  ): Promise<WalletTransaction[]> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async topUp(_walletId: string, _amount: number): Promise<WalletTransaction> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async processPurchase(
    _walletId: string,
    _amount: number,
    _bookingId: string,
    _description: string,
  ): Promise<WalletTransaction> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async refund(
    _walletId: string,
    _amount: number,
    _bookingId: string,
  ): Promise<WalletTransaction> {
    throw new Error(NOT_IMPLEMENTED);
  }

  async getTransactionsPaginated(
    _userId: string,
    _page = PAGINATION.PAGE_OFFSET,
    _limit = PAGINATION.PAGE_LIMIT_MAX,
  ): Promise<WalletTransaction[]> {
    throw new Error(NOT_IMPLEMENTED);
  }
}

export const walletService = WalletService.getInstance();
