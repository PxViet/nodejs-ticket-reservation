import { WalletService, walletService } from '../wallet';

const NOT_AVAILABLE = 'Wallet is not available yet';

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(() => {
    service = WalletService.getInstance();
  });

  it('should be a singleton', () => {
    const instance1 = WalletService.getInstance();
    const instance2 = WalletService.getInstance();
    expect(instance1).toBe(instance2);
    expect(instance1).toBe(walletService);
  });

  // Not implemented yet — DDR-010 puts payment processing out of scope for
  // the whole system, and Supabase's wallet tables are no longer wired up.
  describe('createWallet', () => {
    it('rejects with a not-available error', async () => {
      await expect(service.createWallet('user1')).rejects.toThrow(
        NOT_AVAILABLE,
      );
    });
  });

  describe('getWallet', () => {
    it('rejects with a not-available error', async () => {
      await expect(service.getWallet('user1')).rejects.toThrow(NOT_AVAILABLE);
    });
  });

  describe('getTransactions', () => {
    it('rejects with a not-available error', async () => {
      await expect(service.getTransactions('user1')).rejects.toThrow(
        NOT_AVAILABLE,
      );
    });
  });

  describe('topUp', () => {
    it('rejects with a not-available error', async () => {
      await expect(service.topUp('wallet1', 50000)).rejects.toThrow(
        NOT_AVAILABLE,
      );
    });
  });

  describe('processPurchase', () => {
    it('rejects with a not-available error', async () => {
      await expect(
        service.processPurchase('wallet1', 20000, 'booking1', 'Purchase'),
      ).rejects.toThrow(NOT_AVAILABLE);
    });
  });

  describe('refund', () => {
    it('rejects with a not-available error', async () => {
      await expect(
        service.refund('wallet1', 20000, 'booking1'),
      ).rejects.toThrow(NOT_AVAILABLE);
    });
  });

  describe('getTransactionsPaginated', () => {
    it('rejects with a not-available error', async () => {
      await expect(
        service.getTransactionsPaginated('user1', 0, 10),
      ).rejects.toThrow(NOT_AVAILABLE);
    });
  });
});
