// Isolated public-peer regression: RN0.85's native stop result can sync a stale JS value after setValue.
import {mock} from 'bun:test';
import {strict as assert} from 'node:assert';
const values:Value[]=[],reads:(()=>void)[]=[],lateSyncs:(()=>void)[]=[],stopAcks:(()=>void)[]=[];
let writes=0;
class Value {
 js:number;native:number;rendered:number;running=false;finish:((result:{finished:boolean})=>void)|undefined;
 constructor(value:number){this.js=this.native=this.rendered=value;values.push(this)}
 setValue(value:number){writes++;this.js=this.native=this.rendered=value}
 stopAnimation(reply?:(value:number)=>void){
  const running=this.running,stopped=this.native;this.running=false;this.finish?.({finished:false});
  if(running)lateSyncs.push(()=>{this.js=this.rendered=stopped});
  if(reply)(running?stopAcks:reads).push(()=>reply(this.native));
 }
}
const peer={Platform:{OS:'ios'},Animated:{Value,timing(value:Value,_config:unknown){return {start(callback:(result:{finished:boolean})=>void){value.running=true;value.finish=callback},stop(){value.stopAnimation()}}}},Easing:{linear:(x:number)=>x,quad:(x:number)=>x*x,in:(f:unknown)=>f,out:(f:unknown)=>f,inOut:(f:unknown)=>f}};
mock.module('react-native',()=>peer);
const {createAnimatedMotionDriver}=await import('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/packages/css/src/motion/animated');
const {createMotionOwner}=await import('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/packages/css/src/motion/owner');
const {defineMotion}=await import('/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/packages/css/src/theme-motion');
const d=defineMotion({states:{resting:{opacity:.6,translateX:0},selected:{opacity:1,translateX:112}},transition:{duration:180,easing:'linear'}});
function begin(){values.length=reads.length=lateSyncs.length=stopAcks.length=0;const owner=createMotionOwner(d,'resting',createAnimatedMotionDriver());owner.activate({initial:'resting',motion:'full',duration:180});const run=owner.controller.animateTo('selected');for(const read of reads.splice(0))read();values[0]!.native=.75;values[1]!.native=42;return {owner,run}}

const {owner,run}=begin();
owner.commitOptions({initial:'resting',motion:'reduced',duration:180});
const result=await run.result;
for(const sync of lateSyncs.splice(0))sync();
values[0]!.setValue=()=>{throw new Error('late native set failure')};
let thrown:string|undefined;
for(const ack of stopAcks.splice(0)){try{ack()}catch(e){thrown=String(e)}}
console.log(JSON.stringify({result,thrown,rendered:values.map(v=>v.rendered),owner:owner.inspect()}));
owner.deactivate();
