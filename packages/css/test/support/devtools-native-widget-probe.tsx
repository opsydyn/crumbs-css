import { mock } from "bun:test"
import { strict as assert } from "node:assert"
import { createElement } from "react"
import { act, create, type ReactTestRenderer } from "react-test-renderer"
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true})
const nativePlatform={OS:"web"}; let nativeTag:number|null|undefined=1; const nativeFocusTags:unknown[]=[]
let focusCalls=0, keydown:((e:{key:string})=>void)|undefined
Object.assign(globalThis,{window:{addEventListener(_name:string,fn:typeof keydown){keydown=fn},removeEventListener(){keydown=undefined}}})
mock.module("react-native",()=>({View:"View",Text:"Text",Pressable:"Pressable",ScrollView:"ScrollView",Modal:"Modal",Platform:nativePlatform,StyleSheet:{create:(s:unknown)=>s},AccessibilityInfo:{setAccessibilityFocus(tag:unknown){focusCalls++;nativeFocusTags.push(tag)}},findNodeHandle:()=>nativeTag}))
const {CrumbsDevtoolsProvider,useCrumbsInspectorTarget,useInspectorRegistry}=await import("../../src/devtools/native/provider")
const {CrumbsDevtoolsWidget}=await import("../../src/devtools/native/widget")
let store:ReturnType<typeof useInspectorRegistry>,gets=0,copies:string[]=[],finish:(()=>void)|undefined
let reject=false,pending=false
const copyText=async(text:string)=>{copies.push(text);if(reject)throw Error("denied");if(pending)await new Promise<void>(r=>{finish=r})}
function BrokenTarget(){useCrumbsInspectorTarget({label:"Broken",exportPath:["card"],getInput:()=>{throw Error("broken")}});return null}
function Target({value}:{value:number}){store=useInspectorRegistry();useCrumbsInspectorTarget({label:"Card",exportPath:["card"],getInput:()=>{gets++;return {module:{card:{opacity:value}},exportPath:["card"],current:{}}}});return null}
const tree=(value:number)=><CrumbsDevtoolsProvider><Target value={value}/><BrokenTarget/><CrumbsDevtoolsWidget copyText={copyText}/></CrumbsDevtoolsProvider>
let renderer!:ReactTestRenderer
await act(async()=>{renderer=create(tree(0.4),{createNodeMock:()=>({focus(){focusCalls++}})})})
const press=async(label:string)=>{const button=renderer.root.findAll(n=>n.type as unknown === "Pressable").find(n=>n.props.accessibilityLabel===label);assert.ok(button,label);assert.notEqual(button.props.disabled,true,label+" enabled");await act(async()=>{button.props.onPress()})}
const text=()=>JSON.stringify(renderer.toJSON())
assert.equal(gets,0)
assert.equal(renderer.root.findAll(n=>n.type as unknown === "Modal").length,0,"closed native modal must be released")
await press("Open Crumbs inspector");assert.equal(gets,0)
await press("Inspect Card");assert.equal(gets,1);assert.ok(text().includes("0.4"));assert.ok(text().includes("unavailable"))
await press("Inspect Broken");assert.ok(text().includes("Cannot inspect: capture-failed"),"failure after successful capture remains visible")
await press("Inspect Card");assert.equal(gets,2)
await press("Preview report");const preview=renderer.root.findByProps({testID:"crumbs-inspector-copy-preview"}).props.children
await press("Copy report");assert.equal(copies[0],preview);assert.equal(gets,2)
await act(async()=>{renderer.update(tree(0.8))})
assert.ok(text().includes("Stale"));assert.equal(gets,2)
await press("Refresh explanation");assert.equal(gets,3);assert.ok(text().includes("0.8"))
await press("Preview report");reject=true;await press("Copy report");assert.ok(text().includes("Copy failed"));reject=false
pending=true
// Invoke without awaiting the unresolved clipboard promise.
await act(async()=>{renderer.root.findAll(n=>n.type as unknown === "Pressable").find(n=>n.props.accessibilityLabel==="Copy report")!.props.onPress()})
await act(async()=>{renderer.update(tree(0.9));finish!()})
assert.ok(!text().includes("Copied report"));assert.ok(text().includes("Stale"))
await act(async()=>{keydown?.({key:"Escape"})});assert.equal(store!.getSnapshot().open,false);assert.equal(store!.getSnapshot().capture,null)
assert.ok(focusCalls>0)
await press("Open Crumbs inspector")
await act(async()=>{renderer.root.find(n=>n.type as unknown === "Modal").props.onRequestClose()})
assert.equal(store!.getSnapshot().open,false)
nativePlatform.OS="android"
await press("Open Crumbs inspector")
for(const tag of [undefined,null]) { nativeTag=tag;await act(async()=>{renderer.root.find(n=>n.type as unknown === "Modal").props.onShow()}) }
assert.deepEqual(nativeFocusTags,[],"missing native handles must not be sent to accessibility focus")
nativeTag=123
await act(async()=>{renderer.root.find(n=>n.type as unknown === "Modal").props.onShow()})
assert.deepEqual(nativeFocusTags,[123])
await act(async()=>{renderer.unmount()})
console.log("native inspector widget passed")
