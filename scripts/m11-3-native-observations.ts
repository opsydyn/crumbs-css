import { inflateSync, deflateSync } from 'node:zlib';
import { resolve } from 'node:path';
export function assertM113NativeBinding(host: {
    host: string;
    sourceBefore: {
        digest: string;
    };
    artifact: {
        sha256: string;
    };
    consumerRoot: string;
}, source: string, artifact: string, consumer: string) { if (host.host !== 'passed' || host.sourceBefore.digest !== source || host.artifact.sha256 !== artifact || resolve(host.consumerRoot) !== resolve(consumer))
    throw Error('Native host/source/artifact/consumer binding changed'); }
export function failM113NativeQualification(receipt: Record<string, unknown>, error: unknown) { receipt.errors = [...(Array.isArray(receipt.errors)?receipt.errors:[]),String(error)]; receipt.error ??= String(error); receipt.ios = 'failed'; receipt.android = 'failed'; receipt.acceptance = 'failed'; }
export function assertM113DeviceIdentity(expected: string, actual: string) { if (expected !== actual)
    throw Error('Owned device identity drift'); }
export function assertM113RealNativeMap(map: {
    sources: readonly string[];
    sourcesContent: readonly (string | null)[];
}) { if (!map.sources.some(s => s.includes('react-native/Libraries/Animated/AnimatedImplementation')) || map.sources.some(s => /motion-peer|motion\.integration|\/test\//.test(s)) || map.sourcesContent.some(s => s?.includes("mock.module('react-native'")))
    throw Error('Actual native map lacks the public RN implementation or contains host mocks'); }
export function nativeAttributes(tree: unknown): Record<string, string>[] { const collected: Record<string, string>[] = []; function walk(value: unknown) { if (!value || typeof value !== 'object')
    return; const node = value as {
    attributes?: Record<string, string>;
    children?: unknown[];
}; if (node.attributes)
    collected.push(node.attributes); for (const child of node.children ?? [])
    walk(child); } walk(tree); return collected; }
export function nativeXmlAttributes(xml: string): Record<string, string>[] { const entity: Record<string, string> = { quot: '"', apos: "'", amp: '&', lt: '<', gt: '>' }; return [...xml.matchAll(/<node\b((?:[^>"']|"[^"]*"|'[^']*')*)\/?>/g)].map(node => Object.fromEntries([...node[1]!.matchAll(/([\w-]+)=(?:"([^"]*)"|'([^']*)')/g)].map(field => [field[1]!, (field[2] ?? field[3]!).replace(/&(quot|apos|amp|lt|gt);/g, (_, key) => entity[key]!)]))); }
export type MotionObservation = {
    sourceMode: string;
    nativeMotion: 'full' | 'reduced';
    effectiveMotion: 'full' | 'reduced';
    state: {
        aMounted: boolean;
        aGeneration: number;
        staleCancelDuringPending:boolean|null;
        requested: {
            a: 'resting' | 'selected';
            b: 'resting' | 'selected';
        };
        duration: 'normal' | 'zero';
        policy: 'native' | 'full' | 'reduced';
        terminals: {
            card: 'a' | 'b';
            generation: number;
            result: {
                status: string;
                target: string;
                mode?: string;
                reason?: string;
            };
        }[];
    };
    commits: Record<string, number>;
};
export function readM113Observation(attributes: readonly Record<string, string>[]): MotionObservation { for (const attr of attributes)
    for (const text of Object.values(attr))
        if (text.startsWith('M113:'))
            return JSON.parse(text.slice(5)) as MotionObservation; throw Error('Missing M113 native observation'); }
export function nativeActionPoint(target: Record<string, string> | undefined) { const bounds = target?.bounds?.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/); if (!bounds || target?.enabled !== 'true' || Number(bounds[3]) <= Number(bounds[1]) || Number(bounds[4]) <= Number(bounds[2]))
    throw Error('Control has no observed enabled bounds'); return { x: Math.round((Number(bounds[1]) + Number(bounds[3])) / 2), y: Math.round((Number(bounds[2]) + Number(bounds[4])) / 2) }; }
export function assertM113Plateau(samples: readonly {
    at: number;
    observation: MotionObservation;
}[]) { if (samples.length !== 3 || samples[2]!.at - samples[0]!.at < 100 || samples[2]!.at - samples[0]!.at > 10000 || samples.some(s => JSON.stringify(s.observation) !== JSON.stringify(samples[0]!.observation)))
    throw Error('Native plateau requires three equal samples over100ms within10s'); }
export type PixelMarker = {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
    opacity: number;
    pixels: number;
};
export function inspectM113Png(bytes: Uint8Array): {
    width: number;
    height: number;
    a?: PixelMarker;
    b?: PixelMarker;
} {
    const png = Buffer.from(bytes), signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    if (!png.subarray(0, 8).equals(signature))
        throw Error('Capture is not PNG');
    let width = 0, height = 0, channels = 0;
    const chunks: Buffer[] = [];
    for (let offset = 8; offset + 12 <= png.length;) {
        const length = png.readUInt32BE(offset), name = png.toString('ascii', offset + 4, offset + 8), end = offset + length + 12;
        if (end > png.length)
            throw Error('Truncated PNG');
        const data = png.subarray(offset + 8, offset + 8 + length);
        if (name === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            channels = data[9] === 2 ? 3 : data[9] === 6 ? 4 : 0;
            if (data[8] !== 8 || !channels || data[12] !== 0 || width < 1 || height < 1 || width * height > 25000000)
                throw Error('Unsupported PNG layout');
        }
        else if (name === 'IDAT')
            chunks.push(data);
        offset = end;
        if (name === 'IEND')
            break;
    }
    if (!channels)
        throw Error('Missing PNG header');
    const stride = width * channels, scan = inflateSync(Buffer.concat(chunks)), pixels = Buffer.alloc(stride * height);
    if (scan.length !== (stride + 1) * height)
        throw Error('PNG row length mismatch');
    function predict(a: number, b: number, c: number) { const n = a + b - c, da = Math.abs(n - a), db = Math.abs(n - b), dc = Math.abs(n - c); return da <= db && da <= dc ? a : db <= dc ? b : c; }
    for (let y = 0; y < height; y++) {
        const filter = scan[y * (stride + 1)]!;
        if (filter > 4)
            throw Error('Invalid PNG filter');
        for (let byte = 0; byte < stride; byte++) {
            const position = y * stride + byte, left = byte >= channels ? pixels[position - channels]! : 0, above = y ? pixels[position - stride]! : 0, diagonal = y && byte >= channels ? pixels[position - stride - channels]! : 0, delta = filter === 1 ? left : filter === 2 ? above : filter === 3 ? (left + above) >> 1 : filter === 4 ? predict(left, above, diagonal) : 0;
            pixels[position] = (scan[y * (stride + 1) + byte + 1]! + delta) & 255;
        }
    }
    const create = () => ({ x0: width, y0: height, x1: -1, y1: -1, signal: 0, count: 0 }), blueMarker = create(), greenMarker = create();
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
            const at = y * stride + x * channels, r = pixels[at]!, g = pixels[at + 1]!, b = pixels[at + 2]!, target = g > r + 20 && b > g + 35 && r < 215 && g < 225 && b > 170 ? blueMarker : g > r + 30 && g > b + 25 && r < 190 && g > 100 && b < 190 ? greenMarker : undefined;
            if (target) {
                target.x0 = Math.min(target.x0, x);
                target.x1 = Math.max(target.x1, x);
                target.y0 = Math.min(target.y0, y);
                target.y1 = Math.max(target.y1, y);
                target.signal += 765 - r - g - b;
                target.count++;
            }
        }
    const marker = (data: ReturnType<typeof create>, fullSignal: number): PixelMarker | undefined => { if (data.count < 64)
        return undefined; const w = data.x1 - data.x0 + 1, h = data.y1 - data.y0 + 1; if (w / h < .9 || w / h > 1.1 || data.count < w * h * .9)
        throw Error('Marker is not a visible rectangle'); return { x: data.x0, y: data.y0, width: w, height: h, scale: w / 48, opacity: data.signal / data.count / fullSignal, pixels: data.count }; };
    const a = marker(blueMarker, 394), b = marker(greenMarker, 506);
    return { width, height, ...(a ? { a } : {}), ...(b ? { b } : {}) };
}
export function assertM113Marker(marker: PixelMarker | undefined, origin: PixelMarker, target: 'resting' | 'selected') { if (!marker || Math.abs((marker.x - origin.x) / origin.scale - (target === 'selected' ? 112 : 0)) > 1.5 || Math.abs(marker.opacity - (target === 'selected' ? 1 : .6)) > .06)
    throw Error(`Rendered marker differs from ${target}`); }

export function m113LaunchOverlayAction(attrs:readonly Record<string,string>[]){const text=(a:Record<string,string>)=>a.accessibilityText||a.text||a['content-desc']||'';let label:string|undefined;if(attrs.some(a=>text(a)==='Open in “Expo Go”?'))label='Open';else if(attrs.some(a=>text(a)==='Crumbs M11.3 Motion')&&attrs.some(a=>text(a)==='SDK version: 56.0.0')&&attrs.some(a=>text(a)==='This is the developer menu. It gives you access to useful tools in your development builds.'))label='Continue';else if(attrs.some(a=>text(a)==='Expo Go')&&attrs.some(a=>text(a)==='Crumbs M11.3 Motion'))label='Close';else if(attrs.some(a=>text(a)==='Crumbs M11.3 Motion')&&attrs.some(a=>text(a)==='SDK version: 56.0.0')&&attrs.some(a=>text(a)==='Reload')&&attrs.some(a=>text(a)==='Go home'))label='Close';if(!label)return undefined;const action=attrs.find(a=>text(a)===label&&a.enabled==='true'&&a.bounds&&a.bounds!=='[0,0][0,0]');if(action)nativeActionPoint(action);return action}

export function nativeReduceMotionSwitchPoint(target:Record<string,string>|undefined){
 const centre=nativeActionPoint(target);
 if(target?.['resource-id']!=='REDUCE_MOTION'||(target.value!=='0'&&target.value!=='1'))throw Error('Not the observed Reduce Motion switch');
 // iOS exposes the whole labelled row. The rendered switch occupies its right edge.
 const bounds=target.bounds!.match(/^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$/)!;
 const left=Number(bounds[1]),right=Number(bounds[3]);
 return {x:Math.round(right-Math.min(24,(right-left)/2)),y:centre.y};
}

export function assertM113IosInputIdentity(expected:string,actual:{udid:string;name:string;target_type:string;state:string}){
 if(actual.udid!==expected||actual.name!=='Crumbs M11.3 Native Motion'||actual.target_type!=='simulator'||actual.state!=='Booted')throw Error('Fast input is not attached to the owned booted Simulator');
}

export function m113AndroidLaunchNeedsRedirect(output:string):boolean {
 if(!/^Status: ok$/m.test(output))throw Error('Android launch did not report success');
 const activity=/^Activity: ([^\r\n]+)$/m.exec(output)?.[1];
 if(activity==='host.exp.exponent/.LauncherActivity')return true;
 if(activity==='host.exp.exponent/.experience.ExperienceActivity')return false;
 throw Error('Android launch reported an unexpected activity');
}

// AOSP screencap writes LE width/height/pixel-format/colour-space then packed rows.
// Qualification accepts only the actually observed RGBA_8888 and sRGB format.
export function encodeM113AndroidRgba(bytes:Buffer):Buffer {
 if(bytes.length<16)throw Error('Truncated Android raw screenshot');
 const {width,height}=m113AndroidRgbaHeader(bytes);
 if(bytes.length!==16+width*height*4)throw Error('Truncated Android raw screenshot');
 for(let alpha=19;alpha<bytes.length;alpha+=4)if(bytes[alpha]!==255)throw Error('Unsupported nonopaque Android raw screenshot');
 const row=width*4,scanlines=Buffer.alloc((row+1)*height);
 for(let y=0;y<height;y++)bytes.copy(scanlines,y*(row+1)+1,16+y*row,16+(y+1)*row);
 const chunk=(name:string,data:Buffer)=>{const result=Buffer.alloc(data.length+12);result.writeUInt32BE(data.length,0);result.write(name,4);data.copy(result,8);let crc=0xffffffff;for(const byte of result.subarray(4,-4)){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}result.writeUInt32BE((crc^0xffffffff)>>>0,result.length-4);return result};
 const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('sRGB',Buffer.from([0])),chunk('IDAT',deflateSync(scanlines)),chunk('IEND',Buffer.alloc(0))]);
}

