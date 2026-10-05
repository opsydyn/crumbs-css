import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,readdirSync,lstatSync,mkdtempSync,cpSync,rmSync} from 'node:fs'
import {join,resolve,relative,isAbsolute} from 'node:path'
import {gunzipSync} from 'node:zlib'
import {tmpdir} from 'node:os'
import {readEmittedGraph} from '../packages/css/bench/effect-boundary-audit'
import {captureGuaranteesSourceIdentity} from './guarantees-matrix/source-identity'

const repositoryRoot=resolve(import.meta.dir,'..')
const defaultEvidence=join(repositoryRoot,'docs/evidence/2026-10-05-m10-5-completion')
const sha256=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex')
const read=(root:string,file:string)=>JSON.parse(readFileSync(join(root,file),'utf8'))
function files(root:string,base=root):string[]{
 return readdirSync(root).sort().flatMap(name=>{
  const file=join(root,name),stat=lstatSync(file)
  if(stat.isSymbolicLink())throw Error('Evidence symlink rejected: '+file)
  if(stat.isDirectory())return files(file,base)
  if(!stat.isFile())throw Error('Evidence requires regular files: '+file)
  return [relative(base,file)]
 })
}
function assert(value:unknown,message:string):asserts value {if(!value)throw Error(message)}
function validateMeasuredInputs(evidenceRoot:string){
 const current=captureGuaranteesSourceIdentity(repositoryRoot).sha256
 const raw=JSON.parse(gunzipSync(readFileSync(join(evidenceRoot,'metro/chain.json.gz'))).toString())
 assert(raw.shipping===true&&raw.watch===true&&raw.noDiskCache===false&&raw.trials.length===1&&raw.trials[0].mode==='fresh','Metro shipping/cache/watch scope differs')
 assert(raw.sourceIdentityBefore?.sha256===current&&raw.sourceIdentityAfter?.sha256===current,'Metro collection source identity differs')
 assert(raw.shippingBefore.length>0&&JSON.stringify(raw.shippingBefore)===JSON.stringify(raw.shippingAfter),'Metro inventory is empty or changed')
 for(const file of raw.shippingBefore){
  const marker='/packages/css/',index=file.path.indexOf(marker);assert(index>=0,'Unknown Metro inventory root')
  const path='packages/css/'+file.path.slice(index+marker.length);assert(!path.split('/').includes('..'),'Unsafe Metro source path')
  assert(sha256(readFileSync(join(repositoryRoot,path)))===file.sha256,'Metro source/artifact differs: '+path)
 }
 const input=read(evidenceRoot,'host-budgets/input-identity.json')
 assert(input.sourceBefore?.sha256===current&&input.sourceAfter?.sha256===current,'Host collection source identity differs')
 assert(input.artifactsBefore.length>0&&JSON.stringify(input.artifactsBefore)===JSON.stringify(input.artifactsAfter),'Host artifacts are empty or changed')
 for(const file of input.artifactsBefore)assert(sha256(readFileSync(join(repositoryRoot,'packages/css/dist',file.path)))===file.sha256,'Host artifact differs: '+file.path)
 const packed=read(evidenceRoot,'packed-consumer/qualification.json');assert(packed.source.digest===current,'Packed collection source identity differs')
 assert(['qualified-packed-ios-android-web-and-host','incomplete-host-performance'].includes(packed.status),'Packed qualification missing')
 const platforms=read(evidenceRoot,'packed-consumer/bundle-inventory.json');assert(JSON.stringify(platforms.map((x:any)=>x.platform).sort())===JSON.stringify(['android','ios','web']),'Packed platform inventory incomplete')
 for(const p of platforms)assert(p.sourceMaps.length>0&&['@opsydyn/crumbs-css','@acme/design-tokens','@acme/ui'].every(name=>p.packageSources[name]?.length>0),'Packed package provenance incomplete')
 const native=read(evidenceRoot,'native/source-files.json');assert(native.length>50&&['packages/css/dist/transformer.cjs','packages/css/src/transformer.ts','packages/css/src/compiler/resolution-identity.ts','packages/css/src/compiler/stable-resolution-compile.ts','apps/storybook/src/components/ReferenceButton.tsx'].every(path=>native.some((x:any)=>x.path===path)),'Native source inventory incomplete')
 for(const file of native)assert(sha256(readFileSync(join(repositoryRoot,file.path)))===file.sha256,'Native source/artifact differs: '+file.path)
 const artifacts=read(evidenceRoot,'native/runtime-artifacts.json');assert(artifacts.files.length>=artifacts.roots.length&&JSON.stringify(artifacts.roots)===JSON.stringify(['theme-core.mjs','theme-core.cjs','theme.mjs','theme.cjs','tokens.mjs','tokens.cjs','transformer.cjs']),'Native static graph inventory incomplete')
 const graph=new Map<string,{path:string;sha256:string}>()
 for(const entry of artifacts.roots)for(const file of readEmittedGraph(join(repositoryRoot,'packages/css/dist',entry)).artifacts){const path=relative(repositoryRoot,file.file);graph.set(path,{path,sha256:file.sha256})}
 const expected=[...graph.values()].sort((a,b)=>a.path.localeCompare(b.path))
 assert(JSON.stringify(artifacts.files)===JSON.stringify(expected),'Native static graph is truncated or duplicated')
 const collected=read(evidenceRoot,'native/collection-package-inventory.json').files
 assert(collected.length>0&&new Set(collected.map((x:any)=>x.path)).size===collected.length,'Pre-native artifact collection inventory incomplete')
 for(const file of expected)assert(collected.some((x:any)=>x.path.endsWith('/'+file.path)&&x.sha256===file.sha256),'Native static graph differs from collection-time artifact: '+file.path)
 for(const file of artifacts.files)assert(sha256(readFileSync(join(repositoryRoot,file.path)))===file.sha256,'Native runtime artifact differs: '+file.path)
 const metro=read(evidenceRoot,'metro/summary.json'), kinds=['initial','entry-edit','import-removal','entry-restored','plain-token','nested-css','workspace-source','import-replacement','alias-added','alias-retarget','workspace-package-import','manifest-exports','symlink-retarget','installation-lock-only','token-after-installation','syntax-error','syntax-repair']
 const projected=raw.trials[0].observations.map((row:any)=>Object.fromEntries(Object.entries(row).filter(([key])=>!['actual','reference','freshResult','result'].includes(key))))
 assert(JSON.stringify(metro.rows)===JSON.stringify(projected),'Metro summary differs from raw observations')
 assert(JSON.stringify(metro.rows.map((x:any)=>x.kind))===JSON.stringify(kinds),'Metro edit/control inventory incomplete')
 assert(metro.rows.find((x:any)=>x.kind==='syntax-error')?.status===500&&metro.rows.find((x:any)=>x.kind==='syntax-error')?.diagnostic===true,'Metro syntax negative control missing')
 const screenshots=read(evidenceRoot,'native/visual-final/screenshot-diff.json').comparisons
 assert(JSON.stringify(screenshots.map((x:any)=>x.platform).sort())===JSON.stringify(['android','ios']),'Native screenshot inventory incomplete')
 for(const frame of screenshots){assert(frame.baselineHash===sha256(readFileSync(join(evidenceRoot,'native/visual-final',frame.baseline)))&&frame.replayHash===sha256(readFileSync(join(evidenceRoot,'native/visual-final',frame.replay)))&&frame.baselineHash===frame.replayHash,'Native unchanged-frame byte identity differs')}
 const hmr=read(evidenceRoot,'native/hmr-final/observations.json');assert(JSON.stringify(Object.keys(hmr.platforms).sort())===JSON.stringify(['android','ios'])&&Object.values(hmr.platforms).every((x:any)=>x.before.probePixels===0&&x.changed.probePixels>1000&&x.restored.probePixels===0),'Native HMR inventory incomplete')
 const comparison=read(evidenceRoot,'host-budgets/comparison.json');assert(comparison.metrics.length===21&&new Set(comparison.metrics.map((x:any)=>x.id)).size===21,'Host metric inventory incomplete')
 const smoke=read(evidenceRoot,'host-budgets/legacy-smoke-results.json');assert(smoke.length===5&&smoke.every((x:any,i:number)=>x.repetition===i+1),'Host smoke repetition inventory incomplete')
}
export function verifyCompletionEvidence(evidenceRoot=defaultEvidence){
 validateMeasuredInputs(evidenceRoot)
 const manifest=read(evidenceRoot,'manifest.json')
 assert(manifest.format==='crumbs.m10-5-completion-evidence'&&manifest.version===1,'Unsupported evidence manifest')
 assert(manifest.sourceDigest===captureGuaranteesSourceIdentity(repositoryRoot).sha256,'Current source content differs from qualified content')
 const actual=files(evidenceRoot).filter(p=>p!=='manifest.json')
 assert(JSON.stringify(actual)===JSON.stringify(manifest.files.map((x:any)=>x.path)),'Evidence file inventory differs')
 for(const file of manifest.files){
  assert(typeof file.path==='string'&&!isAbsolute(file.path)&&!file.path.split(/[\\/]/).includes('..'),'Unsafe evidence path')
  assert(sha256(readFileSync(join(evidenceRoot,file.path)))===file.sha256,'Evidence hash mismatch: '+file.path)
 }
 for(const file of read(evidenceRoot,'native/source-files.json'))assert(sha256(readFileSync(join(repositoryRoot,file.path)))===file.sha256,'Native source/artifact differs: '+file.path)
 const metro=read(evidenceRoot,'metro/summary.json');assert(metro.shipping&&metro.shippingUnchanged,'Shipping Metro artifact drift')
 const success=metro.rows.filter((x:any)=>x.status===200);assert(success.length===16&&success.every((x:any)=>x.referenceMatched&&x.bundleSourceMatched),'Shipping Metro parity failure')
 const hmr=read(evidenceRoot,'native/hmr-final/observations.json');assert(hmr.status==='passed'&&hmr.sourceRestored,'Native HMR source not restored')
 assert(read(evidenceRoot,'native/worker-lifecycle.json').observedSurvivors.length===0,'Observed worker survivors')
 assert(read(evidenceRoot,'native/visual-final/screenshot-diff.json').comparisons.every((x:any)=>x.status==='passed'&&x.differentPixels===0),'Stable screenshot comparison failed')
 const qualification=read(evidenceRoot,'qualification.json')
 assert(qualification.physicalStatus==='deferred-by-user','Physical scope changed')
 return {verified:true,sourceDigest:manifest.sourceDigest,files:manifest.files.length,performanceQualified:read(evidenceRoot,'host-budgets/comparison.json').performanceQualified,physicalStatus:qualification.physicalStatus}
}
if(import.meta.main){
 const command=process.argv[2]
 if(command==='freeze'){
  validateMeasuredInputs(defaultEvidence)
  const entries=files(defaultEvidence).filter(path=>path!=='manifest.json').map(path=>({path,sha256:sha256(readFileSync(join(defaultEvidence,path)))}))
  writeFileSync(join(defaultEvidence,'manifest.json'),JSON.stringify({format:'crumbs.m10-5-completion-evidence',version:1,sourceDigest:captureGuaranteesSourceIdentity(repositoryRoot).sha256,files:entries},null,2)+'\n')
  console.log(JSON.stringify(verifyCompletionEvidence(),null,2))
 }else if(command==='verify')console.log(JSON.stringify(verifyCompletionEvidence(),null,2))
 else if(command==='tamper-check'){
  const root=mkdtempSync(join(tmpdir(),'crumbs-m105-evidence-tamper-'))
  try{
   cpSync(defaultEvidence,root,{recursive:true});const file=join(root,'metro/summary.json');writeFileSync(file,readFileSync(file,'utf8')+' ')
   let rejected=false;try{verifyCompletionEvidence(root)}catch(error){rejected=String(error).includes('Evidence hash mismatch: metro/summary.json')}
   assert(rejected,'Evidence tamper was not rejected');console.log('Evidence byte tamper rejected.')
   const cases=[
    {path:'native/visual-final/screenshot-diff.json',mutate:(x:any)=>({...x,comparisons:[]}),error:'Native screenshot inventory incomplete'},
    {path:'native/source-files.json',mutate:()=>[],error:'Native source inventory incomplete'},
    {path:'metro/summary.json',mutate:(x:any)=>({...x,rows:x.rows.map((r:any,i:number)=>i===1?x.rows[0]:r)}),error:'Metro summary differs from raw observations'},
    {path:'native/runtime-artifacts.json',mutate:(x:any)=>({...x,files:Array.from({length:7},()=>x.files.find((f:any)=>f.path==='packages/css/dist/transformer.cjs'))}),error:'Native static graph is truncated or duplicated'},
    {path:'host-budgets/input-identity.json',mutate:(x:any)=>({...x,sourceBefore:{...x.sourceBefore,sha256:'0'.repeat(64)}}),error:'Host collection source identity differs'},
   ]
   for(const control of cases){
    cpSync(defaultEvidence,root,{recursive:true});const path=join(root,control.path);writeFileSync(path,JSON.stringify(control.mutate(read(root,control.path)))+'\n')
    const manifest=read(root,'manifest.json');manifest.files.find((x:any)=>x.path===control.path).sha256=sha256(readFileSync(path));writeFileSync(join(root,'manifest.json'),JSON.stringify(manifest))
    let rejected=false;try{verifyCompletionEvidence(root)}catch(error){rejected=String(error).includes(control.error)}
    assert(rejected,'Rehashed incomplete evidence accepted: '+control.path);console.log('Rehashed incomplete evidence rejected: '+control.path)
   }
  }finally{rmSync(root,{recursive:true,force:true})}
 }else throw Error('Use freeze, verify, or tamper-check')
}
