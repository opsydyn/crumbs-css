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
    expect(result.externals).toEqual(['react'])
   })
  }
 }
 for (const entry of ['theme', 'theme-core']) {
  it(`can require ${entry} CommonJS runtime while compiler and Node imports are denied`, () => {
   const entryPath = path.join(root, `${entry}.cjs`)
   const script = `const Module = require('node:module'); const original = Module._load; Module._load = function(name, ...args) { if (name !== 'react' && !name.startsWith('./')) throw new Error('Forbidden runtime import: ' + name); if (/style|transformer|metro-plugin/.test(name)) throw new Error('Compiler import: ' + name); return original.call(this,name,...args); }; const api = require(${JSON.stringify(entryPath)}); const value = api.resolveThemeTokens({width:api.createThemeTokenReference('--crumbs-runtime-size')},{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); if (value.width !== 24) throw new Error('Wrong runtime result'); const component = {$$type:'crumbs.css.component-recipe',version:1,slots:{root:'view'},base:{root:{width:api.createThemeTokenReference('--crumbs-runtime-size')}},variants:{},defaultVariants:{},compoundVariants:[]}; const resolvedComponent = api.resolveThemeTokens(component,{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); if (resolvedComponent.base.root.width !== 24) throw new Error('Wrong component runtime result');`
   // Load the entry before denying its absolute path; its transitive imports stay guarded.
   const guarded = script.replace("name !== 'react' && !name.startsWith('./')", `name !== ${JSON.stringify(entryPath)} && name !== 'react' && !name.startsWith('./')`)
   const result = Bun.spawnSync(['node','-e',guarded],{stdout:'pipe',stderr:'pipe'})
   expect({code:result.exitCode,stderr:result.stderr.toString()}).toEqual({code:0,stderr:''})
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
