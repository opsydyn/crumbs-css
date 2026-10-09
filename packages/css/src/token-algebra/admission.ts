import { reject } from './error';
import type { TokenAlgebraErrorCode, AlgebraColor, Typography } from './model';
export const canonical = (n: number) => n === 0 ? 0 : n;
/** Descriptor-first extraction; never execute a caller accessor. */
export function record(value: unknown, required: readonly string[], optional: readonly string[], code: TokenAlgebraErrorCode): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null))
        reject(code);
    const keys = Reflect.ownKeys(value);
    if (keys.length < required.length || keys.length > required.length + optional.length)
        reject(code);
    const result: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
        if (typeof key !== 'string' || (!required.includes(key) && !optional.includes(key)))
            reject(code);
        const d = Object.getOwnPropertyDescriptor(value, key);
        if (!d || !d.enumerable || !('value' in d) || d.value === undefined)
            reject(code);
        Object.defineProperty(result, key, { value: d.value, enumerable: true });
    }
    if (required.some(k => !Object.hasOwn(result, k)))
        reject(code);
    return result;
}
export function numeric(value: unknown, code: TokenAlgebraErrorCode): number { if (typeof value !== 'number')
    reject(code); if (!Number.isFinite(value))
    reject('algebra.out-of-range'); return canonical(value); }
export function fraction(value: unknown, code: TokenAlgebraErrorCode): number { const n = numeric(value, code); if (n < 0 || n > 1)
    reject('algebra.out-of-range'); return n; }
export function positive(value: unknown, code: TokenAlgebraErrorCode): number { const n = numeric(value, code); if (n <= 0)
    reject('algebra.out-of-range'); return n; }
export function metric(value: unknown, positiveOnly: boolean, code: TokenAlgebraErrorCode): number { const n = numeric(value, code), f = Math.fround(n); if (!Number.isFinite(f) || (positiveOnly && (n <= 0 || f <= 0)))
    reject('algebra.out-of-range'); return n; }
export function components(value: unknown, code: TokenAlgebraErrorCode): readonly [
    number,
    number,
    number
] {
    if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype)
        reject(code);
    const keys = Reflect.ownKeys(value);
    if (keys.length !== 4 || keys.some(k => !['0', '1', '2', 'length'].includes(k as string)))
        reject(code);
    const length = Object.getOwnPropertyDescriptor(value, 'length');
    if (!length || !('value' in length) || length.value !== 3 || length.enumerable || length.configurable)
        reject(code);
    const numbers: number[] = [];
    for (const key of ['0', '1', '2']) {
        const d = Object.getOwnPropertyDescriptor(value, key);
        if (!d || !d.enumerable || !('value' in d))
            reject(code);
        numbers.push(fraction(d.value, code));
    }
    return [numbers[0]!, numbers[1]!, numbers[2]!];
}
export function colorOperand(value: unknown): {
    components: readonly [
        number,
        number,
        number
    ];
    alpha: number;
} { const code = 'algebra.invalid-descriptor'; const r = record(value, ['$$type', 'version', 'space', 'components', 'alpha'], [], code); if (r.$$type !== 'crumbs.css.algebra-color' || r.version !== 1 || r.space !== 'srgb')
    reject(code); return { components: components(r.components, code), alpha: fraction(r.alpha, code) }; }
export function publishColor(rgb: readonly [
    number,
    number,
    number
], alpha: number): AlgebraColor { return Object.freeze({ $$type: 'crumbs.css.algebra-color', version: 1, space: 'srgb', components: Object.freeze([canonical(rgb[0]), canonical(rgb[1]), canonical(rgb[2])]), alpha: canonical(alpha) }) as AlgebraColor; }
export function typographyOperand(value: unknown): {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
} { const code = 'algebra.invalid-descriptor'; const r = record(value, ['$$type', 'version', 'unit', 'fontSize', 'lineHeight', 'letterSpacing'], [], code); if (r.$$type !== 'crumbs.css.typography' || r.version !== 1 || r.unit !== 'native')
    reject(code); return { fontSize: metric(r.fontSize, true, code), lineHeight: metric(r.lineHeight, true, code), letterSpacing: metric(r.letterSpacing, false, code) }; }
export function publishTypography(fontSize: number, lineHeight: number, letterSpacing: number): Typography { return Object.freeze({ $$type: 'crumbs.css.typography', version: 1, unit: 'native', fontSize: metric(fontSize, true, 'algebra.invalid-typography'), lineHeight: metric(lineHeight, true, 'algebra.invalid-typography'), letterSpacing: metric(letterSpacing, false, 'algebra.invalid-typography') }) as Typography; }
