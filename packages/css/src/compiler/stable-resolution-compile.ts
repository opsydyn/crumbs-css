import * as path from 'node:path'
import {captureResolutionIdentity, type ResolutionIdentity} from './resolution-identity'

type Inputs = Readonly<Record<string, unknown>>
// Resolution plans only: never source, exports, outputs or retained compiler contexts.
// Bound both graph size and owner count; evict oldest owner deterministically.
const plans = new Map<string, Inputs>()
const receiptKey = (identity: ResolutionIdentity) => JSON.stringify({files:identity.files,links:identity.links})
function authoredPlan(inputs: Inputs): Inputs | undefined {
 const entries=Object.entries(inputs).filter(([file])=>!file.split(/[\\/]/).some(segment=>segment==='node_modules'||segment==='dist'))
 if (entries.length>512) return undefined
 let totalImports=0, totalCharacters=0
 const plan: Record<string, unknown> = {}
 for (const [file, info] of entries) {
  totalCharacters += file.length
  if (file.length>4096 || totalCharacters>65536) return undefined
  const imports=info !== null && typeof info==='object' && 'imports' in info && Array.isArray(info.imports) ? info.imports : []
  const copies=[]
  for(const item of imports){
   if(++totalImports>1024) return undefined
   if(item===null||typeof item!=='object'||typeof item.original!=='string') continue
   totalCharacters += item.original.length
   if(item.original.length>4096 || totalCharacters>65536) return undefined
   copies.push(Object.freeze({original:item.original,external:item.external===true}))
  }
  plan[file]=Object.freeze({imports:Object.freeze(copies)})
 }
 return Object.freeze(plan)
}

export async function compileWithStableResolution<T extends {source:string;inputs:Inputs}>(
 options: {readonly cwd:string;readonly absoluteEntryPath:string},
 compile:()=>Promise<T>,
): Promise<T & {resolutionIdentity:ResolutionIdentity}> {
 const owner=path.resolve(options.cwd)+'\0'+path.resolve(options.absoluteEntryPath)
 let inputs: Inputs=plans.get(owner) ?? {}
 for(let attempt=0;attempt<3;attempt++){
  const before=captureResolutionIdentity(inputs,{...options,verification:true})
  const result=await compile()
  const after=captureResolutionIdentity(result.inputs,{...options,verification:true})
  if (!after.cacheable) throw new Error("Native style resolution could not be verified; check configuration extends and resolution metadata")
  if(receiptKey(before)===receiptKey(after)){
   const plan=authoredPlan(result.inputs)
   if(plans.size>=128&&!plans.has(owner)) plans.delete(plans.keys().next().value!)
   if(plan!==undefined) plans.set(owner,plan)
   else plans.delete(owner)
   return {...result,resolutionIdentity:after}
  }
  // Discovery or a concurrent edit requires a fresh pass whose complete
  // resolution baseline is established before compilation begins.
  // Large graphs are verified in full but never retained as resolution hints.
  inputs=result.inputs
 }
 plans.delete(owner)
 throw new Error('Native style sources or resolution changed during compilation; retry after edits settle')
}
