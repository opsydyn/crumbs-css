import {expect,it} from "bun:test"
import {resolve} from "node:path"
import {runInNewContext} from "node:vm"
import {transformCssTsToStyleSheet} from "../src/transformer"
import {explainInspectorInput} from "../src/devtools/native/capture"
it("explains scoped tokens, override winners and recipe selections from real compiled bindings",async()=>{
 const compiled=await transformCssTsToStyleSheet(resolve(import.meta.dir,"../fixtures/m9-3a-devtools.css.ts"),resolve(import.meta.dir,".."),{dev:true,useStyleSheet:false})
 const exports:Record<string,unknown>={}
 runInNewContext(compiled.replace(/^import .*;$/gmu,"").replace(/export const (\w+) =/gu,"exports.$1 ="),{exports,StyleSheet:{create:(s:unknown)=>s}})
 const data=structuredClone(exports),namespace:Record<string,unknown>={}
 for(const [key,value] of Object.entries(data)) Object.defineProperty(namespace,key,{enumerable:true,get:()=>value})
 // Metro uses accessor bindings. Consumers explicitly snapshot their trusted namespace;
 // the headless API must continue rejecting arbitrary accessor input.
 expect(()=>explainInspectorInput({module:namespace,exportPath:["card"],current:{}})).toThrow()
 const module={...namespace},theme=(color:string)=>({contract:{},values:{},tokens:{"--crumbs-color-panel":color}})
 for(const color of ["#ffffff","#243149"]){
  const report=explainInspectorInput({module,exportPath:["card"],current:{theme:theme(color)}})
  expect(report.coverage.status).toBe("complete")
  const opacity=report.composition.properties.find(p=>p.property==="opacity")!
  expect(opacity.value).toBe(0.8);expect(opacity.overridden.map(d=>d.value)).toEqual([0.4])
  expect(report.composition.properties.find(p=>p.property==="backgroundColor")?.value).toMatchObject({kind:"theme-token",resolvedValue:color})
 }
 for(const [selected,opacity] of [[false,0.5],[true,1]] as const){
  const report=explainInspectorInput({module,exportPath:["choice"],current:{selection:{selected}}})
  expect(report.resolution.value).toMatchObject({opacity})
  expect(report.resolution.branches.some(b=>b.selected)).toBe(true)
 }
})
