const { getDefaultConfig } = require("expo/metro-config")
const { withStorybook } = require("@storybook/react-native/metro/withStorybook")
const { withNativeStyles } = require("@crumbs/css/metro-plugin")
const path = require("node:path")

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, "../..")
const projectNodeModulesRoot = path.resolve(projectRoot, "node_modules")

const config = getDefaultConfig(projectRoot)

config.watchFolders = [
  path.resolve(monorepoRoot, "node_modules"),
  path.resolve(monorepoRoot, "packages/css"),
]

config.resolver.useWatchman = false
config.resolver.nodeModulesPaths = [
  projectNodeModulesRoot,
  path.resolve(monorepoRoot, "node_modules"),
]

config.transformer = {
  ...(config.transformer ?? {}),
  nativeStyles: {
    strictDiagnostics: true,
  },
  upstreamTransformerPath: config.transformerPath,
}

module.exports = withStorybook(withNativeStyles(config), {
  configPath: path.resolve(projectRoot, ".rnstorybook"),
  enabled: process.env.EXPO_PUBLIC_STORYBOOK_ENABLED === "true",
})
