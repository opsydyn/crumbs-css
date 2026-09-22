import { useSyncExternalStore } from "react"

export type NativePlatform =
  | "android"
  | "ios"
  | "macos"
  | "visionos"
  | "web"
  | "windows"
  | "unknown"

export type NativeWidthBucket = "compact" | "medium" | "expanded"
export type NativeHeightBucket = "short" | "regular" | "tall"
export type NativeOrientation = "portrait" | "landscape"
export type NativeDirection = "ltr" | "rtl"
export type NativeFontScaleBucket = "normal" | "large" | "extraLarge"
export type NativeMotionPreference = "full" | "reduced"
export type NativeContrastPreference = "normal" | "more" | "less"

export type NativeConditionSnapshot = Readonly<{
  readonly platform: NativePlatform
  readonly widthBucket: NativeWidthBucket
  readonly heightBucket: NativeHeightBucket
  readonly orientation: NativeOrientation
  readonly direction: NativeDirection
  readonly fontScaleBucket: NativeFontScaleBucket
  readonly motion: NativeMotionPreference
  readonly contrast: NativeContrastPreference
}>

/**
 * Native readings are deliberately transient inputs. They are reduced to the
 * finite snapshot above before they can participate in style identity or
 * cache keys.
 */
export type NativeConditionInput = Readonly<{
  readonly platform?: NativePlatform
  readonly width?: number
  readonly height?: number
  readonly isRTL?: boolean
  readonly fontScale?: number
  readonly reducedMotion?: boolean
  readonly contrast?: NativeContrastPreference
}>

export const NATIVE_CONDITION_BREAKPOINTS = Object.freeze({
  widthMediumMin: 600,
  widthExpandedMin: 840,
  heightRegularMin: 600,
  heightTallMin: 900,
  fontScaleLargeMin: 1.15,
  fontScaleExtraLargeMin: 1.3,
} as const)

const NATIVE_PLATFORMS = [
  "android",
  "ios",
  "macos",
  "visionos",
  "web",
  "windows",
  "unknown",
] as const
const WIDTH_BUCKETS = ["compact", "medium", "expanded"] as const
const HEIGHT_BUCKETS = ["short", "regular", "tall"] as const
const ORIENTATIONS = ["portrait", "landscape"] as const
const DIRECTIONS = ["ltr", "rtl"] as const
const FONT_SCALE_BUCKETS = ["normal", "large", "extraLarge"] as const
const MOTION_PREFERENCES = ["full", "reduced"] as const
const CONTRAST_PREFERENCES = ["normal", "more", "less"] as const
const CONDITION_KEYS = [
  "platform",
  "widthBucket",
  "heightBucket",
  "orientation",
  "direction",
  "fontScaleBucket",
  "motion",
  "contrast",
] as const

type NativeConditionInputState = {
  readonly platform: NativePlatform
  readonly width: number
  readonly height: number
  readonly isRTL: boolean
  readonly fontScale: number
  readonly reducedMotion: boolean
  readonly contrast: NativeContrastPreference
}

const DEFAULT_INPUT: NativeConditionInputState = Object.freeze({
  platform: "unknown",
  width: 0,
  height: 0,
  isRTL: false,
  fontScale: 1,
  reducedMotion: false,
  contrast: "normal",
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isOneOf<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T)
}

function assertInputKeys(input: NativeConditionInput): void {
  if (!isRecord(input)) throw new TypeError("native condition input must be an object")
  const allowed = new Set([
    "platform",
    "width",
    "height",
    "isRTL",
    "fontScale",
    "reducedMotion",
    "contrast",
  ])
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) throw new TypeError(`Unsupported native condition input: ${key}`)
  }
}

function finiteNonNegative(name: "width" | "height", value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name} must be a finite non-negative number`)
  }
  return value
}

function finitePositive(name: "fontScale", value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${name} must be a finite positive number`)
  }
  return value
}

function contrastPreference(value: unknown): NativeContrastPreference {
  if (!isOneOf(CONTRAST_PREFERENCES, value)) {
    throw new TypeError("contrast must be one of normal, more, or less")
  }
  return value
}

function applyInputPatch(
  previous: NativeConditionInputState,
  patch: NativeConditionInput,
): NativeConditionInputState {
  assertInputKeys(patch)
  const next = {
    platform: previous.platform,
    width: previous.width,
    height: previous.height,
    isRTL: previous.isRTL,
    fontScale: previous.fontScale,
    reducedMotion: previous.reducedMotion,
    contrast: previous.contrast,
  }
  if ("platform" in patch) {
    if (!isOneOf(NATIVE_PLATFORMS, patch.platform)) {
      throw new TypeError(`platform must be one of ${NATIVE_PLATFORMS.join(", ")}`)
    }
    next.platform = patch.platform
  }
  if ("width" in patch) next.width = finiteNonNegative("width", patch.width)
  if ("height" in patch) next.height = finiteNonNegative("height", patch.height)
  if ("isRTL" in patch) {
    if (typeof patch.isRTL !== "boolean") throw new TypeError("isRTL must be a boolean")
    next.isRTL = patch.isRTL
  }
  if ("fontScale" in patch) next.fontScale = finitePositive("fontScale", patch.fontScale)
  if ("reducedMotion" in patch) {
    if (typeof patch.reducedMotion !== "boolean") {
      throw new TypeError("reducedMotion must be a boolean")
    }
    next.reducedMotion = patch.reducedMotion
  }
  if ("contrast" in patch) next.contrast = contrastPreference(patch.contrast)
  return Object.freeze(next)
}

