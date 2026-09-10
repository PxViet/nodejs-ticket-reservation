import { Data } from 'effect';

// Constants
import { ERROR_MESSAGES } from '@/constants';

export class SettingError extends Data.TaggedError('SettingError')<{
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

  /**
   * Check if the error has a cause
   */
  hasCause(): boolean {
    return this.cause !== undefined;
  }

  static updateFailed = (message: string) => {
    return new SettingError({
      message: message || ERROR_MESSAGES.UPDATE_FAILED,
    });
  };

  static uploadAvatarError = (message: string) => {
    return new SettingError({
      message: message || ERROR_MESSAGES.UPLOAD_AVATAR_ERROR,
    });
  };

  static updateProfileFailed = (message: string) => {
    return new SettingError({
      message: message || ERROR_MESSAGES.UPDATE_PROFILE_FAILED,
    });
  };

  static updateProfileError = (message: string) => {
    return new SettingError({
      message: message || ERROR_MESSAGES.UPDATE_PROFILE_ERROR,
    });
  };

  static takePictureError = (message: string) => {
    return new SettingError({
      message: message || ERROR_MESSAGES.TAKE_PICTURE_ERROR,
    });
  };

  static getProfileError = (message: string) => {
    return new SettingError({
      message: message || ERROR_MESSAGES.GET_PROFILE_ERROR,
    });
  };

  static deleteAvatarError = (message: string) => {
    return new SettingError({
      message: message || ERROR_MESSAGES.DELETE_AVATAR_ERROR,
    });
  };

  static changePasswordError = (message: string) => {
    return new SettingError({
      message: message || ERROR_MESSAGES.UPDATE_PASSWORD_FAILED,
    });
  };
}
