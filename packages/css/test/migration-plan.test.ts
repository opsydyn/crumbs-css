import { describe, expect, it } from "bun:test"
import type { DesignSystemManifest, ManifestComponent } from "../src/tooling/manifest/model"
import { planSourceMigration } from "../src/tooling/migrations/plan"

const provider = "@example/design-system"
const oldButtonId = "@example/design-system#button@1"
const newActionId = "@example/design-system#action-button@2"

function component(
  id: string,
  version: number,
  path: string,
  exportPath: string,
  slots: ReadonlyArray<string>,
): ManifestComponent {
  return {
    id,
    contract: { owner: provider, name: "components", version },
    origin: { path, exportPath },
    slots,
    variants: {},
    extensionPoints: [],
    stateConstraints: [],
    defaults: {},
  }
}

function manifest(version: "1.0.0" | "2.0.0", components: ReadonlyArray<ManifestComponent>): DesignSystemManifest {
  return {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: { name: provider, version },
    producer: {
      compiler: { name: "@opsydyn/crumbs-css", version: "0.1.1-alpha.1" },
      artifact: { name: "native-style-ir", version: 1 },
    },
    tokens: [],
    components,
    modules: [],
    dependencies: [],
    capabilities: [],
    coverage: { roots: components.map(item => ({ kind: "component-recipe", id: item.id })), unresolved: [] },
  }
}

const migration = {
  format: "crumbs.source-migration",
  schemaVersion: 1,
  id: "design-system/2026-09-button-migration",
  revision: 1,
  provider,
  tokens: [],
  components: [{
    fromId: oldButtonId,
    toId: newActionId,
    fromImport: { moduleSpecifier: "../button.css", importedName: "button" },
    toImport: { moduleSpecifier: "../action-button.css", importedName: "actionButton" },
    slots: { root: "container", label: "label" },
  }],
} as const

const baseline = manifest("1.0.0", [component(oldButtonId, 1, "src/button.css.ts", "button", ["root", "label"])])
const current = manifest("2.0.0", [component(newActionId, 2, "src/action-button.css.ts", "actionButton", ["container", "label"])])

const imports = `import { button as baseRecipe } from "../button.css";\nimport { useThemedStyles as useStyles } from "@opsydyn/crumbs-css/theme/core";\nimport { createComponentRecipeResolver as createResolver } from "@opsydyn/crumbs-css/theme";\n`

function consumer(options: {
  readonly themed: string
  readonly resolver: string
  readonly result?: string
  readonly uses: string
  readonly extra?: string
}): string {
  return `${imports}${options.extra ?? ""}\nconst themed = useStyles(${options.themed});\nconst resolver = ${options.resolver};\n${options.result ?? "const result = resolver({});"}\n${options.uses}\n`
}

function plan(source: string, path = "src/consumer.tsx") {
  return planSourceMigration({ migration, baseline, current, files: [{ path, source }] })
}

