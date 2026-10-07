import { afterAll, beforeAll, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, resolve } from "node:path"
import { auditPackedRuntimeEntrypoints } from "../../../scripts/packed-runtime-graph"

const PACKAGE_ROOT = resolve(import.meta.dir, "..")
const requireFromPackage = createRequire(resolve(PACKAGE_ROOT, "package.json"))
const temporaryRoots: string[] = []
let consumerRoot = ""

type SpawnResult = ReturnType<typeof Bun.spawnSync>

function run(command: ReadonlyArray<string>, cwd: string): SpawnResult {
  return Bun.spawnSync([...command], { cwd, stderr: "pipe", stdout: "pipe" })
}

function expectSuccessfulRun(command: ReadonlyArray<string>, cwd: string): void {
  const result = run(command, cwd)
  expect(result.exitCode).toBe(0)
  if (result.exitCode !== 0) {
    throw new Error([`$ ${command.join(" ")}`, (result.stdout?.toString() ?? ""), (result.stderr?.toString() ?? "")].join("\n"))
  }
}

beforeAll(() => {
  const root = mkdtempSync(resolve(tmpdir(), "crumbs-css-dtcg-export-"))
  temporaryRoots.push(root)
  consumerRoot = resolve(root, "consumer")
  const scopedPackage = resolve(consumerRoot, "node_modules", "@opsydyn")
  mkdirSync(scopedPackage, { recursive: true })
  symlinkSync(PACKAGE_ROOT, resolve(scopedPackage, "crumbs-css"), "junction")
  writeFileSync(resolve(consumerRoot, "package.json"), JSON.stringify({ type: "module" }))
})

afterAll(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true })
})

test("publishes the exact opt-in DTCG ESM, CommonJS and declaration targets", () => {
  const packageJson = JSON.parse(readFileSync(resolve(PACKAGE_ROOT, "package.json"), "utf8")) as {
    readonly exports?: Record<string, unknown>
  }
  const expected = {
    types: "./dist/tooling-dtcg.d.mts",
    import: "./dist/tooling-dtcg.mjs",
    require: "./dist/tooling-dtcg.cjs",
  }
  expect(packageJson.exports?.["./tooling/dtcg"]).toEqual(expected)
  for (const filename of ["tooling-dtcg.mjs", "tooling-dtcg.cjs", "tooling-dtcg.d.mts", "tooling-dtcg.d.cts"]) {
    expect(existsSync(resolve(PACKAGE_ROOT, "dist", filename))).toBe(true)
  }
})

test("loads the public DTCG API through ESM and CommonJS without private schema exports", () => {
  writeFileSync(resolve(consumerRoot, "runtime.mjs"), `
    import assert from "node:assert/strict";
    import * as api from "@opsydyn/crumbs-css/tooling/dtcg";
    assert.equal(typeof api.importDtcgTheme, "function");
    assert.equal(api.CRUMBS_DTCG_IMPORT_FORMAT, "crumbs.dtcg-theme-import");
    assert.equal(api.CRUMBS_DTCG_IMPORT_VERSION, 1);
    assert.equal(api.CRUMBS_DTCG_METADATA_FORMAT, "crumbs.dtcg-theme-import-metadata");
    assert.equal(api.CRUMBS_DTCG_FORMAT_PROFILE, "2025.10");
    assert.deepEqual(api.CRUMBS_DTCG_RESOLVER_VERSIONS, ["2025-10-01", "2025-11-01", "2025.10"]);
    assert.ok(api.CRUMBS_DTCG_DIAGNOSTIC_CODES.includes("input.invalid"));
    for (const name of ["resolverVersionSchema", "importRequestSchema", "decodeDtcgImportRequest", "decodeCrumbsDtcgResolverVersion", "indexDtcgDocuments", "resolveDtcgReference", "resolveDtcgTokenIndex", "DtcgResolvedTokenIndex"]) {
      assert.equal(name in api, false, "private DTCG implementation leaked: " + name);
    }
    assert.deepEqual(Object.keys(api).filter(name => /(?:Schema|Codec)$/.test(name)), []);
  `)
  writeFileSync(resolve(consumerRoot, "runtime.cjs"), `
    const assert = require("node:assert/strict");
    const api = require("@opsydyn/crumbs-css/tooling/dtcg");
    assert.equal(typeof api.importDtcgTheme, "function");
    assert.equal(api.CRUMBS_DTCG_IMPORT_FORMAT, "crumbs.dtcg-theme-import");
    assert.equal(api.CRUMBS_DTCG_IMPORT_VERSION, 1);
    assert.equal(api.CRUMBS_DTCG_FORMAT_PROFILE, "2025.10");
    assert.deepEqual(api.CRUMBS_DTCG_RESOLVER_VERSIONS, ["2025-10-01", "2025-11-01", "2025.10"]);
    assert.deepEqual(Object.keys(api).filter(name => /(?:Schema|Codec)$/.test(name)), []);
  `)

  expectSuccessfulRun(["node", "runtime.mjs"], consumerRoot)
  expectSuccessfulRun(["node", "runtime.cjs"], consumerRoot)
})