function m113AndroidRgbaHeader(bytes:Buffer){
 if(bytes.length<16)throw Error('Truncated Android raw screenshot header');
 const width=bytes.readUInt32LE(0),height=bytes.readUInt32LE(4);
 if(!width||!height||width>4096||height>8192||width*height>16777216||bytes.readUInt32LE(8)!==1||bytes.readUInt32LE(12)!==1)throw Error('Unsupported Android raw screenshot header');
 return {width,height};
}
export async function readM113AndroidRgbaCapture(stream:ReadableStream<Uint8Array>,ready:(header:{width:number;height:number})=>void|Promise<void>):Promise<Buffer>{
 const reader=stream.getReader(),chunks:Buffer[]=[];let total=0,expected:number|undefined;const header=Buffer.alloc(16);
 try{
  while(true){const part=await reader.read();if(part.done)break;const bytes=Buffer.from(part.value);
   if(total<16)bytes.copy(header,total,0,Math.min(bytes.length,16-total));
   total+=bytes.length;chunks.push(bytes);
   if(expected===undefined&&total>=16){const shape=m113AndroidRgbaHeader(header);expected=16+shape.width*shape.height*4;await ready(shape)}
   if(expected!==undefined&&total>expected)throw Error('Android capture contains trailing bytes');
  }
  if(expected===undefined||total!==expected)throw Error('Truncated Android raw screenshot body');
  return Buffer.concat(chunks,total);
 }finally{try{await reader.cancel()}catch{}reader.releaseLock()}
}
