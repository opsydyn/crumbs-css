export type ThemeStore<TSnapshot> = {
  readonly getSnapshot: () => TSnapshot
  readonly setSnapshot: (snapshot: TSnapshot) => void
  readonly subscribe: (listener: () => void) => () => void
  readonly dispose: () => void
}

export type ThemeSelectorStore<TSelected> = {
  readonly getSnapshot: () => TSelected
  readonly subscribe: (listener: () => void) => () => void
  readonly dispose: () => void
}

/**
 * A small immutable-snapshot store for React's useSyncExternalStore contract.
 * Every notification observes the same committed snapshot; identical object
 * identities do not notify.
 */
export function createThemeStore<TSnapshot>(initial: TSnapshot): ThemeStore<TSnapshot> {
  let snapshot = initial
  let disposed = false
  const listeners = new Set<() => void>()

  const store: ThemeStore<TSnapshot> = {
    getSnapshot: () => snapshot,
    setSnapshot(next) {
      if (disposed) throw new Error("Theme store has been disposed")
      if (Object.is(snapshot, next)) return
      snapshot = next
      for (const listener of [...listeners]) {
        if (listeners.has(listener)) listener()
      }
    },
    subscribe(listener) {
      if (disposed) return () => undefined
      listeners.add(listener)
      let active = true
      return () => {
        if (!active) return
        active = false
        listeners.delete(listener)
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      listeners.clear()
    },
  }
  return store
}

/**
 * Derive a selector-specific external store. The parent store is observed only
 * while at least one selector consumer is subscribed, and listeners are
 * notified only when the selected reference changes.
 */
export function createThemeSelectorStore<TSnapshot, TSelected>(
  parent: ThemeStore<TSnapshot>,
  selector: (snapshot: TSnapshot) => TSelected,
): ThemeSelectorStore<TSelected> {
  let selected = selector(parent.getSnapshot())
  let disposed = false
  let parentUnsubscribe: (() => void) | undefined
  const listeners = new Set<() => void>()

  const notifyFromParent = () => {
    const next = selector(parent.getSnapshot())
    if (Object.is(selected, next)) return
    selected = next
    for (const listener of [...listeners]) {
      if (listeners.has(listener)) listener()
    }
  }

  const store: ThemeSelectorStore<TSelected> = {
    getSnapshot: () => {
      const next = selector(parent.getSnapshot())
      if (!Object.is(selected, next)) selected = next
      return selected
    },
    subscribe(listener) {
      if (disposed) return () => undefined
      listeners.add(listener)
      if (listeners.size === 1) parentUnsubscribe = parent.subscribe(notifyFromParent)
      let active = true
      return () => {
        if (!active) return
        active = false
        listeners.delete(listener)
        if (listeners.size === 0) {
          parentUnsubscribe?.()
          parentUnsubscribe = undefined
        }
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      parentUnsubscribe?.()
      parentUnsubscribe = undefined
      listeners.clear()
    },
  }
  return store
}
