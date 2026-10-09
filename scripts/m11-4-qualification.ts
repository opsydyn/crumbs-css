import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { verifyInstalledArtifact, verifyExpoBundleInventory, assertNoWorkspaceOrLinkDependencies } from './packed-distribution-contract';
import { verifyPackedExportMap } from './packed-export-contract';
import { auditPackedRuntimeEntrypoints } from './packed-runtime-graph';
const repository = resolve(import.meta.dir, '..');
export const m114Sha = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
export type M114InputFile = {
    path: string;
    sha256: string;
};
export function assertM114Stable(expected: string, actual: string, kind: string) { if (expected !== actual)
    throw Error(kind + ' changed during M11.4 qualification'); }
export function assertM114OwnedRoot(entries: readonly string[], marker: unknown) { if (entries.length && (!marker || typeof marker !== 'object' || (marker as {
    schema?: unknown;
}).schema !== 'crumbs.m11.4.owned.v1'))
    throw Error('Foreign nonempty consumer root has no M11.4 ownership'); }
export function assertM114LoadOrder(order: string, trace: readonly {
    kind: string;
    path: string;
}[]) { const first = order === 'cjs-first' ? 'require' : 'import'; if (!['cjs-first', 'esm-first'].includes(order) || trace.length !== 2 || trace[0]?.kind !== first || trace[1]?.kind === first || !trace.every(t => t.path.endsWith('tokens-algebra.' + (t.kind === 'require' ? 'cjs' : 'mjs'))))
    throw Error('Actual algebra load order differs'); }
export async function verifyM114InputFiles(root: string, files: readonly M114InputFile[]) { const canonical = await realpath(root).catch(() => resolve(root)); for (const file of files) {
    if (!file.path || file.path.split(/[\\/]/).includes('..') || file.path.startsWith('/') || file.path.includes('\\'))
        throw Error('Input escaped consumer');
    const path = resolve(root, file.path), actual = await realpath(path);
    if (!actual.startsWith(canonical + sep) || actual !== join(canonical, file.path))
        throw Error('Input escaped consumer');
    if (m114Sha(await readFile(path)) !== file.sha256)
        throw Error('Input changed: ' + file.path);
} return files; }
export async function m114SourceIdentity() { const child = Bun.spawn(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: repository, stdout: 'pipe', stderr: 'pipe' }); const names = (await new Response(child.stdout).text()).split('\0').filter(p => /^(?:packages\/css\/(?:src|test|fixtures|bench)\/|scripts\/|apps\/(?:storybook|playground)\/(?:src|test)\/|docs\/src\/)/.test(p) || ['bun.lock', 'package.json', 'packages/css/package.json', 'packages/css/README.md', 'packages/css/COMPATIBILITY.md', 'packages/css/tsdown.config.ts', 'packages/css/build-policy.ts', 'apps/storybook/tsconfig.json', 'apps/playground/tsconfig.json', 'apps/storybook/metro.config.js', 'apps/playground/metro.config.js', 'docs/astro.config.mjs'].includes(p)).sort(); if (await child.exited !== 0)
    throw Error('Source inventory failed'); const files = await Promise.all(names.map(async (path) => ({ path, sha256: m114Sha(await readFile(join(repository, path))) }))); return { digest: m114Sha(JSON.stringify(files)), files }; }
