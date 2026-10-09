import { expect, test } from 'bun:test';
import { m113Acceptance, assertM113SourceStable, assertM113OwnedRoot, assertM113InstalledRoot, assertM113ArtifactIdentity } from '../../../scripts/m11-3-qualification';
test('acceptance_requires_host_ios_android_with_failed_dominating', () => { expect(m113Acceptance({ host: 'passed', ios: 'passed', android: 'not-run' })).toBe('incomplete'); expect(m113Acceptance({ host: 'passed', ios: 'passed', android: 'passed' })).toBe('passed'); expect(m113Acceptance({ host: 'failed', ios: 'passed', android: 'passed' })).toBe('failed'); });
test('source_artifact_and_installed_consumer_drift_are_rejected', () => { expect(() => assertM113SourceStable('before', 'after')).toThrow(); expect(() => assertM113ArtifactIdentity('expected', 'other')).toThrow(); expect(() => assertM113InstalledRoot('/owned', '/foreign/node_modules/@opsydyn/crumbs-css')).toThrow(); expect(() => assertM113InstalledRoot('/owned', '/owned/node_modules/@opsydyn/crumbs-css')).not.toThrow(); });
test('foreign_nonempty_consumer_root_is_refused', () => { expect(() => assertM113OwnedRoot(['foreign'], undefined)).toThrow(); expect(() => assertM113OwnedRoot([], undefined)).not.toThrow(); });
import { assertM113NativeBinding, failM113NativeQualification, assertM113DeviceIdentity, assertM113RealNativeMap } from '../../../scripts/m11-3-native-observations';
test('native_binding_and_device_drift_are_rejected', () => { const host = { host: 'passed', sourceBefore: { digest: 'source' }, artifact: { sha256: 'artifact' }, consumerRoot: '/owned' }; expect(() => assertM113NativeBinding(host, 'other', 'artifact', '/owned')).toThrow(); expect(() => assertM113NativeBinding(host, 'source', 'artifact', '/owned')).not.toThrow(); expect(() => assertM113DeviceIdentity('owned', 'foreign')).toThrow(); });
test('fake_peer_native_maps_are_refused', () => { expect(() => assertM113RealNativeMap({ sources: ['node_modules/react-native/Libraries/Animated/AnimatedImplementation.js', 'test/motion-peer.cjs'], sourcesContent: [] })).toThrow(); expect(() => assertM113RealNativeMap({ sources: ['test/motion.integration.tsx'], sourcesContent: [] })).toThrow(); });
test('failure_after_passed_phases_invalidates_both_platforms', () => { const receipt: any = { ios: 'passed', android: 'passed', iosPhases: [{ status: 'passed' }] }; failM113NativeQualification(receipt, Error('late integrity drift')); expect(receipt.ios).toBe('failed'); expect(receipt.android).toBe('failed'); expect(receipt.iosPhases[0].status).toBe('passed'); });
import { deflateSync, inflateSync } from 'node:zlib';
import { nativeAttributes, nativeXmlAttributes, readM113Observation, nativeActionPoint, assertM113Plateau, inspectM113Png, assertM113Marker } from '../../../scripts/m11-3-native-observations';
function pngFixture(x = 5, alpha = .6, filter = 0) { const width = 250, height = 130, channels = 3, row = width * channels, pixels = Buffer.alloc(row * height, 255); for (const [left, top, rgb] of [[x, 5, [37, 99, 235]], [5, 70, [22, 163, 74]]] as const)
    for (let y = top; y < top + 48; y++)
        for (let i = left; i < left + 48; i++)
            for (let c = 0; c < 3; c++)
                pixels[y * row + i * 3 + c] = Math.round(255 - (255 - rgb[c]!) * alpha); const raw = Buffer.alloc((row + 1) * height); for (let y = 0; y < height; y++) {
    raw[y * (row + 1)] = filter;
    for (let i = 0; i < row; i++) {
        const at = y * row + i, left = i >= 3 ? pixels[at - 3]! : 0, above = y ? pixels[at - row]! : 0, upperLeft = y && i >= 3 ? pixels[at - row - 3]! : 0;
        let prediction = 0;
        if (filter === 1)
            prediction = left;
        if (filter === 2)
            prediction = above;
        if (filter === 3)
            prediction = (left + above) >> 1;
        if (filter === 4) {
            const p = left + above - upperLeft, distances = [Math.abs(p - left), Math.abs(p - above), Math.abs(p - upperLeft)], small = Math.min(...distances);
            prediction = distances[0] === small ? left : distances[1] === small ? above : upperLeft;
        }
        raw[y * (row + 1) + 1 + i] = (pixels[at]! - prediction) & 255;
    }
} function chunk(name: string, data: Buffer) { const b = Buffer.alloc(data.length + 12); b.writeUInt32BE(data.length, 0); b.write(name, 4); data.copy(b, 8); return b; } const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2; return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]); }
test('actual_marker_pixels_determine_displacement_and_opacity', () => { for (let filter = 0; filter < 5; filter++) {
    const initial = inspectM113Png(pngFixture(5, .6, filter));
    expect(initial.a?.x).toBe(5);
    expect(initial.a?.width).toBe(48);
    expect(initial.a?.opacity).toBeCloseTo(.6, 2);
    const selected = inspectM113Png(pngFixture(117, 1, filter));
    expect(() => assertM113Marker(selected.a, initial.a!, 'selected')).not.toThrow();
    expect(() => assertM113Marker(initial.a, initial.a!, 'selected')).toThrow();
} expect(() => inspectM113Png(Buffer.from('labels are not pixel evidence'))).toThrow(); });
test('native_hierarchy_parsing_and_enabled_action_bounds', () => { const attrs = nativeXmlAttributes('<node resource-id="motion-a-select" enabled="true" bounds="[10,20][50,60]" content-desc="M113:{&quot;sourceMode&quot;:&quot;native&quot;}"/>'); expect(nativeActionPoint(attrs[0])).toEqual({ x: 30, y: 40 }); expect(readM113Observation(attrs).sourceMode).toBe('native'); expect(nativeAttributes({ attributes: { text: 'parent' }, children: [{ attributes: { text: 'child' } }] }).map(x => x.text)).toEqual(['parent', 'child']); expect(() => nativeActionPoint({ ...attrs[0], enabled: 'false' })).toThrow(); expect(() => readM113Observation([])).toThrow(); });
test('native_plateau_requires_equal_samples_spanning_100ms', () => { const observation = { sourceMode: 'native' } as any; expect(() => assertM113Plateau([{ at: 0, observation }, { at: 50, observation }, { at: 100, observation }])).not.toThrow(); expect(() => assertM113Plateau([{ at: 0, observation }, { at: 1, observation }, { at: 2, observation }])).toThrow(); expect(() => assertM113Plateau([{ at: 0, observation }, { at: 100, observation }, { at: 200, observation: { sourceMode: 'other' } as any }])).toThrow(); });
import { verifyM113InputFiles } from '../../../scripts/m11-3-qualification';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { m113Sha } from '../../../scripts/m11-3-qualification';
test('native_inputs_include_config_and_generated_style_and_reject_byte_drift', async () => { const root = await mkdtemp(join(tmpdir(), 'm113-input-')); try {
    await mkdir(join(root, 'authoring'));
    await writeFile(join(root, 'authoring/panel.ts'), 'authored');
    await writeFile(join(root, 'metro.config.cjs'), 'config');
    await writeFile(join(root, 'generated.js'), 'generated');
    const files = [['authoring/panel.ts', 'authored'], ['metro.config.cjs', 'config'], ['generated.js', 'generated']].map(([path, bytes]) => ({ path: path!, sha256: m113Sha(bytes!) }));
    expect(await verifyM113InputFiles(root, files)).toEqual(files);
    await writeFile(join(root, 'generated.js'), 'foreign');
    await expect(verifyM113InputFiles(root, files)).rejects.toThrow('Input changed');
}
finally {
    await rm(root, { recursive: true, force: true });
} });
test('native_input_manifest_rejects_nested_path_escape_before_reading',async()=>{await expect(verifyM113InputFiles('/owned',[{path:'src/../../foreign',sha256:'foreign'}])).rejects.toThrow('Input escaped')});
test('native_cleanup_failure_retains_the_first_execution_error',()=>{const receipt:any={};failM113NativeQualification(receipt,Error('launch error'));failM113NativeQualification(receipt,Error('cleanup error'));expect(receipt.error).toContain('launch error');expect(receipt.errors).toHaveLength(2)});
import {m113LaunchOverlayAction} from '../../../scripts/m11-3-native-observations';
test('owned_launch_overlay_is_bounded_to_expo_and_the_motion_project',()=>{const action={accessibilityText:'Close',enabled:'true',bounds:'[10,10][30,30]'};expect(m113LaunchOverlayAction([{accessibilityText:'Expo Go'},{accessibilityText:'Crumbs M11.3 Motion'},action])).toBe(action);expect(m113LaunchOverlayAction([{accessibilityText:'Expo Go'},{accessibilityText:'Other project'},action])).toBeUndefined();expect(m113LaunchOverlayAction([{text:'Allow camera access?'},{text:'Allow',enabled:'true',bounds:'[10,10][30,30]'}])).toBeUndefined();expect(m113LaunchOverlayAction([{text:'Open in “Expo Go”?'},{text:'Open',enabled:'true',bounds:'[10,10][30,30]'}])?.text).toBe('Open')});

