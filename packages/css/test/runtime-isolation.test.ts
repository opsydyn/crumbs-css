import {describe, expect, it} from "bun:test"
import {readFileSync, existsSync} from "node:fs"
import path from "node:path"
import {builtinModules} from "node:module"
const root = path.resolve(import.meta.dir, "../dist")
const builtins = new Set(builtinModules.map(name => name.replace(/^node:/, "")))
function graph(entry: string): {files: string[], externals: string[]} {
 const visited = new Set<string>(), externals = new Set<string>()
 function visit(file: string) {
  if (visited.has(file)) return
  if (!existsSync(file)) throw new Error(`Missing emitted graph dependency: ${file}`)
  visited.add(file)
  const source = readFileSync(file,"utf8")
  const imports = source.matchAll(/(?:\bfrom\s*|\bimport\s*|\brequire\s*\(\s*|\bimport\s*\(\s*)["']([^"']+)["']/g)
  for (const match of imports) {
   const name = match[1]!
   if (name.startsWith('.')) visit(path.resolve(path.dirname(file),name))
   else externals.add(name)
  }
 }
 visit(path.join(root,entry))
 return {files: [...visited],externals: [...externals]}
}
describe("public runtime dependency isolation", () => {
 for (const entry of ['theme', 'theme-core']) {
  for (const format of ['mjs','cjs']) {
   it(`loads only React and pure package data in ${entry} ${format}`, () => {
    const result = graph(`${entry}.${format}`)
    expect(result.externals.filter(name => builtins.has(name.replace(/^node:/,'')) || name !== 'react')).toEqual([])
    expect(result.files.filter(file => /\/(?:style|index|transformer|metro-plugin)\.(?:mjs|cjs)$/.test(file))).toEqual([])
    expect(result.files.filter(file => /\/(?:native-style|native-capture|compiler)(?:[-.]|\/)/.test(file))).toEqual([])
    expect(result.externals).toEqual(['react'])
   })
  }
 }
 for (const entry of ['theme', 'theme-core']) {
  it(`can require ${entry} CommonJS runtime while compiler and Node imports are denied`, () => {
   const entryPath = path.join(root, `${entry}.cjs`)
   const statefulRuntimeAssertions = entry === 'theme'
    ? `const resolveComponent = api.createComponentRecipeResolver(resolvedStatefulComponent); const valid = resolveComponent({status:'loading',busy:true,tone:'primary'}); if (!valid.root.some(style => style.opacity === 0.7) || !valid.root.some(style => style.padding === 2) || !valid.root.some(style => style.margin === 1)) throw new Error('Valid v2 state did not resolve'); const prohibited = resolveComponent({status:'loading',busy:false,tone:'quiet'}); if (JSON.stringify(prohibited.root) !== JSON.stringify([{width:24}])) throw new Error('Prohibited v2 state did not fall back to base styles');`
    : ''
   const script = `const Module = require('node:module'); const original = Module._load; Module._load = function(name, ...args) { if (name !== 'react' && !name.startsWith('./')) throw new Error('Forbidden runtime import: ' + name); if (/effect|vanilla|style|transformer|metro-plugin|compiler|native-capture/.test(name)) throw new Error('Compiler import: ' + name); return original.call(this,name,...args); }; const api = require(${JSON.stringify(entryPath)}); const value = api.resolveThemeTokens({width:api.createThemeTokenReference('--crumbs-runtime-size')},{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); if (value.width !== 24) throw new Error('Wrong runtime result'); const legacy = {$$type:'crumbs.css.component-recipe',version:1,slots:{root:'view'},base:{root:{width:api.createThemeTokenReference('--crumbs-runtime-size')}},variants:{},defaultVariants:{},compoundVariants:[]}; const resolvedLegacy = api.resolveThemeTokens(legacy,{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); if (resolvedLegacy.base.root.width !== 24) throw new Error('Wrong v1 component runtime result'); const stateful = {$$type:'crumbs.css.component-recipe',version:2,slots:{root:'view'},base:{root:{width:api.createThemeTokenReference('--crumbs-runtime-size')}},variants:{status:{ready:{root:{opacity:1}},loading:{root:{opacity:0.7}}},busy:{false:{root:{padding:1}},true:{root:{padding:2}}},tone:{primary:{root:{margin:1}},quiet:{root:{margin:2}}}},defaultVariants:{status:'ready',busy:false,tone:'primary'},stateVariants:{status:{ready:{busy:[false],tone:['primary','quiet']},loading:{busy:[true],tone:['primary']}}},compoundVariants:[]}; const resolvedStatefulComponent = api.resolveThemeTokens(stateful,{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); if (resolvedStatefulComponent.version !== 2 || resolvedStatefulComponent.base.root.width !== 24 || JSON.stringify(resolvedStatefulComponent.stateVariants) !== JSON.stringify(stateful.stateVariants)) throw new Error('V2 state metadata was not preserved and token-resolved'); ${statefulRuntimeAssertions}`
   // Load the entry before denying its absolute path; its transitive imports stay guarded.
   const guarded = script.replace("name !== 'react' && !name.startsWith('./')", `name !== ${JSON.stringify(entryPath)} && name !== 'react' && !name.startsWith('./')`)
   const result = Bun.spawnSync(['node','-e',guarded],{stdout:'pipe',stderr:'pipe'})
   expect(result.exitCode).toBe(0)
   if (entry === 'theme') {
    expect(result.stderr.toString()).toContain('state "status" rejects normalized selection')
   } else {
    expect(result.stderr.toString()).toBe('')
   }
  })
 }
 for (const format of ['mjs', 'cjs']) {
  it(`keeps token contract runtime free of authoring modules in ${format}`, () => {
   const result = graph(`tokens.${format}`)
   expect(result.externals.filter(name => builtins.has(name.replace(/^node:/,'')) || name.startsWith('@vanilla-extract/') || name === 'css-to-react-native' || name === 'effect')).toEqual([])
   expect(result.files.filter(file => /\/(?:native-style|native-capture|style|index|transformer|metro-plugin)(?:[-.]|\.(?:mjs|cjs)$)/.test(file))).toEqual([])
  })
 }
})
