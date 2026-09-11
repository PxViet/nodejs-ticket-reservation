import { Data } from 'effect';

export class AdminReportError extends Data.TaggedError('AdminReportError')<{
  message: string;
}> {
  static loadFailed = (message: string) => new AdminReportError({ message });
}
