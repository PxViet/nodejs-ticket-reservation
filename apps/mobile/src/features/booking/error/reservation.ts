import { Data } from 'effect';

export class ReservationError extends Data.TaggedError('ReservationError')<{
  message: string;
  // The API's stable `errorCode` when it is known — e.g. `HOLD_NOT_FOUND` /
  // `HOLD_EXPIRED` from a confirm that lost the race with the 60s sweep.
  errorCode?: string;
}> {
  getCause() {
    return this.cause;
  }

  getDetails() {
    return {
      message: this.message,
      tag: this._tag,
    };
  }

  static confirmFailed = (message: string, errorCode?: string) => {
    return new ReservationError({
      message: message,
      errorCode: errorCode,
    });
  };

  static reservationsUnavailable = (message: string) => {
    return new ReservationError({
      message: message,
    });
  };

  static reservationNotFound = (message: string) => {
    return new ReservationError({
      message: message,
    });
  };

  static cancelFailed = (message: string, errorCode?: string) => {
    return new ReservationError({
      message: message,
      errorCode: errorCode,
    });
  };
}
