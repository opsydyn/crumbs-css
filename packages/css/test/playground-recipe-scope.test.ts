import { expect, it } from "bun:test"
import { createScopePlan, summarizeScopes } from "../../../apps/playground/src/scope-plan"
it("checks ordered recipe defaults, compound selection and independent scope changes", () => {
  const plan = createScopePlan(5)
  expect(plan).toHaveLength(35)
  expect(plan.slice(0,7).map(s => s.action)).toEqual(["mount", "rerender", "select", "repeat-selection", "parent-switch", "nested-switch", "unmount"])
  const observations = plan.map(s => ({ step:s.index, action:s.action, parent:s.expectedParent, nested:s.expectedNested, parentIdentity:s.parentIdentity, nestedIdentity:s.nestedIdentity, recipeArrayFresh:s.mounted, requestToLayoutEffectMs:1 }))
  expect(summarizeScopes(plan, observations, { mounts:10, unmounts:10 }).verified).toBe(true)
  expect(summarizeScopes(plan, observations.slice(1), { mounts:10, unmounts:10 }).verified).toBe(false)
  expect(summarizeScopes(plan, observations.map(o=>({...o,nested:{...o.nested,borderColor:"wrong"}})), {mounts:10,unmounts:10}).verified).toBe(false)
  expect(summarizeScopes(plan, observations.map(o=>({...o,nestedIdentity:"changed" as const})), {mounts:10,unmounts:10}).verified).toBe(false)
  expect(summarizeScopes(plan, observations, {mounts:10,unmounts:9}).verified).toBe(false)
  expect(summarizeScopes(plan, observations.map(o=>({...o,requestToLayoutEffectMs:NaN})), {mounts:10,unmounts:10}).verified).toBe(false)
  for(const cycles of [0,21,1.5,Infinity]) expect(()=>createScopePlan(cycles)).toThrow()
})
it("rejects an empty receipt protocol", () => {
  expect(summarizeScopes([], [], {mounts:0,unmounts:0}).verified).toBe(false)
})
