import {describe, expect, it} from "bun:test"
import {
  createThemeSelectorStore,
  createThemeStore,
} from "../src/runtime/theme-store"

type Snapshot = {
  readonly values: {
    readonly color: string
    readonly space: number
  }
}

const first: Snapshot = {
  values: {color: "#111", space: 8},
}

describe("theme external stores", () => {
  it("publishes one atomic snapshot to every listener", () => {
    const store = createThemeStore(first)
    const observed: Snapshot[] = []
    const unsubscribeA = store.subscribe(() => observed.push(store.getSnapshot()))
    const unsubscribeB = store.subscribe(() => observed.push(store.getSnapshot()))
    const next: Snapshot = {values: {color: "#222", space: 12}}

    store.setSnapshot(next)

    expect(observed).toEqual([next, next])
    expect(observed.every((snapshot) => snapshot === next)).toBe(true)
    unsubscribeA()
    unsubscribeB()
  })

  it("does not notify when the immutable snapshot identity is unchanged", () => {
    const store = createThemeStore(first)
    let notifications = 0
    store.subscribe(() => {
      notifications += 1
    })

    store.setSnapshot(first)
    expect(notifications).toBe(0)
  })

  it("notifies selector consumers only when their selected reference changes", () => {
    const store = createThemeStore(first)
    const colorStore = createThemeSelectorStore(store, (snapshot) => snapshot.values.color)
    let notifications = 0
    colorStore.subscribe(() => {
      notifications += 1
    })

    const sameColor: Snapshot = {
      values: {color: first.values.color, space: 16},
    }
    store.setSnapshot(sameColor)
    expect(notifications).toBe(0)
    expect(colorStore.getSnapshot()).toBe(first.values.color)

    const changedColor: Snapshot = {
      values: {color: "#333", space: 16},
    }
    store.setSnapshot(changedColor)
    expect(notifications).toBe(1)
    expect(colorStore.getSnapshot()).toBe("#333")
  })

  it("unsubscribes cleanly when a selector consumer unmounts", () => {
    const store = createThemeStore(first)
    const colorStore = createThemeSelectorStore(store, (snapshot) => snapshot.values.color)
    let notifications = 0
    const unsubscribe = colorStore.subscribe(() => {
      notifications += 1
    })

    unsubscribe()
    store.setSnapshot({values: {color: "#222", space: 8}})

    expect(notifications).toBe(0)
  })

  it("keeps nested stores independent and rejects stale writes after disposal", () => {
    const parent = createThemeStore(first)
    const child = createThemeStore({values: {color: "#child", space: 4}})
    let parentNotifications = 0
    let childNotifications = 0
    parent.subscribe(() => {
      parentNotifications += 1
    })
    child.subscribe(() => {
      childNotifications += 1
    })

    parent.setSnapshot({values: {color: "#parent", space: 12}})
    expect(parentNotifications).toBe(1)
    expect(childNotifications).toBe(0)

    child.dispose()
    expect(() => child.setSnapshot({values: {color: "#stale", space: 1}})).toThrow(
      "Theme store has been disposed",
    )
  })

  it("uses one shared context identity for hot-reloaded package copies", async () => {
    await import("../src/theme-runtime")
    const key = Symbol.for("crumbs.css.theme-store-context.v1")
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, key)

    expect(descriptor?.value).toBeDefined()
    expect(descriptor?.configurable).toBe(false)
  })
})
