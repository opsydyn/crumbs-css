import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import * as api from '../dist/tokens-algebra.mjs';
const root = resolve(import.meta.dir, '..');
let consumed = 0;
const workloads: Record<string, unknown>[] = [];
function measure(name: string, count: number, run: () => void) { const start = performance.now(); for (let i = 0; i < count; i++)
    run(); workloads.push({ name, count, elapsedMs: performance.now() - start, consumed }); }
measure('colour-construct-mix-replace-attenuate-emit', 10000, () => { const c = api.createColor('#0000ff40'), mixed = api.mixColor(c, api.createColor('#ffffff'), { ratio: .5, space: 'srgb-linear' }), emitted = api.toNativeColor(api.multiplyColorAlpha(api.setColorAlpha(mixed, .5), .5)); assert.equal(emitted.length, 9); assert.equal(emitted.slice(-2), '40'); consumed += parseInt(emitted.slice(1, 3), 16); });
measure('typography-construct-scale-emit', 10000, () => { const c = api.createTypography({ fontSize: 16, lineHeight: { ratio: 1.5 }, letterSpacing: -.25 }), v = api.toNativeTypography(api.scaleTypography(c, 1.25)); assert.equal(v.fontSize, 20); assert.equal(v.lineHeight, 30); consumed += v.fontSize + v.lineHeight + v.letterSpacing; });
for (const count of [3, 32]) {
    const steps = Object.fromEntries(Array.from({ length: count }, (_, i) => ['n' + i, i % 3 - 1]));
    const base = api.createTypography({ fontSize: 16, lineHeight: { ratio: 1.5 }, letterSpacing: -.25 });
    measure('typography-scale-' + count, 1000, () => { const map = api.createTypographyScale as (value: api.Typography, options: {
        ratio: number;
        steps: Record<string, number>;
    }) => Record<string, api.Typography>; const result = map(base, { ratio: 1.25, steps }); assert.equal(Object.keys(result).length, count); for (const v of Object.values(result)) {
        assert(v.fontSize > 0 && v.fontSize < 30);
        consumed += v.fontSize;
    } });
}
assert(Number.isFinite(consumed) && consumed > 0);
const sizes = ['mjs', 'cjs'].map(ext => { const bytes = readFileSync(join(root, 'dist/tokens-algebra.' + ext)); return { format: ext === 'mjs' ? 'esm' : 'cjs', bytes: bytes.length, gzipBytes: gzipSync(bytes).length, sha256: createHash('sha256').update(bytes).digest('hex') }; });
const pure = mkdtempSync(join(tmpdir(), 'crumbs-m114-cold-'));
const cold = [];
try {
    for (const ext of ['mjs', 'cjs'])
        cpSync(join(root, 'dist/tokens-algebra.' + ext), join(pure, 'algebra.' + ext));
    for (const version of ['v22.0.0', 'v24.15.0'])
        for (const format of ['esm', 'cjs']) {
            const node = '/Users/alancurrie/.local/share/fnm/node-versions/' + version + '/installation/bin/node', code = format === 'esm' ? "const s=performance.now();const a=await import('./algebra.mjs');console.log(JSON.stringify({ms:performance.now()-s,keys:Object.keys(a).length,node:process.version}));" : "const s=performance.now();const a=require('./algebra.cjs');console.log(JSON.stringify({ms:performance.now()-s,keys:Object.keys(a).length,node:process.version}));";
            const p = Bun.spawnSync([node, ...(format === 'esm' ? ['--input-type=module'] : []), '-e', code], { cwd: pure, env: { ...process.env, NODE_PATH: '' }, stdout: 'pipe', stderr: 'pipe' });
            assert.equal(p.exitCode, 0, p.stderr.toString());
            const result = JSON.parse(p.stdout.toString());
            assert.equal(result.keys, 10);
            assert.equal(result.node, version);
            cold.push({ format, ...result });
        }
}
finally {
    rmSync(pure, { recursive: true, force: true });
}
console.log(JSON.stringify({ schema: 'crumbs.m11.4.cost.v1', runtime: { bun: Bun.version, nodeCompatibility: process.version }, workloads, consumed, sizes, cold, limits: 'host diagnostics only; no numeric gate or native FPS claim' }, null, 2));