import {nativeReduceMotionSwitchPoint} from '../../../scripts/m11-3-native-observations';
test('ios_reduce_motion_targets_the_observed_switch_not_the_accessibility_row_centre',()=>{
 const control={'resource-id':'REDUCE_MOTION',value:'0',enabled:'true',bounds:'[36,146][366,174]'};
 expect(nativeReduceMotionSwitchPoint(control)).toEqual({x:342,y:160});
 expect(nativeReduceMotionSwitchPoint({...control,bounds:'[10,20][40,40]'})).toEqual({x:25,y:30});
 for(const invalid of [{...control,enabled:'false'},{...control,value:''},{...control,'resource-id':'OTHER'},{...control,bounds:'missing'}])expect(()=>nativeReduceMotionSwitchPoint(invalid)).toThrow();
});

import {assertM113IosInputIdentity} from '../../../scripts/m11-3-native-observations';
test('fast_ios_input_requires_the_owned_booted_simulator_identity',()=>{
 const expected='owned-ios';const actual={udid:expected,name:'Crumbs M11.3 Native Motion',target_type:'simulator',state:'Booted'};
 expect(()=>assertM113IosInputIdentity(expected,actual)).not.toThrow();
 for(const invalid of [{...actual,udid:'foreign'},{...actual,name:'Other project'},{...actual,target_type:'device'},{...actual,state:'Shutdown'}])expect(()=>assertM113IosInputIdentity(expected,invalid)).toThrow();
});

