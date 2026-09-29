import {
  createNativeConditionResolver,
  useThemedStyles,
  type NativeConditionSnapshot,
} from "@opsydyn/crumbs-css/theme/core"
import { useEffect, useMemo } from "react"
import { Animated, Platform, Text, View, useWindowDimensions } from "react-native"
import { useNativeConditions } from "./AppThemeProvider"
import { ReferenceButton } from "./ReferenceButton"
import * as s from "./NativeAccessibilityContexts.css"

const resolveMotionDuration = createNativeConditionResolver(
  [
    { when: { motion: "reduced" }, value: 0 },
    { value: 550 },
  ],
  0,
)

export function NativeAccessibilityContexts() {
  const { snapshot, update } = useNativeConditions()
  const { fontScale } = useWindowDimensions()

  return (
    <NativeAccessibilityContextContent
      snapshot={snapshot}
      fontScale={fontScale}
      onDirectionChange={(isRTL) => update({ isRTL })}
    />
  )
}

type NativeAccessibilityContextContentProps = {
  readonly snapshot: NativeConditionSnapshot
  readonly fontScale: number
  readonly onDirectionChange: (isRTL: boolean) => void
}

function NativeAccessibilityContextContent({
  snapshot,
  fontScale,
  onDirectionChange,
}: NativeAccessibilityContextContentProps) {
  const styles = useThemedStyles(s)
  const progress = useMemo(() => new Animated.Value(0), [])
  const duration = resolveMotionDuration(snapshot)
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 112] })

  useEffect(() => {
    if (snapshot.motion !== "reduced") return
    progress.stopAnimation()
    progress.setValue(1)
  }, [progress, snapshot.motion])

  const runMotionExample = () => {
    progress.stopAnimation()
    progress.setValue(0)
    if (duration === 0) {
      progress.setValue(1)
      return
    }
    Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: Platform.OS !== "web",
    }).start()
  }

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.kicker}>Native accessibility contexts</Text>
        <Text style={styles.title}>One theme contract, responsive to native settings</Text>
        <Text style={styles.body}>
          The preview reads React Native dimensions and accessibility preferences, then resolves
          Crumbs' finite condition snapshot.
        </Text>
      </View>

      <View style={styles.example}>
        <Text style={styles.exampleTitle}>Font scaling</Text>
        <Text allowFontScaling style={styles.scalingText}>
          This text keeps React Native font scaling enabled. Current scale: {fontScale.toFixed(2)}
        </Text>
        <Text style={styles.body}>
          Crumbs bucket: {snapshot.fontScaleBucket}
        </Text>
      </View>

      <View style={styles.example}>
        <Text style={styles.exampleTitle}>Logical layout</Text>
        <Text style={styles.body}>Native condition direction: {snapshot.direction.toUpperCase()}</Text>
        <View style={[styles.logicalPreview, { direction: snapshot.direction }]}>
          <Text style={styles.logicalStart}>Logical start</Text>
          <Text style={styles.logicalEnd}>Logical end</Text>
        </View>
        <ReferenceButton onPress={() => onDirectionChange(snapshot.direction !== "rtl")} tone="neutral">
          Preview {snapshot.direction === "rtl" ? "LTR" : "RTL"} layout
        </ReferenceButton>
        <Text style={styles.body}>
          This control previews the native direction style. Device locale direction is sampled from
          I18nManager when the app starts.
        </Text>
      </View>

      <View style={styles.example}>
        <Text style={styles.exampleTitle}>Reduced motion</Text>
        <Text style={styles.body}>Native preference: {snapshot.motion}</Text>
        <View style={styles.motionTrack}>
          <Animated.View style={[styles.motionMarker, { transform: [{ translateX }] }]} />
        </View>
        <ReferenceButton onPress={runMotionExample} tone="neutral">
          Run motion preview
        </ReferenceButton>
        <Text style={styles.body}>
          Reduced motion completes immediately; full motion uses a short native-driver transition.
        </Text>
      </View>

      <View style={styles.example}>
        <Text style={styles.exampleTitle}>Supported contrast preference</Text>
        <Text style={styles.body}>Native condition: {snapshot.contrast}</Text>
        <ContrastPreview />
        <Text style={styles.body}>
          iOS darker system colours and Android high text contrast map to “more”. Other contrast
          values remain available to custom adapters.
        </Text>
      </View>
    </View>
  )
}

function ContrastPreview() {
  const styles = useThemedStyles(s)
  return (
    <View style={styles.contrastPreview}>
      <Text style={styles.contrastCopy}>Primary copy on the declared panel surface.</Text>
      <Text style={styles.contrastMuted}>Supporting copy on the declared panel surface.</Text>
      <Text style={styles.contrastAccent}>Accent text on the declared panel surface.</Text>
    </View>
  )
}
