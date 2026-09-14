import { expect, it } from "bun:test"
import { createScrollPlan, ScrollRecorder } from "../../../apps/playground/src/scroll-plan"
it("uses measured geometry and independent middle/end/top destinations", () => {
  const plan = createScrollPlan(100, 5, 240)
  expect(plan.steps).toHaveLength(15)
  expect(plan.steps.slice(0,3).map(s=>s.targetOffset)).toEqual([3840,7760,0])
  expect(plan.steps.slice(0,3).map(s=>s.expectedVisible)).toEqual([[48,49,50],[97,98,99],[0,1,2]])
  for(const count of [0,1001,1.5]) expect(()=>createScrollPlan(count,5,240)).toThrow()
  expect(()=>createScrollPlan(2,5,240)).toThrow()
})
it("requires fresh real callbacks, matching geometry and visible indices before advancing", () => {
  const recorder = new ScrollRecorder(createScrollPlan(25,1,240))
  recorder.request(100)
  const step = recorder.step!
  const sample={offset:step.targetOffset,contentHeight:2000,viewportHeight:240,visible:step.expectedVisible,scrollAt:150,viewabilityAt:155}
  expect(recorder.observe({...sample,scrollAt:99},300)).toBe(false)
  expect(recorder.observe({...sample,viewabilityAt:99},300)).toBe(false)
  expect(recorder.observe({...sample,offset:0},300)).toBe(false)
  expect(recorder.observe({...sample,visible:[0,1,2]},300)).toBe(false)
  expect(recorder.observe({...sample,contentHeight:1900},300)).toBe(false)
  expect(recorder.observe(sample,180)).toBe(false)
  expect(recorder.observe(sample,300)).toBe(true)
  expect(recorder.observations).toHaveLength(1)
  expect(recorder.observe(sample,350)).toBe(false)
  expect(recorder.status).toBe("running")
  recorder.cancel("user")
  expect(recorder.status).toBe("cancelled")
  expect(recorder.reason).toBe("user")
  recorder.request(400)
  expect(recorder.observe(sample,500)).toBe(false)
})
it("completes only the whole ordered protocol and times out without fabricating receipts", () => {
  const recorder = new ScrollRecorder(createScrollPlan(25,1,240))
  for(let i=0;i<3;i++) {
    const at=100+i*500
    recorder.request(at)
    const step=recorder.step!
    expect(recorder.observe({offset:step.targetOffset,contentHeight:2000,viewportHeight:240,visible:step.expectedVisible,scrollAt:at+10,viewabilityAt:at+20},at+200)).toBe(true)
  }
  expect(recorder.status).toBe("completed")
  expect(recorder.observations.map(o=>o.step)).toEqual([0,1,2])
  recorder.cancel("late")
  expect(recorder.status).toBe("completed")
  const missing=new ScrollRecorder(createScrollPlan(25,1,240))
  missing.request(0); missing.timeout(3001)
  expect(missing.status).toBe("timed-out")
  expect(missing.observations).toEqual([])
  const invalid=new ScrollRecorder(createScrollPlan(25,1,240));invalid.request(0)
  const step=invalid.step!
  expect(invalid.observe({offset:NaN,contentHeight:2000,viewportHeight:240,visible:step.expectedVisible,scrollAt:10,viewabilityAt:20},200)).toBe(false)
})
it("rejects callbacks observed after the deadline, even if they match", () => {
  const recorder=new ScrollRecorder(createScrollPlan(25,1,240));recorder.request(0)
  const step=recorder.step!
  expect(recorder.observe({offset:step.targetOffset,contentHeight:2000,viewportHeight:240,visible:step.expectedVisible,scrollAt:2800,viewabilityAt:2800},3001)).toBe(false)
  recorder.timeout(3001)
  expect(recorder.status).toBe("timed-out")
})
it("times out missing layout readiness and preserves terminal observations", () => {
  const missing=new ScrollRecorder(createScrollPlan(25,1,240))
  missing.timeout(3001,0)
  expect(missing.status).toBe("timed-out")
  expect(missing.reason).toBe("layout/content readiness deadline")
  expect(missing.observations).toEqual([])
  missing.cancel("navigation")
  expect(missing.status).toBe("timed-out")
})
