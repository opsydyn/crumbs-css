import { describe, expect, it } from "bun:test"
import * as ts from "typescript"
import type { DesignSystemManifest, ManifestToken } from "../src/tooling/manifest/model"
import { parseMigrationSource, applySourceEdits } from "../src/tooling/migrations/ast"
import { planTokenReferenceEdits } from "../src/tooling/migrations/token-codemod"
import { validateSourceMigration } from "../src/tooling/migrations/validate"

const provider = "@example/design-system"
const oldAccentId = "@example/design-system/tokens@1#5:color/6:accent"
const newBrandId = "@example/design-system/tokens@2#5:color/5:brand"
const oldNeutralId = "@example/design-system/tokens@1#5:color/7:neutral"
const newNeutralId = "@example/design-system/tokens@2#5:color/7:neutral"

function token(id: string, version: number, path: ReadonlyArray<string>, domain: ManifestToken["domain"] = { kind: "color" }): ManifestToken {
  return {
    id,
    contract: { owner: provider, name: "tokens", version },
    path,
    visibility: "public",
    domain,
    kind: "definition",
    origin: { path: version === 1 ? "src/tokens-v1.css.ts" : "src/tokens.css.ts", exportPath: "tokens" },
  }
}

function manifest(version: "1.0.0" | "2.0.0", tokens: ReadonlyArray<ManifestToken>): DesignSystemManifest {
  const roots: DesignSystemManifest["coverage"]["roots"][number][] = []
  for (const item of tokens) {
    const id = `${item.contract.owner}#${item.contract.name}@${item.contract.version}`
    if (!roots.some(root => root.id === id)) roots.push({ kind: "token-contract", id })
  }
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: provider, version },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "native-style-ir", version: 1 },
    },
    tokens,
    components: [],
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: { roots, unresolved: [] },
  }
}

const migration = {
  format: "crumbs.source-migration",
  schemaVersion: 1,
  id: "design-system/2026-09-token-migration",
  revision: 1,
  provider,
  tokens: [{
    fromId: oldAccentId,
    toId: newBrandId,
    fromImport: { moduleSpecifier: "../tokens-v1.css", importedName: "tokens" },
    toImport: { moduleSpecifier: "../tokens.css", importedName: "tokens" },
  }],
  components: [],
} as const

function validated(currentTokens: ReadonlyArray<ManifestToken> = [token(newBrandId, 2, ["color", "brand"])]) {
  return validateSourceMigration({
    migration,
    baseline: manifest("1.0.0", [token(oldAccentId, 1, ["color", "accent"]), token(oldNeutralId, 1, ["color", "neutral"])]),
    current: manifest("2.0.0", currentTokens),
  })
}

function plan(source: string, currentTokens?: ReadonlyArray<ManifestToken>) {
  const parsed = parseMigrationSource("src/Button.css.ts", source)
  return planTokenReferenceEdits({ parsed, validated: validated(currentTokens) })
}

