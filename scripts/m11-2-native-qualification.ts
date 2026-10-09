import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, realpath } from 'node:fs/promises';
import { openSync, closeSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { m112SourceIdentity, assertM112ArtifactIdentity, assertM112InstalledRoot } from './m11-2-qualification';
import { collectToolchainIdentity, parseAvdName, deviceCommand } from './expo-consumer-native';
import { verifyInstalledArtifact } from './packed-distribution-contract';
const repository = resolve(import.meta.dir, '..'), sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const sdk = '/private/tmp/crumbs-m105-native/sdk', maestro = '/private/tmp/crumbs-m105-native/maestro/bin/maestro';
const nativeEnv = { ...process.env, PATH: join(sdk, 'platform-tools') + ':' + (process.env.PATH ?? ''), NODE_OPTIONS: ((process.env.NODE_OPTIONS ?? '') + ' --dns-result-order=ipv4first').trim(), JAVA_HOME: '/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home', ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
type Phase = {
    name: string;
    action?: string;
    width: number;
    mounted: boolean;
    nested: boolean;
    height: number;
    portal: string;
};
const phases: readonly Phase[] = [
    { name: 'initial', width: 176, mounted: true, nested: false, height: 120, portal: 'closed' },
    { name: 'same-bucket', action: 'same-bucket', width: 200, mounted: true, nested: false, height: 120, portal: 'closed' },
    { name: 'wide', action: 'wide', width: 288, mounted: true, nested: false, height: 120, portal: 'closed' },
    { name: 'boundary', action: 'boundary', width: 240, mounted: true, nested: false, height: 120, portal: 'closed' },
    { name: 'narrow', action: 'narrow', width: 176, mounted: true, nested: false, height: 120, portal: 'closed' },
    { name: 'unmount', action: 'unmount', width: 176, mounted: false, nested: false, height: 120, portal: 'closed' },
    { name: 'remount', action: 'remount', width: 176, mounted: true, nested: false, height: 120, portal: 'closed' },
    { name: 'nested-wide', action: 'wide', width: 288, mounted: true, nested: false, height: 120, portal: 'closed' },
    { name: 'nested', action: 'toggle-nested', width: 288, mounted: true, nested: true, height: 120, portal: 'closed' },
    { name: 'height-tall', action: 'height-tall', width: 288, mounted: true, nested: true, height: 180, portal: 'closed' },
    { name: 'height-short', action: 'height-short', width: 288, mounted: true, nested: true, height: 120, portal: 'closed' },
    { name: 'source-portal', action: 'open-source-portal', width: 288, mounted: true, nested: true, height: 120, portal: 'source' },
    { name: 'destination-portal', action: 'open-destination-portal', width: 288, mounted: true, nested: true, height: 120, portal: 'destination' },
    { name: 'close-portal', action: 'close-portal', width: 288, mounted: true, nested: true, height: 120, portal: 'closed' },
];
type Telemetry = {
    id?: string;
    bucket?: string;
    direction?: string;
    measured?: {
        width?: number;
        height?: number;
    };
    events?: number;
    commits?: number;
    chips?: {
        one?: {
            x: number;
            y: number;
            width?: number;
            height?: number;
        };
        two?: {
            x: number;
            y: number;
            width?: number;
            height?: number;
        };
    };
    region?: string;
};
type Observations = {
    state: {
        a: {
            mounted: boolean;
            width: number;
            key: number;
        };
        nested: boolean;
        height: number;
        portal: string;
    };
    telemetry: Record<string, Telemetry>;
};
export function assertM112NativeBinding(host: {
    sourceBefore: {
        digest: string;
    };
    artifact: {
        sha256: string;
    };
    consumerRoot: string;
    host: string;
}, source: string, artifact: string, consumer: string) { if (host.host !== 'passed' || host.sourceBefore.digest !== source || host.artifact.sha256 !== artifact || resolve(host.consumerRoot) !== resolve(consumer))
    throw Error('Native source/artifact/consumer binding mismatch'); }
export function failM112NativeQualification(receipt: Record<string, unknown>, error: unknown): void {
    // Successful phase prefixes remain diagnostic evidence, never final acceptance.
    receipt.error = String(error);
    receipt.ios = 'failed';
    receipt.android = 'failed';
}
export function assertM112DeviceIdentity(expected: string, actual: string) { if (expected !== actual)
    throw Error('Device ownership identity changed'); }
function approximate(want: number, actual: unknown) { if (typeof actual !== 'number' || !Number.isFinite(actual) || Math.abs(want - actual) > .5)
    throw Error(`Native measurement ${String(actual)} differs from ${want}`); }
function card(data: Telemetry | undefined, width: number) { if (!data)
    throw Error('Missing native card observation'); const bucket = width >= 240 ? 'wide' : 'narrow', direction = bucket === 'wide' ? 'row' : 'column'; if (data.bucket !== bucket || data.direction !== direction)
    throw Error('Wrong native selection'); approximate(width, data.measured?.width); const a = data.chips?.one, b = data.chips?.two; if (!a || !b || (direction === 'row' ? !(b.x > a.x && b.y === a.y) : !(b.y > a.y && b.x === a.x)))
    throw Error('Wrong rendered chip geometry'); }
export function assertM112PhaseObservations(name: string, input: unknown) { const want = phases.find(p => p.name === name); if (!want)
    throw Error('Unknown native phase'); const o = input as Observations; if (!o?.state?.a || !o.telemetry)
    throw Error('Missing native observations'); if (o.state.a.width !== want.width || o.state.a.mounted !== want.mounted || o.state.nested !== want.nested || o.state.height !== want.height || o.state.portal !== want.portal)
    throw Error('Native phase state differs'); if (name === 'remount' && o.state.a.key < 1)
    throw Error('Owner was not keyed afresh'); card(o.telemetry.B, 288); if (want.mounted)
    card(o.telemetry.A, want.width);
else if (o.telemetry.A)
    throw Error('Retained unmounted A observations'); const h = o.telemetry.height; if (!h || h.bucket !== (want.height >= 160 ? 'tall' : 'short'))
    throw Error('Wrong height selection'); approximate(want.height, h.measured?.height); if (want.nested) {
    card(o.telemetry['same-inner'], 96);
    const different = o.telemetry['different-inner'];
    if (different?.bucket !== (want.width >= 240 ? 'wide' : 'narrow') || different.region !== 'narrow')
        throw Error('Wrong different-name owner lookup');
} if (want.portal === 'source') {
    const bridge = o.telemetry['source-portal'];
    if (bridge?.bucket !== 'wide' || bridge.direction !== 'row')
        throw Error('Wrong source bridge');
} if (want.portal === 'destination')
    card(o.telemetry.destination, 96); }
function hierarchyAttributes(tree: unknown): Record<string, string>[] { const out: Record<string, string>[] = []; function visit(value: unknown) { if (!value || typeof value !== 'object')
    return; const x = value as {
    attributes?: Record<string, string>;
    children?: unknown[];
}; if (x.attributes)
    out.push(x.attributes); for (const child of x.children ?? [])
    visit(child); } visit(tree); return out; }
export function m112NativeXmlAttributes(xml: string): Record<string, string>[] {
    const entities: Record<string, string> = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' };
    // UIAutomator may use either XML quote form; JSON quotes and `>` stay inside the attribute.
    return [...xml.matchAll(/<node\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g)].map(node =>
        Object.fromEntries([...node[1]!.matchAll(/([\w:-]+)=(["'])(.*?)\2/gs)].map(attribute =>
            [attribute[1]!, attribute[3]!.replace(/&(quot|apos|amp|lt|gt);/g, (_, key: string) => entities[key]!)])));
}
export function readM112NativeObservations(attrs: Record<string, string>[]): Observations { for (const node of attrs)
    for (const text of Object.values(node))
        if (text.startsWith('M112All:')) {
            const payload=text.slice('M112All:'.length);
            // Some capture transports expose one escaped JSON-string layer.
            // Decode that single JSON-string transport layer, never repair JSON fields.
            const json=payload.startsWith('{\\\"') ? JSON.parse('\"'+payload+'\"') : payload;
            return JSON.parse(json) as Observations;
        }
    throw Error('Missing native aggregate telemetry'); }
export async function verifyM112NativeInputs(consumer: string, files: readonly {path:string;sha256:string}[], styles: {native:string;web:string}) {
    const inputs = [...files.map(file => ({...file, deliveryPath: file.path === 'src/container-panel.css.ts' ? 'authoring/container-panel.css.ts' : file.path})),
        {path:'src/container-panel.css.native.js',deliveryPath:'src/container-panel.css.native.js',sha256:styles.native},
        {path:'src/container-panel.css.web.js',deliveryPath:'src/container-panel.css.web.js',sha256:styles.web}];
    for(const file of inputs) {
        const path = await realpath(join(consumer,file.deliveryPath)), root = await realpath(consumer);
        if(!path.startsWith(root+'/') || sha(await readFile(path)) !== file.sha256) throw Error('Native input changed: '+file.path);
    }
    return inputs;
}
export function assertM112NativePlateau(samples: readonly {at:number;observations:unknown}[]) {
    if(samples.length !== 3 || samples.some(sample=>!Number.isFinite(sample.at)) || samples[2]!.at-samples[0]!.at>10000 ||
        samples.some((sample,index)=>index>0 && sample.at-samples[index-1]!.at<100) ||
        samples.some(sample=>JSON.stringify(sample.observations)!==JSON.stringify(samples[0]!.observations)))
        throw Error('Native plateau requires three equal samples, at least 100 ms apart, within 10 s');
}
async function readMaestroSamples(directory:string) {
    const logs:string[]=[];
    async function visit(path:string) { for(const entry of await readdir(path,{withFileTypes:true})) {
        const child=join(path,entry.name); if(entry.isDirectory()) await visit(child); else if(entry.name==='maestro.log') logs.push(await readFile(child,'utf8'));
    } }
    await visit(directory);
    const records=new Map<number,{at:number;observations:Observations}>();
    for(const log of logs) for(const match of log.matchAll(/JsConsole: M112Sample:(\{[^\n]+\})/g)) {
        const row=JSON.parse(match[1]!); const observations=readM112NativeObservations([{text:row.text}]);
        records.set(row.at,{at:row.at,observations});
    }
    return [...records.values()].sort((a,b)=>a.at-b.at);
}
export function m112NativeActionPoint(target: {enabled?:string;bounds?:string}|undefined) {
    const b=target?.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/);
    if(!b || target?.enabled !== 'true' || Number(b[3])<=Number(b[1]) || Number(b[4])<=Number(b[2])) throw Error('Action has no observed enabled bounds');
    return {x:Math.floor(Number(b[1])+(Number(b[3])-Number(b[1]))/4),y:Math.floor((Number(b[2])+Number(b[4]))/2)};
}
export function m112AndroidLaunchStage(output: string): 'launcher' | 'experience' {
    const activity = /^Activity: (.+)$/m.exec(output)?.[1]?.trim();
    if (!/^Status: ok$/m.test(output) || !activity) throw Error('Expo Go experience launch failed');
    if (activity === 'host.exp.exponent/.LauncherActivity') return 'launcher';
    if (activity === 'host.exp.exponent/.experience.ExperienceActivity') return 'experience';
    throw Error('Unexpected Expo Go experience activity: ' + activity);
}
export function m112AndroidScreenshotCommand(id: string) {
    return deviceCommand({platform:'android',id,ownershipRecordPath:''}, ['shell','screencap','-p']);
}
export function m112NativeScrollPoints(target: {scrollable?:string;bounds?:string}|undefined) {
    const bounds=target?.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/);
    if(target?.scrollable !== 'true' || !bounds || Number(bounds[3])<=Number(bounds[1]) || Number(bounds[4])<=Number(bounds[2])) throw Error('No observed scrollable bounds');
    const left=Number(bounds[1]),top=Number(bounds[2]),width=Number(bounds[3])-left,height=Number(bounds[4])-top;
    return {start:{x:Math.floor(left+width/2),y:Math.floor(top+height*3/4)},end:{x:Math.floor(left+width/2),y:Math.floor(top+height/4)}};
}
async function qualify(args: string[]) {
    const flags = new Map<string, string>();
    for (let i = 0; i < args.length; i += 2) {
        if (!['--consumer-root', '--host-receipt', '--ios', '--android', '--port', '--output'].includes(args[i] ?? '') || !args[i + 1])
            throw Error('Invalid native qualifier arguments');
        flags.set(args[i]!, args[i + 1]!);
    }
    for (const key of ['--consumer-root', '--host-receipt', '--ios', '--android', '--port'])
        if (!flags.has(key))
            throw Error(`Missing ${key}`);
    const consumer = resolve(flags.get('--consumer-root')!), output = resolve(flags.get('--output') ?? join(repository, 'docs/evidence/2026-10-09-m11-2-container-conditions/native')), ios = flags.get('--ios')!, android = flags.get('--android')!, port = Number(flags.get('--port'));
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
        throw Error('Invalid Metro port');
    await mkdir(output, { recursive: true });
    if ((await readdir(output)).length)
        throw Error('Native output must be an empty owned attempt directory');
    const host = JSON.parse(await readFile(resolve(flags.get('--host-receipt')!), 'utf8')), source = await m112SourceIdentity(), artifact = host.artifact;
    assertM112NativeBinding(host, source.digest, sha(await readFile(artifact.tarball)), consumer);
    const owner = JSON.parse(await readFile(join(repository, 'docs/evidence/2026-10-09-m11-2-container-conditions/preflight.json'), 'utf8')).nativeOwnership;
    if (!owner)
        throw Error('Missing preflight ownership');
    assertM112DeviceIdentity(owner.ios.id, ios);
    assertM112DeviceIdentity(owner.android.serial, android);
    if (sha(await readFile(owner.priorRecord)) !== owner.priorRecordSha256)
        throw Error('Prior ownership changed');
    const compilation = JSON.parse(await readFile(join(resolve(flags.get('--host-receipt')!), '..', 'container-compilation.json'), 'utf8'));
    const inputBefore = await verifyM112NativeInputs(consumer, host.copiedFiles, compilation);
    const installed = await verifyInstalledArtifact(consumer, artifact);
    assertM112InstalledRoot(await realpath(consumer), await realpath(installed.packageRoot));
    const commands: {
        command: string[];
        exitCode: number;
        log: string;
    }[] = [];
    let metro: ReturnType<typeof Bun.spawn> | undefined, emulator: ReturnType<typeof Bun.spawn> | undefined, metroFd: number | undefined, emulatorFd: number | undefined, mapping = false;
    const run = async (command: string[], name: string) => { const p = Bun.spawn(command, { cwd: consumer, env: nativeEnv, stdout: 'pipe', stderr: 'pipe' }); const [stdout, stderr, exitCode] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]); const log = join(output, `${commands.length}-${name}.log`); await writeFile(log, stdout + stderr); commands.push({ command, exitCode, log }); if (exitCode)
        throw Error(`${name} failed: ${log}`); return stdout.trim(); };
    const device = (platform: 'ios' | 'android', command: string[], name: string) => run(deviceCommand({ platform, id: platform === 'ios' ? ios : android, ownershipRecordPath: '' }, command), name);
    const iosInfo = async () => { const listing = JSON.parse(await run(['xcrun', 'simctl', 'list', 'devices', 'available', '-j'], 'simulators')); const found = (Object.values(listing.devices).flat() as {
        udid: string;
        name: string;
        state: string;
    }[]).find(d => d.udid === ios); if (!found)
        throw Error('Owned Simulator missing'); assertM112DeviceIdentity(owner.ios.name, found.name); return found; };
    const assertDevices = async () => { if ((await iosInfo()).state !== 'Booted')
        throw Error('Owned Simulator stopped'); if (await device('android', ['shell', 'getprop', 'ro.kernel.qemu'], 'qemu') !== '1')
        throw Error('Not an emulator'); assertM112DeviceIdentity(owner.android.avdName, parseAvdName(await device('android', ['emu', 'avd', 'name'], 'avd'))); };
    const receipt: Record<string, unknown> = { schema: 'crumbs.m11.2.native-qualification.v1', sourceBefore: source, artifact, consumerRoot: consumer, hostReceipt: resolve(flags.get('--host-receipt')!), hostReceiptSha256: sha(await readFile(resolve(flags.get('--host-receipt')!))), ownership: owner, commands, ios: 'not-run', android: 'not-run', inputBefore, nativeEnvironment: {adbPath:join(sdk,'platform-tools'),nodeOptions:nativeEnv.NODE_OPTIONS,requestedEmulatorGpu:'host'}, evidenceClass: 'development Expo Go / Hermes functional; physical and screen-reader deferred' };
    await writeFile(join(output, 'ownership.json'), JSON.stringify(receipt, null, 2) + '\n');
    try {
        receipt.toolchain = await collectToolchainIdentity();
        const available = await run([join(sdk, 'platform-tools/adb'), 'devices', '-l'], 'adb-devices');
        if (!available.split('\n').some(line => line.startsWith(android + '\t') || line.startsWith(android + ' '))) {
            const match = /^emulator-(\d+)$/.exec(android);
            if (!match)
                throw Error('Invalid emulator serial');
            emulatorFd = openSync(join(output, 'emulator.log'), 'wx');
            const command = [join(sdk, 'emulator/emulator'), '-avd', owner.android.avdName, '-port', match[1]!, '-no-snapshot-save', '-no-audio', '-no-boot-anim', '-memory', '2048', '-cores', '2', '-gpu', 'host'];
            emulator = Bun.spawn(command, { env: { ...nativeEnv, ANDROID_AVD_HOME: owner.android.avdHome }, stdout: emulatorFd, stderr: emulatorFd });
            receipt.emulatorLaunch = { command, pid: emulator.pid, avdHome: owner.android.avdHome, ownedProcess: true };
            for (let n = 0; n < 120; n++) {
                await Bun.sleep(1000);
                const p = Bun.spawnSync(deviceCommand({ platform: 'android', id: android, ownershipRecordPath: '' }, ['shell', 'getprop', 'sys.boot_completed']), { env: nativeEnv });
                if (p.exitCode === 0 && p.stdout.toString().trim() === '1')
                    break;
                if (n === 119)
                    throw Error('Owned emulator did not boot');
            }
        }
        if ((await iosInfo()).state !== 'Booted') {
            await run(['xcrun', 'simctl', 'boot', ios], 'boot-ios');
            await run(['xcrun', 'simctl', 'bootstatus', ios, '-b'], 'wait-ios');
        }
        await assertDevices();
        const iosApp = await device('ios', ['get_app_container', 'host.exp.Exponent', 'app'], 'ios-app');
        const plist = join(iosApp, 'Info.plist'), iosVersion = await run(['/usr/libexec/PlistBuddy', '-c', 'Print :CFBundleShortVersionString', plist], 'ios-version'), executable = await run(['/usr/libexec/PlistBuddy', '-c', 'Print :CFBundleExecutable', plist], 'ios-executable');
        if (iosVersion !== '56.0.4')
            throw Error('Mismatched Expo Go iOS version');
        const iosHash = sha(await readFile(join(iosApp, executable)));
        const apk = (await device('android', ['shell', 'pm', 'path', 'host.exp.exponent'], 'android-app')).replace(/^package:/, '').split('\n')[0]!;
        const androidHash = await device('android', ['shell', 'sha256sum', apk], 'android-app-hash'), androidPackage = await device('android', ['shell', 'dumpsys', 'package', 'host.exp.exponent'], 'android-package');
        if (!androidPackage.includes('versionName=56.0.4'))
            throw Error('Mismatched Expo Go Android version');
        receipt.harness = { iosVersion, iosHash, androidHash, iosApp, apk };
        receipt.operatingSystems = { ios: (await iosInfo()), android: await device('android', ['shell', 'getprop', 'ro.build.fingerprint'], 'android-os') };
        const assertHarness = async () => { await verifyM112NativeInputs(consumer, host.copiedFiles, compilation); await assertDevices(); if (sha(await readFile(join(iosApp, executable))) !== iosHash || await device('android', ['shell', 'sha256sum', apk], 'android-recheck') !== androidHash)
            throw Error('Native harness changed'); };
        try {
            const probe = Bun.listen({ hostname: '127.0.0.1', port, socket: { data() { } } });
            probe.stop(true);
        }
        catch {
            throw Error('Metro port is occupied');
        }
        metroFd = openSync(join(output, 'metro.log'), 'wx');
        metro = Bun.spawn([join(consumer, 'node_modules/.bin/expo'), 'start', '--localhost', '--port', String(port)], { cwd: consumer, env: { ...nativeEnv, CI: '1', EXPO_NO_METRO_WORKSPACE_ROOT: '1' }, stdout: metroFd, stderr: metroFd });
        const bundles = [];
        for (const platform of ['ios', 'android']) {
            let manifest: {
                launchAsset: {
                    url: string;
                };
                runtimeVersion?: string;
            } | undefined;
            for (let n = 0; n < 120; n++) {
                try {
                    const res = await fetch(`http://127.0.0.1:${port}/`, { headers: { 'expo-platform': platform, accept: 'application/expo+json' } });
                    if (res.ok) {
                        manifest = await res.json() as typeof manifest;
                        if (manifest?.launchAsset)
                            break;
                    }
                }
                catch { }
                await Bun.sleep(1000);
            }
            if (!manifest)
                throw Error('Metro manifest unavailable');
            const url = new URL(manifest.launchAsset.url);
            if (url.hostname !== '127.0.0.1' || url.port !== String(port) || url.searchParams.get('transform.engine') !== 'hermes')
                throw Error('Wrong served endpoint/engine');
            const res = await fetch(url);
            if (!res.ok)
                throw Error('Served bundle failed');
            const bytes = Buffer.from(await res.arrayBuffer());
            if (!bytes.toString().includes('crumbs.css.container-definition'))
                throw Error('Container runtime absent');
            const mapUrl = new URL(url);
            mapUrl.pathname = mapUrl.pathname.replace(/\.bundle$/, '.map');
            const mapResponse = await fetch(mapUrl);
            if (!mapResponse.ok)
                throw Error('Served map failed');
            const mapBytes = Buffer.from(await mapResponse.arrayBuffer()), map = JSON.parse(mapBytes.toString()) as {
                sources: string[];
                sourcesContent: string[];
            };
            const index = map.sources.findIndex(s => s.includes('/node_modules/@opsydyn/crumbs-css/dist/theme-containers.mjs'));
            if (index < 0 || sha(map.sourcesContent[index]!) !== sha(await readFile(join(installed.packageRoot, 'dist/theme-containers.mjs'))) || map.sources.some(s => s.includes(repository)))
                throw Error('Served source map does not match installed artifact');
            for (const [name, data] of [['bundle', bytes], ['map', mapBytes]] as const)
                await writeFile(join(output, `${platform}-served.${name}.gz`), gzipSync(data));
            bundles.push({ platform, url: url.href, sha256: sha(bytes), mapSha256: sha(mapBytes), bundleGzipSha256: sha(gzipSync(bytes)), mapGzipSha256: sha(gzipSync(mapBytes)), entrySha256: sha(map.sourcesContent[index]!), engine: 'hermes' });
            await writeFile(join(output, `${platform}-manifest.json`), JSON.stringify(manifest, null, 2) + '\n');
        }
        receipt.bundles = bundles;
        const mappings = await device('android', ['reverse', '--list'], 'mapping-preflight');
        if (mappings.includes(`tcp:${port}`))
            throw Error('Mapping collision');
        await device('android', ['reverse', `tcp:${port}`, `tcp:${port}`], 'mapping-create');
        mapping = true;
        await device('ios', ['openurl', `exp://127.0.0.1:${port}`], 'launch-ios');
        const androidLaunch = ['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `exp://127.0.0.1:${port}`, 'host.exp.exponent'];
        let androidStage = m112AndroidLaunchStage(await device('android', androidLaunch, 'launch-android'));
        // This Expo Go version can complete its cold LauncherActivity before handling the URL.
        // Retry that recorded redirect once; every phase still requires actual native telemetry.
        if (androidStage === 'launcher') androidStage = m112AndroidLaunchStage(await device('android', androidLaunch, 'launch-android-experience'));
        if (androidStage !== 'experience') throw Error('Expo Go remained at its launcher');
        receipt.androidLaunchStage = androidStage;
        const captureScreenshot = async (platform:'ios'|'android', screenshot:string) => {
            if(platform === 'ios') await run(['xcrun','simctl','io',ios,'screenshot',screenshot],'ios-screenshot');
            else {
                const command=m112AndroidScreenshotCommand(android),child=Bun.spawn(command,{env:nativeEnv,stdout:'pipe',stderr:'pipe'});
                const [output,error,exitCode]=await Promise.all([new Response(child.stdout).arrayBuffer(),new Response(child.stderr).text(),child.exited]);
                const bytes=Buffer.from(output);
                if(exitCode || !bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw Error('Android screenshot failed: '+error);
                await writeFile(screenshot,bytes);
                commands.push({command,exitCode,log:screenshot});
            }
        };
        for (const platform of ['ios', 'android'] as const) {
            const records: Record<string,unknown>[] = [];
            receipt[`${platform}Phases`] = records;
            let previousAttributes: Record<string,string>[] | undefined;
            let bInvariant: string | undefined;
            const capture = async () => { if (platform === 'ios') {
                const raw = await run([maestro, '--device', ios, 'hierarchy', '--no-reinstall-driver'], 'ios-hierarchy');
                return { raw, attrs: hierarchyAttributes(JSON.parse(raw)) };
            } await device('android', ['shell', 'uiautomator', 'dump', '/sdcard/m112-ui.xml'], 'android-dump'); const raw = await device('android', ['shell', 'cat', '/sdcard/m112-ui.xml'], 'android-hierarchy'); return { raw, attrs: m112NativeXmlAttributes(raw) }; };
            for (const phase of phases) {
                await assertHarness();
                let actionEvidence: {selector:string;bounds:string;point:{x:number;y:number}} | undefined;
                if (phase.action) {
                    const attrs=previousAttributes ?? (await capture()).attrs;
                    const selector=`container-action-${phase.action}`;
                    const target=attrs.find(n=>n['resource-id']===selector || n['resource-id']?.endsWith(':id/'+selector));
                    const point=m112NativeActionPoint(target);
                    actionEvidence={selector,bounds:target!.bounds!,point};
                    if(platform==='android') await device('android',['shell','input','tap',String(point.x),String(point.y)],'android-observed-tap');
                }
                let retained: Awaited<ReturnType<typeof capture>> | undefined, selected: Observations | undefined;
                let last = '', stable = 0;
                const samples = [];
                if(platform === 'ios') {
                    const flow=join(output,`ios-${phase.name}.yaml`), debug=join(output,'maestro',phase.name);
                    await writeFile(join(output,'sample.js'), "console.log('M112Sample:'+JSON.stringify({at:Date.now(),text:maestro.copiedText}));var t=Date.now();while(Date.now()-t<100){}\n");
                    await writeFile(flow, 'appId: host.exp.Exponent\n---\n'+
                        (actionEvidence ? `- tapOn:\n    point: \"${actionEvidence.point.x},${actionEvidence.point.y}\"\n` : '')+
                        '- extendedWaitUntil:\n    visible:\n      id: container-all-telemetry\n    timeout: 10000\n- repeat:\n    times: 3\n    commands:\n      - copyTextFrom:\n          id: container-all-telemetry\n      - runScript: sample.js\n');
                    await run([maestro,'--device',ios,'test','--debug-output',debug,flow],'ios-observe');
                    samples.push(...await readMaestroSamples(debug));
                    assertM112NativePlateau(samples);
                    for(const sample of samples) assertM112PhaseObservations(phase.name,sample.observations);
                    selected=samples[2]!.observations;
                    retained=await capture();
                    if(JSON.stringify(readM112NativeObservations(retained.attrs))!==JSON.stringify(selected)) throw Error('Native observation changed after plateau');
                } else {
                const until = performance.now() + 10000;
                while (performance.now() < until) {
                    const sample = await capture();
                    try {
                        const o = readM112NativeObservations(sample.attrs);
                        assertM112PhaseObservations(phase.name, o);
                        for (const [id, data] of Object.entries(o.telemetry))
                            if (['A', 'B', 'same-inner', 'destination', 'height'].includes(id) && (!Number.isSafeInteger(data.events) || data.events! < 0))
                                throw Error('Missing event counters');
                        const signature = JSON.stringify(o);
                        samples.push({ at: performance.now(), observations: o });
                        stable = signature === last ? stable + 1 : 1;
                        last = signature;
                        if (stable >= 3) {
                            retained = sample;
                            selected = o;
                            break;
                        }
                    }
                    catch {
                        stable = 0;
                    }
                    await Bun.sleep(100);
                }
                    assertM112NativePlateau(samples.slice(-3));
                }
                if (!retained || !selected)
                    throw Error(`Native phase ${phase.name} did not settle with valid geometry`);
                const b = selected.telemetry.B!, invariant = JSON.stringify({ bucket: b.bucket, direction: b.direction, width: b.measured!.width, chips: b.chips, commits: b.commits });
                if (bInvariant === undefined)
                    bInvariant = invariant;
                else if (invariant !== bInvariant)
                    throw Error('Sibling B changed selection or geometry');
                await writeFile(join(output, `${platform}-${phase.name}.hierarchy.${platform === 'ios' ? 'json' : 'xml'}`), retained.raw + '\n');
                const screenshot = join(output, `${platform}-${phase.name}.png`);
                await captureScreenshot(platform,screenshot);
                let visualSupplement: Record<string,unknown> | undefined;
                if(phase.name === 'destination-portal') {
                    let scrollEvidence: unknown;
                    if(platform === 'ios') {
                        const flow=join(output,'ios-destination-visible.yaml');
                        await writeFile(flow,'appId: host.exp.Exponent\n---\n- scrollUntilVisible:\n    element:\n      id: container-destination-two\n    direction: DOWN\n    timeout: 10000\n');
                        await run([maestro,'--device',ios,'test','--debug-output',join(output,'maestro','destination-visible'),flow],'ios-portal-scroll');
                        scrollEvidence={selector:'container-destination-two',direction:'DOWN',flow};
                    } else {
                        const target=retained.attrs.find(node=>node.scrollable==='true' && node.class==='android.widget.ScrollView');
                        const points=m112NativeScrollPoints(target);
                        await device('android',['shell','input','swipe',String(points.start.x),String(points.start.y),String(points.end.x),String(points.end.y),'400'],'android-portal-scroll');
                        scrollEvidence={bounds:target!.bounds,points};
                    }
                    const visible=await capture(),observations=readM112NativeObservations(visible.attrs);
                    assertM112PhaseObservations(phase.name,observations);
                    if(JSON.stringify(observations)!==JSON.stringify(selected)) throw Error('Native observations changed after visual scrolling');
                    const visibleScreenshot=join(output,platform+'-destination-visible.png'),visibleHierarchy=join(output,platform+'-destination-visible.hierarchy.'+(platform==='ios'?'json':'xml'));
                    await captureScreenshot(platform,visibleScreenshot);await writeFile(visibleHierarchy,visible.raw+'\n');
                    visualSupplement={scrollEvidence,screenshot:visibleScreenshot,screenshotSha256:sha(await readFile(visibleScreenshot)),hierarchy:visibleHierarchy,hierarchySha256:sha(visible.raw+'\n')};
                    retained=visible;
                }
                previousAttributes=retained.attrs;
                records.push({ phase: phase.name, actionEvidence, visualSupplement, status: 'passed', samples: samples.slice(-3), observations: selected, screenshot, screenshotSha256: sha(await readFile(screenshot)), hierarchySha256: sha(await readFile(join(output, `${platform}-${phase.name}.hierarchy.${platform === 'ios' ? 'json' : 'xml'}`))), plateau: { samples: 3, minIntervalMs: 100, timeoutMs: 10000 } });
                console.log(`${platform} ${phase.name} passed`);
            }
            receipt[platform] = 'passed';
            receipt[`${platform}Phases`] = records;
            await writeFile(join(output, 'native.json'), JSON.stringify(receipt, null, 2) + '\n');
        }
        await assertHarness();
        receipt.inputAfter = await verifyM112NativeInputs(consumer, host.copiedFiles, compilation);
        assertM112ArtifactIdentity(artifact.sha256, sha(await readFile(artifact.tarball)));
    }
    catch (error) {
        failM112NativeQualification(receipt, error);
        throw error;
    }
    finally {
        const cleanup: Record<string, unknown> = {};
        try {
            if (mapping) {
                const rows = await device('android', ['reverse', '--list'], 'mapping-final');
                const row = rows.split('\n').find(line => line.split(/\s+/)[1] === `tcp:${port}`);
                if (row && row.split(/\s+/)[2] !== `tcp:${port}`)
                    throw Error('Mapping was replaced');
                if (row)
                    await device('android', ['reverse', '--remove', `tcp:${port}`], 'mapping-remove');
                cleanup.mapping = 'removed';
            }
            if (emulator) {
                assertM112DeviceIdentity(owner.android.avdName, parseAvdName(await device('android', ['emu', 'avd', 'name'], 'avd-cleanup')));
                await device('android', ['emu', 'kill'], 'emulator-stop');
                cleanup.emulator = 'stopped';
            }
            if (owner.ios.stateBefore === 'Shutdown') {
                const current = await iosInfo();
                if (current.state === 'Booted')
                    await run(['xcrun', 'simctl', 'shutdown', ios], 'simulator-stop');
                cleanup.ios = 'shutdown';
            }
        }
        catch (error) {
            cleanup.error = String(error);
        }
        if (metro) {
            metro.kill();
            await metro.exited;
        }
        if (emulator)
            await emulator.exited;
        if (metroFd !== undefined)
            closeSync(metroFd);
        if (emulatorFd !== undefined)
            closeSync(emulatorFd);
        const after = await m112SourceIdentity();
        receipt.sourceAfter = after;
        receipt.commands = commands;
        receipt.cleanup = cleanup;
        receipt.completedAt = new Date().toISOString();
        if (after.digest !== source.digest || cleanup.error) {
            receipt.ios = 'failed';
            receipt.android = 'failed';
            receipt.error = receipt.error ?? 'Source drift or cleanup failure';
        }
        await writeFile(join(output, 'native.json'), JSON.stringify(receipt, null, 2) + '\n');
    }
}
if (import.meta.main)
    await qualify(process.argv.slice(2));
