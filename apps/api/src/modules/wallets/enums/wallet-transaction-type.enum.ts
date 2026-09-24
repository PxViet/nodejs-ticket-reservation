// DDR-024: the vocabulary apps/mobile's WalletTransactionSchema already uses.
// Only TOP_UP is written today; PAYMENT and REFUND are reserved for spending
// tokens at checkout.
export enum WalletTransactionType {
  TOP_UP = 'top_up',
  PAYMENT = 'payment',
  REFUND = 'refund',
}
