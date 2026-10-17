import { describe, expect, it } from "bun:test"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import * as path from "node:path"
import { runInNewContext } from "node:vm"
import fc from "fast-check"
import { transformCssTsToStyleSheet } from "../src/transformer"

const root = path.resolve(import.meta.dir, "..")
type CompiledStyle = Record<string, unknown>
type FixtureExports = Record<"panel" | "label" | "image" | "legacy" | "replaced" | "cssWinner" | "nativeWinner", CompiledStyle> & {
  variants: Record<string, CompiledStyle>
  button: {
    base: CompiledStyle
    variants: Record<string, Record<string, CompiledStyle>>
    compoundVariants: Array<{style: CompiledStyle}>
  }
}
async function compile(source: string, useStyleSheet = false, files: Record<string, string> = {}) {
  const dir = mkdtempSync(path.join(root, "fixtures/.structured-compiler-"))
  try {
    const file = path.join(dir, "case.css.ts")
    for (const [name, contents] of Object.entries(files)) writeFileSync(path.join(dir, name), contents)
    writeFileSync(file, `import { style, viewStyle, textStyle, imageStyle, styleVariants, recipe } from '@opsydyn/crumbs-css/style';\n${source}`)
    const code = await transformCssTsToStyleSheet(file, root, { useStyleSheet, strictDiagnostics: false })
    const exports: Record<string, unknown> = {}
    runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), { exports, StyleSheet: { create: (styles: unknown) => styles } })
    return JSON.parse(JSON.stringify(exports)) as FixtureExports
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