test("imports a deep acyclic Resolver set chain through the bundled public API", async () => {
  const [{ importDtcgTheme }, { createTokenContract, token }, { assembleManifest }] = await Promise.all([
    import("../dist/tooling-dtcg.mjs"),
    import("../dist/tokens.mjs"),
    import("../dist/tooling-manifest.mjs"),
  ])
  const depth = 15_000
  const identity = { owner: "@example/deep-resolver", name: "tokens", version: 1 } as const
  const contract = createTokenContract({ color: { leaf: token.color() } }, identity)
  const manifest = assembleManifest({
    package: { name: identity.owner, version: "1.0.0" },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "crumbs.native-style-artifact", version: 1 },
    },
    tokenContracts: [{ contract, origin: { path: "src/tokens.css.ts", exportPath: "tokens" } }],
  })
  const resolverUri = "https://example.test/resolver.json"
  const documents = Object.create(null) as Record<string, Parameters<typeof importDtcgTheme>[0]["documents"][string]>
  for (let index = 0; index < depth; index += 1) {
    const uri = `https://example.test/chain/${index}.json`
    documents[uri] = {
      sources: index + 1 < depth
        ? [{ $ref: `${index + 1}.json` }]
        : [{
            color: {
              leaf: {
                $type: "color",
                $value: { colorSpace: "srgb", components: [0, 0, 0] },
              },
            },
          }],
    }
  }

  const result = importDtcgTheme({
    resolver: {
      version: "2025.10",
      sets: { root: { sources: [{ $ref: "https://example.test/chain/0.json" }] } },
      resolutionOrder: [{ $ref: "#/sets/root" }],
    },
    resolverUri,
    documents,
    manifest,
    contractIdentity: identity,
  })

  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(result.value.payload.values).toEqual({ [manifest.tokens[0]!.id]: "rgb(0, 0, 0)" })
    const sourceChain = result.value.sidecar.tokens[0]?.sourceChain ?? []
    expect(sourceChain).toHaveLength(30_005)
    expect(sourceChain[0]).toEqual({ documentUri: resolverUri, jsonPointer: "/resolutionOrder/0" })
    expect(sourceChain[1]).toEqual({ documentUri: resolverUri, jsonPointer: "/sets/root" })
    expect(sourceChain[15_002]).toEqual({ documentUri: "https://example.test/chain/7499.json", jsonPointer: "/sources/0" })
    expect(sourceChain[15_003]).toEqual({ documentUri: "https://example.test/chain/7500.json", jsonPointer: "" })
    expect(sourceChain[30_002]).toEqual({ documentUri: "https://example.test/chain/14999.json", jsonPointer: "/sources/0" })
  }
})

