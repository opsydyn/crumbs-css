import { afterAll, test, expect } from 'bun:test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const temporaryRoots: string[] = [];
afterAll(async () => { for (const root of temporaryRoots) await rm(root, { recursive: true, force: true }); });
import { assertM112SourceStable, assertM112InstalledRoot, m112Acceptance, assertM112OwnedRoot, assertM112ArtifactIdentity } from '../../../scripts/m11-2-qualification';
test('drift and workspace escapes cannot qualify the installed cohort', () => { expect(() => assertM112SourceStable('before', 'after')).toThrow(/Source changed/); expect(() => assertM112InstalledRoot('/tmp/consumer', '/workspace/packages/css')).toThrow(/escaped/); expect(() => assertM112ArtifactIdentity('sha-a', 'sha-b')).toThrow(/Tarball identity/); expect(() => assertM112OwnedRoot(['node_modules'], undefined)).toThrow(/nonempty/); expect(() => assertM112OwnedRoot([], undefined)).not.toThrow(); });
test('host pass cannot stand in for required native platforms', () => { expect(m112Acceptance({ host: 'passed', ios: 'not-run', android: 'passed' })).toBe('incomplete'); expect(m112Acceptance({ host: 'passed', ios: 'passed', android: 'passed' })).toBe('passed'); expect(m112Acceptance({ host: 'passed', ios: 'failed', android: 'passed' })).toBe('failed'); });
import { assertM112NativeBinding, assertM112PhaseObservations, assertM112DeviceIdentity } from '../../../scripts/m11-2-native-qualification';
test('native binding rejects another source, artifact, consumer or device owner', () => { const host = { sourceBefore: { digest: 'source' }, artifact: { sha256: 'artifact' }, consumerRoot: '/tmp/consumer', host: 'passed' }; expect(() => assertM112NativeBinding(host, 'other', 'artifact', '/tmp/consumer')).toThrow(); expect(() => assertM112NativeBinding(host, 'source', 'other', '/tmp/consumer')).toThrow(); expect(() => assertM112NativeBinding(host, 'source', 'artifact', '/workspace')).toThrow(); expect(() => assertM112DeviceIdentity('crumbs_m111', 'another_avd')).toThrow(/identity/); });
test('native phase checks actual dimensions and chip geometry rather than labels alone', () => { const observation = { state: { a: { mounted: true, width: 176, key: 0 }, nested: false, height: 120, portal: 'closed' }, telemetry: { A: { bucket: 'narrow', direction: 'column', measured: { width: 176 }, chips: { one: { x: 8, y: 8 }, two: { x: 8, y: 40 } } }, B: { bucket: 'wide', direction: 'row', measured: { width: 288 }, chips: { one: { x: 8, y: 8 }, two: { x: 80, y: 8 } } }, height: { bucket: 'short', measured: { height: 120 } } } }; expect(() => assertM112PhaseObservations('initial', observation)).not.toThrow(); expect(() => assertM112PhaseObservations('wide', observation)).toThrow(); expect(() => assertM112PhaseObservations('initial', { ...observation, telemetry: { ...observation.telemetry, A: { ...observation.telemetry.A, chips: { one: { x: 8, y: 8 }, two: { x: 80, y: 8 } } } } })).toThrow(/geometry/); });

import {readM112NativeObservations} from '../../../scripts/m11-2-native-qualification';
test('native accessibility telemetry decodes the complete JSON payload',()=>{const data={state:{a:{width:176,mounted:true,key:0},nested:false,height:120,portal:'closed'},telemetry:{}};expect(readM112NativeObservations([{accessibilityText:'M112All:'+JSON.stringify(data)}])).toEqual(data);expect(()=>readM112NativeObservations([{text:'different app'}])).toThrow(/Missing native/);});

