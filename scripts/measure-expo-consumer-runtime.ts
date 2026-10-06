import {mkdir,readFile,writeFile,appendFile,stat,realpath} from 'node:fs/promises'
import {join,resolve,isAbsolute,dirname} from 'node:path'
import {createRequire} from 'node:module'
import {randomUUID} from 'node:crypto'
import {platforms,variants,roundOrder,summariseStudy,sameIdentity,type Identity,type Variant,type Platform,type Attempt,type ArtifactRecord,type RunPermit} from './expo-consumer-protocol'
import {stageFixtures,generateFixture,snapshot} from './expo-consumer-fixture'
import {hash,hashPath,runLogged,exportArtifacts,validateArtifacts,cancelCommands,setStudySignal,checkStudyAbort,captureProofInventory,validateProofInventory,compareDependencyGraphs,filesUnder,requireDiskSpace,type ProofInventory} from './expo-consumer-artifacts'
import {preflightDevices,buildRelease,startCollector,collectAttempt,attachCollector,cleanupOwned,saveLedger,environmentFingerprint,type ResourceLedger} from './expo-consumer-native'
const root=resolve(import.meta.dir,'..')
type Options={phase:'prepare'|'collect'|'report';archive:string;iosUuid?:string;androidSerial?:string}
type PreparedCell={identity:Identity;stage:string;exported:Awaited<ReturnType<typeof exportArtifacts>>}
type Study={studyId:string;sourceHash:string;revision:string;cells:PreparedCell[];tarball:string;createdAt:string;context:'software-release-hermes';dependencies:Record<string,string>;developmentDependencies:Record<string,string>;inputs:ProofInventory}
export function parseStudyArgs(args:readonly string[]):Options{
 const [phase,...rest]=args;if(!['prepare','collect','report'].includes(phase!))throw Error('Expected prepare, collect or report')
 const values:Record<string,string>={};for(let i=0;i<rest.length;i+=2){const key=rest[i]!,value=rest[i+1];if(!['--archive','--ios-uuid','--android-serial'].includes(key)||!value||value.startsWith('--')||values[key])throw Error('Unknown, duplicate or missing option');values[key]=value}
 if(!values['--archive']||!isAbsolute(values['--archive']))throw Error('An absolute archive path is required')
 if(phase==='collect'&&(!values['--ios-uuid']||!values['--android-serial']))throw Error('Both explicit software device selectors required')
 if(phase!=='collect'&&(values['--ios-uuid']||values['--android-serial']))throw Error('Device selectors only apply to collect')
 return {phase:phase as Options['phase'],archive:resolve(values['--archive']),iosUuid:values['--ios-uuid'],androidSerial:values['--android-serial']}
}
export async function sourceDigest():Promise<string>{
 const child=Bun.spawn(['git','ls-files','packages/css','apps/playground','scripts','package.json','bun.lock'],{cwd:root,stdout:'pipe'});const list=(await new Response(child.stdout).text()).trim().split('\n');if(await child.exited!==0)throw Error('Cannot list source inputs')
 const own=['scripts/measure-expo-consumer-runtime.ts','scripts/expo-consumer-protocol.ts','scripts/expo-consumer-fixture.ts','scripts/expo-consumer-artifacts.ts','scripts/expo-consumer-native.ts','scripts/measure-expo-consumer-runtime.test.ts'];const paths=[...new Set([...list,...own])].filter(x=>x&&!x.includes('/dist/')).sort()
 return hash((await Promise.all(paths.map(async p=>p+':'+hash(await readFile(join(root,p)))))).join('\n'))
}
async function installedVersion(require:ReturnType<typeof createRequire>,name:string):Promise<string>{
 try{return JSON.parse(await readFile(require.resolve(name+'/package.json'),'utf8')).version}catch{let dir=dirname(require.resolve(name));for(let n=0;n<10;n++){try{const p=JSON.parse(await readFile(join(dir,'package.json'),'utf8'));if(p.name===name)return p.version}catch{}dir=dirname(dir)}throw Error('Cannot resolve version '+name)}
}
export async function runStudy(options:Options){
 const archive=options.archive
 if(options.phase==='prepare'){
  if(await stat(archive).then(()=>true,()=>false))throw Error('Prepare requires a new empty archive')
  await requireDiskSpace(dirname(archive),8*2**30,'M10.5 prepare');await mkdir(archive,{recursive:true});if(await realpath(archive)!==archive)throw Error('Archive must use a canonical real path')
  await writeFile(join(archive,'.gitignore'),'*\n');const studyId=randomUUID(),sourceHash=await sourceDigest();const revision=await runLogged(['git','rev-parse','HEAD'],root,archive)
  await writeFile(join(archive,'initial.json'),JSON.stringify({studyId,sourceHash,revision,status:await runLogged(['git','status','--short'],root,archive),node:process.version,bun:Bun.version,context:'software-release-hermes'},null,2))
  await runLogged(['bun','run','build'],root,archive)
  const packed=JSON.parse(await runLogged(['npm','pack','--ignore-scripts','--json','--pack-destination',archive],join(root,'packages/css'),archive));const tarball=join(archive,packed[0].filename),packageHash=await hashPath(tarball)
  const manifest=JSON.parse(await readFile(join(root,'apps/playground/package.json'),'utf8')),require=createRequire(join(root,'apps/playground/package.json'));const dependencies:Record<string,string>={}
  for(const name of Object.keys(manifest.dependencies))if(name!=='@opsydyn/crumbs-css')dependencies[name]=await installedVersion(require,name)
  dependencies.metro=await installedVersion(require,'metro')
  const developmentDependencies:Record<string,string>={};for(const name of Object.keys(manifest.devDependencies??{}))developmentDependencies[name]=await installedVersion(require,name)
  const cohortId=randomUUID(),cells:PreparedCell[]=[]
  const ledger:ResourceLedger={studyId,archive,devices:[],resources:[]};await saveLedger(ledger)
  for(const platform of platforms){const identities={} as Record<Variant,Identity>;for(const variant of variants){const fixtureHash=hash(JSON.stringify({snapshot,variant,platform,generator:await hashPath(join(root,'scripts/expo-consumer-fixture.ts'))}));identities[variant]={studyId,cohortId,sourceHash,fixtureHash,packageHash:variant==='plain'?null:packageHash,buildId:hash(JSON.stringify({studyId,platform,variant,fixtureHash,sourceHash,dependencies,packageHash})),platform,variant}}
   const stages=await stageFixtures({root,archive:join(archive,platform),tarball,exactDependencies:dependencies,exactDevDependencies:developmentDependencies,studyId,sourceHash,identities})
   for(const variant of variants){const stage=stages[variant];console.log(`Installing/exporting ${platform}/${variant}`)
    await runLogged(['npm','install','--ignore-scripts','--no-audit','--no-fund'],stage,archive)
    const staged=createRequire(join(stage,'package.json'));if(variant!=='plain'){const entry=await realpath(staged.resolve(identities[variant].variant==='core'?'@opsydyn/crumbs-css/theme/core':'@opsydyn/crumbs-css/theme'));if(!entry.startsWith(stage+'/node_modules/@opsydyn/crumbs-css/'))throw Error('Packed resolution escaped stage')}
    const react=await realpath(staged.resolve('react'));if(!react.startsWith(stage+'/node_modules/react/'))throw Error('React resolution escaped stage')
    await runLogged([join(stage,'node_modules/.bin/tsc'),'--noEmit'],stage,archive)
    const exported=await exportArtifacts(stage,identities[variant],archive);cells.push({identity:identities[variant],stage,exported});await writeFile(join(archive,'prepared-cells.json'),JSON.stringify(cells,null,2))
   }
  }
  const locks=await Promise.all(cells.map(async c=>JSON.parse(await readFile(join(c.stage,'package-lock.json'),'utf8'))));const graphs=compareDependencyGraphs([locks[0],locks[1],locks[2],locks[4],locks[5]]);compareDependencyGraphs([locks[0],locks[3]]);await writeFile(join(archive,'dependency-graphs.json'),JSON.stringify(graphs,null,2))
  const inputs=await captureProofInventory([tarball,join(archive,'dependency-graphs.json'),...cells.flatMap(c=>['index.js','scene.js','package.json','package-lock.json','tsconfig.json','metro.config.js','babel.config.js','app.json'].map(p=>join(c.stage,p)))])
  const study:Study={studyId,sourceHash,revision,cells,developmentDependencies,inputs,tarball,createdAt:new Date().toISOString(),context:'software-release-hermes',dependencies};await writeFile(join(archive,'study.json'),JSON.stringify(study,null,2));return null
 }
 if(await realpath(archive)!==archive)throw Error('Non-canonical archive')
 const study:Study=JSON.parse(await readFile(join(archive,'study.json'),'utf8'))
 if(study.context!=='software-release-hermes'||study.cells.length!==6||new Set(study.cells.map(c=>c.identity.platform+'/'+c.identity.variant)).size!==6)throw Error('Invalid study matrix')
 if(await sourceDigest()!==study.sourceHash)throw Error('Source digest changed; begin a new cohort')
 const ledger:ResourceLedger=JSON.parse(await readFile(join(archive,'ledger.json'),'utf8'));if(ledger.studyId!==study.studyId||ledger.archive!==archive)throw Error('Ledger identity mismatch')
 const artifacts:ArtifactRecord[]=await readFile(join(archive,'artifacts.json'),'utf8').then(JSON.parse,()=>[])
 if(options.phase==='collect'){
  if(await stat(join(archive,'attempts.jsonl')).then(()=>true,()=>false))throw Error('Collection already started; retain cohort and start a new study instead of silently resuming')
  let devices:ResourceLedger['devices']=[]
  let collector:Awaited<ReturnType<typeof startCollector>>|undefined
  const controller=new AbortController();setStudySignal(controller.signal)
  const interrupt=()=>{controller.abort(Error('Study interrupted'));process.exitCode=130;cancelCommands();void collector?.close()}
  process.once('SIGINT',interrupt);process.once('SIGTERM',interrupt)
  const attempts:Attempt[]=[]
  const save=async(a:Attempt)=>{const safe={...a,permit:{...a.permit,launchUrl:a.permit.launchUrl.replace(/([?&]token=)[^&]+/g,'$1REDACTED')}};attempts.push(safe);await appendFile(join(archive,'attempts.jsonl'),JSON.stringify(safe)+'\n')}
  try{
   await requireDiskSpace(archive,6*2**30,'M10.5 collect');const inputsChecked=await validateProofInventory(study.inputs);if(inputsChecked.length)throw Error(inputsChecked.join('; '))
   devices=await preflightDevices(options.iosUuid!,options.androidSerial!,ledger);const fingerprint=await environmentFingerprint(devices,ledger);await writeFile(join(archive,'environment-before.json'),JSON.stringify(fingerprint,null,2))
   for(const cell of study.cells){console.log(`Building release ${cell.identity.platform}/${cell.identity.variant}`);const artifact=await buildRelease(cell.stage,cell.identity,devices.find(d=>d.platform===cell.identity.platform)!,archive,ledger,cell.exported);artifacts.push(artifact);await writeFile(join(archive,'artifacts.json'),JSON.stringify(artifacts,null,2))}
   collector=await startCollector(event=>appendFile(join(archive,'collector.jsonl'),JSON.stringify(event)+'\n'));for(const device of devices)await attachCollector(device,collector,ledger)
   const run=async(platform:Platform,variant:Variant,warmup:boolean,round:number)=>{checkStudyAbort();const artifact=artifacts.find(x=>x.identity.platform===platform&&x.identity.variant===variant)!,device=devices.find(d=>d.platform===platform)!,runId=randomUUID();const params=new URLSearchParams({studyId:study.studyId,buildId:artifact.identity.buildId,variant,runId,deviceId:device.id,port:String(collector!.port),token:collector!.token});const permit:RunPermit={identity:artifact.identity,runId,deviceId:device.id,warmup,round,launchUrl:`crumbsm105${variant}://measure?${params}`,deadlineEpochMs:Date.now()+120000};let attempt:Attempt
    const before=new Set(await filesUnder(join(archive,'logs')))
    try{attempt=await collectAttempt(permit,artifact,device,ledger,collector!)}catch(error){attempt={origin:'native',permit,outcome:{kind:'failed',code:'device-or-identity-drift',detail:String(error)}};await save(attempt);throw error}await save(attempt);const commandFiles=(await filesUnder(join(archive,'logs'))).filter(p=>p.endsWith('.command.json')&&!before.has(p));await mkdir(join(archive,'runs'),{recursive:true});await writeFile(join(archive,'runs',runId+'.json'),JSON.stringify({runId,identity:artifact.identity,commandFiles},null,2));return attempt}
   for(const platform of platforms)for(const variant of variants){const a=await run(platform,variant,true,-1);if(a.outcome.kind!=='valid')throw Error('Warm-up failed; retained collection aborted')}
   for(const platform of platforms)for(let round=0;round<5;round++)for(const variant of roundOrder(round)){const a=await run(platform,variant,false,round);console.log(`${platform}/${variant} round ${round}: ${a.outcome.kind}`)}
   for(const platform of platforms)for(const variant of variants){const failed=attempts.filter(a=>!a.permit.warmup&&a.permit.identity.platform===platform&&a.permit.identity.variant===variant&&a.outcome.kind==='failed');if(failed.length>2)throw Error('Replacement limit exceeded');for(const a of failed)await run(platform,variant,false,a.permit.round)}
   const after=await environmentFingerprint(devices,ledger);await writeFile(join(archive,'environment-after.json'),JSON.stringify(after,null,2));if(JSON.stringify(after)!==JSON.stringify(fingerprint))throw Error('Environment changed during cohort')
  }catch(error){await writeFile(join(archive,'collection-failure.json'),JSON.stringify({error:String(error),at:new Date().toISOString()},null,2));throw error}
  finally{setStudySignal();await collector?.close();const cleanup=await cleanupOwned(ledger);await writeFile(join(archive,'cleanup.json'),JSON.stringify(cleanup,null,2));process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt)}
  const proof=await captureProofInventory([join(archive,'study.json'),join(archive,'collector.jsonl'),join(archive,'attempts.jsonl'),join(archive,'artifacts.json'),join(archive,'cleanup.json'),join(archive,'environment-before.json'),join(archive,'environment-after.json'),...await filesUnder(join(archive,'logs')),...await filesUnder(join(archive,'runs')),...devices.map(d=>d.ownershipRecordPath),...study.inputs.map(x=>x.path),...artifacts.flatMap(a=>[a.inventoryPath,join(archive,'native',a.identity.platform,a.identity.variant,'artifact.json')])]);await writeFile(join(archive,'proof-inventory.json'),JSON.stringify(proof,null,2))
 }
 const attempts:Attempt[]=(await readFile(join(archive,'attempts.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));const failures:string[]=[]
 failures.push(...await validateProofInventory(study.inputs));const proof:ProofInventory=JSON.parse(await readFile(join(archive,'proof-inventory.json'),'utf8'));failures.push(...await validateProofInventory(proof));
 const raw=(await readFile(join(archive,'collector.jsonl'),'utf8')).trim().split('\n').filter(Boolean).map(x=>JSON.parse(x));
 for(const attempt of attempts){if(attempt.outcome.kind!=='valid')continue;if(!raw.some(x=>x.body?.runId===attempt.permit.runId&&x.body?.identity&&sameIdentity(x.body.identity,attempt.permit.identity)&&['entryMs','layoutMs','elapsedMs','width','height','dev','hermes','deviceId'].every(k=>x.body[k]===(attempt.outcome as any).receipt[k])))failures.push('missing-raw-receipt:'+attempt.permit.runId);try{const run=JSON.parse(await readFile(join(archive,'runs',attempt.permit.runId+'.json'),'utf8'));if(run.runId!==attempt.permit.runId||!sameIdentity(run.identity,attempt.permit.identity))throw Error('Run proof identity mismatch');let launch=false,exitProof=false;for(const p of run.commandFiles){if(!proof.some(x=>x.path===p))throw Error('Command missing from proof inventory');const cmd=JSON.parse(await readFile(p,'utf8')).command as string[];const status=JSON.parse(await readFile(p.replace('.command.json','.exit.json'),'utf8'));if(status.exit!==0)continue;if(cmd.some(x=>x.includes('runId='+attempt.permit.runId)))launch=true;if(cmd.some(x=>x.includes('launchctl')||x.includes('pidof')))exitProof=true}if(!launch||!exitProof)throw Error('Missing successful launch/exit command evidence')}catch(error){failures.push(String(error))}}
 for(const artifact of artifacts){const cell=study.cells.find(c=>sameIdentity(c.identity,artifact.identity));if(!cell||(Object.keys(cell.exported) as Array<keyof typeof cell.exported>).some(k=>cell.exported[k]!==artifact[k])||await hashPath(join(cell.stage,'package-lock.json'))!==artifact.dependencyLockHash)failures.push('prepared/artifact-input-mismatch');const v=await validateArtifacts(artifact);failures.push(...v.failures)}
 const summary=summariseStudy(attempts,artifacts);if(failures.length){summary.complete=false;summary.failures.push(...failures)}
 const cleanup=JSON.parse(await readFile(join(archive,'cleanup.json'),'utf8'));if(cleanup.failures.length){summary.complete=false;summary.failures.push(...cleanup.failures)}
 await writeFile(join(archive,'summary.json'),JSON.stringify({context:study.context,metric:'js-entry-to-first-root-layout-ms',nativeStartupExcluded:true,physicalDevicesDeferred:true,...summary},null,2));return summary
}
if(import.meta.main){try{const summary=await runStudy(parseStudyArgs(process.argv.slice(2)));if(summary){console.log(JSON.stringify(summary,null,2));if(!summary.complete)process.exitCode=1}}catch(error){console.error(String(error));process.exitCode=1}}
