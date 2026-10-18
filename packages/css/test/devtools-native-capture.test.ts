import { expect, it } from "bun:test"
import { prepareInspectorCopy } from "../src/devtools/native/capture"
import { explainStyle } from "../src/devtools/explain-style"
import type { CrumbsDevtoolsCapture, CrumbsInspectorTargetId } from "../src/devtools/native/model"
const capture: CrumbsDevtoolsCapture = { type: "crumbs.devtools.capture", version: 1, target: { instanceId: "one" as CrumbsInspectorTargetId, label: "Card" }, revision: 1, report: explainStyle({ module: { card: { opacity: 0.8 } }, exportPath: ["card"], current: {} }) }
it("serializes the exact capture without module or theme objects", () => {
 const result = prepareInspectorCopy(capture)
 expect(result.ok).toBe(true)
 if(result.ok) { expect(JSON.parse(result.text)).toEqual(capture); expect(result.byteLength).toBe(new TextEncoder().encode(result.text).length) }
})
it("counts UTF-8 bytes and refuses oversized copies without truncation", () => {
 const exact = prepareInspectorCopy(capture, () => "x".repeat(262142)); expect(exact.ok).toBe(true)
 const tooLarge = prepareInspectorCopy(capture, () => "x".repeat(262143)); expect(tooLarge).toEqual({ok:false,code:"too-large"})
 expect(prepareInspectorCopy(capture, () => "😀".repeat(65536))).toEqual({ok:false,code:"too-large"})
})
it("rejects hostile non-JSON shapes without invoking accessors or toJSON", () => {
 let calls = 0
 const cycle: Record<string,unknown> = {}; cycle.self=cycle
 const accessor = Object.defineProperty({}, "secret", { enumerable:true, get(){calls++; return "secret"} })
 const toJSON = { toJSON(){ calls++; return {} } }
 for(const value of [cycle, accessor, toJSON, NaN, Infinity, undefined, ()=>0, Symbol(), 1n, new Date(), {[Symbol()]:1}]) expect(prepareInspectorCopy(capture, () => value)).toEqual({ok:false,code:"non-json"})
 expect(calls).toBe(0)
 expect(prepareInspectorCopy(capture, () => { throw Error("redaction") })).toEqual({ok:false,code:"redaction-failed"})
})
it("supports redacted plain JSON and shared non-cyclic values", () => {
 const shared = { value: "redacted" }
 const result=prepareInspectorCopy(capture,()=>({left:shared,right:shared}))
 expect(result.ok).toBe(true)
 if(result.ok) expect(JSON.parse(result.text)).toEqual({left:{value:"redacted"},right:{value:"redacted"}})
})
