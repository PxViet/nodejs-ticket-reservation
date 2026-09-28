import { Data } from 'effect';

/** Stripe's `PaymentSheetError.Canceled`. */
export const PAYMENT_SHEET_CANCELED = 'Canceled';

export class PaymentsError extends Data.TaggedError('PaymentsError')<{
  message: string;
  /** The API's `errorCode` or Stripe's error code, when there is one. */
  code?: string;
}> {
  static loadFailed = (message: string, code?: string) =>
    new PaymentsError({ message, code });

  static addCardFailed = (message: string, code?: string) =>
    new PaymentsError({ message, code });

  /** The customer closed PaymentSheet — not an error worth a toast. */
  static addCardCanceled = () =>
    new PaymentsError({ message: '', code: PAYMENT_SHEET_CANCELED });

  static checkoutFailed = (message: string, code?: string) =>
    new PaymentsError({ message, code });
}

export const isAddCardCanceled = (error: unknown): boolean =>
  error instanceof PaymentsError && error.code === PAYMENT_SHEET_CANCELED;
