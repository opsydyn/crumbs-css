import { describe, expect, it } from "bun:test"
import {
  createNativeConditionResolver,
  createNativeConditionStore,
  nativeConditionSnapshotKey,
  normalizeNativeConditionInput,
  type NativeConditionInput,
} from "../src/conditions"

describe("native condition semantics", () => {
  it("normalizes dimensions and accessibility inputs into bounded buckets", () => {
    const compact = normalizeNativeConditionInput({
      platform: "ios",
      width: 599,
      height: 899,
      isRTL: false,
      fontScale: 1.14,
      reducedMotion: false,
      contrast: "normal",
    })
    const sameBuckets = normalizeNativeConditionInput({
      platform: "ios",
      width: 420,
      height: 600,
      isRTL: false,
      fontScale: 1,
      reducedMotion: false,
      contrast: "normal",
    })

    expect(compact).toEqual({
      platform: "ios",
      widthBucket: "compact",
      heightBucket: "regular",
      orientation: "portrait",
      direction: "ltr",
      fontScaleBucket: "normal",
      motion: "full",
      contrast: "normal",
    })
    expect(nativeConditionSnapshotKey(compact)).toBe(
      nativeConditionSnapshotKey(sameBuckets),
    )
    expect(
      normalizeNativeConditionInput({
        platform: "android",
        width: 840,
        height: 500,
        isRTL: true,
        fontScale: 1.3,
        reducedMotion: true,
        contrast: "more",
      }),
    ).toEqual({
      platform: "android",
      widthBucket: "expanded",
      heightBucket: "short",
      orientation: "landscape",
      direction: "rtl",
      fontScaleBucket: "extraLarge",
      motion: "reduced",
      contrast: "more",
    })
  })

  it("resolves more specific conditions before declaration-order ties", () => {
    const resolve = createNativeConditionResolver(
      [
        { when: {}, value: "default" },
        { when: { platform: "ios" }, value: "ios" },
        {
          when: { platform: "ios", widthBucket: "compact" },
          value: "compact-first",
        },
        {
          when: { platform: "ios", heightBucket: "regular" },
          value: "regular",
        },
        {
          when: { platform: "ios", widthBucket: "compact" },
          value: "compact-last",
        },
      ],
      "fallback",
    )

    const iosCompact = normalizeNativeConditionInput({
      platform: "ios",
      width: 420,
      height: 600,
    })
    const androidExpanded = normalizeNativeConditionInput({
      platform: "android",
      width: 840,
      height: 1_000,
    })
    const webDefault = normalizeNativeConditionInput({platform: "web"})
    const fallbackOnly = createNativeConditionResolver(
      [{when: {platform: "ios"}, value: "ios"}],
      "fallback",
    )

    expect(resolve(iosCompact)).toBe("compact-last")
    expect(resolve(androidExpanded)).toBe("default")
    expect(resolve(webDefault)).toBe("default")
    expect(fallbackOnly(androidExpanded)).toBe("fallback")
  })

  it("rejects malformed native input instead of widening the condition space", () => {
    expect(() => normalizeNativeConditionInput({width: Number.NaN})).toThrow(
      "width must be a finite non-negative number",
    )
    expect(() => normalizeNativeConditionInput({height: -1})).toThrow(
      "height must be a finite non-negative number",
    )
    expect(() => normalizeNativeConditionInput({fontScale: 0})).toThrow(
      "fontScale must be a finite positive number",
    )
    expect(() =>
      normalizeNativeConditionInput({contrast: "unknown" as never}),
    ).toThrow("contrast must be one of normal, more, or less")
  })

  it("starts and stops source subscriptions with the first and last consumer", () => {
    let current: NativeConditionInput = {
      platform: "ios",
      width: 420,
      height: 800,
    }
    const sourceListeners = new Set<(patch: NativeConditionInput) => void>()
    let starts = 0
    let stops = 0
    const source = {
      read: () => current,
      subscribe: (listener: (patch: NativeConditionInput) => void) => {
        starts += 1
        sourceListeners.add(listener)
        return () => {
          stops += 1
          sourceListeners.delete(listener)
        }
      },
    }
    const store = createNativeConditionStore({sources: [source]})
    expect(store.getSnapshot().widthBucket).toBe("compact")

    let notifications = 0
    const unsubscribe = store.subscribe(() => {
      notifications += 1
    })
    expect(starts).toBe(1)
    expect(store.getStats()).toMatchObject({
      listeners: 1,
      activeSources: 1,
      starts: 1,
      stops: 0,
      disposed: false,
    })

    for (const listener of sourceListeners) listener({width: 610})
    expect(store.getSnapshot().widthBucket).toBe("medium")
    expect(notifications).toBe(1)
    for (const listener of sourceListeners) listener({width: 611})
    expect(store.getSnapshot().widthBucket).toBe("medium")
    expect(notifications).toBe(1)

    unsubscribe()
    expect(stops).toBe(1)
    expect(store.getStats()).toMatchObject({listeners: 0, activeSources: 0, stops: 1})

    current = {platform: "ios", width: 900, height: 800}
    const secondUnsubscribe = store.subscribe(() => {
      notifications += 1
    })
    expect(starts).toBe(2)
    expect(store.getSnapshot().widthBucket).toBe("expanded")
    secondUnsubscribe()

    store.dispose()
    expect(stops).toBe(2)
    expect(store.getStats()).toMatchObject({disposed: true, listeners: 0})
    expect(() => store.update({width: 1_000})).toThrow(
      "Native condition store has been disposed",
    )
  })
})
