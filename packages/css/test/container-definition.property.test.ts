import { test, expect } from 'bun:test';
import fc from 'fast-check';
import { defineContainer, getContainerBucket, containerDefinitionSignature } from '../src/containers/definition';
import { expectedContainerBucket } from './oracles/containers';
const opts = { seed: 20261009, numRuns: 300 };
const minima = fc.uniqueArray(fc.integer({ min: 1, max: 10000 }), { maxLength: 15 }).map(xs => [0, ...xs.sort((a, b) => a - b)]);
test('record order, half-open intervals and monotonic indices follow an independent oracle', () => fc.assert(fc.property(minima, fc.double({ min: 0, max: 20000, noNaN: true, noDefaultInfinity: true }), fc.double({ min: 0, max: 20000, noNaN: true, noDefaultInfinity: true }), (ms, a, b) => {
    const entries = ms.map((min, i) => ['b' + i, min] as const), input = { owner: '@fixture/ui', name: 'card', version: 1, axis: 'width' as const, buckets: Object.fromEntries(entries) }, d = defineContainer(input), reverse = defineContainer({ ...input, buckets: Object.fromEntries([...entries].reverse()) });
    expect(containerDefinitionSignature(d)).toBe(containerDefinitionSignature(reverse));
    expect(getContainerBucket(d, a)).toBe(expectedContainerBucket(entries.map(([name,min])=>({name,min})), a));
    expect(Number(getContainerBucket(d, Math.min(a, b)).slice(1))).toBeLessThanOrEqual(Number(getContainerBucket(d, Math.max(a, b)).slice(1)));
    expect(input.buckets).toEqual(Object.fromEntries(entries));
}), opts));
test('adversarial accessor admission never executes caller code', () => fc.assert(fc.property(fc.string(), name => { let calls = 0; const x = { owner: 'x', name: 'x', version: 1, axis: 'width' as const, buckets: { a: 0 } }; Object.defineProperty(x.buckets, name, { get() { calls++; return 0; }, enumerable: true }); expect(() => defineContainer(x)).toThrow(); expect(calls).toBe(0); }), opts));
