import { strict as assert } from "node:assert"
import { StrictMode, Suspense, useSyncExternalStore } from "react"
import { act, create, type ReactTestRenderer } from "react-test-renderer"
import { CrumbsDevtoolsProvider, useCrumbsInspectorTarget, useInspectorRegistry } from "../../src/devtools/native/provider"
import { explainStyle } from "../../src/devtools/explain-style"
import type { InspectorRegistry } from "../../src/devtools/native/registry"
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
let store: InspectorRegistry, gets=0, parents=0
function Observer(){ store=useInspectorRegistry(); useSyncExternalStore(store.subscribe,store.getSnapshot,store.getSnapshot); return null }
const never = new Promise<void>(()=>{})
function Target({value,suspend=false}:{value:number;suspend?:boolean}){
 useCrumbsInspectorTarget({label:"Card",exportPath:["card"],getInput:()=>{gets++;return {module:{card:{opacity:value}},exportPath:["card"],current:{}}}})
 if(suspend) throw never
 return null
}
function Parent({value,suspend=false}:{value:number;suspend?:boolean}){parents++;return <CrumbsDevtoolsProvider><Observer/><Suspense fallback={null}><Target value={value} suspend={suspend}/></Suspense></CrumbsDevtoolsProvider>}
let renderer:ReactTestRenderer
await act(async()=>{renderer=create(<StrictMode><Parent value={0.4}/></StrictMode>)})
assert.equal(store!.getSnapshot().targets.length,1); assert.equal(gets,0)
const id=store!.getSnapshot().targets[0]!.id
const before=parents
await act(async()=>{store!.open();store!.capture(id,explainStyle)})
assert.equal(parents,before); assert.deepEqual(store!.getSnapshot().capture?.report.resolution.value,{opacity:0.4})
await act(async()=>{renderer.update(<StrictMode><Parent value={0.8}/></StrictMode>)})
assert.equal(store!.getSnapshot().stale,true)
await act(async()=>{store!.capture(id,explainStyle)})
assert.deepEqual(store!.getSnapshot().capture?.report.resolution.value,{opacity:0.8})
await act(async()=>{renderer.update(<StrictMode><Parent value={0.9} suspend/></StrictMode>)})
// Suspense hides committed layout effects; it must not publish the uncommitted 0.9 getter.
const pending = store!.getSnapshot().targets[0]
if(pending){await act(async()=>{store!.capture(pending.id,explainStyle)});assert.notDeepEqual(store!.getSnapshot().capture?.report.resolution.value,{opacity:0.9})}
await act(async()=>{renderer.unmount()})
assert.equal(store!.getSnapshot().targets.length,0);assert.equal(store!.getSnapshot().capture,null)
console.log("native inspector commits passed")
