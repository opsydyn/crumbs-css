import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import {
  createNativeAccessibilityConditionSource,
  type NativeAccessibilityPreferenceApi,
  type NativeAccessibilityPreferenceEvent,
} from "../src/accessibility/native-condition-source"
import { buildReferenceContrastReview, contrastRatio } from "../src/accessibility/contrast-review"
import { createNativeConditionStore } from "@opsydyn/crumbs-css/theme/core"

type PreferenceReads = Partial<Record<NativeAccessibilityPreferenceEvent, () => Promise<boolean>>>

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

function preferenceApi(initial: {
  readonly reduceMotion?: boolean
  readonly highTextContrast?: boolean
  readonly darkerSystemColors?: boolean
} = {}, pendingReads: PreferenceReads = {}) {
  const listeners = new Map<NativeAccessibilityPreferenceEvent, Set<(enabled: boolean) => void>>()
  const removed: NativeAccessibilityPreferenceEvent[] = []
  const reads: NativeAccessibilityPreferenceEvent[] = []

  const query = (event: NativeAccessibilityPreferenceEvent, fallback: boolean) => {
    reads.push(event)
    return pendingReads[event]?.() ?? Promise.resolve(fallback)
  }

  const api: NativeAccessibilityPreferenceApi = {
    isReduceMotionEnabled: () => query("reduceMotionChanged", initial.reduceMotion ?? false),
    isHighTextContrastEnabled: () => query("highTextContrastChanged", initial.highTextContrast ?? false),
    isDarkerSystemColorsEnabled: () => query("darkerSystemColorsChanged", initial.darkerSystemColors ?? false),
    addEventListener: (event, listener) => {
      const entries = listeners.get(event) ?? new Set()
      entries.add(listener)
      listeners.set(event, entries)
      return {
        remove: () => {
          removed.push(event)
          entries.delete(listener)
        },
      }
    },
  }

  return {
    api,
    emit(event: NativeAccessibilityPreferenceEvent, enabled: boolean) {
      for (const listener of listeners.get(event) ?? []) listener(enabled)
    },
    reads,
    removed,
  }
}

