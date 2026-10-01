import { afterEach, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import { assertRuntimeBundleSources } from "../../../scripts/runtime-bundle-contract"
import { auditPackedRuntimeEntrypoints } from "../../../scripts/packed-runtime-graph"
import { verifyPackedExportMap } from "../../../scripts/packed-export-contract"
import {
  assembleManifest,
  decodeManifest,
  encodeCanonicalManifest,
  projectTokenContract,
  transformCssTsToStyleSheetWithManifestSidecar,
  type CompilerManifestSidecar,
  type DesignSystemManifest,
  type ManifestAssemblyInput,
} from "../src/tooling/manifest"
import { tokens } from "../fixtures/m9-1-manifest/tokens"

const PACKAGE_ROOT = resolve(import.meta.dir, "..")
const requireFromPackage = createRequire(resolve(PACKAGE_ROOT, "package.json"))
const temporaryRoots: string[] = []

type SpawnResult = ReturnType<typeof Bun.spawnSync>

function run(command: ReadonlyArray<string>, cwd: string): SpawnResult {
  const result = Bun.spawnSync([...command], { cwd, stderr: "pipe", stdout: "pipe" })
  if (result.exitCode !== 0) {
    throw new Error([`$ ${command.join(" ")}`, result.stdout.toString(), result.stderr.toString()].join("\n"))
  }
  return result
}

function resolveInstalledPackageRoot(packageName: string): string {
  return dirname(requireFromPackage.resolve(`${packageName}/package.json`))
}

function linkRootDependency(consumerRoot: string, packageName: string): void {
  const source = resolveInstalledPackageRoot(packageName)
  if (!existsSync(source)) throw new Error(`Missing root dependency required by consumer contract: ${packageName}`)
  const target = resolve(consumerRoot, "node_modules", packageName)
  mkdirSync(dirname(target), { recursive: true })
  symlinkSync(source, target, "junction")
}

function createAssemblyFixture(): { readonly manifest: DesignSystemManifest; readonly input: ManifestAssemblyInput } {
  const projectedTokens = projectTokenContract(tokens, { path: "tokens.ts", exportPath: "tokens" })
  const publicSurfaceId = projectedTokens.find(token => token.path.join(".") === "color.surface")!.id
  const privateGapId = projectedTokens.find(token => token.path.join(".") === "space.privateGap")!.id
  const moduleId = "@acme/m9-1-manifest-fixture#styles.css.ts"
  const origin = (property: string) => ({ moduleId, exportPath: "panel", property })
  const sidecar: CompilerManifestSidecar = {
    module: { id: moduleId, origin: { path: "styles.css.ts" }, exports: ["panel"] },
    dependencies: [
      { from: moduleId, to: publicSurfaceId, kind: "style-token", resolution: "external", origin: origin("backgroundColor") },
      { from: moduleId, to: privateGapId, kind: "style-token", resolution: "external", origin: origin("paddingTop") },
      { from: moduleId, to: "@acme/brand#theme@1/color.surface", kind: "style-token", resolution: "external", origin: origin("borderColor") },
      { from: moduleId, kind: "style-token", resolution: "unresolved", origin: origin("outlineColor") },
    ],
    capabilities: [
      { moduleId, exportPath: "panel", property: "backgroundColor", primitive: "view", evidence: "compiler-observed" },
    ],
    unresolved: [
      { reference: "legacy:--crumbs-legacy-missing", reason: "No stable token contract identity is registered.", origin: origin("outlineColor") },
    ],
  }
  const input: ManifestAssemblyInput = {
    package: { name: "@acme/m9-1-manifest-fixture", version: "1.2.3" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "crumbs.native-styles", version: 1 },
    },
    tokenContracts: [{ contract: tokens, origin: { path: "tokens.ts", exportPath: "tokens" } }],
    styleSidecars: [sidecar],
  }
  return { input, manifest: assembleManifest(input) }
}

