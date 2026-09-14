import { describe, expect, it } from "bun:test"
import { createWorkloadPlan, summarizeWorkload, type WorkloadObservation } from "../../../apps/playground/src/measurement-plan"

describe("Expo list measurement plan", () => {
  it("uses five identical mount/rerender/theme-switch/unmount cycles", () => {
    const plan = createWorkloadPlan("themed", 100, 5)
    expect(plan.steps).toHaveLength(20)
    for (let cycle = 0; cycle < 5; cycle++) {
      const steps = plan.steps.slice(cycle * 4, cycle * 4 + 4)
      expect(steps.map(step => step.action)).toEqual(["mount", "rerender", "theme-switch", "unmount"])
      expect(steps.map(step => step.mounted)).toEqual([true, true, true, false])
      expect(steps.map(step => step.theme)).toEqual(["light", "light", "dark", "dark"])
    }
  })
  it("fails invalid sizes and does not equate missing observations with acceptance", () => {
    for (const size of [0, -1, 1.5, Infinity]) expect(() => createWorkloadPlan("static", size, 5)).toThrow()
    const summary = summarizeWorkload(createWorkloadPlan("themed", 100, 5), [], { listMounts: 0, listUnmounts: 0, rowMounts: 0, rowUnmounts: 0 })
    expect(summary.complete).toBe(false)
    expect(summary.memoIdentityVerified).toBe(false)
  })
  it("requires each step and the actual lifecycle/memo receipts", () => {
    const plan = createWorkloadPlan("themed", 100, 5)
    const observations: WorkloadObservation[] = plan.steps.map(step => ({ step: step.index, action: step.action, requestToLayoutEffectMs: 1, styleIdentity: step.action === "mount" ? "initial" : step.action === "rerender" ? "same" : step.action === "theme-switch" ? "changed" : "absent" }))
    const counts = { listMounts: 5, listUnmounts: 5, rowMounts: 50, rowUnmounts: 50 }
    expect(summarizeWorkload(plan, observations, counts)).toMatchObject({ complete: true, memoIdentityVerified: true, lifecycleBalanced: true })
    expect(summarizeWorkload(plan, observations.slice(1), counts).complete).toBe(false)
    expect(summarizeWorkload(plan, [...observations, observations[0]!], counts).complete).toBe(false)
    expect(summarizeWorkload(plan, observations.map(value => ({ ...value, styleIdentity: "same" })), counts).memoIdentityVerified).toBe(false)
    expect(summarizeWorkload(plan, observations, { ...counts, rowUnmounts: 49 }).lifecycleBalanced).toBe(false)
  })
})

it("keeps static references stable and rejects impossible lifecycle counts", () => {
  const plan = createWorkloadPlan("static", 25, 5)
  const observations: WorkloadObservation[] = plan.steps.map(step => ({ step: step.index, action: step.action, requestToLayoutEffectMs: 1, styleIdentity: step.action === "mount" ? "initial" : step.action === "unmount" ? "absent" : "same" }))
  const counts = { listMounts: 5, listUnmounts: 5, rowMounts: 50, rowUnmounts: 50 }
  expect(summarizeWorkload(plan, observations, counts).memoIdentityVerified).toBe(true)
  for (const rowMounts of [Infinity, 1.5]) expect(summarizeWorkload(plan, observations, { ...counts, rowMounts, rowUnmounts: rowMounts }).lifecycleBalanced).toBe(false)
})
