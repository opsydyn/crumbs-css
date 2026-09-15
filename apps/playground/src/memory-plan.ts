export type MemorySource="measureUserAgentSpecificMemory"|"performance.memory"|"external"
export type MemorySample={cycle:number;status:"available"|"unavailable";usedBytes:number|null;source:MemorySource|null;gc:{status:"completed"|"unavailable"|"failed";method:string|null};observedAt:number}
export type MemoryObservation={step:number;action:"sample"|"mount"|"unmount";cycle:number;requestToEffectMs:number}
export type MemoryCounts={containerMounts:number;containerUnmounts:number;rowMounts:number;rowUnmounts:number}
export type MemoryBudget={maxRetainedBytes:number;maxSlopeBytesPerCycle:number;maxP95DeltaBytes:number}
export function createMemoryPlan(rowCount:number,cycles:number,sampleEvery:number){
 if(!Number.isSafeInteger(rowCount)||rowCount<1||rowCount>1000)throw Error("Rows must be 1–1000")
 if(!Number.isSafeInteger(cycles)||cycles<1||cycles>100)throw Error("Cycles must be 1–100")
 if(!Number.isSafeInteger(sampleEvery)||sampleEvery<1||sampleEvery>cycles||cycles%sampleEvery!==0)throw Error("Sample interval must divide cycles")
 const steps:Array<{index:number;action:"sample"|"mount"|"unmount";cycle:number;mounted:boolean}>=[]
 steps.push({index:0,action:"sample",cycle:0,mounted:false})
 for(let cycle=1;cycle<=cycles;cycle++){
  steps.push({index:steps.length,action:"mount",cycle,mounted:true},{index:steps.length+1,action:"unmount",cycle,mounted:false})
  if(cycle%sampleEvery===0)steps.push({index:steps.length,action:"sample",cycle,mounted:false})
 }
 return {rowCount,cycles,sampleEvery,steps,mountDwellMs:100,postUnmountSampleDelayMs:500}
}
const validBudget=(budget:MemoryBudget)=>Object.values(budget).every(value=>Number.isSafeInteger(value)&&value>=0)
export function summarizeMemory(plan:ReturnType<typeof createMemoryPlan>,observations:readonly MemoryObservation[],counts:MemoryCounts,samples:readonly MemorySample[],budget:MemoryBudget|null){
 if(budget!==null&&!validBudget(budget))throw Error("Memory budget values must be nonnegative safe integers")
 const protocolComplete=observations.length===plan.steps.length&&plan.steps.every((step,index)=>{const o=observations[index];return o?.step===step.index&&o.action===step.action&&o.cycle===step.cycle&&Number.isFinite(o.requestToEffectMs)&&o.requestToEffectMs>=0})
 const lifecycleBalanced=Object.values(counts).every(value=>Number.isSafeInteger(value)&&value>=0)&&counts.containerMounts===plan.cycles&&counts.containerUnmounts===plan.cycles&&counts.rowMounts===plan.rowCount*plan.cycles&&counts.rowUnmounts===counts.rowMounts
 const checkpoints=plan.steps.filter(step=>step.action==="sample").map(step=>step.cycle)
 const readingsComplete=samples.length===checkpoints.length&&samples.every((sample,index)=>sample.cycle===checkpoints[index]&&sample.status==="available"&&Number.isSafeInteger(sample.usedBytes)&&sample.usedBytes!>0&&sample.source!==null&&Number.isFinite(sample.observedAt)&&sample.observedAt>=0)
 const gcVerified=readingsComplete&&samples.every(sample=>sample.gc.status==="completed"&&typeof sample.gc.method==="string"&&sample.gc.method.length>0)
 const sources=new Set(samples.flatMap(sample=>sample.source===null?[]:[sample.source]))
 const sourceConsistent=readingsComplete&&sources.size===1
 let metrics:{retainedBytes:number;slopeBytesPerCycle:number;p95DeltaBytes:number}|null=null
 if(readingsComplete){
  const values=samples.map(sample=>sample.usedBytes!)
  const xs=checkpoints,meanX=xs.reduce((a,b)=>a+b,0)/xs.length,meanY=values.reduce((a,b)=>a+b,0)/values.length
  const denominator=xs.reduce((sum,x)=>sum+(x-meanX)**2,0)
  const slopeBytesPerCycle=xs.reduce((sum,x,index)=>sum+(x-meanX)*(values[index]!-meanY),0)/denominator
  const deltas=values.map(value=>Math.max(0,value-values[0]!)).sort((a,b)=>a-b)
  metrics={retainedBytes:values.at(-1)!-values[0]!,slopeBytesPerCycle,p95DeltaBytes:deltas[Math.ceil(deltas.length*.95)-1]!}
 }
 const budgetApplied=budget!==null
 const withinBudget=budget===null||metrics===null?null:metrics.retainedBytes<=budget.maxRetainedBytes&&metrics.slopeBytesPerCycle<=budget.maxSlopeBytesPerCycle&&metrics.p95DeltaBytes<=budget.maxP95DeltaBytes
 const memoryQualified=protocolComplete&&lifecycleBalanced&&readingsComplete&&gcVerified&&sourceConsistent&&budgetApplied&&withinBudget===true
 return {protocolComplete,lifecycleBalanced,readingsComplete,gcVerified,sourceConsistent,budgetApplied,withinBudget,memoryQualified,metrics}
}
export function appendMemorySample(target:MemorySample[],sample:MemorySample,active:boolean){
 if(!active)return false
 target.push(sample)
 return true
}
