import {parseAvdName} from './expo-consumer-native';
import { openSync, closeSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, realpath } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { verifyInstalledArtifact } from './packed-distribution-contract';
import { m113Sha, m113SourceIdentity, verifyM113InputFiles, assertM113SourceStable, assertM113ArtifactIdentity, assertM113InstalledRoot, m113Acceptance } from './m11-3-qualification';
import { readM113AndroidRgbaCapture, encodeM113AndroidRgba, m113AndroidLaunchNeedsRedirect, m113LaunchOverlayAction, assertM113NativeBinding, assertM113DeviceIdentity, assertM113RealNativeMap, failM113NativeQualification, nativeAttributes, nativeXmlAttributes, nativeActionPoint, nativeReduceMotionSwitchPoint, assertM113IosInputIdentity, readM113Observation, assertM113Plateau, inspectM113Png, assertM113Marker } from './m11-3-native-observations';
import type { MotionObservation, PixelMarker } from './m11-3-native-observations';
type Platform = 'ios' | 'android';
const repository = resolve(import.meta.dir, '..');
function ensure(condition: unknown, message: string): asserts condition { if (!condition)
    throw Error(message); }
async function qualify(args: string[]) {
    const flags = new Map<string, string>();
    for (let i = 0; i < args.length; i += 2) {
        ensure(['--consumer-root', '--host-receipt', '--ownership', '--port', '--output'].includes(args[i]!) && args[i + 1], 'Invalid native arguments');
        flags.set(args[i]!, args[i + 1]!);
    }
    for (const flag of ['--consumer-root', '--host-receipt', '--ownership', '--port', '--output'])
        ensure(flags.has(flag), 'Missing ' + flag);
    const consumer = resolve(flags.get('--consumer-root')!), output = resolve(flags.get('--output')!), port = Number(flags.get('--port')), hostPath = resolve(flags.get('--host-receipt')!), ownerPath = resolve(flags.get('--ownership')!);
    ensure(Number.isInteger(port) && port >= 1024 && port <= 65535, 'Invalid Metro port');
    await mkdir(output, { recursive: true });
    ensure(!(await readdir(output)).length, 'Native output must be empty');
    const hostBytes = await readFile(hostPath), host = JSON.parse(hostBytes.toString()), ownerBytes = await readFile(ownerPath), owner = JSON.parse(ownerBytes.toString()), source = await m113SourceIdentity();
    assertM113NativeBinding(host, source.digest, m113Sha(await readFile(host.artifact.tarball)), consumer);
    ensure(owner.schema === 'crumbs.m11.3.native-ownership.v1', 'Foreign ownership schema');
    const ios = owner.devices.ios.id, android = owner.devices.android.id;
    ensure(ios !== owner.protectedSimulator && owner.studyId === 'crumbs-m113', 'Protected or foreign target');
    const env = { ...process.env, ...owner.environment, CI: '1', EXPO_NO_METRO_WORKSPACE_ROOT: '1', EXPO_NO_TYPESCRIPT_SETUP:'1', ANDROID_AVD_HOME: owner.devices.android.avdHome, PATH: join(owner.tools.sdk, 'platform-tools') + ':' + process.env.PATH };
    const commands: any[] = [], receipt: any = { schema: 'crumbs.m11.3.native-qualification.v1', hostReceipt: hostPath, hostReceiptSha256: m113Sha(hostBytes), ownership: owner, ownershipSha256: m113Sha(ownerBytes), sourceBefore: source, artifact: host.artifact, consumerRoot: consumer, commands, ios: 'not-run', android: 'not-run', acceptance: 'incomplete', evidenceClass: 'development Expo Go / Hermes functional; physical and spoken-reader deferred' };
    let metro: ReturnType<typeof Bun.spawn> | undefined, emulator: ReturnType<typeof Bun.spawn> | undefined, metroFd: number | undefined, emuFd: number | undefined, mapping = false, iosBootedHere = false, androidPreference: string | undefined, iosPreference: string | undefined, iosSwitch: Record<string, string> | undefined;
    const run = async (command:string[],name:string,binary:false|'png'|'rgba'=false,frameReady?:()=>Promise<void>)=>{
        const at=Date.now(),index=commands.length,log=join(output,`${index}-${name}.${binary==='rgba'?'rgba.gz':binary||'log'}`),record:any={command,at,log};commands.push(record);
        const p=Bun.spawn(command,{cwd:consumer,env,stdout:'pipe',stderr:'pipe'});
        try{
            const stdout=binary==='rgba'?readM113AndroidRgbaCapture(p.stdout,async()=>{record.frameReadyAt=Date.now();if(frameReady){await frameReady();record.nextActionCompletedAt=Date.now()}}):new Response(p.stdout).arrayBuffer().then(x=>Buffer.from(x));
            const [bytes,stderr,exitCode]=await Promise.all([stdout,new Response(p.stderr).text(),p.exited]);
            await writeFile(log,binary==='rgba'?gzipSync(bytes):binary?bytes:bytes.toString()+stderr);Object.assign(record,{completedAt:Date.now(),exitCode,sha256:m113Sha(await readFile(log))});
            ensure(exitCode===0,name+' failed: '+log);return binary?bytes:bytes.toString().trim();
        }catch(error){p.kill();await p.exited;throw error}
    };
    const adb = (command:string[],name:string,binary:false|'png'|'rgba'=false,frameReady?:()=>Promise<void>)=>run([owner.tools.adb,'-s',android,...command],name,binary,frameReady);
    const simctl = (command: string[], name: string) => run(['xcrun', 'simctl', command[0]!, ios, ...command.slice(1)], name);
    const maestro = (command: string[], name: string) => run([owner.tools.maestro, '-p', 'ios', '--device', ios, ...command], name);
    const flow = async (steps: string[], name: string, app = 'host.exp.Exponent') => { const file = join(output, `${commands.length}-${name}.yaml`); await writeFile(file, `appId: ${app}\n---\n${steps.map(s => '- ' + s).join('\n')}\n`); return maestro(['test', '--no-reinstall-driver', file], name); };
    const idb=(command:string[],name:string)=>run([owner.tools.idb,'--companion',owner.idbInput.socket,...command],name);
    const assertInputTools=async()=>{for(const file of owner.idbInput.files)ensure(m113Sha(await readFile(file.path))===file.sha256,'iOS input tool drift: '+file.path);assertM113IosInputIdentity(ios,JSON.parse(String(await idb(['describe','--json'],'ios-input-identity'))))};
    const observedControls:Partial<Record<Platform,Record<string,string>[]>>={};
    type IosInputStep = {kind:'tap';point:{x:number;y:number}}|{kind:'wait';ms:number}|{kind:'capture';name:string};
    const iosCaptureSequence=async(name:string,steps:IosInputStep[],images:string[])=>{
        const startedAt=Date.now();await writeFile(join(output,name+'-input-sequence.json'),JSON.stringify({startedAt,steps},null,2)+'\n');
        const captures=new Map<string,Awaited<ReturnType<typeof capture>>>();
        for(const step of steps){
            if(step.kind==='tap')await idb(['ui','tap',String(step.point.x),String(step.point.y),'--duration','0.1'],name+'-tap');
            else if(step.kind==='wait')await Bun.sleep(step.ms);
            else {ensure(!captures.has(step.name),'Duplicate sequence capture');captures.set(step.name,await capture('ios',step.name))}
        }
        return images.map(image=>{const found=captures.get(image);ensure(found,'Missing sequence capture');return found});
    };
    const iosTapStep=(id:string,attrs:Record<string,string>[]):IosInputStep=>({kind:'tap',point:nativeActionPoint(find(attrs,id))});
    const iosFrameSteps=(name:string):IosInputStep[]=>[{kind:'wait',ms:1000},{kind:'capture',name}];
    const hierarchy = async (platform: Platform) => { if (platform === 'ios') {
        const raw = String(await maestro(['hierarchy', '--no-reinstall-driver'], 'ios-hierarchy'));
        const attrs=nativeAttributes(JSON.parse(raw));observedControls[platform]=attrs;return attrs;
    } await adb(['shell', 'uiautomator', 'dump', '/sdcard/m113-window.xml'], 'android-dump'); const attrs=nativeXmlAttributes(String(await adb(['shell', 'cat', '/sdcard/m113-window.xml'], 'android-hierarchy')));observedControls[platform]=attrs;return attrs; };
    const find = (attrs: Record<string, string>[], id: string) => attrs.find(a => a['resource-id'] === id || a['resource-id']?.endsWith(':id/' + id) || a['identifier'] === id || a['id'] === id || a['accessibilityIdentifier'] === id);
    const tap = async (platform: Platform, id: string, attrs?: Record<string, string>[]) => { const observed = attrs ?? observedControls[platform] ?? await hierarchy(platform), point = nativeActionPoint(find(observed, id)); if (platform === 'android')
        await adb(['shell', 'input', 'tap', String(point.x), String(point.y)], 'tap-' + id);
    else
        await idb(['ui','tap',String(point.x),String(point.y),'--duration','0.1'],'tap-'+id); };
    const capture = async (platform: Platform, name: string, afterFrame?:()=>Promise<void>) => { const startedAt = Date.now(); let bytes: Buffer, file: string, raw: {file:string;sha256:string;rawSha256:string;encoding:'gzip';format:'rgba8-srgb';frameReadyAt:number}|undefined; if (platform === 'ios') {
        file = join(output, `${platform}-${name}.png`);
        await simctl(['io', 'screenshot', file], 'screenshot-' + name);
        bytes = await readFile(file);
    }
    else {
        const index=commands.length;const nativeBytes = await adb(['exec-out','screencap'],'screenshot-'+name,'rgba',afterFrame) as Buffer;
        const command=commands[index]!;raw={file:command.log,sha256:command.sha256,rawSha256:m113Sha(nativeBytes),encoding:'gzip',format:'rgba8-srgb',frameReadyAt:command.frameReadyAt};
        bytes=encodeM113AndroidRgba(nativeBytes);file=join(output,'android-'+name+'.png');await writeFile(file,bytes);
    } return { startedAt, completedAt: Date.now(), file, sha256: m113Sha(bytes), pixels: inspectM113Png(bytes), ...(raw?{raw}:{}) }; };
    const sample = async (platform: Platform) => { const attrs = await hierarchy(platform); return { at: Date.now(), observation: readM113Observation(attrs), attrs }; };
    const plateau = async (platform: Platform, expected: (o: MotionObservation) => boolean) => { let samples: Awaited<ReturnType<typeof sample>>[] = []; const start = Date.now(); while (Date.now() - start < 30000) {
        const next = await sample(platform);
        if (expected(next.observation)) {
            if (samples.length && JSON.stringify(samples[0]!.observation) !== JSON.stringify(next.observation))
                samples = [];
            samples.push(next);
            if (samples.length === 3) {
                assertM113Plateau(samples);
                return samples;
            }
        }
        else
            samples = [];
        await Bun.sleep(100);
    } throw Error(platform + ' endpoint plateau not observed'); };
    const awaitNativeReady=async(platform:Platform)=>{const start=Date.now();let overlays=0;while(Date.now()-start<45000){const attrs=await hierarchy(platform);if(attrs.some(a=>Object.values(a).some(v=>v.startsWith('M113:')))){readM113Observation(attrs);return}const action=m113LaunchOverlayAction(attrs);if(action&&overlays<2){const point=nativeActionPoint(action);if(platform==='ios')await flow([`tapOn:\n    point: "${point.x},${point.y}"\n    waitToSettleTimeoutMs: 0`],'owned-launch-overlay');else await adb(['shell','input','tap',String(point.x),String(point.y)],'owned-launch-overlay');overlays++}await Bun.sleep(100)}await capture(platform,'launch-not-ready');throw Error(platform+' never exposed M113 after bounded owned launch readiness')};
    const terminal = (o: MotionObservation, card: 'a' | 'b', target: string, mode?: string, reason?: string) => o.state.terminals.some(t => t.card === card && t.result.target === target && (!mode || t.result.mode === mode) && (!reason || t.result.reason === reason));
    const assertInputs = async () => { await verifyM113InputFiles(consumer, host.nativeInputs); assertM113ArtifactIdentity(host.artifact.sha256, m113Sha(await readFile(host.artifact.tarball))); for (const f of host.artifactHashes)
        ensure(m113Sha(await readFile(join(consumer, 'node_modules/@opsydyn/crumbs-css', f.path))) === f.sha256, 'Installed bytes changed: ' + f.path); assertM113SourceStable(source.digest, (await m113SourceIdentity()).digest); ensure(m113Sha(await readFile(hostPath)) === m113Sha(hostBytes) && m113Sha(await readFile(ownerPath)) === m113Sha(ownerBytes), 'Receipt/ownership changed'); };
    const iosInfo = async () => { const all = JSON.parse(String(await run(['xcrun', 'simctl', 'list', 'devices', 'available', '-j'], 'ios-list'))); const device: any = Object.values(all.devices).flat().find((d: any) => d.udid === ios); ensure(device?.name === 'Crumbs M11.3 Native Motion', 'Owned Simulator identity drift'); return device; };
    const assertDevices = async () => { ensure((await iosInfo()).state === 'Booted', 'Owned Simulator stopped'); assertM113DeviceIdentity(owner.devices.android.avdName, parseAvdName(String(await adb(['emu', 'avd', 'name'], 'avd-name')))); ensure(await adb(['shell', 'getprop', 'ro.kernel.qemu'], 'qemu') === '1', 'Not an emulator'); };
    const settings = async () => { await simctl(['launch', 'com.apple.Preferences'], 'settings-launch'); const attrs = await hierarchy('ios'); const control = attrs.find(a => a['resource-id'] === 'REDUCE_MOTION' && (a.value === '0' || a.value === '1')); ensure(control, 'Prepare the owned iOS Settings Motion page before qualification'); nativeActionPoint(control); return control; };
    const setIosPreference = async (value: string) => { const control = await settings(); if (control.value !== value) {
        const p = nativeReduceMotionSwitchPoint(control);
        await flow([`tapOn:\n    point: "${p.x},${p.y}"\n    waitToSettleTimeoutMs: 0`], 'reduce-motion-toggle', 'com.apple.Preferences');
    } const after = await hierarchy('ios'); ensure(after.some(a => a['resource-id'] === 'REDUCE_MOTION' && a.value === value), 'Reduce Motion switch did not change'); await simctl(['launch', 'host.exp.Exponent'], 'return-expo'); };
    try {
        await assertInputs();
        await assertInputTools();
        const toolHashes=await Promise.all(['adb','emulator','maestro','idb','idbCompanion'].map(async name=>({name,path:owner.tools[name],sha256:m113Sha(await readFile(owner.tools[name]))})));
        receipt.toolHashes=toolHashes;
        receipt.toolVersions={adb:await run([owner.tools.adb,'--version'],'adb-version'),java:await run([join(owner.tools.javaHome,'bin/java'),'--version'],'java-version')};
        const installed = await verifyInstalledArtifact(consumer, host.artifact);
        assertM113InstalledRoot(await realpath(consumer), await realpath(installed.packageRoot));
        if ((await iosInfo()).state !== 'Booted') {
            await simctl(['boot'], 'ios-boot');
            iosBootedHere = true;
            await simctl(['bootstatus', '-b'], 'ios-bootstatus');
        }
        iosSwitch = await settings();
        iosPreference = iosSwitch.value;
        ensure(iosPreference === '0' || iosPreference === '1', 'Unknown original iOS setting');
        await writeFile(join(output, 'ios-setting-original.json'), JSON.stringify(iosSwitch, null, 2) + '\n');
        const available = String(await run([owner.tools.adb, 'devices', '-l'], 'adb-devices'));
        if (!available.split('\n').some(line => line.startsWith(android + ' ') || line.startsWith(android + '\t'))) {
            const match = /^emulator-(\d+)$/.exec(android);
            ensure(match, 'Invalid serial');
            for (const p of [Number(match[1]), Number(match[1]) + 1]) {
                const socket = Bun.listen({ hostname: '127.0.0.1', port: p, socket: { data() { } } });
                socket.stop(true);
            }
            emuFd = openSync(join(output, 'emulator.log'), 'wx');
            const command = [owner.tools.emulator, '-avd', owner.devices.android.avdName, '-port', match[1]!, '-no-snapshot-save', '-no-audio', '-no-boot-anim', '-memory', '2048', '-cores', '2', '-gpu', owner.environment.androidGpu];
            emulator = Bun.spawn(command, { env, stdout: emuFd, stderr: emuFd });
            receipt.emulatorLaunch = { command, pid: emulator.pid };
            let boot = false;
            for (let n = 0; n < 180; n++) {
                await Bun.sleep(1000);
                const p = Bun.spawnSync([owner.tools.adb, '-s', android, 'shell', 'getprop', 'sys.boot_completed'], { env });
                if (p.exitCode === 0 && p.stdout.toString().trim() === '1') {
                    boot = true;
                    break;
                }
            }
            ensure(boot, 'Owned emulator boot timeout');
        }
        await assertDevices();
        androidPreference = String(await adb(['shell', 'settings', 'get', 'global', 'transition_animation_scale'], 'android-setting-original'));
        receipt.originalPreferences = { ios: iosPreference, android: androidPreference };
        ensure(m113Sha(await readFile(owner.assets.androidApk)) === owner.assets.androidApkSha256, 'Expo APK changed');
        await simctl(['install', owner.assets.iosApp], 'ios-install');
        await adb(['install', '-r', owner.assets.androidApk], 'android-install');
        const iosApp = String(await simctl(['get_app_container', 'host.exp.Exponent', 'app'], 'ios-app')), iosVersion = String(await run(['/usr/libexec/PlistBuddy', '-c', 'Print :CFBundleShortVersionString', join(iosApp, 'Info.plist')], 'ios-version')), executable = String(await run(['/usr/libexec/PlistBuddy', '-c', 'Print :CFBundleExecutable', join(iosApp, 'Info.plist')], 'ios-executable'));
        ensure(iosVersion === '56.0.4', 'Wrong iOS Expo Go');
        const iosHash = m113Sha(await readFile(join(iosApp, executable))), apk = String(await adb(['shell', 'pm', 'path', 'host.exp.exponent'], 'android-apk')).replace(/^package:/, '').split('\n')[0]!, androidHash = await adb(['shell', 'sha256sum', apk], 'android-hash');
        ensure(String(await adb(['shell', 'dumpsys', 'package', 'host.exp.exponent'], 'android-version')).includes('versionName=56.0.4'), 'Wrong Android Expo Go');
        receipt.harness = { iosApp, iosVersion, iosHash, apk, androidHash };
        receipt.operatingSystems={ios:await iosInfo(),android:await adb(['shell','getprop','ro.build.fingerprint'],'android-fingerprint')};
        const portCheck = Bun.listen({ hostname: '127.0.0.1', port, socket: { data() { } } });
        portCheck.stop(true);
        metroFd = openSync(join(output, 'metro.log'), 'wx');
        metro = Bun.spawn([join(consumer, 'node_modules/.bin/expo'), 'start', '--localhost', '--port', String(port)], { cwd: consumer, env, stdout: metroFd, stderr: metroFd });
        receipt.metro = { port, pid: metro.pid };
        const bundles: any[] = [];
        const fetchBundle = async (platform: Platform, archive: boolean) => { let manifest: any; for (let n = 0; n < 180; n++) {
            try {
                const r = await fetch(`http://127.0.0.1:${port}/`, { headers: { 'expo-platform': platform, accept: 'application/expo+json' } });
                if (r.ok) {
                    manifest = await r.json();
                    if (manifest.launchAsset)
                        break;
                }
            }
            catch { }
            await Bun.sleep(1000);
        } ensure(manifest?.launchAsset, 'Missing Metro manifest'); const url = new URL(manifest.launchAsset.url); ensure(url.hostname === '127.0.0.1' && url.port === String(port) && url.searchParams.get('transform.engine') === 'hermes', 'Wrong endpoint/engine'); const r = await fetch(url); ensure(r.ok, 'Bundle failed'); const bytes = Buffer.from(await r.arrayBuffer()), mapUrl = new URL(url); mapUrl.pathname = mapUrl.pathname.replace(/\.bundle$/, '.map'); const mr = await fetch(mapUrl); ensure(mr.ok, 'Map failed'); const mapBytes = Buffer.from(await mr.arrayBuffer()), map = JSON.parse(mapBytes.toString()); assertM113RealNativeMap(map); const i = map.sources.findIndex((s: string) => /node_modules\/@opsydyn\/crumbs-css\/dist\/theme-motion-native\.(mjs|cjs)$/.test(s)); ensure(i >= 0 && !map.sources.some((s: string) => s.includes(repository)), 'Wrong installed source map'); const entry = map.sources[i].split('/dist/')[1]; ensure(m113Sha(map.sourcesContent[i]) === m113Sha(await readFile(join(installed.packageRoot, 'dist', entry))), 'Entry differs from installed artifact'); const record = { platform, url: url.href, sha256: m113Sha(bytes), mapSha256: m113Sha(mapBytes), entry, entrySha256: m113Sha(map.sourcesContent[i]), engine: 'hermes' }; if (archive) {
            await writeFile(join(output, platform + '-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
            for (const [kind, data] of [['bundle', bytes], ['map', mapBytes]] as const)
                await writeFile(join(output, platform + '-served.' + kind + '.gz'), gzipSync(data));
        } return record; };
        for (const platform of ['ios', 'android'] as const)
            bundles.push(await fetchBundle(platform, true));
        receipt.bundles = bundles;
        ensure(!String(await adb(['reverse', '--list'], 'reverse-preflight')).includes(`tcp:${port}`), 'Reverse mapping collision');
        await adb(['reverse', `tcp:${port}`, `tcp:${port}`], 'reverse-create');
        mapping = true;
        await setIosPreference('0');
        await adb(['shell', 'settings', 'put', 'global', 'transition_animation_scale', '1'], 'android-full');
        receipt.launchStartedAt=Date.now();
        await simctl(['openurl', `exp://127.0.0.1:${port}`], 'ios-launch');
        const androidLaunch = String(await adb(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `exp://127.0.0.1:${port}`, 'host.exp.exponent'], 'android-launch'));
        // Retry only the observed cold launcher redirect; restarting an active experience can strand its splash.
        if(m113AndroidLaunchNeedsRedirect(androidLaunch)) await adb(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `exp://127.0.0.1:${port}`, 'host.exp.exponent'], 'android-launch-experience');
        for (const platform of ['ios', 'android'] as const) {
            const phases: any[] = [], origin: Partial<Record<'a' | 'b', PixelMarker>> = {};
            receipt[platform + 'Phases'] = phases;
            const endpoint = async (name: string, expected: (o: MotionObservation) => boolean, a?: 'resting' | 'selected', b?: 'resting' | 'selected') => { const samples = await plateau(platform, expected), image = await capture(platform, name); if (a)
                assertM113Marker(image.pixels.a, origin.a!, a); if (b)
                assertM113Marker(image.pixels.b, origin.b!, b); phases.push({ name, status: 'passed', samples: samples.map(({ at, observation }) => ({ at, observation })), image }); return samples.at(-1)!; };
            await awaitNativeReady(platform);
            const initialSamples = await plateau(platform, o => o.sourceMode === 'native' && o.nativeMotion === 'full' && o.state.aMounted && o.state.requested.a === 'resting' && o.state.requested.b === 'resting');
            let stable = initialSamples.at(-1)!;
        const initial = await capture(platform, 'initial');
            ensure(initial.pixels.a && initial.pixels.b, 'Both initial markers required');
            origin.a = initial.pixels.a;
            origin.b = initial.pixels.b;
            assertM113Marker(initial.pixels.a, origin.a, 'resting');
            assertM113Marker(initial.pixels.b, origin.b, 'resting');
            phases.push({ name: 'initial', status: 'passed', image: initial, samples: initialSamples,observedLaunchToInitialMs:initial.completedAt-receipt.launchStartedAt,initialisationClass:'instrumented development launch-to-observation, includes sequential qualification/tool overhead' });
            const moving = async (name: string, from: PixelMarker, to: 'resting' | 'selected', card: 'a' | 'b' = 'a',afterFrame?:()=>Promise<void>) => { await Bun.sleep(1000); const image = await capture(platform, name,afterFrame), m = image.pixels[card]; ensure(m, 'Moving marker absent'); const dx = (m.x - origin[card]!.x) / origin[card]!.scale; ensure(dx > 2 && dx < 110 && m.opacity > .61 && m.opacity < .99, 'Missed actual in-flight displacement/opacity window'); ensure(Math.abs(m.x - from.x) > origin[card]!.scale, 'No actual movement'); phases.push({ name, status: 'passed', image, target: to }); return m; };
            await tap(platform, 'motion-a-select', stable.attrs);
            await moving('a-in-flight', origin.a, 'selected');
            stable = await endpoint('a-selected', o => terminal(o, 'a', 'selected', 'animated'), 'selected', 'resting');
            if(platform==='ios'){const images=await iosCaptureSequence('a-replacement-sequence',[iosTapStep('motion-a-rest',stable.attrs),...iosFrameSteps('a-rest-in-flight'),iosTapStep('motion-a-select',stable.attrs),...iosFrameSteps('a-replaced-in-flight')],['a-rest-in-flight','a-replaced-in-flight']);for(const image of images){const m=image.pixels.a;ensure(m&&m.x>origin.a.x+2*origin.a.scale&&m.x<origin.a.x+110*origin.a.scale&&m.opacity>.61&&m.opacity<.99,'Missed replacement intermediate');phases.push({name:'replacement-sequence-frame',status:'passed',image})}}
            else {await tap(platform,'motion-a-rest',stable.attrs);await moving('a-rest-in-flight',origin.a,'resting','a',()=>tap(platform,'motion-a-select')); await moving('a-replaced-in-flight',origin.a,'selected')}
            stable = await endpoint('a-replacement', o => terminal(o, 'a', 'resting', undefined, 'superseded') && terminal(o, 'a', 'selected', 'animated'), 'selected', 'resting');
            await tap(platform, 'motion-b-select', stable.attrs);
            await moving('b-in-flight', origin.b, 'selected', 'b');
            stable = await endpoint('b-selected', o => terminal(o, 'b', 'selected', 'animated'), 'selected', 'selected');
            let preCancel:PixelMarker;
            if(platform==='ios'){const images=await iosCaptureSequence('a-cancel-sequence',[iosTapStep('motion-a-rest',stable.attrs),...iosFrameSteps('a-pre-cancel'),iosTapStep('motion-a-cancel',stable.attrs),{kind:'capture',name:'a-cancel-held'}],['a-pre-cancel','a-cancel-held']);preCancel=images[0]!.pixels.a!;for(const image of images){const m=image.pixels.a;ensure(m&&m.x>origin.a.x+2*origin.a.scale&&m.x<origin.a.x+110*origin.a.scale,'Missed cancellation intermediate');phases.push({name:'cancel-sequence-frame',status:'passed',image})}}
            else {await tap(platform,'motion-a-rest',stable.attrs);preCancel=await moving('a-pre-cancel',origin.a,'resting','a',()=>tap(platform,'motion-a-cancel'))}
            stable = await endpoint('a-cancelled', o => terminal(o, 'a', 'resting', undefined, 'cancelled'), undefined, 'selected');
            const held = phases.at(-1).image.pixels.a as PixelMarker;
            ensure((held.x - origin.a.x) / origin.a.scale > 2 && (held.x - origin.a.x) / origin.a.scale < 110, 'Cancelled frame is not intermediate');
            await Bun.sleep(250);
            const heldAgain = await capture(platform, 'a-cancel-held');
            ensure(heldAgain.pixels.a && Math.abs(heldAgain.pixels.a.x - held.x) <= 1, 'Cancelled presentation moved');
            phases.push({ name: 'cancel-held', status: 'passed', preCancel, heldAgain });
            if(platform==='ios'){const images=await iosCaptureSequence('a-resume-stale-sequence',[iosTapStep('motion-a-select',stable.attrs),...iosFrameSteps('a-resumed-from-presentation'),iosTapStep('motion-a-stale-cancel',stable.attrs),...iosFrameSteps('replacement-still-in-flight-after-stale-cancel')],['a-resumed-from-presentation','replacement-still-in-flight-after-stale-cancel']);for(const [index,image] of images.entries()){const m=image.pixels.a;ensure(m&&m.x>held.x+origin.a.scale&&m.x<=origin.a.x+113.5*origin.a.scale&&(index>0||m.x<origin.a.x+110*origin.a.scale),'Missed resumed presentation');phases.push({name:index===0?'resumed-in-flight':'rendered-after-stale-cancel',status:'passed',image})}}

            else {await tap(platform,'motion-a-select',stable.attrs);await moving('a-resumed-from-presentation',held,'selected','a',()=>tap(platform,'motion-a-stale-cancel'));const image=await capture(platform,'rendered-after-stale-cancel'),m=image.pixels.a;ensure(m&&m.x>held.x+origin.a.scale&&m.x<=origin.a.x+113.5*origin.a.scale,'Stale-cancel presentation did not advance');phases.push({name:'rendered-after-stale-cancel',status:'passed',image})}
            stable = await endpoint('a-stale-cancel', o => o.state.staleCancelDuringPending===true&&terminal(o, 'a', 'selected', 'animated'), 'selected', 'selected');
            if(platform==='ios'){const images=await iosCaptureSequence('a-set-sequence',[iosTapStep('motion-a-rest',stable.attrs),...iosFrameSteps('a-before-set'),iosTapStep('motion-a-set',stable.attrs)],['a-before-set']);const image=images[0]!,m=image.pixels.a;ensure(m&&m.x>origin.a.x+2*origin.a.scale&&m.x<origin.a.x+110*origin.a.scale,'Missed set intermediate');phases.push({name:'before-set',status:'passed',image})}
            else {await tap(platform,'motion-a-rest',stable.attrs);await moving('a-before-set',origin.a,'resting','a',()=>tap(platform,'motion-a-set'))}
            stable = await endpoint('a-set', o => terminal(o, 'a', 'resting', undefined, 'set') && o.state.requested.a === 'selected', 'selected', 'selected');
            await tap(platform, 'motion-duration-zero', stable.attrs);
            await tap(platform, 'motion-a-rest');
            stable = await endpoint('zero-duration', o => o.state.duration === 'zero' && terminal(o, 'a', 'resting', 'immediate'), 'resting', 'selected');
            await tap(platform, 'motion-duration-normal', stable.attrs);
            stable = (await plateau(platform, o => o.state.duration === 'normal')).at(-1)!;
            if(platform==='ios'){
                await tap(platform,'motion-a-select',stable.attrs);
                await moving('before-native-reduced',origin.a,'selected');
                await simctl(['launch','com.apple.Preferences'],'native-reduced-settings');
                await Bun.sleep(500);
                const point=nativeReduceMotionSwitchPoint(iosSwitch);
                await idb(['ui','tap',String(point.x),String(point.y),'--duration','0.1'],'native-reduced-toggle');
                await Bun.sleep(100);
                const settingsRows=JSON.parse(String(await idb(['ui','describe-all'],'native-reduced-value')));
                ensure(settingsRows.some((row:any)=>row.AXUniqueId==='REDUCE_MOTION'&&row.AXValue==='1'),'Native Reduce Motion did not actually change');
                await simctl(['launch','host.exp.Exponent'],'native-reduced-return');
                await Bun.sleep(500);
            }
            else {await tap(platform,'motion-a-select',stable.attrs);await moving('before-native-reduced',origin.a,'selected','a',async()=>{await adb(['shell','settings','put','global','transition_animation_scale','0'],'android-reduced')})}
            stable = await endpoint('native-reduced-mid-run', o => o.sourceMode === 'native' && o.nativeMotion === 'reduced' && o.effectiveMotion === 'reduced' && terminal(o, 'a', 'selected', 'immediate'), 'selected', 'selected');
            await tap(platform, 'motion-a-rest', stable.attrs);
            stable = await endpoint('future-reduced-command', o => o.nativeMotion === 'reduced' && terminal(o, 'a', 'resting', 'immediate'), 'resting', 'selected');
            if (platform === 'android')
                await adb(['shell', 'settings', 'put', 'global', 'transition_animation_scale', '1'], 'android-restore-full');
            else
                await setIosPreference('0');
            stable = await endpoint('full-restored-no-replay', o => o.nativeMotion === 'full' && o.effectiveMotion === 'full', 'resting', 'selected');
            if(platform==='ios'){const images=await iosCaptureSequence('unmount-running-sequence',[iosTapStep('motion-a-select',stable.attrs),...iosFrameSteps('before-unmount-running'),iosTapStep('motion-a-unmount',stable.attrs)],['before-unmount-running']);const image=images[0]!,m=image.pixels.a;ensure(m&&m.x>origin.a.x+2*origin.a.scale&&m.x<origin.a.x+110*origin.a.scale,'Missed unmount intermediate');phases.push({name:'before-unmount-running',status:'passed',image})}
            else {await tap(platform,'motion-a-select',stable.attrs);await moving('before-unmount-running',origin.a,'selected','a',()=>tap(platform,'motion-a-unmount'))}
            stable = await endpoint('unmount-running', o => !o.state.aMounted, undefined, undefined);
            ensure(!phases.at(-1).image.pixels.a, 'Unmounted marker remained');
            await tap(platform, 'motion-a-remount', stable.attrs);
            stable = await endpoint('remount-running', o => o.state.aMounted && o.state.aGeneration === 1, 'resting', 'selected');
            await tap(platform, 'motion-a-unmount-preparing', stable.attrs);
            stable = await endpoint('unmount-preparing', o => !o.state.aMounted, undefined, undefined);
            await tap(platform, 'motion-a-remount', stable.attrs);
            stable = await endpoint('remount-preparing', o => o.state.aMounted && o.state.aGeneration === 2, 'resting', 'selected');
            await Bun.sleep(5200);
            await endpoint('retired-callbacks', o => o.state.aGeneration === 2 && o.state.requested.a === 'resting', 'resting', 'selected');
            receipt[platform] = 'passed';
        }
        await assertInputs();
        await assertInputTools();
        await assertDevices();
        for(const tool of toolHashes)ensure(m113Sha(await readFile(tool.path))===tool.sha256,'Native tool identity changed');
        ensure(m113Sha(await readFile(join(iosApp, executable))) === iosHash && await adb(['shell', 'sha256sum', apk], 'android-final-hash') === androidHash, 'Native app identity changed');
        for (const old of bundles)
            ensure(JSON.stringify(await fetchBundle(old.platform, false)) === JSON.stringify(old), 'Served bundle/map changed');
        receipt.sourceAfter = await m113SourceIdentity();
    }
    catch (error) {
        failM113NativeQualification(receipt, error);
        throw error;
    }
    finally {
        const cleanup: any[] = [];
        const clean = async (name: string, f: () => Promise<unknown>) => { try {
            await f();
            cleanup.push({ name, status: 'passed' });
        }
        catch (e) {
            cleanup.push({ name, status: 'failed', error: String(e) });
            failM113NativeQualification(receipt, e);
        } };
        if (androidPreference !== undefined)
            await clean('android-preference', async () => { await adb(['shell', 'settings', androidPreference === 'null' ? 'delete' : 'put', 'global', 'transition_animation_scale', ...(androidPreference === 'null' ? [] : [androidPreference!])], 'android-setting-restore'); ensure(await adb(['shell', 'settings', 'get', 'global', 'transition_animation_scale'], 'android-restored') === androidPreference, 'Android preference restoration failed'); });
        if (iosPreference !== undefined)
            await clean('ios-preference', () => setIosPreference(iosPreference!));
        if (mapping)
            await clean('owned-reverse', () => adb(['reverse', '--remove', `tcp:${port}`], 'reverse-remove'));
        if (metro)
            await clean('owned-metro', async () => { metro!.kill(); await metro!.exited; });
        if (emulator)
            await clean('owned-emulator', async () => { emulator!.kill(); await emulator!.exited; });
        if (iosBootedHere)
            await clean('owned-simulator', () => simctl(['shutdown'], 'ios-shutdown'));
        if (metroFd !== undefined)
            closeSync(metroFd);
        if (emuFd !== undefined)
            closeSync(emuFd);
        receipt.cleanup = cleanup;
        receipt.completedAt = new Date().toISOString();
        receipt.acceptance = m113Acceptance({ host: host.host, ios: receipt.ios, android: receipt.android });
        await writeFile(join(output, 'qualification.json'), JSON.stringify(receipt, null, 2) + '\n');
        ensure(receipt.acceptance === 'passed', 'Native qualification failed: ' + receipt.error);
    }
    console.log(JSON.stringify({ output, acceptance: receipt.acceptance }));
}
if (import.meta.main)
    await qualify(process.argv.slice(2));