function widthBucket(width: number): NativeWidthBucket {
  if (width < NATIVE_CONDITION_BREAKPOINTS.widthMediumMin) return "compact"
  if (width < NATIVE_CONDITION_BREAKPOINTS.widthExpandedMin) return "medium"
  return "expanded"
}

function heightBucket(height: number): NativeHeightBucket {
  if (height < NATIVE_CONDITION_BREAKPOINTS.heightRegularMin) return "short"
  if (height < NATIVE_CONDITION_BREAKPOINTS.heightTallMin) return "regular"
  return "tall"
}

function fontScaleBucket(fontScale: number): NativeFontScaleBucket {
  if (fontScale < NATIVE_CONDITION_BREAKPOINTS.fontScaleLargeMin) return "normal"
  if (fontScale < NATIVE_CONDITION_BREAKPOINTS.fontScaleExtraLargeMin) return "large"
  return "extraLarge"
}

function snapshotFromInput(input: NativeConditionInputState): NativeConditionSnapshot {
  return Object.freeze({
    platform: input.platform,
    widthBucket: widthBucket(input.width),
    heightBucket: heightBucket(input.height),
    orientation: input.width > input.height ? "landscape" : "portrait",
    direction: input.isRTL ? "rtl" : "ltr",
    fontScaleBucket: fontScaleBucket(input.fontScale),
    motion: input.reducedMotion ? "reduced" : "full",
    contrast: input.contrast,
  })
}

export const defaultNativeConditionSnapshot = snapshotFromInput(DEFAULT_INPUT)

export function normalizeNativeConditionInput(
  input: NativeConditionInput = {},
): NativeConditionSnapshot {
  return snapshotFromInput(applyInputPatch(DEFAULT_INPUT, input))
}

/**
 * A stable identity for the finite condition space. Width and height never
 * appear in this key, so continuous resize events cannot create an unbounded
 * cache.
 */
export function nativeConditionSnapshotKey(snapshot: NativeConditionSnapshot): string {
  return [
    snapshot.platform,
    snapshot.widthBucket,
    snapshot.heightBucket,
    snapshot.orientation,
    snapshot.direction,
    snapshot.fontScaleBucket,
    snapshot.motion,
    snapshot.contrast,
  ].join("|")
}

export type NativeConditionMatcher = Partial<NativeConditionSnapshot>

export type NativeConditionBranch<TValue> = Readonly<{
  readonly when?: NativeConditionMatcher
  readonly value: TValue
}>

type ConditionKey = (typeof CONDITION_KEYS)[number]

function assertMatcherValue(key: ConditionKey, value: unknown): void {
  const valid =
    (key === "platform" && isOneOf(NATIVE_PLATFORMS, value)) ||
    (key === "widthBucket" && isOneOf(WIDTH_BUCKETS, value)) ||
    (key === "heightBucket" && isOneOf(HEIGHT_BUCKETS, value)) ||
    (key === "orientation" && isOneOf(ORIENTATIONS, value)) ||
    (key === "direction" && isOneOf(DIRECTIONS, value)) ||
    (key === "fontScaleBucket" && isOneOf(FONT_SCALE_BUCKETS, value)) ||
    (key === "motion" && isOneOf(MOTION_PREFERENCES, value)) ||
    (key === "contrast" && isOneOf(CONTRAST_PREFERENCES, value))
  if (!valid) throw new TypeError(`Invalid native condition matcher value for ${key}`)
}

function prepareMatcher(matcher: NativeConditionMatcher): Readonly<NativeConditionMatcher> {
  if (!isRecord(matcher)) throw new TypeError("native condition matcher must be an object")
  for (const key of Object.keys(matcher)) {
    if (!(CONDITION_KEYS as readonly string[]).includes(key)) {
      throw new TypeError(`Unsupported native condition matcher: ${key}`)
    }
    assertMatcherValue(
      key as ConditionKey,
      (matcher as Partial<Record<ConditionKey, unknown>>)[key as ConditionKey],
    )
  }
  return Object.freeze({...matcher})
}

/**
 * Resolve finite condition branches by specificity. A branch matching more
 * axes wins; branches with equal specificity use later declaration order.
 * An empty matcher is the explicit default branch, while `fallback` covers
 * snapshots with no matching branch.
 */
