import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, relative, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { verifyInstalledArtifact, verifyExpoBundleInventory, assertNoWorkspaceOrLinkDependencies } from './packed-distribution-contract';
import { verifyPackedExportMap } from './packed-export-contract';
import { auditPackedRuntimeEntrypoints } from './packed-runtime-graph';
const repository = resolve(import.meta.dir, '..');
export const m113Sha = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
export type QualificationPhase = 'passed' | 'failed' | 'not-run';
export function m113Acceptance(states: {
    host: QualificationPhase;
    ios: QualificationPhase;
    android: QualificationPhase;
}) { return Object.values(states).some(s => s === 'failed') ? 'failed' : Object.values(states).every(s => s === 'passed') ? 'passed' : 'incomplete'; }
export function assertM113SourceStable(before: string, after: string) { if (before !== after)
    throw Error('Source changed during M11.3 qualification'); }
export function assertM113OwnedRoot(entries: readonly string[], marker: unknown) { if (entries.length && !marker)
    throw Error('Foreign nonempty consumer root has no M11.3 ownership'); }
export function assertM113InstalledRoot(consumer: string, installed: string) { if (resolve(installed) !== resolve(consumer, 'node_modules/@opsydyn/crumbs-css'))
    throw Error('Installed package escaped owned consumer'); }
export function assertM113ArtifactIdentity(expected: string, actual: string) { if (expected !== actual)
    throw Error('Tarball identity changed'); }
export async function m113SourceIdentity() { const child = Bun.spawn(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: repository, stdout: 'pipe', stderr: 'pipe' }); const paths = (await new Response(child.stdout).text()).split('\0').filter(path => /^(?:packages\/css\/(?:src|test|fixtures|bench)\/|scripts\/|apps\/(?:storybook|playground)\/(?:src|test)\/|docs\/src\/)/.test(path) || ['bun.lock', 'package.json', 'packages/css/package.json', 'packages/css/README.md', 'packages/css/COMPATIBILITY.md', 'packages/css/tsdown.config.ts', 'packages/css/build-policy.ts', 'apps/storybook/tsconfig.json', 'apps/playground/tsconfig.json', 'apps/storybook/metro.config.js', 'apps/playground/metro.config.js', 'docs/astro.config.mjs'].includes(path)).sort(); if (await child.exited !== 0)
    throw Error('Source inventory failed'); const files = await Promise.all(paths.map(async (path) => ({ path, sha256: m113Sha(await readFile(join(repository, path))) }))); return { digest: m113Sha(JSON.stringify(files)), files }; }
export async function verifyM113InputFiles(root: string, files: readonly {
    path: string;
    sha256: string;
}[]) { for (const file of files) {
    if (resolve(root, file.path) !== join(resolve(root), file.path) || file.path.split(/[\\/]/).includes('..') || file.path.startsWith('/'))
        throw Error('Input escaped consumer');
    if (m113Sha(await readFile(join(root, file.path))) !== file.sha256)
        throw Error('Input changed: ' + file.path);
} return files; }
export async function relocateM113AuthoredStyle(consumer: string, expected: string) { const file = join(consumer, 'src/motion-panel.css.ts'); if (m113Sha(await readFile(file)) !== expected)
    throw Error('Authored motion CSS changed'); await mkdir(join(consumer, 'authoring'), { recursive: true }); await cp(file, join(consumer, 'authoring/motion-panel.css.ts')); await unlink(file); }
