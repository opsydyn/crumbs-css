import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import type { ComponentRef, ReactElement } from "react"
import { AccessibilityInfo, findNodeHandle, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { explainInspectorInput, prepareInspectorCopy } from "./capture"
import { useInspectorRegistry } from "./provider"
import type { CrumbsDevtoolsCapture, CrumbsDevtoolsWidgetProps, CrumbsInspectorTargetId } from "./model"

function Action({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>
}
function focus(node: ComponentRef<typeof View> | null) {
  if (!node) return
  if (Platform.OS === "web") node.focus?.()
  else { const tag = findNodeHandle(node); if (typeof tag === "number") AccessibilityInfo.setAccessibilityFocus(tag) }
}
export function CrumbsDevtoolsWidget(props: CrumbsDevtoolsWidgetProps): ReactElement {
  const store = useInspectorRegistry()
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  const launcher = useRef<ComponentRef<typeof View>>(null), heading = useRef<ComponentRef<typeof Text>>(null)
  const wasOpen = useRef(false)
  const [preview, setPreview] = useState<{ capture: CrumbsDevtoolsCapture; redactor: typeof props.redactReport; text: string } | null>(null)
  const [notice, setNotice] = useState<{ capture: CrumbsDevtoolsCapture | null; text: string } | null>(null)
  const [copying, setCopying] = useState(false)
  const mounted = useRef(false)
  const redactor = useRef(props.redactReport)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => { redactor.current = props.redactReport; setPreview(null) }, [state.capture, state.stale, state.open, props.redactReport])
  useEffect(() => { setNotice(null) }, [state.open, props.redactReport])
  useEffect(() => {
    if (wasOpen.current && !state.open && Platform.OS === "web") focus(launcher.current)
    wasOpen.current = state.open
    if (state.open && Platform.OS === "web" && typeof window !== "undefined") {
      const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") store.close() }
      window.addEventListener("keydown", onKey)
      return () => window.removeEventListener("keydown", onKey)
    }
  }, [state.open, store])
  const placement = props.placement ?? "bottom-right"
  const validPlacement = ["top-left", "top-right", "bottom-left", "bottom-right"].includes(placement)
  const insets = { top: 16, right: 16, bottom: 16, left: 16, ...props.insets }
  const validInsets = Object.values(insets).every(value => typeof value === "number" && Number.isFinite(value) && value >= 0)
  if (!validPlacement || !validInsets) return <Text accessibilityRole="alert">Crumbs inspector: invalid placement or insets</Text>
  const position = { [placement.startsWith("top") ? "top" : "bottom"]: placement.startsWith("top") ? insets.top : insets.bottom, [placement.endsWith("left") ? "left" : "right"]: placement.endsWith("left") ? insets.left : insets.right }
  const capture = state.capture
  const prepared = preview && preview.capture === capture && preview.redactor === props.redactReport && !state.stale ? preview : null
  const visibleNotice = notice?.capture === capture && !state.stale ? notice.text : null
  function inspect(id: CrumbsInspectorTargetId) {
    setPreview(null); setNotice(null)
    const result = store.capture(id, explainInspectorInput)
    if (!result.ok) setNotice({ capture: null, text: `Cannot inspect: ${result.code}. Select another target or refresh.` })
  }
  function prepare() {
    if (!capture || state.stale) return
    const result = prepareInspectorCopy(capture, props.redactReport)
    if (result.ok) setPreview({ capture, redactor: props.redactReport, text: result.text })
    else { setPreview(null); setNotice({ capture, text: `Cannot copy: ${result.code}. Report remains available.` }) }
  }
  async function copy() {
    if (!prepared || copying || store.getSnapshot().stale || store.getSnapshot().capture !== prepared.capture) return
    setCopying(true)
    let message = "Copied report"
    try { await props.copyText(prepared.text) } catch { message = "Copy failed — try again" }
    if (!mounted.current) return
    setCopying(false)
    const current = store.getSnapshot()
    if (current.open && !current.stale && current.capture === prepared.capture && redactor.current === prepared.redactor) setNotice({ capture: prepared.capture, text: message })
  }
  return <>
    <Pressable ref={launcher} accessibilityRole="button" accessibilityLabel="Open Crumbs inspector" onPress={() => store.open()} style={[styles.launcher, position]}><Text style={styles.buttonText}>Crumbs</Text></Pressable>
    {state.open && <Modal visible transparent animationType="none" onRequestClose={() => store.close()} onShow={() => focus(heading.current)}>
      <View style={[styles.backdrop, { paddingTop: insets.top, paddingRight: insets.right, paddingBottom: insets.bottom, paddingLeft: insets.left }]}>
        <View accessibilityViewIsModal style={styles.sheet}>
          <Text ref={heading} accessible accessibilityRole="header" style={styles.title}>Crumbs inspector</Text>
          <Action label="Close inspector" onPress={() => store.close()} />
          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            <Text style={styles.text}>Supplied Crumbs inputs</Text>
            <Text style={styles.muted}>Transient pressed/animation state is not captured</Text>
            {state.capacityReached && <Text accessibilityRole="alert" style={styles.warning}>Target limit reached this session (200). Some targets may be missing; remount the provider to reset.</Text>}
            {!state.targets.length && <Text style={styles.text}>No registered targets. Add a development probe inside your theme scope.</Text>}
            {state.targets.map(target => <View key={target.id}><Action label={`Inspect ${target.label}`} onPress={() => inspect(target.id)} /><Text style={styles.muted}>{target.id} · {target.exportPath.join(".")}</Text></View>)}
            {state.selectedId && <Action label="Refresh explanation" onPress={() => inspect(state.selectedId!)} />}
            {state.stale && <Text accessibilityRole="alert" style={styles.warning}>Stale — refresh to inspect current inputs</Text>}
            {capture && <>
              <Text style={styles.title}>{capture.target.label} · revision {capture.revision}</Text>
              <Text style={styles.text}>Coverage: {capture.report.coverage.status} {capture.report.coverage.reasons.join(", ")}</Text>
              <Text selectable style={styles.code}>{JSON.stringify(capture.report.resolution.value, null, 2)}</Text>
              {capture.report.composition.properties.map((property, index) => <View key={index} style={styles.property}>
                <Text style={styles.title}>{property.slot ? `${property.slot}.` : ""}{property.property}</Text>
                <Text selectable style={styles.code}>{JSON.stringify(property.value)}</Text>
                <Text style={styles.text}>Winner: {property.winner ? `${property.winner.sourceId} · ${property.winner.authoredProperty}` : "unavailable"}</Text>
                {property.overridden.map(d => <Text key={d.id} style={styles.muted}>Overridden: {d.sourceId} · {d.authoredProperty} = {JSON.stringify(d.value)}</Text>)}
                <Text style={styles.muted}>Coverage: {property.coverage.status} {property.coverage.reasons.join(", ")}</Text>
              </View>)}
              <Text style={styles.title}>Branches and conditions</Text>
              <Text selectable style={styles.code}>{JSON.stringify({ branches: capture.report.resolution.branches, conditions: capture.report.conditions, tokens: capture.report.dependencies.activeTokens }, null, 2)}</Text>
              <Action label="Preview report" disabled={state.stale} onPress={prepare} />
            </>}
            {prepared && <><Text style={styles.warning}>Review before copying: style values may contain private data.</Text><Text selectable testID="crumbs-inspector-copy-preview" style={styles.code}>{prepared.text}</Text><Action label="Copy report" disabled={copying} onPress={() => { void copy() }} /></>}
            {visibleNotice && <Text accessibilityRole="alert" style={styles.text}>{visibleNotice}</Text>}
          </ScrollView>
        </View>
      </View>
    </Modal>}
  </>
}
const styles = StyleSheet.create({
  launcher: { position: "absolute", zIndex: 10000, minHeight: 44, minWidth: 44, padding: 12, borderRadius: 24, backgroundColor: "#194b38", justifyContent: "center", alignItems: "center" },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { maxHeight: "90%", flexShrink: 1, backgroundColor: "#101c17", borderRadius: 16, padding: 16, gap: 8 },
  scroll: { flexShrink: 1 }, content: { gap: 10, paddingBottom: 20 },
  button: { minHeight: 44, minWidth: 44, borderRadius: 8, padding: 12, backgroundColor: "#285d46", justifyContent: "center" },
  buttonText: { color: "#ffffff", fontWeight: "700" }, disabled: { opacity: 0.45 },
  title: { color: "#ffffff", fontSize: 17, fontWeight: "700" }, text: { color: "#e0eee7", fontSize: 14 },
  muted: { color: "#b6c9be", fontSize: 12 }, code: { color: "#d5efdf", fontSize: 12 }, warning: { color: "#ffe1a0", fontSize: 14 },
  property: { padding: 10, gap: 6, borderWidth: 1, borderColor: "#476354", borderRadius: 8 },
})
