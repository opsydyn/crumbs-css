import { expect, test } from 'bun:test';
import { mkdtemp, writeFile, rm, mkdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { assertM114OwnedRoot, verifyM114InputFiles, assertM114LoadOrder, m114Sha, assertM114Stable } from '../../../scripts/m11-4-qualification';
test('actual_cjs_first_loading_is_observed', () => { expect(() => assertM114LoadOrder('cjs-first', [{ kind: 'require', path: 'tokens-algebra.cjs' }, { kind: 'import', path: 'tokens-algebra.mjs' }])).not.toThrow(); expect(() => assertM114LoadOrder('cjs-first', [{ kind: 'import', path: 'tokens-algebra.mjs' }, { kind: 'require', path: 'tokens-algebra.cjs' }])).toThrow(); expect(() => assertM114LoadOrder('esm-first', [{ kind: 'require', path: 'tokens-algebra.cjs' }])).toThrow(); });
test('late_fixture_input_drift_invalidates_acceptance', async () => { const root = await mkdtemp(join(tmpdir(), 'm114-input-')); try {
    await writeFile(join(root, 'fixture.ts'), 'original');
    const files = [{ path: 'fixture.ts', sha256: m114Sha('original') }];
    await expect(verifyM114InputFiles(root, files)).resolves.toEqual(files);
    await writeFile(join(root, 'fixture.ts'), 'changed');
    await expect(verifyM114InputFiles(root, files)).rejects.toThrow('Input changed');
    expect(() => assertM114Stable('a', 'b', 'source')).toThrow();
}
finally {
    await rm(root, { recursive: true, force: true });
} });
test('foreign_roots_and_path_escapes_are_refused', async () => { expect(() => assertM114OwnedRoot(['foreign'], undefined)).toThrow(); expect(() => assertM114OwnedRoot(['foreign'], { schema: 'other' })).toThrow(); expect(() => assertM114OwnedRoot([], undefined)).not.toThrow(); await expect(verifyM114InputFiles('/owned', [{ path: 'src/../../foreign', sha256: 'x' }])).rejects.toThrow('escaped'); });
test('second_copy_descriptors_work_without_runtime_peers', async () => { const root = await mkdtemp(join(tmpdir(), 'm114-no-peers-test-')); try {
    for (const name of ['crumbs-css', 'crumbs-css-copy']) {
        const pkg = join(root, 'node_modules/@opsydyn', name);
        await mkdir(join(pkg, 'dist'), { recursive: true });
        await writeFile(join(pkg, 'package.json'), JSON.stringify({ name: '@opsydyn/' + name, exports: { './package.json': './package.json' } }));
        for (const ext of ['cjs', 'mjs'])
            await cp(resolve(import.meta.dir, '../dist/tokens-algebra.' + ext), join(pkg, 'dist/tokens-algebra.' + ext));
    }
    await mkdir(join(root, 'test'));
    await cp(resolve(import.meta.dir, '../fixtures/packed-distribution/app/test/algebra.node.mjs'), join(root, 'test/algebra.node.mjs'));
    for (const format of ['esm', 'cjs']) {
        const p = Bun.spawnSync(['node', 'test/algebra.node.mjs', format], { cwd: root, env: { ...process.env, NODE_PATH: '' }, stdout: 'pipe', stderr: 'pipe' });
        expect(p.stderr.toString()).toBe('');
        expect(p.exitCode).toBe(0);
        const output = JSON.parse(p.stdout.toString());
        expect(output.runtimePeers).toBe('absent');
        expect(output.copies).toBe(2);
        assertM114LoadOrder(format === 'cjs' ? 'cjs-first' : 'esm-first', output.trace);
    }
}
finally {
    await rm(root, { recursive: true, force: true });
} });
import { assertM114NativeBinding, assertM114Device, inspectM114Capture, assertM114FontProof, failM114Native, decodeM114Png } from '../../../scripts/m11-4-native-observations';
import { deflateSync } from 'node:zlib';
import type { M114Observation } from '../../../scripts/m11-4-native-observations';
const observed = (scale = 1, height = 38): M114Observation => ({ selection: { foundation: 'blue', space: 'srgb', ratio: 1.25, step: 'title' }, base: { fontSize: 16, lineHeight: 24, letterSpacing: -.25 }, generated: { colors: { tint: '#8080ffff', replacement: '#0000ff80', attenuation: '#0000ff20' }, metrics: { fontSize: 25, lineHeight: 37.5, letterSpacing: -.390625 } }, control: { colors: { tint: '#8080ffff', replacement: '#0000ff80', attenuation: '#0000ff20' }, metrics: { fontSize: 25, lineHeight: 37.5, letterSpacing: -.390625 } }, nativeFontScale: scale, unrelated: false, layouts: { generated: { width: 100, height }, control: { width: 100, height } } });
function captureFixture(wrong = false) { const w = 240, h = 180, raw = Buffer.alloc((w * 3 + 1) * h, 255); for (let y = 0; y < h; y++)
    raw[y * (w * 3 + 1)] = 0; const attrs: Record<string, string>[] = [{ bounds: '[0,0][240,180]', enabled: 'true' }]; for (const [i, key] of ['tint', 'replacement', 'attenuation'].entries())
    for (const [j, kind] of ['generated', 'control'].entries()) {
        const x = 10 + j * 60, y = 10 + i * 45, rgb = key === 'attenuation' ? [223, 223, 255] : key === 'replacement' ? [127, 127, 255] : [128, 128, 255];
        attrs.push({ 'resource-id': `algebra-${kind}-${key}`, bounds: `[${x},${y}][${x + 40},${y + 40}]`, enabled: 'true' });
        for (let a = y; a < y + 40; a++)
            for (let b = x; b < x + 40; b++)
                for (let k = 0; k < 3; k++)
                    raw[a * (w * 3 + 1) + 1 + b * 3 + k] = wrong && kind === 'generated' ? 0 : rgb[k]!;
    } for (const kind of ['generated', 'control'])
    attrs.push({ 'resource-id': 'algebra-' + kind + '-text', text: 'Crumbs type', bounds: '[0,140][100,178]', enabled: 'true' }); const chunk = (name: string, data: Buffer) => { const b = Buffer.alloc(data.length + 12); b.writeUInt32BE(data.length); b.write(name, 4); data.copy(b, 8); return b; }; const header = Buffer.alloc(13); header.writeUInt32BE(w); header.writeUInt32BE(h, 4); header[8] = 8; header[9] = 2; return { bytes: Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]), attrs }; }
