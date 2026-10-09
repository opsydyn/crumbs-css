import type { AlgebraColor, AlgebraColorInput, CheckedColorInput, CheckedMixOptions, ColorMixOptions } from './model';
import { canonical, colorOperand, components, fraction, publishColor, record } from './admission';
import { reject } from './error';
export function createColor<const T extends AlgebraColorInput>(input: T & NoInfer<CheckedColorInput<T>>): AlgebraColor {
    const code = 'algebra.invalid-color';
    if (typeof input === 'string') {
        if (input.length > 9 || !/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(input))
            reject(code);
        let hex = input.slice(1);
        if (hex.length < 5)
            hex = [...hex].map(c => c + c).join('');
        if (hex.length === 6)
            hex += 'ff';
        const bytes = [0, 2, 4, 6].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
        return publishColor([bytes[0]!, bytes[1]!, bytes[2]!], bytes[3]!);
    }
    const r = record(input, ['space', 'components'], ['alpha'], code);
    if (r.space !== 'srgb')
        reject(code);
    return publishColor(components(r.components, code), Object.hasOwn(r, 'alpha') ? fraction(r.alpha, code) : 1);
}
const decode = (c: number) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const encode = (c: number) => c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055;
function roundoff(n: number) { if (!Number.isFinite(n) || n < -8 * Number.EPSILON || n > 1 + 8 * Number.EPSILON)
    reject('algebra.out-of-range'); return canonical(Math.max(0, Math.min(1, n))); }
export function mixColor<const T extends ColorMixOptions>(left: AlgebraColor, right: AlgebraColor, options: T & NoInfer<CheckedMixOptions<T>>): AlgebraColor {
    const l = colorOperand(left), r = colorOperand(right), o = record(options, ['ratio', 'space'], [], 'algebra.invalid-option');
    const t = fraction(o.ratio, 'algebra.invalid-option');
    if (o.space !== 'srgb' && o.space !== 'srgb-linear')
        reject('algebra.invalid-option');
    if (t === 0)
        return publishColor(l.components, l.alpha);
    if (t === 1)
        return publishColor(r.components, r.alpha);
    const a0 = (1 - t) * l.alpha, a1 = t * r.alpha, alpha = roundoff(a0 + a1);
    if (alpha === 0)
        return publishColor([0, 0, 0], 0);
    const rgb = l.components.map((c, i) => { const other = r.components[i]!; const mixed = (a0 * (o.space === 'srgb' ? c : decode(c)) + a1 * (o.space === 'srgb' ? other : decode(other))) / alpha; return roundoff(o.space === 'srgb' ? mixed : encode(mixed)); }) as [
        number,
        number,
        number
    ];
    return publishColor(rgb, alpha);
}
export function setColorAlpha(value: AlgebraColor, alpha: number): AlgebraColor { const c = colorOperand(value); return publishColor(c.components, fraction(alpha, 'algebra.invalid-option')); }
export function multiplyColorAlpha(value: AlgebraColor, factor: number): AlgebraColor { const c = colorOperand(value); return publishColor(c.components, c.alpha * fraction(factor, 'algebra.invalid-option')); }
export function toNativeColor(value: AlgebraColor): string { const c = colorOperand(value); return '#' + [...c.components, c.alpha].map(n => Math.round(n * 255).toString(16).padStart(2, '0')).join(''); }
