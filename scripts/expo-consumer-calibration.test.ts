import {describe,expect,test} from 'bun:test'
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve} from 'node:path'

type AttemptSample={runId:string;round:number;warmup:boolean;kind:'valid'|'failed';elapsedMs?:number;failureCode?:string}
const cellNames=['ios/plain','ios/core','ios/compatibility','android/plain','android/core','android/compatibility'] as const
const variants=['plain','core','compatibility'] as const
const platforms=['ios','android'] as const
const toolchain={
 node:{command:'node',resolvedPath:'/tool/node',realPath:'/real/node',version:'v24.15.0'},
 npm:{command:'npm',resolvedPath:'/tool/npm',realPath:'/real/npm',version:'11.12.1'},
 bun:{resolvedPath:'/tool/bun',realPath:'/real/bun',version:'1.4.2',nodeCompatibilityVersion:'v26.3.0'},
}

function makeCandidate(index:number,offset=0){
 const cohort=`cohort-${index}`,study=`study-${index}`
 const cells=platforms.flatMap(platform=>variants.map((variant,variantIndex)=>{
  const key=`${platform}/${variant}`,base=10+offset+index*10+variantIndex*3+(platform==='android'?2:0)
  const retained=[0,1,2,3,4].map(round=>({runId:`${cohort}-${key}-${round}`,round,warmup:false,kind:'valid' as const,elapsedMs:base+round}))
  const attempts:AttemptSample[]=[{runId:`${cohort}-${key}-warmup`,round:-1,warmup:true,kind:'valid',elapsedMs:base-1},...retained]
  const times=retained.map(x=>x.elapsedMs!)
  return {
   key,platform,variant,fixtureHash:`fixture-${key}`,packageHash:variant==='plain'?null:'package-v1',lockHash:`lock-${key}`,configHash:`config-${key}`,
   javascriptHash:`js-${key}`,sourceMapHash:`map-${key}-${index}`,hermesHash:`hbc-${key}`,nativeBinaryHash:`native-${key}-${index}`,
   javascriptBytes:1000+variantIndex,mappedJavascriptBytes:200+variantIndex,hermesBytes:300+variantIndex,
   attempts,reported:{retained:5,attempted:5,warmups:1,minMs:times[0],medianMs:times[2],maxMs:times[4]},
  }
 }))
 return {
  archivePath:`/tmp/m105-cohort-${index}`,studyId:study,cohortId:cohort,sourceHash:'source-v1',packageTarballHash:'tarball-v1',
  dependencies:{react:'19.2.0','react-native':'0.85.0'},developmentDependencies:{expo:'56.0.0'},dependencyGraphsHash:'graphs-v1',
  toolchainBefore:structuredClone(toolchain),toolchainAtCollectStart:structuredClone(toolchain),toolchainAfter:structuredClone(toolchain),
  toolchainCommands:(['node','npm'] as const).flatMap(tool=>[0,1,2].map(()=>({tool,resolvedPath:toolchain[tool].resolvedPath,realPath:toolchain[tool].realPath,args:['--version'],exitCode:0,stdout:toolchain[tool].version,stderr:''}))),
  environment:{platform:'darwin',architecture:'arm64',host:'macOS 26.4',xcode:'Xcode 26.4',adb:'Android Debug Bridge 1.0.41',java:'17.0.12',bunVersion:'1.4.2',bunNodeCompatibilityVersion:'v26.3.0',byPlatform:{ios:'iPhone-17/iOS-26.5',android:'Pixel-7/API-36'}},
  proofFailures:[],standaloneReport:{complete:true,failures:[]},cells,
 }
}

function withMutation<T>(value:T,mutate:(copy:any)=>void):T{const copy=structuredClone(value);mutate(copy);return copy}
function registeredFor(candidates:any[]){return candidates.map(({archivePath,studyId,cohortId})=>({archivePath,studyId,cohortId}))}
function admit(api:any,candidates:any[]){return api.admitCalibrationSnapshots(candidates,registeredFor(candidates))}
async function calibrationApi(){
 const api=await import('./expo-consumer-calibration').catch(()=>null)
 expect(api).not.toBeNull()
 return api as any
}

