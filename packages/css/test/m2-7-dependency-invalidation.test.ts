import { describe, expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import path from "node:path"
import {
  analyseDependencyImports,
  analyseDependencyInputs,
  createDependencyCacheIdentity,
} from "../src/compiler/dependency-analysis"
import { buildStyleSheetCode, transformCssTsToStyleSheet } from "../src/transformer"
import { createNativeStylesCacheStore } from "../src/metro-plugin"
import {
  admitDependencyControls,
  createIncrementalBaseStyleSource,
  createIncrementalStyleSource,
  createIncrementalTokenSource,
  createWorkspaceTokenSource,
} from "../bench/metro-incremental"
import type { DependencyControl } from "../bench/metro-incremental"

const packageRoot = path.resolve(import.meta.dir, "..")

function context(overrides: Partial<Parameters<typeof createDependencyCacheIdentity>[1]> = {}) {
  return {
    compilerKey: "compiler-a",
    platform: "ios",
    dev: true,
    strictDiagnostics: true,
    useStyleSheet: true,
    identOption: "debug",
    ...overrides,
  }
}

describe("M2.7 dependency invalidation", () => {
  it("fingerprints nested and workspace source inputs while excluding third-party and generated files", () => {
    const workspace = mkdtempSync(path.join(packageRoot, "fixtures/.m2-7-workspace-"))
    try {
      const appRoot = path.join(workspace, "apps", "app")
      const nested = path.join(appRoot, "styles", "nested.css.ts")
      const workspaceToken = path.join(workspace, "packages", "tokens", "src", "index.ts")
      const thirdParty = path.join(appRoot, "node_modules", "pkg", "index.ts")
      const generated = path.join(workspace, "packages", "generated", "dist", "index.ts")
      mkdirSync(path.dirname(nested), { recursive: true })
      mkdirSync(path.dirname(workspaceToken), { recursive: true })
      mkdirSync(path.dirname(thirdParty), { recursive: true })
      mkdirSync(path.dirname(generated), { recursive: true })
      writeFileSync(nested, "export const nested = 1\n")
      writeFileSync(workspaceToken, "export const token = 2\n")
      writeFileSync(thirdParty, "export const thirdParty = 3\n")
      writeFileSync(generated, "export const generated = 4\n")

      const entry = path.join(appRoot, "styles", "button.css.ts")
      const capturedInputs = {
        "styles/button.css.ts": {},
        "styles/nested.css.ts": {},
        "../../packages/tokens/src/index.ts": {},
        "node_modules/pkg/index.ts": {},
        "../../packages/generated/dist/index.ts": {},
      }
      const options = {
        cwd: appRoot,
        absoluteEntryPath: entry,
        nativeStylesDistRoot: path.join(workspace, "packages", "css", "dist"),
        workspaceRoot: workspace,
      }

      expect(analyseDependencyImports(capturedInputs, options)).toEqual([
        "../../../packages/tokens/src/index.ts",
        "./nested.css.ts",
      ])
      const inputs = analyseDependencyInputs(capturedInputs, options)
      expect(inputs.map(({ importPath }) => importPath)).toEqual([
        "../../../packages/tokens/src/index.ts",
        "./nested.css.ts",
      ])
      expect(inputs.every(({ sourceHash }) => /^[a-f0-9]{64}$/.test(sourceHash))).toBe(true)
    } finally {
      rmSync(workspace, { recursive: true, force: true })
    }
  })

  it("changes cache identity for dependency content and transform context", () => {
    const dependency = {
      importPath: "./token.ts",
      sourcePath: "/workspace/token.ts",
      sourceHash: createHash("sha256").update("token-a").digest("hex"),
    }
    const first = createDependencyCacheIdentity([dependency], context())
    const changedContent = createDependencyCacheIdentity([
      { ...dependency, sourceHash: createHash("sha256").update("token-b").digest("hex") },
    ], context())
    const changedTarget = createDependencyCacheIdentity([dependency], context({ platform: "web", useStyleSheet: false }))
    const changedConfig = createDependencyCacheIdentity([dependency], context({ strictDiagnostics: false }))
    const changedCompiler = createDependencyCacheIdentity([dependency], context({ compilerKey: "compiler-b" }))

    expect(first).toMatch(/^[a-f0-9]{64}$/)
    expect(new Set([changedContent, changedTarget, changedConfig, changedCompiler]).size).toBe(4)
    expect(first).not.toBe(changedContent)
  })

  it("emits a private cache marker that changes the generated parent source", () => {
    const first = buildStyleSheetCode(new Map(), new Map(), [], {
      useStyleSheet: false,
      cacheIdentity: "a".repeat(64),
    })
    const second = buildStyleSheetCode(new Map(), new Map(), [], {
      useStyleSheet: false,
      cacheIdentity: "b".repeat(64),
    })

    expect(first).toContain("@crumbs-native-cache")
    expect(first).not.toBe(second)
  })

  it("changes the transformed parent source after a plain dependency edit", async () => {
    const directory = mkdtempSync(path.join(packageRoot, "fixtures/.m2-7-transform-"))
    try {
      const file = path.join(directory, "case.css.ts")
      const dependency = path.join(directory, "token.ts")
      writeFileSync(file, 'import { token } from "./token"\nimport { viewStyle } from "@opsydyn/crumbs-css/style"\nexport const panel = viewStyle({ padding: token })\n')
      writeFileSync(dependency, "export const token = 8\n")
      const first = await transformCssTsToStyleSheet(file, packageRoot, { useStyleSheet: false })
      writeFileSync(dependency, "export const token = 9\n")
      const second = await transformCssTsToStyleSheet(file, packageRoot, { useStyleSheet: false })

      expect(first).toContain("@crumbs-native-cache")
      expect(second).toContain("@crumbs-native-cache")
      expect(first).not.toBe(second)
      expect(second).toContain("9")
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it("generates nested and workspace dependency fixtures without baking values into source", () => {
    expect(createIncrementalTokenSource(7)).toContain("30000 + 7")
    expect(createIncrementalBaseStyleSource(8)).toContain("31000 + 8")
    expect(createWorkspaceTokenSource(9)).toContain("32000 + 9")
    expect(createIncrementalStyleSource(10)).toContain("incrementalBase")
    expect(createIncrementalStyleSource(10)).not.toContain("30100")
  })

  it("admits receipts for all dependency families and rejects stale output", () => {
    const controls: DependencyControl[] = [
      { kind: "plain-token", previousCompiledValue: 30001, compiledValue: 30002, editToReceiptMs: 10, attempts: 1, bundleSha256: "token", receipt: { compiledValuePresent: true, previousCompiledValueAbsent: true } },
      { kind: "nested-css", previousCompiledValue: 31001, compiledValue: 31003, editToReceiptMs: 11, attempts: 2, bundleSha256: "nested", receipt: { compiledValuePresent: true, previousCompiledValueAbsent: true } },
      { kind: "workspace-source", previousCompiledValue: 32001, compiledValue: 32004, editToReceiptMs: 12, attempts: 3, bundleSha256: "workspace", receipt: { compiledValuePresent: true, previousCompiledValueAbsent: true } },
    ]
    expect(admitDependencyControls(controls)).toEqual(controls)
    expect(() => admitDependencyControls(controls.map(control => ({ ...control, receipt: { ...control.receipt, previousCompiledValueAbsent: false } })))).toThrow(/plain-token/)
  })

  it("turns a cached Crumbs transform into a miss only after a dependency edit", async () => {
    const directory = mkdtempSync(path.join(packageRoot, "fixtures/.m2-7-cache-"))
    try {
      const dependency = path.join(directory, "token.ts")
      writeFileSync(dependency, "export const token = 1\n")
      const sourceHash = createHash("sha256").update("export const token = 1\n").digest("hex")
      let cached: unknown = {
        code: "export const panel = {};",
        __crumbsNativeStyles: {
          $$type: "crumbs.css.transform-cache",
          dependencies: [{ sourcePath: dependency, sourceHash }],
        },
      }
      const inner = {
        get: async () => cached,
        set: async (_key: Buffer, value: unknown) => { cached = value },
        clear: async () => { cached = null },
      }
      const store = createNativeStylesCacheStore(inner)
      const key = Buffer.from("cache-key")

      expect(await store.get(key)).toBe(cached)
      writeFileSync(dependency, "export const token = 2\n")
      expect(await store.get(key)).toBeNull()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
