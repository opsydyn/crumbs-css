import {describe, expect, it} from "bun:test"
import fc from "fast-check"
import {mkdtempSync, rmSync, writeFileSync} from "node:fs"
import path from "node:path"
import {runInNewContext} from "node:vm"
import {transformCssTsToStyleSheet} from "../src/transformer"
import {createTheme, createThemeContract, getThemeTokenPath, getThemeVarName, isThemeVar, type NativeThemeVar} from "../src/native-style"

describe("legacy native token ownership", () => {
 it("preserves own prototype-like contract leaves", () => {
  const shape: {"__proto__": null} = JSON.parse('{"__proto__": null}')
  const contract = createThemeContract(shape)
  expect(Object.hasOwn(contract, "__proto__")).toBe(true)
  expect(getThemeTokenPath(contract.__proto__)).toEqual(["__proto__"])
  const values: {"__proto__": number} = JSON.parse('{"__proto__": 12}')
  expect(createTheme(contract, values).tokens).toEqual({"--crumbs-__proto__": 12})
 })
 it("checks imported contracts together during compilation and preserves exact-path theme reuse", async () => {
  const root = path.resolve(import.meta.dir, "..")
  const dir = mkdtempSync(path.join(root, "fixtures/.ownership-"))
  const file = path.join(dir, "case.css.ts")
  try {
   writeFileSync(file, `export {first} from './first.css'; export {second} from './second.css';`)
   writeFileSync(path.join(dir, "first.css.ts"), `import {createThemeContract, createTheme} from '@opsydyn/crumbs-css/style'; const vars = createThemeContract({m06Graph: {'left-right': null}}); export const first = createTheme(vars, {m06Graph: {'left-right': 12}});`)
   writeFileSync(path.join(dir, "second.css.ts"), `import {createThemeContract} from '@opsydyn/crumbs-css/style'; export const second = createThemeContract({m06Graph: {left: {right: null}}});`)
   await expect(transformCssTsToStyleSheet(file, root)).rejects.toThrow(/CRUMBS_CSS_THEME_TOKEN_COLLISION/)
   writeFileSync(path.join(dir, "second.css.ts"), `import {createThemeContract, createTheme} from '@opsydyn/crumbs-css/style'; const vars = createThemeContract({m06Graph: {'left-right': null}}); export const second = createTheme(vars, {m06Graph: {'left-right': 24}});`)
   const code = await transformCssTsToStyleSheet(file, root, {useStyleSheet: false})
   const exports: Record<string, unknown> = {}
   runInNewContext(code.replace(/^import .*;$/gm, "").replace(/export const (\w+) =/g, "exports.$1 ="), {exports})
   const first = exports.first as {tokens: Record<string, number>}
   const second = exports.second as {tokens: Record<string, number>}
   expect(first.tokens['--crumbs-m06-graph-left-right']).toBe(12)
   expect(second.tokens['--crumbs-m06-graph-left-right']).toBe(24)
  } finally {rmSync(dir, {recursive: true,force: true})}
 })
 it("rejects cross-contract sanitized collisions without rebinding existing metadata", () => {
  const first = createThemeContract({m06: {"shared-name": null}})
  expect(() => createThemeContract({m06: {shared: {name: null}}})).toThrow(/CRUMBS_CSS_THEME_TOKEN_COLLISION/)
  expect(getThemeTokenPath(first.m06["shared-name"])).toEqual(["m06", "shared-name"])
  expect(createTheme(first, {m06: {"shared-name": 24}}).tokens).toEqual({"--crumbs-m06-shared-name": 24})
 })
 it("allows exact raw-path reuse and independently builds each theme", () => {
  const first = createThemeContract({m06Reuse: {size: null}})
  const second = createThemeContract({m06Reuse: {size: null, extra: null}})
  expect(second.m06Reuse.size).toBe(first.m06Reuse.size)
  expect(createTheme(first, {m06Reuse: {size: 12}}).tokens).toEqual({"--crumbs-m06-reuse-size": 12})
  expect(createTheme(second, {m06Reuse: {size: 24, extra: 3}}).tokens).toEqual({"--crumbs-m06-reuse-size": 24, "--crumbs-m06-reuse-extra": 3})
 })
 it("does not publish any metadata from a rejected contract", () => {
  createThemeContract({m06Atomic: {"occupied-name": null}})
  const unpublished = "var(--crumbs-m06-atomic-draft)" as NativeThemeVar
  expect(() => createThemeContract({m06Atomic: {draft: null, occupied: {name: null}}})).toThrow(/CRUMBS_CSS_THEME_TOKEN_COLLISION/)
  expect(isThemeVar(unpublished)).toBe(false)
  expect(() => getThemeVarName(unpublished)).toThrow(/Unknown native theme token/)
  expect(createThemeContract({m06Atomic: {draft: null}}).m06Atomic.draft).toBe(unpublished)
 })
 it("protects exposed paths and rejects misplaced, unregistered or invalid leaves", () => {
  const contract = createThemeContract({m06Owned: {size: null}})
  const path = getThemeTokenPath(contract.m06Owned.size)
  expect(Object.isFrozen(path)).toBe(true)
  expect(() => (path as string[]).push("corrupt")).toThrow()
  expect(() => createTheme({wrong: contract.m06Owned.size}, {wrong: 3})).toThrow(/CRUMBS_CSS_INVALID_THEME_CONTRACT.*wrong/)
  expect(() => createTheme({unknown: "var(--crumbs-m06-unregistered)" as NativeThemeVar}, {unknown: 3})).toThrow(/CRUMBS_CSS_INVALID_THEME_CONTRACT/)
  expect(() => createTheme({invalid: 3} as unknown as {invalid: NativeThemeVar}, {invalid: 3})).toThrow(/CRUMBS_CSS_INVALID_THEME_CONTRACT/)
 })
 it("independently rejects generated flat/nested path collisions and preserves ownership", () => {
  fc.assert(fc.property(fc.integer({min: 0,max: 100000}), n => {
   const root = `m06Generated${n}`
   const contract = createThemeContract({[root]: {"left-right": null}})
   expect(() => createThemeContract({[root]: {left: {right: null}}})).toThrow(/CRUMBS_CSS_THEME_TOKEN_COLLISION/)
   expect(getThemeTokenPath(contract[root]!["left-right"]!)).toEqual([root, "left-right"])
  }), {seed: 20260921, numRuns: 100})
 })
})
