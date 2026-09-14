import { ScrollMeasurementPanel } from "./ScrollMeasurementPanel"
import { RecipeScopePanel } from "./RecipeScopePanel"
import { Profiler, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { ViewStyle, TextStyle } from "react-native"
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native"
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme"
import * as screen from "./screen.css"
import { dark, light } from "./theme.css"
import { createWorkloadPlan, summarizeWorkload, type LifecycleCounts, type WorkloadKind, type WorkloadObservation, type WorkloadStep } from "./measurement-plan"

// Stable module identity is part of this scenario, just as it is for a consumer hook.
const themedModule = { panel: screen.panel, copy: screen.copy }
const staticModule = StyleSheet.create({ panel: { backgroundColor: "#ffffff", padding: 16, borderRadius: 12, borderTopLeftRadius: 3, marginBottom: 12, transform: [{ translateX: 0 }, { scale: 1 }], shadowOffset: { width: 0, height: 2 } }, copy: { color: "#172438", fontSize: 16 } })
type ListStyles = { panel?: ViewStyle | undefined; copy?: TextStyle | undefined }
type Row = { id: string; label: string }
type Capture = {
  counts: LifecycleCounts
  identities: Map<number, WorkloadObservation["styleIdentity"]>
  observations: WorkloadObservation[]
  profiler: Array<{ step: number; phase: string; actualDurationMs: number; baseDurationMs: number; commitTimeMs: number }>
}

function MeasuredRow({ item, styles, capture }: { item: Row; styles: ListStyles; capture: Capture }) {
  useLayoutEffect(() => { capture.counts.rowMounts++; return () => { capture.counts.rowUnmounts++ } }, [capture])
  return <View style={styles.panel}><Text style={styles.copy}>{item.label}</Text></View>
}

function ObservedList({ styles, data, step, capture }: { styles: ListStyles; data: Row[]; step: WorkloadStep; capture: Capture }) {
  const previous = useRef<ListStyles | undefined>(undefined)
  useLayoutEffect(() => {
    capture.identities.set(step.index, previous.current === undefined ? "initial" : previous.current === styles ? "same" : "changed")
    previous.current = styles
  }, [styles, step.index, capture])
  useLayoutEffect(() => { capture.counts.listMounts++; return () => { capture.counts.listUnmounts++ } }, [capture])
  return <FlatList testID="crumbs-measure-list" data={data} keyExtractor={item => item.id}
    initialNumToRender={10} maxToRenderPerBatch={10} windowSize={5}
    renderItem={({ item }) => <MeasuredRow item={item} styles={styles} capture={capture} />} />
}

function ThemedList(props: Omit<Parameters<typeof ObservedList>[0], "styles">) {
  const styles = useThemedStyles(themedModule)
  return <ObservedList {...props} styles={styles} />
}

export function ListMeasurementPanel() {
  const [kind, setKind] = useState<WorkloadKind>("themed")
  const [size, setSize] = useState(100)
  const [run, setRun] = useState<{ id: string; startedAt: string; plan: ReturnType<typeof createWorkloadPlan>; capture: Capture } | null>(null)
  const [index, setIndex] = useState(0)
  const [report, setReport] = useState("")
  const [verified, setVerified] = useState(false)
  const requestedAt = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const active = run !== null
  const step = run?.plan.steps[index]
  const data = useMemo(() => Array.from({ length: size }, (_, id) => ({ id: String(id), label: `Measured component ${id + 1}` })), [size])
  useEffect(() => () => { clearTimeout(timer.current) }, [])
  useLayoutEffect(() => {
    if (!run || !step) return
    const observation: WorkloadObservation = { step: step.index, action: step.action, requestToLayoutEffectMs: performance.now() - requestedAt.current, styleIdentity: step.mounted ? run.capture.identities.get(step.index) ?? "absent" : "absent" }
    run.capture.observations.push(observation)
    if (index === run.plan.steps.length - 1) {
      const summary = summarizeWorkload(run.plan, run.capture.observations, run.capture.counts)
      const receipt = {
        formatVersion: 1, runId: run.id, startedAt: run.startedAt, finishedAt: new Date().toISOString(),
        identity: { mode: process.env.EXPO_PUBLIC_CRUMBS_MODE ?? "unverified", crumbsVersion: process.env.EXPO_PUBLIC_CRUMBS_VERSION ?? "unrecorded", sourceRevision: process.env.EXPO_PUBLIC_CRUMBS_REVISION ?? "unrecorded" },
        environment: { platform: Platform.OS, development: __DEV__, reactNative: Platform.constants?.reactNativeVersion ?? null, profilerAvailable: run.capture.profiler.length > 0 },
        scenario: { kind: run.plan.kind, rowCount: run.plan.rowCount, cycles: run.plan.cycles, initialNumToRender: 10, maxToRenderPerBatch: 10, windowSize: 5, dwellMs: 250, themedHookPlacement: "one stable-module hook per list, not per row" },
        summary, counts: { ...run.capture.counts }, observations: run.capture.observations, profiler: run.capture.profiler,
        limits: "Instrumented functional React lifecycle/reference receipts. Request-to-layout-effect is JS scheduling/commit delay, not render CPU or visual readiness. Profiler durations are React render work when available, not JS/UI frames. Virtualization means requested rows differ from mounted rows. No scroll, release-device, retained-memory, thermal or calibrated-budget qualification.",
      }
      const json = JSON.stringify(receipt, null, 2)
      setVerified(summary.complete && summary.memoIdentityVerified && summary.lifecycleBalanced); setReport(json); console.log(`CRUMBS_WORKLOAD_REPORT ${json}`); setRun(null)
      return
    }
    timer.current = setTimeout(() => { requestedAt.current = performance.now(); setIndex(value => value + 1) }, 250)
    return () => clearTimeout(timer.current)
  }, [run, index, step])

  function start() {
    if (active) return
    setReport(""); setVerified(false); setIndex(0); requestedAt.current = performance.now()
    setRun({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, startedAt: new Date().toISOString(), plan: createWorkloadPlan(kind, size, 5), capture: { counts: { listMounts: 0, listUnmounts: 0, rowMounts: 0, rowUnmounts: 0 }, identities: new Map(), observations: [], profiler: [] } })
  }
  return <View style={{ flex: 1, gap: 8, backgroundColor: "#f2f4f8", padding: 12 }}>
    <Text>List lifecycle workloads · five cycles</Text>
    <View style={{ flexDirection: "row", gap: 12 }}>{(["static", "themed"] as const).map(value => <Pressable key={value} disabled={active} accessibilityRole="button" accessibilityState={{ selected: kind === value, disabled: active }} onPress={() => setKind(value)}><Text>{value === "static" ? "Static list" : "Themed list"}{kind === value ? " ✓" : ""}</Text></Pressable>)}</View>
    <View style={{ flexDirection: "row", gap: 12 }}>{([25, 100, 1000] as const).map(value => <Pressable key={value} disabled={active} accessibilityRole="button" accessibilityState={{ selected: size === value, disabled: active }} onPress={() => setSize(value)}><Text>{value} rows{size === value ? " ✓" : ""}</Text></Pressable>)}</View>
    <Pressable accessibilityRole="button" disabled={active} accessibilityState={{ disabled: active }} onPress={start}><Text>{active ? `Cycle ${step?.cycle} · ${step?.action}` : "Run 5 cycles"}</Text></Pressable>
    <Text>Mount → rerender → switch theme → unmount. Instrumented lifecycle check; device frame and memory measurements are separate.</Text>
    {run && step && <ThemeProvider theme={step.theme === "dark" ? dark : light}><View style={{ flex: 1 }}>{step.mounted && <Profiler id="measured-list" onRender={(_id, phase, actualDuration, baseDuration, _startTime, commitTime) => { run.capture.profiler.push({ step: step.index, phase, actualDurationMs: actualDuration, baseDurationMs: baseDuration, commitTimeMs: commitTime }) }}>
      {run.plan.kind === "themed" ? <ThemedList key={step.cycle} data={data} step={step} capture={run.capture} /> : <ObservedList key={step.cycle} data={data} step={step} capture={run.capture} styles={staticModule} />}
    </Profiler>}</View></ThemeProvider>}
    {report !== "" && <><Text testID="crumbs-measure-complete">Run complete · {verified ? "sequence verified" : "needs review"} · copy JSON</Text><TextInput testID="crumbs-measure-report" accessibilityLabel="Measurement JSON report" multiline editable={false} value={report} style={{ flex: 1, fontSize: 11, color: "#172438", backgroundColor: "#ffffff" }} /></>}
  </View>
}

export function MeasurementPanel() {
  const [scenario, setScenario] = useState("list")
  return <View style={{flex:1}}><View style={{flexDirection:"row",gap:12}}>{["list","recipe/scopes","scroll"].map(value=><Pressable key={value} accessibilityRole="button" onPress={()=>setScenario(value)}><Text>{value === "list" ? "List workloads" : value === "scroll" ? "Scroll workloads" : "Recipe/scope workloads"}</Text></Pressable>)}</View>{scenario === "list" ? <ListMeasurementPanel/> : scenario === "scroll" ? <ScrollMeasurementPanel/> : <RecipeScopePanel/>}</View>
}
