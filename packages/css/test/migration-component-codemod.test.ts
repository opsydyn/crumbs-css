import { describe, expect, it } from "bun:test"
import type { DesignSystemManifest, ManifestComponent } from "../src/tooling/manifest/model"
import { applySourceEdits, parseMigrationSource } from "../src/tooling/migrations/ast"
import {
  planComponentDeclarationEdits,
  planComponentExtensionEdits,
} from "../src/tooling/migrations/component-codemod"
import { validateSourceMigration } from "../src/tooling/migrations/validate"

const provider = "@example/design-system"
const oldButtonId = "@example/design-system#button@1"
const newActionId = "@example/design-system#action-button@2"
const duplicateButtonId = "@example/design-system#button-alias@1"
const duplicateActionId = "@example/design-system#action-alias@2"

function component(
  id: string,
  version: number,
  originPath: string,
  exportPath: string,
  slots: ReadonlyArray<string>,
): ManifestComponent {
  return {
    id,
    contract: { owner: provider, name: "components", version },
    origin: { path: originPath, exportPath },
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

function migration(duplicate = false, duplicateImport = false) {
  return {
    format: "crumbs.source-migration",
    schemaVersion: 1,
    id: "design-system/2026-09-button-slot-migration",
    revision: 1,
    provider,
    tokens: [],
    components: [
      {
        fromId: oldButtonId,
        toId: newActionId,
        fromImport: { moduleSpecifier: "../button.css", importedName: "button" },
        toImport: { moduleSpecifier: "../action-button.css", importedName: "actionButton" },
        slots: { root: "container", label: "label" },
      },
      ...(duplicate ? [{
        fromId: duplicateButtonId,
        toId: duplicateActionId,
        fromImport: duplicateImport ? { moduleSpecifier: "../button.css", importedName: "button" } : { moduleSpecifier: "../button-alias.css", importedName: "buttonAlias" },
        toImport: duplicateImport ? { moduleSpecifier: "../action-button.css", importedName: "actionButton" } : { moduleSpecifier: "../action-alias.css", importedName: "actionAlias" },
        slots: { root: "box", label: "label" },
      }] : []),
    ],
  } as const
}

function validated(duplicate = false, duplicateImport = false) {
  const oldComponents = [component(oldButtonId, 1, "src/button.css.ts", "button", ["root", "label"])]
  const newComponents = [component(newActionId, 2, "src/action-button.css.ts", "actionButton", ["container", "label"])]
  if (duplicate) {
    oldComponents.push(component(duplicateButtonId, 1, "src/button.css.ts", "button", ["root", "label"]))
    newComponents.push(component(duplicateActionId, 2, "src/action-alias.css.ts", "actionAlias", ["box", "label"]))
  }
  return validateSourceMigration({
    migration: migration(duplicate, duplicateImport),
    baseline: manifest("1.0.0", oldComponents),
    current: manifest("2.0.0", newComponents),
  })
}

function parse(source: string, path = "src/button.css.ts") {
  return parseMigrationSource(path, source)
}

describe("safe component source migration codemod", () => {
  it("matches-recipe-definition-by-explicit-manifest-origin-and-export", () => {
    const source = `import { componentRecipe } from "@opsydyn/crumbs-css/style";\nexport const button = componentRecipe({ slots: { root: "view", label: "text" } });\n`
    const result = planComponentDeclarationEdits({ parsed: parse(source), validated: validated() })
    expect(result.diagnostics).toEqual([])
    expect(applySourceEdits(source, result.edits)).toBe(`import { componentRecipe } from "@opsydyn/crumbs-css/style";\nexport const button = componentRecipe({ slots: { container: "view", label: "text" } });\n`)
  })

  it("rewrites-slot-keys-in-slots-base-variants-and-compounds", () => {
    const source = `import { componentRecipe as recipe } from "@opsydyn/crumbs-css/style";\nexport const button = recipe({\n  slots: { root: "view", label: "text" },\n  base: { root: { padding: 8 }, label: { fontSize: 14 } },\n  variants: { tone: { primary: { root: { opacity: 1 }, label: { color: "red" } } } },\n  compoundVariants: [{ variants: { tone: "primary" }, styles: { root: { borderWidth: 1 } } }],\n});\n`
    const result = planComponentDeclarationEdits({ parsed: parse(source), validated: validated() })
    expect(result.diagnostics).toEqual([])
    expect(applySourceEdits(source, result.edits)).toBe(`import { componentRecipe as recipe } from "@opsydyn/crumbs-css/style";\nexport const button = recipe({\n  slots: { container: "view", label: "text" },\n  base: { container: { padding: 8 }, label: { fontSize: 14 } },\n  variants: { tone: { primary: { container: { opacity: 1 }, label: { color: "red" } } } },\n  compoundVariants: [{ variants: { tone: "primary" }, styles: { container: { borderWidth: 1 } } }],\n});\n`)
  })

  it("rewrites-explicit-extension-slot-overrides-and-branches", () => {
    const source = `import { extendComponentRecipe as extend } from "@opsydyn/crumbs-css/style";\nimport { button as base } from "../button.css";\nexport const branded = extend(base, {\n  slotOverrides: { root: { opacity: 0.9 } },\n  variants: { tone: { brand: { root: { borderWidth: 1 }, label: { color: "blue" } } } },\n  compoundVariants: [{ variants: { tone: "brand" }, styles: { root: { borderColor: "blue" } } }],\n});\n`
    const result = planComponentExtensionEdits({ parsed: parse(source, "src/brand.css.ts"), validated: validated() })
    expect(result.diagnostics).toEqual([])
    expect(applySourceEdits(source, result.edits)).toBe(`import { extendComponentRecipe as extend } from "@opsydyn/crumbs-css/style";\nimport { actionButton as base } from "../action-button.css";\nexport const branded = extend(base, {\n  slotOverrides: { container: { opacity: 0.9 } },\n  variants: { tone: { brand: { container: { borderWidth: 1 }, label: { color: "blue" } } } },\n  compoundVariants: [{ variants: { tone: "brand" }, styles: { container: { borderColor: "blue" } } }],\n});\n`)
  })

  it("retains-variant-axes-values-and-unmapped-properties", () => {
    const source = `import { componentRecipe } from "@opsydyn/crumbs-css/style";\nexport const button = componentRecipe({\n  slots: { root: "view", label: "text" },\n  variants: { tone: { primary: { root: { opacity: 1 } }, quiet: { label: { opacity: 0.8 } } } },\n  defaultVariants: { tone: "primary" },\n  stateVariants: { pressed: { true: { tone: ["primary", "quiet"] } } },\n  metadata: { root: "this is not a slot field" },\n});\n`
    const result = planComponentDeclarationEdits({ parsed: parse(source), validated: validated() })
    expect(result.diagnostics).toEqual([])
    const output = applySourceEdits(source, result.edits)
    expect(output).toContain('variants: { tone: { primary: { container: { opacity: 1 } }, quiet: { label: { opacity: 0.8 } } } }')
    expect(output).toContain('defaultVariants: { tone: "primary" }')
    expect(output).toContain('stateVariants: { pressed: { true: { tone: ["primary", "quiet"] } } }')
    expect(output).toContain('metadata: { root: "this is not a slot field" }')
  })

  it("retains-import-local-alias-while-changing-recipe-export", () => {
    const source = `import { extendComponentRecipe } from "@opsydyn/crumbs-css/style";\nimport { button as legacyButton } from "../button.css";\nexport const brand = extendComponentRecipe(legacyButton, { slotOverrides: { root: { opacity: 0.9 } } });\n`
    const result = planComponentExtensionEdits({ parsed: parse(source, "src/brand.css.ts"), validated: validated() })
    expect(result.diagnostics).toEqual([])
    expect(applySourceEdits(source, result.edits)).toContain('import { actionButton as legacyButton } from "../action-button.css";')
    expect(applySourceEdits(source, result.edits)).toContain('extendComponentRecipe(legacyButton, { slotOverrides: { container: { opacity: 0.9 } } })')
  })

  it("blocks-wrong-duplicate-or-computed-origin-match", () => {
    const wrongFile = `import { componentRecipe } from "@opsydyn/crumbs-css/style";\nexport const button = componentRecipe({ slots: { root: "view" } });\n`
    expect(planComponentDeclarationEdits({ parsed: parse(wrongFile, "src/other.css.ts"), validated: validated() })).toEqual({ edits: [], diagnostics: [] })

    const source = `import { componentRecipe } from "@opsydyn/crumbs-css/style";\nexport const button = componentRecipe({ slots: { root: "view", label: "text" } });\n`
    const duplicate = planComponentDeclarationEdits({ parsed: parse(source), validated: validated(true) })
    expect(duplicate.diagnostics.map(diagnostic => diagnostic.code)).toContain("component.origin-ambiguous")
    expect(duplicate.edits).toEqual([])

    const computed = `import { componentRecipe } from "@opsydyn/crumbs-css/style";\nconst config = { slots: { root: "view", label: "text" } };\nexport const button = componentRecipe(config);\n`
    const unsupported = planComponentDeclarationEdits({ parsed: parse(computed), validated: validated() })
    expect(unsupported.diagnostics.map(diagnostic => diagnostic.code)).toContain("source.unsupported-syntax")
    expect(unsupported.edits).toEqual([])
  })

  it("blocks-component-import-when-source-binding-maps-to-multiple-recipes", () => {
    const source = `import { extendComponentRecipe } from "@opsydyn/crumbs-css/style";\nimport { button as base } from "../button.css";\nexport const brand = extendComponentRecipe(base, { slotOverrides: { root: { opacity: 0.9 } } });\n`
    const result = planComponentExtensionEdits({ parsed: parse(source, "src/brand.css.ts"), validated: validated(true, true) })
    expect(result.diagnostics.map(diagnostic => diagnostic.code)).toContain("source.ambiguous-binding")
    expect(result.edits).toEqual([])
  })

  it("blocks-unsupported-slot-object-shape-without-partial-edit", () => {
    const source = `import { componentRecipe } from "@opsydyn/crumbs-css/style";\nconst dynamicSlots = { root: "view", label: "text" };\nexport const button = componentRecipe({ slots: { root: "view", ...dynamicSlots }, base: { root: { padding: 8 } } });\n`
    const result = planComponentDeclarationEdits({ parsed: parse(source), validated: validated() })
    expect(result.diagnostics.map(diagnostic => diagnostic.code)).toContain("source.unsupported-syntax")
    expect(result.edits).toEqual([])
  })
})
