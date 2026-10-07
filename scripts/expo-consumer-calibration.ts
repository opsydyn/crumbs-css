import {mkdir,readFile,realpath,stat,writeFile} from 'node:fs/promises'
import {basename,dirname,isAbsolute,join,relative,resolve,sep} from 'node:path'
import {hash,hashPath} from './expo-consumer-artifacts'
import {platforms,variants,type Platform,type Variant} from './expo-consumer-protocol'
import {sameToolchainIdentity,type ToolchainIdentity} from './expo-consumer-native'
import {runStudy} from './measure-expo-consumer-runtime'

export type CalibrationExclusion=
 |'cohort-count-mismatch'|'archive-path-not-canonical'|'duplicate-archive'|'archive-unavailable'|'malformed-archive'
 |'protocol-registration-mismatch'
 |'standalone-report-invalid'|'incomplete-study'|'missing-cell'|'duplicate-attempt'|'invalid-warmups'|'invalid-retained-count'|'invalid-attempts'
 |'missing-toolchain-receipts'|'toolchain-drift'|'duplicate-cohort-id'|'duplicate-study-id'|'source-drift'|'package-drift'|'dependency-drift'
 |'lock-drift'|'config-drift'|'runtime-drift'|'fixture-drift'|'artifact-drift'|'artifact-integrity-failed'

export type CalibrationAttempt={runId:string;platform?:Platform;variant?:Variant;round:number;warmup:boolean;kind:'valid'|'failed';elapsedMs?:number;failureCode?:string}
export type ToolchainCommandReceipt={tool:'node'|'npm';resolvedPath:string;realPath:string;args:string[];exitCode:number;stdout:string;stderr:string}
export type CalibrationCellSnapshot={
 key:string;platform:Platform;variant:Variant;fixtureHash:string;packageHash:string|null;lockHash:string;configHash:string
 javascriptHash:string;sourceMapHash:string;hermesHash:string;nativeBinaryHash:string
 javascriptBytes:number;mappedJavascriptBytes:number;hermesBytes:number
 attempts:CalibrationAttempt[];reported:{retained:number;attempted:number;warmups:number;minMs:number|null;medianMs:number|null;maxMs:number|null}
}
export type CalibrationSnapshot={
 archivePath:string;studyId?:string;cohortId?:string;sourceHash?:string;expectedSourceHash?:string;packageTarballHash?:string
 dependencies?:Record<string,string>;developmentDependencies?:Record<string,string>;dependencyGraphsHash?:string
 toolchainBefore?:ToolchainIdentity|null;toolchainAtCollectStart?:ToolchainIdentity|null;toolchainAfter?:ToolchainIdentity|null;toolchainCommands?:ToolchainCommandReceipt[]
 environment?:{platform:string;architecture:string;host:string;xcode:string;adb:string;java:string;bunVersion:string;bunNodeCompatibilityVersion:string;byPlatform:Record<Platform,string>}
 proofFailures?:string[];standaloneReport?:{complete:boolean;failures:string[]};cells?:CalibrationCellSnapshot[]
 ingestReasons?:CalibrationExclusion[]
}
export type CalibrationReference={archivePath:string;studyId:string|null;cohortId:string|null;status:'verified-reference'|'legacy-unverified'|'unavailable';reasons:string[];complete:boolean|null}
export type CalibrationRegistration={archivePath:string;studyId:string;cohortId:string}
export type CalibrationComparisonKey={sourceHash:string;packageTarballHash:string;dependencies:Record<string,string>;developmentDependencies:Record<string,string>;dependencyGraphsHash:string;toolchain:ToolchainIdentity;environment:CalibrationSnapshot['environment'];cells:Array<{key:string;fixtureHash:string;packageHash:string|null;lockHash:string;configHash:string;javascriptHash:string;hermesHash:string}>}
export type CalibrationAdmission={admitted:CalibrationSnapshot[];excluded:Array<{archivePath:string;cohortId?:string;reasons:CalibrationExclusion[];complete?:boolean;failures?:string[]}>;comparisonKey:CalibrationComparisonKey|null;reference?:CalibrationReference}

