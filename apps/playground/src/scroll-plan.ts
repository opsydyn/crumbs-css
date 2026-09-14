export type ScrollSample = {
  offset: number; contentHeight: number; viewportHeight: number
  visible: number[]; scrollAt: number; viewabilityAt: number
}
export function createScrollPlan(rowCount: number, cycles: number, viewportHeight: number) {
  if (!Number.isSafeInteger(rowCount) || rowCount < 1 || rowCount > 1000) throw Error("Rows must be 1–1000")
  if (!Number.isSafeInteger(cycles) || cycles < 1 || cycles > 20) throw Error("Cycles must be 1–20")
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) throw Error("Viewport must be positive")
  const rowHeight = 80
  const contentHeight = rowCount * rowHeight
  const maxOffset = contentHeight - viewportHeight
  if (maxOffset < rowHeight * 2) throw Error("Viewport must allow distinct scroll destinations")
  const destinations = [{ action: "middle", offset: Math.floor(maxOffset / 2 / rowHeight) * rowHeight }, { action: "end", offset: maxOffset }, { action: "top", offset: 0 }]
  const steps = Array.from({ length: cycles }, (_, cycle) => destinations.map(({ action, offset }, i) => ({
    index: cycle * 3 + i, cycle: cycle + 1, action, targetOffset: offset,
    expectedVisible: Array.from({ length: Math.ceil((offset + viewportHeight) / rowHeight) - Math.floor(offset / rowHeight) }, (_, j) => Math.floor(offset / rowHeight) + j),
  }))).flat()
  return { rowCount, cycles, rowHeight, contentHeight, viewportHeight, steps, settleMs: 100, timeoutMs: 3000, tolerance: 2 }
}
export class ScrollRecorder {
  status: "running" | "completed" | "cancelled" | "timed-out" = "running"
  reason: string | null = null
  requestedAt: number | null = null
  observations: Array<ScrollSample & { step: number; action: string; targetOffset: number; requestedAt: number; acceptedAt: number }> = []
  constructor(readonly plan: ReturnType<typeof createScrollPlan>) {}
  get step() { return this.plan.steps[this.observations.length] }
  request(now: number) {
    if (this.status === "running" && this.requestedAt === null && Number.isFinite(now)) this.requestedAt = now
  }
  observe(sample: ScrollSample, now: number) {
    const step = this.step
    if (this.status !== "running" || this.requestedAt === null || !step) return false
    if (now - this.requestedAt >= this.plan.timeoutMs) return false
    if (![now,sample.offset,sample.contentHeight,sample.viewportHeight,sample.scrollAt,sample.viewabilityAt].every(Number.isFinite)) return false
    if (sample.scrollAt < this.requestedAt || sample.viewabilityAt < this.requestedAt || sample.scrollAt > now || sample.viewabilityAt > now) return false
    if (now - Math.max(sample.scrollAt,sample.viewabilityAt) < this.plan.settleMs) return false
    if (Math.abs(sample.offset - step.targetOffset) > this.plan.tolerance || Math.abs(sample.contentHeight - this.plan.contentHeight) > this.plan.tolerance || Math.abs(sample.viewportHeight - this.plan.viewportHeight) > this.plan.tolerance) return false
    if (sample.visible.length !== step.expectedVisible.length || !sample.visible.every((id,i)=>id === step.expectedVisible[i])) return false
    this.observations.push({ ...sample, visible: [...sample.visible], step: step.index, action: step.action, targetOffset: step.targetOffset, requestedAt: this.requestedAt, acceptedAt: now })
    this.requestedAt = null
    if (this.observations.length === this.plan.steps.length) this.status = "completed"
    return true
  }
  timeout(now: number, startedAt: number | null = this.requestedAt) {
    if (this.status === "running" && startedAt !== null && now - startedAt >= this.plan.timeoutMs) { this.status = "timed-out"; this.reason = this.requestedAt === null ? "layout/content readiness deadline" : "scroll/viewability deadline" }
  }
  cancel(reason: string) {
    if (this.status === "running") { this.status = "cancelled"; this.reason = reason }
  }
}
