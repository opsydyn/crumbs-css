import {createServer} from 'node:http'
import {randomBytes} from 'node:crypto'
import {readFile,writeFile,mkdir,readdir,cp,appendFile,realpath as resolveRealPath} from 'node:fs/promises'
import {join} from 'node:path'
import {createRequire} from 'node:module'
import {validateReceipt,type Attempt,type RunPermit,type Identity,type ArtifactRecord} from './expo-consumer-protocol'
import {runLogged,hashPath,validateArtifacts,checkStudyAbort,requireDiskSpace} from './expo-consumer-artifacts'
export function parseAvdName(output:string){const lines=output.trim().split(/\r?\n/);if(!/^[A-Za-z0-9_.-]+$/.test(lines[0]??'')||lines[1]!=='OK')throw Error('Invalid Emulator console identity response');return lines[0]!}
export const protectedSimulator='1F706822-9584-4340-B426-EECF36F9D8EA'
export type OwnedDevice={platform:'ios'|'android';id:string;ownershipRecordPath:string}
export type Resource={kind:'app'|'mapping';device:OwnedDevice;value:string;cleaned:boolean;studyId:string;state?:'intended'|'acquired';artifact?:ArtifactRecord}
export type ResourceLedger={studyId:string;archive:string;devices:OwnedDevice[];resources:Resource[]}
export type ToolExecutable={command:string;resolvedPath:string;realPath:string;version:string}
export type ToolchainIdentity={node:ToolExecutable;npm:ToolExecutable;bun:{resolvedPath:string;realPath:string;version:string;nodeCompatibilityVersion:string}}
type VersionCommandResult={exitCode:number;stdout:string;stderr?:string}
type ToolchainCommand={tool:'node'|'npm';resolvedPath:string;realPath:string;args:['--version'];exitCode:number;stdout:string;stderr:string;observedAt:string}
type ToolchainCommandRecorder=(receipt:ToolchainCommand)=>Promise<void>
type ExecutableResolver=(command:string)=>string|null|Promise<string|null>
type VersionRunner=(path:string,args:readonly string[])=>VersionCommandResult|Promise<VersionCommandResult>
const readVersionOutput=async(stream:ReadableStream<Uint8Array>,limit=4096)=>{const reader=stream.getReader(),chunks:Uint8Array[]=[];let size=0;try{while(true){const item=await reader.read();if(item.done)break;size+=item.value.length;if(size>limit)throw Error('version output exceeds 4096 bytes');chunks.push(item.value)}return Buffer.concat(chunks.map(x=>Buffer.from(x))).toString('utf8')}finally{reader.releaseLock()}}
async function runVersion(path:string,args:readonly string[]):Promise<VersionCommandResult>{
 const child=Bun.spawn([path,...args],{stdout:'pipe',stderr:'pipe'});let timedOut=false;const timer=setTimeout(()=>{timedOut=true;child.kill()},10_000)
 try{const stdout=readVersionOutput(child.stdout),stderr=readVersionOutput(child.stderr);const [out,err,exitCode]=await Promise.all([stdout,stderr,child.exited]);if(timedOut)throw Error('version command timed out');return {exitCode,stdout:out,stderr:err}}
 catch(error){child.kill();throw error}finally{clearTimeout(timer)}
}
export async function collectToolchainIdentity(resolveExecutable:ExecutableResolver=(command)=>Bun.which(command)??null,run:VersionRunner=runVersion,record?:ToolchainCommandRecorder):Promise<ToolchainIdentity>{
 const capture=async(tool:'node'|'npm'):Promise<ToolExecutable>=>{const path=await resolveExecutable(tool);if(!path)throw Error(`${tool} executable is unavailable`);const resolved=await resolveRealPath(path);const result=await run(path,['--version']);const stdout=result.stdout.slice(0,4097),stderr=(result.stderr??'').slice(0,4097);await record?.({tool,resolvedPath:path,realPath:resolved,args:['--version'],exitCode:result.exitCode,stdout,stderr,observedAt:new Date().toISOString()});if(result.exitCode!==0)throw Error(`${tool} --version exited ${result.exitCode}`);if(Buffer.byteLength(stdout)>4096||Buffer.byteLength(stderr)>4096)throw Error(`${tool} version output exceeds 4096 bytes`);const version=stdout.trim();if(!version||version.split(/\r?\n/).length!==1)throw Error(`${tool} --version returned invalid output`);return {command:tool,resolvedPath:path,realPath:resolved,version}}
 const [node,npm]=[await capture('node'),await capture('npm')];return {node,npm,bun:{resolvedPath:process.execPath,realPath:await resolveRealPath(process.execPath),version:Bun.version,nodeCompatibilityVersion:process.version}}
}
export function sameToolchainIdentity(before:ToolchainIdentity,after:ToolchainIdentity):boolean{return ['node','npm'].every(tool=>{const a=before[tool as 'node'|'npm'],b=after[tool as 'node'|'npm'];return a.command===b.command&&a.resolvedPath===b.resolvedPath&&a.realPath===b.realPath&&a.version===b.version})&&before.bun.resolvedPath===after.bun.resolvedPath&&before.bun.realPath===after.bun.realPath&&before.bun.version===after.bun.version&&before.bun.nodeCompatibilityVersion===after.bun.nodeCompatibilityVersion}
export function assertStudySourceForPhase(phase:'prepare'|'collect'|'report',expected:string,actual:string){if(phase!=='report'&&expected!==actual)throw Error('Source digest changed; begin a new cohort')}
export const sdk=process.env.ANDROID_HOME??'/private/tmp/crumbs-m105-native/sdk'
export const nativeEnv={ANDROID_HOME:sdk,ANDROID_SDK_ROOT:sdk,JAVA_HOME:process.env.JAVA_HOME??'/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home',EXPO_NO_METRO_WORKSPACE_ROOT:'1',CI:'1',LANG:'en_US.UTF-8'}
export function deviceCommand(device:OwnedDevice,args:string[]):string[]{
 if(device.platform==='ios'){
  if(device.id.toUpperCase()===protectedSimulator||!/^[0-9A-Fa-f]{8}(?:-[0-9A-Fa-f]{4}){3}-[0-9A-Fa-f]{12}$/.test(device.id))throw Error('Prohibited Simulator target')
  if(!['install','uninstall','terminate','spawn','openurl','get_app_container','listapps'].includes(args[0]!)||args.includes('all')||args.includes('booted'))throw Error('Prohibited Simulator operation')
  return ['xcrun','simctl',args[0]!,device.id,...args.slice(1)]
 }
 if(device.platform!=='android'||!/^emulator-\d+$/.test(device.id)||!['shell','install','uninstall','reverse','emu','get-state'].includes(args[0]!)||args.includes('kill-server'))throw Error('Prohibited Android target/operation')
 return ['adb','-s',device.id,...(args[0]==='shell'?['shell',args.slice(1).map(quote).join(' ')]:args)]
}
async function deviceRun(device:OwnedDevice,args:string[],archive:string){const command=deviceCommand(device,args);if(command[0]==='adb')command[0]=join(sdk,'platform-tools/adb');return runLogged(command,archive,archive,nativeEnv)}
export async function startCollector(onRaw:(event:unknown)=>Promise<void>=async()=>{}){
 const token=randomBytes(32).toString('base64url'),consumed=new Set<string>();const pending=new Map<string,{permit:RunPermit;finish:(a:Attempt)=>void;timer:ReturnType<typeof setTimeout>}>()
 const finish=(runId:string,outcome:Attempt['outcome'])=>{const p=pending.get(runId);if(!p)return;pending.delete(runId);clearTimeout(p.timer);consumed.add(runId);p.finish({origin:'native',permit:p.permit,outcome})}
 const server=createServer(async(req,res)=>{
  if(req.method!=='POST'||req.url!=='/receipt'){res.writeHead(404).end();return}
  if(req.headers.authorization!==`Bearer ${token}`){res.writeHead(403).end();return}
  const chunks:Buffer[]=[];let bytes=0
  try{for await(const chunk of req){bytes+=chunk.length;if(bytes>65536){res.writeHead(413).end();req.destroy();return}chunks.push(Buffer.from(chunk))}const parsed=JSON.parse(Buffer.concat(chunks).toString('utf8'));await onRaw({receivedAt:Date.now(),body:parsed});const p=pending.get(parsed?.runId)
   if(!p||Date.now()>p.permit.deadlineEpochMs){res.writeHead(409).end();return}
   const validated=validateReceipt(parsed,p.permit,consumed)
   if(!validated.ok){await onRaw({rejection:validated.code,runId:parsed?.runId});res.writeHead(422).end();return}
   finish(p.permit.runId,{kind:'valid',receipt:validated.receipt});res.writeHead(200).end('{}')
  }catch(error){res.writeHead(400).end();await onRaw({rejection:String(error)})}
 })
 await new Promise<void>((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok)})
 const address=server.address();if(!address||typeof address==='string')throw Error('No collector port')
 return {token,port:address.port,expect(permit:RunPermit):Promise<Attempt>{if(pending.has(permit.runId)||consumed.has(permit.runId))throw Error('Duplicate permit');return new Promise(resolve=>{const timer=setTimeout(()=>finish(permit.runId,{kind:'failed',code:'launch-timeout',detail:'No valid receipt within launch deadline'}),Math.max(0,permit.deadlineEpochMs-Date.now()));pending.set(permit.runId,{permit,finish:resolve,timer})})},fail(runId:string,code:string,detail:string){finish(runId,{kind:'failed',code,detail})},async close(){for(const id of [...pending.keys()])finish(id,{kind:'failed',code:'collector-closed',detail:'Collection cancelled'});await new Promise<void>(resolve=>server.close(()=>resolve()))}}
}
export type Collector=Awaited<ReturnType<typeof startCollector>>
export async function saveLedger(ledger:ResourceLedger){await writeFile(join(ledger.archive,'ledger.json'),JSON.stringify(ledger,null,2))}
export async function acquireResource(ledger:ResourceLedger,resource:Resource,mutate:()=>Promise<unknown>){checkStudyAbort();resource.state='intended';ledger.resources.push(resource);await saveLedger(ledger);checkStudyAbort();await mutate();resource.state='acquired';await saveLedger(ledger)}
export async function assertInstalledIosIdentity(container:string,expected:string){if(await hashPath(container)!==expected)throw Error('Installed app replaced')}
async function appPresent(device:OwnedDevice,app:string,archive:string,run=deviceRun){if(device.platform==='android')return (await run(device,['shell','pm','list','packages',app],archive)).split('\n').includes('package:'+app);const listing=await run(device,['listapps'],archive);if(!listing.startsWith('{')||!listing.endsWith('}'))throw Error('Malformed app inventory');return listing.split('\n').some(line=>line.trim().startsWith(JSON.stringify(app)+' ='))}
export async function preflightDevices(iosUuid:string,androidSerial:string,ledger:ResourceLedger):Promise<OwnedDevice[]>{
 deviceCommand({platform:'ios',id:iosUuid,ownershipRecordPath:''},['spawn','true']);deviceCommand({platform:'android',id:androidSerial,ownershipRecordPath:''},['get-state'])
 const selected=[ledger.devices.find(d=>d.platform==='ios'&&d.id===iosUuid),ledger.devices.find(d=>d.platform==='android'&&d.id===androidSerial)]
 if(selected.some(d=>!d))throw Error('Missing study-owned device records')
 for(const d of selected as OwnedDevice[]){const ownership=JSON.parse(await readFile(d.ownershipRecordPath,'utf8'));if(ownership.studyId!==ledger.studyId||ownership.id!==d.id||ownership.platform!==d.platform||!ownership.creationCommand)throw Error('Invalid device ownership')
  if(d.platform==='ios'){const all=JSON.parse(await runLogged(['xcrun','simctl','list','devices','available','-j'],ledger.archive,ledger.archive));const found=(Object.values(all.devices).flat() as any[]).find(x=>x.udid===d.id);if(found?.state!=='Booted')throw Error('Owned Simulator is not booted')}
  else {if(await deviceRun(d,['shell','getprop','ro.kernel.qemu'],ledger.archive)!=='1')throw Error('Target is not an Emulator');const name=parseAvdName(await deviceRun(d,['emu','avd','name'],ledger.archive));if(name!==ownership.avdName)throw Error('AVD identity changed')}
 }
 return selected as OwnedDevice[]
}
export async function assertDevice(device:OwnedDevice,ledger:ResourceLedger,artifact?:ArtifactRecord){
 const owner=JSON.parse(await readFile(device.ownershipRecordPath,'utf8'));if(owner.studyId!==ledger.studyId||owner.id!==device.id||owner.platform!==device.platform)throw Error('Device ownership drift')
 if(device.platform==='ios'){
  const listing=JSON.parse(await runLogged(['xcrun','simctl','list','devices','available','-j'],ledger.archive,ledger.archive));if(!(Object.values(listing.devices).flat() as any[]).some(x=>x.udid===device.id&&x.state==='Booted'))throw Error('Simulator shutdown/identity drift')
  if(artifact){const container=await deviceRun(device,['get_app_container',`dev.crumbs.m105.${artifact.identity.variant}`,'app'],ledger.archive);await assertInstalledIosIdentity(container,artifact.nativeBinaryHash)}
 }else{if(await deviceRun(device,['shell','getprop','ro.kernel.qemu'],ledger.archive)!=='1'||parseAvdName(await deviceRun(device,['emu','avd','name'],ledger.archive))!==owner.avdName)throw Error('Emulator identity drift');if(artifact){const apk=(await deviceRun(device,['shell','pm','path',`dev.crumbs.m105.${artifact.identity.variant}`],ledger.archive)).replace(/^package:/,'').split('\n')[0]!;if(!(await deviceRun(device,['shell','sha256sum',apk],ledger.archive)).startsWith(artifact.nativeBinaryHash))throw Error('Installed APK replaced')}}
}
export async function environmentFingerprint(devices:OwnedDevice[],ledger:ResourceLedger){
 const fingerprint:any={bunNodeCompatibilityVersion:process.version,bunVersion:Bun.version,platform:process.platform,architecture:process.arch,host:await runLogged(['uname','-a'],ledger.archive,ledger.archive),xcode:await runLogged(['xcodebuild','-version'],ledger.archive,ledger.archive),adb:await runLogged([join(sdk,'platform-tools/adb'),'version'],ledger.archive,ledger.archive),java:await runLogged([join(nativeEnv.JAVA_HOME,'bin/java'),'--version'],ledger.archive,ledger.archive,nativeEnv),devices:[]}
 const listing=JSON.parse(await runLogged(['xcrun','simctl','list','devices','available','-j'],ledger.archive,ledger.archive))
 for(const device of devices){await assertDevice(device,ledger);const owner=JSON.parse(await readFile(device.ownershipRecordPath,'utf8'));if(device.platform==='ios'){const runtime=Object.entries(listing.devices).find(([,entries])=>(entries as any[]).some(d=>d.udid===device.id))?.[0];fingerprint.devices.push({id:device.id,platform:device.platform,runtime,owner})}else{const properties:Record<string,string>={};for(const key of ['ro.build.fingerprint','ro.product.cpu.abi','ro.build.version.release','ro.build.version.sdk'])properties[key]=await deviceRun(device,['shell','getprop',key],ledger.archive);fingerprint.devices.push({id:device.id,platform:device.platform,properties,owner})}}
 return fingerprint
}
export function patchXcodeBundlePhase(project:any,bundle:string):string{
 const section=project.hash?.project?.objects?.PBXShellScriptBuildPhase
 if(!section)throw Error('Missing Xcode shell-script section')
 let replaced=0
 for(const phase of Object.values(section) as any[]){if(typeof phase==='object'&&phase!==null&&String(phase.shellScript).includes('react-native-xcode.sh')){phase.shellScript=JSON.stringify(`set -e\nmkdir -p "$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"\ncp ${quote(bundle)} "$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/main.jsbundle"\n`);replaced++}}
 if(replaced!==1)throw Error('Cannot identify exactly one owned RN bundle phase')
 return project.writeSync()
}
const quote=(s:string)=>"'"+s.replaceAll("'","'\\''")+"'"
type Exports={javascriptPath:string;sourceMapPath:string;exportedHermesPath:string;inventoryPath:string}
export async function buildRelease(stage:string,identity:Identity,device:OwnedDevice,archive:string,ledger:ResourceLedger,exported:Exports):Promise<ArtifactRecord>{
 await requireDiskSpace(archive,3*2**30,'M10.5 '+identity.platform+'/'+identity.variant+' release build');await assertDevice(device,ledger);const expo=join(stage,'node_modules/.bin/expo')
 await runLogged([expo,'prebuild','--platform',identity.platform,'--no-install'],stage,archive,nativeEnv)
 let nativeBinaryPath:string,embeddedHermesPath:string
 if(identity.platform==='ios'){
  const ios=join(stage,'ios');await runLogged(['pod','install'],ios,archive,nativeEnv)
  const projectName=(await readdir(ios)).find(x=>x.endsWith('.xcodeproj'))!;const workspaceName=(await readdir(ios)).find(x=>x.endsWith('.xcworkspace'))!
  const require=createRequire(join(stage,'package.json')),xcode=require('xcode');const project=xcode.project(join(ios,projectName,'project.pbxproj'));project.parseSync()
  await writeFile(join(ios,projectName,'project.pbxproj'),patchXcodeBundlePhase(project,exported.exportedHermesPath))
  const info=JSON.parse(await runLogged(['xcodebuild','-list','-json','-project',join(ios,projectName)],stage,archive,nativeEnv));const scheme=info.project.targets.find((s:string)=>!s.endsWith('Tests'))
  if(!scheme)throw Error('No application scheme');const derived=join(archive,'native',identity.platform,identity.variant,'DerivedData')
  await runLogged(['xcodebuild','-workspace',join(ios,workspaceName),'-scheme',scheme,'-configuration','Release','-sdk','iphonesimulator','-destination',`id=${device.id}`,'-derivedDataPath',derived,'CODE_SIGNING_ALLOWED=NO','build'],stage,archive,nativeEnv)
  const products=join(derived,'Build/Products/Release-iphonesimulator');const app=(await readdir(products)).filter(x=>x.endsWith('.app'));if(app.length!==1)throw Error('Ambiguous release app');nativeBinaryPath=join(products,app[0]!);embeddedHermesPath=join(nativeBinaryPath,'main.jsbundle')
 }else{
  const android=join(stage,'android');await writeFile(join(android,'local.properties'),`sdk.dir=${sdk}\n`)
  const gradle=join(android,'app/build.gradle');await appendFile(gradle,'\n// Study embeds the exact measured production Hermes artifact.\ntasks.configureEach { if (name == "createBundleReleaseJsAndAssets") enabled = false }\n')
  const manifest=join(android,'app/src/main/AndroidManifest.xml');await writeFile(manifest,(await readFile(manifest,'utf8')).replace('<application','<application android:usesCleartextTraffic="true"'))
  await mkdir(join(android,'app/src/main/assets'),{recursive:true});await cp(exported.exportedHermesPath,join(android,'app/src/main/assets/index.android.bundle'))
  await runLogged([join(android,'gradlew'),':app:assembleRelease','--no-daemon','-PreactNativeArchitectures=arm64-v8a'],android,archive,nativeEnv)
  nativeBinaryPath=join(android,'app/build/outputs/apk/release/app-release.apk');embeddedHermesPath=join(archive,'native','android',identity.variant,'embedded.hbc');await mkdir(join(archive,'native','android',identity.variant),{recursive:true})
  const extraction=join(archive,'native','android',identity.variant,'apk-extraction');await runLogged(['unzip','-o',nativeBinaryPath,'assets/index.android.bundle','-d',extraction],stage,archive,nativeEnv);await cp(join(extraction,'assets/index.android.bundle'),embeddedHermesPath)

 }
 const record:ArtifactRecord={identity,...exported,dependencyLockHash:await hashPath(join(stage,'package-lock.json')),nativeBinaryPath,nativeBinaryHash:await hashPath(nativeBinaryPath),embeddedHermesPath,embeddedHermesHash:await hashPath(embeddedHermesPath),exportedHermesHash:await hashPath(exported.exportedHermesPath)}
 const checked=await validateArtifacts(record);if(!checked.ok)throw Error(checked.failures.join('; '));await writeFile(join(archive,'native',identity.platform,identity.variant,'artifact.json'),JSON.stringify(record,null,2))
 const app=`dev.crumbs.m105.${identity.variant}`;if(await appPresent(device,app,archive))throw Error('Existing app collision');await acquireResource(ledger,{kind:'app',device,value:app,cleaned:false,studyId:ledger.studyId,artifact:record},()=>deviceRun(device,['install',nativeBinaryPath],archive));await assertDevice(device,ledger,record);return record
}
export async function collectAttempt(permit:RunPermit,artifact:ArtifactRecord,device:OwnedDevice,ledger:ResourceLedger,collector:Collector):Promise<Attempt>{
 await assertDevice(device,ledger,artifact);const app=`dev.crumbs.m105.${artifact.identity.variant}`
 if(device.platform==='ios'){
  const services=await deviceRun(device,['spawn','launchctl','list'],ledger.archive)
  if(services.includes(app))await deviceRun(device,['terminate',app],ledger.archive)
  const after=await deviceRun(device,['spawn','launchctl','list'],ledger.archive)
  if(after.split('\n').some(line=>/^\d+\s/.test(line)&&line.includes(app)))throw Error('Previous iOS process still alive')
 }else{await deviceRun(device,['shell','am','force-stop',app],ledger.archive);const pids=await deviceRun(device,['shell','sh','-c',`pidof ${app} || true`],ledger.archive);if(pids.trim())throw Error('Previous Android process still alive')}
 const waiting=collector.expect(permit)
 try{if(device.platform==='ios')await deviceRun(device,['openurl',permit.launchUrl],ledger.archive);else await deviceRun(device,['shell','am','start','-W','-a','android.intent.action.VIEW','-d',permit.launchUrl,app],ledger.archive)}catch(error){collector.fail(permit.runId,'launch-command-failed',String(error))}
 const result=await waiting;await assertDevice(device,ledger,artifact);return result
}
export async function attachCollector(device:OwnedDevice,collector:Collector,ledger:ResourceLedger){if(device.platform==='android'){const port=`tcp:${collector.port}`;const existing=await deviceRun(device,['reverse','--list'],ledger.archive);if(existing.includes(port))throw Error('Port mapping collision');await acquireResource(ledger,{kind:'mapping',device,value:port,cleaned:false,studyId:ledger.studyId},()=>deviceRun(device,['reverse',port,port],ledger.archive))}}
export async function cleanupOwned(ledger:ResourceLedger,adapter:{run?:typeof deviceRun;assert?:typeof assertDevice}={}):Promise<{failures:string[]}>{const run=adapter.run??deviceRun,assert=adapter.assert??assertDevice;const failures:string[]=[];for(const r of [...ledger.resources].reverse()){if(r.cleaned)continue;try{if(r.studyId!==ledger.studyId||!ledger.devices.some(d=>d.id===r.device.id&&d.platform===r.device.platform))throw Error('Unowned resource');await assert(r.device,ledger);if(r.kind==='app'){if(!/^dev\.crumbs\.m105\.(plain|core|compatibility)$/.test(r.value))throw Error('Unowned app');if(await appPresent(r.device,r.value,ledger.archive,run)){if(!r.artifact)throw Error('Missing app ownership artifact');await assert(r.device,ledger,r.artifact);await run(r.device,['uninstall',r.value],ledger.archive)}}else{if(!/^tcp:\d+$/.test(r.value))throw Error('Invalid mapping');const mappings=await run(r.device,['reverse','--list'],ledger.archive);const match=mappings.split('\n').find(line=>line.split(/\s+/)[1]===r.value);if(match){if(match.split(/\s+/)[2]!==r.value)throw Error('Mapping replaced');await run(r.device,['reverse','--remove',r.value],ledger.archive)}}r.cleaned=true;await saveLedger(ledger)}catch(error){failures.push(String(error))}}return {failures}}
