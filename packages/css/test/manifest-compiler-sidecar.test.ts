import { describe, expect, it } from "bun:test"
import { cpSync, mkdtempSync, rmSync } from "node:fs"
import * as path from "node:path"
import { runInNewContext } from "node:vm"
import { getTokenId } from "../src/tokens"
import { transformCssTsToStyleSheet, transformCssTsToStyleSheetWithManifestSidecar } from "../src/transformer"
import { tokens } from "../fixtures/m9-1-manifest/tokens"

const packageRoot = path.resolve(import.meta.dir, "..")
const fixtureRoot = path.join(packageRoot, "fixtures/m9-1-manifest")
const fixtureFile = path.join(fixtureRoot, "styles.css.ts")
const tokenId = {
  publicSurface: getTokenId(tokens.color.surface),
  privateSurface: getTokenId(tokens.color.privateSurface),
  publicLabel: getTokenId(tokens.color.label),
  publicSmall: getTokenId(tokens.space.publicSmall),
  privateGap: getTokenId(tokens.space.privateGap),
}

describe("compiler manifest sidecars", () => {
  it("projects final composed token edges, admitted capabilities and package-relative origins", async () => {
    const result = await transformCssTsToStyleSheetWithManifestSidecar(fixtureFile, packageRoot, {
      useStyleSheet: false,
      declaredTokenIds: new Set(Object.values(tokenId)),
    })
    const { sidecar } = result
    const moduleId = "@acme/m9-1-manifest-fixture#styles.css.ts"

    expect(sidecar.module).toEqual({
      id: moduleId,
      origin: { path: "styles.css.ts" },
      exports: ["cssOnly", "label", "legacy", "panel"],
    })
    expect(sidecar.dependencies).toContainEqual({
      from: moduleId,
      to: tokenId.privateGap,
      kind: "style-token",
      resolution: "internal",
      origin: { moduleId, exportPath: "panel", property: "paddingTop" },
    })
    expect(sidecar.dependencies).toContainEqual({
      from: moduleId,
      to: tokenId.privateSurface,
      kind: "style-token",
      resolution: "internal",
      origin: { moduleId, exportPath: "panel", property: "backgroundColor" },
    })
    expect(sidecar.dependencies).toContainEqual({
      from: moduleId,
      to: tokenId.publicLabel,
      kind: "style-token",
      resolution: "internal",
      origin: { moduleId, exportPath: "label", property: "color" },
    })
    expect(sidecar.dependencies.some(edge => edge.to === tokenId.publicSmall)).toBe(false)
    expect(sidecar.dependencies.some(edge => edge.to === tokenId.publicSurface)).toBe(false)
    expect(sidecar.dependencies).toContainEqual({
      from: moduleId,
      kind: "style-token",
      resolution: "unresolved",
      origin: { moduleId, exportPath: "legacy", property: "borderTopColor" },
    })
    expect(sidecar.unresolved).toContainEqual(expect.objectContaining({
      reference: "legacy:--crumbs-legacy-missing",
      origin: { moduleId, exportPath: "legacy", property: "borderTopColor" },
    }))

    expect(sidecar.capabilities).toContainEqual({
      moduleId,
      exportPath: "panel",
      property: "backgroundColor",
      primitive: "view",
      evidence: "compiler-observed",
    })
    expect(sidecar.capabilities).toContainEqual({
      moduleId,
      exportPath: "label",
      property: "color",
      primitive: "text",
      evidence: "compiler-observed",
    })
    expect(sidecar.capabilities.some(capability => capability.primitive === "image")).toBe(false)
    expect(sidecar.capabilities.some(capability => capability.exportPath === "cssOnly")).toBe(false)
    expect(sidecar.capabilities.every(capability => capability.evidence === "compiler-observed")).toBe(true)
  })

  it("leaves production JavaScript and __crumbsModule byte-identical", async () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    try {
      const ordinary = await transformCssTsToStyleSheet(fixtureFile, packageRoot, { useStyleSheet: false })
      const captured = await transformCssTsToStyleSheetWithManifestSidecar(fixtureFile, packageRoot, {
        useStyleSheet: false,
        declaredTokenIds: new Set(Object.values(tokenId)),
      })
      expect(captured.code).toBe(ordinary)
      expect(evaluateMetadata(captured.code)).toEqual(evaluateMetadata(ordinary))
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = previous
    }
  })

  it("normalizes source identity and sidecar output across absolute package roots", async () => {
    const roots = [0, 1].map(() => mkdtempSync(path.join(packageRoot, "fixtures/.absolute-root-")))
    try {
      for (const root of roots) {
        for (const name of ["package.json", "tokens.ts", "styles.css.ts"]) {
          cpSync(path.join(fixtureRoot, name), path.join(root, name))
        }
      }
      const sidecars = await Promise.all(roots.map(async root =>
        (await transformCssTsToStyleSheetWithManifestSidecar(path.join(root, "styles.css.ts"), root, {
          useStyleSheet: false,
          declaredTokenIds: new Set(Object.values(tokenId)),
        })).sidecar,
      ))
      expect(sidecars[0]).toEqual(sidecars[1])
      expect(sidecars[0]?.module.origin.path).toBe("styles.css.ts")
      expect(JSON.stringify(sidecars[0])).not.toContain(roots[0]!)
      expect(JSON.stringify(sidecars[0])).not.toContain(roots[1]!)
    } finally {
      roots.forEach(root => rmSync(root, { recursive: true, force: true }))
    }
  })
})

function evaluateMetadata(code: string): unknown {
  const exports: Record<string, unknown> = {}
  const executable = code
    .replace(/^import .*;$/gm, "")
    .replace(/export const ([A-Za-z_$][\w$]*) =/g, "exports.$1 =")
  runInNewContext(executable, { exports })
  return exports.__crumbsModule
}
