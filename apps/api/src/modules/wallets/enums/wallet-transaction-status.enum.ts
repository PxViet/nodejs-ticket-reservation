// BR-40: pending → succeeded | failed. Both terminal states are final.
export enum WalletTransactionStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
}
