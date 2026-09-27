// BR-40 / DDR-025: pending → succeeded | failed | refunded. Every terminal
// state is final.
export enum PaymentStatus {
  PENDING = 'pending',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}