function createPackedConsumer(): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "crumbs-css-manifest-consumer-"))
  temporaryRoots.push(tempRoot)
  run(["bun", "pm", "pack", "--destination", tempRoot], PACKAGE_ROOT)
  const tarballName = readdirSync(tempRoot).find(entry => entry.endsWith(".tgz"))
  if (tarballName === undefined) throw new Error("bun pm pack did not create a tarball")
  const packageRoot = resolve(tempRoot, "consumer", "node_modules", "@opsydyn", "crumbs-css")
  mkdirSync(packageRoot, { recursive: true })
  run(["tar", "-xzf", resolve(tempRoot, tarballName), "--strip-components=1", "-C", packageRoot], tempRoot)
  const consumerRoot = resolve(tempRoot, "consumer")
  for (const dependency of [
    "@types/react",
    "@vanilla-extract/css",
    "@vanilla-extract/integration",
    "css-to-react-native",
    "effect",
    "metro",
    "react",
    "react-native",
    "typescript",
  ]) linkRootDependency(consumerRoot, dependency)
  return realpathSync(consumerRoot)
}

function writeTypeConfigs(consumerRoot: string): void {
  const source = `
    import { assembleManifest, decodeManifest, encodeCanonicalManifest, transformCssTsToStyleSheetWithManifestSidecar } from "@opsydyn/crumbs-css/tooling/manifest";
    import type { CompilerManifestSidecar, DesignSystemManifest, ManifestAssemblyInput } from "@opsydyn/crumbs-css/tooling/manifest";
    import type { NativeConditionSnapshot } from "@opsydyn/crumbs-css/theme/conditions";
    import type { NativeExpression } from "@opsydyn/crumbs-css/theme/expressions";
    import type { NativeRecipeResolver, RecipeResolutionPlan } from "@opsydyn/crumbs-css/theme/recipes";
    import type { NativeSprinklesLookupPlan, NativeSprinklesResolver } from "@opsydyn/crumbs-css/theme/sprinkles";
    type FocusedThemeTypes = [NativeConditionSnapshot, NativeExpression, RecipeResolutionPlan, NativeRecipeResolver<any>, NativeSprinklesLookupPlan<any, any, any>, NativeSprinklesResolver<any, any>];
    import manifestJson from "./manifest.json";
    const manifest: DesignSystemManifest = decodeManifest(manifestJson);
    const input: ManifestAssemblyInput = { package: manifest.package, producer: manifest.producer, styleSidecars: [] };
    const sidecar: CompilerManifestSidecar = { module: { id: "@acme/example#styles.css.ts", origin: { path: "styles.css.ts" }, exports: [] }, dependencies: [], capabilities: [], unresolved: [] };
    void assembleManifest(input);
    void encodeCanonicalManifest(manifest);
    void transformCssTsToStyleSheetWithManifestSidecar;
    void sidecar;
    void (null as unknown as FocusedThemeTypes);
  `
  writeFileSync(resolve(consumerRoot, "manifest-types.ts"), source)
  writeFileSync(resolve(consumerRoot, "theme-features.cts"), `
    import type { NativeConditionInput } from "@opsydyn/crumbs-css/theme/conditions" with { "resolution-mode": "require" };
    import type { NativeExpressionDomain } from "@opsydyn/crumbs-css/theme/expressions" with { "resolution-mode": "require" };
    import type { ComponentRecipeResolverOptions } from "@opsydyn/crumbs-css/theme/recipes" with { "resolution-mode": "require" };
    import type { NativeSprinklesResolutionSelection } from "@opsydyn/crumbs-css/theme/sprinkles" with { "resolution-mode": "require" };
    type CommonJsThemeTypes = [NativeConditionInput, NativeExpressionDomain, ComponentRecipeResolverOptions, NativeSprinklesResolutionSelection<any, any>];
    void (null as unknown as CommonJsThemeTypes);
  `)
  for (const [filename, module, moduleResolution] of [
    ["tsconfig.node16.json", "Node16", "Node16"],
    ["tsconfig.bundler.json", "ESNext", "Bundler"],
  ] as const) {
    writeFileSync(resolve(consumerRoot, filename), JSON.stringify({
      compilerOptions: {
        exactOptionalPropertyTypes: true,
        module,
        moduleResolution,
        noEmit: true,
        noUncheckedIndexedAccess: true,
        resolveJsonModule: true,
        skipLibCheck: true,
        strict: true,
        target: "ES2022",
      },
      include: ["manifest-types.ts", "theme-features.cts"],
    }, null, 2))
  }
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

test("assembly incorporates explicit compiler sidecars without losing root visibility or unresolved references", () => {
  const { manifest } = createAssemblyFixture()
  const moduleId = "@acme/m9-1-manifest-fixture#styles.css.ts"
  const publicSurface = manifest.tokens.find(token => token.path.join(".") === "color.surface")!
  const privateGap = manifest.tokens.find(token => token.path.join(".") === "space.privateGap")!

  expect(publicSurface.visibility).toBe("public")
  expect(privateGap.visibility).toBe("private")
  expect(manifest.modules).toEqual([{ id: moduleId, origin: { path: "styles.css.ts" }, exports: ["panel"] }])
  expect(manifest.coverage.roots).toContainEqual({ kind: "style-module", id: moduleId })
  expect(manifest.dependencies).toContainEqual(expect.objectContaining({ from: moduleId, to: publicSurface.id, resolution: "internal" }))
  expect(manifest.dependencies).toContainEqual(expect.objectContaining({ from: moduleId, to: privateGap.id, resolution: "internal" }))
  expect(manifest.dependencies).toContainEqual(expect.objectContaining({ from: moduleId, to: "@acme/brand#theme@1/color.surface", resolution: "external" }))
  expect(manifest.coverage.unresolved).toContainEqual(expect.objectContaining({ reference: "legacy:--crumbs-legacy-missing" }))
  expect(manifest.capabilities).toEqual([{ moduleId, exportPath: "panel", property: "backgroundColor", primitive: "view", evidence: "compiler-observed" }])
})

test("packed tooling entry resolves ESM, CommonJS and declarations and round-trips the fixture", async () => {
  const { manifest } = createAssemblyFixture()
  const canonical = encodeCanonicalManifest(manifest)
  const consumerRoot = createPackedConsumer()
  const packageRoot = resolve(consumerRoot, "node_modules", "@opsydyn", "crumbs-css")

  for (const filename of ["tooling-manifest.mjs", "tooling-manifest.cjs", "tooling-manifest.d.mts", "tooling-manifest.d.cts"]) {
    expect(existsSync(resolve(packageRoot, "dist", filename))).toBe(true)
  }
  const resolutions = await verifyPackedExportMap(packageRoot, consumerRoot)
  expect(resolutions.find(entry => entry.subpath === "./tooling/manifest")).toEqual({
    subpath: "./tooling/manifest",
    import: "./dist/tooling-manifest.mjs",
    require: "./dist/tooling-manifest.cjs",
    types: "./dist/tooling-manifest.d.mts",
  })
  const declarations = readFileSync(resolve(packageRoot, "dist", "tooling-manifest.d.mts"), "utf8")
  expect(declarations).not.toContain("effect/Schema")
  expect(declarations).not.toContain("designSystemManifestSchema")

  writeFileSync(resolve(consumerRoot, "package.json"), JSON.stringify({ name: "crumbs-manifest-consumer", private: true, type: "module" }))
  writeFileSync(resolve(consumerRoot, "manifest.json"), JSON.stringify(manifest))
  writeFileSync(resolve(consumerRoot, "canonical.json"), JSON.stringify(canonical))
  writeFileSync(resolve(consumerRoot, "runtime.mjs"), `
    import assert from "node:assert/strict";
    import { readFileSync } from "node:fs";
    import * as root from "@opsydyn/crumbs-css";
    import * as theme from "@opsydyn/crumbs-css/theme";
    import * as themeCore from "@opsydyn/crumbs-css/theme/core";
    import * as tokens from "@opsydyn/crumbs-css/tokens";
    import { decodeManifest, encodeCanonicalManifest, transformCssTsToStyleSheetWithManifestSidecar } from "@opsydyn/crumbs-css/tooling/manifest";
    const manifest = JSON.parse(readFileSync(new URL("./manifest.json", import.meta.url), "utf8"));
    const canonical = JSON.parse(readFileSync(new URL("./canonical.json", import.meta.url), "utf8"));
    assert.deepEqual(decodeManifest(manifest), manifest);
    assert.equal(encodeCanonicalManifest(manifest), canonical);
    assert.equal(typeof transformCssTsToStyleSheetWithManifestSidecar, "function");
    for (const runtimeEntry of [root, theme, themeCore, tokens]) {
      assert.equal("assembleManifest" in runtimeEntry, false);
      assert.equal("decodeManifest" in runtimeEntry, false);
      assert.equal("encodeCanonicalManifest" in runtimeEntry, false);
      assert.equal("transformCssTsToStyleSheetWithManifestSidecar" in runtimeEntry, false);
    }
  `)
  writeFileSync(resolve(consumerRoot, "runtime.cjs"), `
    const assert = require("node:assert/strict");
    const { readFileSync } = require("node:fs");
    const root = require("@opsydyn/crumbs-css");
    const theme = require("@opsydyn/crumbs-css/theme");
    const themeCore = require("@opsydyn/crumbs-css/theme/core");
    const tokens = require("@opsydyn/crumbs-css/tokens");
    const { decodeManifest, encodeCanonicalManifest, transformCssTsToStyleSheetWithManifestSidecar } = require("@opsydyn/crumbs-css/tooling/manifest");
    const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
    const canonical = JSON.parse(readFileSync("canonical.json", "utf8"));
    assert.deepEqual(decodeManifest(manifest), manifest);
    assert.equal(encodeCanonicalManifest(manifest), canonical);
    assert.equal(typeof transformCssTsToStyleSheetWithManifestSidecar, "function");
    for (const runtimeEntry of [root, theme, themeCore, tokens]) {
      assert.equal("assembleManifest" in runtimeEntry, false);
      assert.equal("decodeManifest" in runtimeEntry, false);
      assert.equal("encodeCanonicalManifest" in runtimeEntry, false);
      assert.equal("transformCssTsToStyleSheetWithManifestSidecar" in runtimeEntry, false);
    }
  `)
  run(["node", "runtime.mjs"], consumerRoot)
  run(["node", "runtime.cjs"], consumerRoot)

  writeTypeConfigs(consumerRoot)
  const tsc = resolve(resolveInstalledPackageRoot("typescript"), "bin", "tsc")
  run([tsc, "-p", "tsconfig.node16.json"], consumerRoot)
  run([tsc, "-p", "tsconfig.bundler.json"], consumerRoot)

  const graphs = await auditPackedRuntimeEntrypoints(packageRoot)
  for (const subpath of ["./theme", "./theme/core", "./tokens"]) {
    for (const format of ["esm", "cjs"]) {
      const graph = graphs.find(entry => entry.subpath === subpath && entry.format === format)!
      expect(graph.classification).toBe("ordinary-runtime")
      expect(graph.externalSpecifiers.some(specifier => specifier.startsWith("effect"))).toBe(false)
      expect(graph.files.some(file => /tooling-manifest|transformer|native-style/u.test(file))).toBe(false)
    }
  }
  expect(assertRuntimeBundleSources(["/repo/packages/css/dist/theme.mjs", "/repo/packages/css/dist/theme-core.mjs"])).toBe(2)
  expect(() => assertRuntimeBundleSources(["/repo/packages/css/dist/theme.mjs", "/repo/packages/css/dist/tooling-manifest.mjs"]))
    .toThrow(/Non-runtime Crumbs/)
  expect(() => assertRuntimeBundleSources(["/app/node_modules/effect/dist/Schema.js"]))
    .toThrow(/Effect dependency/)
}, 30000)


test("packed focused theme feature paths preserve ESM/CJS identities and declaration conditions", async () => {
  const consumerRoot = createPackedConsumer()
  const packageRoot = resolve(consumerRoot, "node_modules", "@opsydyn", "crumbs-css")
  const featureEntries = [
    ["./theme/conditions", "theme-conditions"],
    ["./theme/expressions", "theme-expressions"],
    ["./theme/recipes", "theme-recipes"],
    ["./theme/sprinkles", "theme-sprinkles"],
  ] as const

  for (const [, entry] of featureEntries) {
    for (const filename of [`${entry}.mjs`, `${entry}.cjs`, `${entry}.d.mts`, `${entry}.d.cts`]) {
      expect(existsSync(resolve(packageRoot, "dist", filename))).toBe(true)
    }
  }
  const resolutions = await verifyPackedExportMap(packageRoot, consumerRoot)
  for (const [subpath, entry] of featureEntries) {
    expect(resolutions.find(result => result.subpath === subpath)).toEqual({
      subpath,
      import: `./dist/${entry}.mjs`,
      require: `./dist/${entry}.cjs`,
      types: `./dist/${entry}.d.mts`,
    })
  }

  writeFileSync(resolve(consumerRoot, "package.json"), JSON.stringify({ name: "crumbs-theme-consumer", private: true, type: "module" }))
  writeFileSync(resolve(consumerRoot, "manifest.json"), "{}")
  writeFileSync(resolve(consumerRoot, "theme-features.mjs"), `
    import assert from "node:assert/strict";
    import * as theme from "@opsydyn/crumbs-css/theme";
    import * as conditions from "@opsydyn/crumbs-css/theme/conditions";
    import * as expressions from "@opsydyn/crumbs-css/theme/expressions";
    import * as recipes from "@opsydyn/crumbs-css/theme/recipes";
    import * as sprinkles from "@opsydyn/crumbs-css/theme/sprinkles";
    for (const feature of [conditions, expressions, recipes, sprinkles]) {
      for (const [name, value] of Object.entries(feature)) {
        if (Object.prototype.hasOwnProperty.call(theme, name)) assert.strictEqual(value, theme[name], name);
      }
    }
  `)
  writeFileSync(resolve(consumerRoot, "theme-features.cjs"), `
    const assert = require("node:assert/strict");
    const theme = require("@opsydyn/crumbs-css/theme");
    const features = [
      require("@opsydyn/crumbs-css/theme/conditions"),
      require("@opsydyn/crumbs-css/theme/expressions"),
      require("@opsydyn/crumbs-css/theme/recipes"),
      require("@opsydyn/crumbs-css/theme/sprinkles"),
    ];
    for (const feature of features) {
      for (const [name, value] of Object.entries(feature)) {
        if (Object.prototype.hasOwnProperty.call(theme, name)) assert.strictEqual(value, theme[name], name);
      }
    }
  `)
  run(["node", "theme-features.mjs"], consumerRoot)
  run(["node", "theme-features.cjs"], consumerRoot)

  writeTypeConfigs(consumerRoot)
  const tsc = resolve(resolveInstalledPackageRoot("typescript"), "bin", "tsc")
  run([tsc, "-p", "tsconfig.node16.json"], consumerRoot)
  run([tsc, "-p", "tsconfig.bundler.json"], consumerRoot)

  const graphs = await auditPackedRuntimeEntrypoints(packageRoot)
  for (const [subpath] of featureEntries) {
    const graph = graphs.find(result => result.subpath === subpath && result.format === "esm")!
    expect(graph.classification).toBe("ordinary-runtime")
    expect(graph.externalSpecifiers.filter(specifier =>
      specifier.startsWith("effect") || specifier.startsWith("node:") ||
      specifier.startsWith("@vanilla-extract/") || specifier === "css-to-react-native" ||
      specifier === "typescript" || specifier === "metro" || specifier.startsWith("metro/"),
    )).toEqual([])
    expect(graph.files.some(file => /\/(?:native-style|native-capture|compiler|transformer|metro-plugin|devtools|tooling)(?:[-.]|\/)/u.test(file))).toBe(false)
  }
}, 30000)
