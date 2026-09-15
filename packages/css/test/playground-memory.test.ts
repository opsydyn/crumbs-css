import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { createMemoryPlan, summarizeMemory, type MemoryObservation, type MemorySample } from "../../../apps/playground/src/memory-plan"
const counts={containerMounts:25,containerUnmounts:25,rowMounts:2500,rowUnmounts:2500}
function samples(values:number[],gc:"completed"|"unavailable"="completed"):MemorySample[]{return values.map((usedBytes,index)=>({cycle:index*5,status:"available",usedBytes,source:"external",gc:{status:gc,method:gc==="completed"?"test forced GC":null},observedAt:index*100}))}
function observations():MemoryObservation[]{return createMemoryPlan(100,25,5).steps.map(step=>({step:step.index,action:step.action,cycle:step.cycle,requestToEffectMs:1}))}
describe("retained memory admission",()=>{
 it("creates ordered post-unmount checkpoints",()=>{
  const plan=createMemoryPlan(100,25,5)
  expect(plan.steps).toHaveLength(56)
  expect(plan.steps[0]).toMatchObject({action:"sample",cycle:0,mounted:false})
  expect(plan.steps.filter(s=>s.action==="mount")).toHaveLength(25)
  expect(plan.steps.filter(s=>s.action==="unmount")).toHaveLength(25)
  expect(plan.steps.filter(s=>s.action==="sample").map(s=>s.cycle)).toEqual([0,5,10,15,20,25])
  const invalidPlans: Array<[number,number,number]>=[[0,25,5],[1001,25,5],[100,0,5],[100,25,0],[100,25,6],[100,1.5,1]]
  for(const args of invalidPlans)expect(()=>createMemoryPlan(...args)).toThrow()
 })
 it("qualifies only complete, forced-GC, single-source readings against an explicit budget",()=>{
  const plan=createMemoryPlan(100,25,5)
  const result=summarizeMemory(plan,observations(),counts,samples([100_000_000,101_000_000,102_000_000,103_000_000,104_000_000,105_000_000]),{maxRetainedBytes:6_000_000,maxSlopeBytesPerCycle:300_000,maxP95DeltaBytes:6_000_000})
  expect(result).toMatchObject({protocolComplete:true,lifecycleBalanced:true,readingsComplete:true,gcVerified:true,sourceConsistent:true,budgetApplied:true,withinBudget:true,memoryQualified:true})
  expect(result.metrics).toMatchObject({retainedBytes:5_000_000,slopeBytesPerCycle:200_000,p95DeltaBytes:5_000_000})
 })
 it("does not turn cleanup counts or unforced web readings into leak proof",()=>{
  const plan=createMemoryPlan(100,25,5),obs=observations(),values=[100,101,102,103,104,105]
  expect(summarizeMemory(plan,obs,counts,samples(values),null)).toMatchObject({lifecycleBalanced:true,budgetApplied:false,withinBudget:null,memoryQualified:false})
  expect(summarizeMemory(plan,obs,counts,samples(values,"unavailable"),{maxRetainedBytes:10,maxSlopeBytesPerCycle:1,maxP95DeltaBytes:10})).toMatchObject({gcVerified:false,memoryQualified:false})
  expect(summarizeMemory(plan,obs,counts,samples(values).map((s,i)=>i===2?{...s,source:"performance.memory"}:s),{maxRetainedBytes:10,maxSlopeBytesPerCycle:1,maxP95DeltaBytes:10})).toMatchObject({sourceConsistent:false,memoryQualified:false})
  const unavailable:MemorySample[]=plan.steps.filter(s=>s.action==="sample").map(s=>({cycle:s.cycle,status:"unavailable",usedBytes:null,source:null,gc:{status:"unavailable",method:null},observedAt:s.index}))
  expect(summarizeMemory(plan,obs,counts,unavailable,null)).toMatchObject({readingsComplete:false,memoryQualified:false})
  expect(summarizeMemory(plan,obs.slice(1),counts,samples(values),null).protocolComplete).toBe(false)
  expect(summarizeMemory(plan,obs,{...counts,rowUnmounts:2499},samples(values),null).lifecycleBalanced).toBe(false)
 })
 it("rejects nonfinite readings and invalid budgets",()=>{
  const plan=createMemoryPlan(100,25,5)
  expect(summarizeMemory(plan,observations(),counts,samples([100,101,NaN,103,104,105]),{maxRetainedBytes:10,maxSlopeBytesPerCycle:1,maxP95DeltaBytes:10}).memoryQualified).toBe(false)
  for(const budget of [{maxRetainedBytes:-1,maxSlopeBytesPerCycle:1,maxP95DeltaBytes:1},{maxRetainedBytes:1,maxSlopeBytesPerCycle:Infinity,maxP95DeltaBytes:1}])expect(()=>summarizeMemory(plan,observations(),counts,samples([1,1,1,1,1,1]),budget)).toThrow()
 })
 it("computes a linear retained slope for arbitrary safe starting sizes and growth",()=>{
  fc.assert(fc.property(fc.integer({min:1_000_000,max:100_000_000}),fc.integer({min:-10_000,max:10_000}),(start,growth)=>{
   const values=Array.from({length:6},(_,i)=>start+growth*i*5)
   const result=summarizeMemory(createMemoryPlan(100,25,5),observations(),counts,samples(values),{maxRetainedBytes:Number.MAX_SAFE_INTEGER,maxSlopeBytesPerCycle:Number.MAX_SAFE_INTEGER,maxP95DeltaBytes:Number.MAX_SAFE_INTEGER})
   expect(result.metrics?.slopeBytesPerCycle).toBeCloseTo(growth,8)
  }),{numRuns:200})
 })
})
it("does not append a reading after the workload becomes terminal",async()=>{
 const {appendMemorySample}=await import("../../../apps/playground/src/memory-plan")
 const target:MemorySample[]=[]
 const sample=samples([100])[0]!
 expect(appendMemorySample(target,sample,false)).toBe(false)
 expect(target).toEqual([])
 expect(appendMemorySample(target,sample,true)).toBe(true)
 expect(target).toEqual([sample])
})
