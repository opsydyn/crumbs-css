import { resolve } from 'node:path';
import { decodeM114Png } from './m11-4-native-observations';
import { nativeActionPoint } from './m11-3-native-observations';
import { assertM115HostReceipt } from './m11-5-qualification';
export const decodeM115Png = decodeM114Png;
export type M115Observation = {
    schema: string;
    selection: {
        foundation: 'blue' | 'red';
        mode: 'literal' | 'themed';
        theme: 'light' | 'dark';
        override: boolean;
    };
    base: {
        fontSize: number;
        lineHeight: number;
    };
    generated: Record<string, unknown>;
    control: {
        backgroundColor: string;
        padding: number;
        borderRadius: number;
    };
    counts: {
        factories: number;
        mounts: number;
    };
    actions: {
        generated: number;
        control: number;
    };
    nativeFontScale: number;
    unrelated: boolean;
    layouts: Record<'generated' | 'control' | 'generatedCard' | 'controlCard', {
        width: number;
        height: number;
    }>;
};
function ensure(value: unknown, message: string): asserts value { if (!value)
    throw Error(message); }
export function assertM115NativeBinding(host: any, source: string, artifact: string, runtimeArtifact: string, consumer: string) { assertM115HostReceipt(host); ensure(host.sourceBefore?.digest === source && host.sourceAfter?.digest === source && host.artifact?.sha256 === artifact && host.extensionArtifact?.sha256 === runtimeArtifact && resolve(host.consumerRoot) === resolve(consumer), 'Foreign source/artifact/runtime/consumer binding'); }
export function assertM115Device(device: {
    id: string;
    name: string;
    state: string;
}, expected: string) { ensure(device.id === expected && device.name === 'Crumbs M11.3 Native Motion' && device.state === 'Booted' && device.id !== '1F706822-9584-4340-B426-EECF36F9D8EA', 'Foreign or stopped owned Simulator'); }
export function assertM115RealNativeMap(map: {
    sources: string[];
    sourcesContent?: (string | null)[];
}) { ensure(map.sources.some(s => /react-native\/Libraries\/Text\/Text\.(js|tsx)$/.test(s)) && map.sources.some(s => /node_modules\/@acme\/crumbs-extensions\/dist\/runtime\.(mjs|cjs)$/.test(s)) && map.sources.some(s => /node_modules\/@opsydyn\/crumbs-css\/dist\/theme-core\.(mjs|cjs)$/.test(s)) && !map.sources.some(s => /extensions\.integration|\/test\//.test(s)) && !map.sourcesContent?.some(s => s?.includes("mock.module('react-native'")), 'Real React Native Text, runtime endpoint and theme/core map required'); }
export function failM115Native(receipt: any, error: unknown) { receipt.errors = [...(receipt.errors ?? []), String(error)]; receipt.error ??= String(error); receipt.ios = 'failed'; receipt.android = 'failed'; receipt.acceptance = 'failed'; }
export function readM115Observation(attrs: readonly Record<string, string>[]): M115Observation { for (const attr of attrs)
    for (const value of Object.values(attr))
        if (value.startsWith('M115:')) {
            const o = JSON.parse(value.slice(5)) as M115Observation;
            ensure(o.schema === 'crumbs.m11.5.native-observation.v1' && ['blue', 'red'].includes(o.selection?.foundation) && ['literal', 'themed'].includes(o.selection?.mode) && ['light', 'dark'].includes(o.selection?.theme) && typeof o.selection?.override === 'boolean', 'Invalid current extension selection');
            ensure(Number.isFinite(o.nativeFontScale) && o.nativeFontScale > 0, 'Missing real native font scale');
            ensure(o.counts?.factories === 4 && Number.isInteger(o.counts.mounts) && o.counts.mounts > 0, 'Missing module factory/mount observations');
            for (const kind of ['generated', 'control', 'generatedCard', 'controlCard'] as const)
                ensure(o.layouts?.[kind]?.width > 0 && o.layouts[kind].height > 0, 'Current native layouts not ready');
            ensure(o.generated && o.control && Number.isInteger(o.actions?.generated) && Number.isInteger(o.actions?.control), 'Missing committed style/interaction observations');
            return o;
        } throw Error('Current M115 observation missing'); }
function expectedColor(o: M115Observation) { return o.selection.override ? '#00aa00' : o.selection.mode === 'themed' && o.selection.theme === 'dark' ? (o.selection.foundation === 'blue' ? '#000080' : '#800000') : (o.selection.foundation === 'blue' ? '#0000ff' : '#ff0000'); }
export function assertM115BaseStyle(style:Record<string,unknown>){
 for(const edge of ['Top','Right','Bottom','Left']){
  const axis=edge==='Top'||edge==='Bottom'?'Vertical':'Horizontal';
  ensure((style['padding'+edge]??style['padding'+axis]??style.padding)===12,'Base padding edge changed');
 }
 for(const corner of ['TopLeft','TopRight','BottomRight','BottomLeft'])ensure((style['border'+corner+'Radius']??style.borderRadius)===8,'Base radius corner changed');
}
export function inspectM115Capture(bytes: Uint8Array, attrs: readonly Record<string, string>[], o: M115Observation) { const png = decodeM115Png(bytes), right = Math.max(...attrs.map(a => Number(a.bounds?.match(/^\[\d+,\d+\]\[(\d+),\d+\]$/)?.[1] ?? 0))), scale = png.width / right; ensure(Number.isFinite(scale) && scale >= .9 && scale <= 4, 'Unknown hierarchy-to-pixel scale'); const find = (id: string) => { const a = attrs.find(a => a['resource-id'] === id); ensure(a, 'Missing visible ' + id); nativeActionPoint(a); return a; }; const sample = (id: string) => { const a = find(id), point = nativeActionPoint(a), box = a.bounds!.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)!, x = Math.round(point.x * scale), y = Math.round(point.y * scale); ensure(Number(box[3]) - Number(box[1]) >= 10 && Number(box[4]) - Number(box[2]) >= 10 && x - 2 >= 0 && y - 2 >= 0 && x + 2 < png.width && y + 2 < png.height, 'Sample outside native image'); const sum = [0, 0, 0]; for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
        for (let k = 0; k < 3; k++)
            sum[k]! += png.pixels[((y + dy) * png.width + x + dx) * png.channels + k]!; return sum.map(n => n / 25); }; const generated = sample('extensions-generated-colour'), control = sample('extensions-control-colour'), color = expectedColor(o); ensure(o.generated.backgroundColor === color && o.control.backgroundColor === color, 'Committed styles differ from independent literal selection'); for (const kind of ['generated', 'control'] as const) {
    assertM115BaseStyle(o[kind]);
    const text = find('extensions-' + kind + '-text');
    ensure([text.text, text.accessibilityText, text['content-desc']].includes('Crumbs type'), 'Forwarded native text missing');
    find('extensions-' + kind + '-action');
} for (let k = 0; k < 3; k++) {
    ensure(Math.abs(generated[k]! - control[k]!) <= 2, 'Generated/control pixels differ');
    ensure(Math.abs(control[k]! - parseInt(color.slice(1 + k * 2, 3 + k * 2), 16)) <= 2, 'Native pixels differ from independent control');
} for (const pair of [['generated', 'control'], ['generatedCard', 'controlCard']] as const) {
    const a = o.layouts[pair[0]], b = o.layouts[pair[1]];
    ensure(Math.abs(a.width - b.width) <= 1 && Math.abs(a.height - b.height) <= 1, 'Generated/control native layout differs');
} ensure(o.base.fontSize === 16 && o.base.lineHeight === 24, 'Unscaled Text metrics changed'); return { width: png.width, height: png.height, scale, samples: { generated, control }, layouts: o.layouts }; }
export function assertM115StableComponent(before: M115Observation, after: M115Observation) { ensure(before.counts.factories === after.counts.factories && before.counts.mounts === after.counts.mounts, 'Unchanged selection reconstructed or remounted'); }
export function m115FontLayoutIncreased(before: M115Observation, after: M115Observation) { return after.layouts.generated.height > before.layouts.generated.height + 1 || after.layouts.generated.width > before.layouts.generated.width + 1; }
export type M115FontProof = {
    originalPreference: string;
    baselinePreference: string;
    increasedPreference: string;
    restoredPreference: string;
    original: M115Observation;
    baseline: M115Observation;
    increased: M115Observation;
    restored: M115Observation;
};
export function assertM115FontProof(proof: M115FontProof) { ensure(proof.originalPreference === proof.restoredPreference && proof.baselinePreference !== proof.increasedPreference, 'Native preference not changed/restored'); const { original: o, baseline: b, increased: i, restored: r } = proof; ensure(i.nativeFontScale > b.nativeFontScale + .01 && m115FontLayoutIncreased(b, i), 'Real native font scale/layout did not increase'); for (const phase of [o, i, r])
    for (const key of ['selection', 'base', 'generated', 'control'] as const)
        ensure(JSON.stringify(phase[key]) === JSON.stringify(b[key]), 'Native scale entered design derivation'); ensure(Math.abs(r.nativeFontScale - o.nativeFontScale) < .001 && Math.abs(r.layouts.generated.width - o.layouts.generated.width) <= 1 && Math.abs(r.layouts.generated.height - o.layouts.generated.height) <= 1, 'Original observed scale/layout not restored'); }
