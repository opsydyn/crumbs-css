import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { defineExtension } from '../dist/extensions.mjs';
import { transformCssTsToStyleSheet } from '../dist/transformer.mjs';
import { m115Sha, m115SourceIdentity, m115FileInventory } from '../../../scripts/m11-5-qualification';
const repository = resolve(import.meta.dir, '../../..');
async function sample() {
    const sourceBefore = await m115SourceIdentity(), root = await mkdtemp(join(tmpdir(), 'crumbs-m115-cost-'));
    const runtime = Array.from({ length: 32 }, (_, i) => `export function create${i}(value){const start=performance.now();calls++;const result=function(){return value.value};factoryMs+=performance.now()-start;return result}`).join('\n') + '\nlet calls=0,factoryMs=0;export function getCalls(){return calls}export function getFactoryMs(){return factoryMs}\n';
    const rows: Record<string, unknown>[] = [], authoring: {
        count: number;
        elapsedMs: number;
        consumed: number;
    }[] = [];
    let consumed = 0;
    try {
        await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@crumbs/extension-bench', type: 'module', exports: { './runtime': './runtime.mjs' } }));
        await writeFile(join(root, 'runtime.mjs'), runtime);
        for (const count of [1, 32, 128]) {
            const factory = defineExtension<{
                create0(value: {
                    value: number;
                }): () => number;
            }>().factory({ importPath: '@crumbs/extension-bench/runtime', importName: 'create0' });
            const start = performance.now();
            for (let i = 0; i < count; i++) {
                const value = factory({ value: i });
                assert.equal(typeof value, 'function');
                consumed += i + 1;
            }
            authoring.push({ count, elapsedMs: performance.now() - start, consumed });
            for (const endpoints of [1, Math.min(count, 32)]) {
                if (endpoints === 1 && count === 1 && rows.length)
                    continue;
                const input = join(root, `case-${count}-${endpoints}.css.ts`), output = join(root, `case-${count}-${endpoints}.mjs`);
                const imports = `import {defineExtension} from ${JSON.stringify(join(repository, 'packages/css/dist/extensions.mjs'))};\n`;
                const factories = Array.from({ length: endpoints }, (_, i) => `const f${i}=defineExtension().factory({importPath:'@crumbs/extension-bench/runtime',importName:'create${i}'});`).join('\n');
                await writeFile(input, imports + factories + '\n' + Array.from({ length: count }, (_, i) => `export const item${i}=f${i % endpoints}({value:${i},nested:{padding:12,enabled:true}});`).join('\n'));
                const start = performance.now(), code = await transformCssTsToStyleSheet(input, root, { useStyleSheet: false, includeStyleExplanations: false });
                const compileMs = performance.now() - start;
                await writeFile(output, code);
                // Each workload runs in a fresh process. Cold import includes module snapshots and
                // reconstruction; first use is measured independently and consumes every callable.
                const probe = `const start=performance.now();const m=await import(${JSON.stringify(pathToFileURL(output).href)});const coldImportMs=performance.now()-start;const api=await import(${JSON.stringify(pathToFileURL(join(root, 'runtime.mjs')).href)});const use=performance.now();let consumed=0;const values=Object.entries(m).filter(([name])=>/^item\\d+$/.test(name)).map(([,fn])=>fn);for(const fn of values){if(typeof fn!=='function')throw Error('Benchmark export is not callable');consumed+=fn();}const firstUseMs=performance.now()-use;console.log(JSON.stringify({coldImportMs,firstUseMs,consumed,callableCount:values.length,factoryCalls:api.getCalls(),factoryBodyMs:api.getFactoryMs()}));`;
                const p = Bun.spawn([process.execPath, '--eval', probe], { cwd: root, stdout: 'pipe', stderr: 'pipe' }), [stdout, stderr, exit] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
                assert.equal(exit, 0, stderr);
                const timing = JSON.parse(stdout);
                assert.equal(timing.callableCount, count);
                assert.equal(timing.factoryCalls, count);
                assert.equal(timing.consumed, count * (count - 1) / 2);
                consumed += timing.consumed;
                const wrapperStart = performance.now(), manual = Array.from({ length: count }, (_, i) => { const snapshot = Object.freeze({ value: i, nested: Object.freeze({ padding: 12, enabled: true }) }); return () => snapshot.value; });
                const manualConstructionMs = performance.now() - wrapperStart, useStart = performance.now();
                const manualConsumed = manual.reduce((sum, fn) => sum + fn(), 0);
                const manualFirstUseMs = performance.now() - useStart;
                assert.equal(manualConsumed, timing.consumed);
                rows.push({ count, endpoints, compileMs, rawBytes: Buffer.byteLength(code), gzipBytes: gzipSync(code).length, generatedSha256: m115Sha(code), ...timing, manualConstructionMs, manualFirstUseMs, manualConsumed });
            }
        }
        assert(consumed > 0);
        const sourceAfter = await m115SourceIdentity();
        assert.equal(sourceBefore.digest, sourceAfter.digest);
        return { schema: 'crumbs.m11.5.cost.v1', sourceBefore, sourceAfter, artifactFiles: (await m115FileInventory(join(repository, 'packages/css/dist'))), runtime: { bun: Bun.version, node: process.version, executable: process.execPath, executableSha256: m115Sha(await readFile(process.execPath)) }, compileOptions:{useStyleSheet:false,includeStyleExplanations:false},fixture: { runtimeSha256: m115Sha(runtime), package: { name: '@crumbs/extension-bench', type: 'module', exports: { './runtime': './runtime.mjs' } } }, authoring, rows, consumed, limits: 'Host diagnostics; cold import includes one-time frozen literals and reconstruction. No numeric release gate or native FPS claim.' };
    }
    finally {
        await rm(root, { recursive: true, force: true });
    }
}
const args = process.argv.slice(2);
if (args[0] === '--sample') {
    await writeFile(resolve(args[1]!), JSON.stringify(await sample(), null, 2) + '\n');
}
else {
    assert(args[0] === '--output' && args[1], 'Usage: --output owned-empty-root');
    const output = resolve(args[1]!);
    await mkdir(output, { recursive: true });
    for (const n of [1, 2]) {
        const target = join(output, 'sample-' + n + '.json');
        const p = Bun.spawn([process.execPath, import.meta.path, '--sample', target], { stdout: 'pipe', stderr: 'pipe' });
        const [stdout, stderr, exit] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
        assert.equal(exit, 0, stdout + stderr);
    }
    console.log(JSON.stringify({ output, samples: 2 }));
}
