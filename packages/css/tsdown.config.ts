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
  transformer: "src/transformer.ts",
}

export default defineConfig([
  { ...common, clean: false, dts: false, entry: { theme: "src/theme-runtime.ts" } },
  {
    ...common,
    clean: false,
    dts: false,
    entry: toolEntries,
    deps: compilerDependencies,
  },
  // One declaration graph preserves nominal token brands across public entries.
  {
    ...common,
    clean: shouldClean,
    format: ["esm"],
    dts: { emitDtsOnly: true },
    entry: { ...toolEntries, theme: "src/theme-runtime.ts" },
    hooks: {
      "build:done": () => {
        // A dual-format declaration-only build emits CJS JavaScript when its
        // re-export optimization disables the second DTS pass. Write the same
        // canonical re-export stubs without rebuilding that JavaScript graph.
        for (const name of [...Object.keys(toolEntries), "theme"]) {
          writeFileSync(`dist/${name}.d.cts`, `export * from "./${name}.mjs";\n`)
        }
      },
    },
  },
])
