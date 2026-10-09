import type { Typography, TypographyInput, TypographyScaleOptions, TypographyScale, NativeTypographyStyle, CheckedTypographyInput, CheckedScaleOptions } from './model';
import { metric, numeric, positive, publishTypography, record, typographyOperand } from './admission';
import { reject } from './error';
export function createTypography<const T extends TypographyInput>(input: T & NoInfer<CheckedTypographyInput<T>>): Typography {
    const code = 'algebra.invalid-typography';
    const r = record(input, ['fontSize', 'lineHeight'], ['letterSpacing'], code);
    const fontSize = metric(r.fontSize, true, code);
    // Admit one mutually exclusive line-height form before reading its value.
    const l = record(r.lineHeight, [], ['ratio', 'value'], code);
    const keys = Object.keys(l);
    if (keys.length !== 1)
        reject(code);
    const lineHeight = keys[0] === 'ratio' ? fontSize * positive(l.ratio, code) : positive(l.value, code);
    return publishTypography(fontSize, lineHeight, Object.hasOwn(r, 'letterSpacing') ? metric(r.letterSpacing, false, code) : 0);
}
export function scaleTypography(value: Typography, factor: number): Typography { const v = typographyOperand(value), f = positive(factor, 'algebra.invalid-option'); return publishTypography(v.fontSize * f, v.lineHeight * f, v.letterSpacing * f); }
export function createTypographyScale<const T extends TypographyScaleOptions>(base: Typography, options: T & NoInfer<CheckedScaleOptions<T>>): TypographyScale<T['steps']> {
    const value = typographyOperand(base), code = 'algebra.invalid-option';
    const o = record(options, ['ratio', 'steps'], [], code), ratio = positive(o.ratio, code);
    if (o.steps === null || typeof o.steps !== 'object')
        reject(code);
    const names = Reflect.ownKeys(o.steps);
    if (names.length < 1 || names.length > 32 || names.some(n => typeof n !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(n)))
        reject(code);
    const steps = record(o.steps, names as string[], [], code);
    const admitted = (names as string[]).sort().map(name => { const step = numeric(steps[name], code); if (!Number.isInteger(step))
        reject(code); if (step < -16 || step > 16)
        reject('algebra.out-of-range'); const factor = positive(ratio ** step, code); return [name, publishTypography(value.fontSize * factor, value.lineHeight * factor, value.letterSpacing * factor)] as const; });
    // No map escapes until every step and computed metric has admitted.
    return Object.freeze(Object.fromEntries(admitted)) as TypographyScale<T['steps']>;
}
export function toNativeTypography(value: Typography): NativeTypographyStyle { return Object.freeze(typographyOperand(value)); }