describe("pure safe source migration planner", () => {
  it("traces-use-themed-styles-through-direct-resolver", () => {
    const source = consumer({
      themed: "{ baseRecipe }",
      resolver: "createResolver(themed.baseRecipe)",
      uses: "const rootStyle = result.root;",
    })
    const result = plan(source)
    expect(result.report.diagnostics).toEqual([])
    expect(result.outputs[0]?.changed).toBe(true)
    expect(result.outputs[0]?.source).toContain('import { actionButton as baseRecipe } from "../action-button.css";')
    expect(result.outputs[0]?.source).toContain("const rootStyle = result.container;")
    expect(result.report.files[0]?.proposedEditCount).toBe(3)
    expect(result.report.files[0]?.appliedEditCount).toBe(0)
    expect(result.report.analysisLimits.map(limit => limit.code)).toContain("explicit-files-only")
  })

  it("traces-resolver-created-inside-use-memo", () => {
    const source = consumer({
      themed: "{ action: baseRecipe }",
      resolver: "useMemo(() => createResolver(themed.action), [themed])",
      uses: "const labelStyle = result.label;",
      extra: 'import { useMemo } from "react";\n',
    })
    const result = plan(source)
    expect(result.report.diagnostics).toEqual([])
    expect(result.outputs[0]?.source).toContain("() => createResolver(themed.action)")
    expect(result.outputs[0]?.source).toContain("const labelStyle = result.label;")
  })

  it("rewrites-static-slot-members-on-immutable-result-bindings", () => {
    const source = consumer({
      themed: "{ action: baseRecipe }",
      resolver: "createResolver(themed.action)",
      uses: "const root = result.root; const label = result.label;",
    })
    const result = plan(source)
    expect(result.report.diagnostics).toEqual([])
    expect(result.outputs[0]?.source).toContain("const root = result.container; const label = result.label;")
  })

  it("blocks-computed-shadowed-reassigned-and-wrapper-flows", () => {
    const flows = [
      consumer({ themed: "{ action: baseRecipe }", resolver: "createResolver(themed.action)", uses: "const value = result[slot];" }),
      consumer({ themed: "{ action: baseRecipe }", resolver: "createResolver(themed.action)", uses: "function read(result: unknown) { return result.root; }" }),
      consumer({ themed: "{ action: baseRecipe }", resolver: "createResolver(themed.action)", result: "let result = resolver({}); result = {};", uses: "const value = result.root;" }),
      consumer({ themed: "{ action: baseRecipe }", resolver: "createResolver(identity(themed.action))", uses: "const value = result.root;" }),
    ]
    for (const source of flows) {
      const result = plan(source)
      expect(result.report.diagnostics.length).toBeGreaterThan(0)
      expect(result.outputs[0]?.source).toBe(source)
      expect(result.outputs[0]?.changed).toBe(false)
    }
  })

  it("plans-explicit-files-without-reading-disk", () => {
    const source = consumer({ themed: "{ baseRecipe }", resolver: "createResolver(themed.baseRecipe)", uses: "const root = result.root;" })
    const result = plan(source, "never-created/folder/consumer.ts")
    expect(result.outputs[0]?.path).toBe("never-created/folder/consumer.ts")
    expect(result.outputs[0]?.source).toContain("result.container")
  })

  it("sorts-results-independent-of-file-input-order", () => {
    const changed = consumer({ themed: "{ baseRecipe }", resolver: "createResolver(themed.baseRecipe)", uses: "const root = result.root;" })
    const unchanged = "export const untouched = true;\n"
    const files = [{ path: "z/consumer.ts", source: changed }, { path: "a/consumer.ts", source: unchanged }]
    const first = planSourceMigration({ migration, baseline, current, files })
    const second = planSourceMigration({ migration, baseline, current, files: [...files].reverse() })
    expect(second.report).toEqual(first.report)
    expect(second.outputs).toEqual(first.outputs)
    expect(first.outputs.map(file => file.path)).toEqual(["a/consumer.ts", "z/consumer.ts"])
  })

  it("returns-original-text-for-all-files-when-one-file-is-blocked", () => {
    const safe = consumer({ themed: "{ baseRecipe }", resolver: "createResolver(themed.baseRecipe)", uses: "const root = result.root;" })
    const blocked = consumer({ themed: "{ baseRecipe }", resolver: "createResolver(themed.baseRecipe)", uses: "const value = result[slot];" })
    const result = planSourceMigration({ migration, baseline, current, files: [
      { path: "src/safe.ts", source: safe },
      { path: "src/blocked.ts", source: blocked },
    ] })
    expect(result.report.diagnostics.length).toBeGreaterThan(0)
    expect(result.outputs).toEqual([
      { path: "src/blocked.ts", source: blocked, changed: false },
      { path: "src/safe.ts", source: safe, changed: false },
    ])
    expect(result.report.files.every(file => file.appliedEditCount === 0)).toBe(true)
    expect(result.report.files.map(file => file.status).sort()).toEqual(["blocked", "blocked"])
  })

  it("is-idempotent-after-a-successful-plan", () => {
    const source = consumer({ themed: "{ baseRecipe }", resolver: "createResolver(themed.baseRecipe)", uses: "const root = result.root;" })
    const first = plan(source)
    const migrated = first.outputs[0]!.source
    const second = plan(migrated)
    expect(first.report.diagnostics).toEqual([])
    expect(second.report.diagnostics).toEqual([])
    expect(second.outputs[0]?.changed).toBe(false)
    expect(second.outputs[0]?.source).toBe(migrated)
    expect(second.report.files[0]?.beforeSha256).toBe(first.report.files[0]?.afterSha256)
    expect(second.report.files[0]?.afterSha256).toBe(first.report.files[0]?.afterSha256)
  })
})