test('foreign_device_or_bundle_is_refused', () => { const h: any = { schema: 'crumbs.m11.4.qualification.v1', mode: 'full', host: 'passed', consumerRoot: '/owned', sourceBefore: { digest: 's' }, sourceAfter: { digest: 's' }, artifact: { sha256: 'a' } }; expect(() => assertM114NativeBinding(h, 's', 'a', '/owned')).not.toThrow(); expect(() => assertM114NativeBinding({ ...h, host: 'not-run' }, 's', 'a', '/owned')).toThrow(); expect(() => assertM114NativeBinding(h, 'changed', 'a', '/owned')).toThrow(); expect(() => assertM114Device({ id: 'owned', name: 'Crumbs M11.3 Native Motion', state: 'Booted' }, 'owned')).not.toThrow(); expect(() => assertM114Device({ id: 'foreign', name: 'Other', state: 'Booted' }, 'owned')).toThrow(); expect(() => assertM114Device({ id: '1F706822-9584-4340-B426-EECF36F9D8EA', name: 'Crumbs M11.3 Native Motion', state: 'Booted' }, '1F706822-9584-4340-B426-EECF36F9D8EA')).toThrow(); });
test('capture_pixel_and_layout_controls_detect_wrong_output', () => { const good = captureFixture(); expect(() => inspectM114Capture(good.bytes, good.attrs, observed())).not.toThrow(); const bad = captureFixture(true); expect(() => inspectM114Capture(bad.bytes, bad.attrs, observed())).toThrow(); const layout = observed(); layout.layouts.control.height = 50; expect(() => inspectM114Capture(good.bytes, good.attrs, layout)).toThrow(); expect(() => decodeM114Png(Buffer.from('labels only'))).toThrow(); });
test('font_preference_phase_requires_real_native_change_and_restoration', () => { const proof = { originalPreference: 'large', baselinePreference: 'large', increasedPreference: 'extra-extra-extra-large', restoredPreference: 'large', original: observed(), baseline: observed(), increased: observed(1.3, 50), restored: observed() }; expect(() => assertM114FontProof(proof)).not.toThrow(); expect(() => assertM114FontProof({ ...proof, increased: observed() })).toThrow(); expect(() => assertM114FontProof({ ...proof, restoredPreference: 'small' })).toThrow(); const changed = observed(1.3, 50); changed.base.fontSize = 18; expect(() => assertM114FontProof({ ...proof, increased: changed })).toThrow(); });
test('late_cleanup_or_input_drift_dominates_prior_passes', () => { const receipt: any = { ios: 'passed', android: 'passed', acceptance: 'passed' }; failM114Native(receipt, Error('late fixture drift')); expect(receipt.acceptance).toBe('failed'); expect(receipt.ios).toBe('failed'); expect(receipt.android).toBe('failed'); failM114Native(receipt, Error('cleanup failed')); expect(receipt.errors).toHaveLength(2); });

import {assertM114RealNativeMap} from '../../../scripts/m11-4-native-observations';
test('native_map_requires_actual_text_and_algebra_modules',()=>{
 const sources=['node_modules/react-native/Libraries/Text/Text.js','node_modules/@opsydyn/crumbs-css/dist/tokens-algebra.mjs'];
 expect(()=>assertM114RealNativeMap({sources})).not.toThrow();
 expect(()=>assertM114RealNativeMap({sources:sources.slice(1)})).toThrow();
 expect(()=>assertM114RealNativeMap({sources:[sources[0]!,'workspace/algebra.ts']})).toThrow();
});

test('native_font_width_change_qualifies_when_authored_line_height_stays_fixed',()=>{
 const increased=observed(1.353,38);increased.layouts.generated.width=135;increased.layouts.control.width=135;
 expect(()=>assertM114FontProof({originalPreference:'large',baselinePreference:'large',increasedPreference:'extra-extra-extra-large',restoredPreference:'large',original:observed(),baseline:observed(),increased,restored:observed()})).not.toThrow();
});
