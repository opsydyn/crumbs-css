import { expect, test } from 'bun:test';
import { createColor, mixColor, setColorAlpha, toNativeColor } from '../src/token-algebra/color';
const unsafeCreate = createColor as (value: unknown) => ReturnType<typeof createColor>;
const unsafeMix = mixColor as (...args: unknown[]) => ReturnType<typeof mixColor>;
const errorCode = (fn: () => unknown, code: string) => { let error: unknown; try {
    fn();
}
catch (e) {
    error = e;
} expect(error).toBeInstanceOf(TypeError); expect((error as any)?.code).toBe(code); expect((error as Error)?.message.length).toBeLessThan(180); };
test('invalid_hex_is_bounded_and_uses_invalid_color', () => { for (const input of ['red', '#12', '#12345', '#1234567', '#123456789', ' #fff', '#fff ', '#Ｇ00', 'rgb(0,0,0)', 'x'.repeat(10000)])
    errorCode(() => createColor(input), 'algebra.invalid-color'); });
test('admission_rejects_getters_symbols_hidden_extra_and_custom_prototypes', () => { let reads = 0; const good = { space: 'srgb', components: [0, 0, 1] }; const values = [{ ...good, get alpha() { reads++; return 1; } }, { ...good, extra: 1 }, { ...good, alpha: undefined }, Object.assign(Object.create({ inherited: 1 }), good), Object.assign(new Date(), good), { ...good, [Symbol()]: 1 }, Object.defineProperty({ ...good }, 'alpha', { value: 1, enumerable: false }), { space: 'srgb', components: [0, , 1] }, { space: 'srgb', components: Object.assign([0, 0, 1], { extra: 1 }) }]; for (const value of values)
    errorCode(() => unsafeCreate(value), 'algebra.invalid-color'); expect(reads).toBe(0); });
test('forged_operands_options_and_numeric_ranges_have_stable_codes', () => { const b = createColor('#000'); errorCode(() => toNativeColor({ ...b, version: 2 } as any), 'algebra.invalid-descriptor'); errorCode(() => unsafeMix(b, b, { ratio: .5, space: 'p3' }), 'algebra.invalid-option'); errorCode(() => setColorAlpha(b, 1.1), 'algebra.out-of-range'); for (const n of [NaN, Infinity, -Infinity, -.1, 1.1])
    errorCode(() => createColor({ space: 'srgb', components: [n, 0, 0] }), 'algebra.out-of-range'); errorCode(() => unsafeMix(b, b, { ratio: 0, space: 'srgb', extra: true }), 'algebra.invalid-option'); });
test('foreign_plain_descriptors_work_but_cycles_and_decorated_tuples_do_not', () => { const b = createColor('#1234'); expect(toNativeColor(JSON.parse(JSON.stringify(b)))).toBe('#11223344'); expect(toNativeColor(unsafeCreate(Object.assign(Object.create(null), { space: 'srgb', components: [0, 0, 0] })))).toBe('#000000ff'); const cycle: any = { space: 'srgb' }; cycle.components = cycle; errorCode(() => unsafeCreate(cycle), 'algebra.invalid-color'); const tuple = [0, 0, 0]; Object.defineProperty(tuple, '0', { get() { throw Error('executed'); }, enumerable: true }); errorCode(() => unsafeCreate({ space: 'srgb', components: tuple }), 'algebra.invalid-color'); });
import { TokenAlgebraError } from '../src/token-algebra/error';
test('public_error_constructor_never_stringifies_untrusted_codes', () => { let calls = 0; const error = new TokenAlgebraError({ toString() { calls++; return 'x'.repeat(10000); } } as any); expect(calls).toBe(0); expect(error.code).toBe('algebra.invalid-option'); expect(error.message.length).toBeLessThan(180); });
