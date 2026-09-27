// The answer to POST /reservations/checkout — an API-response status, not a
// stored one. Anything but succeeded is finished by polling
// GET /reservations/checkout/:paymentId or by the Stripe webhook (ADR-018).
export enum CheckoutStatus {
  SUCCEEDED = 'succeeded',
  REQUIRES_ACTION = 'requires_action',
  PROCESSING = 'processing',
}
