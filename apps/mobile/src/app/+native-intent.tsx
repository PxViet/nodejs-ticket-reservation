interface RedirectSystemPathOptions {
  path: string;
  initial: boolean;
}

/**
 * Native Intent Handler
 * This file intercepts incoming deep link URLs before Expo Router processes them.
 *
 * @see https://docs.expo.dev/router/advanced/native-intent/
 */
export function redirectSystemPath(options: RedirectSystemPathOptions): string {
  return options.path;
}