describe("safe token source migration codemod", () => {
  it("rewrites-named-token-import-and-static-path", () => {
    const source = 'import { tokens } from "../tokens-v1.css";\nconst accent = tokens.color.accent;\n'
    const result = plan(source)
    expect(result.diagnostics).toEqual([])
    expect(applySourceEdits(source, result.edits)).toBe('import { tokens } from "../tokens.css";\nconst accent = tokens.color.brand;\n')
  })

  it("preserves-local-import-alias-comments-and-unrelated-bytes", () => {
    const source = "/* header */\nimport { tokens /* imported */, tokens as second } from '../tokens-v1.css';\nconst accent = second.color.accent; // keep this\nconst untouched = call(1);\n"
    const result = plan(source)
    expect(result.diagnostics).toEqual([])
    const output = applySourceEdits(source, result.edits)
    expect(output).toBe("/* header */\nimport { tokens /* imported */, tokens as second } from '../tokens.css';\nconst accent = second.color.brand; // keep this\nconst untouched = call(1);\n")
  })

  it("leaves-unmapped-paths-when-current-contract-proves-them", () => {
    const source = 'import { tokens as palette } from "../tokens-v1.css";\nconst accent = palette.color.accent;\nconst neutral = palette.color.neutral;\n'
    const result = plan(source, [
      token(newBrandId, 2, ["color", "brand"]),
      token(newNeutralId, 2, ["color", "neutral"]),
    ])
    expect(result.diagnostics).toEqual([])
    expect(applySourceEdits(source, result.edits)).toBe('import { tokens as palette } from "../tokens.css";\nconst accent = palette.color.brand;\nconst neutral = palette.color.neutral;\n')
  })

  it("blocks-import-retarget-when-unmapped-path-is-absent-or-domain-changed", () => {
    const source = 'import { tokens } from "../tokens-v1.css";\nconst accent = tokens.color.accent;\nconst neutral = tokens.color.neutral;\n'
    const absent = plan(source, [token(newBrandId, 2, ["color", "brand"])])
    expect(absent.diagnostics.map(diagnostic => diagnostic.code)).toContain("token.contract-path-unmapped")
    expect(absent.edits).toEqual([])

    const changedDomain = plan(source, [
      token(newBrandId, 2, ["color", "brand"]),
      token(newNeutralId, 2, ["color", "neutral"], { kind: "length", allowNegative: false }),
    ])
    expect(changedDomain.diagnostics.map(diagnostic => diagnostic.code)).toContain("token.contract-path-unmapped")
    expect(changedDomain.edits).toEqual([])
  })

  it("reports-computed-destructured-shadowed-and-reassigned-bindings", () => {
    const cases = [
      'import { tokens } from "../tokens-v1.css";\nconst accent = tokens.color[name];\n',
      'import { tokens } from "../tokens-v1.css";\nconst { color } = tokens;\n',
      'import { tokens } from "../tokens-v1.css";\nfunction read(tokens: unknown) { return tokens.color.accent; }\n',
      'import { tokens } from "../tokens-v1.css";\ntokens = replacement;\nconst accent = tokens.color.accent;\n',
    ]
    for (const source of cases) {
      const result = plan(source)
      expect(result.diagnostics.length).toBeGreaterThan(0)
      expect(result.edits).toEqual([])
    }
    expect(plan(cases[0]!).diagnostics.map(diagnostic => diagnostic.code)).toContain("source.unsupported-syntax")
    expect(plan(cases[2]!).diagnostics.map(diagnostic => diagnostic.code)).toContain("source.ambiguous-binding")
  })

  it("rejects-overlapping-and-out-of-bounds-edits", () => {
    expect(() => applySourceEdits("abcd", [
      { start: 0, end: 2, replacement: "x", code: "source.unsupported-syntax" },
      { start: 1, end: 3, replacement: "y", code: "source.unsupported-syntax" },
    ])).toThrow("overlapping")
    expect(() => applySourceEdits("abcd", [
      { start: -1, end: 1, replacement: "x", code: "source.unsupported-syntax" },
    ])).toThrow("outside")
    expect(() => applySourceEdits("abcd", [
      { start: 2, end: 5, replacement: "x", code: "source.unsupported-syntax" },
    ])).toThrow("outside")
    expect(applySourceEdits("abcd", [
      { start: 0, end: 1, replacement: "A", code: "source.unsupported-syntax" },
      { start: 3, end: 4, replacement: "D", code: "source.unsupported-syntax" },
    ])).toBe("AbcD")
  })

  it("parses-ts-and-tsx-without-project-loading", () => {
    const typed = parseMigrationSource("sample.ts", "const value: number = 1")
    const jsx = parseMigrationSource("sample.tsx", "export const view = <View />")
    expect(typed.sourceFile.languageVariant).toBe(ts.LanguageVariant.Standard)
    expect(jsx.sourceFile.languageVariant).toBe(ts.LanguageVariant.JSX)
    expect(typed.diagnostics).toEqual([])
    expect(jsx.diagnostics).toEqual([])
    expect(parseMigrationSource("broken.ts", "const =").diagnostics[0]?.code).toBe("source.parse-error")
  })
})