const expectedKeys=platforms.flatMap(platform=>variants.map(variant=>`${platform}/${variant}`))
const configFiles=['index.js','scene.js','package.json','package-lock.json','tsconfig.json','metro.config.js','babel.config.js','app.json']
const ownTools=(value:any):value is ToolchainIdentity=>Boolean(value&&value.node?.command==='node'&&value.npm?.command==='npm'&&value.node.resolvedPath&&value.node.realPath&&value.node.version&&value.npm.resolvedPath&&value.npm.realPath&&value.npm.version&&value.bun?.resolvedPath&&value.bun?.realPath&&value.bun?.version&&value.bun?.nodeCompatibilityVersion)
const canonical=(value:any):any=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
export const stableCalibrationJson=(value:unknown)=>JSON.stringify(canonical(value))
const median=(values:number[])=>{const ordered=[...values].sort((a,b)=>a-b),middle=Math.floor(ordered.length/2);return ordered.length===0?null:ordered.length%2?ordered[middle]:(ordered[middle-1]!+ordered[middle]!)/2}
const within=(parent:string,child:string)=>{const path=relative(parent,child);return path===''||(!path.startsWith(`..${sep}`)&&path!=='..'&&!isAbsolute(path))}
const pairKey=(cell:CalibrationCellSnapshot)=>`${cell.platform}/${cell.variant}`
const unique=(values:unknown[])=>new Set(values.map(stableCalibrationJson)).size
const ensureReasons=(map:Map<string,Set<CalibrationExclusion>>,snapshot:CalibrationSnapshot,reason:CalibrationExclusion)=>{const reasons=map.get(snapshot.archivePath)??new Set<CalibrationExclusion>();reasons.add(reason);map.set(snapshot.archivePath,reasons)}

function validateSnapshot(snapshot:CalibrationSnapshot,reasons:Set<CalibrationExclusion>){
 for(const reason of snapshot.ingestReasons??[])reasons.add(reason)
 if(!snapshot.studyId||!snapshot.cohortId||!snapshot.sourceHash||!snapshot.packageTarballHash||!snapshot.dependencies||!snapshot.developmentDependencies||!snapshot.dependencyGraphsHash||!snapshot.environment||!snapshot.standaloneReport||!Array.isArray(snapshot.cells))reasons.add('malformed-archive')
 if(snapshot.expectedSourceHash&&snapshot.sourceHash!==snapshot.expectedSourceHash)reasons.add('source-drift')
 if(snapshot.proofFailures?.length)reasons.add('artifact-integrity-failed')
 if(!snapshot.standaloneReport?.complete)reasons.add(snapshot.standaloneReport?'incomplete-study':'standalone-report-invalid')
 if(!ownTools(snapshot.toolchainBefore)||!ownTools(snapshot.toolchainAtCollectStart)||!ownTools(snapshot.toolchainAfter))reasons.add('missing-toolchain-receipts')
 else if(!sameToolchainIdentity(snapshot.toolchainBefore,snapshot.toolchainAtCollectStart)||!sameToolchainIdentity(snapshot.toolchainAtCollectStart,snapshot.toolchainAfter))reasons.add('toolchain-drift')
 if(!ownTools(snapshot.toolchainBefore)||!Array.isArray(snapshot.toolchainCommands)||snapshot.toolchainCommands.length!==6)reasons.add('missing-toolchain-receipts')
 else for(const tool of ['node','npm'] as const){const executable=snapshot.toolchainBefore[tool],receipts=snapshot.toolchainCommands.filter(receipt=>receipt.tool===tool);if(receipts.length!==3)reasons.add('missing-toolchain-receipts');if(receipts.some(receipt=>receipt.resolvedPath!==executable.resolvedPath||receipt.realPath!==executable.realPath||receipt.exitCode!==0||stableCalibrationJson(receipt.args)!==stableCalibrationJson(['--version'])||receipt.stdout.trim()!==executable.version))reasons.add('toolchain-drift')}
 const cells=snapshot.cells??[],byKey=new Map<string,CalibrationCellSnapshot[]>(),allRunIds=new Set<string>()
 for(const cell of cells){const key=pairKey(cell),items=byKey.get(key)??[];items.push(cell);byKey.set(key,items)}
 if(expectedKeys.some(key=>!byKey.has(key))||expectedKeys.some(key=>(byKey.get(key)?.length??0)!==1)||cells.length!==expectedKeys.length)reasons.add('missing-cell')
 for(const cell of cells){
  const cellIds=new Set<string>(),warmups=cell.attempts.filter(attempt=>attempt.warmup),retained=cell.attempts.filter(attempt=>!attempt.warmup),valid=retained.filter(attempt=>attempt.kind==='valid'),failedWarmups=warmups.filter(attempt=>attempt.kind!=='valid')
  for(const attempt of cell.attempts){if(allRunIds.has(attempt.runId)||cellIds.has(attempt.runId))reasons.add('duplicate-attempt');allRunIds.add(attempt.runId);cellIds.add(attempt.runId)}
  if(warmups.length!==1||warmups[0]?.round!==-1||warmups[0]?.kind!=='valid'||failedWarmups.length)reasons.add('invalid-warmups')
  const rounds=valid.map(attempt=>attempt.round).sort((a,b)=>a-b)
  if(valid.length!==5||cell.reported.retained!==5||rounds.join(',')!=='0,1,2,3,4'||retained.length<5)reasons.add('invalid-retained-count')
  if(retained.length!==cell.reported.attempted||valid.length!==cell.reported.retained||warmups.length!==cell.reported.warmups)reasons.add('invalid-attempts')
  const times=valid.map(attempt=>attempt.elapsedMs).filter((value):value is number=>typeof value==='number'&&Number.isFinite(value))
  if(times.length!==valid.length||cell.reported.minMs!==Math.min(...times)||cell.reported.medianMs!==median(times)||cell.reported.maxMs!==Math.max(...times))reasons.add('invalid-attempts')
  if(!cell.fixtureHash||!cell.lockHash||!cell.configHash||!cell.javascriptHash||!cell.sourceMapHash||!cell.hermesHash||!cell.nativeBinaryHash||!Number.isFinite(cell.javascriptBytes)||!Number.isFinite(cell.mappedJavascriptBytes)||!Number.isFinite(cell.hermesBytes))reasons.add('artifact-integrity-failed')
 }
}

