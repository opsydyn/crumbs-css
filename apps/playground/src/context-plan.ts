export type ContextValue = { width:number; height:number; scale:number; fontScale:number }
export type HookIdentity = "initial" | "same" | "changed"
export type ContextKind = "orientation" | "font-scale"
const valid = (value:ContextValue) => Object.values(value).every(n=>Number.isFinite(n) && n>0)
const close = (a:number,b:number) => Math.abs(a-b)<0.01
const orientation = (value:ContextValue) => value.width > value.height ? "landscape" : value.width < value.height ? "portrait" : "square"
export class ContextRecorder {
  status:"running"|"completed"|"cancelled"|"timed-out"="running"
  reason:string|null=null
  requestedAt:number|null=null
  readonly timeoutMs=30000
  readonly baseline:ContextValue
  readonly steps:Array<{index:number;cycle:number;action:"baseline"|"rerender"|"change"|"restore"}>
  observations:Array<{step:number;action:string;context:ContextValue;hookIdentity:HookIdentity;requestedAt:number;observedAt:number}>=[]
  constructor(readonly kind:ContextKind,baseline:ContextValue,readonly cycles:number) {
    if(!["orientation","font-scale"].includes(kind) || !valid(baseline) || orientation(baseline)==="square")throw Error("Valid non-square React Native context required")
    if(!Number.isSafeInteger(cycles) || cycles<1 || cycles>20)throw Error("Cycles must be 1–20")
    this.baseline={...baseline}
    this.steps=Array.from({length:cycles},(_,cycle)=>(["baseline","rerender","change","restore"] as const).map((action,i)=>({index:cycle*4+i,cycle:cycle+1,action}))).flat()
  }
  get step(){return this.steps[this.observations.length]}
  request(now:number){if(this.status==="running" && this.requestedAt===null && Number.isFinite(now))this.requestedAt=now}
  observe(index:number,value:ContextValue,hookIdentity:HookIdentity,now:number) {
    const step=this.step
    if(this.status!=="running" || this.requestedAt===null || !step || index!==step.index || !valid(value) || !Number.isFinite(now) || now<this.requestedAt || now-this.requestedAt>=this.timeoutMs)return false
    const b=this.baseline
    const unchanged=Object.keys(b).every(k=>close(value[k as keyof ContextValue],b[k as keyof ContextValue]))
    const changed=this.kind==="orientation" ? orientation(value)!=="square" && orientation(value)!==orientation(b) && close(value.scale,b.scale) && close(value.fontScale,b.fontScale) : !close(value.fontScale,b.fontScale) && close(value.width,b.width) && close(value.height,b.height) && close(value.scale,b.scale)
    if(step.action==="change" ? !changed : !unchanged)return false
    this.observations.push({step:index,action:step.action,context:{...value},hookIdentity,requestedAt:this.requestedAt,observedAt:now})
    this.requestedAt=null
    if(this.observations.length===this.steps.length)this.status="completed"
    return true
  }
  timeout(now:number){if(this.status==="running" && this.requestedAt!==null && now-this.requestedAt>=this.timeoutMs){this.status="timed-out";this.reason=`waiting for actual ${this.kind} ${this.step?.action}`}}
  cancel(reason:string){if(this.status==="running"){this.status="cancelled";this.reason=reason}}
  summary(){
    const complete=this.status==="completed"
    const referencesVerified=complete && this.observations.every((o,i)=>o.hookIdentity===(i===0?"initial":"same"))
    return {status:this.status,reason:this.reason,complete,referencesVerified,verified:complete && referencesVerified,observedSteps:this.observations.length}
  }
}