test("supports consumer declaration use under Node16 and Bundler resolution", () => {
  const declarations = readFileSync(resolve(PACKAGE_ROOT, "dist/tooling-dtcg.d.mts"), "utf8")
  expect(declarations).not.toContain("effect/Schema")
  expect(declarations).not.toContain("decodeDtcgImportRequest")
  expect(declarations).not.toContain("indexDtcgDocuments")

  writeFileSync(resolve(consumerRoot, "dtcg-types.ts"), `
    import {
      CRUMBS_DTCG_DIAGNOSTIC_CODES, CRUMBS_DTCG_FORMAT_PROFILE,
      CRUMBS_DTCG_IMPORT_FORMAT, CRUMBS_DTCG_IMPORT_VERSION,
      CRUMBS_DTCG_METADATA_FORMAT, CRUMBS_DTCG_METADATA_VERSION,
      CRUMBS_DTCG_RESOLVER_VERSIONS, importDtcgTheme,
    } from "@opsydyn/crumbs-css/tooling/dtcg";
    import type {
      CrumbsDtcgDiagnostic, CrumbsDtcgDiagnosticCode, CrumbsDtcgImportRequest,
      CrumbsDtcgImportResult, CrumbsDtcgResolverVersion, CrumbsDtcgThemeImport,
      DtcgGroupMetadata, DtcgImportSidecar, DtcgJsonObject, DtcgJsonPrimitive,
      DtcgJsonValue, DtcgOperationResult, DtcgOrigin, DtcgTokenMetadata,
      DtcgTokenProvenance,
    } from "@opsydyn/crumbs-css/tooling/dtcg";
    declare const request: CrumbsDtcgImportRequest;
    declare const sidecar: DtcgImportSidecar;
    declare const origin: DtcgOrigin;
    declare const diagnostic: CrumbsDtcgDiagnostic;
    declare const metadata: DtcgTokenMetadata;
    declare const group: DtcgGroupMetadata;
    declare const provenance: DtcgTokenProvenance;
    const result: CrumbsDtcgImportResult = importDtcgTheme(request);
    const operation: DtcgOperationResult<CrumbsDtcgThemeImport> = result;
    const code: CrumbsDtcgDiagnosticCode = diagnostic.code;
    const resolverVersion: CrumbsDtcgResolverVersion = CRUMBS_DTCG_RESOLVER_VERSIONS[0];
    const primitive: DtcgJsonPrimitive = null;
    const jsonValue: DtcgJsonValue = {value: primitive};
    const jsonObject: DtcgJsonObject = {value: jsonValue};
    const profile: "2025.10" = CRUMBS_DTCG_FORMAT_PROFILE;
    const importFormat: "crumbs.dtcg-theme-import" = CRUMBS_DTCG_IMPORT_FORMAT;
    const importVersion: 1 = CRUMBS_DTCG_IMPORT_VERSION;
    const metadataFormat: "crumbs.dtcg-theme-import-metadata" = CRUMBS_DTCG_METADATA_FORMAT;
    const metadataVersion: 1 = CRUMBS_DTCG_METADATA_VERSION;
    const codes: ReadonlyArray<CrumbsDtcgDiagnosticCode> = CRUMBS_DTCG_DIAGNOSTIC_CODES;
    const tokenMetadata: DtcgTokenMetadata = group.metadata;
    const token: DtcgTokenProvenance = sidecar.tokens[0]!;
    const suppliedOrigin: DtcgOrigin = token.origin;
    void [operation, code, resolverVersion, primitive, jsonObject, profile, importFormat, importVersion, metadataFormat, metadataVersion, codes, tokenMetadata, provenance, origin, suppliedOrigin, metadata];
  `)

  const compiler = resolve(dirname(requireFromPackage.resolve("typescript/package.json")), "bin", "tsc")
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
      include: ["dtcg-types.ts"],
    }, null, 2))
    expectSuccessfulRun([compiler, "-p", filename], consumerRoot)
  }
})

test("keeps the DTCG tooling graph opt-in and outside every ordinary runtime entry", async () => {
  const graphs = await auditPackedRuntimeEntrypoints(PACKAGE_ROOT)
  for (const format of ["esm", "cjs"] as const) {
    expect(graphs.find(graph => graph.subpath === "./tooling/dtcg" && graph.format === format)?.classification)
      .toBe("compiler-tooling")
  }
  for (const subpath of [".", "./style", "./theme", "./theme/core", "./tokens", "./tokens/schema", "./tokens/schema/value"]) {
    for (const format of ["esm", "cjs"] as const) {
      const graph = graphs.find(entry => entry.subpath === subpath && entry.format === format)
      expect(graph).toBeDefined()
      expect(graph?.files.some(file => /tooling-dtcg|\/tooling\/dtcg/u.test(file))).toBe(false)
    }
  }
}, { timeout: 15_000 })
