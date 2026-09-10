import { Data } from 'effect';

export class AuthenticationError extends Data.TaggedError(
  'AuthenticationError',
)<{
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
      cause: this.cause,
      tag: this._tag,
    };
  }

  /**
   * Check if the error has a cause
   */
  hasCause(): boolean {
    return this.cause !== undefined;
  }

  static loginFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static invalidEmailPassword = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static googleSignInFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static facebookSignInFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static signUpFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static signUpWithEmailRegistered = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static createAccountFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static signOutFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static confirmAccountFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static updateFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static updateProfileFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static updatePasswordFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static oauthFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static sessionFailed = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };

  static oauthCancelled = (message: string) => {
    return new AuthenticationError({
      message: message,
    });
  };
}
