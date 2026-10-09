// Isolated public-peer regression: RN0.85's native stop result can sync a stale JS value after setValue.
import {mock} from 'bun:test';
import {strict as assert} from 'node:assert';
const values:Value[]=[],reads:(()=>void)[]=[],lateSyncs:(()=>void)[]=[],stopAcks:(()=>void)[]=[];
let writes=0,failCorrection=false;
const stops:Value[]=[];
class Value {
 js:number;native:number;rendered:number;running=false;finish:((result:{finished:boolean})=>void)|undefined;
 constructor(value:number){this.js=this.native=this.rendered=value;values.push(this)}
 setValue(value:number){writes++;if(failCorrection&&this===values[0])throw Error('late native set failure');this.js=this.native=this.rendered=value}
 stopAnimation(reply?:(value:number)=>void){
  stops.push(this);const running=this.running,stopped=this.native;this.running=false;this.finish?.({finished:false});
  if(running)lateSyncs.push(()=>{this.js=this.rendered=stopped});
  if(reply)(running?stopAcks:reads).push(()=>reply(this.native));
 }
}
const peer={Platform:{OS:'ios'},Animated:{Value,timing(value:Value,_config:unknown){return {start(callback:(result:{finished:boolean})=>void){value.running=true;value.finish=callback},stop(){value.stopAnimation()}}}},Easing:{linear:(x:number)=>x,quad:(x:number)=>x*x,in:(f:unknown)=>f,out:(f:unknown)=>f,inOut:(f:unknown)=>f}};
mock.module('react-native',()=>peer);
const {createAnimatedMotionDriver}=await import('../../src/motion/animated');
const {createMotionOwner}=await import('../../src/motion/owner');
const {defineMotion}=await import('../../src/theme-motion');
const d=defineMotion({states:{resting:{opacity:.6,translateX:0},selected:{opacity:1,translateX:112}},transition:{duration:180,easing:'linear'}});
function begin(){values.length=reads.length=lateSyncs.length=stopAcks.length=0;const owner=createMotionOwner(d,'resting',createAnimatedMotionDriver());owner.activate({initial:'resting',motion:'full',duration:180});const run=owner.controller.animateTo('selected');for(const read of reads.splice(0))read();values[0]!.native=.75;values[1]!.native=42;return {owner,run}}
for(const command of ['reduced','set'] as const){
 const {owner,run}=begin();if(command==='reduced')owner.commitOptions({initial:'resting',motion:'reduced',duration:180});else owner.controller.set('selected');
 let result:unknown;run.result.then(x=>result=x);await Promise.resolve();assert.equal(result,undefined,'terminal must wait for required native corrections');
 for(const sync of lateSyncs.splice(0))sync();for(const ack of stopAcks.splice(0))ack();
 assert.equal((await run.result).status,command==='reduced'?'finished':'cancelled');
 assert.deepEqual(values.map(v=>v.rendered),[1,112],command+' must retain the actual endpoint after native stop synchronization');owner.deactivate();
}
for(const retire of ['deactivate','replace'] as const){
 const {owner,run}=begin();owner.controller.set('selected');const old=stopAcks.splice(0);
 if(retire==='deactivate')owner.deactivate();else owner.controller.animateTo('resting');
 const before=writes;for(const ack of old)ack();assert.equal(writes,before,'retired stop acknowledgements cannot write current nodes');assert.equal((await run.result).status,'cancelled');owner.deactivate();assert.equal(owner.inspect().retainedSettlements,0);
}
console.log('public Animated stop synchronization: reduced, set and retired acknowledgements PASS');

for(const command of ['reduced','set'] as const){
 const {owner,run}=begin();if(command==='reduced')owner.commitOptions({initial:'resting',motion:'reduced',duration:180});else owner.controller.set('selected');
 for(const sync of lateSyncs.splice(0))sync();failCorrection=true;const before=stops.length;
 try{for(const ack of stopAcks.splice(0))assert.doesNotThrow(ack)}finally{failCorrection=false}
 assert.deepEqual(await run.result,{status:'failed',target:'selected',code:'CRUMBS_CSS_MOTION_DRIVER_FAILED'});
 assert.equal(stops.slice(before).includes(values[0]!),true);assert.equal(stops.slice(before).includes(values[1]!),true);
 assert.equal(owner.inspect().retainedSettlements,0);
 const retry=owner.controller.animateTo('selected');assert.equal(owner.inspect().readCohorts,command==='reduced'?0:1);
 for(const read of reads.splice(0))read();for(const value of values){value.running=false;value.finish?.({finished:true})}
 assert.equal((await retry.result).status,'finished');owner.deactivate();
}
console.log('delayed correction failure: reduced/set, all-channel cleanup and unknown reached state PASS');

{
 const {owner,run}=begin();owner.commitOptions({initial:'resting',motion:'reduced',duration:180});
 const runs=[run];for(let i=0;i<100;i++){const target=i%2?'selected':'resting',next=owner.controller.animateTo(target);runs.push(next);assert.equal(owner.controller.animateTo(target),next);assert.ok(owner.inspect().retainedSettlements<=2)}
 assert.equal(stopAcks.length,2,'one pending hardware acknowledgement per channel');
 for(const sync of lateSyncs.splice(0))sync();for(const ack of stopAcks.splice(0))ack();
 for(const retired of runs.slice(0,-1))assert.equal((await retired.result).status,'cancelled');
 assert.deepEqual(await runs.at(-1)!.result,{status:'finished',target:'selected',mode:'immediate'});assert.deepEqual(values.map(v=>v.rendered),[1,112]);
 assert.equal(owner.inspect().retainedSettlements,0);owner.deactivate();
}
{
 const {owner,run}=begin();owner.controller.set('selected');for(let i=0;i<100;i++)owner.controller.set(i%2?'selected':'resting');
 assert.equal(owner.inspect().retainedSettlements,1);
 for(const sync of lateSyncs.splice(0))sync();for(const ack of stopAcks.splice(0))ack();
 assert.deepEqual(await run.result,{status:'cancelled',target:'selected',reason:'set'});assert.deepEqual(values.map(v=>v.rendered),[1,112]);assert.equal(owner.inspect().retainedSettlements,0);owner.deactivate();
}
{
 const {owner,run}=begin();owner.commitOptions({initial:'resting',motion:'reduced',duration:180});run.cancel();
 for(const sync of lateSyncs.splice(0))sync();const before=writes;for(const ack of stopAcks.splice(0))ack();assert.equal(writes,before);
 assert.deepEqual(await run.result,{status:'cancelled',target:'selected',reason:'cancelled'});assert.equal(owner.inspect().retainedSettlements,0);owner.deactivate();
}
{
 const {owner,run}=begin();owner.commitOptions({initial:'resting',motion:'reduced',duration:180});owner.deactivate();owner.activate({initial:'resting',motion:'full',duration:180});
 assert.deepEqual(await run.result,{status:'cancelled',target:'selected',reason:'deactivated'});const before=writes;for(const ack of stopAcks.splice(0))ack();assert.equal(writes,before);assert.equal(owner.inspect().retainedSettlements,0);
 const next=owner.controller.animateTo('selected');for(const read of reads.splice(0))read();assert.equal(owner.inspect().activeRuns,1);owner.deactivate();for(const ack of stopAcks.splice(0))ack();assert.equal((await next.result).status,'cancelled');assert.equal(owner.inspect().retainedSettlements,0);
}
console.log('pending native acknowledgements: reuse, bounded coalescing, rapid set, cancel and Strict lifecycle PASS');
