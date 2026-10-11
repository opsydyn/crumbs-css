const { getDefaultConfig } = require("expo/metro-config")
const { withStorybook } = require("@storybook/react-native/metro/withStorybook")
const { withNativeStyles } = require("@opsydyn/crumbs-css/metro-plugin")
const path = require("node:path")
const fs = require("node:fs")

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, "../..")
const projectNodeModulesRoot = path.resolve(projectRoot, "node_modules")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [
  path.resolve(monorepoRoot, "node_modules"),
  path.resolve(monorepoRoot, "packages/css"),
]

config.resolver.useWatchman = false
// Follow transitive dependencies in Bun's physical package graph. App React
// and renderer peers are pinned separately below.
config.resolver.disableHierarchicalLookup = false
config.resolver.nodeModulesPaths = [
  projectNodeModulesRoot,
  path.resolve(monorepoRoot, "node_modules"),
]

// Shared demos and Crumbs resolve through different SDK workspaces. Keep
// their React dispatcher and native renderer on this app's physical peers.
// Expo still owns the react-native -> react-native-web alias on web.
const peerNodeModules = Object.fromEntries(["react", "react-native", "react-native-web", "react-dom"].map(name => {
  const packageJson = require.resolve(`${name}/package.json`, { paths: [__dirname] })
  return [name, path.dirname(path.dirname(fs.realpathSync(packageJson)))]
}))
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const requestedPeer = Object.keys(peerNodeModules).find(name => moduleName === name || moduleName.startsWith(`${name}/`))
  const peer = requestedPeer === "react-native" && platform === "web" ? "react-native-web" : requestedPeer
  if (peer) {
    return context.resolveRequest(
      {
        ...context,
        disableHierarchicalLookup: true,
        extraNodeModules: {},
        nodeModulesPaths: [peerNodeModules[peer]],
      },
      moduleName,
      platform,
    )
  }

  return context.resolveRequest(context, moduleName, platform)
}

config.transformer = {
  ...(config.transformer ?? {}),
  nativeStyles: {
    strictDiagnostics: true,
  },
  upstreamTransformerPath: config.transformerPath,
}

module.exports = withStorybook(withNativeStyles(config), {
  configPath: path.resolve(projectRoot, ".rnstorybook"),
  liteMode: true,
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
})