export function createNativeConditionResolver<TValue>(
  branches: readonly NativeConditionBranch<TValue>[],
  fallback: TValue,
): (snapshot: NativeConditionSnapshot) => TValue {
  const prepared = branches.map((branch) => {
    if (!isRecord(branch)) throw new TypeError("native condition branch must be an object")
    const matcher = prepareMatcher(branch.when ?? {})
    return Object.freeze({matcher, value: branch.value})
  })
  return (snapshot) => {
    let winner: TValue = fallback
    let winnerSpecificity = -1
    for (const branch of prepared) {
      const keys = Object.keys(branch.matcher) as ConditionKey[]
      if (keys.every((key) => snapshot[key] === branch.matcher[key])) {
        if (keys.length >= winnerSpecificity) {
          winner = branch.value
          winnerSpecificity = keys.length
        }
      }
    }
    return winner
  }
}

export type NativeConditionSource = Readonly<{
  readonly read: () => NativeConditionInput
  readonly subscribe: (listener: (patch: NativeConditionInput) => void) => () => void
}>

export type NativeConditionStoreStats = Readonly<{
  readonly listeners: number
  readonly activeSources: number
  readonly starts: number
  readonly stops: number
  readonly disposed: boolean
}>

export type NativeConditionStore = Readonly<{
  readonly getSnapshot: () => NativeConditionSnapshot
  readonly subscribe: (listener: () => void) => () => void
  readonly update: (patch: NativeConditionInput) => boolean
  readonly getStats: () => NativeConditionStoreStats
  readonly dispose: () => void
}>

export type NativeConditionStoreOptions = Readonly<{
  readonly initial?: NativeConditionInput
  readonly sources?: readonly NativeConditionSource[]
}>

/**
 * Build an immutable-snapshot condition store. Native sources are attached
 * only while at least one consumer is subscribed and are always detached on
 * the final unsubscribe or explicit disposal.
 */
export function createNativeConditionStore(
  options: NativeConditionStoreOptions = {},
): NativeConditionStore {
  const sources = [...(options.sources ?? [])]
  let input = applyInputPatch(DEFAULT_INPUT, options.initial ?? {})
  for (const source of sources) input = applyInputPatch(input, source.read())
  let snapshot = snapshotFromInput(input)
  let disposed = false
  let active = false
  let starts = 0
  let stops = 0
  let sourceUnsubscribers: Array<() => void> = []
  const listeners = new Set<() => void>()

  const update = (patch: NativeConditionInput): boolean => {
    if (disposed) throw new Error("Native condition store has been disposed")
    input = applyInputPatch(input, patch)
    const next = snapshotFromInput(input)
    if (nativeConditionSnapshotKey(snapshot) === nativeConditionSnapshotKey(next)) return false
    snapshot = next
    for (const listener of [...listeners]) {
      if (listeners.has(listener)) listener()
    }
    return true
  }

  const deactivate = (): void => {
    if (!active) return
    for (const unsubscribe of sourceUnsubscribers.reverse()) unsubscribe()
    sourceUnsubscribers = []
    active = false
    stops += 1
  }

  const activate = (): void => {
    if (active || disposed) return
    const pending: Array<() => void> = []
    try {
      for (const source of sources) pending.push(source.subscribe(update))
      sourceUnsubscribers = pending
      active = true
      starts += 1
      for (const source of sources) update(source.read())
    } catch (error) {
      for (const unsubscribe of pending.reverse()) unsubscribe()
      sourceUnsubscribers = []
      if (active) {
        active = false
        stops += 1
      }
      throw error
    }
  }

  const store: NativeConditionStore = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      if (disposed) return () => undefined
      listeners.add(listener)
      if (listeners.size === 1) {
        try {
          activate()
        } catch (error) {
          listeners.delete(listener)
          throw error
        }
      }
      let subscribed = true
      return () => {
        if (!subscribed) return
        subscribed = false
        listeners.delete(listener)
        if (listeners.size === 0) deactivate()
      }
    },
    update,
    getStats: () =>
      Object.freeze({
        listeners: listeners.size,
        activeSources: active ? sources.length : 0,
        starts,
        stops,
        disposed,
      }),
    dispose() {
      if (disposed) return
      deactivate()
      disposed = true
      listeners.clear()
    },
  }
  return store
}

export function useNativeConditionSnapshot(
  store: NativeConditionStore,
): NativeConditionSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

export {
  createNativeMapValueFn,
  createNativeNormalizeValueFn,
  mapNativeConditionValueToBranches,
  NATIVE_RESPONSIVE_CONDITION_MATCHERS,
  NATIVE_RESPONSIVE_CONDITION_NAMES,
} from "./values"
export type {
  NativeConditionDefinitions,
  NativeConditionNameList,
  NativeConditionValueMapper,
  NativeConditionalRecord,
  NativeConditionalTuple,
  NativeConditionalValue,
  NativeMapValueFn,
  NativeNormalizedConditionalValue,
  NativeNormalizeValueFn,
} from "./values"
