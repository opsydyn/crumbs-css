import { expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
const host = resolve(import.meta.dir,"../m9-3a-native-cost-host.py")
test("temporary native instrumentation restores exact bytes and refuses concurrent edits",()=>{
 const root=mkdtempSync(join(tmpdir(),"crumbs-cost-host-test-")), out=join(root,"backup")
 const capture="packages/css/src/devtools/native/capture.ts"
 const originals:Record<string,string>={
  [capture]:"export const explainInspectorInput = (input: CrumbsInspectorInput) => explainStyle(input)\n",
  "apps/playground/index.js":"original playground\n",
  "apps/storybook/index.js":"original storybook\n",
  "scripts/fixtures/m9-3a-native-cost.tsx":"test-only screen\n",
 }
 const run=(command:string)=>Bun.spawnSync(["python3",host,command,"--root",root,"--out",out],{stdout:"pipe",stderr:"pipe"})
 try {
  for(const [p,s] of Object.entries(originals)){mkdirSync(join(root,p,".."),{recursive:true});writeFileSync(join(root,p),s)}
  expect(run("stage").exitCode).toBe(0)
  const staged=readFileSync(join(root,capture),"utf8")
  expect(staged).toContain("__crumbsNativeCostObserver")
  writeFileSync(join(root,capture),staged+"// concurrent edit\n")
  expect(run("restore").exitCode).not.toBe(0)
  expect(readFileSync(join(root,capture),"utf8")).toContain("concurrent edit")
  writeFileSync(join(root,capture),staged)
  expect(run("restore").exitCode).toBe(0)
  for(const [p,s] of Object.entries(originals))expect(readFileSync(join(root,p),"utf8")).toBe(s)
 } finally {rmSync(root,{recursive:true,force:true})}
})