describe("structured native compilation", () => {
  it("rejects unqualified variable-font axes instead of silently dropping them", async () => {
    await expect(compile(`export const label = textStyle({fontVariationSettings:{wght:650}} as any);`)).rejects.toThrow("fontVariationSettings")
  })
  it("preserves structured values from imported bases and every supported operation", async () => {
    const transforms = [{perspective: 800}, {rotateX: "1rad"}, {rotateY: "-2deg"}, {rotateZ: ".5rad"}, {scaleX: 2}, {scaleY: 3}, {skewX: "10deg"}, {skewY: "-.5rad"}, {translateY: -4}]
    const result = await compile(`import {base} from './base.css'; export const panel = viewStyle([base, {opacity: 1}]);`, false, {
      "base.css.ts": `import {viewStyle} from '@opsydyn/crumbs-css/style'; export const base = viewStyle({transform: ${JSON.stringify(transforms)}, shadowOffset: {width: 2, height: 3}, opacity: .5});`,
    })
    expect(result.panel).toEqual({transform: transforms, shadowOffset: {width: 2, height: 3}, opacity: 1})
  })
  it("preserves static transforms, offsets and scalar siblings in both emission modes", async () => {
    const rule = {
      opacity: 0.5,
      transform: [{ translateX: 4 }, { scale: 2 }, { rotate: "45deg" }, { translateY: "10%" }],
      shadowOffset: { width: 2, height: -3 },
      boxShadow: [{ offsetX: 2, offsetY: "10%", color: "black", blurRadius: 4, spreadDistance: -1, inset: true }],
      filter: [{ brightness: "50%" }, { blur: "2px" }, { dropShadow: { offsetX: -1, offsetY: "3px", standardDeviation: 2, color: "black" } }],
    }
    for (const mode of [false, true]) {
      const result = await compile(`export const panel = viewStyle(${JSON.stringify(rule)});`, mode)
      expect(result.panel).toEqual(rule)
    }
  })
  it("routes unmarked vanilla-extract static values through the compatibility IR", async () => {
    const result = await compile(`
      import { style as vanillaStyle } from '@vanilla-extract/css'
      export const legacy = vanillaStyle({
        opacity: 0.5,
        fontSize: '24px',
        transform: [{ scale: 2 }],
        shadowOffset: { width: 1, height: -2 },
        padding: '1px 2px',
      })
    `)
    expect(result.legacy).toEqual({
      opacity: 0.5,
      fontSize: 24,
      transform: [{ scale: 2 }],
      shadowOffset: { width: 1, height: -2 },
      paddingTop: 1,
      paddingRight: 2,
      paddingBottom: 1,
      paddingLeft: 2,
    })
  })
  it("replaces structured values as whole values through nested and repeated bases", async () => {
    const result = await compile(`
      const a = viewStyle({ transform: [{scale: 2}], shadowOffset: {width: 1, height: 2}, opacity: .5 });
      const b = viewStyle({ transform: [{translateX: 4}], shadowOffset: {width: 3, height: 4} });
      export const replaced = viewStyle([a, [b, a], {transform: []}]);
      export const cssWinner = viewStyle([a, {transform: 'scale(3)'}]);
      export const nativeWinner = viewStyle([{transform: 'scale(3)'}, a]);
    `)
    expect(result.replaced).toEqual({ transform: [], shadowOffset: {width: 1, height: 2}, opacity: .5 })
    expect(result.cssWinner.transform).toEqual([{ scale: 3 }])
    expect(result.nativeWinner.transform).toEqual([{ scale: 2 }])
  })
  it("captures primitive helpers, variant maps, recipe base, variants and compounds", async () => {
    const result = await compile(`
      export const label = textStyle({textShadowOffset: {width: 2, height: 3}, fontVariant: ['small-caps', 'tabular-nums'], color: 'red'});
      export const image = imageStyle({transform: [{rotateZ: '1rad'}], transformOrigin: [10, '50%', 0], transformMatrix: [1,0,0,0,0,1,0,0,0,0,1,0,2,3,0,1], resizeMode: 'contain'});
      export const variants = styleVariants({active: {transform: [{scaleX: 2}]}});
      export const button = recipe({base: {shadowOffset: {width: 1, height: 2}}, variants: {size: {large: {transform: [{scale: 2}]}}}, compoundVariants: [{variants: {size: 'large'}, style: {shadowOffset: {width: 3, height: 4}}}]});
    `)
    expect(result.label).toEqual({textShadowOffset: {width: 2, height: 3}, fontVariant: ['small-caps', 'tabular-nums'], color: 'red'})
    expect(result.image).toEqual({transform: [{rotateZ: '1rad'}], transformOrigin: [10, '50%', 0], transformMatrix: [1,0,0,0,0,1,0,0,0,0,1,0,2,3,0,1], resizeMode: 'contain'})
    expect(result.variants.active).toEqual({transform: [{scaleX: 2}]})
    expect(result.button.base.shadowOffset).toEqual({width: 1, height: 2})
    expect(result.button.variants.size?.large?.transform).toEqual([{scale: 2}])
    expect(result.button.compoundVariants[0]?.style.shadowOffset).toEqual({width: 3, height: 4})
  })
  it("preserves matrix values and rejects malformed or dynamic structured values even without strict mode", async () => {
    const matrix = [1,0,0,0,0,1,0,0,0,0,1,0,2,3,0,1]
    expect((await compile(`export const panel = viewStyle({transform: [{matrix: ${JSON.stringify(matrix)}}]});`)).panel.transform).toEqual([{matrix}])
    for (const rule of [
      `{transform: [{scale: 2, rotate: '1rad'}]}`, `{transform: [{unknown: 2}]}`, `{transform: [{scale: NaN}]}`,
      `{transform: [{rotate: '20px'}]}`, `{transform: [{matrix: [1,2]}]}`, `{shadowOffset: {width: 2}}`,
      `{textShadowOffset: {width: 2, height: 3}}`,
      `{transformOrigin: [1, 2, 3, 4]}`, `{transformMatrix: [1, 2]}`, `{fontVariant: ['unsupported']}`,
      `{fontVariant: ['small-caps']}`,
      `{shadowOffset: {width: 'var(--crumbs-x)', height: 2}}`, `{transform: [{scale: {__getValue() {throw new Error('EXECUTED')}}}]}`,
      `{filter: [{brightness: -1}]}`, `{filter: [{blur: "2%"}]}`, `{filter: [{dropShadow: "0 1px 2px black"}]}`, `{boxShadow: [{offsetX: 2}]}`,
      `{transform: Array(2)}`, `{transform: [{matrix: Array(16)}]}`,
    ]) {
      await expect(compile(`export const invalid = viewStyle(${rule});`)).rejects.toThrow(/CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE.*case\.css\.ts.*runtime style/)
    }
    await expect(compile(`export const invalid = viewStyle({opacity: {__getValue() {throw new Error('EXECUTED')}}} as any);`))
      .rejects.toThrow(/CRUMBS_IR_INVALID_VALUE.*case\.css\.ts.*not sent to the CSS fallback/)
  })
  it("matches independent ordered whole-value replacement for generated compositions", async () => {
    const rule = fc.record({ opacity: fc.integer({min: 0, max: 1}), transform: fc.array(fc.integer({min: -20, max: 20}).map(translateX => ({translateX})), {maxLength: 4}), shadowOffset: fc.record({width: fc.integer({min: -10,max: 10}), height: fc.integer({min: -10,max: 10})}) })
    await fc.assert(fc.asyncProperty(fc.array(rule, {minLength: 1,maxLength: 5}), async rules => {
      const result = await compile(`export const panel = viewStyle(${JSON.stringify(rules)});`)
      expect(result.panel).toEqual(Object.assign({}, ...rules))
    }), {seed: 20260918, numRuns: 100})
  })
})