export function admitCalibrationSnapshots(snapshots:readonly CalibrationSnapshot[],registrations:readonly CalibrationRegistration[]=[]):CalibrationAdmission{
 const candidates=[...snapshots],reasonsByPath=new Map<string,Set<CalibrationExclusion>>()
 if(candidates.length!==3){for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'cohort-count-mismatch')}
 const validRegistrations=registrations.length===3&&new Set(registrations.map(registration=>registration.cohortId)).size===3&&new Set(registrations.map(registration=>registration.studyId)).size===3&&new Set(registrations.map(registration=>resolve(registration.archivePath))).size===3&&registrations.every(registration=>Boolean(registration.cohortId&&registration.studyId&&isAbsolute(registration.archivePath)&&resolve(registration.archivePath)===registration.archivePath))
 for(const snapshot of candidates){const registration=registrations.find(candidate=>candidate.cohortId===snapshot.cohortId);if(!validRegistrations||!registration||registration.studyId!==snapshot.studyId||resolve(registration.archivePath)!==resolve(snapshot.archivePath))ensureReasons(reasonsByPath,snapshot,'protocol-registration-mismatch')}
 const paths=new Set(candidates.map(snapshot=>resolve(snapshot.archivePath)))
 if(paths.size!==candidates.length){for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'duplicate-archive')}
 const cohortIds=candidates.map(snapshot=>snapshot.cohortId).filter(Boolean)
 if(new Set(cohortIds).size!==cohortIds.length){for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'duplicate-cohort-id')}
 const studyIds=candidates.map(snapshot=>snapshot.studyId).filter(Boolean)
 if(new Set(studyIds).size!==studyIds.length){for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'duplicate-study-id')}
 for(const snapshot of candidates)validateSnapshot(snapshot,reasonsByPath.get(snapshot.archivePath)??(reasonsByPath.set(snapshot.archivePath,new Set()),reasonsByPath.get(snapshot.archivePath)!))
 if(candidates.length===3){
  const compare=(selector:(snapshot:CalibrationSnapshot)=>unknown,reason:CalibrationExclusion)=>{if(unique(candidates.map(selector))>1)for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,reason)}
  compare(snapshot=>snapshot.sourceHash,'source-drift')
  compare(snapshot=>snapshot.packageTarballHash,'package-drift')
  compare(snapshot=>({dependencies:snapshot.dependencies,developmentDependencies:snapshot.developmentDependencies,dependencyGraphsHash:snapshot.dependencyGraphsHash}),'dependency-drift')
  if(candidates.some(snapshot=>!ownTools(snapshot.toolchainBefore))||unique(candidates.map(snapshot=>snapshot.toolchainBefore))>1)for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'toolchain-drift')
  compare(snapshot=>snapshot.environment&&{platform:snapshot.environment.platform,architecture:snapshot.environment.architecture,host:snapshot.environment.host,xcode:snapshot.environment.xcode,adb:snapshot.environment.adb,java:snapshot.environment.java,bunVersion:snapshot.environment.bunVersion,bunNodeCompatibilityVersion:snapshot.environment.bunNodeCompatibilityVersion},'runtime-drift')
  for(const platform of platforms)compare(snapshot=>snapshot.environment?.byPlatform?.[platform],'runtime-drift')
  for(const key of expectedKeys){const cells=candidates.map(snapshot=>snapshot.cells?.find(cell=>pairKey(cell)===key));if(cells.some(cell=>!cell))continue
   if(unique(cells.map(cell=>cell!.fixtureHash))>1)for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'fixture-drift')
   if(unique(cells.map(cell=>cell!.packageHash))>1)for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'package-drift')
   if(unique(cells.map(cell=>cell!.lockHash))>1)for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'lock-drift')
   if(unique(cells.map(cell=>cell!.configHash))>1)for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'config-drift')
   if(unique(cells.map(cell=>({javascriptHash:cell!.javascriptHash,hermesHash:cell!.hermesHash})) )>1)for(const snapshot of candidates)ensureReasons(reasonsByPath,snapshot,'artifact-drift')
  }
 }
 const excluded=candidates.filter(snapshot=>reasonsByPath.get(snapshot.archivePath)?.size).map(snapshot=>({archivePath:snapshot.archivePath,cohortId:snapshot.cohortId,reasons:[...(reasonsByPath.get(snapshot.archivePath)??[])].sort(),complete:snapshot.standaloneReport?.complete,failures:snapshot.standaloneReport?.failures??[]})).sort((a,b)=>(a.cohortId??a.archivePath).localeCompare(b.cohortId??b.archivePath))
 const admitted=candidates.filter(snapshot=>!reasonsByPath.get(snapshot.archivePath)?.size).sort((a,b)=>(a.cohortId??'').localeCompare(b.cohortId??''))
 const comparisonKey=admitted.length===3&&excluded.length===0?makeComparisonKey(admitted):null
 return {admitted,excluded,comparisonKey}
}

