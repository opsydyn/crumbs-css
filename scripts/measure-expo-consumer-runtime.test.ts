import { describe, expect, test } from 'bun:test'
import { validateReceipt, summariseStudy, roundOrder, type Identity, type RunPermit, type Receipt, type Attempt } from './expo-consumer-protocol'
import { generateFixture } from './expo-consumer-fixture'
import { runInNewContext } from 'node:vm'
const id: Identity = { studyId:'study', cohortId:'cohort', fixtureHash:'a'.repeat(64), sourceHash:'b'.repeat(64), packageHash:null, buildId:'build', platform:'ios', variant:'plain' }
const permit: RunPermit = { identity:id, runId:'run', deviceId:'device', warmup:false, round:0, launchUrl:'crumbs://measure', deadlineEpochMs:Date.now()+120000 }
const receipt: Receipt = { identity:id, runId:'run', deviceId:'device', entryMs:1, layoutMs:6, elapsedMs:5, width:320, height:640, dev:false, hermes:true }
describe('protocol',()=>{
 test('admits only matching release Hermes layouts',()=>{
  expect(validateReceipt(receipt,permit,new Set()).ok).toBe(true)
  for(const patch of [{dev:true},{hermes:false},{elapsedMs:7},{width:0},{height:-1},{layoutMs:NaN},{entryMs:8},{runId:'old'},{deviceId:'other'},{identity:{...id,buildId:'old'}}]) expect(validateReceipt({...receipt,...patch},permit,new Set()).ok).toBe(false)
  for(const value of [null,[],{},'x',JSON.parse('{"__proto__":{"dev":false}}')])expect(validateReceipt(value,permit,new Set()).ok).toBe(false)
  expect(validateReceipt(receipt,permit,new Set(['run'])).ok).toBe(false)
 })
 test('reports missing cells and never converts failed launches to zero',()=>{
  const attempts:Attempt[]=[9,1,5,3,7].map((ms,i)=>({origin:'native',permit:{...permit,runId:String(i)},outcome:{kind:'valid',receipt:{...receipt,runId:String(i),layoutMs:1+ms,elapsedMs:ms}}}))
  attempts.push({origin:'native',permit:{...permit,runId:'failed'},outcome:{kind:'failed',code:'timeout',detail:'no receipt'}})
  const result=summariseStudy(attempts,[])
  expect(result.complete).toBe(false)
  expect(result.cells.find(x=>x.cell.platform==='ios'&&x.cell.variant==='plain')).toMatchObject({minMs:1,medianMs:5,maxMs:9,retained:5,attempted:6})
  expect(result.cells.length).toBe(6)
  expect(summariseStudy([{...attempts[0]!,origin:'test'}],[]).complete).toBe(false)
 })
 test('rotates all variants without pooling platforms',()=>{expect(roundOrder(0)).toEqual(['plain','core','compatibility']);expect(roundOrder(1)).toEqual(['core','compatibility','plain']);expect(roundOrder(2)).toEqual(['compatibility','plain','core'])})
})
describe('fixture',()=>{
 test('records the entry timestamp before requiring Expo or the scene',()=>{
  const fixture=generateFixture('plain',id)
  const events:string[]=[]
  runInNewContext(fixture.entry,{globalThis:{},performance:{now:()=>{events.push('entry');return 1}},require:(name:string)=>{events.push(name);return name==='expo'?{registerRootComponent:()=>events.push('register')}:{default:()=>null}}})
  expect(events).toEqual(['entry','expo','./scene','register'])
 })
 test('keeps one common ten-card workload across entry variants',()=>{
  const fixtures=['plain','core','compatibility'].map(v=>generateFixture(v as any,{...id,variant:v as any,packageHash:v==='plain'?null:'c'.repeat(64)}))
  expect(fixtures.map(x=>x.snapshot)).toEqual([fixtures[0]!.snapshot,fixtures[0]!.snapshot,fixtures[0]!.snapshot])
  expect(fixtures[0]!.snapshot.cards).toBe(10)
  expect(fixtures[0]!.manifest.dependencies['@opsydyn/crumbs-css']).toBeUndefined()
  expect(fixtures[1]!.entrypoint).toBe('@opsydyn/crumbs-css/theme/core')
  expect(fixtures[2]!.entrypoint).toBe('@opsydyn/crumbs-css/theme')
 })
})
import {attributeJavaScript, validateArtifacts} from './expo-consumer-artifacts'
describe('artifacts',()=>{
 test('conserves UTF-8 bytes across unmapped and indexed UTF-16 positions',()=>{
  const map={version:3,sources:['scene.js'],names:[],mappings:'AAAA,E'}
  const result=attributeJavaScript('🙂x\r\n',map,'plain')
  expect(result.totalBytes).toBe(7);expect(result.groups.fixture).toBe(4);expect(result.unmappedBytes).toBe(3)
  expect(attributeJavaScript('🙂\n',{version:3,sources:[],names:[],mappings:''},'plain').unmappedBytes).toBe(5)
  expect(()=>attributeJavaScript('🙂',{version:3,sources:['scene.js'],names:[],mappings:'AAAA,CAAA'},'plain')).toThrow()
  const indexed={version:3,sections:[{offset:{line:0,column:1},map:{version:3,sources:['scene.js'],names:[],mappings:'AAAA'}}]}
  expect(attributeJavaScript('abc',indexed,'plain').unmappedBytes).toBe(1)
 })
 test('rejects authoring graphs and a Crumbs-bearing plain control',()=>{
  for(const source of ['node_modules/effect/Schema.js','packages/css/src/theme.ts','node_modules/@opsydyn/crumbs-css/dist/style.mjs','node_modules/@opsydyn/crumbs-css/dist/theme-core.mjs'])expect(()=>attributeJavaScript('x',{version:3,sources:[source],names:[],mappings:'AAAA'},'plain')).toThrow()
  expect(()=>attributeJavaScript('x',{version:3,sources:['scene.js'],names:[],mappings:'AAAA'},'core')).toThrow()
 })
 test('fails missing/unmatched shipping artifacts',async()=>{expect((await validateArtifacts({identity:id,nativeBinaryPath:'/missing',embeddedHermesPath:'/missing',exportedHermesPath:'/missing'} as any)).ok).toBe(false)})
})
import {deviceCommand,startCollector} from './expo-consumer-native'
describe('native',()=>{
 test('rejects protected, physical and ambiguous targets before building commands',()=>{
  for(const device of [{platform:'ios',id:'1F706822-9584-4340-B426-EECF36F9D8EA'},{platform:'ios',id:'booted'},{platform:'android',id:'physical123'}])expect(()=>deviceCommand(device as any,['install','owned-app'])).toThrow()
  expect(deviceCommand({platform:'android',id:'emulator-5580'} as any,['shell','pidof','dev.crumbs.m105.plain'])).toEqual(['adb','-s','emulator-5580','shell',"'pidof' 'dev.crumbs.m105.plain'"])
 })
 test('authenticates single-use receipts over the real collector',async()=>{
  const c=await startCollector();try{const waiting=c.expect(permit);const url=`http://127.0.0.1:${c.port}/receipt`
   expect((await fetch(url,{method:'POST',body:JSON.stringify(receipt)})).status).toBe(403)
   const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${c.token}`},body:JSON.stringify(receipt)});expect(response.status).toBe(200);expect((await waiting).outcome.kind).toBe('valid')
   expect((await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${c.token}`},body:JSON.stringify(receipt)})).status).toBe(409)
  }finally{await c.close()}
 })
 test('retains a timeout as failure and rejects late receipts',async()=>{
  const c=await startCollector();try{const p={...permit,runId:'timeout',deadlineEpochMs:Date.now()+10};expect((await c.expect(p)).outcome).toMatchObject({kind:'failed',code:'launch-timeout'})
   expect((await fetch(`http://127.0.0.1:${c.port}/receipt`,{method:'POST',headers:{Authorization:`Bearer ${c.token}`},body:JSON.stringify({...receipt,runId:'timeout'})})).status).toBe(409)
  }finally{await c.close()}
 })
})
import {parseStudyArgs} from './measure-expo-consumer-runtime'
describe('study',()=>{
 test('rejects missing explicit selectors, unknown flags and non-absolute archives',()=>{
  expect(()=>parseStudyArgs(['collect','--archive','/tmp/study'])).toThrow()
  expect(()=>parseStudyArgs(['report','--unknown'])).toThrow()
  expect(()=>parseStudyArgs(['prepare','--archive','relative'])).toThrow()
  expect(parseStudyArgs(['report','--archive','/tmp/study'])).toMatchObject({phase:'report',archive:'/tmp/study'})
 })
})
describe('native boundaries',()=>{
 test('preserves deep-link ampersands through Android shell transport',async()=>{
  const command=deviceCommand({platform:'android',id:'emulator-5580'} as any,['shell','printf','%s','scheme://measure?runId=one&token=two'])
  const child=Bun.spawn(['sh','-c',command.slice(4).join(' ')],{stdout:'pipe',stderr:'pipe'});expect(await new Response(child.stdout).text()).toBe('scheme://measure?runId=one&token=two');await child.exited
 })
})
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {tmpdir} from 'node:os'
import {hash} from './expo-consumer-artifacts'
import {type ArtifactRecord,platforms,variants} from './expo-consumer-protocol'
function fullMatrix(){const attempts:Attempt[]=[],artifacts:ArtifactRecord[]=[];for(const platform of platforms)for(const variant of variants){const identity={...id,platform,variant,packageHash:variant==='plain'?null:'c'.repeat(64)};artifacts.push({identity,embeddedHermesHash:'d'.repeat(64),exportedHermesHash:'d'.repeat(64)} as ArtifactRecord);for(let round=-1;round<5;round++){const runId=`${platform}-${variant}-${round}`,p={...permit,identity,runId,warmup:round===-1,round};attempts.push({origin:'native',permit:p,outcome:{kind:'valid',receipt:{...receipt,identity,runId}}})}}return {attempts,artifacts}}
describe('protocol admission',()=>{
 test('requires five independent rounds with an excluded warm-up in every cell',()=>{const {attempts,artifacts}=fullMatrix();expect(summariseStudy(attempts,artifacts).complete).toBe(true);attempts[2]!.permit.round=0;expect(summariseStudy(attempts,artifacts).complete).toBe(false)})
 test('rejects blank artifact digests even when both fields match',()=>{const {attempts,artifacts}=fullMatrix();artifacts[0]!.embeddedHermesHash='';artifacts[0]!.exportedHermesHash='';expect(summariseStudy(attempts,artifacts).complete).toBe(false)})
})
describe('artifact retention',()=>{
 test('detects JavaScript/map drift after its inventory was recorded',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'crumbs-artifact-test-'));try{const hbc=Buffer.alloc(128);hbc.writeBigUInt64LE(0x1f1903c103bc1fc6n);hbc.writeUInt32LE(96,8);const binary=join(dir,'app'),embedded=join(dir,'embedded'),exported=join(dir,'exported'),js=join(dir,'app.js'),map=join(dir,'app.map'),inventory=join(dir,'inventory.json');await Promise.all([[binary,'native'],[embedded,hbc],[exported,hbc],[js,'x'],[map,'{}']].map(([p,b])=>writeFile(p as string,b as any)))
   await writeFile(inventory,JSON.stringify({identity:id,files:[{path:js,hash:hash('x')},{path:map,hash:hash('{}')}]}));const record={identity:id,nativeBinaryPath:binary,nativeBinaryHash:hash('native'),embeddedHermesPath:embedded,embeddedHermesHash:hash(hbc),exportedHermesPath:exported,exportedHermesHash:hash(hbc),javascriptPath:js,sourceMapPath:map,inventoryPath:inventory,dependencyLockHash:'e'.repeat(64)}
   expect((await validateArtifacts(record)).ok).toBe(true);await writeFile(map,'tampered');expect((await validateArtifacts(record)).ok).toBe(false)
  }finally{await rm(dir,{recursive:true,force:true})}
 })
})
import React from 'react'
import {createRequire} from 'node:module'
const renderToStaticMarkup: (element:React.ReactNode)=>string = createRequire(import.meta.path)('react-dom/server').renderToStaticMarkup

