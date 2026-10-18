import { strict as assert } from "node:assert"
import { act, create, type ReactTestRenderer } from "react-test-renderer"
import { CrumbsDevtoolsProvider, useCrumbsInspectorTarget, useInspectorRegistry } from "../../src/devtools/native/provider"
import { explainInspectorInput } from "../../src/devtools/native/capture"
import type { InspectorRegistry } from "../../src/devtools/native/registry"
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let store!: InspectorRegistry, getters = 0, explanations = 0, parents = 0
const durations: number[] = []
function Probe({ value }: { value: number }) {
 store = useInspectorRegistry()
 useCrumbsInspectorTarget({ label: "Cost fixture", exportPath: ["card"], getInput: () => {
  getters++; return { module: { card: { opacity: value } }, exportPath: ["card"], current: {} }
 } })
 return null
}
function Parent({ enabled, value }: { enabled: boolean; value: number }) { parents++; return enabled ? <Probe value={value}/> : null }
const tree = (enabled: boolean, value: number) => <CrumbsDevtoolsProvider><Parent enabled={enabled} value={value}/></CrumbsDevtoolsProvider>
let renderer!: ReactTestRenderer
await act(async () => { renderer = create(tree(false, 0)) })
for (let i=1;i<=100;i++) await act(async () => { renderer.update(tree(false, i/100)) })
const disabled = { parentRenders: parents, getters, explanations }
parents=0
await act(async () => { renderer.update(tree(true, 0)) })
for (let i=1;i<=100;i++) await act(async () => { renderer.update(tree(true, i/100)) })
const closed = { parentRenders: parents, getters, explanations, targets: store.getSnapshot().targets.length, reports: Number(!!store.getSnapshot().capture) }
assert.equal(closed.getters,0); assert.equal(closed.explanations,0);assert.equal(closed.reports,0)
const id = store.getSnapshot().targets[0]!.id, before = parents
await act(async () => { store.open() })
for (let i=0;i<20;i++) await act(async () => { store.capture(id, input => {
 const start=performance.now(); explanations++; const report=explainInspectorInput(input); durations.push(performance.now()-start); return report
}) })
assert.equal(parents,before);assert.equal(getters,20);assert.equal(explanations,20)
const selected = { parentRendersFromInspector: parents-before, getters, explanations, targets: store.getSnapshot().targets.length, reports: Number(!!store.getSnapshot().capture), explanationMs: durations }
await act(async () => { renderer.unmount() })
const disposed = { targets: store.getSnapshot().targets.length, reports: Number(!!store.getSnapshot().capture) }
assert.equal(disposed.targets,0);assert.equal(disposed.reports,0)
console.log(JSON.stringify({ type: "crumbs.m9.3a.synthetic-cost", node: process.version, disabled, closed, selected, disposed, limits: "React test renderer; not a device frame/memory benchmark or speedup claim" }))
