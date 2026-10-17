import { Profiler, useLayoutEffect, useRef, useState } from "react"
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { resolveRecipeStyle } from "@opsydyn/crumbs-css/theme/recipes"
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import * as module from "./measurement.css"
import { dark, light } from "./theme.css"
import { createScopePlan, summarizeScopes, type Identity, type ScopeObservation, type Sample } from "./scope-plan"
type Step = ReturnType<typeof createScopePlan>[number]
type Capture = { samples: Map<number, Partial<ScopeObservation>>; counts: { mounts:number; unmounts:number }; observations: ScopeObservation[]; profiler: unknown[] }
function Probe({ scope, step, capture }: { scope:"parent"|"nested"; step:Step; capture:Capture }) {
  const styles = useThemedStyles(module)
  const resolved = resolveRecipeStyle(styles.probe, step.selected ? { selected:true, size:"large" } : {})
  const previous = useRef<typeof styles | undefined>(undefined)
  const previousArray = useRef<typeof resolved | undefined>(undefined)
  useLayoutEffect(() => { capture.counts.mounts++; return () => { capture.counts.unmounts++ } }, [capture])
  useLayoutEffect(() => {
    const flattened = StyleSheet.flatten([...resolved]) ?? {}
    // Native lowering expands shorthands; require all four edges before recording their common value.
    const sample: Sample = { borderColor:typeof flattened.borderTopColor === "string" && [flattened.borderRightColor,flattened.borderBottomColor,flattened.borderLeftColor].every(v=>v === flattened.borderTopColor) ? flattened.borderTopColor : undefined, opacity:typeof flattened.opacity === "number" ? flattened.opacity : undefined, padding:typeof flattened.paddingTop === "number" && [flattened.paddingRight,flattened.paddingBottom,flattened.paddingLeft].every(v=>v === flattened.paddingTop) ? flattened.paddingTop : undefined, borderWidth:typeof flattened.borderTopWidth === "number" && [flattened.borderRightWidth,flattened.borderBottomWidth,flattened.borderLeftWidth].every(v=>v === flattened.borderTopWidth) ? flattened.borderTopWidth : undefined }
    const identity: Identity = !previous.current ? "initial" : previous.current === styles ? "same" : "changed"
    const record = capture.samples.get(step.index) ?? { recipeArrayFresh:true }
    record[scope] = sample; record[scope === "parent" ? "parentIdentity" : "nestedIdentity"] = identity
    record.recipeArrayFresh = record.recipeArrayFresh && previousArray.current !== resolved
    capture.samples.set(step.index, record)
    previous.current = styles; previousArray.current = resolved
  }, [styles, resolved, step.index, capture, scope])
  return <View style={[...resolved]}><Text>{scope} · {step.selected ? "selected large compound" : "defaults"}</Text></View>
}
export function RecipeScopePanel() {
  const [run,setRun] = useState<{id:string; startedAt:string; plan:Step[]; capture:Capture}|null>(null)
  const [index,setIndex] = useState(0)
  const [report,setReport] = useState("")
  const requestedAt = useRef(0)
  const step = run?.plan[index]
  useLayoutEffect(() => {
    if (!run || !step) return
    const sample = run.capture.samples.get(index)
    run.capture.observations.push({ step:index, action:step.action, parent:sample?.parent ?? {}, nested:sample?.nested ?? {}, parentIdentity:sample?.parentIdentity ?? "absent", nestedIdentity:sample?.nestedIdentity ?? "absent", recipeArrayFresh:sample?.recipeArrayFresh ?? false, requestToLayoutEffectMs:performance.now()-requestedAt.current })
    if (index === run.plan.length-1) {
      const receipt = { formatVersion:1, runId:run.id, startedAt:run.startedAt, finishedAt:new Date().toISOString(), identity:{mode:process.env.EXPO_PUBLIC_CRUMBS_MODE, crumbsVersion:process.env.EXPO_PUBLIC_CRUMBS_VERSION,sourceRevision:process.env.EXPO_PUBLIC_CRUMBS_REVISION}, environment:{platform:Platform.OS,development:__DEV__,reactNative:Platform.constants?.reactNativeVersion ?? null}, scenario:{kind:"recipe-scopes",cycles:5,dwellMs:250,selection:"defaults then selected=true,size=large; repeat; parent then nested theme switch"}, summary:summarizeScopes(run.plan,run.capture.observations,run.capture.counts), counts:run.capture.counts, observations:run.capture.observations, profiler:run.capture.profiler, limits:"Functional instrumented commit/reference receipts; recipe arrays are uncached. Timings include scheduling and uncontrolled host load; not device frame, paint, retained-memory or calibrated performance qualification." }
      setReport(JSON.stringify(receipt,null,2)); setRun(null); return
    }
    const timer = setTimeout(()=>{requestedAt.current=performance.now();setIndex(i=>i+1)},250)
    return ()=>clearTimeout(timer)
  }, [run,index,step])
  return <View style={{flex:1,gap:8,backgroundColor:"#f2f4f8",padding:12}}>
    <Text>Recipe selection and independent nested scope changes · five cycles</Text>
    <Pressable accessibilityRole="button" disabled={!!run} onPress={()=>{setReport("");setIndex(0);requestedAt.current=performance.now();setRun({id:`${Date.now()}`,startedAt:new Date().toISOString(),plan:createScopePlan(5),capture:{samples:new Map(),counts:{mounts:0,unmounts:0},observations:[],profiler:[]}})}}><Text>{run ? `Cycle ${step?.cycle} · ${step?.action}` : "Run recipe and scopes"}</Text></Pressable>
    {run && step && <ThemeProvider theme={step.parentDark ? dark : light}>{step.mounted && <Profiler id="recipe-scopes" onRender={(_id,phase,actualDuration,baseDuration,_start,commitTime)=>run.capture.profiler.push({step:index,phase,actualDurationMs:actualDuration,baseDurationMs:baseDuration,commitTimeMs:commitTime})}><View key={step.cycle}><Probe scope="parent" step={step} capture={run.capture}/><ThemeProvider theme={step.nestedDark ? dark : light}><Probe scope="nested" step={step} capture={run.capture}/></ThemeProvider></View></Profiler>}</ThemeProvider>}
    {report !== "" && <><Text>Recipe/scope run complete · {JSON.parse(report).summary.verified ? "sequence verified" : "needs review"}</Text><TextInput accessibilityLabel="Recipe scope JSON report" multiline editable={false} value={report} style={{flex:1,fontSize:11,color:"#172438",backgroundColor:"white"}}/></>}
  </View>
}
