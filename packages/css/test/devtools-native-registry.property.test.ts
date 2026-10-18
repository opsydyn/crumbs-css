import { expect, it } from "bun:test"
import fc from "fast-check"
import { createInspectorRegistry } from "../src/devtools/native/registry"
import type { CrumbsInspectorTargetId } from "../src/devtools/native/model"

it("matches independent membership over repeated admission and cleanup sequences", () => {
  fc.assert(fc.property(fc.array(fc.tuple(fc.integer({ min: 0, max: 220 }), fc.boolean()), { maxLength: 700 }), events => {
    const store = createInspectorRegistry()
    const expected = new Set<number>()
    const cleanup = new Map<number, () => void>()
    for (const [n, add] of events) {
      if (add) {
        const lease = store.register(String(n) as CrumbsInspectorTargetId, { label: "Repeated", exportPath: ["card"], getInput: () => { throw Error("must not capture") } })
        if (expected.has(n) || expected.size < 200) { expected.add(n); cleanup.set(n, () => lease!.release()) }
      } else { cleanup.get(n)?.(); expected.delete(n); cleanup.delete(n) }
      expect(store.getSnapshot().targets.map(x => Number(x.id)).sort((a,b) => a-b)).toEqual([...expected].sort((a,b) => a-b))
      expect(store.getSnapshot().capture).toBeNull()
    }
    store.dispose(); expect(store.getSnapshot().targets).toHaveLength(0)
  }), { seed: 93018, numRuns: 100 })
})
