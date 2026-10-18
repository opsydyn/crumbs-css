import { expect, it } from "bun:test"
import { resolve } from "node:path"
import { runInNewContext } from "node:vm"
import { transformCssTsToStyleSheet } from "@opsydyn/crumbs-css/dist/transformer"
import { explainStyle } from "@opsydyn/crumbs-css/devtools"
it("keeps the independent dogfood opacity cause deterministic", async () => {
 const code = await transformCssTsToStyleSheet(resolve(import.meta.dir,"../src/components/devtools/DevtoolsFixture.css.ts"),resolve(import.meta.dir,".."),{dev:true,useStyleSheet:false})
 const exports:Record<string,unknown>={}
 runInNewContext(code.replace(/^import .*;$/gmu,"").replace(/export const (\w+) =/gu,"exports.$1 ="),{exports,StyleSheet:{create:(s:unknown)=>s}})
 const report=explainStyle({module:structuredClone(exports),exportPath:["override"],current:{}})
 expect(report.resolution.value).toMatchObject({opacity:0.8,paddingTop:16})
 expect(report.composition.properties.find(p=>p.property==="opacity")?.overridden.map(d=>d.value)).toEqual([0.4])
})
