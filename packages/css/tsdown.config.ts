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
}

export default defineConfig([
  { ...common, clean: false, dts: false, entry: { theme: "src/theme-runtime.ts" } },
  { ...common, clean: false, dts: false, entry: { "theme-core": "src/theme-core.ts" } },
  {
    ...common,
    clean: false,
    dts: false,
    entry: toolEntries,
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
      ...toolEntries,
      theme: "src/theme-runtime.ts",
      "theme-core": "src/theme-core.ts",
      devtools: "src/devtools/index.ts",
    },
    hooks: {
      "build:done": () => {
        // A dual-format declaration-only build emits CJS JavaScript when its
        // re-export optimization disables the second DTS pass. Write the same
        // canonical re-export stubs without rebuilding that JavaScript graph.
        for (const name of [...Object.keys(toolEntries), "theme", "theme-core", "devtools"]) {
          writeFileSync(`dist/${name}.d.cts`, `export * from "./${name}.mjs";\n`)
        }
      },
    },
  },
])
