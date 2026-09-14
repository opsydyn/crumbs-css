import {describe, expect, it} from "bun:test"
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from "node:fs"
import path from "node:path"
import {tmpdir} from "node:os"
import {assertRuntimeBundleSources, verifyRuntimeBundles} from "../../../scripts/runtime-bundle-contract"
describe('Metro runtime bundle source contract', () => {
 it('rejects compiler sources and accepts the emitted runtime in both modes', () => {
  expect(assertRuntimeBundleSources(['/app/node_modules/@opsydyn/crumbs-css/dist/theme.cjs','/app/node_modules/react/index.js'])).toBe(1)
  expect(assertRuntimeBundleSources(['/repo/packages/css/dist/theme.mjs'])).toBe(1)
  for (const name of ['style.cjs','index.mjs','transformer.cjs','metro-plugin.cjs']) expect(() => assertRuntimeBundleSources([`/app/node_modules/@opsydyn/crumbs-css/dist/${name}`])).toThrow(/Non-runtime Crumbs/)
  for (const name of ['@vanilla-extract/css','@vanilla-extract/integration','css-to-react-native','esbuild']) expect(() => assertRuntimeBundleSources([`/app/node_modules/${name}/index.js`])).toThrow(/Compiler dependency/)
 })
 it('fails absent or incomplete retained maps and accepts indexed source maps', async () => {
  const dir = mkdtempSync(path.join(tmpdir(),'crumbs-runtime-maps-'))
  try {
   await expect(verifyRuntimeBundles(dir)).rejects.toThrow(/source maps/)
   for (const platform of ['ios','android','web']) {
    mkdirSync(path.join(dir,platform))
    writeFileSync(path.join(dir,platform,'index.js.map'),JSON.stringify({sections:[{map:{sources:['/app/node_modules/@opsydyn/crumbs-css/dist/theme.mjs']}}]}))
   }
   expect((await verifyRuntimeBundles(dir)).length).toBe(3)
   rmSync(path.join(dir,'android'),{recursive:true})
   rmSync(path.join(dir,'web'),{recursive:true})
   for (const name of ['extra1','extra2']) writeFileSync(path.join(dir,'ios',`${name}.js.map`),JSON.stringify({sources:['/app/node_modules/@opsydyn/crumbs-css/dist/theme.mjs']}))
   await expect(verifyRuntimeBundles(dir)).rejects.toThrow(/source maps/)
   writeFileSync(path.join(dir,'ios','index.js.map'),JSON.stringify({sources:['/app/node_modules/@opsydyn/crumbs-css/dist/style.cjs']}))
   await expect(verifyRuntimeBundles(dir)).rejects.toThrow(/Non-runtime Crumbs/)
  } finally {rmSync(dir,{recursive:true,force:true})}
 })
})
