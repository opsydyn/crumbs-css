/** THROWAWAY M10.5 source-to-program evaluator. No production/type qualification. */
type Node = readonly [number, ...any[]]
type Program = readonly [readonly string[], Node]
type Frame = {values:Map<string,any>; parent?:Frame}
type Flow = {kind:'return'|'break'|'continue'; value?:any}
const STOP=Symbol('optional-chain'),TDZ=Symbol('uninitialized')
export function freezeProgram<T>(value:T):T {
 if(Array.isArray(value)){for(const part of value)freezeProgram(part);Object.freeze(value)}
 return value
}
export function runProgram(program:Program,parameters:Record<string,unknown>,lookup:(name:string)=>unknown):any {
 const pool=program[0],root:Frame={values:new Map(Object.entries(parameters))}
 const frame=(parent:Frame):Frame=>({values:new Map(),parent})
 const unwrap=(x:any)=>x===STOP?undefined:x
 function locate(env:Frame,name:string):Frame|undefined {for(let current:Frame|undefined=env;current;current=current.parent)if(current.values.has(name))return current}
 function get(env:Frame,name:string):any {const owner=locate(env,name);if(!owner)return lookup(name);const v=owner.values.get(name);if(v===TDZ)throw new ReferenceError("Cannot access '"+name+"' before initialization");return v}
 function ref(n:Node,env:Frame):any {
  if(n[0]===1){const name=pool[n[1]];return {receiver:undefined,get:()=>get(env,name),set:(value:any)=>{const owner=locate(env,name);if(!owner)throw new ReferenceError(name+' is not defined');owner.values.set(name,value);return value}}}
  if(n[0]!==2)throw new TypeError('Invalid instruction reference')
  const owner=expression(n[1],env)
  if(owner===STOP||(n[3]&&owner==null))return STOP
  const key=Reflect.ownKeys({[unwrap(expression(n[2],env))]:0})[0]
  return {receiver:owner,get:()=>owner[key],set:(v:any)=>(owner[key]=v)}
 }
 function args(nodes:Node[],env:Frame):any[] {const out:any[]=[];for(const n of nodes)if(n[0]===11)out.push(...unwrap(expression(n[1],env)));else out.push(unwrap(expression(n,env)));return out}
 function names(pattern:any):string[] {if(pattern[0]===0)return[pool[pattern[1]]];return pattern[1].flatMap((row:any)=>row?names(pattern[0]===1?row[0]:row[1]):[])}
 function bind(pattern:any,value:any,env:Frame):void {
  if(pattern[0]===0){env.values.set(pool[pattern[1]],value);return}
  if(pattern[0]===1){
   const iterator:Iterator<any>=value[Symbol.iterator]();let done=false
   try {for(const row of pattern[1]){
    let v:any
    if(row?.[2]){v=[];while(!done){const next:IteratorResult<any>=iterator.next();done=!!next.done;if(!done)v.push(next.value)}}
    else {const next:IteratorResult<any>=done?({done:true} as IteratorResult<any>):iterator.next();done=!!next.done;v=done?undefined:next.value}
    if(row)bind(row[0],v===undefined&&row[1]?unwrap(expression(row[1],env)):v,env)
   }}finally{if(!done&&iterator.return!==undefined)iterator.return()}
   return
  }
  const omitted=new Set<PropertyKey>()
  for(const row of pattern[1]){
   if(row[3]){const rest:any={};for(const key of Reflect.ownKeys(Object(value)))if(!omitted.has(key)&&Object.getOwnPropertyDescriptor(value,key)?.enumerable)Object.defineProperty(rest,key,{value:value[key],enumerable:true,configurable:true,writable:true});bind(row[1],rest,env)}
   else {const key=Reflect.ownKeys({[unwrap(expression(row[0],env))]:0})[0];omitted.add(key);let v=value[key];if(v===undefined&&row[2])v=unwrap(expression(row[2],env));bind(row[1],v,env)}
  }
 }
 function expression(n:Node,env:Frame):any {
  switch(n[0]){
   case 0:return n[1]===0?pool[n[2]]:n[2]
   case 1:return get(env,pool[n[1]])
   case 2:{const r=ref(n,env);return r===STOP?STOP:r.get()}
   case 3:{const r=n[1][0]===1||n[1][0]===2?ref(n[1],env):{receiver:undefined,get:()=>expression(n[1],env)};if(r===STOP)return STOP;const fn=r.get();if(fn===STOP||(n[3]&&fn==null))return STOP;return Reflect.apply(fn,r.receiver,args(n[2],env))}
   case 4:return Reflect.construct(unwrap(expression(n[1],env)),args(n[2],env))
   case 5:{
    const op=pool[n[1]]
    if(op==='='||op==='+='){const r=ref(n[2],env);if(op==='=')return r.set(unwrap(expression(n[3],env)));const old=r.get();return r.set(old+unwrap(expression(n[3],env)))}
    const left=unwrap(expression(n[2],env))
    if(op==='&&')return left&&unwrap(expression(n[3],env))
    if(op==='||')return left||unwrap(expression(n[3],env))
    if(op==='??')return left??unwrap(expression(n[3],env))
    const right=unwrap(expression(n[3],env))
    switch(op){case '+':return left+right;case '-':return left-right;case '*':return left*right;case '/':return left/right;case '===':return left===right;case '!==':return left!==right;case '<':return left<right;case '>':return left>right;case '<=':return left<=right;case '>=':return left>=right;case 'in':return left in right}
    throw new Error('Unsupported binary program operator '+op)
   }
   case 6:{const op=pool[n[1]],value=unwrap(expression(n[2],env));switch(op){case '!':return!value;case '-':return-value;case '+':return+value;case 'typeof':return typeof value;case '++':return ref(n[2],env).set(Number(value)+1);case '--':return ref(n[2],env).set(Number(value)-1)}throw Error('Unsupported prefix '+op)}
   case 7:return expression(unwrap(expression(n[1],env))?n[2]:n[3],env)
   case 8:{const result:any[]=[];for(const entry of n[1])if(entry===null)result.length++;else if(entry[0]===11)result.push(...unwrap(expression(entry[1],env)));else result.push(unwrap(expression(entry,env)));return result}
   case 9:{let out:any={};for(const row of n[1])if(row[0]===1)out={...out,...unwrap(expression(row[1],env))};else{const key=unwrap(expression(row[1],env)),value=unwrap(expression(row[2],env));Object.defineProperty(out,key,{value,enumerable:true,configurable:true,writable:true})}return out}
   case 10:return function(...values:any[]){const scope=frame(env);for(let i=0;i<n[1].length;i++){const p=n[1][i];let value=p[2]?values.slice(i):values[i];if(value===undefined&&p[1])value=unwrap(expression(p[1],scope));bind(p[0],value,scope)}const signal=statement(n[2],scope);return signal?.value}
   case 12:{let text=pool[n[1]];for(const [node,suffix]of n[2])text+=`${unwrap(expression(node,env))}`+pool[suffix];return text}
   case 13:return new RegExp(pool[n[1]],pool[n[2]])
   case 14:{const r=ref(n[2],env),old=Number(r.get());r.set(pool[n[1]]==='++'?old+1:old-1);return old}
  }
  throw new Error('Unsupported expression opcode '+n[0])
 }
 function sequence(nodes:Node[],env:Frame):Flow|undefined {for(const n of nodes){const result=statement(n,env);if(result)return result}}
 function statement(n:Node,env:Frame):Flow|undefined {
  switch(n[0]){
   case 20:{const scope=frame(env);for(const node of n[1])if(node[0]===21)for(const [pattern]of node[1])for(const name of names(pattern))scope.values.set(name,TDZ);return sequence(n[1],scope)}
   case 21:for(const [pattern,node]of n[1])bind(pattern,node?unwrap(expression(node,env)):undefined,env);return
   case 22:expression(n[1],env);return
   case 23:return {kind:'return',value:n[1]?unwrap(expression(n[1],env)):undefined}
   case 24:throw unwrap(expression(n[1],env))
   case 25:return unwrap(expression(n[1],env))?statement(n[2],env):n[3]?statement(n[3],env):undefined
   case 26:for(const value of unwrap(expression(n[2],env))){const scope=frame(env);bind(n[1],value,scope);const signal=statement(n[3],scope);if(signal?.kind==='return')return signal;if(signal?.kind==='break')break}return
   case 27:{const scope=frame(env);if(n[1])statement(n[1],scope);while(!n[2]||unwrap(expression(n[2],scope))){const signal=statement(n[4],scope);if(signal?.kind==='return')return signal;if(signal?.kind==='break')break;if(n[3])expression(n[3],scope)}return}
   case 28:return {kind:'continue'}
   case 29:return {kind:'break'}
   case 30:
    try{return statement(n[1],env)}catch(error){if(!n[2])throw error;const scope=frame(env);if(n[2][0])bind(n[2][0],error,scope);return statement(n[2][1],scope)}finally{if(n[3]){const signal=statement(n[3],env);if(signal)return signal}}
   case 31:{const input=unwrap(expression(n[1],env));let start=-1,fallback=-1;for(let i=0;i<n[2].length;i++){const row=n[2][i];if(row[0]===null)fallback=i;else if(input===unwrap(expression(row[0],env))){start=i;break}}if(start<0)start=fallback;for(let i=start;i>=0&&i<n[2].length;i++){const signal=sequence(n[2][i][1],env);if(signal?.kind==='break')return;if(signal)return signal}return}
  }
  throw Error('Unsupported statement opcode '+n[0])
 }
 return statement(program[1],root)?.value
}
