import { expect, test } from 'bun:test';
import fc from 'fast-check';
import { defineMotion } from '../src/theme-motion';
const config = { seed: 20261009, numRuns: 300 };
test('record_order_and_copy_preservation_law', () => fc.assert(fc.property(fc.double({ min: 0, max: 1, noNaN: true }), fc.double({ min: -1e6, max: 1e6, noNaN: true }), fc.boolean(), (opacity, x, reverse) => { const a = reverse ? { translateX: x, opacity } : { opacity, translateX: x }; const b = reverse ? { opacity: 1, translateX: -x } : { translateX: -x, opacity: 1 }; const d = defineMotion({ states: { a, b }, transition: { duration: 180, easing: 'linear' } }); expect(Object.keys(d.states.a)).toEqual(['opacity', 'translateX']); expect(d.states.a.opacity).toBe(opacity === 0 ? 0 : opacity); expect(d.states.a.translateX).toBe(x === 0 ? 0 : x); a.opacity = 0; expect(d.states.a.opacity).toBe(opacity === 0 ? 0 : opacity); }), config));
test('getter_safety_law', () => fc.assert(fc.property(fc.constantFrom('states', 'transition'), key => { let count = 0; const x: any = { states: { a: { opacity: 1 } }, transition: { duration: 180, easing: 'linear' } }; Object.defineProperty(x, key, { get() { count++; throw Error('executed'); }, enumerable: true }); expect(() => defineMotion(x as never)).toThrow('CRUMBS_CSS_INVALID_MOTION_DEFINITION'); expect(count).toBe(0); }), config));
test('numeric_domain_law', () => fc.assert(fc.property(fc.double({ noNaN: false }), n => { const okay = Number.isFinite(n) && Number.isFinite(Math.fround(n)); const call = () => defineMotion({ states: { a: { translateX: n } }, transition: { duration: 0, easing: 'linear' } }); if (okay)
    expect(call().states.a.translateX).toBe(n === 0 ? 0 : n);
else
    expect(call).toThrow('CRUMBS_CSS_INVALID_MOTION_DEFINITION'); }), config));