function makeComparisonKey(cohorts:CalibrationSnapshot[]):CalibrationComparisonKey{
 const first=cohorts[0]!,cells=(first.cells??[]).slice().sort((a,b)=>pairKey(a).localeCompare(pairKey(b))).map(cell=>({key:pairKey(cell),fixtureHash:cell.fixtureHash,packageHash:cell.packageHash,lockHash:cell.lockHash,configHash:cell.configHash,javascriptHash:cell.javascriptHash,hermesHash:cell.hermesHash}))
 return {sourceHash:first.sourceHash!,packageTarballHash:first.packageTarballHash!,dependencies:first.dependencies!,developmentDependencies:first.developmentDependencies!,dependencyGraphsHash:first.dependencyGraphsHash!,toolchain:first.toolchainBefore!,environment:first.environment,cells}
}

export function summariseCalibration(admission:CalibrationAdmission){
 const cohorts=admission.admitted.slice().sort((a,b)=>(a.cohortId??'').localeCompare(b.cohortId??'')).map(snapshot=>{
  const cells=(snapshot.cells??[]).slice().sort((a,b)=>expectedKeys.indexOf(pairKey(a))-expectedKeys.indexOf(pairKey(b))).map(cell=>{
   const samples=cell.attempts.filter(attempt=>!attempt.warmup&&attempt.kind==='valid').sort((a,b)=>a.round-b.round)
   const failedAttempts=cell.attempts.filter(attempt=>!attempt.warmup&&attempt.kind==='failed').map(attempt=>({runId:attempt.runId,round:attempt.round,code:attempt.failureCode??'failed'})).sort((a,b)=>a.round-b.round||a.runId.localeCompare(b.runId))
   const plain=snapshot.cells!.find(candidate=>candidate.platform===cell.platform&&candidate.variant==='plain')
   return {key:pairKey(cell),platform:cell.platform,variant:cell.variant,samples:samples.map(attempt=>attempt.elapsedMs!),sampleRounds:samples.map(attempt=>attempt.round),failedAttempts,attempted:cell.reported.attempted,warmups:cell.reported.warmups,minMs:cell.reported.minMs,medianMs:cell.reported.medianMs,maxMs:cell.reported.maxMs,javascriptBytes:cell.javascriptBytes,mappedJavascriptBytes:cell.mappedJavascriptBytes,hermesBytes:cell.hermesBytes,hermesDeltaBytes:plain?cell.hermesBytes-plain.hermesBytes:null}
  })
  return {cohortId:snapshot.cohortId,studyId:snapshot.studyId,archive:basename(snapshot.archivePath),sourceHash:snapshot.sourceHash,toolchain:snapshot.toolchainBefore,environment:snapshot.environment,cells,failures:snapshot.standaloneReport?.failures??[]}
 })
 const eligible=cohorts.length===3&&admission.excluded.length===0&&admission.comparisonKey!==null
 const cohortMedianRanges=eligible?expectedKeys.map(key=>{const values=cohorts.map(cohort=>({cohortId:cohort.cohortId,medianMs:cohort.cells.find(cell=>cell.key===key)!.medianMs!}));const medians=values.map(value=>value.medianMs).sort((a,b)=>a-b);return {key,minMs:medians[0]!,medianMs:medians[1]!,maxMs:medians[2]!,cohortMedians:values}}):[]
 const artifactEquality=eligible?expectedKeys.map(key=>{const cells=admission.admitted.map(snapshot=>snapshot.cells!.find(cell=>pairKey(cell)===key)!);return {key,javascriptEqual:unique(cells.map(cell=>cell.javascriptHash))===1,sourceMapEqual:unique(cells.map(cell=>cell.sourceMapHash))===1,hermesEqual:unique(cells.map(cell=>cell.hermesHash))===1,nativeBinaryEqual:unique(cells.map(cell=>cell.nativeBinaryHash))===1,javascriptHashes:cells.map(cell=>cell.javascriptHash),sourceMapHashes:cells.map(cell=>cell.sourceMapHash),hermesHashes:cells.map(cell=>cell.hermesHash),nativeBinaryHashes:cells.map(cell=>cell.nativeBinaryHash)}}):[]
 return {eligibleForPolicyProposal:eligible,targetApproved:false,interpretation:'Eligibility means three preregistered comparable cohorts are available for explicit policy review. It does not approve a numerical target.',cohorts,cohortMedianRanges,artifactEquality,excluded:admission.excluded.slice().sort((a,b)=>a.archivePath.localeCompare(b.archivePath)),reference:admission.reference??null}
}

