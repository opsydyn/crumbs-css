import { afterEach, expect, it } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import { verifyPackedExportMap } from "../../../scripts/packed-export-contract"

const packageRoot = resolve(import.meta.dir, "..")
const requireFromPackage = createRequire(resolve(packageRoot, "package.json"))
const temporaryRoots: string[] = []

function run(command: ReadonlyArray<string>, cwd: string): void {
  const result = Bun.spawnSync([...command], { cwd, stderr: "pipe", stdout: "pipe" })
  if (result.exitCode !== 0) {
    throw new Error([`$ ${command.join(" ")}`, result.stdout.toString(), result.stderr.toString()].join("\n"))
  }
}

function linkRootDependency(consumerRoot: string, packageName: string): void {
  const source = dirname(requireFromPackage.resolve(`${packageName}/package.json`))
  if (!existsSync(source)) throw new Error(`Missing consumer dependency ${packageName}`)
  const target = resolve(consumerRoot, "node_modules", packageName)
  mkdirSync(dirname(target), { recursive: true })
  symlinkSync(source, target, "junction")
}

function createPackedConsumer(): string {
  const tempRoot = mkdtempSync(resolve(tmpdir(), "crumbs-css-manifest-comparison-consumer-"))
  temporaryRoots.push(tempRoot)
  run(["bun", "pm", "pack", "--destination", tempRoot], packageRoot)
  const tarball = readdirSync(tempRoot).find(entry => entry.endsWith(".tgz"))
  if (tarball === undefined) throw new Error("bun pm pack did not create a tarball")
  const consumerRoot = resolve(tempRoot, "consumer")
  const installedRoot = resolve(consumerRoot, "node_modules", "@opsydyn", "crumbs-css")
  mkdirSync(installedRoot, { recursive: true })
  run(["tar", "-xzf", resolve(tempRoot, tarball), "--strip-components=1", "-C", installedRoot], tempRoot)
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

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

it("packs comparison APIs for ESM, CommonJS, and typed consumers through tooling/manifest only", async () => {
  const consumerRoot = createPackedConsumer()
  const installedRoot = resolve(consumerRoot, "node_modules", "@opsydyn", "crumbs-css")
  for (const filename of ["tooling-manifest.mjs", "tooling-manifest.cjs", "tooling-manifest.d.mts", "tooling-manifest.d.cts"]) {
    expect(existsSync(resolve(installedRoot, "dist", filename))).toBe(true)
  }

  const resolutions = await verifyPackedExportMap(installedRoot, consumerRoot)
  expect(resolutions.find(entry => entry.subpath === "./tooling/manifest")).toEqual({
    subpath: "./tooling/manifest",
    import: "./dist/tooling-manifest.mjs",
    require: "./dist/tooling-manifest.cjs",
    types: "./dist/tooling-manifest.d.mts",
  })
  const declarations = readFileSync(resolve(installedRoot, "dist/tooling-manifest.d.mts"), "utf8")
  expect(declarations).toContain("ManifestCompatibilityReport")
  expect(declarations).toContain("decodeManifestCompatibilityReport")
  expect(declarations).not.toContain("effect/Schema")
  expect(declarations).not.toContain("designSystemManifestSchema")

  writeFileSync(resolve(consumerRoot, "package.json"), JSON.stringify({ name: "crumbs-manifest-comparison-consumer", private: true, type: "module" }))
  writeFileSync(resolve(consumerRoot, "runtime.mjs"), `
    import assert from "node:assert/strict";
    import { checkManifestConsumers, compareManifests, decodeManifestCompatibilityReport, encodeCanonicalManifestCompatibilityReport } from "@opsydyn/crumbs-css/tooling/manifest";
    const report = { format: "crumbs.design-system-compatibility-report", schemaVersion: 1, mode: "check", provider: { name: "@acme/design-system", currentVersion: "1.0.0" }, suppliedConsumers: [], findings: [], analysisLimits: [{ code: "explicit-coverage", message: "Only declared roots were checked." }] };
    assert.deepEqual(decodeManifestCompatibilityReport(report), report);
    assert.equal(encodeCanonicalManifestCompatibilityReport(report), JSON.stringify(report) + "\\n");
    assert.equal(typeof compareManifests, "function");
    assert.equal(typeof checkManifestConsumers, "function");
  `)
  writeFileSync(resolve(consumerRoot, "runtime.cjs"), `
    const assert = require("node:assert/strict");
    const { checkManifestConsumers, compareManifests, decodeManifestCompatibilityReport, encodeCanonicalManifestCompatibilityReport } = require("@opsydyn/crumbs-css/tooling/manifest");
    const report = { format: "crumbs.design-system-compatibility-report", schemaVersion: 1, mode: "check", provider: { name: "@acme/design-system", currentVersion: "1.0.0" }, suppliedConsumers: [], findings: [], analysisLimits: [{ code: "explicit-coverage", message: "Only declared roots were checked." }] };
    assert.deepEqual(decodeManifestCompatibilityReport(report), report);
    assert.equal(encodeCanonicalManifestCompatibilityReport(report), JSON.stringify(report) + "\\n");
    assert.equal(typeof compareManifests, "function");
    assert.equal(typeof checkManifestConsumers, "function");
  `)
  run(["node", "runtime.mjs"], consumerRoot)
  run(["node", "runtime.cjs"], consumerRoot)

  writeFileSync(resolve(consumerRoot, "manifest-types.ts"), `
    import { checkManifestConsumers, compareManifests, decodeManifestCompatibilityReport, encodeCanonicalManifestCompatibilityReport } from "@opsydyn/crumbs-css/tooling/manifest";
    import type { ManifestCompatibilityReport, ManifestCompatibilityFinding, ManifestConsumerReference, ManifestReportJson } from "@opsydyn/crumbs-css/tooling/manifest";
    declare const report: ManifestCompatibilityReport;
    const decoded: ManifestCompatibilityReport = decodeManifestCompatibilityReport(report);
    const finding: ManifestCompatibilityFinding | undefined = decoded.findings[0];
    const reference: ManifestConsumerReference | undefined = finding?.affectedConsumers[0];
    const value: ManifestReportJson = { nested: [null, true, 1, "色"] };
    void checkManifestConsumers({ current: value });
    void compareManifests({ baseline: value, current: value });
    void encodeCanonicalManifestCompatibilityReport(decoded);
    void reference;
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
        skipLibCheck: true,
        strict: true,
        target: "ES2022",
      },
      include: ["manifest-types.ts"],
    }, null, 2))
  }
  const tsc = resolve(dirname(requireFromPackage.resolve("typescript/package.json")), "bin", "tsc")
  run([tsc, "-p", "tsconfig.node16.json"], consumerRoot)
  run([tsc, "-p", "tsconfig.bundler.json"], consumerRoot)
})
