import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { createEditorFixture, inspectEditorFixture, parseExtendedDiagnostics } from "../../../scripts/editor-scale"
const root=resolve(import.meta.dir,"../fixtures/editor-scale")
describe("editor scale fixtures",()=>{
 it("keeps dedicated scale fixtures out of routine package typechecking",()=>{
  const config=JSON.parse(readFileSync(resolve(import.meta.dir,"../tsconfig.json"),"utf8"))
  expect(config.exclude).toContain("fixtures/editor-scale/**/*")
 })
 for(const count of [100,1000,10000] as const)it(`keeps the ${count}-token fixture deterministic and exact`,()=>{
  const file=resolve(root,String(count),"index.css.ts")
  const completion=resolve(root,String(count),"completion.ts")
  expect(readFileSync(file,"utf8")).toBe(createEditorFixture(count).source)
  expect(readFileSync(completion,"utf8")).toBe(createEditorFixture(count).completionSource)
  expect(JSON.parse(readFileSync(resolve(root,String(count),"tsconfig.json"),"utf8"))).toMatchObject({files:["index.css.ts"],include:[]})
  expect(inspectEditorFixture(file)).toMatchObject({tokenCount:count,recipeCount:1,conditionApi:"unsupported",slotRecipeApi:"unsupported"})
 })
 it("rejects unsupported scale requests",()=>{
  for(const value of [0,99,101,999,1001,9999,10001,1.5])expect(()=>createEditorFixture(value)).toThrow()
 })
 it("parses named compiler diagnostics without inventing absent metrics",()=>{
  expect(parseExtendedDiagnostics("Files: 42\nTypes: 1234\nInstantiations: 5678\nMemory used: 90123K\nCheck time: 1.25s\nTotal time: 1.75s\n")).toEqual({files:42,types:1234,instantiations:5678,memoryKiB:90123,checkTimeMs:1250,totalTimeMs:1750})
  expect(parseExtendedDiagnostics("Files: 42\nTotal time: 2.5s\n")).toEqual({files:42,types:null,instantiations:null,memoryKiB:null,checkTimeMs:null,totalTimeMs:2500})
  expect(()=>parseExtendedDiagnostics("unrelated output")).toThrow()
 })
})
