import { expect, it } from "bun:test"
import { readEmittedGraph } from "../bench/effect-boundary-audit"
import { resolve } from "node:path"
import manifest from "../package.json"
for (const format of ["mjs","cjs"]) {
 it(`isolates the native widget ${format} graph from ordinary runtime and authoring`,()=>{
  expect(Object.hasOwn(manifest.exports, "./devtools/native")).toBe(true)
  const graph=readEmittedGraph(resolve(import.meta.dir,`../dist/devtools-native.${format}`))
  expect(graph.externals).toContain("react-native")
  expect(graph.externals.filter(name=> !/^(react($|\/)|react-native$|effect($|\/))/.test(name))).toEqual([])
  for(const entry of ["theme-core","theme","tokens","devtools"]){
   const ordinary=readEmittedGraph(resolve(import.meta.dir,`../dist/${entry}.${format}`))
   expect(ordinary.files.some(p=>p.includes("devtools-native"))).toBe(false)
   expect(ordinary.externals).not.toContain("react-native")
  }
 })
}
