export type WorkloadKind = "static" | "themed"
export type WorkloadAction = "mount" | "rerender" | "theme-switch" | "unmount"
export type WorkloadStep = { index: number; cycle: number; action: WorkloadAction; mounted: boolean; theme: "light" | "dark" }
export type WorkloadObservation = { step: number; action: WorkloadAction; requestToLayoutEffectMs: number; styleIdentity: "initial" | "same" | "changed" | "absent" }
export type LifecycleCounts = { listMounts: number; listUnmounts: number; rowMounts: number; rowUnmounts: number }

export function createWorkloadPlan(kind: WorkloadKind, rowCount: number, cycles: number) {
  if (!["static", "themed"].includes(kind)) throw Error("Unknown list workload")
  if (!Number.isSafeInteger(rowCount) || rowCount <= 0 || rowCount > 1000) throw Error("Row count must be 1–1000")
  if (!Number.isSafeInteger(cycles) || cycles <= 0 || cycles > 20) throw Error("Cycles must be 1–20")
  const steps: WorkloadStep[] = []
  for (let cycle = 1; cycle <= cycles; cycle++) {
    for (const action of ["mount", "rerender", "theme-switch", "unmount"] as const) {
      steps.push({ index: steps.length, cycle, action, mounted: action !== "unmount", theme: action === "mount" || action === "rerender" ? "light" : "dark" })
    }
  }
  return { kind, rowCount, cycles, steps }
}

export function summarizeWorkload(plan: ReturnType<typeof createWorkloadPlan>, observations: readonly WorkloadObservation[], counts: LifecycleCounts) {
  const complete = observations.length === plan.steps.length && plan.steps.every((step, index) => {
    const observed = observations[index]
    return observed?.step === step.index && observed.action === step.action && Number.isFinite(observed.requestToLayoutEffectMs) && observed.requestToLayoutEffectMs >= 0
  })
  const memoIdentityVerified = complete && observations.every(observation => observation.styleIdentity === (
    observation.action === "mount" ? "initial" : observation.action === "unmount" ? "absent" : observation.action === "rerender" || plan.kind === "static" ? "same" : "changed"
  ))
  const lifecycleBalanced = Object.values(counts).every(value => Number.isSafeInteger(value) && value >= 0) && counts.listMounts === plan.cycles && counts.listUnmounts === plan.cycles && counts.rowMounts > 0 && counts.rowMounts === counts.rowUnmounts
  return { complete, memoIdentityVerified, lifecycleBalanced }
}
