import { Profiler, useEffect, useMemo, useRef, useState } from "react"
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import type { TextStyle, ViewStyle, ViewToken } from "react-native"
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme"
import * as screen from "./screen.css"
import { light } from "./theme.css"
import { createScrollPlan, ScrollRecorder, type ScrollSample } from "./scroll-plan"
const themedModule = { panel:screen.panel, copy:screen.copy }
const staticStyles = StyleSheet.create({panel:{backgroundColor:"#ffffff",padding:16,borderRadius:12},copy:{color:"#172438",fontSize:16}})
type Styles = { panel?: ViewStyle | undefined; copy?: TextStyle | undefined }
type Row = { id:string; label:string }
type Run = {
  id:string; startedAt:string; startedTick:number; recorder:ScrollRecorder; finished:boolean
  events:Array<{kind:string;at:number;offset?:number;visible?:number[];height?:number}>
  profiler:Array<{step:number;phase:string;actualDurationMs:number;baseDurationMs:number;commitTimeMs:number}>
}
const viewabilityConfig = { itemVisiblePercentThreshold: 1, minimumViewTime: 0 }
function ScrollList({ run, styles }: {run:Run;styles:Styles}) {
  const list = useRef<FlatList<Row>>(null)
  const data = useMemo(()=>Array.from({length:run.recorder.plan.rowCount},(_,i)=>({id:String(i),label:`Scroll component ${i+1}`})),[run])
  const live = useRef<ScrollSample>({offset:NaN,contentHeight:0,viewportHeight:0,visible:[],scrollAt:-Infinity,viewabilityAt:-Infinity})
  const onViewableItemsChanged = useRef(({viewableItems}:{viewableItems:ViewToken<Row>[]})=>{
    if (run.finished) return
    const at=performance.now()
    live.current.visible=viewableItems.filter(v=>v.isViewable && v.index !== null).map(v=>v.index!).sort((a,b)=>a-b)
    live.current.viewabilityAt=at
    run.events.push({kind:"viewability",at,visible:[...live.current.visible]})
  }).current
  useEffect(()=>{
    const timer=setInterval(()=>{
      const recorder=run.recorder
      if (run.finished || recorder.status !== "running") return
      const now=performance.now()
      if (recorder.requestedAt === null) {
        if (live.current.viewportHeight <= 0 || live.current.contentHeight <= 0) {
          if (now-run.startedTick >= recorder.plan.timeoutMs) recorder.timeout(now,run.startedTick)
          return
        }
        recorder.request(now)
        run.events.push({kind:"command",at:now,offset:recorder.step!.targetOffset})
        list.current?.scrollToOffset({offset:recorder.step!.targetOffset,animated:false})
      } else {
        recorder.observe(live.current,now)
        recorder.timeout(now)
      }
    },50)
    return ()=>clearInterval(timer)
  },[run])
  return <FlatList ref={list} testID="crumbs-measure-scroll-list" style={{height:240,flexGrow:0}} data={data} keyExtractor={r=>r.id}
    initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5}
    getItemLayout={(_data,index)=>({length:80,offset:index*80,index})}
    renderItem={({item})=><View style={[styles.panel,{height:80,marginBottom:0,gap:0,overflow:"hidden"}]}><Text style={styles.copy}>{item.label}</Text></View>}
    onLayout={event=>{live.current.viewportHeight=event.nativeEvent.layout.height;run.events.push({kind:"layout",at:performance.now(),height:live.current.viewportHeight})}}
    onContentSizeChange={(_width,height)=>{live.current.contentHeight=height;run.events.push({kind:"content",at:performance.now(),height})}}
    onScroll={event=>{
      if (run.finished) return
      const at=performance.now();const e=event.nativeEvent
      live.current.offset=e.contentOffset.y;live.current.scrollAt=at;live.current.contentHeight=e.contentSize.height;live.current.viewportHeight=e.layoutMeasurement.height
      run.events.push({kind:"scroll",at,offset:e.contentOffset.y})
    }} scrollEventThrottle={16} viewabilityConfig={viewabilityConfig} onViewableItemsChanged={onViewableItemsChanged}/>
}
function ThemedScrollList({run}:{run:Run}) { const styles=useThemedStyles(themedModule);return <ScrollList run={run} styles={styles}/> }
function receipt(run:Run,kind:string) {
  return {formatVersion:1,runId:run.id,startedAt:run.startedAt,finishedAt:new Date().toISOString(),identity:{mode:process.env.EXPO_PUBLIC_CRUMBS_MODE ?? "unverified",crumbsVersion:process.env.EXPO_PUBLIC_CRUMBS_VERSION ?? "unrecorded",sourceRevision:process.env.EXPO_PUBLIC_CRUMBS_REVISION ?? "unrecorded"},environment:{platform:Platform.OS,development:__DEV__,reactNative:Platform.constants?.reactNativeVersion ?? null},scenario:{kind:`${kind}-scroll`,...run.recorder.plan,initialNumToRender:10,maxToRenderPerBatch:10,windowSize:5,scrollEventThrottle:16,viewabilityConfig,animated:false},summary:{status:run.recorder.status,reason:run.recorder.reason,complete:run.recorder.status === "completed",observedSteps:run.recorder.observations.length},observations:run.recorder.observations,events:run.events,profiler:run.profiler,limits:"Programmatic fixed-geometry scroll/viewability callback receipts, not touch/fling, painted visibility, JS/UI frames, release-device timing or retained-memory qualification. Event timestamps and Profiler durations include instrumentation and uncontrolled host load."}
}
export function ScrollMeasurementPanel() {
  const [kind,setKind]=useState<"static"|"themed">("themed")
  const [size,setSize]=useState(100)
  const [run,setRun]=useState<Run|null>(null)
  const [report,setReport]=useState("")
  function finish(current:Run,update:boolean) {
    if (current.finished) return
    current.finished=true
    const json=JSON.stringify(receipt(current,kind),null,2)
    console.log(`CRUMBS_SCROLL_REPORT ${json}`)
    if(update) {setReport(json);setRun(null)}
  }
  useEffect(()=>{
    if(!run) return
    const timer=setInterval(()=>{if(run.recorder.status !== "running") finish(run,true)},50)
    return ()=>{clearInterval(timer);run.recorder.cancel("navigation");finish(run,false)}
  },[run,kind])
  return <View style={{flex:1,gap:8,backgroundColor:"#f2f4f8",padding:12}}>
    <Text>List scrolling · five middle → end → top cycles</Text>
    <View style={{flexDirection:"row",gap:12}}>{(["static","themed"] as const).map(value=><Pressable key={value} accessibilityRole="button" disabled={!!run} onPress={()=>setKind(value)}><Text>{value === "static" ? "Static scrolling" : "Themed scrolling"}{kind === value ? " ✓" : ""}</Text></Pressable>)}</View>
    <View style={{flexDirection:"row",gap:12}}>{[25,100,1000].map(value=><Pressable key={value} accessibilityRole="button" disabled={!!run} onPress={()=>setSize(value)}><Text>{value} scroll rows{size === value ? " ✓" : ""}</Text></Pressable>)}</View>
    <Pressable accessibilityRole="button" disabled={!!run} onPress={()=>{setReport("");setRun({id:`${Date.now()}`,startedAt:new Date().toISOString(),startedTick:performance.now(),recorder:new ScrollRecorder(createScrollPlan(size,5,240)),finished:false,events:[],profiler:[]})}}><Text>{run ? "Scrolling in progress" : "Run scroll cycles"}</Text></Pressable>
    {run && <><Pressable accessibilityRole="button" onPress={()=>{run.recorder.cancel("user");finish(run,true)}}><Text>Cancel scroll run</Text></Pressable><ThemeProvider theme={light}><Profiler id="measured-scroll" onRender={(_id,phase,actualDuration,baseDuration,_startTime,commitTime)=>{if(!run.finished)run.profiler.push({step:run.recorder.step?.index ?? run.recorder.plan.steps.length,phase,actualDurationMs:actualDuration,baseDurationMs:baseDuration,commitTimeMs:commitTime})}}>{kind === "themed" ? <ThemedScrollList run={run}/> : <ScrollList run={run} styles={staticStyles}/>}</Profiler></ThemeProvider></>}
    {report !== "" && <><Text>Scroll run {JSON.parse(report).summary.status} · {JSON.parse(report).summary.observedSteps} observed steps</Text><TextInput accessibilityLabel="Scroll JSON report" multiline editable={false} value={report} style={{flex:1,fontSize:11,color:"#172438",backgroundColor:"white"}}/></>}
  </View>
}
