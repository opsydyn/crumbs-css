import {createHash, randomUUID} from 'node:crypto'
import {spawn} from 'node:child_process'
import {createRequire} from 'node:module'
import {mkdir,readFile,readdir,writeFile,stat,realpath,statfs} from 'node:fs/promises'
import {join,resolve,dirname} from 'node:path'
import {assertRuntimeBundleSources} from './runtime-bundle-contract'
import {sameIdentity,type Identity,type Variant,type ArtifactRecord} from './expo-consumer-protocol'
let studySignal:AbortSignal|undefined
export function setStudySignal(signal?:AbortSignal){studySignal=signal}
export function checkStudyAbort(){studySignal?.throwIfAborted()}
const activeCommands=new Set<{kill:()=>void}>()
export function cancelCommands(){for(const child of activeCommands)child.kill()}
export const hash=(bytes:string|Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
export async function hashPath(path:string):Promise<string>{
 const s=await stat(path);if(s.isFile())return hash(await readFile(path))
 const entries=await readdir(path,{withFileTypes:true});const values:string[]=[]
 for(const e of entries.sort((a,b)=>a.name.localeCompare(b.name))){if(e.isSymbolicLink())throw Error('Symlink in artifact inventory: '+path);values.push(e.name+':'+await hashPath(join(path,e.name)))}return hash(values.join('\n'))
}
export async function runLogged(command:string[],cwd:string,archive:string,extraEnv:Record<string,string>={},signal=studySignal):Promise<string>{
 signal?.throwIfAborted()
 await mkdir(join(archive,'logs'),{recursive:true});const log=join(archive,'logs',`${Date.now()}-${randomUUID()}`)
 const safe=command.map(x=>x.replace(/([?&]token=)[^&]+/g,'$1REDACTED'))
 await writeFile(log+'.command.json',JSON.stringify({command:safe,cwd,environment:extraEnv},null,2))
 signal?.throwIfAborted()
 const child=spawn(command[0]!,command.slice(1),{cwd,env:{...process.env,...extraEnv},detached:true,stdio:['ignore','pipe','pipe']})
 const owned={kill(){if(child.pid)try{process.kill(-child.pid,'SIGKILL')}catch{}}};activeCommands.add(owned)
 const abort=()=>owned.kill();signal?.addEventListener('abort',abort,{once:true})
 const timer=setTimeout(abort,30*60*1000);let out='',err=''
 child.stdout!.setEncoding('utf8');child.stderr!.setEncoding('utf8');child.stdout!.on('data',x=>out+=x);child.stderr!.on('data',x=>err+=x)
 let exit:number|null=null,termination:string|null=null
 try{exit=await new Promise<number|null>((ok,fail)=>{child.once('error',fail);child.once('close',(code,sig)=>{termination=sig;ok(code)})})}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);activeCommands.delete(owned);await writeFile(log+'.stdout',out);await writeFile(log+'.stderr',err);await writeFile(log+'.exit.json',JSON.stringify({exit,termination,aborted:signal?.aborted??false}))}
 signal?.throwIfAborted();if(exit!==0)throw Error(`Command failed (${exit}): ${safe.join(' ')}; logs ${log}`);return out.trim()
}
export async function requireDiskSpace(path:string,minimumBytes:number,phase:string){const fs=await statfs(path),available=fs.bavail*fs.bsize;if(available<minimumBytes)throw Error(`${phase} requires at least ${(minimumBytes/2**30).toFixed(1)} GiB free; ${(available/2**30).toFixed(1)} GiB available at ${path}`);return available}
export type ProofInventory=Array<{path:string;hash:string}>
export async function captureProofInventory(paths:string[]):Promise<ProofInventory>{return Promise.all([...new Set(paths)].sort().map(async path=>({path,hash:await hashPath(path)})))}
export async function validateProofInventory(inventory:ProofInventory){const failures:string[]=[];if(!Array.isArray(inventory)||!inventory.length)return ['missing-proof-inventory'];for(const item of inventory){try{if(await hashPath(item.path)!==item.hash)failures.push('proof-drift:'+item.path)}catch{failures.push('missing-proof:'+item.path)}}return failures}
export function compareDependencyGraphs(locks:any[]){
 if(locks.length<2)throw Error('Missing dependency graphs')
 const normalize=(lock:any)=>{
  const packages=lock.packages??{},graph:Record<string,any>={}
  const key=(p:string)=>p.split('node_modules/').at(-1)+'@'+packages[p].version
  const resolveDependency=(p:string,name:string)=>{let base=p;while(base){const candidate=base+'/node_modules/'+name;if(packages[candidate])return key(candidate);base=base.includes('/node_modules/')?base.slice(0,base.lastIndexOf('/node_modules/')):''}return packages['node_modules/'+name]?key('node_modules/'+name):null}
  for(const [path,v]of Object.entries(packages) as [string,any][]){if(!path)continue;const dependencies=Object.fromEntries(Object.keys({...v.dependencies,...v.optionalDependencies,...v.peerDependencies}).sort().map(name=>[name,resolveDependency(path,name)]));const name=key(path),value={version:v.version,integrity:v.integrity,resolved:path==='node_modules/@opsydyn/crumbs-css'?'packed-study-tarball':v.resolved,dependencies};if(graph[name]&&JSON.stringify(graph[name])!==JSON.stringify(value))throw Error('Ambiguous dependency resolution: '+name);graph[name]=value}
  return Object.fromEntries(Object.entries(graph).sort(([a],[b])=>a.localeCompare(b)))
 }
 const graphs=locks.map(normalize),common=graphs[0]!,allowed=new Set<string>()
 function visit(id:string,graph:Record<string,any>){if(allowed.has(id))return;allowed.add(id);for(const dep of Object.values(graph[id]?.dependencies??{}) as Array<string|null>)if(dep&&graph[dep])visit(dep,graph)}
 for(const g of graphs.slice(1)){const crumb=Object.keys(g).find(k=>k.startsWith('@opsydyn/crumbs-css@'));if(crumb)visit(crumb,g)}
 for(const g of graphs.slice(1)){for(const [p,v]of Object.entries(common))if(JSON.stringify(g[p])!==JSON.stringify(v))throw Error('Common dependency drift: '+p);for(const p of Object.keys(g))if(!(p in common)&&!allowed.has(p))throw Error('Unrelated dependency difference: '+p)}
 const extras=graphs.slice(1).map(g=>Object.fromEntries(Object.entries(g).filter(([p])=>!(p in common))));for(const e of extras.slice(1))if(JSON.stringify(e)!==JSON.stringify(extras[0]))throw Error('Crumbs closure differs')
 return {common,crumbsOnly:extras[0],allowedClosure:[...allowed].sort()}
}
export function assertHermes(bytes:Uint8Array):number{const b=Buffer.from(bytes);if(b.length<12||b.readBigUInt64LE(0)!==0x1f1903c103bc1fc6n)throw Error('Not Hermes bytecode');const v=b.readUInt32LE(8);if(v===0)throw Error('Invalid Hermes version');return v}
type MapRecord={version:number;sources?:string[];sourceRoot?:string;names?:string[];mappings?:string;sections?:Array<{offset:{line:number;column:number};map:MapRecord}>}
export function attributeJavaScript(bundle:string,input:unknown,variant:Variant,decoderRoot=resolve(import.meta.dir,'../apps/playground')){
 const require=createRequire(join(decoderRoot,'package.json'));const {decode}=require('@jridgewell/sourcemap-codec') as {decode:(m:string)=>number[][][]}
 const lines=bundle.split('\n').map(x=>x.endsWith('\r')?x.slice(0,-1):x),segments=new Map<number,Array<{column:number;source:string|null}>>(),sources:string[]=[]
 function walk(map:MapRecord,lineOffset=0,columnOffset=0){
  if(map?.version!==3)throw Error('Unsupported source map')
  if(map.sections){let previous=-1;for(const section of map.sections){const {line,column}=section.offset;if(!Number.isInteger(line)||!Number.isInteger(column)||line<0||column<0)throw Error('Invalid section offset');const index=line*1e9+column;if(index<=previous)throw Error('Unordered sections');previous=index;const target=lineOffset+line,col=line===0?columnOffset+column:column;for(const [n,items]of segments){if(n>target)segments.delete(n);else if(n===target)segments.set(n,items.filter(x=>x.column<col))}const items=segments.get(target)??[];items.push({column:col,source:null});segments.set(target,items);walk(section.map,target,col)}return}
  if(typeof map.mappings!=='string'||!Array.isArray(map.sources))throw Error('Malformed source map')
  const names=map.sources.map(s=>(map.sourceRoot?map.sourceRoot.replace(/\/$/,'')+'/':'')+s);sources.push(...names)
  decode(map.mappings).forEach((line,i)=>{let previous=-1;for(const segment of line){const column=segment[0]!;if(!Number.isInteger(column)||column<0||column<=previous)throw Error('Unordered/duplicate mapping');previous=column;const source=segment.length===1?null:names[segment[1]!];if(source===undefined)throw Error('Invalid source index');const target=lineOffset+i;const existing=segments.get(target)??[];const mappedColumn=column+(i===0?columnOffset:0);if(existing.at(-1)?.column===mappedColumn&&existing.at(-1)?.source===null)existing.pop();existing.push({column:mappedColumn,source});segments.set(target,existing)}})
 }
 walk(input as MapRecord)
 const unique=[...new Set(sources)].map(s=>s.replaceAll('\\','/'));assertRuntimeBundleSources(unique)
 if(unique.some(s=>/(?:^|\/)packages\/css\/|@opsydyn\/crumbs-css\/src\//.test(s)))throw Error('Repository Crumbs source in consumer')
 const crumbs=unique.filter(s=>s.includes('@opsydyn/crumbs-css/'))
 if(variant==='plain'&&crumbs.length)throw Error('Crumbs code in plain control')
 if(variant!=='plain'&&!crumbs.some(s=>new RegExp(`/dist/theme${variant==='core'?'-core':''}\\.(?:mjs|cjs)$`).test(s)))throw Error('Missing selected packed runtime entry')
 const reactRoots=new Set(unique.filter(s=>/(?:^|\/)node_modules\/react\//.test(s)).map(s=>s.split('/node_modules/react/')[0]))
 if(reactRoots.size>1)throw Error('Multiple React runtime roots')
 const groups:Record<string,number>={crumbs:0,reactNativeExpo:0,fixture:0,other:0};let unmappedBytes=0
 const classify=(s:string)=>s.includes('@opsydyn/crumbs-css/')?'crumbs':/(?:^|\/)node_modules\/(?:react(?:-native)?\/|expo\/|@expo\/)/.test(s)?'reactNativeExpo':!s.includes('node_modules/')?'fixture':'other'
 for(const [lineNo,segs]of segments)if(lineNo>=lines.length||segs.some(s=>s.column>lines[lineNo]!.length))throw Error('Mapping outside generated bundle')
 for(let i=0;i<lines.length;i++){
  const line=lines[i]!,segs=segments.get(i)??[];let column=0,source:string|null=null
  for(const segment of segs){if(segment.column<column)throw Error('Overlapping indexed mapping');if(segment.column>0&&segment.column<line.length&&/[\uD800-\uDBFF]/.test(line[segment.column-1]!)&&/[\uDC00-\uDFFF]/.test(line[segment.column]!))throw Error('Mapping splits surrogate pair');const n=Buffer.byteLength(line.slice(column,segment.column),'utf8');if(source===null)unmappedBytes+=n;else groups[classify(source)]!+=n;column=segment.column;source=segment.source}
  const n=Buffer.byteLength(line.slice(column),'utf8');if(source===null)unmappedBytes+=n;else groups[classify(source)]!+=n;if(i<lines.length-1)unmappedBytes+=bundle.split('\n')[i]!.endsWith('\r')?2:1
 }
 const totalBytes=Buffer.byteLength(bundle,'utf8');if(Object.values(groups).reduce((a,b)=>a+b,unmappedBytes)!==totalBytes)throw Error('Byte conservation failed')
 return {totalBytes,groups,unmappedBytes,sources:unique}
}
export async function validateArtifacts(record:ArtifactRecord):Promise<{ok:boolean;failures:string[]}>{
 const failures:string[]=[]
 for(const [path,expected]of [[record.nativeBinaryPath,record.nativeBinaryHash],[record.embeddedHermesPath,record.embeddedHermesHash],[record.exportedHermesPath,record.exportedHermesHash]] as const){try{if(!expected||await hashPath(path)!==expected)failures.push('artifact-hash-mismatch:'+path)}catch{failures.push('missing-artifact:'+path)}}
 try{const a=await readFile(record.embeddedHermesPath),b=await readFile(record.exportedHermesPath);if(assertHermes(a)!==assertHermes(b)||!a.equals(b))failures.push('embedded/export-bytecode-mismatch');await readFile(record.javascriptPath);await readFile(record.sourceMapPath);const inventory=JSON.parse(await readFile(record.inventoryPath,'utf8'));if(!sameIdentity(inventory.identity,record.identity))failures.push('inventory-identity-mismatch');for(const path of [record.javascriptPath,record.sourceMapPath]){const item=inventory.files?.find((f:any)=>f.path===path);if(!item||await hashPath(path)!==item.hash)failures.push('bundle/map-inventory-drift:'+path)}}catch(error){failures.push(String(error))}
 return {ok:failures.length===0,failures}
}
export async function filesUnder(root:string):Promise<string[]>{const out:string[]=[];for(const e of await readdir(root,{withFileTypes:true})){const p=join(root,e.name);if(e.isDirectory())out.push(...await filesUnder(p));else if(e.isFile())out.push(p)}return out.sort()}
export async function exportArtifacts(stage:string,identity:Identity,archive:string){
 const base=join(archive,'exports',identity.platform,identity.variant);await mkdir(base,{recursive:true})
 const expo=join(stage,'node_modules/.bin/expo');const env={EXPO_NO_METRO_WORKSPACE_ROOT:'1',CI:'1'}
 for(const mode of ['javascript','hermes'])await runLogged([expo,'export','--platform',identity.platform,'--source-maps','--max-workers','2','--clear','--output-dir',join(base,mode),...(mode==='javascript'?['--no-bytecode']:[])],stage,archive,env)
 const jsFiles=await filesUnder(join(base,'javascript')),hFiles=await filesUnder(join(base,'hermes'))
 const javascriptPath=jsFiles.find(p=>p.endsWith('.js'))!,sourceMapPath=jsFiles.find(p=>p===javascriptPath+'.map')??jsFiles.find(p=>p.endsWith('.map'))!
 const bytecodeFiles:string[]=[];for(const p of hFiles){if(p.endsWith('.map'))continue;const b=await readFile(p);try{assertHermes(b);bytecodeFiles.push(p)}catch{}}
 if(!javascriptPath||!sourceMapPath||bytecodeFiles.length!==1)throw Error('Expected exactly one JS/map and one Hermes bundle')
 const exportedHermesPath=bytecodeFiles[0]!,attribution=attributeJavaScript(await readFile(javascriptPath,'utf8'),JSON.parse(await readFile(sourceMapPath,'utf8')),identity.variant,stage)
 const inventoryPath=join(base,'inventory.json');const files=await Promise.all([...jsFiles,...hFiles].map(async path=>({path,hash:await hashPath(path),bytes:(await stat(path)).size})))
 await writeFile(inventoryPath,JSON.stringify({identity,attribution,hermes:{version:assertHermes(await readFile(exportedHermesPath)),bytes:(await stat(exportedHermesPath)).size},decoder:createRequire(join(stage,'package.json')).resolve('@jridgewell/sourcemap-codec'),files},null,2))
 return {javascriptPath,sourceMapPath,exportedHermesPath,inventoryPath}
}
