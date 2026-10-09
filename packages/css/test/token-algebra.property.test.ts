import { expect, test } from 'bun:test';
import fc from 'fast-check';
import { createColor, mixColor, toNativeColor, setColorAlpha, multiplyColorAlpha } from '../src/token-algebra/color';
import { colorOracle } from './oracles/token-algebra';
const fraction = fc.double({ min: 0, max: 1, noNaN: true });
const channels = fc.tuple(fraction, fraction, fraction, fraction);
const make = (v: readonly [
    number,
    number,
    number,
    number
]) => createColor({ space: 'srgb', components: [v[0], v[1], v[2]], alpha: v[3] });
const vector = (v: ReturnType<typeof createColor>) => [...v.components, v.alpha];
const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-12);
test('color_laws_match_independent_oracle_and_native_quantisation_bound', () => fc.assert(fc.property(channels, channels, fraction, fc.boolean(), (l, r, t, linear) => { const a = make(l), b = make(r), space = linear ? 'srgb-linear' : 'srgb'; const c = mixColor(a, b, { ratio: t, space }); const oracle = colorOracle(l, r, t, linear); vector(c).forEach((v, i) => { expect(v >= 0 && v <= 1).toBe(true); near(i === 3 ? v : v * c.alpha, oracle[i]! * (i === 3 ? 1 : c.alpha)); }); const quantised = createColor(toNativeColor(c)); expect(toNativeColor(quantised)).toBe(toNativeColor(c)); vector(c).forEach((v, i) => expect(Math.abs(v - vector(quantised)[i]!)).toBeLessThanOrEqual(1 / 510 + 8 * Number.EPSILON)); expect(mixColor(a, b, { ratio: 0, space })).toEqual(a); expect(mixColor(a, b, { ratio: 1, space })).toEqual(b); expect(setColorAlpha(a, t).alpha).toBe(t === 0 ? 0 : t); expect(multiplyColorAlpha(a, t).alpha).toBe(l[3] * t === 0 ? 0 : l[3] * t); expect(Object.isFrozen(c.components)).toBe(true); }), { seed: 20261009, numRuns: 200 }));
test('premultiplied_symmetry_includes_subnormal_alpha', () => { const cases = [0, Number.MIN_VALUE, 2 * Number.MIN_VALUE, .5, 1], ratios = [0, Number.MIN_VALUE, Number.EPSILON, .5, 1 - Number.EPSILON, 1]; for (const alpha of cases)
    for (const t of ratios)
        for (const space of ['srgb', 'srgb-linear'] as const) {
            const a = make([.1, .7, 1, alpha]), b = make([.8, .2, 0, Number.MIN_VALUE]);
            const c = mixColor(a, b, { ratio: t, space }), d = mixColor(b, a, { ratio: 1 - t, space });
            near(c.alpha, d.alpha);
            c.components.forEach((v, i) => near(v * c.alpha, d.components[i]! * d.alpha));
        } fc.assert(fc.property(channels, channels, fraction, (l, r, t) => { const c = mixColor(make(l), make(r), { ratio: t, space: 'srgb' }), d = mixColor(make(r), make(l), { ratio: 1 - t, space: 'srgb' }); near(c.alpha, d.alpha); c.components.forEach((v, i) => near(v * c.alpha, d.components[i]! * d.alpha)); }), { seed: 20261009, numRuns: 200 }); });
test('well_conditioned_rgb_symmetry_uses_visible_channels', () => { const a = make([.1, .7, .3, .75]), b = make([.8, .2, .9, .5]); for (const space of ['srgb', 'srgb-linear'] as const)
    for (const ratio of [.1, .25, .5, .9]) {
        const c = mixColor(a, b, { ratio, space }), d = mixColor(b, a, { ratio: 1 - ratio, space });
        c.components.forEach((v, i) => near(v, d.components[i]!));
    } });
import { createTypography, scaleTypography, createTypographyScale, toNativeTypography } from '../src/token-algebra/typography';
import { typographyOracle } from './oracles/token-algebra';
const relativeNear = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(1e-12, Math.abs(b) * 1e-12));
test('typography_scales_match_direct_oracle_key_order_and_admitted_composition', () => fc.assert(fc.property(fc.double({ min: 1, max: 1000, noNaN: true }), fc.double({ min: .5, max: 2, noNaN: true }), fc.double({ min: -10, max: 10, noNaN: true }), fc.double({ min: .5, max: 2, noNaN: true }), fc.integer({ min: -16, max: 16 }), (size, lineRatio, spacing, ratio, step) => { const b = createTypography({ fontSize: size, lineHeight: { ratio: lineRatio }, letterSpacing: spacing }); const scale = createTypographyScale(b, { ratio, steps: { title: step, body: 0, duplicate: step } }), reverse = createTypographyScale(b, { ratio, steps: { duplicate: step, body: 0, title: step } }); expect(scale).toEqual(reverse); expect(scale.title).toEqual(scale.duplicate); const expected = typographyOracle([size, size * lineRatio, spacing], ratio, step); Object.values(toNativeTypography(scale.title)).forEach((n, i) => relativeNear(n, expected[i]!)); const a = scaleTypography(scaleTypography(b, ratio), ratio), direct = scaleTypography(b, ratio * ratio); Object.values(toNativeTypography(a)).forEach((n, i) => relativeNear(n, Object.values(toNativeTypography(direct))[i]!)); expect(Object.isFrozen(scale)).toBe(true); expect(Object.isFrozen(scale.title)).toBe(true); }), { seed: 20261009, numRuns: 200 }));
