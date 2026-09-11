import { Data } from 'effect';

export class AdminMovieError extends Data.TaggedError('AdminMovieError')<{
  message: string;
}> {
  static loadFailed = (message: string) => new AdminMovieError({ message });

  static saveFailed = (message: string) => new AdminMovieError({ message });

  static deleteFailed = (message: string) => new AdminMovieError({ message });
}
