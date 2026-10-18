import { describe, expect, it } from "bun:test"
import { createInspectorRegistry } from "../src/devtools/native/registry"
import { explainStyle } from "../src/devtools/explain-style"
import type { CrumbsInspectorTargetId } from "../src/devtools/native/model"
const id = (value: string) => value as CrumbsInspectorTargetId
const input = { module: { card: { opacity: 0.8 } }, exportPath: ["card"], current: {} }
const options = { label: "Card", exportPath: ["card"], getInput: () => input }

describe("native inspector registry", () => {
  it("does no capture work until explicitly selected and marks committed updates stale", () => {
    const store = createInspectorRegistry(); let calls = 0
    const target = { ...options, getInput: () => { calls++; return input } }
    const lease = store.register(id("one"), target)!
    lease.update(target); store.open()
    expect(calls).toBe(0)
    expect(store.capture(id("one"), explainStyle).ok).toBe(true)
    expect(calls).toBe(1)
    expect(store.getSnapshot().capture?.report.resolution.value).toEqual({ opacity: 0.8 })
    lease.update(target)
    expect(store.getSnapshot().stale).toBe(true)
    expect(calls).toBe(1)
    store.capture(id("one"), explainStyle)
    expect(calls).toBe(2)
    expect(store.getSnapshot().stale).toBe(false)
    store.close()
    expect(store.getSnapshot().capture).toBeNull()
    expect(store.getSnapshot().selectedId).toBeNull()
    expect(store.capture(id("one"), explainStyle).ok).toBe(false)
    expect(calls).toBe(2)
  })
  it("isolates providers and duplicate labels and ignores stale leases", () => {
    const a = createInspectorRegistry(), b = createInspectorRegistry()
    const old = a.register(id("one"), options)!
    const replacement = a.register(id("one"), { ...options, label: "Replacement" })!
    a.register(id("two"), options)
    old.update(options); old.release()
    expect(a.getSnapshot().targets.map(x => x.label)).toEqual(["Replacement", "Card"])
    expect(b.getSnapshot().targets).toHaveLength(0)
    a.open(); a.capture(id("one"), explainStyle); replacement.release()
    expect(a.getSnapshot().capture).toBeNull()
    expect(a.getSnapshot().selectedId).toBeNull()
    a.dispose(); expect(a.getSnapshot().targets).toHaveLength(0)
  })
  it("bounds admission without eviction and permits an explicit retry", () => {
    const store = createInspectorRegistry()
    const leases = Array.from({ length: 200 }, (_, n) => store.register(id(String(n)), options)!)
    expect(store.register(id("overflow"), options)).toBeNull()
    expect(store.getSnapshot().capacityReached).toBe(true)
    expect(store.getSnapshot().targets).toHaveLength(200)
    leases[0]!.release()
    expect(store.getSnapshot().capacityReached).toBe(true)
    expect(store.register(id("overflow"), options)).not.toBeNull()
    expect(store.getSnapshot().targets).toHaveLength(200)
  })
  it("refuses results invalidated during capture and mismatched paths", () => {
    const store = createInspectorRegistry(); store.open()
    let lease = store.register(id("one"), { ...options, getInput: () => { lease.release(); return input } })!
    expect(store.capture(id("one"), explainStyle)).toEqual({ ok: false, code: "capture-invalidated" })
    expect(store.getSnapshot().capture).toBeNull()
    store.register(id("two"), { ...options, exportPath: ["wrong"] })
    expect(store.capture(id("two"), explainStyle)).toEqual({ ok: false, code: "target-mismatch" })
    store.register(id("throw"), { ...options, getInput: () => { throw Error("broken") } })
    expect(store.capture(id("throw"), explainStyle)).toEqual({ ok: false, code: "capture-failed" })
    expect(store.getSnapshot().capture).toBeNull()
  })
  it("keeps subscriber snapshots stable until a mutation and releases listeners", () => {
    const store = createInspectorRegistry(); let calls = 0
    const first = store.getSnapshot(); expect(store.getSnapshot()).toBe(first)
    const unsubscribe = store.subscribe(() => calls++)
    store.register(id("one"), options); expect(calls).toBe(1)
    unsubscribe(); store.open(); expect(calls).toBe(1)
  })
})

it("does not invoke a getter after a subscriber closes the panel", () => {
 const store=createInspectorRegistry();let gets=0
 store.register(id("one"),{...options,getInput:()=>{gets++;return input}});store.open()
 store.subscribe(()=>{if(store.getSnapshot().selectedId)store.close()})
 expect(store.capture(id("one"),explainStyle)).toEqual({ok:false,code:"capture-invalidated"})
 expect(gets).toBe(0)
})
it("does not overwrite a reentrant newer selection", () => {
 const store=createInspectorRegistry();store.open()
 store.register(id("two"),options)
 store.register(id("one"),{...options,getInput:()=>{store.capture(id("two"),explainStyle);return input}})
 expect(store.capture(id("one"),explainStyle)).toEqual({ok:false,code:"capture-invalidated"})
 expect(store.getSnapshot().capture?.target.instanceId).toBe(id("two"))
})
