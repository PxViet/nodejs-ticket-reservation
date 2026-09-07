import { Data } from 'effect';

export class ShowtimeError extends Data.TaggedError('ShowtimeError')<{
  message: string;
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
}
