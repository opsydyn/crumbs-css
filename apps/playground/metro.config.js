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