describe("M10.3 native accessibility contexts", () => {
  it("reads iOS motion and darker-colour settings, observes updates, and detaches listeners", async () => {
    const source = preferenceApi({ reduceMotion: true, darkerSystemColors: true })
    const store = createNativeConditionStore({
      initial: { platform: "ios", width: 390, height: 844, fontScale: 1.3, isRTL: true },
      sources: [createNativeAccessibilityConditionSource("ios", source.api)],
    })
    const notify = () => undefined
    const unsubscribe = store.subscribe(notify)
    await Promise.resolve()

    expect(store.getSnapshot()).toMatchObject({
      platform: "ios",
      direction: "rtl",
      fontScaleBucket: "extraLarge",
      motion: "reduced",
      contrast: "more",
    })
    expect(source.reads).toEqual(["reduceMotionChanged", "darkerSystemColorsChanged"])

    source.emit("reduceMotionChanged", false)
    source.emit("darkerSystemColorsChanged", false)
    expect(store.getSnapshot()).toMatchObject({ motion: "full", contrast: "normal" })

    unsubscribe()
    expect(source.removed.sort()).toEqual(["darkerSystemColorsChanged", "reduceMotionChanged"])
    store.dispose()
  })

  it("uses Android high-text-contrast settings without probing the iOS preference", async () => {
    const source = preferenceApi({ reduceMotion: false, highTextContrast: true })
    const store = createNativeConditionStore({
      initial: { platform: "android" },
      sources: [createNativeAccessibilityConditionSource("android", source.api)],
    })
    const unsubscribe = store.subscribe(() => undefined)
    await Promise.resolve()

    expect(store.getSnapshot()).toMatchObject({ platform: "android", contrast: "more", motion: "full" })
    expect(source.reads).toEqual(["reduceMotionChanged", "highTextContrastChanged"])
    unsubscribe()
    store.dispose()
  })

  it("does not let delayed initial reads overwrite newer native preference events", async () => {
    const motionRead = deferred<boolean>()
    const contrastRead = deferred<boolean>()
    const source = preferenceApi({}, {
      reduceMotionChanged: () => motionRead.promise,
      darkerSystemColorsChanged: () => contrastRead.promise,
    })
    const store = createNativeConditionStore({
      initial: { platform: "ios" },
      sources: [createNativeAccessibilityConditionSource("ios", source.api)],
    })
    let notifications = 0
    const unsubscribe = store.subscribe(() => { notifications += 1 })

    source.emit("reduceMotionChanged", true)
    source.emit("darkerSystemColorsChanged", true)
    const notificationsAfterEvents = notifications
    motionRead.resolve(false)
    contrastRead.resolve(false)
    await Promise.resolve()

    expect(store.getSnapshot()).toMatchObject({ motion: "reduced", contrast: "more" })
    expect(notifications).toBe(notificationsAfterEvents)
    unsubscribe()
    store.dispose()
  })

  it("ignores initial reads that resolve after their subscriber unsubscribes", async () => {
    const motionRead = deferred<boolean>()
    const source = preferenceApi({}, { reduceMotionChanged: () => motionRead.promise })
    const nativeSource = createNativeAccessibilityConditionSource("ios", source.api)
    const updates: unknown[] = []
    const unsubscribe = nativeSource.subscribe((patch) => updates.push(patch))
    unsubscribe()
    motionRead.resolve(false)
    await Promise.resolve()

    expect(updates).toEqual([])
    expect(nativeSource.read()).toMatchObject({ reducedMotion: true })
  })

  it("keeps a deterministic contrast report and labels uncomposited alpha cases unknown", () => {
    const report = buildReferenceContrastReview()
    const knownPairs = report.pairs.filter((pair) => pair.status !== "unknown")
    const highContrastPairs = knownPairs.filter((pair) => pair.context.contrast === "more")
    const foundryLightAccent = report.pairs.find((pair) =>
      pair.id === "foundry/light/normal/accent-on-panel",
    )
    const foundryLightAccentOnCanvas = report.pairs.find((pair) =>
      pair.id === "foundry/light/normal/accent-on-canvas",
    )
    const accentMutedTextPairs = report.pairs.filter((pair) =>
      [
        "foundry/light/normal/copy-on-accent-muted",
        "foundry/light/normal/muted-on-accent-muted",
        "foundry/light/normal/accent-on-accent-muted",
        "signal/dark/normal/copy-on-accent-muted",
        "signal/dark/normal/muted-on-accent-muted",
        "signal/dark/normal/accent-on-accent-muted",
      ].includes(pair.id),
    )

    expect(knownPairs.length).toBeGreaterThan(0)
    expect(knownPairs.filter((pair) => pair.status === "fail")).toEqual([])
    expect(highContrastPairs.every((pair) => pair.ratio !== null && pair.ratio >= 7)).toBe(true)
    expect(foundryLightAccent?.ratio).toBeGreaterThanOrEqual(4.5)
    expect(foundryLightAccentOnCanvas?.ratio).toBeGreaterThanOrEqual(4.5)
    expect(accentMutedTextPairs.map(({ id }) => id)).toEqual([
      "foundry/light/normal/copy-on-accent-muted",
      "foundry/light/normal/muted-on-accent-muted",
      "foundry/light/normal/accent-on-accent-muted",
      "signal/dark/normal/copy-on-accent-muted",
      "signal/dark/normal/muted-on-accent-muted",
      "signal/dark/normal/accent-on-accent-muted",
    ])
    expect(accentMutedTextPairs.every((pair) =>
      pair.status === "pass" && pair.ratio !== null && pair.ratio >= 4.5,
    )).toBe(true)
    expect(report.pairs.filter((pair) => pair.status === "unknown").map(({ id }) => id)).toEqual([
      "shared/disabled-label-opacity",
      "shared/pressed-opacity",
    ])
    expect(report.pairs.filter((pair) => pair.status === "unknown")).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: "shared/disabled-label-opacity",
        reason: expect.stringContaining("compositing"),
      }),
      expect.objectContaining({
        id: "shared/pressed-opacity",
        reason: expect.stringContaining("compositing"),
      }),
    ]))
  })

  it("distinguishes iOS simulator acceptance from physical-device status in the generated review artifact", () => {
    const reviewCases = JSON.parse(readFileSync(
      new URL("./native-accessibility-review-cases.json", import.meta.url),
      "utf8",
    )) as { acceptance: Record<string, unknown> }

    expect(reviewCases.acceptance).toEqual({
      iosSimulator: { status: "accepted", osVersion: "26.5", app: "standalone" },
      iosPhysicalDevice: "not-run",
      androidDevice: "parked",
      screenReader: "not-assessed",
      storybookOnDeviceNavigator: "not-qualified",
    })
  })

  it("chooses status-bar glyphs for the effective high-contrast canvas", async () => {
    const { statusBarStyleFor } = await import("../src/styles/theme")
    expect(statusBarStyleFor("light", "normal")).toBe("dark")
    expect(statusBarStyleFor("light", "more")).toBe("light")
    expect(statusBarStyleFor("dark", "normal")).toBe("light")
    expect(statusBarStyleFor("dark", "more")).toBe("light")
  })

  it("uses the WCAG sRGB ratio and refuses shorthand or alpha colours", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBe(21)
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1)
    expect(contrastRatio("#fff", "#000000")).toBeUndefined()
    expect(contrastRatio("rgba(255,255,255,0.5)", "#000000")).toBeUndefined()
  })
})
