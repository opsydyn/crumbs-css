import { defineConfig } from "tsdown"

const shouldClean = process.env.CRUMBS_CSS_SKIP_CLEAN !== "1"

export default defineConfig({
  clean: shouldClean,
  dts: {
    cjsReexport: true,
  },
  entry: {
    index: "src/index.ts",
    "metro-plugin": "src/metro-plugin.ts",
    style: "src/native-style.ts",
    theme: "src/theme-runtime.ts",
    transformer: "src/transformer.ts",
  },
  deps: {
    neverBundle: [
      /^node:/,
      /^@vanilla-extract\//,
      "css-to-react-native",
      "metro",
      "metro-transform-worker",
      "react",
      "react-native",
    ],
  },
  format: ["esm", "cjs"],
  outDir: "dist",
  shims: true,
  target: "node22",
})
