// What POST /wallet/top-ups tells the client to do next. Not a ledger state —
// requires_action and pending both leave the ledger row pending.
export enum TopUpStatus {
  SUCCEEDED = 'succeeded',
  REQUIRES_ACTION = 'requires_action',
  PENDING = 'pending',
}
