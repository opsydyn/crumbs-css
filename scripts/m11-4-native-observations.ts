import { inflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { nativeActionPoint } from './m11-3-native-observations';
export type M114Observation = {
    selection: {
        foundation: 'blue' | 'red';
        space: 'srgb' | 'srgb-linear';
        ratio: 1.25 | 1.5;
        step: 'caption' | 'body' | 'title';
    };
    base: {
        fontSize: number;
        lineHeight: number;
        letterSpacing: number;
    };
    generated: {
        colors: Record<'tint' | 'replacement' | 'attenuation', string>;
        metrics: {
            fontSize: number;
            lineHeight: number;
            letterSpacing: number;
        };
    };
    control: M114Observation['generated'];
    nativeFontScale: number;
    unrelated: boolean;
    layouts: {
        generated: {
            width: number;
            height: number;
        };
        control: {
            width: number;
            height: number;
        };
    };
};
function ensure(value: unknown, message: string): asserts value { if (!value)
    throw Error(message); }
export function assertM114NativeBinding(host: any, source: string, artifact: string, consumer: string) { ensure(host.schema === 'crumbs.m11.4.qualification.v1' && host.mode === 'full' && host.host === 'passed', 'Passed full M11.4 host receipt required'); ensure(host.sourceBefore?.digest === source && host.sourceAfter?.digest === source && host.artifact?.sha256 === artifact && resolve(host.consumerRoot) === resolve(consumer), 'Foreign source/artifact/consumer binding'); }
export function assertM114Device(device: {
    id: string;
    name: string;
    state: string;
}, expected: string) { ensure(device.id === expected && device.name === 'Crumbs M11.3 Native Motion' && device.state === 'Booted' && device.id !== '1F706822-9584-4340-B426-EECF36F9D8EA', 'Foreign or stopped owned Simulator'); }
export function assertM114RealNativeMap(map: {
    sources: string[];
    sourcesContent?: string[];
}) { ensure(map.sources.some(s => /react-native\/Libraries\/Text\/Text\.(js|tsx)$/.test(s)) && map.sources.some(s => /node_modules\/@opsydyn\/crumbs-css\/dist\/tokens-algebra\.(mjs|cjs)$/.test(s)), 'Real React Native Text/algebra map required'); }
export function failM114Native(receipt: any, error: unknown) { receipt.errors = [...(receipt.errors ?? []), String(error)]; receipt.error ??= String(error); receipt.ios = 'failed'; receipt.android = 'failed'; receipt.acceptance = 'failed'; }
export function readM114Observation(attrs: readonly Record<string, string>[]): M114Observation { for (const a of attrs)
    for (const v of Object.values(a))
        if (v.startsWith('M114:')) {
            const o = JSON.parse(v.slice(5));
            ensure(['blue', 'red'].includes(o.selection?.foundation) && ['srgb', 'srgb-linear'].includes(o.selection?.space) && [1.25, 1.5].includes(o.selection?.ratio) && ['caption', 'body', 'title'].includes(o.selection?.step), 'Invalid current selection');
            ensure(Number.isFinite(o.nativeFontScale) && o.nativeFontScale > 0, 'Missing real native font scale');
            for (const k of ['fontSize', 'lineHeight', 'letterSpacing'])
                ensure(Number.isFinite(o.base?.[k]) && Number.isFinite(o.generated?.metrics?.[k]) && Number.isFinite(o.control?.metrics?.[k]), 'Invalid metric telemetry');
            for (const kind of ['generated', 'control'])
                ensure(o.layouts?.[kind]?.width > 0 && o.layouts?.[kind]?.height > 0, 'Text layout not ready');
            return o;
        } throw Error('Current M114 observation missing'); }
export function decodeM114Png(input: Uint8Array) { const b = Buffer.from(input); ensure(b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'Invalid PNG'); let width = 0, height = 0, channels = 0; const idat: Buffer[] = []; for (let i = 8; i < b.length;) {
    ensure(i + 12 <= b.length, 'Truncated PNG');
    const size = b.readUInt32BE(i), type = b.toString('ascii', i + 4, i + 8);
    ensure(i + 12 + size <= b.length, 'Truncated PNG chunk');
    const data = b.subarray(i + 8, i + 8 + size);
    if (type === 'IHDR') {
        ensure(size === 13 && !width, 'Invalid PNG header');
        width = data.readUInt32BE(0);
        height = data.readUInt32BE(4);
        ensure(width > 0 && height > 0 && width <= 10000 && height <= 10000 && data[8] === 8 && [2, 6].includes(data[9]!) && data[10] === 0 && data[11] === 0 && data[12] === 0, 'Unsupported native PNG format');
        channels = data[9] === 2 ? 3 : 4;
    }
    if (type === 'IDAT')
        idat.push(data);
    i += size + 12;
    if (type === 'IEND')
        break;
} ensure(width && height && idat.length, 'Incomplete PNG'); const stride = width * channels, raw = inflateSync(Buffer.concat(idat), { maxOutputLength: (stride + 1) * height }); ensure(raw.length === (stride + 1) * height, 'PNG pixel length differs'); const pixels = Buffer.alloc(stride * height); for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    ensure(filter <= 4, 'Unsupported PNG filter');
    for (let x = 0; x < stride; x++) {
        const at = y * stride + x, left = x >= channels ? pixels[at - channels]! : 0, up = y ? pixels[at - stride]! : 0, upperLeft = y && x >= channels ? pixels[at - stride - channels]! : 0;
        let predictor = 0;
        if (filter === 1)
            predictor = left;
        if (filter === 2)
            predictor = up;
        if (filter === 3)
            predictor = Math.floor((left + up) / 2);
        if (filter === 4) {
            const p = left + up - upperLeft, a = Math.abs(p - left), c = Math.abs(p - up), d = Math.abs(p - upperLeft);
            predictor = a <= c && a <= d ? left : c <= d ? up : upperLeft;
        }
        pixels[at] = (raw[y * (stride + 1) + 1 + x]! + predictor) & 255;
    }
} return { width, height, channels, pixels }; }
function bounds(a: Record<string, string>) { const p = nativeActionPoint(a); const m = a.bounds!.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)!; return { point: p, x: Number(m[1]), y: Number(m[2]), right: Number(m[3]), bottom: Number(m[4]) }; }
export function inspectM114Capture(bytes: Uint8Array, attrs: readonly Record<string, string>[], o: M114Observation) {
    const png = decodeM114Png(bytes);
    const right = Math.max(...attrs.map(a => Number(a.bounds?.match(/^\[\d+,\d+\]\[(\d+),\d+\]$/)?.[1] ?? 0)));
    const scale = png.width / right;
    ensure(Number.isFinite(scale) && scale >= .9 && scale <= 4, 'Unknown hierarchy-to-pixel scale');
    const find = (id: string) => { const a = attrs.find(a => a['resource-id'] === id); ensure(a, 'Missing visible ' + id); return a; };
    const samples: Record<string, number[]> = {};
    const sample = (id: string) => { const box = bounds(find(id)), cx = Math.round(box.point.x * scale), cy = Math.round(box.point.y * scale), sum = [0, 0, 0]; ensure(box.right - box.x >= 10 && box.bottom - box.y >= 10 && cx - 2 >= 0 && cx + 2 < png.width && cy - 2 >= 0 && cy + 2 < png.height, 'Sample outside visible native image'); for (let y = cy - 2; y <= cy + 2; y++)
        for (let x = cx - 2; x <= cx + 2; x++)
            for (let k = 0; k < 3; k++)
                sum[k]! += png.pixels[(y * png.width + x) * png.channels + k]!; return sum.map(n => n / 25); };
    for (const key of ['tint', 'replacement', 'attenuation'] as const) {
        const generated = sample('algebra-generated-' + key), control = sample('algebra-control-' + key);
        ensure(/^#[\da-f]{8}$/.test(o.control.colors[key]), 'Unknown literal control colour');
        const hex = o.control.colors[key], alpha = parseInt(hex.slice(7, 9), 16) / 255, expected = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) * alpha + 255 * (1 - alpha));
        for (let k = 0; k < 3; k++) {
            ensure(Math.abs(generated[k]! - control[k]!) <= 2, 'Generated/control native pixels differ');
            ensure(Math.abs(control[k]! - expected[k]!) <= 2, 'Independent control pixels differ from white-backdrop colour');
        }
        samples[key] = generated;
    }
    const generated = o.layouts.generated, control = o.layouts.control;
    ensure(Math.abs(generated.width - control.width) <= 1 && Math.abs(generated.height - control.height) <= 1, 'Rendered text layout controls differ');
    for (const kind of ['generated', 'control']) {
        const a = find('algebra-' + kind + '-text');
        bounds(a);
        ensure([a.text, a.accessibilityText, a['content-desc']].includes('Crumbs type'), 'Native sample text not visible');
    }
    ensure(o.base.fontSize === 16 && o.base.lineHeight === 24 && o.base.letterSpacing === -.25, 'Unscaled base typography changed');
    return { width: png.width, height: png.height, scale, samples, layouts: o.layouts };
}
export type M114FontProof = {
    originalPreference: string;
    baselinePreference: string;
    increasedPreference: string;
    restoredPreference: string;
    original: M114Observation;
    baseline: M114Observation;
    increased: M114Observation;
    restored: M114Observation;
};
export function m114FontLayoutIncreased(baseline: M114Observation, increased: M114Observation) { return increased.layouts.generated.height > baseline.layouts.generated.height + 1 || increased.layouts.generated.width > baseline.layouts.generated.width + 1; }
export function assertM114FontProof(proof: M114FontProof) { ensure(proof.originalPreference === proof.restoredPreference && proof.baselinePreference !== proof.increasedPreference, 'Native font preference not changed/restored'); const b = proof.baseline, i = proof.increased, r = proof.restored, o = proof.original; ensure(i.nativeFontScale > b.nativeFontScale + .01 && m114FontLayoutIncreased(b, i), 'Real native font scale/layout did not increase'); for (const phase of [i, r, o])
    ensure(JSON.stringify(phase.selection) === JSON.stringify(b.selection) && JSON.stringify(phase.base) === JSON.stringify(b.base) && JSON.stringify(phase.generated) === JSON.stringify(b.generated) && JSON.stringify(phase.control) === JSON.stringify(b.control), 'Native font preference entered design derivation'); ensure(Math.abs(r.nativeFontScale - o.nativeFontScale) < .001 && Math.abs(r.layouts.generated.height - o.layouts.generated.height) <= 1 && Math.abs(r.layouts.generated.width - o.layouts.generated.width) <= 1, 'Observed original font scale/layout not restored'); }
