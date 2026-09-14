import { describe, expect, it } from "bun:test"
import path from "node:path"
import { runInNewContext } from "node:vm"
import { transformCssTsToStyleSheet } from "../src/transformer"
import { isNativeStyleMap } from "../src/native-style-map"

describe("primitive references in generic authoring", () => {
  for (const useStyleSheet of [true, false]) {
    it(`preserves direct/nested references and map identity with StyleSheet=${useStyleSheet}`, async () => {
      const root = path.resolve(import.meta.dir, "..")
      const code = await transformCssTsToStyleSheet(path.join(root, "fixtures/primitive-references.css.ts"), root, { strictDiagnostics: true, useStyleSheet })
      const exports: Record<string, unknown> = {}
      runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {
        exports, StyleSheet: { create: (styles: unknown) => styles },
      })
      expect(exports.views).toEqual({ overflow: "scroll", opacity: 0.5 })
      expect(exports.texts).toEqual({ overflow: "scroll", fontWeight: "400" })
      expect(exports.images).toEqual({ resizeMode: "contain" })
      expect(exports.direct).toEqual({ overflow: "scroll", opacity: 0.5 })
      const variants = exports.variants as Record<string, unknown>
      expect(Object.keys(variants)).toEqual(["view", "text", "image"])
      expect(variants.view).toEqual(exports.direct)
      expect(variants.text).toEqual(exports.texts)
      expect(variants.image).toEqual({ resizeMode: "cover" })
      expect(isNativeStyleMap(variants)).toBe(true)
      expect(exports.genericDirect).toEqual({ opacity: 0.5 })
      expect(exports.genericAgain).toEqual({ opacity: 0.5 })
      expect(exports.genericRepeated).toEqual({ opacity: 0.5 })
      const genericVariants = exports.genericVariants as Record<string, unknown>
      expect(Object.keys(genericVariants)).toEqual(["direct", "again", "array", "override"])
      expect(genericVariants.direct).toEqual({ opacity: 0.5 })
      expect(genericVariants.again).toEqual({ opacity: 0.5 })
      expect(genericVariants.array).toEqual({ opacity: 0.5 })
      expect(genericVariants.override).toEqual({ opacity: 1 })
      expect(isNativeStyleMap(genericVariants)).toBe(true)
    })
  }
})
