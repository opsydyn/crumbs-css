import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, readdir, realpath, writeFile, unlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { buildM115ExtensionFixture } from './build-m11-5-extension-fixture';
import { verifyInstalledArtifact, verifyExpoBundleInventory, assertNoWorkspaceOrLinkDependencies } from './packed-distribution-contract';
import { verifyPackedExportMap } from './packed-export-contract';
import { auditPackedRuntimeEntrypoints } from './packed-runtime-graph';
const repository = resolve(import.meta.dir, '..');
export const m115Sha = (data: string | Uint8Array) => createHash('sha256').update(data).digest('hex');
export type M115InputFile = {
    path: string;
    sha256: string;
};
export function assertM115Stable(expected: string, actual: string, kind: string) {
    if (expected !== actual)
        throw Error(kind + ' changed during M11.5 qualification');
}
export function assertM115OwnedRoot(entries: readonly string[], marker: unknown) {
    if (entries.length && (!marker || typeof marker !== 'object' || (marker as {
        schema?: unknown;
    }).schema !== 'crumbs.m11.5.owned.v1'))
        throw Error('Foreign nonempty consumer root has no M11.5 ownership');
}
export function assertM115LoadOrder(order: string, trace: readonly {
    kind: string;
    path: string;
}[]) {
    const first = order === 'cjs-first' ? 'require' : 'import';
    if (!['cjs-first', 'esm-first'].includes(order) || trace.length !== 2 || trace[0]?.kind !== first || trace[1]?.kind === first || !trace.every(t => t.path.endsWith('extensions.' + (t.kind === 'require' ? 'cjs' : 'mjs'))))
        throw Error('Actual extensions load order differs');
}
export async function verifyM115InputFiles(root: string, files: readonly M115InputFile[]) {
    const canonical = await realpath(root).catch(() => resolve(root));
    for (const file of files) {
        if (!file.path || file.path.split(/[\\/]/).includes('..') || file.path.startsWith('/') || file.path.includes('\\'))
            throw Error('Input escaped consumer');
        const path = resolve(root, file.path), actual = await realpath(path);
        if (!actual.startsWith(canonical + sep) || actual !== join(canonical, file.path))
            throw Error('Input escaped consumer');
        if (m115Sha(await readFile(path)) !== file.sha256)
            throw Error('Input changed: ' + file.path);
    }
    return files;
}
export async function m115SourceIdentity() {
    const child = Bun.spawn(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: repository, stdout: 'pipe', stderr: 'pipe' });
    const names = (await new Response(child.stdout).text()).split('\0').filter(p => /^(?:packages\/css\/(?:src|test|fixtures|bench)\/|scripts\/|apps\/(?:storybook|playground)\/(?:src|test)\/|docs\/src\/)/.test(p) || ['bun.lock', 'package.json', 'packages/css/package.json', 'packages/css/README.md', 'packages/css/COMPATIBILITY.md', 'packages/css/tsdown.config.ts', 'packages/css/build-policy.ts', 'apps/storybook/package.json', 'apps/storybook/tsconfig.json', 'apps/playground/tsconfig.json', 'apps/storybook/metro.config.js', 'apps/playground/metro.config.js', 'docs/astro.config.mjs'].includes(p)).sort();
    if (await child.exited !== 0)
        throw Error('Source inventory failed');
    const files = await Promise.all(names.map(async (path) => ({ path, sha256: m115Sha(await readFile(join(repository, path))) })));
    return { digest: m115Sha(JSON.stringify(files)), files };
}
export async function m115FileInventory(root: string) {
    const files: M115InputFile[] = [];
    async function walk(dir: string) {
        for (const entry of await readdir(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory())
                await walk(path);
            else if (entry.isFile())
                files.push({ path: relative(root, path), sha256: m115Sha(await readFile(path)) });
            else
                throw Error('Unsupported inventory file');
        }
    }
    await walk(root);
    return files.sort((a, b) => a.path.localeCompare(b.path));
}
export function m115BuiltExportNames(path: string, source: string) { const ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true); return ast.statements.flatMap(n => ts.isExportDeclaration(n) && n.exportClause && ts.isNamedExports(n.exportClause) ? n.exportClause.elements.filter(e => !e.isTypeOnly).map(e => e.name.text) : []).sort(); }
async function probeRuntimeBodyEdit(consumer: string, runtimeRoot: string, run: (command: string[], cwd: string, name: string) => Promise<string>) {
    const runtime = join(runtimeRoot, 'dist/runtime.mjs'), original = await readFile(runtime, 'utf8');
    const ast = ts.createSourceFile('runtime.mjs', original, ts.ScriptTarget.Latest, true);
    const candidates: ts.NumericLiteral[] = [];
    const visit = (node: ts.Node) => { if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken && node.left.getText(ast) === 'counts[kind]' && ts.isNumericLiteral(node.right) && node.right.text === '1')
        candidates.push(node.right); ts.forEachChild(node, visit); };
    visit(ast);
    if (candidates.length !== 1)
        throw Error('Runtime body edit seam is not unique');
    const target = candidates[0]!, edited = original.slice(0, target.getStart(ast)) + '2' + original.slice(target.end);
    const observations: {
        phase: string;
        runtimeSha256: string;
        bundleSha256: string;
        mapSha256: string;
    }[] = [];
    const exportPhase = async (phase: string, expected: string) => {
        const output = join(consumer, 'runtime-body-probe', phase);
        await run([join(consumer, 'node_modules/.bin/expo'), 'export', '--platform', 'ios', '--source-maps', '--clear', '--output-dir', output], consumer, 'runtime-body-' + phase);
        const files = await m115FileInventory(output), maps = files.filter(f => f.path.endsWith('.map'));
        let selected: string | undefined;
        for (const file of maps) {
            const map = JSON.parse(await readFile(join(output, file.path), 'utf8')), index = map.sources.findIndex((s: string) => s.endsWith('node_modules/@acme/crumbs-extensions/dist/runtime.mjs'));
            if (index >= 0) {
                if (map.sourcesContent[index] !== expected)
                    throw Error('Stock Metro runtime module content differs');
                selected = file.path;
                break;
            }
        }
        if (!selected)
            throw Error('Stock Metro runtime module is absent');
        const bundles = files.filter(f => /\.(?:js|hbc)$/.test(f.path));
        if (!bundles.length)
            throw Error('Stock Metro bundle is absent');
        observations.push({ phase, runtimeSha256: m115Sha(expected), bundleSha256: m115Sha(JSON.stringify(bundles)), mapSha256: m115Sha(await readFile(join(output, selected))) });
    };
    try {
        await exportPhase('baseline', original);
        await writeFile(runtime, edited);
        await exportPhase('edited', edited);
    }
    finally {
        await writeFile(runtime, original);
    }
    await exportPhase('restored', original);
    if (observations[0]!.bundleSha256 === observations[1]!.bundleSha256 || observations[0]!.runtimeSha256 !== observations[2]!.runtimeSha256)
        throw Error('Runtime edit or exact restoration was not observed');
    return { status: 'passed', kind: 'stock-Metro-runtime-body-dependency', observations };
}
export function assertM115HostReceipt(receipt: unknown): void {
    const r = receipt as {
        schema?: unknown;
        mode?: unknown;
        host?: unknown;
        sourceBefore?: {
            digest?: unknown;
        };
        sourceAfter?: {
            digest?: unknown;
        };
    };
    if (!r || r.schema !== 'crumbs.m11.5.qualification.v1' || r.mode !== 'full' || r.host !== 'passed' || !r.sourceBefore?.digest || r.sourceBefore.digest !== r.sourceAfter?.digest)
        throw Error('Passed full M11.5 host evidence required');
}
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
            throw Error('Usage: m11-5-qualification.ts [--prepare-only] --consumer-root owned-root --output receipt-root');
    }
    if (!consumer || !output)
        throw Error('Explicit owned consumer and output roots required');
    await mkdir(output, { recursive: true });
    const commands: Record<string, unknown>[] = [], sourceBefore = await m115SourceIdentity();
    const run = async (command: string[], cwd = consumer!, name = 'command', env: Record<string, string> = {}) => {
        const startedAt = new Date().toISOString();
        const child = Bun.spawn(command, { cwd, env: { ...process.env, CI: '1', NODE_PATH: '', EXPO_NO_METRO_WORKSPACE_ROOT: '1', NODE_OPTIONS: '--dns-result-order=ipv4first', ...env }, stdout: 'pipe', stderr: 'pipe' });
        const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
        const log = join(output!, `${commands.length}-${name}.log`);
        await writeFile(log, stdout + stderr);
        commands.push({ command, cwd, startedAt, exitCode, log, sha256: m115Sha(stdout + stderr) });
        if (exitCode !== 0)
            throw Error(name + ' exited ' + exitCode + '; ' + log);
        return stdout.trim();
    };
    let receipt: any = { schema: 'crumbs.m11.5.qualification.v1', mode: prepareOnly ? 'prepare-only' : 'full', sourceBefore, consumerRoot: consumer, commands, host: 'not-run', ios: 'not-run', android: 'not-run', acceptance: 'incomplete' };
    try {
        await mkdir(consumer, { recursive: true });
        const markerPath = join(consumer, '.m11-5-owned.json');
        let owned: any;
        try {
            owned = JSON.parse(await readFile(markerPath, 'utf8'));
        }
        catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'ENOENT')
                throw e;
        }
        assertM115OwnedRoot(await readdir(consumer), owned);
        if (!owned) {
            const artifacts = join(output, 'artifacts');
            await mkdir(artifacts, { recursive: true });
            const pack = JSON.parse(await run(['npm', 'pack', '--ignore-scripts', '--json', '--pack-destination', artifacts], join(repository, 'packages/css'), 'pack'))[0];
            const tarball = join(artifacts, pack.filename), tarBytes = await readFile(tarball), artifact = { name: pack.name, version: pack.version, tarball, sha256: m115Sha(tarBytes) };
            const fixtureRoot = join(artifacts, 'extension-package');
            const fixtureManifest = await buildM115ExtensionFixture(fixtureRoot);
            const extensionPack = JSON.parse(await run(['npm', 'pack', '--ignore-scripts', '--json', '--pack-destination', artifacts], fixtureRoot, 'pack-extension'))[0];
            const extensionTarball = join(artifacts, extensionPack.filename), extensionBytes = await readFile(extensionTarball), extensionArtifact = { name: extensionPack.name, version: extensionPack.version, tarball: extensionTarball, sha256: m115Sha(extensionBytes) };
            const template = join(repository, 'packages/css/fixtures/packed-distribution/app');
            const manifest = JSON.parse(await readFile(join(template, 'package.json'), 'utf8'));
            delete manifest.dependencies['@acme/design-tokens'];
            delete manifest.dependencies['@acme/ui'];
            manifest.name = 'crumbs-extensions-installed-consumer';
            manifest.type = 'module';
            manifest.dependencies[artifact.name] = 'file:' + tarball;
            manifest.dependencies[extensionArtifact.name] = 'file:' + extensionTarball;
            assertNoWorkspaceOrLinkDependencies(manifest);
            await writeFile(join(consumer, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
            const lock = JSON.parse(await readFile(join(template, 'test/extensions-peer-lock.json'), 'utf8'));
            lock.name = manifest.name;
            lock.packages[''] = { name: manifest.name, version: manifest.version, dependencies: manifest.dependencies, devDependencies: manifest.devDependencies };
            lock.packages['node_modules/' + artifact.name].resolved = 'file:' + tarball;
            lock.packages['node_modules/' + artifact.name].integrity = 'sha512-' + createHash('sha512').update(tarBytes).digest('base64');
            lock.packages['node_modules/' + extensionArtifact.name] = { version: extensionArtifact.version, resolved: 'file:' + extensionTarball, integrity: 'sha512-' + createHash('sha512').update(extensionBytes).digest('base64'), peerDependencies: fixtureManifest.peerDependencies };
            await writeFile(join(consumer, 'package-lock.json'), JSON.stringify(lock, null, 2) + '\n');
            await mkdir(join(consumer, 'test'));
            await mkdir(join(consumer, 'src'));
            for (const name of ['extensions.integration.mjs', 'extensions.node.mjs', 'extensions-control-values.json', 'extensions.compile.css.ts'])
                await cp(join(template, 'test', name), join(consumer, 'test', name));
            await cp(join(template, 'src/extensions.types.tsx'), join(consumer, 'src/extensions.types.tsx'));
            await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler', jsx: 'react-jsx', strict: true, exactOptionalPropertyTypes: true, noEmit: true, skipLibCheck: true }, include: ['src'] }, null, 2) + '\n');
            await writeFile(join(consumer, 'tsconfig.node16.json'), JSON.stringify({ extends: './tsconfig.json', compilerOptions: { module: 'Node16', moduleResolution: 'Node16' }, include: ['src/extensions.types.tsx'] }, null, 2) + '\n');
            if (!prepareOnly) {
                for (const name of ['extension-model.ts', 'extension-panel.css.ts', 'ExtensionPanel.tsx'])
                    await cp(join(repository, 'apps/storybook/src/components/runtime-extensions', name), join(consumer, 'src', name));
                const stylesheet = join(consumer, 'src/extension-panel.css.ts');
                await writeFile(stylesheet, (await readFile(stylesheet, 'utf8')).replace("from './authoring'", "from '@acme/crumbs-extensions/authoring'"));
                const panel = join(consumer, 'src/ExtensionPanel.tsx');
                await writeFile(panel, (await readFile(panel, 'utf8')).replace("from './runtime'", "from '@acme/crumbs-extensions/runtime'"));
                await cp(join(template, 'src/ExtensionApp.tsx'), join(consumer, 'src/ExtensionApp.tsx'));
                await writeFile(join(consumer, 'index.js'), "import {registerRootComponent} from 'expo';import {ExtensionApp} from './src/ExtensionApp';registerRootComponent(ExtensionApp);\n");
                await cp(join(template, 'babel.config.js'), join(consumer, 'babel.config.cjs'));
                await writeFile(join(consumer, 'metro.config.cjs'), "const {getDefaultConfig}=require('expo/metro-config');const {withNativeStyles}=require('@opsydyn/crumbs-css/metro-plugin');module.exports=withNativeStyles(getDefaultConfig(__dirname));\n");
                await writeFile(join(consumer, 'app.json'), JSON.stringify({ expo: { name: 'Crumbs M11.5 Extension', slug: 'crumbs-m115-extensions', version: '1.0.0', sdkVersion: '56.0.0', web: { bundler: 'metro' } } }, null, 2) + '\n');
            }
            const copiedFiles: M115InputFile[] = [];
            for (const dir of ['src', 'test'])
                for (const name of await readdir(join(consumer, dir)))
                    copiedFiles.push({ path: join(dir, name), sha256: m115Sha(await readFile(join(consumer, dir, name))) });
            for (const name of ['package.json', 'package-lock.json', 'tsconfig.json', 'tsconfig.node16.json', ...(prepareOnly ? [] : ['index.js', 'app.json', 'babel.config.cjs', 'metro.config.cjs'])])
                copiedFiles.push({ path: name, sha256: m115Sha(await readFile(join(consumer, name))) });
            owned = { schema: 'crumbs.m11.5.owned.v1', source: sourceBefore.digest, artifact, extensionArtifact, copiedFiles, lockHash: m115Sha(await readFile(join(consumer, 'package-lock.json'))), mode: prepareOnly ? 'prepare-only' : 'full' };
            await writeFile(markerPath, JSON.stringify(owned, null, 2) + '\n');
        }
        assertM115Stable(owned.source, sourceBefore.digest, 'Source');
        if (owned.mode !== (prepareOnly ? 'prepare-only' : 'full'))
            throw Error('Consumer mode changed');
        assertM115Stable(owned.artifact.sha256, m115Sha(await readFile(owned.artifact.tarball)), 'Artifact');
        await verifyM115InputFiles(consumer, owned.copiedFiles);
        await run(['npm', 'ci', '--no-audit', '--no-fund'], consumer, 'frozen-install');
        assertM115Stable(owned.lockHash, m115Sha(await readFile(join(consumer, 'package-lock.json'))), 'Lock');
        const installed = await verifyInstalledArtifact(consumer, owned.artifact);
        assertM115Stable(owned.extensionArtifact.sha256, m115Sha(await readFile(owned.extensionArtifact.tarball)), 'Extension artifact');
        const runtimePackageRoot = join(consumer, 'node_modules/@acme/crumbs-extensions');
        if (await realpath(runtimePackageRoot) !== join(await realpath(consumer), 'node_modules/@acme/crumbs-extensions'))
            throw Error('Runtime package escaped consumer');
        const runtimeUnpacked = join(output, 'runtime-unpacked');
        await mkdir(runtimeUnpacked, { recursive: true });
        await run(['tar', '-xzf', owned.extensionArtifact.tarball, '--strip-components=1', '-C', runtimeUnpacked], consumer, 'unpack-runtime');
        const runtimePackageFiles = await m115FileInventory(runtimeUnpacked);
        await verifyM115InputFiles(runtimePackageRoot, runtimePackageFiles);
        if (await realpath(installed.packageRoot) !== join(await realpath(consumer), 'node_modules/@opsydyn/crumbs-css'))
            throw Error('Installed package escaped consumer');
        const resolutions = await verifyPackedExportMap(installed.packageRoot, consumer), graphs = await auditPackedRuntimeEntrypoints(installed.packageRoot);
        const unpacked = join(output, 'artifact-unpacked');
        await mkdir(unpacked, { recursive: true });
        await run(['tar', '-xzf', owned.artifact.tarball, '--strip-components=1', '-C', unpacked], consumer, 'unpack');
        const artifactHashes = await m115FileInventory(unpacked);
        await verifyM115InputFiles(installed.packageRoot, artifactHashes);
        const copyRoot = join(dirname(installed.packageRoot), 'crumbs-css-copy');
        await cp(installed.packageRoot, copyRoot, { recursive: true });
        await verifyM115InputFiles(copyRoot, artifactHashes);
        if (await realpath(copyRoot) === await realpath(installed.packageRoot))
            throw Error('Second copy is not physical');
        const req = createRequire(join(consumer, 'package.json'));
        const versions = Object.fromEntries(['react', 'react-native', 'expo', 'metro', 'react-test-renderer', 'typescript'].map(name => [name, req(name + '/package.json').version]));
        for (const [name, want] of Object.entries({ react: '19.2.3', 'react-native': '0.85.3', expo: '56.0.4', metro: '0.87.1', 'react-test-renderer': '19.2.3', typescript: '6.0.3' }))
            if (versions[name] !== want)
                throw Error('Peer identity differs: ' + name);
        await run([join(consumer, 'node_modules/.bin/tsc'), '--noEmit'], consumer, 'installed-types-bundler');
        await run([join(consumer, 'node_modules/.bin/tsc'), '--noEmit', '--project', 'tsconfig.node16.json'], consumer, 'installed-types-node16');
        const installedTransformer = await import(join(installed.packageRoot, 'dist/transformer.mjs'));
        const pureSource = join(consumer, 'test/extensions.compile.css.ts');
        const pureCode = await installedTransformer.transformCssTsToStyleSheet(pureSource, consumer, { useStyleSheet: false, includeStyleExplanations: false });
        const pureOutput = join(consumer, 'test/extensions.compiled.mjs');
        await writeFile(pureOutput, pureCode);
        const pureControl = await import(join(runtimePackageRoot, 'dist/pure-runtime.mjs'));
        const compiled = await import(pureOutput);
        if (compiled.first !== compiled.alias || compiled.nested[0] !== compiled.first || compiled.second === compiled.first || pureControl.calls.length !== 2 || !pureControl.calls.every((call: any) => call.argc === 3 && call.thisValue === undefined))
            throw Error('Installed reconstruction identity/arity/this differs');
        for (const factory of [compiled.first, compiled.second]) {
            const args = factory();
            if (args[0].opacity !== 0.5 || Object.getPrototypeOf(args[1]) !== null || !Object.hasOwn(args[1], 'missing') || !Object.is(args[1].n, -0) || !Object.isFrozen(args[0]) || !Object.isFrozen(args[1]))
                throw Error('Installed argument semantics differ');
        }
        const compiledData = { sourceSha256: m115Sha(await readFile(pureSource)), sha256: m115Sha(pureCode), copies: 2, reconstructions: 2, status: 'passed' };
        const loadTraces = [];
        for (const order of ['esm-first', 'cjs-first']) {
            const trace = JSON.parse(await run(['node', 'test/extensions.integration.mjs', order], consumer, 'integration-' + order));
            assertM115LoadOrder(order, trace.trace);
            loadTraces.push(trace);
        }
        const probe = await mkdtemp(join(tmpdir(), 'crumbs-m115-no-peers-'));
        await mkdir(join(probe, 'test'));
        await cp(join(consumer, 'test/extensions.node.mjs'), join(probe, 'test/extensions.node.mjs'));
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
                const result = JSON.parse(await run([node, 'test/extensions.node.mjs', format], probe, 'pure-' + format + '-' + (node === floor ? 'floor' : 'current')));
                assertM115LoadOrder(format === 'cjs' ? 'cjs-first' : 'esm-first', result.trace);
                pureProbes.push(result);
            }
        const control = JSON.parse(await readFile(join(consumer, 'test/extensions-control-values.json'), 'utf8')), currentManifest = JSON.parse(await readFile(join(installed.packageRoot, 'package.json'), 'utf8'));
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
                const names = m115BuiltExportNames(value.import, await readFile(join(installed.packageRoot, value.import), 'utf8'));
                if (JSON.stringify(names) !== JSON.stringify(value.values))
                    throw Error('Old values changed: ' + key);
                oldValueSurfaces[key] = names;
            }
        }
        receipt = { ...receipt, artifact: owned.artifact, extensionArtifact: owned.extensionArtifact, runtimePackageRoot, runtimePackageFiles, installed, copyRoot, artifactHashes, graphs, resolutions, copiedFiles: owned.copiedFiles, lockHash: owned.lockHash, versions, nodeProbeRoot: probe, compiledData, nodeVersions: { floor: 'v22.0.0', current: currentVersion }, loadTraces, pureProbes, oldValueSurfaces };
        await rm(probe, { recursive: true, force: true });
        let finalInputs = [...owned.copiedFiles, { path: 'test/extensions.compiled.mjs', sha256: m115Sha(pureCode) }];
        if (!prepareOnly) {
            const file = join(consumer, 'src/extension-panel.css.ts'), transformer = await import(join(installed.packageRoot, 'dist/transformer.mjs'));
            for (const [platform, useStyleSheet] of [['native', true], ['web', false]] as const) {
                const code = await transformer.transformCssTsToStyleSheet(file, consumer, { useStyleSheet, includeStyleExplanations: false });
                await writeFile(join(consumer, `src/extension-panel.css.${platform}.js`), code);
            }
            await mkdir(join(consumer, 'authoring'));
            await cp(file, join(consumer, 'authoring/extension-panel.css.ts'));
            await unlink(file);
            const targets = [];
            for (const platform of ['ios', 'android', 'web'] as const) {
                const directory = join(consumer, 'exports', platform);
                await run([join(consumer, 'node_modules/.bin/expo'), 'export', '--platform', platform, '--source-maps', '--output-dir', directory], consumer, 'expo-' + platform);
                targets.push({ platform, directory });
            }
            const inventories = await verifyExpoBundleInventory(targets, consumer, repository, ['@opsydyn/crumbs-css', '@acme/crumbs-extensions']);
            for (const inventory of inventories)
                if (!inventory.packageSources['@acme/crumbs-extensions']?.some(p => p.endsWith('/runtime.mjs')))
                    throw Error('Expo runtime endpoint differs from verified ESM target');
            const runtimeBodyEdit = await probeRuntimeBodyEdit(consumer, runtimePackageRoot, run);
            for (const inventory of inventories)
                if (!inventory.packageSources['@opsydyn/crumbs-css']!.some(p => p.includes('theme-core')))
                    throw Error('Expo did not exercise existing theme runtime');
            finalInputs = finalInputs.map((f: M115InputFile) => f.path === 'src/extension-panel.css.ts' ? { ...f, path: 'authoring/extension-panel.css.ts' } : f);
            for (const platform of ['native', 'web']) {
                const path = `src/extension-panel.css.${platform}.js`;
                finalInputs.push({ path, sha256: m115Sha(await readFile(join(consumer, path))) });
            }
            const exportInputs = await m115FileInventory(join(consumer, 'exports'));
            for (const f of exportInputs)
                finalInputs.push({ ...f, path: 'exports/' + f.path });
            receipt = { ...receipt, inventories, runtimeBodyEdit, nativeInputs: finalInputs, host: 'passed' };
        }
        await verifyM115InputFiles(consumer, finalInputs);
        await verifyM115InputFiles(installed.packageRoot, artifactHashes);
        await verifyM115InputFiles(copyRoot, artifactHashes);
        await verifyM115InputFiles(runtimePackageRoot, runtimePackageFiles);
        assertM115Stable(owned.extensionArtifact.sha256, m115Sha(await readFile(owned.extensionArtifact.tarball)), 'Runtime artifact');
        assertM115Stable(owned.artifact.sha256, m115Sha(await readFile(owned.artifact.tarball)), 'Artifact');
    }
    catch (error) {
        receipt = { ...receipt, host: 'failed', error: String(error) };
        throw error;
    }
    finally {
        const sourceAfter = await m115SourceIdentity();
        receipt = { ...receipt, preparation: receipt.host === 'failed' ? 'failed' : 'passed', sourceAfter, completedAt: new Date().toISOString() };
        if (sourceBefore.digest !== sourceAfter.digest)
            receipt = { ...receipt, host: 'failed', error: 'Source changed during qualification' };
        await writeFile(join(output, 'qualification.json'), JSON.stringify(receipt, null, 2) + '\n');
        assertM115Stable(sourceBefore.digest, sourceAfter.digest, 'Source');
    }
    console.log(JSON.stringify({ consumerRoot: consumer, output, host: receipt.host, mode: receipt.mode, acceptance: receipt.acceptance }));
}
if (import.meta.main)
    await qualify(process.argv.slice(2));