export async function m114FileInventory(root: string) { const files: M114InputFile[] = []; async function walk(dir: string) { for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
        await walk(path);
    else if (entry.isFile())
        files.push({ path: relative(root, path), sha256: m114Sha(await readFile(path)) });
    else
        throw Error('Unsupported inventory file');
} } await walk(root); return files.sort((a, b) => a.path.localeCompare(b.path)); }
export function m114BuiltExportNames(path: string, source: string) { const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true); return ast.statements.flatMap(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause) ? n.exportClause.elements.filter(e => !e.isTypeOnly).map(e => e.name.text) : []).sort(); }
async function qualify(args: string[]) {
    let consumer: string | undefined, output: string | undefined, prepareOnly = false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--consumer-root')
            consumer = resolve(args[++i]!);
        else if (args[i] === '--output')
            output = resolve(args[++i]!);
        else if (args[i] === '--prepare-only')
            prepareOnly = true;
        else
            throw Error('Usage: m11-4-qualification.ts [--prepare-only] --consumer-root owned-root --output receipt-root');
    }
    if (!consumer || !output)
        throw Error('Explicit owned consumer and output roots required');
    await mkdir(output, { recursive: true });
    const commands: Record<string, unknown>[] = [], sourceBefore = await m114SourceIdentity();
    const run = async (command: string[], cwd = consumer!, name = 'command', env: Record<string, string> = {}) => { const startedAt = new Date().toISOString(); const child = Bun.spawn(command, { cwd, env: { ...process.env, CI: '1', NODE_PATH: '', EXPO_NO_METRO_WORKSPACE_ROOT: '1', NODE_OPTIONS: '--dns-result-order=ipv4first', ...env }, stdout: 'pipe', stderr: 'pipe' }); const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]); const log = join(output!, `${commands.length}-${name}.log`); await writeFile(log, stdout + stderr); commands.push({ command, cwd, startedAt, exitCode, log, sha256: m114Sha(stdout + stderr) }); if (exitCode !== 0)
        throw Error(name + ' exited ' + exitCode + '; ' + log); return stdout.trim(); };
    let receipt: any = { schema: 'crumbs.m11.4.qualification.v1', mode: prepareOnly ? 'prepare-only' : 'full', sourceBefore, consumerRoot: consumer, commands, host: 'not-run', ios: 'not-run', android: 'not-run', acceptance: 'incomplete' };
    try {
        await mkdir(consumer, { recursive: true });
        const markerPath = join(consumer, '.m11-4-owned.json');
        let owned: any;
        try {
            owned = JSON.parse(await readFile(markerPath, 'utf8'));
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
                throw e;
        }
        assertM114OwnedRoot(await readdir(consumer), owned);
        if (!owned) {
            const artifacts = join(output, 'artifacts');
            await mkdir(artifacts, { recursive: true });
            const pack = JSON.parse(await run(['npm', 'pack', '--ignore-scripts', '--json', '--pack-destination', artifacts], join(repository, 'packages/css'), 'pack'))[0];
            const tarball = join(artifacts, pack.filename), tarBytes = await readFile(tarball), artifact = { name: pack.name, version: pack.version, tarball, sha256: m114Sha(tarBytes) };
            const template = join(repository, 'packages/css/fixtures/packed-distribution/app');
            const manifest = JSON.parse(await readFile(join(template, 'package.json'), 'utf8'));
            delete manifest.dependencies['@acme/design-tokens'];
            delete manifest.dependencies['@acme/ui'];
            manifest.name = 'crumbs-algebra-installed-consumer';
            manifest.dependencies[artifact.name] = 'file:' + tarball;
            assertNoWorkspaceOrLinkDependencies(manifest);
            await writeFile(join(consumer, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
            const lock = JSON.parse(await readFile(join(template, 'test/algebra-peer-lock.json'), 'utf8'));
            lock.name = manifest.name;
            lock.packages[''] = { name: manifest.name, version: manifest.version, dependencies: manifest.dependencies, devDependencies: manifest.devDependencies };
            lock.packages['node_modules/' + artifact.name].resolved = 'file:' + tarball;
            lock.packages['node_modules/' + artifact.name].integrity = 'sha512-' + createHash('sha512').update(tarBytes).digest('base64');
            await writeFile(join(consumer, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
            await mkdir(join(consumer, 'test'));
            await mkdir(join(consumer, 'src'));
            for (const name of ['algebra.integration.mjs', 'algebra.node.mjs', 'algebra-control-values.json', 'algebra-font-layout.bun.mjs'])
                await cp(join(template, 'test', name), join(consumer, 'test', name));
            await cp(join(template, 'src/algebra.types.tsx'), join(consumer, 'src/algebra.types.tsx'));
            await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, exactOptionalPropertyTypes: true, noEmit: true, skipLibCheck: true }, include: ['src'] }, null, 2) + '\n');
            if (!prepareOnly) {
                for (const name of ['algebra-model.ts', 'algebra-panel.css.ts', 'AlgebraPanel.tsx'])
                    await cp(join(repository, 'apps/storybook/src/components/token-algebra', name), join(consumer, 'src', name));
                await cp(join(template, 'src/AlgebraApp.tsx'), join(consumer, 'src/AlgebraApp.tsx'));
                await writeFile(join(consumer, 'index.js'), "import {registerRootComponent} from 'expo';import {AlgebraApp} from './src/AlgebraApp';registerRootComponent(AlgebraApp);\n");
                await cp(join(template, 'babel.config.js'), join(consumer, 'babel.config.cjs'));
                await writeFile(join(consumer, 'metro.config.cjs'), "const {getDefaultConfig}=require('expo/metro-config');const {withNativeStyles}=require('@opsydyn/crumbs-css/metro-plugin');module.exports=withNativeStyles(getDefaultConfig(__dirname));\n");
                await writeFile(join(consumer, 'app.json'), JSON.stringify({ expo: { name: 'Crumbs M11.4 Algebra', slug: 'crumbs-m114-algebra', version: '1.0.0', sdkVersion: '56.0.0', web: { bundler: 'metro' } } }, null, 2) + '\n');
            }
            const copiedFiles: M114InputFile[] = [];
            for (const dir of ['src', 'test'])
                for (const name of await readdir(join(consumer, dir)))
                    copiedFiles.push({ path: join(dir, name), sha256: m114Sha(await readFile(join(consumer, dir, name))) });
            for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', ...(prepareOnly ? [] : ['index.js', 'app.json', 'babel.config.cjs', 'metro.config.cjs'])])
                copiedFiles.push({ path: name, sha256: m114Sha(await readFile(join(consumer, name))) });
            owned = { schema: 'crumbs.m11.4.owned.v1', source: sourceBefore.digest, artifact, copiedFiles, lockHash: m114Sha(await readFile(join(consumer, 'package-lock.json'))), mode: prepareOnly ? 'prepare-only' : 'full' };
            await writeFile(markerPath, JSON.stringify(owned, null, 2) + '\n');
        }
        assertM114Stable(owned.source, sourceBefore.digest, 'Source');
        if (owned.mode !== (prepareOnly ? 'prepare-only' : 'full'))
            throw Error('Consumer mode changed');
        assertM114Stable(owned.artifact.sha256, m114Sha(await readFile(owned.artifact.tarball)), 'Artifact');
        await verifyM114InputFiles(consumer, owned.copiedFiles);
        await run(['npm', 'ci', '--no-audit', '--no-fund'], consumer, 'frozen-install');
        assertM114Stable(owned.lockHash, m114Sha(await readFile(join(consumer, 'package-lock.json'))), 'Lock');
        const installed = await verifyInstalledArtifact(consumer, owned.artifact);
        if (await realpath(installed.packageRoot) !== join(await realpath(consumer), 'node_modules/@opsydyn/crumbs-css'))
            throw Error('Installed package escaped consumer');
        const resolutions = await verifyPackedExportMap(installed.packageRoot, consumer), graphs = await auditPackedRuntimeEntrypoints(installed.packageRoot);
        const unpacked = join(output, 'artifact-unpacked');
        await mkdir(unpacked, { recursive: true });
        await run(['tar', '-xzf', owned.artifact.tarball, '--strip-components=1', '-C', unpacked], consumer, 'unpack');
        const artifactHashes = await m114FileInventory(unpacked);
        await verifyM114InputFiles(installed.packageRoot, artifactHashes);
        const copyRoot = join(dirname(installed.packageRoot), 'crumbs-css-copy');
        await cp(installed.packageRoot, copyRoot, { recursive: true });
        await verifyM114InputFiles(copyRoot, artifactHashes);
        if (await realpath(copyRoot) === await realpath(installed.packageRoot))
            throw Error('Second copy is not physical');
        const req = createRequire(join(consumer, 'package.json'));
        const versions = Object.fromEntries(['react', 'react-native', 'expo', 'metro', 'react-test-renderer', 'typescript'].map(name => [name, req(name + '/package.json').version]));
        for (const [name, want] of Object.entries({ react: '19.2.3', 'react-native': '0.85.3', expo: '56.0.4', metro: '0.87.1', 'react-test-renderer': '19.2.3', typescript: '6.0.3' }))
            if (versions[name] !== want)
                throw Error('Peer identity differs: ' + name);
        await run([join(consumer, 'node_modules/.bin/tsc'), '--noEmit'], consumer, 'installed-types');
        const loadTraces = [];
        for (const order of ['esm-first', 'cjs-first']) {
            const trace = JSON.parse(await run(['node', 'test/algebra.integration.mjs', order], consumer, 'integration-' + order));
            assertM114LoadOrder(order, trace.trace);
            loadTraces.push(trace);
        }
        const probe = await mkdtemp(join(tmpdir(), 'crumbs-m114-no-peers-'));
        await mkdir(join(probe, 'test'));
        await cp(join(consumer, 'test/algebra.node.mjs'), join(probe, 'test/algebra.node.mjs'));
        for (const name of ['crumbs-css', 'crumbs-css-copy'])
            await cp(installed.packageRoot, join(probe, 'node_modules/@opsydyn', name), { recursive: true });
        const floor = process.env.CRUMBS_AUDIT_NODE_FLOOR ?? '/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node';
        const current = process.env.CRUMBS_AUDIT_NODE_CURRENT ?? '/Users/alancurrie/.local/share/fnm/node-versions/v24.15.0/installation/bin/node';
        if (await run([floor, '--version'], consumer, 'floor-version') !== 'v22.0.0')
            throw Error('Genuine Node floor missing');
        const currentVersion = await run([current, '--version'], consumer, 'current-version');
        const pureProbes = [];
        for (const node of [floor, current])
            for (const format of ['esm', 'cjs']) {
                const result = JSON.parse(await run([node, 'test/algebra.node.mjs', format], probe, 'pure-' + format + '-' + (node === floor ? 'floor' : 'current')));
                assertM114LoadOrder(format === 'cjs' ? 'cjs-first' : 'esm-first', result.trace);
                pureProbes.push(result);
            }
        const control = JSON.parse(await readFile(join(consumer, 'test/algebra-control-values.json'), 'utf8')), currentManifest = JSON.parse(await readFile(join(installed.packageRoot, 'package.json'), 'utf8'));
        const oldValueSurfaces: Record<string, string[]> = {};
        for (const [key, value] of Object.entries(control.entries) as [
            string,
            any
        ][]) {
            const m = currentManifest.exports[key];
            if (value.target) {
                if (m !== value.target)
                    throw Error('Old alias changed');
            }
            else {
                if (m.import !== value.import || m.require !== value.require)
                    throw Error('Old target changed');
                const names = m114BuiltExportNames(value.import, await readFile(join(installed.packageRoot, value.import), 'utf8'));
                if (JSON.stringify(names) !== JSON.stringify(value.values))
                    throw Error('Old values changed: ' + key);
                oldValueSurfaces[key] = names;
            }
        }
        receipt = { ...receipt, artifact: owned.artifact, installed, copyRoot, artifactHashes, graphs, resolutions, copiedFiles: owned.copiedFiles, lockHash: owned.lockHash, versions, nodeProbeRoot: probe, nodeVersions: { floor: 'v22.0.0', current: currentVersion }, loadTraces, pureProbes, oldValueSurfaces };
        let finalInputs = owned.copiedFiles;
        if (!prepareOnly) {
            await run(['bun', 'test/algebra-font-layout.bun.mjs'], consumer, 'font-layout-lifecycle');
            const file = join(consumer, 'src/algebra-panel.css.ts'), transformer = await import(join(installed.packageRoot, 'dist/transformer.mjs'));
            for (const [platform, useStyleSheet] of [['native', true], ['web', false]] as const) {
                const code = await transformer.transformCssTsToStyleSheet(file, consumer, { useStyleSheet, includeStyleExplanations: false });
                await writeFile(join(consumer, `src/algebra-panel.css.${platform}.js`), code);
            }
            await mkdir(join(consumer, 'authoring'));
            await cp(file, join(consumer, 'authoring/algebra-panel.css.ts'));
            await unlink(file);
            const targets = [];
            for (const platform of ['ios', 'android', 'web'] as const) {
                const directory = join(consumer, 'exports', platform);
                await run([join(consumer, 'node_modules/.bin/expo'), 'export', '--platform', platform, '--source-maps', '--output-dir', directory], consumer, 'expo-' + platform);
                targets.push({ platform, directory });
            }
            const inventories = await verifyExpoBundleInventory(targets, consumer, repository, ['@opsydyn/crumbs-css']);
            for (const inventory of inventories)
                if (!inventory.packageSources['@opsydyn/crumbs-css']!.some(p => p.includes('tokens-algebra')))
                    throw Error('Expo did not exercise algebra');
            finalInputs = owned.copiedFiles.map((f: M114InputFile) => f.path === 'src/algebra-panel.css.ts' ? { ...f, path: 'authoring/algebra-panel.css.ts' } : f);
            for (const platform of ['native', 'web']) {
                const path = `src/algebra-panel.css.${platform}.js`;
                finalInputs.push({ path, sha256: m114Sha(await readFile(join(consumer, path))) });
            }
            const exportInputs = await m114FileInventory(join(consumer, 'exports'));
            for (const f of exportInputs)
                finalInputs.push({ ...f, path: 'exports/' + f.path });
            receipt = { ...receipt, inventories, nativeInputs: finalInputs, host: 'passed' };
        }
        await verifyM114InputFiles(consumer, finalInputs);
        await verifyM114InputFiles(installed.packageRoot, artifactHashes);
        await verifyM114InputFiles(copyRoot, artifactHashes);
        assertM114Stable(owned.artifact.sha256, m114Sha(await readFile(owned.artifact.tarball)), 'Artifact');
    }
    catch (error) {
        receipt = { ...receipt, host: 'failed', error: String(error) };
        throw error;
    }
    finally {
        const sourceAfter = await m114SourceIdentity();
        receipt = { ...receipt, sourceAfter, completedAt: new Date().toISOString() };
        if (sourceBefore.digest !== sourceAfter.digest)
            receipt = { ...receipt, host: 'failed', error: 'Source changed during qualification' };
        await writeFile(join(output, 'qualification.json'), JSON.stringify(receipt, null, 2) + '\n');
        assertM114Stable(sourceBefore.digest, sourceAfter.digest, 'Source');
    }
    console.log(JSON.stringify({ consumerRoot: consumer, output, host: receipt.host, mode: receipt.mode, acceptance: receipt.acceptance }));
}
if (import.meta.main)
    await qualify(process.argv.slice(2));