describe('M10.5 cohort calibration admission',()=>{
 test('admits exactly three comparable fresh cohorts and keeps each cohort summary separate',async()=>{
  const api=await calibrationApi(),candidates=[makeCandidate(2),makeCandidate(0),makeCandidate(1)]
  const admission=admit(api,candidates),report=api.summariseCalibration(admission)
  expect(admission.admitted.map((x:any)=>x.cohortId)).toEqual(['cohort-0','cohort-1','cohort-2'])
  expect(admission.excluded).toEqual([])
  expect(report.eligibleForPolicyProposal).toBe(true)
  expect(report.cohorts).toHaveLength(3)
  expect(report.cohorts[0].cells.find((x:any)=>x.key==='ios/plain')).toMatchObject({samples:[10,11,12,13,14],minMs:10,medianMs:12,maxMs:14})
  expect(report.cohortMedianRanges.find((x:any)=>x.key==='ios/plain')).toMatchObject({minMs:12,medianMs:22,maxMs:32})
  expect(report.targetApproved).toBe(false)
 })

 test('input order does not change the deterministic report',async()=>{
  const api=await calibrationApi(),candidates=[makeCandidate(0),makeCandidate(1),makeCandidate(2)]
  const first=api.summariseCalibration(admit(api,candidates))
  const second=api.summariseCalibration(admit(api,[...candidates].reverse()))
  expect(JSON.stringify(first)).toBe(JSON.stringify(second))
 })

 test('only the preregistered cohort, study, and archive identities can be admitted',async()=>{
  const api=await calibrationApi(),candidates=[makeCandidate(0),makeCandidate(1),makeCandidate(2)],registrations=registeredFor(candidates)
  const unregistered=api.admitCalibrationSnapshots(candidates)
  expect(api.summariseCalibration(unregistered).eligibleForPolicyProposal).toBe(false)
  expect(unregistered.excluded.every((x:any)=>x.reasons.includes('protocol-registration-mismatch'))).toBe(true)
  for(const mutate of [
   (x:any)=>{x.cohortId='cohort-not-registered'},
   (x:any)=>{x.studyId='study-not-registered'},
   (x:any)=>{x.archivePath='/tmp/archive-not-registered'},
  ]){
   const changed=withMutation(candidates[2],mutate),admission=api.admitCalibrationSnapshots([candidates[0],candidates[1],changed],registrations)
   expect(admission.admitted).toHaveLength(2)
   expect(admission.excluded).toMatchObject([{cohortId:changed.cohortId,reasons:['protocol-registration-mismatch']}])
   expect(api.summariseCalibration(admission).eligibleForPolicyProposal).toBe(false)
  }
 })

 test('fewer or extra preregistered cohorts are ineligible and never silently subsetted',async()=>{
  const api=await calibrationApi()
  for(const candidates of [[makeCandidate(0),makeCandidate(1)],[makeCandidate(0),makeCandidate(1),makeCandidate(2),makeCandidate(3)]]){
   const admission=admit(api,candidates),report=api.summariseCalibration(admission)
   expect(report.eligibleForPolicyProposal).toBe(false)
   expect(admission.admitted).toHaveLength(0)
   expect(admission.excluded.every((x:any)=>x.reasons.includes('cohort-count-mismatch'))).toBe(true)
  }
 })

 test('duplicate archive and cohort identities are excluded rather than counted twice',async()=>{
  const api=await calibrationApi(),a=makeCandidate(0),b=makeCandidate(1),duplicate=withMutation(makeCandidate(2),(x)=>{x.cohortId=a.cohortId})
  const byId=admit(api,[a,b,duplicate])
  expect(byId.admitted).toHaveLength(0)
  expect(byId.excluded.every((x:any)=>x.reasons.includes('duplicate-cohort-id'))).toBe(true)
  const duplicateStudy=withMutation(makeCandidate(2),(x)=>{x.studyId=a.studyId}),byStudy=admit(api,[a,b,duplicateStudy])
  expect(byStudy.admitted).toHaveLength(0)
  expect(byStudy.excluded.every((x:any)=>x.reasons.includes('duplicate-study-id'))).toBe(true)
  const byPath=admit(api,[a,b,withMutation(makeCandidate(2),(x)=>{x.archivePath=a.archivePath})])
  expect(byPath.admitted).toHaveLength(0)
  expect(byPath.excluded.some((x:any)=>x.reasons.includes('duplicate-archive'))).toBe(true)
 })

 test('missing executable receipts and changed Node, npm, Bun path or version fail closed',async()=>{
  const api=await calibrationApi(),a=makeCandidate(0),b=makeCandidate(1),c=makeCandidate(2)
  const missing=withMutation(c,(x)=>{x.toolchainAfter=null})
  expect(admit(api,[a,b,missing]).excluded.find((x:any)=>x.archivePath===missing.archivePath).reasons).toContain('missing-toolchain-receipts')
  const drift=withMutation(c,(x)=>{x.toolchainAfter.node.version='v24.16.0'})
  expect(admit(api,[a,b,drift]).excluded.find((x:any)=>x.archivePath===drift.archivePath).reasons).toContain('toolchain-drift')
  const pathDrift=withMutation(c,(x)=>{x.toolchainAfter.npm.realPath='/other/npm'})
  expect(admit(api,[a,b,pathDrift]).excluded.find((x:any)=>x.archivePath===pathDrift.archivePath).reasons).toContain('toolchain-drift')
  const crossCohortDrift=withMutation(c,(x)=>{x.toolchainBefore.node.version='v24.16.0';x.toolchainAtCollectStart.node.version='v24.16.0';x.toolchainAfter.node.version='v24.16.0';for(const receipt of x.toolchainCommands)if(receipt.tool==='node')receipt.stdout='v24.16.0'})
  expect(admit(api,[a,b,crossCohortDrift]).excluded.every((x:any)=>x.reasons.includes('toolchain-drift'))).toBe(true)
 })

 test('source, package, lock, generated config and runtime mismatches are reported',async()=>{
  const api=await calibrationApi(),a=makeCandidate(0),b=makeCandidate(1),c=makeCandidate(2)
  const cases:[string,(x:any)=>void,string][]=[
   ['source',(x)=>{x.sourceHash='source-v2'},'source-drift'],
   ['package',(x)=>{x.packageTarballHash='tarball-v2'},'package-drift'],
   ['lock',(x)=>{x.cells[0].lockHash='lock-v2'},'lock-drift'],
   ['config',(x)=>{x.cells[0].configHash='config-v2'},'config-drift'],
   ['runtime',(x)=>{x.environment.byPlatform.ios='iPhone-17/iOS-27'},'runtime-drift'],
  ]
  for(const [,mutate,reason]of cases){const changed=withMutation(c,mutate),admission=admit(api,[a,b,changed]);expect(admission.admitted).toHaveLength(0);expect(admission.excluded.every((x:any)=>x.reasons.includes(reason))).toBe(true)}
  const pinned=[a,b,c].map(candidate=>withMutation(candidate,(x)=>{x.expectedSourceHash='source-v2'})),pinAdmission=admit(api,pinned)
  expect(pinAdmission.admitted).toHaveLength(0)
  expect(pinAdmission.excluded.every((x:any)=>x.reasons.includes('source-drift'))).toBe(true)
 })

 test('missing cells, duplicate valid attempts, and incorrect warm-up accounting exclude the affected cohort',async()=>{
  const api=await calibrationApi(),a=makeCandidate(0),b=makeCandidate(1),c=makeCandidate(2)
  const missing=withMutation(c,(x)=>{x.cells=x.cells.slice(1)})
  expect(admit(api,[a,b,missing]).excluded.find((x:any)=>x.archivePath===missing.archivePath).reasons).toContain('missing-cell')
  const duplicate=withMutation(c,(x)=>{x.cells[0].attempts.push(structuredClone(x.cells[0].attempts[1]))})
  expect(admit(api,[a,b,duplicate]).excluded.find((x:any)=>x.archivePath===duplicate.archivePath).reasons).toContain('duplicate-attempt')
  const countedWarmup=withMutation(c,(x)=>{x.cells[0].reported.retained=6})
  expect(admit(api,[a,b,countedWarmup]).excluded.find((x:any)=>x.archivePath===countedWarmup.archivePath).reasons).toContain('invalid-retained-count')
 })

 test('failed attempts stay visible but never count as retained timings',async()=>{
  const api=await calibrationApi(),a=makeCandidate(0),b=makeCandidate(1),c=withMutation(makeCandidate(2),(x)=>{
   const cell=x.cells[0];cell.attempts.push({runId:'failed-retry',round:2,warmup:false,kind:'failed',failureCode:'launch-timeout'});cell.reported.attempted=6
  })
  const admission=admit(api,[a,b,c]),report=api.summariseCalibration(admission),cell=report.cohorts.find((x:any)=>x.cohortId==='cohort-2').cells.find((x:any)=>x.key==='ios/plain')
  expect(report.eligibleForPolicyProposal).toBe(true)
  expect(cell.samples).toHaveLength(5)
  expect(cell.failedAttempts).toEqual([{runId:'failed-retry',round:2,code:'launch-timeout'}])
  const failedWarmup=withMutation(c,(x)=>{x.standaloneReport.complete=false;x.cells[0].attempts[0].kind='failed';x.cells[0].attempts[0].failureCode='launch-timeout'})
  expect(admit(api,[a,b,failedWarmup]).excluded.find((x:any)=>x.archivePath===failedWarmup.archivePath).reasons).toContain('incomplete-study')
 })

 test('corrupt proof and JavaScript or Hermes byte drift are never hidden by another passing cohort',async()=>{
  const api=await calibrationApi(),a=makeCandidate(0),b=makeCandidate(1)
  const corrupt=withMutation(makeCandidate(2),(x)=>{x.proofFailures=['proof-drift:artifact']})
  expect(admit(api,[a,b,corrupt]).excluded.find((x:any)=>x.archivePath===corrupt.archivePath).reasons).toContain('artifact-integrity-failed')
  for(const field of ['javascriptHash','hermesHash']){
   const changed=withMutation(makeCandidate(2),(x)=>{x.cells[0][field]='different-bytes'})
   const admission=admit(api,[a,b,changed])
   expect(admission.admitted).toHaveLength(0)
   expect(admission.excluded.every((x:any)=>x.reasons.includes('artifact-drift'))).toBe(true)
  }
 })

 test('identical artifact bytes preserve timing drift per cohort and never pool launches',async()=>{
  const api=await calibrationApi(),candidates=[makeCandidate(0,0),makeCandidate(1,50),makeCandidate(2,100)]
  for(const candidate of candidates){for(const cell of candidate.cells){cell.javascriptHash='same-js-'+cell.key;cell.hermesHash='same-hbc-'+cell.key}}
  const admission=admit(api,candidates),report=api.summariseCalibration(admission)
  expect(report.eligibleForPolicyProposal).toBe(true)
  expect(report.artifactEquality.find((x:any)=>x.key==='ios/plain')).toMatchObject({javascriptEqual:true,hermesEqual:true})
  expect(report.artifactEquality.find((x:any)=>x.key==='ios/plain').sourceMapEqual).toBe(false)
  expect(report.cohorts.map((x:any)=>x.cells.find((cell:any)=>cell.key==='ios/plain').samples)).toHaveLength(3)
  expect(report.cohortMedianRanges.find((x:any)=>x.key==='ios/plain')).toMatchObject({minMs:12,medianMs:72,maxMs:132})
  expect(report.pooledLaunchSummary).toBeUndefined()
 })

 test('platforms and variants remain distinct in cohort and artifact summaries',async()=>{
  const api=await calibrationApi(),admission=admit(api,[makeCandidate(0),makeCandidate(1),makeCandidate(2)]),report=api.summariseCalibration(admission)
  expect(report.cohorts[0].cells.map((x:any)=>x.key)).toEqual(cellNames)
  expect(report.cohortMedianRanges.map((x:any)=>x.key)).toEqual(cellNames)
  expect(report.cohortMedianRanges.some((x:any)=>x.key==='ios+android/plain')).toBe(false)
 })

 test('archive reader reports malformed or missing archives instead of dropping them',async()=>{
  const api=await calibrationApi(),root=await mkdtemp(join(tmpdir(),'crumbs-calibration-reader-'))
  try{
   const malformed=join(root,'malformed'),missing=join(root,'missing'),other=join(root,'other')
   await mkdir(malformed);await writeFile(join(malformed,'study.json'),'{broken')
   const result=await api.readCalibrationCohorts([malformed,missing,other])
   expect(result.admitted).toHaveLength(0)
   expect(result.excluded).toHaveLength(3)
   expect(result.excluded.some((x:any)=>x.reasons.includes('malformed-archive'))).toBe(true)
   expect(result.excluded.some((x:any)=>x.reasons.includes('archive-unavailable'))).toBe(true)
   expect(result.excluded.every((x:any)=>x.reasons.includes('protocol-registration-mismatch'))).toBe(true)
  }finally{await rm(root,{recursive:true,force:true})}
 })

 test('historical H evidence copy is verified through its recorded archive and remains reference-only',async()=>{
  const api=await calibrationApi(),root=resolve(import.meta.dir,'..'),reference=join(root,'docs/evidence/2026-10-06-m10-5-expo-hermes'),summary=join(reference,'summary.json'),before=await readFile(summary,'utf8'),ledger=JSON.parse(await readFile(join(reference,'ledger.json'),'utf8')),rawSummary=join(ledger.archive,'summary.json'),rawBefore=await readFile(rawSummary,'utf8')
  const result=await api.readCalibrationCohorts(['/private/tmp/m105-unregistered-a','/private/tmp/m105-unregistered-b','/private/tmp/m105-unregistered-c'],reference)
  expect(result.reference).toMatchObject({studyId:'1cd1bcbe-77e6-4b99-8ed7-129faf21cebc',status:'legacy-unverified',complete:true})
  expect(result.excluded).toHaveLength(3)
  expect(await readFile(summary,'utf8')).toBe(before)
  expect(await readFile(rawSummary,'utf8')).toBe(rawBefore)
 })

 test('archive CLI rejects traversal, is deterministic, and exits non-zero for an ineligible set',async()=>{
  const api=await calibrationApi(),root=await mkdtemp(join(tmpdir(),'crumbs-calibration-cli-'))
  try{
   expect(()=>api.parseCalibrationArgs(['--archive','/tmp/a/../b','--archive','/tmp/c','--archive','/tmp/d','--out','/tmp/report.json'])).toThrow('canonical absolute')
   expect(()=>api.parseCalibrationArgs(['--archive','/tmp/a','--archive','/tmp/b','--archive','/tmp/c','--reference','/tmp/a'])).toThrow('must be separate')
   const archives=[0,1,2].map(i=>join(root,`missing-${i}`)),output=join(root,'report.json')
   const args=archives.flatMap(path=>['--archive',path]).concat(['--out',output])
   const first=await api.runCalibrationCommand(args),firstBytes=await readFile(output,'utf8')
   const second=await api.runCalibrationCommand(args),secondBytes=await readFile(output,'utf8')
   expect(first.exitCode).toBe(1);expect(second.exitCode).toBe(1)
   expect(firstBytes).toBe(secondBytes)
   expect(JSON.parse(firstBytes).eligibleForPolicyProposal).toBe(false)
   expect(await api.runCalibrationCommand(['--help'])).toMatchObject({exitCode:0})
  }finally{await rm(root,{recursive:true,force:true})}
 })
})
