/** Qualification-only native screen. Copied into an owned app temporarily; never a package export. */
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Platform, Text, View } from "react-native"
import { CrumbsDevtoolsProvider, useCrumbsInspectorTarget, useInspectorRegistry } from "../../packages/css/src/devtools/native/provider"
import { CrumbsDevtoolsWidget } from "../../packages/css/src/devtools/native/widget"
import { explainInspectorInput } from "../../packages/css/src/devtools/native/capture"
import type { InspectorRegistry } from "../../packages/css/src/devtools/native/registry"
import type { CrumbsInspectorInput } from "../../packages/css/src/devtools/native/model"

type Metrics = { parents: number; getters: number; explanations: number; durations: number[]; store?: InspectorRegistry }
type Control = { update: (value: number) => Promise<void> }
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
function ensure(condition: boolean, message: string): void { if (!condition) throw new Error(message) }
function retained(store: InspectorRegistry) { const s = store.getSnapshot(); return { targets: s.targets.length, reports: Number(!!s.capture) } }

export function createNativeCostScreen(fixture: CrumbsInspectorInput["module"], app: string, endpoint: string, runId: string) {
  function Probe({ metrics }: { metrics: Metrics }) {
    useCrumbsInspectorTarget({ label: "Native cost override", exportPath: ["override"], getInput: () => {
      metrics.getters++
      return { module: { ...fixture }, exportPath: ["override"], current: {} }
    } })
    return null
  }
  function Target({ metrics, enabled, value }: { metrics: Metrics; enabled: boolean; value: number }) {
    metrics.parents++
    return <View style={{ padding: 12, opacity: 0.8 }}>
      {enabled && <Probe metrics={metrics} />}
      <Text>Native fixture update {value}</Text>
    </View>
  }
  function Case({ metrics, enabled, ready }: { metrics: Metrics; enabled: boolean; ready: (c: Control) => void }) {
    metrics.store = useInspectorRegistry()
    const [value, setValue] = useState(0)
    const committed = useRef<(() => void) | null>(null)
    useLayoutEffect(() => { committed.current?.(); committed.current = null }, [value])
    useEffect(() => { ready({ update: next => new Promise(resolve => { committed.current = resolve; setValue(next) }) }) }, [])
    return <View style={{ flex: 1 }}>
      <Target metrics={metrics} enabled={enabled} value={value} />
      {enabled && <CrumbsDevtoolsWidget copyText={async () => {}} insets={{ top: 60, bottom: 30, left: 12, right: 12 }} />}
    </View>
  }
  return function NativeCostScreen() {
    const [active, setActive] = useState<{ enabled: boolean; metrics: Metrics; ready: (c: Control) => void } | null>(null)
    const [status, setStatus] = useState("Running native cost qualification")
    useEffect(() => {
      let cancelled = false
      async function run() {
        const rows: Record<string, unknown> = {}
        for (const enabled of [false, true]) {
          const metrics: Metrics = { parents: 0, getters: 0, explanations: 0, durations: [] }
          ;(globalThis as any).__crumbsNativeCostObserver = () => { metrics.explanations++ }
          const control = await new Promise<Control>(ready => setActive({ enabled, metrics, ready }))
          const start = performance.now()
          for (let i = 1; i <= 100; i++) { await control.update(i); await frame() }
          const elapsedMs = performance.now() - start
          const store = metrics.store!
          const name = enabled ? "closed" : "disabled"
          rows[name] = { parentRenders: metrics.parents, getters: metrics.getters, explanations: metrics.explanations, ...retained(store), updates: 100, elapsedMs }
          ensure(metrics.parents === 101, `${name}: expected 101 committed target renders`)
          ensure(metrics.getters === 0 && metrics.explanations === 0, `${name}: unexpected inspection work`)
          ensure(retained(store).reports === 0 && retained(store).targets === Number(enabled), `${name}: unexpected retained state`)
          if (enabled) {
            const parentCount = metrics.parents
            store.open(); await frame()
            const id = store.getSnapshot().targets[0]!.id
            for (let i = 0; i < 20; i++) {
              const result = store.capture(id, input => {
                const began = performance.now()
                const report = explainInspectorInput(input)
                metrics.durations.push(performance.now() - began)
                return report
              })
              if (!result.ok) throw new Error("capture failed")
              ensure(result.capture.report.composition.properties.some(p => p.property === "opacity" && p.value === 0.8 && p.overridden.some(d => d.value === 0.4)), "compiled fixture winner mismatch")
              await frame()
            }
            rows.selected = { parentRendersFromInspector: metrics.parents - parentCount, getters: metrics.getters, explanations: metrics.explanations, ...retained(store), explanationMs: metrics.durations }
            ensure(metrics.parents === parentCount && metrics.getters === 20 && metrics.explanations === 20, "selected: work/render count mismatch")
            ensure(retained(store).reports === 1 && retained(store).targets === 1, "selected: retained state mismatch")
          }
          setActive(null); await frame(); await frame()
          rows[`${name}Disposed`] = retained(store)
          ensure(retained(store).reports === 0 && retained(store).targets === 0, `${name}: references retained after disposal`)
          if (cancelled) return
        }
        delete (globalThis as any).__crumbsNativeCostObserver
        const receipt = { type: "crumbs.m9.3a.native-cost", version: 1, runId, app, platform: Platform.OS, platformVersion: Platform.Version, engine: (globalThis as any).HermesInternal ? "Hermes" : "unknown", reactNativeVersion: Platform.constants.reactNativeVersion, mode: "development", implementation: "same native source implementation; qualification-only screen in SDK58 app", rows, limits: "Native functional/render/retention counts and diagnostic JS timings; not release frame, memory or physical-device performance." }
        const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(receipt) })
        ensure(response.ok, `receipt upload failed: ${response.status}`)
        setStatus(`Native cost passed: ${app} ${Platform.OS}`)
      }
      run().catch(error => { setStatus(`Native cost failed: ${String(error)}`); void fetch(endpoint, { method: "POST", body: JSON.stringify({ app, runId, platform: Platform.OS, error: String(error) }) }) })
      return () => { cancelled = true }
    }, [])
    return <View style={{ flex: 1, paddingTop: 70, backgroundColor: "#fff" }}>
      <Text style={{ color: "#111", fontSize: 18 }}>{status}</Text>
      {active && <CrumbsDevtoolsProvider key={String(active.enabled)}><Case {...active} /></CrumbsDevtoolsProvider>}
    </View>
  }
}
