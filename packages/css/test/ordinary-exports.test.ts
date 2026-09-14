import {describe, expect, it} from "bun:test"
import {mkdtempSync, rmSync, writeFileSync} from "node:fs"
import path from "node:path"
import {runInNewContext} from "node:vm"
import {buildStyleSheetCode, transformCssTsToStyleSheet} from "../src/transformer"
import {captureNativeExports} from "../src/export-values"
import fc from "fast-check"
const root = path.resolve(import.meta.dir, "..")
async function compile(source: string) {
 const dir = mkdtempSync(path.join(root, "fixtures/.ordinary-exports-"))
 try {
  const file = path.join(dir, "case.css.ts")
  writeFileSync(file, `import {viewStyle, styleVariants, recipe} from '@opsydyn/crumbs-css/style';\n${source}`)
  const code = await transformCssTsToStyleSheet(file, root, {useStyleSheet: false})
  const exports: Record<string, unknown> = Object.create(null)
  runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {exports})
  return exports
 } finally {rmSync(dir, {recursive: true,force: true})}
}
describe("ordinary CSS module exports", () => {
 it("preserves named primitive values, undefined fields and negative zero", async () => {
  const result = await compile(`export const label = 'Hello'; export const empty = ''; export const flag = false; export const zero = -0; export const missing = undefined; export const data = {nested: [undefined, null, -0, 3], missing: undefined};`)
  expect(result.label).toBe("Hello")
  expect(result.empty).toBe("")
  expect(result.flag).toBe(false)
  expect(Object.is(result.zero, -0)).toBe(true)
  expect(Object.hasOwn(result, "missing")).toBe(true)
  const data = result.data as {nested: unknown[], missing: unknown}
  expect(Object.hasOwn(data, "missing")).toBe(true)
  expect(data.nested[0]).toBeUndefined()
  expect(data.nested[1]).toBeNull()
  expect(Object.is(data.nested[2], -0)).toBe(true)
 })
 it("preserves tag-shaped ordinary data and own prototype-like keys alongside real metadata", async () => {
  const result = await compile(`
   export const data = {$$type: 'crumbs.css.class', className: 'ordinary'};
   export const mapData = {$$type: 'crumbs.css.style-map', styles: {normal: 'ordinary'}};
   export const keys = JSON.parse('{"__proto__":{"safe":true},"constructor":"value"}');
   export const panel = viewStyle({opacity: .5});
   export const variants = styleVariants({active: {opacity: 1}});
   export const button = recipe({base: {opacity: .5}, variants: {size: {large: {opacity: 1}}}});
  `)
  expect(JSON.parse(JSON.stringify(result.data))).toEqual({$$type: 'crumbs.css.class', className: 'ordinary'})
  expect(JSON.parse(JSON.stringify(result.mapData))).toEqual({$$type: 'crumbs.css.style-map', styles: {normal: 'ordinary'}})
  expect(Object.hasOwn(result.keys as object, "__proto__")).toBe(true)
  expect(JSON.parse(JSON.stringify(result.panel))).toEqual({opacity: .5})
  const variants = result.variants as Record<string|symbol, unknown>
  expect(variants[Symbol.for('crumbs.css.style-map')]).toBe(true)
  expect(JSON.parse(JSON.stringify(result.button))).toEqual({$$type: 'crumbs.css.recipe', base: {opacity:.5}, compoundVariants: [], defaultVariants: {}, variants: {size: {large: {opacity: 1}}}})
 })
 it("preserves null-prototype data and leaves unrelated class-like text unchanged", async () => {
  const result = await compile(`export const data = Object.assign(Object.create(null), {value: 3}); export const label = 'prefix ordinary class-like text suffix'; export const __proto__ = {safe: true};`)
  expect(Object.getPrototypeOf(result.data)).toBeNull()
  expect((result.data as Record<string, unknown>).value).toBe(3)
  expect(result.label).toBe('prefix ordinary class-like text suffix')
  expect(Object.hasOwn(result, "__proto__")).toBe(true)
 })
 it("rejects unsupported values before lossy serialization with file/export path diagnostics", async () => {
  for (const expression of [`() => 3`, `new Date()`, `new Map()`, `new Set()`, `Promise.resolve(3)`, `1n`, `Symbol('x')`, `NaN`, `Infinity`, `Array(2)`, `new (class Item {x = 3})()`, `Object.create({x: 3})`, `{get field() {throw new Error('EXECUTED')}}`, `(() => {const x: Record<string, unknown> = {}; x.self = x; return x})()`, `new (class Items extends Array {})()`, `Object.defineProperty({}, Symbol.for('crumbs.css.style-map'), {get() {throw new Error('EXECUTED')}})`, `Object.assign({}, {[Symbol.for('crumbs.css.style-map')]: false})`]) {
   await expect(compile(`export const data = {nested: ${expression}};`)).rejects.toThrow(/CRUMBS_CSS_UNSUPPORTED_EXPORT.*case\.css\.ts.*data/)
  }
  await expect(compile(`export default {x: 3};`)).rejects.toThrow(/CRUMBS_CSS_UNSUPPORTED_EXPORT.*default/)
  await expect(compile(`const value = 3; export {value as class};`)).rejects.toThrow(/CRUMBS_CSS_UNSUPPORTED_EXPORT.*class/)
 })
 it("cleans composition handles without rewriting ordinary strings", () => {
  const captured = captureNativeExports({label: 'prefix unused base suffix', panel: 'unused base'}, 'case.css.ts', new Set(['unused base']), /unused\s/g)
  const code = buildStyleSheetCode(new Map(Object.entries(captured)), new Map([['base', {opacity: .5}]]), [], {useStyleSheet: false})
  const exports: Record<string, unknown> = {}
  runInNewContext(code.replace(/export const (\w+) =/g, 'exports.$1 ='), {exports})
  expect(exports.label).toBe('prefix unused base suffix')
  expect(JSON.parse(JSON.stringify(exports.panel))).toEqual({opacity: .5})
 })
 it("matches generated nested ordinary data independently of style exports", async () => {
  await fc.assert(fc.asyncProperty(fc.jsonValue(), async value => {
   const result = await compile(`export const data = ${JSON.stringify(value)}; export const panel = viewStyle({opacity: .5});`)
   expect(JSON.parse(JSON.stringify(result.data))).toEqual(value)
  }), {seed: 20260920, numRuns: 100})
 })
})
