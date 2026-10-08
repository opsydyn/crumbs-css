import {writeFileSync} from 'node:fs'
import {isDeepStrictEqual} from 'node:util'
const root='/private/tmp/crumbs-m105-compact-runtime'
const engine=await import(root+'/candidate/src/runtime/compact-program.ts')
for(const key of ['contractRecord','extensionRecord','themeRecord','planRecord','contractArray','extensionArray']) {
 if(!Object.isFrozen(engine[key])||engine[key].some((step:unknown)=>!Object.isFrozen(step)))throw Error('Mutable program '+key)
}
for(const p of Object.values(engine.numberPrograms))if(!Object.isFrozen(p)||p.some(step=>!Object.isFrozen(step)))throw Error('Mutable number program')
const records:any[]=[]
function capture(run:()=>unknown,trace:unknown[]) {
 try {return {ok:true,value:run(),trace}}
 catch(e:any){return {ok:false,name:e.name,message:e.message,code:e.code,dependency:e.dependency,trace}}
}
function compare(name:string,control:()=>unknown,candidate:()=>unknown){
 const a=control(),b=candidate();if(!isDeepStrictEqual(a,b))throw Error(name+' differs: '+JSON.stringify({a,b}));records.push({name,receipt:a})
}
const primitiveCases=[undefined,null,true,2,'text',Symbol('x')]
const factories:Array<[string,(trace:string[])=>unknown]> = primitiveCases.map((v,i)=>['primitive-'+i,()=>v])
factories.push(['ordinary',()=>({x:1})],['null-prototype',()=>Object.assign(Object.create(null),{x:1})],['inherited',()=>Object.create({x:1})],['date',()=>new Date(0)],['empty',()=>({})],['accessor',t=>Object.defineProperty({},'x',{enumerable:true,get(){t.push('getter');return 1}})],['hidden',()=>Object.defineProperty({},'x',{value:1})],['symbol',()=>({[Symbol.for('probe')]:1})],['array',()=>[1,2]],['sparse',()=>Array(2)],['array-symbol',()=>Object.assign([1],{[Symbol.for('probe')]:2})],['array-extra',()=>Object.assign([1],{extra:2})],['array-hidden',()=>Object.defineProperty([1],'0',{value:1,enumerable:false})],['array-accessor',t=>Object.defineProperty([1],'0',{enumerable:true,get(){t.push('getter');return 1}})],['subclass',()=>new(class extends Array{})(1)])
function observed(target:object,t:string[],changing=false){let enumerations=0
 return new Proxy(target,{
  getPrototypeOf(v){t.push('prototype');return Reflect.getPrototypeOf(v)},
  ownKeys(v){t.push('keys'+(++enumerations));const keys=Reflect.ownKeys(v);return changing&&enumerations%2===0?keys.filter(k=>k!=='0'&&k!=='x'):keys},
  getOwnPropertyDescriptor(v,k){t.push('descriptor:'+String(k));return Reflect.getOwnPropertyDescriptor(v,k)},
  get(v,k,r){t.push('get:'+String(k));return Reflect.get(v,k,r)},
 })
}
factories.push(['record-proxy',t=>observed({x:1,y:2},t)],['null-record-proxy',t=>observed(Object.assign(Object.create(null),{x:1}),t)],['array-proxy',t=>observed([1,2],t)],['changing-array-proxy',t=>observed([1,2],t,true)],['changing-record-proxy',t=>observed({x:1},t,true)],['revoked',()=>{const p=Proxy.revocable({},{});p.revoke();return p.proxy}])
for(const [file,names]of Object.entries({'components-contracts.ts':['dataRecordEntries','readArray'],'components-extension-contract.ts':['dataRecordEntries','dataArray'],'theme-runtime.ts':['assertComponentThemeRecord'],'runtime-component-recipe-resolution-plan.ts':['assertRecord']})){
 const a=await import(root+'/helpers/control-'+file),b=await import(root+'/helpers/candidate-'+file)
 for(const name of names)for(const [label,factory]of factories){
  const run=(api:any)=>{const trace:string[]=[];const value=factory(trace);return capture(()=>api[name](value,'probe'),trace)}
  compare(file+':'+name+':'+label,()=>run(a),()=>run(b))
 }
}
for(const file of ['components-contracts.ts','components-extension-contract.ts']){
 const a=await import(root+'/helpers/control-'+file),b=await import(root+'/helpers/candidate-'+file)
 for(const entries of [[],[['x',1]],[['extra',1]],[['x',1],['x',2]],[['x',1],['optional',1]],[['extra',1],['x',1]]])compare(file+':keys:'+JSON.stringify(entries),()=>capture(()=>a.assertExactKeys(entries,['x'],['optional'],'probe'),[]),()=>capture(()=>b.assertExactKeys(entries,['x'],['optional'],'probe'),[]))
}
let seed=0x105c0de
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32}
for(const format of ['mjs','cjs'])for(const entry of ['theme','theme-expressions']){
 const ca=await import(root+'/control/dist/'+entry+'.'+format),cb=await import(root+'/candidate/dist/'+entry+'.'+format)
 const ab=await import(root+'/control/dist/theme-expressions.'+format),bb=await import(root+'/candidate/dist/theme-expressions.'+format)
 const a={...ab,...ca},b={...bb,...cb}
 if(!isDeepStrictEqual(Object.keys(ca).sort(),Object.keys(cb).sort()))throw Error('Public export drift '+format)
 const evaluate=(api:any,node:any)=>entry==='theme'?api.evaluateNativeExpression(node):api.evaluateNativeExpressionWithTrace(node)
 for(const scenario of ['fallback-primary-present','match-case-selected','match-fallback-selected','arithmetic-getters']) {
  const run=(api:any)=>{const trace:string[]=[];return capture(()=>{
   const d=api.createNativeExpressionDomain({kind:'number',unit:'unitless'})
   const good=api.createNativeExpressionLiteral(d,7)
   const poison={...good};Object.defineProperty(poison,'value',{enumerable:true,get(){trace.push('unselected-value');throw Error('Unselected branch evaluated')}})
   let node:any
   if(scenario==='fallback-primary-present')node=api.createNativeExpressionFallback(good,poison)
   else if(scenario.startsWith('match'))node=api.createNativeExpressionMatch({condition:'orientation',cases:[{value:scenario==='match-case-selected'?'portrait':'landscape',expression:scenario==='match-case-selected'?good:poison}],fallback:scenario==='match-case-selected'?poison:good})
   else {const raw=api.createNativeExpressionAdd(good,api.createNativeExpressionLiteral(d,3));node=new Proxy(raw,{get(v,k,r){trace.push('get:'+String(k));return Reflect.get(v,k,r)}})}
   const value=evaluate(api,node)
   if(scenario!=='arithmetic-getters'&&trace.length)throw Error('Lazy evaluation failed')
   return value
  },trace)}
  compare(entry+':'+format+':lazy-order:'+scenario,()=>run(a),()=>run(b))
  if(!records.at(-1).receipt.ok)throw Error('Lazy/order case did not execute: '+scenario+' '+JSON.stringify(records.at(-1)))
 }

 function expression(api:any,depth:number):any {
  const d=api.createNativeExpressionDomain({kind:'number',unit:'unitless'})
  if(depth===0)return api.createNativeExpressionLiteral(d,Math.floor(random()*100)-50)
  switch(Math.floor(random()*6)){
   case 0:return api.createNativeExpressionAdd(expression(api,depth-1),expression(api,depth-1))
   case 1:return api.createNativeExpressionSubtract(expression(api,depth-1),expression(api,depth-1))
   case 2:return api.createNativeExpressionScale(expression(api,depth-1),Math.floor(random()*5)-2)
   case 3:return api.createNativeExpressionClamp(expression(api,depth-1),-10,10)
   case 4:return api.createNativeExpressionAlias('probe',expression(api,depth-1))
   default:return api.createNativeExpressionFallback(api.createNativeExpressionTokenReference('missing',d),expression(api,depth-1))
  }
 }
 for(let index=0;index<300;index++){
  const initial=seed
  const run=(api:any)=>{seed=initial;return capture(()=>evaluate(api,expression(api,3)),[])}
  compare(entry+':'+format+':generated-expression:'+index,()=>run(a),()=>run(b))
 }
 for(const kind of ['add','subtract','scale','clamp'])for(const domainInput of [{kind:'number',unit:'unitless'},{kind:'length',unit:'px',allowNegative:false},{kind:'opacity',unit:'fraction'},{kind:'duration',unit:'ms'}]){
  const run=(api:any)=>capture(()=>{
   const d=api.createNativeExpressionDomain(domainInput),x=api.createNativeExpressionLiteral(d,domainInput.kind==='opacity'?0.75:2),y=api.createNativeExpressionLiteral(d,domainInput.kind==='opacity'?0.75:3)
   const op=kind==='add'?api.createNativeExpressionAdd(x,y):kind==='subtract'?api.createNativeExpressionSubtract(x,y):kind==='scale'?api.createNativeExpressionScale(x,2):api.createNativeExpressionClamp(x,0,1)
   return evaluate(api,op)
  },[])
  compare(entry+':'+format+':domain:'+kind+':'+domainInput.kind,()=>run(a),()=>run(b))
 }
}
const generated=records.filter(row=>row.name.includes(':generated-expression:'));if(generated.length!==1200||generated.some(row=>!row.receipt.ok))throw Error('Generated expression coverage did not execute successfully: '+JSON.stringify(generated.filter(row=>!row.receipt.ok).slice(0,2)))
const report={format:'crumbs.m10.5.compact-runtime-focused-parity',qualification:'diagnostic-only',host:typeof Bun==='undefined'?'node':'bun',nodeVersion:process.version,seed:'0x105c0de',cases:records.length,records}
writeFileSync(root+'/'+(process.argv[2]??'parity.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({cases:records.length,receipt:'matched',qualification:'diagnostic-only'}))
