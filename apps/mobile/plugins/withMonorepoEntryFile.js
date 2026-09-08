const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Force an absolute `--entry-file` for the Android release bundle.
 *
 * In this pnpm workspace `expo export:embed` (run by
 * `:app:createBundleReleaseJsAndAssets`) resolves its project root to the
 * *monorepo root*, so the entry path the React Native Gradle plugin passes
 * ("index.ts", relative) resolves to `<repo-root>/index.ts` instead of
 * `<repo-root>/apps/mobile/index.ts`, and the task fails with
 * "Unable to resolve module ./index.ts".
 *
 * The stock template already computes the entry via `expo/scripts/resolveAppEntry`
 * (absolute). This mod hoists that expression into a `def` and passes it through
 * `extraPackagerArgs` so Metro gets an absolute path it cannot misresolve.
 *
 * Idempotent — re-running `expo prebuild` is a no-op once applied.
 */
const MARKER = '/* movea: monorepo entry-file fix */';

const withMonorepoEntryFile = config =>
  withAppBuildGradle(config, cfg => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        `withMonorepoEntryFile: expected a groovy build.gradle, got ${cfg.modResults.language}`,
      );
    }

    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER) || contents.includes('--entry-file')) {
      return cfg;
    }

    // Match the template's `entryFile = file([ ... ].execute(...).text.trim())`.
    const entryAssignment = contents.match(
      /^([ \t]*)entryFile\s*=\s*(file\(\[[^\]]*\]\s*\.execute\(null,\s*rootDir\)\.text\.trim\(\)\))[ \t]*$/m,
    );
    if (!entryAssignment) {
      throw new Error(
        'withMonorepoEntryFile: could not find `entryFile = file(...)` — the Expo template changed, update this plugin.',
      );
    }
    const [, indent, fileExpr] = entryAssignment;

    // 1. Hoist the entry expression to a reusable def just above `react {`.
    contents = contents.replace(
      /\nreact\s*\{/,
      `\n${MARKER}\ndef appEntryFile = ${fileExpr}\n\nreact {`,
    );

    // 2. Point the react extension at the def instead of recomputing it.
    contents = contents.replace(
      entryAssignment[0],
      `${indent}entryFile = appEntryFile`,
    );

    // 3. Pass the absolute path to the bundler explicitly.
    contents = contents.replace(
      /^([ \t]*)bundleCommand\s*=\s*"export:embed"[ \t]*$/m,
      `$1bundleCommand = "export:embed"\n$1extraPackagerArgs = ["--entry-file", appEntryFile.absolutePath]`,
    );

    cfg.modResults.contents = contents;
    return cfg;
  });

module.exports = withMonorepoEntryFile;
