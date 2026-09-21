import { Profiler, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Platform, Pressable, Text, TextInput, View } from "react-native"
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import * as screen from "./screen.css"
import { light } from "./theme.css"
import { appendMemorySample, createMemoryPlan, summarizeMemory, type MemoryCounts, type MemoryObservation, type MemorySample } from "./memory-plan"
const themedModule={panel:screen.panel,copy:screen.copy}
type ExternalReading={usedBytes:number;gc:{status:"completed"|"unavailable"|"failed";method:string|null}}
type Run={id:string;startedAt:string;plan:ReturnType<typeof createMemoryPlan>;index:number;requestedAt:number;finished:boolean;counts:MemoryCounts;observations:MemoryObservation[];samples:MemorySample[];profiler:Array<{step:number;phase:string;actualDurationMs:number;baseDurationMs:number;commitTimeMs:number}>}
const unavailable=(cycle:number,observedAt:number):MemorySample=>({cycle,status:"unavailable",usedBytes:null,source:null,gc:{status:"unavailable",method:null},observedAt})
async function readMemory(cycle:number):Promise<MemorySample>{
 const observedAt=performance.now()
 try{
  const external=(globalThis as typeof globalThis&{__CRUMBS_MEMORY_PROBE__?:()=>Promise<ExternalReading>}).__CRUMBS_MEMORY_PROBE__
  if(external){
   const result=await Promise.race([external(),new Promise<never>((_,reject)=>setTimeout(()=>reject(Error("probe timeout")),3000))])
   return {cycle,status:"available",usedBytes:result.usedBytes,source:"external",gc:result.gc,observedAt:performance.now()}
  }
  const gc=(globalThis as typeof globalThis&{gc?:()=>void}).gc
  const memory=(performance as Performance&{memory?:{usedJSHeapSize:number}}).memory
  if(gc&&memory){gc();return {cycle,status:"available",usedBytes:memory.usedJSHeapSize,source:"performance.memory",gc:{status:"completed",method:"globalThis.gc"},observedAt:performance.now()}}
  const specific=(performance as Performance&{measureUserAgentSpecificMemory?:()=>Promise<{bytes:number}>}).measureUserAgentSpecificMemory
  if(specific){const result=await specific();return {cycle,status:"available",usedBytes:result.bytes,source:"measureUserAgentSpecificMemory",gc:{status:"unavailable",method:null},observedAt:performance.now()}}
  if(memory)return {cycle,status:"available",usedBytes:memory.usedJSHeapSize,source:"performance.memory",gc:{status:"unavailable",method:null},observedAt:performance.now()}
 }catch{return {...unavailable(cycle,performance.now()),gc:{status:"failed",method:null}}}
 return unavailable(cycle,observedAt)
}
function MemoryRow({index,counts}:{index:number;counts:MemoryCounts}){
 useLayoutEffect(()=>{counts.rowMounts++;return()=>{counts.rowUnmounts++}},[counts])
 const styles=useThemedStyles(themedModule)
 return <View style={[styles.panel,{height:52,marginBottom:0}]}><Text style={styles.copy}>Retained-memory component {index+1}</Text></View>
}
function MemoryTree({run}:{run:Run}){
 const rows=useMemo(()=>Array.from({length:run.plan.rowCount},(_,index)=>index),[run])
 useLayoutEffect(()=>{run.counts.containerMounts++;return()=>{run.counts.containerUnmounts++}},[run])
 return <View>{rows.map(index=><MemoryRow key={index} index={index} counts={run.counts}/>)}</View>
}
function receipt(run:Run,status:"completed"|"cancelled"="completed",reason:string|null=null){
 const summary={...summarizeMemory(run.plan,run.observations,run.counts,run.samples,null),status,reason}
 return {formatVersion:1,runId:run.id,startedAt:run.startedAt,finishedAt:new Date().toISOString(),identity:{mode:process.env.EXPO_PUBLIC_CRUMBS_MODE??"unverified",crumbsVersion:process.env.EXPO_PUBLIC_CRUMBS_VERSION??"unrecorded",sourceRevision:process.env.EXPO_PUBLIC_CRUMBS_REVISION??"unrecorded"},environment:{platform:Platform.OS,development:__DEV__,reactNative:Platform.constants?.reactNativeVersion??null},scenario:{...run.plan,hookPlacement:"one public useThemedStyles hook per row under a constant light theme",memorySources:["external adapter","performance.memory","measureUserAgentSpecificMemory"],forcedGc:"external adapter or globalThis.gc only",budget:null},summary,counts:{...run.counts},observations:run.observations,samples:run.samples,profiler:run.profiler,limits:"Functional mount/unmount and diagnostic memory-reading protocol. No approved M1.8 budget is applied, so this run cannot qualify retained memory. Cleanup balance is not leak proof. performance.memory and measureUserAgentSpecificMemory without forced-GC provenance are diagnostic only. Timings include instrumentation/uncontrolled host load; no release-device, frame, thermal or calibrated performance qualification."}
}
export function MemoryMeasurementPanel(){
 const [size,setSize]=useState(100)
 const [run,setRun]=useState<Run|null>(null)
 const [index,setIndex]=useState(0)
 const [report,setReport]=useState("")
 const step=run?.plan.steps[index]
 const observationRef=useRef(-1)
 function finish(current:Run,update:boolean){if(current.finished)return;current.finished=true;const json=JSON.stringify(receipt(current),null,2);console.log(`CRUMBS_MEMORY_REPORT ${json}`);if(update){setReport(json);setRun(null)}}
 useEffect(()=>{if(!run)return;return()=>{if(run.finished)return;run.finished=true;console.log(`CRUMBS_MEMORY_REPORT ${JSON.stringify(receipt(run,"cancelled","navigation"),null,2)}`)}},[run])
 useLayoutEffect(()=>{if(!run||!step||run.finished||observationRef.current===step.index)return;observationRef.current=step.index;run.observations.push({step:step.index,action:step.action,cycle:step.cycle,requestToEffectMs:performance.now()-run.requestedAt})},[run,step,index])
 useEffect(()=>{
  if(!run||!step||run.finished)return
  let cancelled=false
  const timer=setTimeout(async()=>{
   if(step.action==="sample"){const sample=await readMemory(step.cycle);if(!appendMemorySample(run.samples,sample,!cancelled&&!run.finished))return}
   if(cancelled||run.finished)return
   if(index===run.plan.steps.length-1){finish(run,true);return}
   run.requestedAt=performance.now();setIndex(value=>value+1)
  },step.action==="sample"?run.plan.postUnmountSampleDelayMs:run.plan.mountDwellMs)
  return()=>{cancelled=true;clearTimeout(timer)}
 },[run,step,index])
 return <View style={{flex:1,gap:8,backgroundColor:"#f2f4f8",padding:12}}>
  <Text>Retained-memory protocol · 25 mount/unmount cycles</Text>
  <View style={{flexDirection:"row",gap:12}}>{[100,1000].map(value=><Pressable key={value} accessibilityRole="button" disabled={!!run} onPress={()=>setSize(value)}><Text>{value} memory rows{size===value?" ✓":""}</Text></Pressable>)}</View>
  <Text>Samples run after every fifth unmount. Cleanup, readings, GC provenance and budget admission are reported separately. No budget is applied in M1.5e.</Text>
  <Pressable accessibilityRole="button" disabled={!!run} onPress={()=>{const plan=createMemoryPlan(size,25,5);const current:Run={id:`${Date.now()}`,startedAt:new Date().toISOString(),plan,index:0,requestedAt:performance.now(),finished:false,counts:{containerMounts:0,containerUnmounts:0,rowMounts:0,rowUnmounts:0},observations:[],samples:[],profiler:[]};observationRef.current=-1;setReport("");setIndex(0);setRun(current)}}><Text>{run?`Cycle ${step?.cycle} · ${step?.action}`:"Run memory workload"}</Text></Pressable>
  {run&&<Pressable accessibilityRole="button" onPress={()=>{run.finished=true;const json=JSON.stringify(receipt(run,"cancelled","user"),null,2);console.log(`CRUMBS_MEMORY_REPORT ${json}`);setReport(json);setRun(null)}}><Text>Cancel memory run</Text></Pressable>}
  <ThemeProvider theme={light}><Profiler id="memory-tree" onRender={(_id,phase,actualDuration,baseDuration,_start,commitTime)=>{if(run&&!run.finished&&step)run.profiler.push({step:step.index,phase,actualDurationMs:actualDuration,baseDurationMs:baseDuration,commitTimeMs:commitTime})}}>{run&&step?.mounted&&<MemoryTree key={step.cycle} run={run}/>}</Profiler></ThemeProvider>
  {report!==""&&<><Text>Memory run {JSON.parse(report).summary.status??(JSON.parse(report).summary.protocolComplete?"completed":"incomplete")} · lifecycle {JSON.parse(report).summary.lifecycleBalanced?"balanced":"incomplete"} · memory {JSON.parse(report).summary.memoryQualified?"qualified":"not qualified"}</Text><TextInput accessibilityLabel="Memory JSON report" multiline editable={false} value={report} style={{flex:1,fontSize:11,color:"#172438",backgroundColor:"white"}}/></>}
 </View>
}
