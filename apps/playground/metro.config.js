const fs = require("node:fs")
const path = require("node:path")
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeStyles } = require("@opsydyn/crumbs-css/metro-plugin")

const config = getDefaultConfig(__dirname)
// Only workspace mode can watch the repository. Staged consumers have no parent workspace.
const workspace = path.resolve(__dirname, "../..")
if (fs.existsSync(path.join(workspace, "packages/css/tsdown.config.ts"))) {
  config.watchFolders = process.env.CRUMBS_INCREMENTAL_BENCH === "1"
    ? [path.join(workspace, "packages/css")]
    : [path.join(workspace, "node_modules"), path.join(workspace, "packages/css")]
  config.resolver.nodeModulesPaths = [path.join(__dirname, "node_modules"), path.join(workspace, "node_modules")]

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
}
config.resolver.useWatchman = false
config.transformer = {
  ...config.transformer,
  upstreamTransformerPath: config.transformerPath,
  nativeStyles: {
    strictDiagnostics: process.env.CRUMBS_INCREMENTAL_BENCH === "1"
      ? process.env.CRUMBS_INCREMENTAL_STRICT_DIAGNOSTICS !== "0"
      : true,
  },
}
module.exports = withNativeStyles(config)
