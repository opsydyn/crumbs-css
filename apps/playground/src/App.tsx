import { InspectorHost, DevtoolsPanel } from "./devtools/adapter"
import { useRef, useState } from "react"
import { FlatList, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native"
import { Portal, PortalHost } from "@rn-primitives/portal"
import { resolveRecipeStyle } from "@opsydyn/crumbs-css/theme/recipes"
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import * as screen from "./screen.css"
import { dark, light } from "./theme.css"
import { MeasurementPanel } from "./MeasurementPanel"
import { GradientAcceptancePanel } from "./GradientAcceptancePanel"
import {RuntimeExtensionPanel} from './RuntimeExtensionPanel'
import {TokenAlgebraPanel} from "./TokenAlgebraPanel"
import {NativeMotionPanel} from "./NativeMotionPanel"
import {ContainerConditionsPanel} from "./ContainerConditionsPanel"
import {LocalVarsPanel} from "./LocalVarsPanel"
import { TokenStylesPanel } from "./TokenStylesPanel"

const rows = Array.from({ length: 1000 }, (_, id) => ({ id: String(id), label: `Design system component ${id + 1}` }))
const { screenTitle, ...styles } = screen
type Journey = "Devtools" | "List" | "Form" | "Scopes" | "Measure" | "Gradients" | "Token styles" | "Local styles" | "Container conditions" | "Native motion" | "Token algebra" | "Runtime extensions"
const scrollProbeEnabled = __DEV__ && process.env.EXPO_PUBLIC_CRUMBS_SCROLL_PROBE === "true"

function ScopeCard() {
  const s = useThemedStyles(styles)
  return <View style={s.panel}><Text style={s.copy}>Independent nested theme scope</Text></View>
}

function Playground({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  const s = useThemedStyles(styles)
  const [journey, setJourney] = useState<Journey>("List")
  const [name, setName] = useState("")
  const [enabled, setEnabled] = useState(false)
  const [portal, setPortal] = useState(false)
  const [scrollProbe, setScrollProbe] = useState({ y: 0, first: 1, viewport: 0, content: 0, starts: 0, moves: 0, ends: 0, drags: 0 })
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index?: number | null }> }) => {
    const index = viewableItems[0]?.index
    if (index !== null && index !== undefined) setScrollProbe(previous => ({ ...previous, first: index + 1 }))
  }).current
  return <View style={s.root}>
    <Text style={s.title}>{screenTitle}</Text>
    <Text style={s.copy}>{process.env.EXPO_PUBLIC_CRUMBS_MODE ?? "unverified"} · Crumbs {process.env.EXPO_PUBLIC_CRUMBS_VERSION ?? "unrecorded"}</Text>
    <Text style={s.copy}>Revision {process.env.EXPO_PUBLIC_CRUMBS_REVISION ?? "unrecorded"}</Text>
    <Pressable accessibilityRole="button" onPress={toggle} style={[...resolveRecipeStyle(s.button)]}><Text style={s.copy}>Switch to {isDark ? "light" : "dark"}</Text></Pressable>
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>{(["List", "Form", "Scopes", "Measure", "Gradients", "Token styles", "Local styles", "Container conditions", "Native motion", "Token algebra", "Runtime extensions", ...(__DEV__ ? ["Devtools"] as const : [])] as const).map(item =>
      <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: journey === item }} onPress={() => setJourney(item)} style={[...resolveRecipeStyle(s.button, { selected: journey === item })]}><Text style={s.copy}>{item}</Text></Pressable>
    )}</View>
    {journey === "Devtools" && <ScrollView><DevtoolsPanel /></ScrollView>}
    {journey === "List" && __DEV__ && scrollProbeEnabled && <Text testID="crumbs-scroll-probe" style={{ ...s.copy, fontSize: 12 }}>
      Scroll probe: y={scrollProbe.y} first={scrollProbe.first} viewport={scrollProbe.viewport} content={scrollProbe.content}{"\n"}
      Touch: starts={scrollProbe.starts} moves={scrollProbe.moves} ends={scrollProbe.ends} drags={scrollProbe.drags}
    </Text>}
    {journey === "List" && <FlatList
      testID="crumbs-component-list"
      data={rows}
      keyExtractor={row => row.id}
      renderItem={({ item }) => <View style={s.panel}><Text style={s.copy}>{item.label}</Text></View>}
      onLayout={scrollProbeEnabled ? event => { const viewport = Math.round(event.nativeEvent.layout.height); setScrollProbe(previous => ({ ...previous, viewport })) } : undefined}
      onContentSizeChange={scrollProbeEnabled ? (_width, height) => setScrollProbe(previous => ({ ...previous, content: Math.round(height) })) : undefined}
      onTouchStart={scrollProbeEnabled ? () => setScrollProbe(previous => ({ ...previous, starts: previous.starts + 1 })) : undefined}
      onTouchMove={scrollProbeEnabled ? () => setScrollProbe(previous => ({ ...previous, moves: previous.moves + 1 })) : undefined}
      onTouchEnd={scrollProbeEnabled ? () => setScrollProbe(previous => ({ ...previous, ends: previous.ends + 1 })) : undefined}
      onScrollBeginDrag={scrollProbeEnabled ? () => setScrollProbe(previous => ({ ...previous, drags: previous.drags + 1 })) : undefined}
      onScroll={scrollProbeEnabled ? event => { const y = Math.round(event.nativeEvent.contentOffset.y); setScrollProbe(previous => ({ ...previous, y })) } : undefined}
      scrollEventThrottle={scrollProbeEnabled ? 100 : undefined}
      viewabilityConfig={scrollProbeEnabled ? viewabilityConfig : undefined}
      onViewableItemsChanged={scrollProbeEnabled ? onViewableItemsChanged : undefined}
    />}
    {journey === "Form" && <ScrollView><View style={s.panel}>
      <Text style={s.copy}>Component name</Text><TextInput accessibilityLabel="Component name" style={s.input} value={name} onChangeText={setName} />
      <Text style={s.copy}>Enabled</Text><Switch accessibilityLabel="Enabled" value={enabled} onValueChange={setEnabled} />
      <Text style={s.copy}>{name || "Untitled"} · {enabled ? "enabled" : "disabled"}</Text>
    </View></ScrollView>}
    {journey === "Scopes" && <ScrollView>
      <ScopeCard /><ThemeProvider theme={isDark ? light : dark}><ScopeCard /></ThemeProvider>
      <Pressable accessibilityRole="button" style={[...resolveRecipeStyle(s.button)]} onPress={() => setPortal(true)}><Text style={s.copy}>Open portal from nested theme</Text></Pressable>
      {portal && <Portal name="scope-feedback"><ThemeProvider theme={isDark ? light : dark}><PortalContent close={() => setPortal(false)} /></ThemeProvider></Portal>}
      <Text style={s.copy}>The portal explicitly bridges the source theme to its host. Check that it matches the nested scope.</Text>
    </ScrollView>}
    {journey === "Measure" && <MeasurementPanel />}
    {journey === "Gradients" && <GradientAcceptancePanel />}
    {journey === "Token styles" && <ScrollView><TokenStylesPanel isDark={isDark} /></ScrollView>}
    {journey === "Runtime extensions" && <ScrollView><RuntimeExtensionPanel /></ScrollView>}
    {journey === "Token algebra" && <ScrollView><TokenAlgebraPanel /></ScrollView>}
    {journey === "Native motion" && <ScrollView><NativeMotionPanel /></ScrollView>}
    {journey === "Container conditions" && <ScrollView><ContainerConditionsPanel /></ScrollView>}
    {journey === "Local styles" && <ScrollView><LocalVarsPanel /></ScrollView>}
    <PortalHost />
  </View>
}

function PortalContent({ close }: { close: () => void }) {
  const s = useThemedStyles(styles)
  return <View style={s.overlay}><Text style={s.copy}>Portal theme probe</Text><Pressable accessibilityRole="button" onPress={close}><Text style={s.copy}>Close</Text></Pressable></View>
}

export default function App() {
  const [isDark, setDark] = useState(false)
  return <InspectorHost><ThemeProvider theme={isDark ? dark : light}><Playground isDark={isDark} toggle={() => setDark(value => !value)} /></ThemeProvider></InspectorHost>
}
