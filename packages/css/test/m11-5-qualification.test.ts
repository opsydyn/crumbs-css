import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
async function api() { const m = await import('../../../scripts/m11-5-qualification').catch(() => undefined); expect(m).toBeDefined(); return m!; }
test('foreign nonempty roots and escaped or linked inputs are refused', async () => { const m = await api(); expect(() => m.assertM115OwnedRoot(['foreign'], undefined)).toThrow(); expect(() => m.assertM115OwnedRoot(['foreign'], { schema: 'other' })).toThrow(); expect(() => m.assertM115OwnedRoot([], undefined)).not.toThrow(); await expect(m.verifyM115InputFiles('/owned', [{ path: '../foreign', sha256: 'x' }])).rejects.toThrow(/escaped/); const root = await mkdtemp(join(tmpdir(), 'm115-input-')); try {
    await writeFile(join(root, 'data'), 'one');
    await symlink(join(root, 'data'), join(root, 'link'));
    await expect(m.verifyM115InputFiles(root, [{ path: 'link', sha256: m.m115Sha('one') }])).rejects.toThrow(/escaped/);
}
finally {
    await rm(root, { recursive: true, force: true });
} });
test('actual load order must match extensions entry format and both independent loads', async () => { const m = await api(); const trace = [{ kind: 'require', path: '/owned/dist/extensions.cjs' }, { kind: 'import', path: '/owned-copy/dist/extensions.mjs' }]; expect(() => m.assertM115LoadOrder('cjs-first', trace)).not.toThrow(); expect(() => m.assertM115LoadOrder('esm-first', trace)).toThrow(); expect(() => m.assertM115LoadOrder('cjs-first', [trace[0]!, trace[0]!])).toThrow(); expect(() => m.assertM115LoadOrder('cjs-first', [trace[0]!, { kind: 'import', path: '/owned/theme.mjs' }])).toThrow(); });
test('runtime package and generated input drift is rejected', async () => { const m = await api(); const root = await mkdtemp(join(tmpdir(), 'm115-drift-')); try {
    await mkdir(join(root, 'runtime'));
    await writeFile(join(root, 'runtime/module.mjs'), 'original');
    const files = [{ path: 'runtime/module.mjs', sha256: m.m115Sha('original') }];
    await m.verifyM115InputFiles(root, files);
    await writeFile(join(root, 'runtime/module.mjs'), 'changed');
    await expect(m.verifyM115InputFiles(root, files)).rejects.toThrow(/changed/);
}
finally {
    await rm(root, { recursive: true, force: true });
} });
test('preparation and mismatched sources cannot qualify host or native acceptance', async () => { const m = await api(); expect(() => m.assertM115HostReceipt({ schema: 'crumbs.m11.5.qualification.v1', mode: 'prepare-only', host: 'not-run', sourceBefore: { digest: 'a' }, sourceAfter: { digest: 'a' } })).toThrow(); expect(() => m.assertM115HostReceipt({ schema: 'crumbs.m11.5.qualification.v1', mode: 'full', host: 'passed', sourceBefore: { digest: 'a' }, sourceAfter: { digest: 'b' } })).toThrow(); });
test('source identity includes private self-reference configuration and new authored inputs', async () => { const m = await api(), identity = await m.m115SourceIdentity(); expect(identity.files.some(f => f.path === 'apps/storybook/package.json')).toBe(true); expect(identity.files.some(f => f.path === 'packages/css/src/extensions/factory.ts')).toBe(true); expect(identity.files.some(f => f.path === 'packages/css/test/runtime-extension-emission.test.ts')).toBe(true); });
async function native() { const m = await import('../../../scripts/m11-5-native-observations').catch(() => undefined); expect(m).toBeDefined(); return m!; }
test('native binding refuses preparation, foreign devices and missing real runtime maps', async () => { const m = await native(); const host = { schema: 'crumbs.m11.5.qualification.v1', mode: 'full', host: 'passed', sourceBefore: { digest: 's' }, sourceAfter: { digest: 's' }, artifact: { sha256: 'a' }, extensionArtifact: { sha256: 'r' }, consumerRoot: '/owned' }; expect(() => m.assertM115NativeBinding(host, 's', 'a', 'r', '/owned')).not.toThrow(); expect(() => m.assertM115NativeBinding({ ...host, mode: 'prepare-only' }, 's', 'a', 'r', '/owned')).toThrow(); expect(() => m.assertM115NativeBinding(host, 's', 'a', 'changed', '/owned')).toThrow(); expect(() => m.assertM115Device({ id: 'foreign', name: 'Other', state: 'Booted' }, 'owned')).toThrow(); expect(() => m.assertM115RealNativeMap({ sources: ['node_modules/react-native/Libraries/Text/Text.js'] })).toThrow(); expect(() => m.assertM115RealNativeMap({ sources: ['node_modules/react-native/Libraries/Text/Text.js', 'node_modules/@acme/crumbs-extensions/dist/runtime.mjs', 'node_modules/@opsydyn/crumbs-css/dist/theme-core.mjs'] })).not.toThrow(); });
test('labels-only captures and late cleanup cannot establish native acceptance', async () => { const m = await native(); expect(() => m.decodeM115Png(Buffer.from('labels only'))).toThrow(); const receipt: any = { ios: 'passed', android: 'passed', acceptance: 'passed' }; m.failM115Native(receipt, Error('late runtime drift')); expect(receipt.acceptance).toBe('failed'); expect(receipt.ios).toBe('failed'); expect(receipt.android).toBe('failed'); });
test('native lifetime and font guards reject remounts, labels without layouts and unobserved scaling', async () => { const m = await native(); const o: any = { schema: 'crumbs.m11.5.native-observation.v1', selection: { foundation: 'blue', mode: 'literal', theme: 'light', override: false }, base: { fontSize: 16, lineHeight: 24 }, generated: { backgroundColor: '#0000ff', padding: 12, borderRadius: 8 }, control: { backgroundColor: '#0000ff', padding: 12, borderRadius: 8 }, counts: { factories: 4, mounts: 1 }, actions: { generated: 0, control: 0 }, nativeFontScale: 1, unrelated: false, layouts: { generated: { width: 100, height: 24 }, control: { width: 100, height: 24 }, generatedCard: { width: 152, height: 110 }, controlCard: { width: 152, height: 110 } } }; expect(() => m.readM115Observation([{ 'content-desc': 'M115:' + JSON.stringify(o) }])).not.toThrow(); expect(() => m.readM115Observation([{ 'content-desc': 'M115:' + JSON.stringify({ ...o, layouts: {} }) }])).toThrow(); expect(() => m.assertM115StableComponent(o, { ...o, counts: { factories: 4, mounts: 2 } })).toThrow(); const proof = { originalPreference: 'large', baselinePreference: 'large', increasedPreference: 'extra-extra-extra-large', restoredPreference: 'large', original: o, baseline: o, increased: { ...o, nativeFontScale: 1.3 }, restored: o }; expect(() => m.assertM115FontProof(proof)).toThrow(/layout/); const increased = { ...o, nativeFontScale: 1.3, layouts: { ...o.layouts, generated: { width: 130, height: 32 }, control: { width: 130, height: 32 } } }; expect(() => m.assertM115FontProof({ ...proof, increased })).not.toThrow(); expect(() => m.assertM115FontProof({ ...proof, increased, restoredPreference: 'small' })).toThrow(/restored/); });
test('shared native runtime bytes and packed adapter semantics remain identical', async () => { const { readFile } = await import('node:fs/promises'); expect(await readFile(new URL('../../../apps/storybook/src/components/runtime-extensions/runtime.tsx', import.meta.url), 'utf8')).toBe(await readFile(new URL('../fixtures/packed-distribution/extensions/src/runtime.tsx', import.meta.url), 'utf8')); });

test('native spacing and radius comparison accepts expanded shorthand semantics and refuses a changed edge',async()=>{
 const m=await native();
 const expanded={paddingTop:12,paddingRight:12,paddingBottom:12,paddingLeft:12,borderTopLeftRadius:8,borderTopRightRadius:8,borderBottomRightRadius:8,borderBottomLeftRadius:8};
 expect(()=>m.assertM115BaseStyle(expanded)).not.toThrow();
 expect(()=>m.assertM115BaseStyle({padding:12,borderRadius:8})).not.toThrow();
 expect(()=>m.assertM115BaseStyle({...expanded,paddingLeft:0})).toThrow();
 expect(()=>m.assertM115BaseStyle({...expanded,borderBottomRightRadius:0})).toThrow();
});
