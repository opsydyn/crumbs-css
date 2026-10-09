import { test, expect } from 'bun:test';
import fc from 'fast-check';
import { defineContainer } from '../src/containers/definition';
import { resolveContainerValue, admitContainerValues } from '../src/containers/values';
const d = defineContainer({ owner: 'x', name: 'card', version: 1, axis: 'width', buckets: { small: 0, large: 100 } });
const opts = { seed: 20261009, numRuns: 300 };
test('selected values retain reference identity and prior mutable admission stays immutable', () => fc.assert(fc.property(fc.anything(), fc.anything(), fc.constantFrom('small', 'large', 'unmeasured' as const), (a, b, k) => { const values = { small: { a }, large: { b }, unmeasured: {} }; const old = admitContainerValues(d, values); expect(resolveContainerValue(d, k, values)).toBe(values[k]); values.small = { a: b }; expect(old.small).not.toBe(values.small); expect(resolveContainerValue(d, 'small', values)).toBe(values.small); }), opts));
