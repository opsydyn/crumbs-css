import { describe, expect, it } from "bun:test"
import * as path from "node:path"
import {
  NO_COMPATIBILITY_CAPTURE,
  normalizeCompatibilityScalarValue,
} from "../src/compiler/shorthand-normalization"
import {
  CompilerRecordAdmissionError,
  ownEnumerableDataEntries,
} from "../src/compiler/record-admission"
import { analyseDependencyImports } from "../src/compiler/dependency-analysis"
import { indexStyleExportOwnership } from "../src/compiler/export-ownership"
import { emitStyleSheetModule } from "../src/compiler/code-emission"

describe("M2.4 compiler stage contracts", () => {
  it("keeps compatibility scalar normalization separate from native capture", () => {
    expect(normalizeCompatibilityScalarValue("fontSize", "24px")).toBe(24)
    expect(normalizeCompatibilityScalarValue("padding", "1px 2px")).toBe(NO_COMPATIBILITY_CAPTURE)
    expect(normalizeCompatibilityScalarValue("lineHeight", "var(--crumbs-line-height)")).toBe(
      "var(--crumbs-line-height)",
    )
  })

  it("admits only own enumerable data properties", () => {
    const inherited = { inherited: "ignored" }
    const record = Object.create(inherited) as Record<string, unknown>
    Object.defineProperty(record, "__proto__", { value: "own", enumerable: true })
    record.value = 2
    expect(ownEnumerableDataEntries(record)).toEqual([
      ["__proto__", "own"],
      ["value", 2],
    ])

    Object.defineProperty(record, "lazy", {
      enumerable: true,
      get: () => 3,
    })
    expect(() => ownEnumerableDataEntries(record, "style")).toThrow(CompilerRecordAdmissionError)
    expect(() => ownEnumerableDataEntries(record, "style")).toThrow(/accessor at style\.lazy/)
  })

  it("indexes export/class ownership once with deterministic owners", () => {
    const index = indexStyleExportOwnership(new Map<string, unknown>([
      ["zeta", "shared"],
      ["alpha", "shared"],
      ["nested", { second: "second", first: "first" }],
    ]))
    expect(index.exportNameForClass("shared")).toBe("alpha")
    expect(index.exportNameForClass("missing")).toBeUndefined()
    expect(index.classNames).toEqual(["first", "second", "shared"])
  })

  it("sorts and deduplicates project dependency imports once", () => {
    const projectRoot = path.resolve("/workspace/app")
    const entry = path.join(projectRoot, "styles", "button.css.ts")
    const imports = analyseDependencyImports({
      "styles/z.css.ts": {},
      "./styles/z.css.ts": {},
      "styles/a.css.ts": {},
      "node_modules/pkg/index.ts": {},
      "dist/generated.ts": {},
      "../outside.ts": {},
    }, {
      cwd: projectRoot,
      absoluteEntryPath: entry,
      nativeStylesDistRoot: path.join(projectRoot, "packages", "css", "dist"),
    })
    expect(imports).toEqual(["./a.css.ts", "./z.css.ts"])
  })

  it("emits stable code for equivalent maps and preserves own proto keys", () => {
    const makeStyle = (entries: ReadonlyArray<readonly [string, unknown]>) => {
      const style: Record<string, unknown> = {}
      for (const [key, value] of entries) Object.defineProperty(style, key, { value, enumerable: true })
      return style
    }
    const codeA = emitStyleSheetModule(
      new Map([["zeta", "zeta__hash"], ["alpha", "alpha__hash"]]),
      new Map([["zeta__hash", makeStyle([["zIndex", 2], ["__proto__", "safe"]])], ["alpha__hash", { opacity: 0.5 }]]),
      ["./z.css.ts", "./a.css.ts", "./z.css.ts"],
      { useStyleSheet: false },
    )
    const codeB = emitStyleSheetModule(
      new Map([["alpha", "alpha__hash"], ["zeta", "zeta__hash"]]),
      new Map([["alpha__hash", { opacity: 0.5 }], ["zeta__hash", makeStyle([["__proto__", "safe"], ["zIndex", 2]])]]),
      ["./a.css.ts", "./z.css.ts"],
      { useStyleSheet: false },
    )
    expect(codeA).toBe(codeB)
    expect(codeA).toContain('["__proto__"]')

    const ordinary = Object.create(null) as Record<string, unknown>
    Object.defineProperty(ordinary, "__proto__", { value: "safe", enumerable: true })
    const ordinaryCode = emitStyleSheetModule(new Map([["payload", ordinary]]), new Map(), [], { useStyleSheet: false })
    expect(ordinaryCode).toContain('["__proto__"]: "safe"')
  })
})