async function jsonFile<T>(path:string):Promise<T>{return JSON.parse(await readFile(path,'utf8')) as T}
async function registeredCalibrationProtocol():Promise<{sourceDigest:string;cohorts:CalibrationRegistration[]}>{
 const path=resolve(import.meta.dir,'../docs/evidence/2026-10-06-m10-5-mobile-target-calibration/protocol-revision-3.json'),protocol=await jsonFile<any>(path)
 const cohorts:CalibrationRegistration[]=(Array.isArray(protocol.cohorts)?protocol.cohorts:[]).filter((cohort:any)=>cohort.status==='registered').map((cohort:any)=>({archivePath:cohort.archivePath,studyId:cohort.studyId,cohortId:cohort.cohortId}))
 const sourceDigest=protocol.source?.sourceDigest
 if(!/^[0-9a-f]{64}$/i.test(sourceDigest??'')||cohorts.length!==3||cohorts.some((cohort:any)=>typeof cohort.cohortId!=='string'||typeof cohort.studyId!=='string'||typeof cohort.archivePath!=='string'||!isAbsolute(cohort.archivePath)||resolve(cohort.archivePath)!==cohort.archivePath))throw Error('Revision 3 protocol registration is incomplete or invalid')
 return {sourceDigest,cohorts}
}
async function loadSnapshot(archivePath:string):Promise<CalibrationSnapshot>{
 const archive=resolve(archivePath)
 if(!isAbsolute(archivePath)||archive!==archivePath||archivePath.split(sep).includes('..'))throw Error('Archive path must be a canonical absolute path')
 if(await realpath(archive)!==archive)throw Error('Archive path must be a canonical absolute path')
 const study=await jsonFile<any>(join(archive,'study.json'))
 const live=await runStudy({phase:'report',archive,persistSummary:false} as any)
 if(!live)throw Error('Standalone report did not return a summary')
 const stored=await jsonFile<any>(join(archive,'summary.json'))
 const projection=(summary:any)=>({complete:summary.complete,cells:summary.cells,comparisons:summary.comparisons,failures:summary.failures})
 if(stableCalibrationJson(projection(stored))!==stableCalibrationJson(projection(live)))throw Error('Stored standalone summary differs from verified report')
 const rawAttempts=(await readFile(join(archive,'attempts.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(line=>JSON.parse(line))
 const attempts:CalibrationAttempt[]=rawAttempts.map(raw=>({runId:raw.permit.runId,platform:raw.permit.identity.platform,variant:raw.permit.identity.variant,round:raw.permit.round,warmup:raw.permit.warmup,kind:raw.outcome.kind,elapsedMs:raw.outcome.kind==='valid'?raw.outcome.receipt.elapsedMs:undefined,failureCode:raw.outcome.kind==='failed'?raw.outcome.code:undefined}))
 const records=await jsonFile<any[]>(join(archive,'artifacts.json')),dependencies=study.dependencies,developmentDependencies=study.developmentDependencies
 const graphsHash=await hashPath(join(archive,'dependency-graphs.json')),tarballHash=await hashPath(study.tarball)
 const before=await jsonFile<ToolchainIdentity|null>(join(archive,'toolchain-before.json')).catch(()=>null),atCollect=await jsonFile<ToolchainIdentity|null>(join(archive,'toolchain-collect-start.json')).catch(()=>null),after=await jsonFile<ToolchainIdentity|null>(join(archive,'toolchain-after.json')).catch(()=>null)
 const toolchainCommands=await readFile(join(archive,'toolchain-commands.jsonl'),'utf8').then(text=>text.trim().split('\n').filter(Boolean).map(line=>JSON.parse(line) as ToolchainCommandReceipt),()=>[])
 const environmentRaw=await jsonFile<any>(join(archive,'environment-before.json'))
 const deviceKey=(device:any)=>{const owner={...(device.owner??{})};delete owner.studyId;return {id:device.id,platform:device.platform,runtime:device.runtime??null,properties:device.properties??null,owner}}
 const byPlatform:Record<Platform,string>={ios:stableCalibrationJson((environmentRaw.devices??[]).filter((device:any)=>device.platform==='ios').map(deviceKey)),android:stableCalibrationJson((environmentRaw.devices??[]).filter((device:any)=>device.platform==='android').map(deviceKey))}
 const environment={platform:environmentRaw.platform,architecture:environmentRaw.architecture,host:environmentRaw.host,xcode:environmentRaw.xcode,adb:environmentRaw.adb,java:environmentRaw.java,bunVersion:environmentRaw.bunVersion,bunNodeCompatibilityVersion:environmentRaw.bunNodeCompatibilityVersion,byPlatform}
 const cells:CalibrationCellSnapshot[]=[]
 for(const prepared of study.cells){
  const {platform,variant,fixtureHash,packageHash}=prepared.identity as {platform:Platform;variant:Variant;fixtureHash:string;packageHash:string|null},key=`${platform}/${variant}`
  const matching=records.filter(record=>record.identity.platform===platform&&record.identity.variant===variant)
  if(matching.length!==1)continue
  const artifact=matching[0]!,inventory=await jsonFile<any>(artifact.inventoryPath),configHashes=Object.fromEntries(await Promise.all(configFiles.map(async name=>[name,await hashPath(join(prepared.stage,name))] as const)))
  const javascriptBytes=(await stat(artifact.javascriptPath)).size,hermesBytes=inventory.hermes?.bytes??(await stat(artifact.exportedHermesPath)).size
  const cellAttempts=attempts.filter(attempt=>attempt.platform===platform&&attempt.variant===variant)
  const reported=live.cells.find((cell:any)=>cell.cell.platform===platform&&cell.cell.variant===variant)
  cells.push({key,platform,variant,fixtureHash,packageHash,lockHash:artifact.dependencyLockHash,configHash:hash(stableCalibrationJson(configHashes)),javascriptHash:await hashPath(artifact.javascriptPath),sourceMapHash:await hashPath(artifact.sourceMapPath),hermesHash:artifact.exportedHermesHash,nativeBinaryHash:artifact.nativeBinaryHash,javascriptBytes,mappedJavascriptBytes:inventory.attribution?.groups?.crumbs??0,hermesBytes,attempts:cellAttempts,reported:{retained:reported?.retained??0,attempted:reported?.attempted??0,warmups:reported?.warmups??0,minMs:reported?.minMs??null,medianMs:reported?.medianMs??null,maxMs:reported?.maxMs??null}})
 }
 const proofFailures=(live.failures??[]).filter((failure:string)=>/proof-drift|missing-proof|artifact-hash-mismatch|embedded\/export-bytecode-mismatch|bundle\/map-inventory-drift/.test(failure))
 const verifiedBefore=study.toolchainBefore&&before&&sameToolchainIdentity(study.toolchainBefore,before)?before:null
 return {archivePath:archive,studyId:study.studyId,cohortId:study.cells[0]?.identity?.cohortId,sourceHash:study.sourceHash,packageTarballHash:tarballHash,dependencies,developmentDependencies,dependencyGraphsHash:graphsHash,toolchainBefore:verifiedBefore,toolchainAtCollectStart:atCollect,toolchainAfter:after,toolchainCommands,environment,proofFailures,standaloneReport:{complete:Boolean(live.complete),failures:live.failures??[]},cells}
}

async function readReference(path:string):Promise<CalibrationReference>{
 const archivePath=resolve(path)
 try{
  if(!isAbsolute(path)||archivePath!==path||await realpath(archivePath)!==archivePath)throw Error('Reference path must be a canonical absolute path')
  const study=await jsonFile<any>(join(archivePath,'study.json')),ledger=await jsonFile<any>(join(archivePath,'ledger.json')),sourceArchive=resolve(ledger.archive??archivePath)
  if(!isAbsolute(sourceArchive)||await realpath(sourceArchive)!==sourceArchive)throw Error('Recorded source archive is unavailable')
  const sourceStudy=await jsonFile<any>(join(sourceArchive,'study.json'))
  if(ledger.studyId!==study.studyId||sourceStudy.studyId!==study.studyId||stableCalibrationJson(sourceStudy)!==stableCalibrationJson(study))throw Error('Reference copy differs from its recorded archive')
  const summary=await runStudy({phase:'report',archive:sourceArchive,persistSummary:false} as any),storedSummary=await jsonFile<any>(join(archivePath,'summary.json'))
  const summaryProjection=(value:any)=>({complete:value.complete,cells:value.cells,comparisons:value.comparisons,failures:value.failures})
  if(!summary||stableCalibrationJson(summaryProjection(storedSummary))!==stableCalibrationJson(summaryProjection(summary)))throw Error('Reference summary differs from verified archive report')
  const before=await jsonFile<ToolchainIdentity>(join(sourceArchive,'toolchain-before.json')).catch(()=>null),collect=await jsonFile<ToolchainIdentity>(join(sourceArchive,'toolchain-collect-start.json')).catch(()=>null),after=await jsonFile<ToolchainIdentity>(join(sourceArchive,'toolchain-after.json')).catch(()=>null)
  const hasDirect=Boolean(sourceStudy.toolchainBefore&&before&&collect&&after&&sameToolchainIdentity(sourceStudy.toolchainBefore,before)&&sameToolchainIdentity(before,collect)&&sameToolchainIdentity(collect,after))
  return {archivePath,studyId:study.studyId??null,cohortId:study.cells?.[0]?.identity?.cohortId??null,status:hasDirect?'verified-reference':'legacy-unverified',reasons:hasDirect?[]:['direct Node/npm versions were not captured contemporaneously or did not match'],complete:summary.complete}
 }catch(error){return {archivePath,studyId:null,cohortId:null,status:'unavailable',reasons:[String(error)],complete:null}}
}

export async function readCalibrationCohorts(archivePaths:readonly string[],referenceArchivePath?:string):Promise<CalibrationAdmission>{
 const protocol=await registeredCalibrationProtocol()
 const candidates:CalibrationSnapshot[]=[]
 if(archivePaths.length!==3){const result=admitCalibrationSnapshots(archivePaths.map(archivePath=>({archivePath,ingestReasons:['cohort-count-mismatch']} as CalibrationSnapshot)),protocol.cohorts);if(referenceArchivePath)result.reference=await readReference(referenceArchivePath);return result}
 const expectedSourceHash=protocol.sourceDigest
 for(const archivePath of archivePaths){try{candidates.push({...await loadSnapshot(archivePath),expectedSourceHash})}catch(error){const message=String(error),reason:CalibrationExclusion=message.includes('canonical absolute')?'archive-path-not-canonical':message.includes('Unexpected end')||message.includes('JSON')?'malformed-archive':'archive-unavailable';candidates.push({archivePath,expectedSourceHash,ingestReasons:[reason]})}}
 const admission=admitCalibrationSnapshots(candidates,protocol.cohorts)
 if(referenceArchivePath)admission.reference=await readReference(referenceArchivePath)
 return admission
}

export type CalibrationCliOptions={archives:string[];reference?:string;out?:string;help:boolean}
export function parseCalibrationArgs(args:readonly string[]):CalibrationCliOptions{
 if(args.length===1&&args[0]==='--help')return {archives:[],help:true}
 const archives:string[]=[],seen=new Set<string>();let reference:string|undefined,out:string|undefined
 for(let index=0;index<args.length;index++){
  const flag=args[index]!,value=args[++index]
  if(!value||value.startsWith('--'))throw Error('Missing value for '+flag)
  if(flag==='--archive')archives.push(value)
  else if(flag==='--reference'&&!reference)reference=value
  else if(flag==='--out'&&!out)out=value
  else throw Error('Unknown or duplicate option '+flag)
 }
 for(const path of [...archives,...(reference?[reference]:[]),...(out?[out]:[])])if(!isAbsolute(path)||resolve(path)!==path||path.split(sep).includes('..'))throw Error('Paths must be canonical absolute paths')
 for(const path of archives){if(seen.has(path))throw Error('Duplicate archive path');seen.add(path)}
 if(reference&&seen.has(reference))throw Error('The reference archive must be separate from the three fresh cohorts')
 if(archives.length!==3)throw Error('Exactly three --archive paths are required')
 if(out&&archives.some(archive=>within(archive,out!)))throw Error('Output must be outside study archives')
 return {archives,reference,out,help:false}
}

const helpText='Usage: bun run review:expo-consumer-calibration --archive <absolute-path> --archive <absolute-path> --archive <absolute-path> [--reference <absolute-path>] [--out <absolute-path>]\nThe three fresh cohorts are admitted as one preregistered set. Eligibility prepares evidence for explicit policy review; it does not approve targets.'
export async function runCalibrationCommand(args:readonly string[],writeOutput:(text:string)=>void=console.log):Promise<{exitCode:number;output:string}>{
 let options:CalibrationCliOptions
 try{options=parseCalibrationArgs(args)}catch(error){const output=String(error);writeOutput(output);return {exitCode:1,output}}
 if(options.help){writeOutput(helpText);return {exitCode:0,output:helpText}}
 const admission=await readCalibrationCohorts(options.archives,options.reference),report=summariseCalibration(admission),output=JSON.stringify(report,null,2)
 if(options.out){await mkdir(dirname(options.out),{recursive:true});await writeFile(options.out,output+'\n')}else writeOutput(output)
 return {exitCode:report.eligibleForPolicyProposal?0:1,output}
}
