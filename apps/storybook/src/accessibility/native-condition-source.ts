import type {
  NativeConditionSource,
  NativeContrastPreference,
  NativePlatform,
} from "@opsydyn/crumbs-css/theme/core"

export type NativeAccessibilityPreferenceEvent =
  | "reduceMotionChanged"
  | "highTextContrastChanged"
  | "darkerSystemColorsChanged"

export type NativeAccessibilityPreferenceApi = Readonly<{
  readonly isReduceMotionEnabled: () => Promise<boolean>
  readonly isHighTextContrastEnabled: () => Promise<boolean>
  readonly isDarkerSystemColorsEnabled: () => Promise<boolean>
  readonly addEventListener: (
    event: NativeAccessibilityPreferenceEvent,
    listener: (enabled: boolean) => void,
  ) => Readonly<{ readonly remove: () => void }>
}>

/**
 * Adapt the supported React Native accessibility preferences into Crumbs'
 * bounded condition source. Motion starts in the reduced state until the
 * asynchronous native query returns, so the first render does not animate by
 * assuming motion is allowed.
 */
export function createNativeAccessibilityConditionSource(
  platform: NativePlatform,
  api: NativeAccessibilityPreferenceApi,
): NativeConditionSource {
  let reducedMotion = true
  let contrast: NativeContrastPreference = "normal"
  let motionRevision = 0
  let contrastRevision = 0

  return {
    read: () => ({ platform, reducedMotion, contrast }),
    subscribe(listener) {
      let active = true
      const subscriptions = [
        api.addEventListener("reduceMotionChanged", (enabled) => {
          if (!active) return
          motionRevision += 1
          reducedMotion = enabled
          listener({ reducedMotion: enabled })
        }),
      ]

      const query = (
        read: () => Promise<boolean>,
        currentRevision: () => number,
        update: (enabled: boolean) => void,
      ): void => {
        const revisionAtStart = currentRevision()
        void read().then((enabled) => {
          if (!active || revisionAtStart !== currentRevision()) return
          update(enabled)
        }).catch(() => undefined)
      }

      query(api.isReduceMotionEnabled, () => motionRevision, (enabled) => {
        reducedMotion = enabled
        listener({ reducedMotion: enabled })
      })

      if (platform === "ios") {
        subscriptions.push(api.addEventListener("darkerSystemColorsChanged", (enabled) => {
          if (!active) return
          contrastRevision += 1
          contrast = enabled ? "more" : "normal"
          listener({ contrast })
        }))
        query(api.isDarkerSystemColorsEnabled, () => contrastRevision, (enabled) => {
          contrast = enabled ? "more" : "normal"
          listener({ contrast })
        })
      } else if (platform === "android") {
        subscriptions.push(api.addEventListener("highTextContrastChanged", (enabled) => {
          if (!active) return
          contrastRevision += 1
          contrast = enabled ? "more" : "normal"
          listener({ contrast })
        }))
        query(api.isHighTextContrastEnabled, () => contrastRevision, (enabled) => {
          contrast = enabled ? "more" : "normal"
          listener({ contrast })
        })
      }

      return () => {
        if (!active) return
        active = false
        for (const subscription of subscriptions.reverse()) subscription.remove()
      }
    },
  }
}
