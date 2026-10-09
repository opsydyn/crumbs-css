import { expect, test } from 'bun:test';
import { buildAlgebraScenario } from '../src/components/token-algebra/algebra-model';
test('scenario_controls_are_independent_of_native_font_scale_and_unrelated_state', () => { const input = { foundation: 'blue', space: 'srgb', ratio: 1.25, step: 'title' } as const; const initial = buildAlgebraScenario(input); expect(initial.generated.colors).toEqual({ tint: '#8080ffff', replacement: '#0000ff80', attenuation: '#0000ff20' }); expect(initial.generated.metrics).toEqual({ fontSize: 25, lineHeight: 37.5, letterSpacing: -.390625 }); expect(initial.control).toEqual(initial.generated); for (const nativeFontScale of [1, 1.3])
    for (const unrelated of [false, true]) {
        expect(buildAlgebraScenario({ ...input, nativeFontScale, unrelated } as typeof input)).toEqual(initial);
    } const linear = buildAlgebraScenario({ ...input, space: 'srgb-linear' }); expect(linear.generated.colors.tint).toBe('#bcbcffff'); const red = buildAlgebraScenario({ ...input, foundation: 'red' }); expect(red.generated.colors).toEqual({ tint: '#ff8080ff', replacement: '#ff000080', attenuation: '#ff000020' }); expect(buildAlgebraScenario({ ...input, foundation: 'red', space: 'srgb-linear' }).control.colors.tint).toBe('#ffbcbcff'); const larger = buildAlgebraScenario({ ...input, ratio: 1.5 }); expect(larger.generated.metrics).toEqual({ fontSize: 36, lineHeight: 54, letterSpacing: -.5625 }); expect(larger.base).toEqual({ fontSize: 16, lineHeight: 24, letterSpacing: -.25 }); for (const ratio of [1.25, 1.5] as const)
    for (const step of ['caption', 'body', 'title'] as const) {
        const s = buildAlgebraScenario({ ...input, ratio, step });
        expect(s.generated.colors).toEqual(s.control.colors);
        for (const key of ['fontSize', 'lineHeight', 'letterSpacing'] as const)
            expect(s.generated.metrics[key]).toBeCloseTo(s.control.metrics[key], 12);
        expect(s.base).toEqual(initial.base);
    } expect(buildAlgebraScenario({ ...input, ratio: 1.5, step: 'body' }).generated.metrics).toEqual(initial.base); });