import { relocateM112AuthoredStyle, restoreM112AuthoredStyle } from '../../../scripts/m11-2-qualification';
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
test('owned precompiled delivery preserves authored source and rejects source drift',async()=>{
 const root=await mkdtemp(join(tmpdir(), 'm112-style-stage-')); temporaryRoots.push(root); await mkdir(root+'/src');
 const source='export const card = {};'; const hash=createHash('sha256').update(source).digest('hex');
 await writeFile(root+'/src/container-panel.css.ts',source);
 await expect(relocateM112AuthoredStyle(root,'different')).rejects.toThrow(/Fixture changed/);
 await relocateM112AuthoredStyle(root,hash);
 await expect(access(root+'/src/container-panel.css.ts')).rejects.toThrow();
 expect(await readFile(root+'/authoring/container-panel.css.ts','utf8')).toBe(source);
 await restoreM112AuthoredStyle(root,hash);
 expect(await readFile(root+'/src/container-panel.css.ts','utf8')).toBe(source);
 await relocateM112AuthoredStyle(root,hash);
 await writeFile(root+'/authoring/container-panel.css.ts','changed');
 await expect(restoreM112AuthoredStyle(root,hash)).rejects.toThrow(/Fixture changed/);
});

import { verifyM112NativeInputs, assertM112NativePlateau } from '../../../scripts/m11-2-native-qualification';
test('native input guard verifies bytes, archived authoring and generated styles',async()=>{
 const root=await mkdtemp(join(tmpdir(), 'm112-native-input-'));temporaryRoots.push(root);await mkdir(root+'/src');await mkdir(root+'/authoring');
 const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
 await writeFile(root+'/app.json','app');await writeFile(root+'/authoring/container-panel.css.ts','source');
 await writeFile(root+'/src/container-panel.css.native.js','native');await writeFile(root+'/src/container-panel.css.web.js','web');
 const files=[{path:'app.json',sha256:hash('app')},{path:'src/container-panel.css.ts',sha256:hash('source')}];const styles={native:hash('native'),web:hash('web')};
 expect((await verifyM112NativeInputs(root,files,styles)).length).toBe(4);
 await writeFile(root+'/app.json','tampered');await expect(verifyM112NativeInputs(root,files,styles)).rejects.toThrow(/Native input changed/);
 await writeFile(root+'/app.json','app');await writeFile(root+'/src/container-panel.css.native.js','tampered');await expect(verifyM112NativeInputs(root,files,styles)).rejects.toThrow(/Native input changed/);
});
test('native plateau guard requires three equal genuine samples inside the observation window',()=>{
 const value={state:{a:{width:176}},telemetry:{A:{events:2}}};
 expect(()=>assertM112NativePlateau([{at:100,observations:value},{at:250,observations:value},{at:400,observations:value}])).not.toThrow();
 expect(()=>assertM112NativePlateau([{at:100,observations:value}])).toThrow();
 expect(()=>assertM112NativePlateau([{at:100,observations:value},{at:150,observations:value},{at:200,observations:value}])).toThrow();
 expect(()=>assertM112NativePlateau([{at:100,observations:value},{at:200,observations:value},{at:10200,observations:value}])).toThrow();
 expect(()=>assertM112NativePlateau([{at:100,observations:value},{at:200,observations:{}},{at:300,observations:value}])).toThrow();
});

import { m112NativeActionPoint } from '../../../scripts/m11-2-native-qualification';
test('native actions require observed enabled bounds and use a clear interior point',()=>{
 expect(m112NativeActionPoint({enabled:'true',bounds:'[289,89][374,127]'})).toEqual({x:310,y:108});
 expect(()=>m112NativeActionPoint({enabled:'false',bounds:'[289,89][374,127]'})).toThrow();
 expect(()=>m112NativeActionPoint({enabled:'true',bounds:'[0,0][0,0]'})).toThrow();
 expect(()=>m112NativeActionPoint(undefined)).toThrow();
});

test('native telemetry decodes an escaped capture JSON transport exactly once',()=>{
 const value={state:{a:{width:176,mounted:true,key:0},nested:false,height:120,portal:'closed'},telemetry:{}};const encoded=JSON.stringify(JSON.stringify(value)).slice(1,-1);
 expect(readM112NativeObservations([{'content-desc':'M112All:'+encoded}])).toEqual(value);
 expect(()=>readM112NativeObservations([{'content-desc':'M112All:{\\"state\\":broken}'}])).toThrow();
});

