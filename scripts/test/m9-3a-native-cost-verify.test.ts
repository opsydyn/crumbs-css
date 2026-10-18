import { expect, test } from "bun:test"
import { verifyNativeCost } from "../m9-3a-native-cost-verify"
function receipt() { return { type: "crumbs.m9.3a.native-cost",version:1,app:"storybook",platform:"android",runId:"test",engine:"Hermes",mode:"development",rows:{disabled:{parentRenders:101,getters:0,explanations:0,targets:0,reports:0,updates:100,elapsedMs:1000},closed:{parentRenders:101,getters:0,explanations:0,targets:1,reports:0,updates:100,elapsedMs:1100},disabledDisposed:{targets:0,reports:0},closedDisposed:{targets:0,reports:0},selected:{parentRendersFromInspector:0,getters:20,explanations:20,targets:1,reports:1,explanationMs:Array(20).fill(1)}}} }
test("native cost receipt requires complete identity, real counters and released references",()=>{
 expect(()=>verifyNativeCost(receipt(),"storybook","android","test")).not.toThrow()
 for (const mutate of [
  (v:any)=>v.error="failed",
  (v:any)=>v.runId="stale",
  (v:any)=>v.rows.closed.getters=1,
  (v:any)=>v.rows.closed.explanations=1,
  (v:any)=>v.rows.selected.explanations=0,
  (v:any)=>v.rows.selected.parentRendersFromInspector=1,
  (v:any)=>v.rows.closedDisposed.targets=1,
  (v:any)=>v.rows.selected.explanationMs.pop(),
  (v:any)=>v.rows.selected.explanationMs[0]=NaN,
 ]) { const v=receipt();mutate(v);expect(()=>verifyNativeCost(v,"storybook","android","test")).toThrow() }
})
