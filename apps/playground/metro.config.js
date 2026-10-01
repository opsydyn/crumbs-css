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

  // Workspace packages can reach the same React installation through both the
  // checkout and a linked worktree path. Metro treats those paths as separate
  // modules, which gives React Native components a different hooks dispatcher.
  // Resolve React (including jsx-runtime subpaths) through one physical package.
  const reactPackageJson = require.resolve("react/package.json", { paths: [__dirname] })
  const reactPackage = path.dirname(fs.realpathSync(reactPackageJson))
  const reactNodeModules = path.dirname(reactPackage)
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === "react" || moduleName.startsWith("react/")) {
      return context.resolveRequest(
        {
          ...context,
          disableHierarchicalLookup: true,
          extraNodeModules: {},
          nodeModulesPaths: [reactNodeModules],
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
