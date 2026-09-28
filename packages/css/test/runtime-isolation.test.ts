import {describe, expect, it} from "bun:test"
import {readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync} from "node:fs"
import path from "node:path"
import {builtinModules} from "node:module"
import {tmpdir} from "node:os"
import {pathToFileURL} from "node:url"
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
    expect(result.files.some(file => file.includes("/devtools/") || /\/devtools\.(?:mjs|cjs)$/.test(file))).toBe(false)
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
   const extensionRuntimeAssertions = `const extension = {$$type:'crumbs.css.component-recipe-extension',version:1,identity:{owner:'@acme/brand',name:'RuntimeExtension',version:1},componentIdentity:{owner:'@acme/ui',name:'RuntimeButton',version:1},parentExtensionIdentity:{owner:'@acme/brand',name:'BaseRuntimeExtension',version:1},defaultVariants:{tone:'brand'},variants:{tone:{brand:{root:{width:api.createThemeTokenReference('--crumbs-runtime-size')}}}},compoundVariants:[{variants:{tone:'brand'},styles:{root:{height:api.createThemeTokenReference('--crumbs-runtime-size')}}}],slotOverrides:{root:{padding:api.createThemeTokenReference('--crumbs-runtime-size')}}}; const themedExtension = api.resolveThemeTokens(extension,{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); if (themedExtension.variants.tone.brand.root.width !== 24 || themedExtension.compoundVariants[0].styles.root.height !== 24 || themedExtension.slotOverrides.root.padding !== 24 || themedExtension.parentExtensionIdentity.name !== 'BaseRuntimeExtension') throw new Error('Extension theme runtime failed'); for (const version of [2,9]) { let rejected = false; try { api.resolveThemeTokens({...extension,version},{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); } catch (error) { rejected = /Unsupported component recipe extension version/.test(error.message); } if (!rejected) throw new Error('Unsupported extension version was accepted: ' + version); } let futureComponentRejected = false; try { api.resolveThemeTokens({...legacy,version:4},{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); } catch (error) { futureComponentRejected = /Unsupported component recipe version 4/.test(error.message); } if (!futureComponentRejected) throw new Error('Unsupported future component version was accepted');`
   const script = `const Module = require('node:module'); const original = Module._load; Module._load = function(name, ...args) { if (name !== 'react' && !name.startsWith('./')) throw new Error('Forbidden runtime import: ' + name); if (/effect|vanilla|style|transformer|metro-plugin|compiler|native-capture/.test(name)) throw new Error('Compiler import: ' + name); return original.call(this,name,...args); }; const api = require(${JSON.stringify(entryPath)}); const value = api.resolveThemeTokens({width:api.createThemeTokenReference('--crumbs-runtime-size')},{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); if (value.width !== 24) throw new Error('Wrong runtime result'); const legacy = {$$type:'crumbs.css.component-recipe',version:1,slots:{root:'view'},base:{root:{width:api.createThemeTokenReference('--crumbs-runtime-size')}},variants:{},defaultVariants:{},compoundVariants:[]}; const resolvedLegacy = api.resolveThemeTokens(legacy,{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); if (resolvedLegacy.base.root.width !== 24) throw new Error('Wrong v1 component runtime result'); const stateful = {$$type:'crumbs.css.component-recipe',version:2,slots:{root:'view'},base:{root:{width:api.createThemeTokenReference('--crumbs-runtime-size')}},variants:{status:{ready:{root:{opacity:1}},loading:{root:{opacity:0.7}}},busy:{false:{root:{padding:1}},true:{root:{padding:2}}},tone:{primary:{root:{margin:1}},quiet:{root:{margin:2}}}},defaultVariants:{status:'ready',busy:false,tone:'primary'},stateVariants:{status:{ready:{busy:[false],tone:['primary','quiet']},loading:{busy:[true],tone:['primary']}}},compoundVariants:[]}; const resolvedStatefulComponent = api.resolveThemeTokens(stateful,{contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}); if (resolvedStatefulComponent.version !== 2 || resolvedStatefulComponent.base.root.width !== 24 || JSON.stringify(resolvedStatefulComponent.stateVariants) !== JSON.stringify(stateful.stateVariants)) throw new Error('V2 state metadata was not preserved and token-resolved'); ${statefulRuntimeAssertions} ${extensionRuntimeAssertions}`
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
 for (const entry of ['theme', 'theme-core']) {
  it(`resolves extension theme data from the ${entry} ESM entry while external imports are denied`, () => {
   const tempRoot = mkdtempSync(path.join(tmpdir(), 'crumbs-css-esm-isolation-'))
   try {
    const loaderPath = path.join(tempRoot, 'deny-loader.mjs')
    writeFileSync(loaderPath, `
      const nodeBuiltins = new Set(${JSON.stringify([...builtins])});
      export async function resolve(specifier, context, nextResolve) {
        const bare = !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('file:');
        if (specifier.startsWith('node:') || nodeBuiltins.has(specifier)) throw new Error('Forbidden runtime import: ' + specifier);
        if (bare && specifier !== 'react' && !specifier.startsWith('react/')) throw new Error('Forbidden external import: ' + specifier);
        if (/effect|vanilla-extract|compiler|native-capture/.test(specifier)) throw new Error('Forbidden authoring import: ' + specifier);
        return nextResolve(specifier, context);
      }
    `)
    const entryUrl = pathToFileURL(path.join(root, `${entry}.mjs`)).href
    const script = `const api = await import(${JSON.stringify(entryUrl)}); const ref = api.createThemeTokenReference('--crumbs-runtime-size'); const extension = {$$type:'crumbs.css.component-recipe-extension',version:1,identity:{owner:'@acme/brand',name:'EsmRuntimeExtension',version:1},componentIdentity:{owner:'@acme/ui',name:'EsmRuntimeButton',version:1},defaultVariants:{tone:'brand'},variants:{tone:{brand:{root:{width:ref}}}},compoundVariants:[{variants:{tone:'brand'},styles:{root:{height:ref}}}],slotOverrides:{root:{padding:ref}}}; const theme={contract:{},values:{},tokens:{'--crumbs-runtime-size':24}}; const resolved=api.resolveThemeTokens(extension,theme); if(resolved.variants.tone.brand.root.width!==24||resolved.compoundVariants[0].styles.root.height!==24||resolved.slotOverrides.root.padding!==24) throw new Error('ESM extension theme resolution failed'); let rejected=false; try { api.resolveThemeTokens({...extension,version:2},theme); } catch(error) { rejected=/Unsupported component recipe extension version 2/.test(error.message); } if(!rejected) throw new Error('ESM accepted unsupported extension version');`
    const result = Bun.spawnSync(['node', '--no-warnings', '--experimental-loader', loaderPath, '--input-type=module', '-e', script], {stdout: 'pipe', stderr: 'pipe'})
    expect(result.exitCode).toBe(0)
    if (result.exitCode !== 0) throw new Error(result.stderr.toString())
   } finally {
    rmSync(tempRoot, {recursive: true, force: true})
   }
  })
 }
 it('labels M7.2 compatibility as a fixed fixture admission allow-list, not an older package execution', () => {
  // This fixture records the M7.2 descriptor admission rule; it does not load an older published binary.
  const m72AllowedComponentVersions = [1, 2] as const
  const admitM72Fixture = (version: number) => {
   if (!m72AllowedComponentVersions.some((allowed) => allowed === version)) {
    throw new TypeError(`M7.2 fixture rejects component recipe version ${version}`)
   }
  }
  expect(m72AllowedComponentVersions).toEqual([1, 2])
  expect(() => admitM72Fixture(1)).not.toThrow()
  expect(() => admitM72Fixture(2)).not.toThrow()
  expect(() => admitM72Fixture(3)).toThrow('M7.2 fixture rejects component recipe version 3')
 })
 for (const format of ['mjs', 'cjs']) {
  it(`keeps token contract runtime free of authoring modules in ${format}`, () => {
   const result = graph(`tokens.${format}`)
  expect(result.externals.filter(name => builtins.has(name.replace(/^node:/,'')) || name.startsWith('@vanilla-extract/') || name === 'css-to-react-native' || name === 'effect' || name.startsWith('effect/'))).toEqual([])
  expect(result.files.filter(file => /\/(?:native-style|native-capture|style|index|transformer|metro-plugin)(?:[-.]|\.(?:mjs|cjs)$)/.test(file))).toEqual([])
  expect(result.files.some(file => file.includes("/devtools/") || /\/devtools\.(?:mjs|cjs)$/.test(file))).toBe(false)
 })
}
for (const format of ['mjs', 'cjs']) {
 it(`limits the isolated devtools ${format} graph to Effect Schema and React`, () => {
  const result = graph(`devtools.${format}`)
  expect(result.externals).toContain('effect/Schema')
  expect(result.externals.filter(name => !(name === 'react' || name.startsWith('react/') || name === 'effect' || name.startsWith('effect/')))).toEqual([])
  expect(result.files.some(file => /\/devtools\.(?:mjs|cjs)$/.test(file))).toBe(true)
  expect(result.externals.filter(name => builtins.has(name.replace(/^node:/,'')) || name.startsWith('@vanilla-extract/') || name === 'css-to-react-native' || name === 'metro' || name.startsWith('metro/'))).toEqual([])
 })
}
for (const entry of ['index', 'style', 'theme', 'theme-core', 'tokens', 'tokens-optic', 'tooling-manifest']) {
 for (const format of ['mjs', 'cjs']) {
  it(`keeps ${entry} ${format} outside the devtools and Effect Schema graph`, () => {
   const result = graph(`${entry}.${format}`)
   expect(result.files.some(file => file.includes('/devtools/') || /\/devtools\.(?:mjs|cjs)$/.test(file))).toBe(false)
   expect(result.files.some(file => file.includes('/tooling/policy/') || /\/tooling-policy\.(?:mjs|cjs)$/.test(file))).toBe(false)
   expect(result.externals).not.toContain('effect/Schema')
  })
 }
}
})
