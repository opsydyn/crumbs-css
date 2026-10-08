/** THROWAWAY M10.5 probe: no production adoption. */
type DataStep =
 | readonly [0, boolean, string]
 | readonly [1, boolean, string]
 | readonly [2, string, string, boolean]
 | readonly [3, string]
 | readonly [4, string]
 | readonly [5, string]
 | readonly [6, string, string]
 | readonly [7, boolean]
 | readonly [8, string]
type DataProgram = readonly DataStep[]
function program<const T extends readonly (readonly unknown[])[]>(steps:T):T {for(const step of steps)Object.freeze(step);return Object.freeze(steps)}
export const contractRecord: DataProgram = /* @__PURE__ */ program([[0,false,' must be a plain data record.'],[1,true,' must be a plain data record.'],[2,' cannot contain symbol keys.',' must contain enumerable data properties.',false]] as const)
export const extensionRecord: DataProgram = /* @__PURE__ */ program([[0,false,' must be a plain data record'],[1,false,' must be a plain data record'],[2,' cannot contain symbol keys',' must be an enumerable data property',true]] as const)
export const themeRecord: DataProgram = /* @__PURE__ */ program([[0,true,' must be a record'],[1,false,' must be a plain record'],[3,' must contain enumerable data properties']] as const)
export const planRecord: DataProgram = /* @__PURE__ */ program([[0,true,' must be a plain record'],[1,false,' must be a plain record'],[3,' must contain enumerable data properties']] as const)
export const contractArray: DataProgram = /* @__PURE__ */ program([[4,' must be an array.'],[5,' cannot contain symbol properties.'],[6,' must contain only indexed values.',' must contain only indexed values.'],[7,true],[8,' must contain dense enumerable data values.']] as const)
export const extensionArray: DataProgram = /* @__PURE__ */ program([[4,' must be an array'],[6,' cannot contain symbol properties',' must contain only indexed data values'],[7,false],[8,' must contain dense enumerable data values']] as const)
export function runData(program: DataProgram,value: unknown,context: string): unknown {
 let keys: Array<string|symbol> = [], descriptors: Record<string,PropertyDescriptor|undefined> = Object.create(null)
 const entries: Array<[string,unknown]> = [], result: unknown[] = []
 const fail: (suffix:string,key?:string)=>never = (suffix,key)=>{throw new TypeError(context+(key===undefined?'':'.'+key)+suffix)}
 for (const step of program) {
  switch(step[0]) {
   case 0:
    if(step[1] ? value===null || typeof value!=='object' || Array.isArray(value) : typeof value!=='object' || value===null || Array.isArray(value))fail(step[2]);break
   case 1:
    if(step[1]) {if(Object.getPrototypeOf(value)!==Object.prototype && Object.getPrototypeOf(value)!==null)fail(step[2])}
    else {const p=Object.getPrototypeOf(value);if(p!==Object.prototype && p!==null)fail(step[2])}break
   case 2:
    for(const key of Reflect.ownKeys(value as object)) {
     if(typeof key!=='string')fail(step[1])
     const d=Object.getOwnPropertyDescriptor(value,key)
     if(d===undefined || !('value' in d) || !d.enumerable)fail(step[2],step[3]?key:undefined)
     entries.push([key,d.value])
    }return entries
   case 3:
    for(const d of Object.values(Object.getOwnPropertyDescriptors(value)))if(!('value' in d)||!d.enumerable)fail(step[1]);return
   case 4:if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail(step[1]);break
   case 5:if(Object.getOwnPropertySymbols(value).length>0)fail(step[1]);break
   case 6:
    keys=Reflect.ownKeys(value as object)
    for(const key of keys) {
     if(key==='length')continue
     if(typeof key!=='string')fail(step[1])
     if(!/^(0|[1-9][0-9]*)$/.test(key)||Number(key)>=(value as unknown[]).length)fail(step[2])
    }break
   case 7:
    if(step[1])for(const key of keys)descriptors[String(key)]=Object.getOwnPropertyDescriptor(value,key)
    else descriptors=Object.getOwnPropertyDescriptors(value);break
   case 8:
    for(let i=0;i<(value as unknown[]).length;i++) {
     const d=descriptors[String(i)]
     if(d===undefined||!('value' in d)||!d.enumerable)fail(step[1])
     result.push(d.value)
    }return result
  }
 }
}
export const contractKeys = /* @__PURE__ */ Object.freeze([' is missing ',' has unknown property ','.'] as const)
export const extensionKeys = /* @__PURE__ */ Object.freeze([' is missing ',' has unknown field ',''] as const)
export function runKeys(policy:readonly [string,string,string],entries:ReadonlyArray<readonly [string,unknown]>,required:ReadonlyArray<string>,optional:ReadonlyArray<string>,context:string):void {
 const keys=new Set(entries.map(([key])=>key))
 for(const key of required)if(!keys.has(key))throw new TypeError(context+policy[0]+JSON.stringify(key)+policy[2])
 for(const key of keys)if(!required.includes(key)&&!optional.includes(key))throw new TypeError(context+policy[1]+JSON.stringify(key)+policy[2])
}
// The arithmetic program controls operand reads and recursive evaluation order.
type NumberStep=readonly [0,string] | readonly [1,string] | readonly [2] | readonly [3] | readonly [4] | readonly [5]
export type NumberProgram=readonly NumberStep[]
export const numberPrograms:Readonly<Record<'add'|'subtract'|'scale'|'clamp',NumberProgram>>=/* @__PURE__ */ Object.freeze({
 add:/* @__PURE__ */ program([[0,'left'],[0,'right'],[2]] as const),
 subtract:/* @__PURE__ */ program([[0,'left'],[0,'right'],[3]] as const),
 scale:/* @__PURE__ */ program([[0,'expression'],[1,'factor'],[4]] as const),
 clamp:/* @__PURE__ */ program([[0,'expression'],[5]] as const),
})
export function runNumber(program:NumberProgram,expression:Record<string,unknown>,evaluate:(node:unknown)=>unknown):number {
 const stack:number[]=[]
 for(const step of program)switch(step[0]) {
  case 0:stack.push(evaluate(expression[step[1]]) as number);break
  case 1:stack.push(expression[step[1]] as number);break
  case 2:{const right=stack.pop()!;stack.push(stack.pop()!+right);break}
  case 3:{const right=stack.pop()!;stack.push(stack.pop()!-right);break}
  case 4:{const right=stack.pop()!;stack.push(stack.pop()!*right);break}
  case 5:stack.push(Math.min(expression.maximum as number,Math.max(expression.minimum as number,stack.pop()!)));break
 }
 return stack[0]!
}
