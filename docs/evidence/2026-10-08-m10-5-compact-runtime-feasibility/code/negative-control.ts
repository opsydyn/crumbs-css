import {writeFileSync}from'node:fs'
import {isDeepStrictEqual}from'node:util'
import {runData,extensionArray}from'./candidate/src/runtime/compact-program'
import {dataArray}from'./helpers/control-components-extension-contract'
function probe(run:(v:unknown)=>unknown) {
 const trace:string[]=[];let n=0
 const proxy=new Proxy([1],{
  ownKeys(v){trace.push('keys'+(++n));return Reflect.ownKeys(v)},
  getOwnPropertyDescriptor(v,k){trace.push('descriptor:'+String(k));return Reflect.getOwnPropertyDescriptor(v,k)},
  getPrototypeOf(v){trace.push('prototype');return Reflect.getPrototypeOf(v)},
  get(v,k,r){trace.push('get:'+String(k));return Reflect.get(v,k,r)},
 })
 try{return {value:run(proxy),trace}}catch(e:any){return {name:e.name,message:e.message,trace}}
}
const expected=probe(v=>dataArray(v,'probe'))
const valid=probe(v=>runData(extensionArray,v,'probe'))
const wrong=probe(v=>runData(extensionArray.map(step=>step[0]===7?[7,true]:step) as typeof extensionArray,v,'probe'))
if(!isDeepStrictEqual(expected,valid)||isDeepStrictEqual(expected,wrong))throw Error('Enumeration negative control ineffective')
const receipt={qualification:'diagnostic-only',control:expected,valid,wrong,rejected:'wrong single-enumeration snapshot policy'}
writeFileSync('/private/tmp/crumbs-m105-compact-runtime/negative-control.json',JSON.stringify(receipt,null,2));console.log('Proxy-order negative control rejected')
