// Synthetic public Animated boundary. Loaded only in isolated Bun renderer processes.
const stats={values:[],reads:[],timings:[],listeners:0};
class Value {constructor(initial){this.js=initial;this.native=initial;stats.values.push(this)}stopAnimation(reply){this.finish?.({finished:false});if(reply)stats.reads.push(()=>reply(this.native))}setValue(n){this.js=n;this.native=n}addListener(){stats.listeners++;throw Error('adapter frame listener forbidden')}}
const quad=t=>t*t;
const peer={Platform:{OS:'ios'},Animated:{Value,timing(value,config){return {start(callback){value.finish=callback;stats.timings.push({value,from:value.js,config,finish(ok=true){if(ok){value.js=config.toValue;value.native=config.toValue}callback({finished:ok})}})},stop(){value.finish?.({finished:false})}}}},Easing:{linear:t=>t,quad,in:f=>f,out:f=>t=>1-f(1-t),inOut:f=>t=>t<.5?f(t*2)/2:1-f((1-t)*2)/2}};
module.exports={peer,stats,sample(){for(const f of [...stats.reads])f()},finish(){for(const t of [...stats.timings])t.finish()},reset(){stats.values.length=0;stats.reads.length=0;stats.timings.length=0}};
