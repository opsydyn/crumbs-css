import { defineConfig } from "tsdown"
import { writeFileSync } from "node:fs"
import { compilerDependencies, runtimeDependencies } from "./build-policy.ts"

const shouldClean = process.env.CRUMBS_CSS_SKIP_CLEAN !== "1"

const common = {
  deps: runtimeDependencies,
  format: ["esm" as const, "cjs" as const],
  outDir: "dist",
  shims: true,
  target: "node22",
}

// ADR D6 / M0.7: separate build graphs prevent cross-entry side-effect imports.
// tsdown cleans all configured outputs before launching the parallel builds.
const toolEntries = {
  index: "src/index.ts",
  "metro-plugin": "src/metro-plugin.ts",
  style: "src/native-style.ts",
  tokens: "src/tokens/index.ts",
  "tokens-optic": "src/tokens/optic.ts",
  "tokens-schema": "src/tokens/schema.ts",
  "tokens-schema-value": "src/tokens/schema-value.ts",
  transformer: "src/transformer.ts",
  "tooling-manifest": "src/tooling/manifest.ts",
  "tooling-policy": "src/tooling/policy.ts",
  "tooling-migrations": "src/tooling/migrations.ts",
  "tooling-dtcg": "src/tooling/dtcg.ts",
  "tooling-ownership": "src/tooling/ownership.ts",
}
const themeRuntimeEntries = {
  theme: "src/theme-runtime.ts",
  "theme-vars": "src/theme-vars.ts",
  "theme-conditions": "src/conditions/index.ts",
  "theme-expressions": "src/expressions/index.ts",
  "theme-recipes": "src/theme-recipes.ts",
  "theme-sprinkles": "src/theme-sprinkles.ts",
}
const motionRuntimeEntries = { "theme-motion": "src/theme-motion.ts" }
const motionNativeRuntimeEntries = { "theme-motion-native": "src/theme-motion-native.ts" }
const containerRuntimeEntries = { "theme-containers": "src/theme-containers.ts" }
const themeCoreRuntimeEntries = {"theme-core": "src/theme-core.ts"}
const themeTokenRuntimeEntries = {"theme-token": "src/theme-token-only.ts"}

export default defineConfig([
  { ...common, clean: false, dts: false, entry: motionRuntimeEntries },
  { ...common, clean: false, dts: false, entry: motionNativeRuntimeEntries },
  { ...common, clean: false, dts: false, entry: containerRuntimeEntries },
  { ...common, clean: false, dts: false, entry: themeRuntimeEntries },
  { ...common, clean: false, dts: false, entry: themeCoreRuntimeEntries },
  { ...common, clean: false, dts: false, entry: themeTokenRuntimeEntries },
  {
    ...common,
    clean: false,
    dts: false,
    entry: toolEntries,
    // Keep runtime feature groups unchanged; reduce the token/tooling graph only.
    minify: true,
    deps: compilerDependencies,
  },
  // Explanations depend on Effect Schema; keep that cost behind its own opt-in subpath.
  { ...common, clean: false, dts: false, entry: { devtools: "src/devtools/index.ts" } },
  // One declaration graph preserves nominal token brands across public entries.
  {
    ...common,
    clean: shouldClean,
    format: ["esm"],
    dts: { emitDtsOnly: true },
    entry: {
      ...motionRuntimeEntries,
      ...motionNativeRuntimeEntries,
      ...containerRuntimeEntries,
      ...toolEntries,
      ...themeRuntimeEntries,
      ...themeCoreRuntimeEntries,
      ...themeTokenRuntimeEntries,
      devtools: "src/devtools/index.ts",
    },
    hooks: {
      "build:done": () => {
        // A dual-format declaration-only build emits CJS JavaScript when its
        // re-export optimization disables the second DTS pass. Write the same
        // canonical re-export stubs without rebuilding that JavaScript graph.
        for (const name of [...Object.keys(motionRuntimeEntries), ...Object.keys(motionNativeRuntimeEntries), ...Object.keys(containerRuntimeEntries), ...Object.keys(toolEntries), ...Object.keys(themeRuntimeEntries), ...Object.keys(themeCoreRuntimeEntries), ...Object.keys(themeTokenRuntimeEntries), "devtools"]) {
          writeFileSync(`dist/${name}.d.cts`, `export * from "./${name}.mjs";\n`)
        }
      },
    },
  },
])