import { m112NativeXmlAttributes } from '../../../scripts/m11-2-native-qualification';
test('Android hierarchy reads both XML quote forms without truncating JSON or quoted greater-than signs',()=>{
 const value={state:{a:{width:176,mounted:true,key:0},nested:false,height:120,portal:'closed'},telemetry:{}};
 const observed=`<?xml version="1.0"?><hierarchy><node text="Native observations" resource-id="container-all-telemetry" content-desc='M112All:${JSON.stringify(value)}' hint="size > zero" /></hierarchy>`;
 expect(readM112NativeObservations(m112NativeXmlAttributes(observed))).toEqual(value);
 expect(m112NativeXmlAttributes(observed)[0]?.hint).toBe('size > zero');
 const doubleQuoted=`<hierarchy><node content-desc="M112All:${JSON.stringify(value).replaceAll('"','&quot;')}" text='width > zero &amp; measured' /></hierarchy>`;
 expect(readM112NativeObservations(m112NativeXmlAttributes(doubleQuoted))).toEqual(value);
 expect(m112NativeXmlAttributes(doubleQuoted)[0]?.text).toBe('width > zero & measured');
});

import { m112AndroidLaunchStage } from '../../../scripts/m11-2-native-qualification';
test('Android launch distinguishes the observed Go launcher redirect from the loaded experience',()=>{
 expect(m112AndroidLaunchStage('Status: ok\nActivity: host.exp.exponent/.LauncherActivity\nComplete')).toBe('launcher');
 expect(m112AndroidLaunchStage('Status: ok\nActivity: host.exp.exponent/.experience.ExperienceActivity\nComplete')).toBe('experience');
 expect(()=>m112AndroidLaunchStage('Status: ok\nActivity: another.app/.Activity\nComplete')).toThrow(/Expo Go experience/);
 expect(()=>m112AndroidLaunchStage('Error: launch failed')).toThrow(/Expo Go experience/);
});

import { m112AndroidScreenshotCommand, m112NativeScrollPoints } from '../../../scripts/m11-2-native-qualification';
test('Android screenshots stay inside the existing scoped shell allowlist',()=>{
 expect(m112AndroidScreenshotCommand('emulator-5568')).toEqual(['adb','-s','emulator-5568','shell',"'screencap' '-p'"]);
 expect(()=>m112AndroidScreenshotCommand('device-or-all')).toThrow(/Prohibited/);
});
test('supplementary portal scrolling requires observed scrollable bounds',()=>{
 expect(m112NativeScrollPoints({scrollable:'true',bounds:'[0,600][1080,2300]'})).toEqual({start:{x:540,y:1875},end:{x:540,y:1025}});
 expect(()=>m112NativeScrollPoints({scrollable:'false',bounds:'[0,600][1080,2300]'})).toThrow();
 expect(()=>m112NativeScrollPoints({scrollable:'true',bounds:'[0,0][0,0]'})).toThrow();
 expect(()=>m112NativeScrollPoints(undefined)).toThrow();
});

import { failM112NativeQualification } from '../../../scripts/m11-2-native-qualification';
test('late native integrity failure invalidates two previously passed platform phase sets',()=>{
 const receipt={host:'passed' as const,ios:'passed',android:'passed',iosPhases:[{status:'passed'}],androidPhases:[{status:'passed'}],error:undefined as string|undefined};
 failM112NativeQualification(receipt,Error('Tarball identity changed'));
 expect(receipt).toMatchObject({ios:'failed',android:'failed',error:'Error: Tarball identity changed'});
 expect(receipt.iosPhases).toEqual([{status:'passed'}]);
 expect(receipt.androidPhases).toEqual([{status:'passed'}]);
 expect(m112Acceptance(receipt as Parameters<typeof m112Acceptance>[0])).toBe('failed');
});
