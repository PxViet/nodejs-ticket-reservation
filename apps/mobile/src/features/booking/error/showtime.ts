import { Data } from 'effect';

export class ShowtimeError extends Data.TaggedError('ShowtimeError')<{
  message: string;
  // The API's stable `errorCode` when it is known — lets a screen branch on
  // `SEAT_UNAVAILABLE` vs `SHOWTIME_NOT_BOOKABLE` rather than string-matching.
  errorCode?: string;
}> {
  /**
   * Get the underlying cause of the error
   */
  getCause() {
    return this.cause;
  }

  /**
   * Get detailed error information including cause
   */
  getDetails() {
    return {
      message: this.message,
      tag: this._tag,
    };
  }

  static showtimesFailed = (message: string) => {
    return new ShowtimeError({
      message: message,
    });
  };

  static showtimeNotFound = (message: string) => {
    return new ShowtimeError({
      message: message,
    });
  };

  static hallsUnavailable = (message: string) => {
    return new ShowtimeError({
      message: message,
    });
  };

  static seatMapUnavailable = (message: string) => {
    return new ShowtimeError({
      message: message,
    });
  };

  static holdFailed = (message: string, errorCode?: string) => {
    return new ShowtimeError({
      message: message,
      errorCode: errorCode,
    });
  };

  static myHoldsUnavailable = (message: string) => {
    return new ShowtimeError({
      message: message,
    });
  };

  static releaseFailed = (message: string, errorCode?: string) => {
    return new ShowtimeError({
      message: message,
      errorCode: errorCode,
    });
  };
}