async function qualify(args: string[]) {
    let output = resolve(repository, 'docs/evidence/2026-10-09-m11-3-native-motion/host'), consumer: string | undefined, prepareOnly = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output')
            output = resolve(args[++i]!);
        else if (args[i] === '--consumer-root')
            consumer = resolve(args[++i]!);
        else if (args[i] === '--prepare-only')
            prepareOnly = true;
        else
            throw Error('Usage: m11-3-qualification.ts [--prepare-only] --consumer-root owned-root --output receipt-root');
    }
    consumer ??= await mkdtemp(join(tmpdir(), 'crumbs-m113-consumer-'));
    await mkdir(output, { recursive: true });
    const sourceBefore = await m113SourceIdentity(), commands: Record<string, unknown>[] = [];
    const run = async (command: string[], cwd = consumer!, name = 'command', env: Record<string, string> = {}) => { const child = Bun.spawn(command, { cwd, env: { ...process.env, CI: '1', EXPO_NO_METRO_WORKSPACE_ROOT: '1', NODE_OPTIONS: ((process.env.NODE_OPTIONS ?? '') + ' --dns-result-order=ipv4first').trim(), ...env }, stdout: 'pipe', stderr: 'pipe' }); const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]); const log = join(output, `${commands.length}-${name}.log`); await writeFile(log, stdout + stderr); commands.push({ command, cwd, exitCode, log, startedAt: new Date().toISOString() }); if (exitCode !== 0)
        throw Error(`${name} exited ${exitCode}; ${log}`); return stdout.trim(); };
    let receipt: Record<string, unknown> = { schema: 'crumbs.m11.3.qualification.v1', mode: prepareOnly ? 'prepare-only' : 'full', base: await run(['git', 'rev-parse', 'HEAD'], repository, 'base'), sourceBefore, consumerRoot: consumer, commands, host: 'not-run', ios: 'not-run', android: 'not-run', acceptance: 'incomplete' };
    try {
        await mkdir(consumer, { recursive: true });
        const marker = join(consumer, '.m11-3-owned.json');
        let owned: any;
        try {
            owned = JSON.parse(await readFile(marker, 'utf8'));
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
                throw e;
        }
        if (!owned) {
            assertM113OwnedRoot(await readdir(consumer), owned);
            const artifacts = join(output, 'artifacts');
            await mkdir(artifacts, { recursive: true });
            const pack = JSON.parse(await run(['npm', 'pack', '--ignore-scripts', '--json', '--pack-destination', artifacts], join(repository, 'packages/css'), 'pack'))[0];
            const artifact = { name: pack.name, version: pack.version, tarball: join(artifacts, pack.filename), sha256: m113Sha(await readFile(join(artifacts, pack.filename))) };
            const template = join(repository, 'packages/css/fixtures/packed-distribution/app'), manifest = JSON.parse(await readFile(join(template, 'package.json'), 'utf8'));
            delete manifest.dependencies['@acme/design-tokens'];
            delete manifest.dependencies['@acme/ui'];
            manifest.name = 'crumbs-m113-installed-consumer';
            manifest.dependencies[artifact.name] = 'file:' + artifact.tarball;
            assertNoWorkspaceOrLinkDependencies(manifest);
            await writeFile(join(consumer, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
            await mkdir(join(consumer, 'test'));
            await mkdir(join(consumer, 'src'));
            for (const name of ['motion.integration.tsx', 'motion-peer.cjs', 'motion.node.mjs', 'motion-control-values.json'])
                await cp(join(template, 'test', name), join(consumer, 'test', name));
            await cp(join(template, 'src/motion.types.tsx'), join(consumer, 'src/motion.types.tsx'));
            await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, exactOptionalPropertyTypes: true, noEmit: true, skipLibCheck: true }, include: ['src'] }, null, 2) + '\n');
            if (!prepareOnly) {
                for (const name of ['motion-definitions.ts', 'motion-model.ts', 'motion-panel.css.ts', 'MotionPanel.tsx'])
                    await cp(join(repository, 'apps/storybook/src/components/native-motion', name), join(consumer, 'src', name));
                await cp(join(template, 'src/MotionApp.tsx'), join(consumer, 'src/MotionApp.tsx'));
                await cp(join(repository, 'apps/storybook/src/accessibility/native-condition-source.ts'), join(consumer, 'src/native-condition-source.ts'));
                await writeFile(join(consumer, 'index.js'), "import {registerRootComponent} from 'expo';import {MotionApp} from './src/MotionApp';registerRootComponent(MotionApp);\n");
                await cp(join(template, 'babel.config.js'), join(consumer, 'babel.config.cjs'));
                await writeFile(join(consumer, 'metro.config.cjs'), "const {getDefaultConfig}=require('expo/metro-config');const {withNativeStyles}=require('@opsydyn/crumbs-css/metro-plugin');module.exports=withNativeStyles(getDefaultConfig(__dirname));\n");
                await writeFile(join(consumer, 'app.json'), JSON.stringify({ expo: { name: 'Crumbs M11.3 Motion', slug: 'crumbs-m113-motion', version: '1.0.0', sdkVersion: '56.0.0', web: { bundler: 'metro' } } }, null, 2) + '\n');
            }
            const copiedFiles: Record<string, string>[] = [];
            for (const dir of ['src', 'test'])
                for (const name of await readdir(join(consumer, dir)))
                    copiedFiles.push({ path: join(dir, name), sha256: m113Sha(await readFile(join(consumer, dir, name))) });
            await run(['npm', 'install', '--no-audit', '--no-fund'], consumer, 'install');
            for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', ...(prepareOnly ? [] : ['index.js', 'app.json', 'babel.config.cjs', 'metro.config.cjs'])])
                copiedFiles.push({ path: name, sha256: m113Sha(await readFile(join(consumer, name))) });
            owned = { source: sourceBefore.digest, artifact, copiedFiles, lockHash: m113Sha(await readFile(join(consumer, 'package-lock.json'))), mode: prepareOnly ? 'prepare-only' : 'full' };
            await writeFile(marker, JSON.stringify(owned, null, 2) + '\n');
        }
        assertM113SourceStable(owned.source, sourceBefore.digest);
        assertM113ArtifactIdentity(owned.artifact.sha256, m113Sha(await readFile(owned.artifact.tarball)));
        if (owned.mode !== (prepareOnly ? 'prepare-only' : 'full'))
            throw Error('Consumer mode cannot change within a cohort');
        if (m113Sha(await readFile(join(consumer, 'package-lock.json'))) !== owned.lockHash)
            throw Error('Generated consumer lock changed');
        for (const file of owned.copiedFiles)
            if (m113Sha(await readFile(join(consumer, file.path))) !== file.sha256)
                throw Error(`Copied fixture changed: ${file.path}`);
        await run(['npm', 'ci', '--no-audit', '--no-fund'], consumer, 'frozen-reproduction');
        const installed = await verifyInstalledArtifact(consumer, owned.artifact);
        assertM113InstalledRoot(await realpath(consumer), await realpath(installed.packageRoot));
        const resolutions = await verifyPackedExportMap(installed.packageRoot, consumer), graphs = await auditPackedRuntimeEntrypoints(installed.packageRoot);
        for (const subpath of ['./theme/motion', './theme/motion/native'])
            if (!resolutions.some(row => row.subpath === subpath))
                throw Error('Missing installed motion entry');
        const unpacked = join(output, 'artifact-unpacked');
        await mkdir(unpacked, { recursive: true });
        await run(['tar', '-xzf', owned.artifact.tarball, '--strip-components=1', '-C', unpacked], consumer, 'unpack');
        const artifactHashes: {
            path: string;
            sha256: string;
        }[] = [];
        async function inventory(dir: string) { for (const e of await readdir(dir, { withFileTypes: true })) {
            const file = join(dir, e.name);
            if (e.isDirectory())
                await inventory(file);
            else if (e.isFile()) {
                const path = relative(unpacked, file), expected = m113Sha(await readFile(file));
                if (expected !== m113Sha(await readFile(join(installed.packageRoot, path))))
                    throw Error(`Installed artifact differs: ${path}`);
                artifactHashes.push({ path, sha256: expected });
            }
            else
                throw Error('Unsupported artifact file');
        } }
        await inventory(unpacked);
        await cp(installed.packageRoot, join(dirname(installed.packageRoot), 'crumbs-css-copy'), { recursive: true });
        const req = createRequire(join(consumer, 'package.json')), versions = Object.fromEntries(['react', 'react-native', 'expo', 'react-test-renderer', 'typescript'].map(name => [name, req(`${name}/package.json`).version]));
        if (versions.react !== '19.2.3' || versions['react-native'] !== '0.85.3' || versions['react-test-renderer'] !== '19.2.3')
            throw Error('Peer identity differs');
        await run([join(consumer, 'node_modules/.bin/tsc'), '--noEmit'], consumer, 'installed-types');
        for (const order of ['esm-first', 'cjs-first'])
            await run(['bun', 'test', './test/motion.integration.tsx'], consumer, 'renderer-' + order, { CRUMBS_IMPORT_ORDER: order });
        const probe = await mkdtemp(join(tmpdir(), 'crumbs-m113-no-peers-'));
        await mkdir(join(probe, 'test'));
        await cp(join(consumer, 'test/motion.node.mjs'), join(probe, 'test/motion.node.mjs'));
        for (const name of ['crumbs-css', 'crumbs-css-copy'])
            await cp(installed.packageRoot, join(probe, 'node_modules/@opsydyn', name), { recursive: true });
        const floor = process.env.CRUMBS_AUDIT_NODE_FLOOR ?? '/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node';
        if (await run([floor, '--version'], consumer, 'floor-version') !== 'v22.0.0')
            throw Error('Genuine Node floor missing');
        for (const node of [floor, 'node'])
            for (const format of ['esm', 'cjs'])
                await run([node, 'test/motion.node.mjs', format], probe, 'pure-' + format + '-' + (node === floor ? 'floor' : 'current'));
        const control = JSON.parse(await readFile(join(consumer, 'test/motion-control-values.json'), 'utf8'));
        const values: Record<string, string[]> = {};
        for (const key of Object.keys(control.values)) {
            const target = control.exports[key].import;
            values[key] = Object.keys(await import(join(installed.packageRoot, target))).sort();
            if (JSON.stringify(values[key]) !== JSON.stringify(control.values[key]))
                throw Error(`Old value surface changed: ${key}`);
        }
        const currentManifest = JSON.parse(await readFile(join(installed.packageRoot, 'package.json'), 'utf8'));
        for (const [key, value] of Object.entries(control.exports))
            if (JSON.stringify(currentManifest.exports[key]) !== JSON.stringify(value))
                throw Error(`Old export/alias changed: ${key}`);
        receipt = { ...receipt, artifact: owned.artifact, installed, artifactHashes, graphs, resolutions, copiedFiles: owned.copiedFiles, lockHash: owned.lockHash, versions, nodeProbeRoot: probe, oldValueSurfaces: values, controlledRenderer: 'real React; synthetic public RN; isolated child processes' };
        if (!prepareOnly) {
            const authored = owned.copiedFiles.find((f: any) => f.path === 'src/motion-panel.css.ts');
            const transformer = await import(join(installed.packageRoot, 'dist/transformer.mjs'));
            for (const [platform, useStyleSheet] of [['native', true], ['web', false]] as const) {
                const code = await transformer.transformCssTsToStyleSheet(join(consumer, 'src/motion-panel.css.ts'), consumer, { useStyleSheet, includeStyleExplanations: false });
                await writeFile(join(consumer, `src/motion-panel.css.${platform}.js`), code);
            }
            await relocateM113AuthoredStyle(consumer, authored.sha256);
            const targets = [];
            for (const platform of ['ios', 'android', 'web'] as const) {
                const directory = join(consumer, 'exports', platform);
                await run([join(consumer, 'node_modules/.bin/expo'), 'export', '--platform', platform, '--source-maps', '--output-dir', directory], consumer, 'expo-' + platform);
                targets.push({ platform, directory });
            }
            const inventories = await verifyExpoBundleInventory(targets, consumer, repository, ['@opsydyn/crumbs-css']);
            for (const item of inventories)
                if (!item.packageSources['@opsydyn/crumbs-css']!.some(path => path.includes('theme-motion-native')))
                    throw Error('Expo did not exercise native motion');
            const nativeInputs = owned.copiedFiles.map((file: any) => file.path === 'src/motion-panel.css.ts' ? { ...file, path: 'authoring/motion-panel.css.ts' } : file);
            for (const platform of ['native', 'web']) {
                const path = `src/motion-panel.css.${platform}.js`;
                nativeInputs.push({ path, sha256: m113Sha(await readFile(join(consumer, path))) });
            }
            await verifyM113InputFiles(consumer, nativeInputs);
            receipt = { ...receipt, host: 'passed', inventories, nativeInputs };
        }
        for (const file of artifactHashes)
            if (m113Sha(await readFile(join(installed.packageRoot, file.path))) !== file.sha256)
                throw Error('Installed artifact changed: ' + file.path);
        assertM113ArtifactIdentity(owned.artifact.sha256, m113Sha(await readFile(owned.artifact.tarball)));
    }
    catch (error) {
        receipt = { ...receipt, host: 'failed', error: String(error) };
        throw error;
    }
    finally {
        const sourceAfter = await m113SourceIdentity();
        receipt = { ...receipt, sourceAfter, completedAt: new Date().toISOString() };
        if (sourceBefore.digest !== sourceAfter.digest)
            receipt = { ...receipt, host: 'failed', error: 'Source changed during qualification' };
        await writeFile(join(output, 'qualification.json'), JSON.stringify(receipt, null, 2) + '\n');
        assertM113SourceStable(sourceBefore.digest, sourceAfter.digest);
    }
    console.log(JSON.stringify({ consumerRoot: consumer, output, host: receipt.host, acceptance: receipt.acceptance }));
}
if (import.meta.main)
    await qualify(process.argv.slice(2));
