import { Profiler, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Platform, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native"
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import * as screen from "./screen.css"
import { light } from "./theme.css"
import { ContextRecorder, type ContextKind, type ContextValue, type HookIdentity } from "./context-plan"
const themedModule={panel:screen.panel,copy:screen.copy}
type Run={id:string;startedAt:string;recorder:ContextRecorder;finished:boolean;commits:Array<{step:number;at:number;context:ContextValue;hookIdentity:HookIdentity;color:unknown;fontSize:unknown}>;profiler:Array<{step:number;phase:string;actualDurationMs:number;baseDurationMs:number;commitTimeMs:number}>}
function ContextProbe({run,revision}:{run:Run;revision:number}) {
  const context=useWindowDimensions()
  const styles=useThemedStyles(themedModule)
  const previous=useRef<typeof styles|undefined>(undefined)
  const step=run.recorder.step
  useLayoutEffect(()=>{
    if(!step || run.finished)return
    const at=performance.now()
    const hookIdentity:HookIdentity=!previous.current?"initial":previous.current===styles?"same":"changed"
    previous.current=styles
    const copy=StyleSheet.flatten(styles.copy)
    run.commits.push({step:step.index,at,context:{...context},hookIdentity,color:copy?.color,fontSize:copy?.fontSize})
    run.recorder.observe(step.index,context,hookIdentity,at)
  },[run,revision,step,context.width,context.height,context.scale,context.fontScale,styles])
  return <View style={styles.panel}><Text style={styles.copy}>Observed RN context: {context.width} × {context.height} · scale {context.scale} · fontScale {context.fontScale}</Text></View>
}
function receipt(run:Run){return {formatVersion:1,runId:run.id,startedAt:run.startedAt,finishedAt:new Date().toISOString(),identity:{mode:process.env.EXPO_PUBLIC_CRUMBS_MODE ?? "unverified",crumbsVersion:process.env.EXPO_PUBLIC_CRUMBS_VERSION ?? "unrecorded",sourceRevision:process.env.EXPO_PUBLIC_CRUMBS_REVISION ?? "unrecorded"},environment:{platform:Platform.OS,development:__DEV__,reactNative:Platform.constants?.reactNativeVersion ?? null},scenario:{kind:run.recorder.kind,cycles:run.recorder.cycles,baseline:run.recorder.baseline,steps:run.recorder.steps,timeoutMs:run.recorder.timeoutMs,contextSource:"React Native useWindowDimensions; no injected dimensions or fontScale",hook:"one stable-module useThemedStyles hook under a constant light theme"},summary:run.recorder.summary(),observations:run.recorder.observations,commits:run.commits,profiler:run.profiler,limits:"Functional context and hook-reference receipts. Browser viewport changes are not native device rotation or OS font-scale qualification. Themed hook memoization depends on module/theme identity; responsive conditions are not implemented. Raw timings include instrumentation and uncontrolled host load; no frame, paint, release-device or retained-memory qualification."}}
export function ContextMeasurementPanel(){
  const context=useWindowDimensions()
  const [kind,setKind]=useState<ContextKind>("orientation")
  const [run,setRun]=useState<Run|null>(null)
  const [revision,setRevision]=useState(0)
  const [report,setReport]=useState("")
  function finish(current:Run,update:boolean){
    if(current.finished)return
    current.finished=true
    const json=JSON.stringify(receipt(current),null,2)
    console.log(`CRUMBS_CONTEXT_REPORT ${json}`)
    if(update){setReport(json);setRun(null)}
  }
  useEffect(()=>{
    if(!run)return
    const timer=setInterval(()=>{
      const recorder=run.recorder
      recorder.timeout(performance.now())
      if(recorder.status!=="running"){finish(run,true);return}
      if(recorder.requestedAt===null){recorder.request(performance.now());setRevision(n=>n+1)}
    },250)
    return ()=>{clearInterval(timer);run.recorder.cancel("navigation");finish(run,false)}
  },[run])
  const step=run?.recorder.step
  return <View style={{flex:1,gap:8,backgroundColor:"#f2f4f8",padding:12}}>
    <Text>React Native context changes · five cycles</Text>
    <View style={{flexDirection:"row",gap:12}}>{(["orientation","font-scale"] as const).map(value=><Pressable key={value} accessibilityRole="button" disabled={!!run} onPress={()=>setKind(value)}><Text>{value==="orientation"?"Orientation context":"Font-scale context"}{kind===value?" ✓":""}</Text></Pressable>)}</View>
    <Text>Current RN values: {context.width} × {context.height} · scale {context.scale} · fontScale {context.fontScale}</Text>
    <Text>{kind==="orientation"?"When change is requested, rotate the native device or resize the web viewport to the opposite orientation. Restore the exact baseline dimensions when requested.":"When change is requested, change OS text size on a native target. Restore the baseline fontScale when requested. Web fontScale is generally constant; a browser resize does not qualify this run."}</Text>
    <Pressable accessibilityRole="button" disabled={!!run || context.width===context.height} onPress={()=>{const recorder=new ContextRecorder(kind,context,5);recorder.request(performance.now());setReport("");setRevision(0);setRun({id:`${Date.now()}`,startedAt:new Date().toISOString(),recorder,finished:false,commits:[],profiler:[]})}}><Text>{run?`Cycle ${step?.cycle ?? 5} · ${step?.action ?? "finishing"}`:"Run context cycles"}</Text></Pressable>
    {run && <><Pressable accessibilityRole="button" onPress={()=>{run.recorder.cancel("user");finish(run,true)}}><Text>Cancel context run</Text></Pressable><ThemeProvider theme={light}><Profiler id="context-probe" onRender={(_id,phase,actualDuration,baseDuration,_start,commitTime)=>{if(!run.finished)run.profiler.push({step:step?.index ?? run.recorder.steps.length,phase,actualDurationMs:actualDuration,baseDurationMs:baseDuration,commitTimeMs:commitTime})}}><ContextProbe run={run} revision={revision}/></Profiler></ThemeProvider></>}
    {report!=="" && <><Text>Context run {JSON.parse(report).summary.status} · {JSON.parse(report).summary.observedSteps} observed steps · {JSON.parse(report).summary.verified?"references verified":"not qualified"}</Text><TextInput accessibilityLabel="Context JSON report" multiline editable={false} value={report} style={{flex:1,fontSize:11,color:"#172438",backgroundColor:"white"}}/></>}
  </View>
}