describe('fixture rendering',()=>{
 test('resolves real themed hooks to the same native tree as the control',async()=>{
  const trees:unknown[]=[]
  const built=await Bun.build({entrypoints:[join(import.meta.dir,'../packages/css/src/theme-core.ts')],format:'cjs',target:'node',external:['react','react-native']});expect(built.success).toBe(true)
  const apiModule={exports:{} as any};runInNewContext(await built.outputs[0]!.text(),{module:apiModule,exports:apiModule.exports,require:(name:string)=>{if(name==='react')return React;throw Error('Unexpected runtime import '+name)}});const {ThemeProvider,useThemedStyles,createThemeTokenReference}=apiModule.exports
  for(const variant of variants){const fixture=generateFixture(variant,{...id,variant});const module={exports:{} as any};runInNewContext(fixture.scene,{module,require:(name:string)=>name==='react'?React:name==='react-native'?{View:({style,children}:any)=>React.createElement('div',{style},children),Text:({style,children}:any)=>React.createElement('span',{style},children),StyleSheet:{create:(x:unknown)=>x}}:{ThemeProvider,useThemedStyles,createThemeTokenReference}})
   trees.push(renderToStaticMarkup(React.createElement(module.exports.default)))
  }
  expect(trees[1]).toEqual(trees[0]);expect(trees[2]).toEqual(trees[0]);expect((trees[0] as string).match(/Card \d/g)?.length).toBe(10)
 })
})
import {stageFixtures} from './expo-consumer-fixture'
import {symlink} from 'node:fs/promises'
describe('fixture typecheck',()=>{
 test('typechecks the generated entry files rather than an absent playground src directory',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'crumbs-fixture-test-'));try{const root=join(import.meta.dir,'..');const identities=Object.fromEntries(variants.map(variant=>[variant,{...id,variant}])) as Record<any,Identity>;const stages=await stageFixtures({root,archive:dir,tarball:join(dir,'package.tgz'),exactDependencies:{},studyId:'study',sourceHash:id.sourceHash,identities});for(const variant of variants){await symlink(join(root,'node_modules'),join(stages[variant],'node_modules'),'dir');const child=Bun.spawn([join(root,'node_modules/.bin/tsc'),'--noEmit'],{cwd:stages[variant],stdout:'pipe',stderr:'pipe'});const out=await new Response(child.stdout).text();expect({exit:await child.exited,output:out}).toEqual({exit:0,output:''})}}finally{await rm(dir,{recursive:true,force:true})}
 })
})
import {cancelCommands,runLogged} from './expo-consumer-artifacts'
describe('study cancellation',()=>{
 test('terminates only commands owned by the harness and reports interruption',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'crumbs-cancel-test-'));try{const running=runLogged([process.execPath,'-e','setTimeout(()=>{},500)'],dir,dir);const timer=setTimeout(()=>cancelCommands(),80);await expect(running).rejects.toThrow('Command failed');clearTimeout(timer)}finally{await rm(dir,{recursive:true,force:true})}
 })
 test('collector cancellation retains pending run as a failure',async()=>{const c=await startCollector();const waiting=c.expect({...permit,runId:'cancelled'});await c.close();expect((await waiting).outcome).toMatchObject({kind:'failed',code:'collector-closed'})})
})
import {parseAvdName} from './expo-consumer-native'
describe('native identity',()=>{test('accepts the exact AVD name from CRLF console responses',()=>{expect(parseAvdName('crumbs_owned\r\nOK\r\n')).toBe('crumbs_owned');expect(()=>parseAvdName('ERROR: not connected\r\nKO\r\n')).toThrow()})})
import {patchXcodeBundlePhase} from './expo-consumer-native'
describe('native Xcode project',()=>{
 test('patches the real parser model and embeds the measured bundle bytes',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'crumbs-pbx-test-'));try{const p=join(dir,'project.pbxproj');await writeFile(p,'// !$*UTF8*$!\n{archiveVersion = 1; classes = {}; objectVersion = 56; objects = {\n/* Begin PBXShellScriptBuildPhase section */\n AABBCCDDEEFF001122334455 = { isa = PBXShellScriptBuildPhase; shellScript = "react-native-xcode.sh"; };\n/* End PBXShellScriptBuildPhase section */\n }; rootObject = AABBCCDDEEFF001122334455; }\n');const xcode=createRequire(import.meta.path)('xcode');const project=xcode.project(p);project.parseSync();const source=join(dir,'bundle with space.hbc');await writeFile(source,'measured bytes');patchXcodeBundlePhase(project,source);const phase=project.hash.project.objects.PBXShellScriptBuildPhase.AABBCCDDEEFF001122334455;const child=Bun.spawn(['sh','-c',JSON.parse(phase.shellScript)],{env:{...process.env,CONFIGURATION_BUILD_DIR:dir,UNLOCALIZED_RESOURCES_FOLDER_PATH:'App.app'},stdout:'pipe',stderr:'pipe'});expect(await child.exited).toBe(0);expect(await readFile(join(dir,'App.app/main.jsbundle'),'utf8')).toBe('measured bytes')
  }finally{await rm(dir,{recursive:true,force:true})}
 })
})
describe('review regressions',()=>{
 test('resets indexed attribution and excludes CRLF separators',()=>{
  const indexed={version:3,sections:[{offset:{line:0,column:0},map:{version:3,sources:['scene.js'],mappings:'AAAA'}},{offset:{line:0,column:3},map:{version:3,sources:[],mappings:''}}]}
  expect(attributeJavaScript('abcdef',indexed,'plain')).toMatchObject({groups:{fixture:3},unmappedBytes:3})
  expect(attributeJavaScript('x\r\n',{version:3,sources:['scene.js'],mappings:'AAAA'},'plain')).toMatchObject({groups:{fixture:1},unmappedBytes:2})
 })
 test('compares resolved graphs and permits only packed Crumbs closure',async()=>{
  const {compareDependencyGraphs}=await import('./expo-consumer-artifacts')
  const base={packages:{'':{},'node_modules/react':{version:'19',integrity:'r'}}}
  const core={packages:{...base.packages,'node_modules/@opsydyn/crumbs-css':{version:'1',dependencies:{effect:'4'}},'node_modules/effect':{version:'4',integrity:'e'}}}
  expect(compareDependencyGraphs([base,core,core]).common['react@19'].version).toBe('19')
  expect(()=>compareDependencyGraphs([base,{packages:{...core.packages,'node_modules/react':{version:'20'}}},core])).toThrow()
  expect(()=>compareDependencyGraphs([base,{packages:{...core.packages,'node_modules/unrelated':{version:'1'}}},core])).toThrow()
 })
 test('checks abort before starting commands between build steps',async()=>{
  const {runLogged}=await import('./expo-consumer-artifacts');const dir=await mkdtemp(join(tmpdir(),'crumbs-abort-'));const c=new AbortController();c.abort()
  try{await expect(runLogged(['sh','-c',`touch '${join(dir,'escaped')}'`],dir,dir,{},c.signal)).rejects.toThrow();expect(await Bun.file(join(dir,'escaped')).exists()).toBe(false)}finally{await rm(dir,{recursive:true,force:true})}
 })
 test('cancels descendants as well as the direct command',async()=>{
  const {runLogged,cancelCommands}=await import('./expo-consumer-artifacts');const dir=await mkdtemp(join(tmpdir(),'crumbs-descendants-'))
  try{const running=runLogged(['sh','-c',`(sleep 1; touch '${join(dir,'escaped')}') & wait`],dir,dir).catch(()=>{});await Bun.sleep(100);cancelCommands();await running;await Bun.sleep(1200);expect(await Bun.file(join(dir,'escaped')).exists()).toBe(false)}finally{await rm(dir,{recursive:true,force:true})}
 })
 test('writes resource intent before ambiguous mutation and retains it on failure',async()=>{
  const {acquireResource}=await import('./expo-consumer-native');const dir=await mkdtemp(join(tmpdir(),'crumbs-intent-'));const ledger={archive:dir,studyId:'study',devices:[],resources:[]};const r={kind:'mapping',device:{platform:'android',id:'emulator-5580',ownershipRecordPath:''},value:'tcp:1',cleaned:false,studyId:'study'} as any
  try{await expect(acquireResource(ledger as any,r,async()=>{const saved=JSON.parse(await readFile(join(dir,'ledger.json'),'utf8'));expect(saved.resources[0].state).toBe('intended');throw Error('ambiguous remote failure')})).rejects.toThrow();expect(ledger.resources.length).toBe(1)}finally{await rm(dir,{recursive:true,force:true})}
 })
 test('requires whole installed iOS app identity',async()=>{
  const {assertInstalledIosIdentity}=await import('./expo-consumer-native');const dir=await mkdtemp(join(tmpdir(),'crumbs-app-'))
  try{await writeFile(join(dir,'main.jsbundle'),'same');await writeFile(join(dir,'executable'),'one');const {hashPath}=await import('./expo-consumer-artifacts');const expected=await hashPath(dir);await assertInstalledIosIdentity(dir,expected);await writeFile(join(dir,'executable'),'two');await expect(assertInstalledIosIdentity(dir,expected)).rejects.toThrow()}finally{await rm(dir,{recursive:true,force:true})}
 })
 test('rejects missing or changed retained proof files',async()=>{
  const {captureProofInventory,validateProofInventory}=await import('./expo-consumer-artifacts');const dir=await mkdtemp(join(tmpdir(),'crumbs-proof-'))
  try{const file=join(dir,'collector.jsonl');await writeFile(file,'receipt');const inventory=await captureProofInventory([file]);expect(await validateProofInventory(inventory)).toEqual([]);await writeFile(file,'changed');expect((await validateProofInventory(inventory)).length).toBe(1);await rm(file);expect((await validateProofInventory(inventory)).length).toBe(1)}finally{await rm(dir,{recursive:true,force:true})}
 })
})
test('rejects reused failed run IDs and mismatched warm-up artifacts',()=>{const a=fullMatrix();a.attempts.unshift({...a.attempts[1]!,outcome:{kind:'failed',code:'timeout',detail:'none'}});expect(summariseStudy(a.attempts,a.artifacts).complete).toBe(false);const b=fullMatrix();b.attempts[0]!.permit.identity={...b.attempts[0]!.permit.identity,buildId:'wrong'};(b.attempts[0]!.outcome as any).receipt.identity=b.attempts[0]!.permit.identity;expect(summariseStudy(b.attempts,b.artifacts).complete).toBe(false)})
test('collector rejects oversized and mismatched bodies without consuming the permit',async()=>{const c=await startCollector();try{const p={...permit,runId:'adversarial',deadlineEpochMs:Date.now()+1000},waiting=c.expect(p),send=(body:string)=>fetch(`http://127.0.0.1:${c.port}/receipt`,{method:'POST',headers:{Authorization:`Bearer ${c.token}`},body});expect((await send('x'.repeat(65537))).status).toBe(413);expect((await send(JSON.stringify({...receipt,runId:p.runId,deviceId:'wrong'}))).status).toBe(422);expect((await send(JSON.stringify({...receipt,runId:p.runId}))).status).toBe(200);expect((await waiting).outcome.kind).toBe('valid')}finally{await c.close()}})
test('cleanup reconciles intended resources, preserves replacements and is idempotent',async()=>{const {cleanupOwned}=await import('./expo-consumer-native');const dir=await mkdtemp(join(tmpdir(),'crumbs-cleanup-')),device={platform:'android',id:'emulator-5580',ownershipRecordPath:''} as any;const ledger={archive:dir,studyId:'study',devices:[device],resources:[{kind:'mapping',device,value:'tcp:7',studyId:'study',cleaned:false,state:'intended'}]} as any;const calls:string[][]=[];const adapter={assert:async()=>{},run:async(_d:any,args:string[])=>{calls.push(args);return args.includes('--list')?'emulator-5580 tcp:7 tcp:7\nemulator-5580 tcp:8 tcp:8':''}};try{expect((await cleanupOwned(ledger,adapter)).failures).toEqual([]);await cleanupOwned(ledger,adapter);expect(calls.filter(x=>x.includes('--remove'))).toEqual([['reverse','--remove','tcp:7']]);const replaced={...ledger,resources:[{...ledger.resources[0],cleaned:false}]};expect((await cleanupOwned(replaced,{...adapter,run:async()=> 'emulator-5580 tcp:7 tcp:9'})).failures.length).toBe(1)}finally{await rm(dir,{recursive:true,force:true})}})
test('normalizes hoisting while rejecting changed dependency resolution',async()=>{const {compareDependencyGraphs}=await import('./expo-consumer-artifacts');const plain={packages:{'node_modules/tool':{version:'1',dependencies:{leaf:'1'}},'node_modules/leaf':{version:'1'}}};const relocated={packages:{'node_modules/tool':{version:'1',dependencies:{leaf:'1'}},'node_modules/tool/node_modules/leaf':{version:'1'}}};expect(()=>compareDependencyGraphs([plain,relocated])).not.toThrow();expect(()=>compareDependencyGraphs([plain,{packages:{...relocated.packages,'node_modules/tool/node_modules/leaf':{version:'2'}}}])).toThrow()})
test('disk admission stops work before an insufficient-space phase',async()=>{const {requireDiskSpace}=await import('./expo-consumer-artifacts');const dir=await mkdtemp(join(tmpdir(),'crumbs-disk-'));try{expect(await requireDiskSpace(dir,0,'test')).toBeGreaterThan(0);await expect(requireDiskSpace(dir,Number.MAX_SAFE_INTEGER,'release build')).rejects.toThrow('release build requires')}finally{await rm(dir,{recursive:true,force:true})}})
