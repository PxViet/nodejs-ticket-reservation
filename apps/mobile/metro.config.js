// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');

const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const withStorybook = require('@storybook/react-native/metro/withStorybook');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// pnpm workspace: dependencies hoist to the repo root (see .npmrc,
// node-linker=hoisted), so Metro has to watch the whole workspace and resolve
// from both module trees. Hierarchical lookup is disabled so a stray
// node_modules further up the disk can never shadow a workspace package.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// SDK 58: Jest 30 hoists pretty-format 30 to the root, but Expo's dev runtime
// (@expo/metro-runtime HMRClient) needs the 29 nested under it, and with
// hierarchical lookup off Metro never sees that nested copy. Pin it explicitly,
// or the app dies at boot with "Cannot read property 'default' of undefined".
const expoPrettyFormat = path.dirname(
  require.resolve('pretty-format/package.json', {
    paths: [path.dirname(require.resolve('@expo/metro-runtime/package.json'))],
  }),
);
config.resolver.resolveRequest = (context, moduleName, platform) =>
  context.resolveRequest(
    context,
    moduleName === 'pretty-format' ? expoPrettyFormat : moduleName,
    platform,
  );

const uniwindConfig = withUniwindConfig(withStorybook(config), {
  // relative path to your global.css file (from previous step)
  cssEntryFile: './src/global.css',
  // (optional) path where we gonna auto-generate typings
  // defaults to project's root
  dtsFile: './src/uniwind-types.d.ts',
  extraThemes: ['light', 'dark'],
});

// SDK 58: uniwind swaps `react-native` for its own module, whose hand-written
// export list (still as of uniwind 1.14) lacks `AssetRegistry`, which RN 0.88
// made public and expo-asset / expo-image / expo-video now import. Expo's own
// packages never take a className, so give them the real `react-native`.
const expoPackage =
  /[\\/]node_modules[\\/](expo-[^\\/]+|@expo[\\/][^\\/]+)[\\/]/;
const uniwindResolveRequest = uniwindConfig.resolver.resolveRequest;
uniwindConfig.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === 'react-native' && expoPackage.test(context.originModulePath)
    ? config.resolver.resolveRequest(context, moduleName, platform)
    : uniwindResolveRequest(context, moduleName, platform);

module.exports = uniwindConfig;
