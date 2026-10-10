import { openSync, closeSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile, realpath, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { m115Sha, m115SourceIdentity, verifyM115InputFiles, assertM115Stable } from './m11-5-qualification';
import { assertM115NativeBinding, assertM115Device, assertM115RealNativeMap, readM115Observation, inspectM115Capture, assertM115FontProof, m115FontLayoutIncreased, failM115Native, assertM115StableComponent } from './m11-5-native-observations';
import type { M115Observation } from './m11-5-native-observations';
import { nativeAttributes, nativeXmlAttributes, nativeActionPoint } from './m11-3-native-observations';
type Platform = 'ios' | 'android';
const repository = resolve(import.meta.dir, '..');
function ensure(value: unknown, message: string): asserts value {
    if (!value)
        throw Error(message);
}
async function qualify(args: string[]) {
    const flags = new Map<string, string>();
    for (let i = 0; i < args.length; i += 2) {
        ensure(['--consumer-root', '--host-receipt', '--ownership', '--port', '--output'].includes(args[i]!) && args[i + 1], 'Invalid native argument');
        flags.set(args[i]!, args[i + 1]!);
    }
    for (const k of ['--consumer-root', '--host-receipt', '--ownership', '--port', '--output'])
        ensure(flags.has(k), 'Missing ' + k);
    const consumer = resolve(flags.get('--consumer-root')!), output = resolve(flags.get('--output')!), hostPath = resolve(flags.get('--host-receipt')!), ownerPath = resolve(flags.get('--ownership')!), port = Number(flags.get('--port'));
    ensure(Number.isInteger(port) && port >= 1024 && port <= 65535, 'Invalid port');
    await mkdir(output, { recursive: true });
    ensure((await readdir(output)).length === 0, 'Native output must be empty');
    const hostBytes = await readFile(hostPath), host = JSON.parse(hostBytes.toString()), ownerBytes = await readFile(ownerPath), owner = JSON.parse(ownerBytes.toString()), source = await m115SourceIdentity();
    assertM115NativeBinding(host, source.digest, m115Sha(await readFile(host.artifact.tarball)), m115Sha(await readFile(host.extensionArtifact.tarball)), consumer);
    ensure(owner.schema === 'crumbs.m11.5.native-ownership.v1' && owner.studyId === 'crumbs-m115', 'Foreign ownership');
    const ios = owner.devices.ios.id, android = owner.devices.android.id;
    ensure(ios !== owner.protectedSimulator && android !== 'emulator-5562' && /^emulator-\d+$/.test(android), 'Protected/foreign native target');
    const env = { ...process.env, ...owner.environment, CI: '1', EXPO_NO_METRO_WORKSPACE_ROOT: '1', EXPO_NO_TYPESCRIPT_SETUP: '1', ANDROID_AVD_HOME: owner.devices.android.avdHome, PATH: join(owner.tools.sdk, 'platform-tools') + ':' + process.env.PATH };
    const commands: any[] = [], receipt: any = { schema: 'crumbs.m11.5.native-qualification.v1', hostReceipt: hostPath, hostReceiptSha256: m115Sha(hostBytes), ownershipSha256: m115Sha(ownerBytes), sourceBefore: source, consumerRoot: consumer, artifact: host.artifact, extensionArtifact: host.extensionArtifact, commands, ios: 'not-run', android: 'not-run', acceptance: 'incomplete', evidenceClass: 'Expo Go/Hermes functional; physical/spoken-reader/live-HMR/release-FPS deferred' };
    const processes: ReturnType<typeof Bun.spawn>[] = [], fds: number[] = [];
    let mapping = false, iosBooted = false, androidBooted = false, companionOwned = false, iosPreference: string | undefined, androidPreference: string | undefined;
    const run = async (command: string[], name: string, binary = false) => { const log = join(output, commands.length + '-' + name + (binary ? '.png' : '.log')); const record: any = { command, startedAt: Date.now(), log }; commands.push(record); const p = Bun.spawn(command, { cwd: consumer, env, stdout: 'pipe', stderr: 'pipe' }); const [bytes, stderr, exitCode] = await Promise.all([new Response(p.stdout).arrayBuffer().then(x => Buffer.from(x)), new Response(p.stderr).text(), p.exited]); await writeFile(log, binary ? bytes : bytes.toString() + stderr); Object.assign(record, { exitCode, completedAt: Date.now(), sha256: m115Sha(await readFile(log)) }); ensure(exitCode === 0, name + ' failed: ' + log); return binary ? bytes : bytes.toString().trim(); };
    const adb = (args: string[], name: string, binary = false) => run([owner.tools.adb, '-s', android, ...args], name, binary);
    const simctl = (args: string[], name: string) => run(['xcrun', 'simctl', args[0]!, ios, ...args.slice(1)], name);
    const idb = (args: string[], name: string) => run([owner.tools.idb, '--companion', owner.idbInput.socket, ...args], name);
    const maestro = (args: string[], name: string) => run([owner.tools.maestro, '-p', 'ios', '--device', ios, ...args], name);
    const spawn = (command: string[], name: string) => { const fd = openSync(join(output, name + '.log'), 'wx'); fds.push(fd); const p = Bun.spawn(command, { cwd: consumer, env, stdout: fd, stderr: fd }); processes.push(p); return p; };
    const iosInfo = async () => { const x = JSON.parse(String(await run(['xcrun', 'simctl', 'list', 'devices', 'available', '-j'], 'ios-list'))); const d: any = Object.values(x.devices).flat().find((d: any) => d.udid === ios); ensure(d?.name === 'Crumbs M11.3 Native Motion', 'Foreign Simulator name'); return { id: d.udid, name: d.name, state: d.state }; };
    const assertDevices = async () => { assertM115Device(await iosInfo(), ios); const avd = String(await adb(['emu', 'avd', 'name'], 'avd-name')).split(/\r?\n/); ensure(avd[0] === owner.devices.android.avdName && avd[1] === 'OK', 'Foreign Android AVD'); ensure(await adb(['shell', 'getprop', 'ro.kernel.qemu'], 'android-qemu') === '1', 'Physical Android refused'); };
    const assertInputs = async () => {
        await verifyM115InputFiles(owner.assets.iosApp, owner.assets.iosAppFiles);
        await verifyM115InputFiles(consumer, host.nativeInputs);
        for (const name of ['crumbs-css', 'crumbs-css-copy'])
            await verifyM115InputFiles(join(consumer, 'node_modules/@opsydyn', name), host.artifactHashes);
        await verifyM115InputFiles(join(consumer, 'node_modules/@acme/crumbs-extensions'), host.runtimePackageFiles);
        assertM115Stable(host.extensionArtifact.sha256, m115Sha(await readFile(host.extensionArtifact.tarball)), 'Runtime artifact');
        assertM115Stable(host.artifact.sha256, m115Sha(await readFile(host.artifact.tarball)), 'Artifact');
        assertM115Stable(source.digest, (await m115SourceIdentity()).digest, 'Source');
        assertM115Stable(m115Sha(hostBytes), m115Sha(await readFile(hostPath)), 'Host receipt');
        assertM115Stable(m115Sha(ownerBytes), m115Sha(await readFile(ownerPath)), 'Ownership');
    };
    const hierarchy = async (platform: Platform) => platform === 'ios' ? nativeAttributes(JSON.parse(String(await maestro(['hierarchy', '--no-reinstall-driver'], 'ios-hierarchy')))) : (await adb(['shell', 'uiautomator', 'dump', '/sdcard/m115-window.xml'], 'android-dump'), nativeXmlAttributes(String(await adb(['shell', 'cat', '/sdcard/m115-window.xml'], 'android-hierarchy'))));
    const action = async (platform: Platform, a: Record<string, string>) => {
        const p = nativeActionPoint(a);
        if (platform === 'ios') {
            const d = JSON.parse(String(await idb(['describe', '--json'], 'input-identity')));
            ensure(d.udid === ios && d.target_type === 'simulator' && d.state === 'Booted', 'Foreign iOS input identity');
            await idb(['ui', 'tap', String(p.x), String(p.y), '--duration', '0.1'], 'tap');
        }
        else
            await adb(['shell', 'input', 'tap', String(p.x), String(p.y)], 'tap');
    };
    const readiness = async (platform: Platform, predicate: (o: M115Observation) => boolean) => {
        const start = Date.now();
        let overlays = 0;
        while (Date.now() - start < 60000) {
            const attrs = await hierarchy(platform);
            try {
                const observation = readM115Observation(attrs);
                if (predicate(observation))
                    return { attrs, observation };
            }
            catch { }
            const text = (a: Record<string, string>) => a.accessibilityText || a.text || a['content-desc'] || '';
            const project = attrs.some(a => text(a) === 'Crumbs M11.5 Extension');
            const prompt = attrs.some(a => text(a) === 'Open in “Expo Go”?');
            if (overlays < 2 && (project || prompt)) {
                const label = prompt ? 'Open' : attrs.some(a => text(a) === 'Continue') ? 'Continue' : 'Close';
                const a = attrs.find(a => text(a) === label && a.enabled === 'true' && a.bounds && a.bounds !== '[0,0][0,0]');
                if (a) {
                    await action(platform, a);
                    overlays++;
                }
            }
            await Bun.sleep(200);
        }
        throw Error(platform + ' current native extension observation not ready');
    };
    const capture = async (platform: Platform, name: string, predicate: (o: M115Observation) => boolean = () => true) => {
        await assertDevices();
        const { attrs, observation } = await readiness(platform, predicate);
        const file = join(output, platform + '-' + name + '.png');
        let bytes: Buffer;
        if (platform === 'ios') {
            await simctl(['io', 'screenshot', file], 'capture-' + name);
            bytes = await readFile(file);
        }
        else {
            bytes = await adb(['exec-out', 'screencap', '-p'], 'capture-' + name, true) as Buffer;
            await writeFile(file, bytes);
        }
        const pixels = inspectM115Capture(bytes, attrs, observation);
        const record = { name, file, sha256: m115Sha(bytes), observation, pixels, at: Date.now() };
        await writeFile(join(output, platform + '-' + name + '.json'), JSON.stringify({ attrs, ...record }, null, 2) + '\n');
        return record;
    };
    const tap = async (platform: Platform, id: string) => { const attrs = await hierarchy(platform), a = attrs.find(a => a['resource-id'] === 'extensions-' + id); ensure(a, 'Missing enabled control ' + id); await action(platform, a); };
    const setFont = async (platform: Platform, value: string) => {
        if (platform === 'ios')
            await simctl(['ui', 'content_size', value], 'ios-font-set');
        else
            await adb(['shell', 'settings', value === 'null' ? 'delete' : 'put', 'system', 'font_scale', ...(value === 'null' ? [] : [value])], 'android-font-set');
    };
    const getFont = async (platform: Platform) => String(platform === 'ios' ? await simctl(['ui', 'content_size'], 'ios-font-get') : await adb(['shell', 'settings', 'get', 'system', 'font_scale'], 'android-font-get'));
    const fetchBundle = async (platform: Platform, archive: boolean) => {
        let manifest: any;
        const start = Date.now();
        while (Date.now() - start < 180000) {
            try {
                const r = await fetch(`http://127.0.0.1:${port}/`, { headers: { 'expo-platform': platform, accept: 'application/expo+json' } });
                if (r.ok) {
                    manifest = await r.json();
                    if (manifest.launchAsset)
                        break;
                }
            }
            catch { }
            await Bun.sleep(500);
        }
        ensure(manifest?.launchAsset, 'Missing owned Metro manifest');
        const url = new URL(manifest.launchAsset.url);
        ensure(url.hostname === '127.0.0.1' && url.port === String(port) && url.searchParams.get('transform.engine') === 'hermes', 'Wrong bundle endpoint/engine');
        const r = await fetch(url);
        ensure(r.ok, 'Native bundle failed');
        const bytes = Buffer.from(await r.arrayBuffer()), mapUrl = new URL(url);
        mapUrl.pathname = mapUrl.pathname.replace(/\.bundle$/, '.map');
        const mr = await fetch(mapUrl);
        ensure(mr.ok, 'Native map failed');
        const mapBytes = Buffer.from(await mr.arrayBuffer()), map = JSON.parse(mapBytes.toString());
        assertM115RealNativeMap(map);
        ensure(!map.sources.some((s: string) => s.includes(repository)), 'Workspace source reached installed map');
        const entries: Record<string, string> = {};
        for (const [packageName, entryName] of [['@acme/crumbs-extensions', 'runtime'], ['@opsydyn/crumbs-css', 'theme-core']]) {
            const index = map.sources.findIndex((s: string) => s.endsWith('node_modules/' + packageName + '/dist/' + entryName + '.mjs') || s.endsWith('node_modules/' + packageName + '/dist/' + entryName + '.cjs'));
            ensure(index >= 0 && typeof map.sourcesContent[index] === 'string', 'Missing current mapped runtime content');
            const file = map.sources[index].split('/dist/')[1];
            const digest = m115Sha(map.sourcesContent[index]);
            assertM115Stable(m115Sha(await readFile(join(consumer, 'node_modules', packageName!, 'dist', file))), digest, 'Served runtime entry');
            entries[packageName! + '/' + file] = digest;
        }
        const result = { platform, url: url.href, sha256: m115Sha(bytes), mapSha256: m115Sha(mapBytes), entries, engine: 'hermes' };
        if (archive) {
            await writeFile(join(output, platform + '-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
            await writeFile(join(output, platform + '-served.bundle.gz'), gzipSync(bytes));
            await writeFile(join(output, platform + '-served.map.gz'), gzipSync(mapBytes));
        }
        return result;
    };
    try {
        await assertInputs();
        for (const f of owner.idbInput.files)
            assertM115Stable(f.sha256, m115Sha(await readFile(f.path)), 'iOS input tool');
        for (const tool of ['adb', 'emulator', 'maestro', 'idb', 'idbCompanion'])
            assertM115Stable(owner.verifiedToolHashes[tool], m115Sha(await readFile(owner.tools[tool])), 'Native tool');
        assertM115Stable(owner.assets.androidApkSha256, m115Sha(await readFile(owner.assets.androidApk)), 'Expo APK');
        const iosState = await iosInfo();
        ensure(iosState.state === 'Shutdown', 'Owned Simulator is already in use');
        await simctl(['boot'], 'ios-boot');
        iosBooted = true;
        await simctl(['bootstatus', '-b'], 'ios-ready');
        const devices = String(await run([owner.tools.adb, 'devices'], 'adb-devices'));
        ensure(!devices.split('\n').some(s => s.startsWith(android + '\t')), 'Owned emulator already in use');
        spawn([owner.tools.emulator, '-avd', owner.devices.android.avdName, '-port', android.split('-')[1], '-no-snapshot-save', '-no-audio', '-no-boot-anim', '-memory', '2048', '-cores', '2', '-gpu', owner.environment.androidGpu], 'emulator');
        androidBooted = true;
        const bootStart = Date.now();
        let ready = false;
        while (Date.now() - bootStart < 180000) {
            const p = Bun.spawnSync([owner.tools.adb, '-s', android, 'shell', 'getprop', 'sys.boot_completed'], { env, stdout: 'pipe', stderr: 'pipe' });
            if (p.stdout.toString().trim() === '1') {
                ready = true;
                break;
            }
            await Bun.sleep(1000);
        }
        ensure(ready, 'Owned emulator not booted');
        await assertDevices();
        iosPreference = await getFont('ios');
        androidPreference = await getFont('android');
        ensure(['extra-small', 'small', 'medium', 'large', 'extra-large', 'extra-extra-large', 'extra-extra-extra-large', 'accessibility-medium', 'accessibility-large', 'accessibility-extra-large', 'accessibility-extra-extra-large', 'accessibility-extra-extra-extra-large'].includes(iosPreference), 'Unknown iOS font state');
        ensure(androidPreference === 'null' || Number.isFinite(Number(androidPreference)) && Number(androidPreference) > 0, 'Unknown Android font state');
        receipt.originalPreferences = { ios: iosPreference, android: androidPreference };
        await simctl(['install', owner.assets.iosApp], 'ios-install');
        await adb(['install', '-r', owner.assets.androidApk], 'android-install');
        const container = String(await simctl(['get_app_container', 'host.exp.Exponent', 'app'], 'ios-container'));
        ensure(await run(['/usr/libexec/PlistBuddy', '-c', 'Print :CFBundleShortVersionString', join(container, 'Info.plist')], 'ios-expo-version') === '56.0.4', 'Wrong iOS Expo Go');
        ensure(String(await adb(['shell', 'dumpsys', 'package', 'host.exp.exponent'], 'android-expo-version')).includes('versionName=56.0.4'), 'Wrong Android Expo Go');
        receipt.harness = { ios: container, android: owner.assets.androidApk, version: '56.0.4' };
        const socketCheck = await readdir('/private/tmp');
        ensure(!socketCheck.includes(owner.idbInput.socket.split('/').at(-1)), 'Owned idb socket in use');
        spawn([owner.tools.idbCompanion, '--udid', ios, '--grpc-domain-sock', owner.idbInput.socket], 'idb-companion');
        companionOwned = true;
        const portCheck = Bun.listen({ hostname: '127.0.0.1', port, socket: { data() { } } });
        portCheck.stop(true);
        const metro = spawn([join(consumer, 'node_modules/.bin/expo'), 'start', '--localhost', '--port', String(port)], 'metro');
        receipt.metro = { port, pid: metro.pid };
        const bundles = [];
        for (const platform of ['ios', 'android'] as const)
            bundles.push(await fetchBundle(platform, true));
        receipt.bundles = bundles;
        ensure(!String(await adb(['reverse', '--list'], 'reverse-list')).includes(`tcp:${port}`), 'Mapping collision');
        await adb(['reverse', `tcp:${port}`, `tcp:${port}`], 'reverse-create');
        mapping = true;
        await simctl(['openurl', `exp://127.0.0.1:${port}`], 'ios-launch');
        const launched = String(await adb(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `exp://127.0.0.1:${port}`, 'host.exp.exponent'], 'android-launch'));
        if (launched.includes('LauncherActivity'))
            await adb(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `exp://127.0.0.1:${port}`, 'host.exp.exponent'], 'android-experience');
        for (const platform of ['ios', 'android'] as const) {
            const phases = [];
            const initial = await capture(platform, 'initial', o => o.selection.foundation === 'blue' && o.selection.mode === 'literal' && o.selection.theme === 'light' && !o.selection.override);
            phases.push(initial);
            await tap(platform, 'foundation');
            const red = await capture(platform, 'red', o => o.selection.foundation === 'red');
            phases.push(red);
            ensure(red.observation.counts.mounts > initial.observation.counts.mounts && red.observation.counts.factories === initial.observation.counts.factories, 'Static alternate selection did not mount correctly');
            await tap(platform, 'mode');
            const themed = await capture(platform, 'themed-light', o => o.selection.mode === 'themed');
            phases.push(themed);
            await tap(platform, 'theme');
            const dark = await capture(platform, 'themed-dark', o => o.selection.theme === 'dark');
            phases.push(dark);
            assertM115StableComponent(themed.observation, dark.observation);
            await tap(platform, 'override');
            const override = await capture(platform, 'override', o => o.selection.override);
            phases.push(override);
            assertM115StableComponent(dark.observation, override.observation);
            await tap(platform, 'unrelated');
            const unrelated = await capture(platform, 'unrelated', o => o.unrelated);
            phases.push(unrelated);
            assertM115StableComponent(override.observation, unrelated.observation);
            ensure(JSON.stringify(unrelated.observation.generated) === JSON.stringify(override.observation.generated) && JSON.stringify(unrelated.observation.layouts) === JSON.stringify(override.observation.layouts), 'Unrelated update changed committed style/layout');
            for (const kind of ['generated', 'control'] as const) {
                await tap(platform, kind + '-action');
                const interaction = await capture(platform, kind + '-action', o => o.actions[kind] === unrelated.observation.actions[kind] + 1);
                phases.push(interaction);
                assertM115StableComponent(unrelated.observation, interaction.observation);
            }
            // Reset design selection before native configuration can recreate Android's activity.
            for (const id of ['foundation', 'mode', 'theme', 'override', 'unrelated'])
                await tap(platform, id);
            const original = await capture(platform, 'font-original', o => o.selection.foundation === 'blue' && o.selection.mode === 'literal' && o.selection.theme === 'light' && !o.selection.override && !o.unrelated);
            const originalPreference = platform === 'ios' ? iosPreference : androidPreference;
            const baselineValue = platform === 'ios' ? 'large' : '1.0', increasedValue = platform === 'ios' ? 'extra-extra-extra-large' : '1.3';
            await setFont(platform, baselineValue);
            ensure(await getFont(platform) === baselineValue, 'Native baseline preference not applied');
            const baseline = await capture(platform, 'font-baseline', o => Math.abs(o.nativeFontScale - 1) < .01);
            await setFont(platform, increasedValue);
            ensure(await getFont(platform) === increasedValue, 'Native increased preference not applied');
            const increased = await capture(platform, 'font-increased', o => o.nativeFontScale > baseline.observation.nativeFontScale + .01 && m115FontLayoutIncreased(baseline.observation, o));
            await setFont(platform, originalPreference!);
            const restoredPreference = await getFont(platform);
            const restored = await capture(platform, 'font-restored', o => Math.abs(o.nativeFontScale - original.observation.nativeFontScale) < .001);
            const proof = { originalPreference: originalPreference!, baselinePreference: baselineValue, increasedPreference: increasedValue, restoredPreference, original: original.observation, baseline: baseline.observation, increased: increased.observation, restored: restored.observation };
            assertM115FontProof(proof);
            phases.push(original, baseline, increased, restored);
            receipt[platform + 'Phases'] = phases;
            receipt[platform + 'FontProof'] = proof;
            receipt[platform] = 'passed';
            await assertInputs();
        }
        for (const bundle of receipt.bundles)
            ensure(JSON.stringify(await fetchBundle(bundle.platform, false)) === JSON.stringify(bundle), 'Served native bundle/map drift');
        await assertInputs();
        receipt.sourceAfter = await m115SourceIdentity();
        receipt.acceptance = 'passed';
    }
    catch (error) {
        failM115Native(receipt, error);
    }
    finally {
        const cleanup: any[] = [];
        const clean = async (name: string, fn: () => Promise<unknown>) => {
            try {
                await fn();
                cleanup.push({ name, status: 'passed' });
            }
            catch (e) {
                cleanup.push({ name, status: 'failed', error: String(e) });
                failM115Native(receipt, e);
            }
        };
        if (iosPreference !== undefined)
            await clean('ios-font-restoration', async () => { await setFont('ios', iosPreference!); ensure(await getFont('ios') === iosPreference, 'iOS font restoration failed'); });
        if (androidPreference !== undefined)
            await clean('android-font-restoration', async () => { await setFont('android', androidPreference!); ensure(await getFont('android') === androidPreference, 'Android font restoration failed'); });
        if (mapping)
            await clean('owned-reverse', () => adb(['reverse', '--remove', `tcp:${port}`], 'reverse-remove'));
        await clean('final-inputs', assertInputs);
        for (const p of [...processes].reverse())
            await clean('owned-process-' + p.pid, async () => { p.kill(); await p.exited; });
        if (androidBooted)
            await clean('android-shutdown', async () => {
                const start = Date.now();
                while (Date.now() - start < 30000) {
                    const list = String(await run([owner.tools.adb, 'devices'], 'android-cleanup-list'));
                    if (!list.includes(android + '\t'))
                        return;
                    await Bun.sleep(200);
                }
                throw Error('Owned emulator remained active');
            });
        if (companionOwned)
            await clean('owned-idb-socket', () => rm(owner.idbInput.socket, { force: true }));
        if (iosBooted)
            await clean('ios-shutdown', () => simctl(['shutdown'], 'ios-shutdown'));
        for (const fd of fds)
            closeSync(fd);
        receipt.cleanup = cleanup;
        receipt.completedAt = new Date().toISOString();
        await writeFile(join(output, 'qualification.json'), JSON.stringify(receipt, null, 2) + '\n');
        ensure(receipt.acceptance === 'passed', 'M11.5 native failed: ' + receipt.error);
    }
    console.log(JSON.stringify({ output, acceptance: receipt.acceptance }));
}
if (import.meta.main)
    await qualify(process.argv.slice(2));