import {m113AndroidLaunchNeedsRedirect} from '../../../scripts/m11-3-native-observations';
test('android_launch_redirect_only_retries_the_actual_cold_launcher',()=>{
 expect(m113AndroidLaunchNeedsRedirect('Status: ok\nLaunchState: UNKNOWN (0)\nActivity: host.exp.exponent/.LauncherActivity\nComplete')).toBe(true);
 expect(m113AndroidLaunchNeedsRedirect('Status: ok\nLaunchState: WARM\nActivity: host.exp.exponent/.experience.ExperienceActivity\nComplete')).toBe(false);
 expect(()=>m113AndroidLaunchNeedsRedirect('Status: ok\nActivity: another.app/.LauncherActivity')).toThrow();
 expect(()=>m113AndroidLaunchNeedsRedirect('Error: Activity not started')).toThrow();
});
test('owned_android_developer_welcome_is_recognised_without_dismissing_foreign_prompts',()=>{
 const action={text:'Continue',enabled:'true',bounds:'[464,2145][617,2190]'};
 const welcome=[{text:'Crumbs M11.3 Motion'},{text:'SDK version: 56.0.0'},{text:'This is the developer menu. It gives you access to useful tools in your development builds.'},action];
 expect(m113LaunchOverlayAction(welcome)).toBe(action);
 expect(m113LaunchOverlayAction(welcome.map(a=>a.text==='Crumbs M11.3 Motion'?{text:'Other project'}:a))).toBeUndefined();
 expect(m113LaunchOverlayAction([{text:'Crumbs M11.3 Motion'},action])).toBeUndefined();
 expect(m113LaunchOverlayAction(welcome.map(a=>a===action?{...action,enabled:'false'}:a))).toBeUndefined();
});
test('owned_android_developer_menu_uses_observed_content_description_close',()=>{
 const close={'content-desc':'Close',enabled:'true',bounds:'[949,1060][991,1102]'};
 const menu=[{text:'Crumbs M11.3 Motion'},{text:'SDK version: 56.0.0'},{text:'Reload'},{text:'Go home'},close];
 expect(m113LaunchOverlayAction(menu)).toBe(close);
 expect(m113LaunchOverlayAction(menu.map(a=>'text' in a&&a.text==='Crumbs M11.3 Motion'?{text:'Other project'}:a))).toBeUndefined();
 expect(m113LaunchOverlayAction([{text:'Crumbs M11.3 Motion'},close])).toBeUndefined();
});
import {encodeM113AndroidRgba as encodeAndroidRawCapture} from '../../../scripts/m11-3-native-observations';
test('android_raw_capture_preserves_native_rgba_bytes_and_rejects_other_formats',()=>{
 const width=64,height=64,raw=Buffer.alloc(16+width*height*4);[width,height,1,1].forEach((n,i)=>raw.writeUInt32LE(n,i*4));
 for(let i=16;i<raw.length;i+=4){raw[i]=37;raw[i+1]=99;raw[i+2]=235;raw[i+3]=255;}
 const png=encodeAndroidRawCapture(raw),marker=inspectM113Png(png);expect(marker.width).toBe(width);expect(marker.height).toBe(height);expect(marker.a?.x).toBe(0);expect(marker.a?.width).toBe(width);expect(marker.a?.opacity).toBe(1);
 const chunks:Buffer[]=[];for(let at=8;at<png.length;){const length=png.readUInt32BE(at),name=png.toString('ascii',at+4,at+8);if(name==='IDAT')chunks.push(png.subarray(at+8,at+8+length));at+=length+12;}
 const pixels=inflateSync(Buffer.concat(chunks));for(let y=0;y<height;y++){expect(pixels[y*(width*4+1)]).toBe(0);expect(pixels.subarray(y*(width*4+1)+1,(y+1)*(width*4+1))).toEqual(raw.subarray(16+y*width*4,16+(y+1)*width*4));}
 expect(()=>encodeAndroidRawCapture(raw.subarray(0,raw.length-1))).toThrow();
 const translucent=Buffer.from(raw);translucent[19]=128;expect(()=>encodeAndroidRawCapture(translucent)).toThrow();
 const unsupported=Buffer.from(raw);unsupported.writeUInt32LE(4,8);expect(()=>encodeAndroidRawCapture(unsupported)).toThrow();
 unsupported.writeUInt32LE(1,8);unsupported.writeUInt32LE(2,12);expect(()=>encodeAndroidRawCapture(unsupported)).toThrow();
 unsupported.writeUInt32LE(0xffffffff,0);expect(()=>encodeAndroidRawCapture(unsupported)).toThrow();
});
import {readM113AndroidRgbaCapture as readStreamedCapture} from '../../../scripts/m11-3-native-observations';
test('android_captured_frame_is_acknowledged_before_its_delayed_pixel_body',async()=>{
 const raw=Buffer.alloc(20);[1,1,1,1].forEach((n,i)=>raw.writeUInt32LE(n,i*4));raw.set([37,99,235,255],16);
 let controller!:ReadableStreamDefaultController<Uint8Array>,called=0;
 const stream=new ReadableStream<Uint8Array>({start(c){controller=c;c.enqueue(raw.subarray(0,7));c.enqueue(raw.subarray(7,16))}});
 const bytes=await readStreamedCapture(stream,header=>{called++;expect(header).toEqual({width:1,height:1});controller.enqueue(raw.subarray(16));controller.close()});
 expect(called).toBe(1);expect(bytes).toEqual(raw);
},1000);
test('android_unsupported_capture_header_never_authorises_the_next_gesture',async()=>{
 const raw=Buffer.alloc(16);[1,1,4,1].forEach((n,i)=>raw.writeUInt32LE(n,i*4));let called=0;
 const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(raw);c.close()}});
 await expect(readStreamedCapture(stream,()=>{called++})).rejects.toThrow();expect(called).toBe(0);
});
