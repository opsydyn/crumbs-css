import { expect, test } from "bun:test";
import { defineContainer, getContainerBucket, admitContainerDefinition, containerDefinitionSignature } from "../src/containers/definition";
const input = (buckets = { narrow: 0, wide: 240 }) => ({ owner: "@fixture/ui", name: "card", version: 1, axis: "width" as const, buckets });
test("fractional half-open thresholds distinguish absence from genuine zero", () => {
    const d = defineContainer(input());
    for (const [size, want] of [[undefined, "unmeasured"], [0, "narrow"], [239.5, "narrow"], [240, "wide"], [240.5, "wide"]] as const)
        expect(getContainerBucket(d, size)).toBe(want);
    for (const size of [null, -1, NaN, Infinity, "240"])
        expect(() => getContainerBucket(d, size as number)).toThrow(/INVALID_CONTAINER_MEASUREMENT/);
});
test("canonical definitions are sorted, copied and deeply immutable", () => {
    const x = input();
    const a = defineContainer(x), b = defineContainer(input({ wide: 240, narrow: -0 }));
    x.buckets.narrow = 4;
    expect(a.buckets).toEqual([{ name: "narrow", min: 0 }, { name: "wide", min: 240 }]);
    expect(Object.is(b.buckets[0]!.min, -0)).toBe(false);
    expect(containerDefinitionSignature(a)).toBe(containerDefinitionSignature(b));
    expect(Object.isFrozen(a.buckets[0])).toBe(true);
    expect(Object.isFrozen(a.identity)).toBe(true);
    expect(admitContainerDefinition(JSON.parse(JSON.stringify(a)))).toEqual(a);
});
test("bucket cardinality, grammar, minima and identity are admitted exactly", () => {
    for (const n of [1, 16])
        expect(defineContainer(input(Object.fromEntries(Array.from({ length: n }, (_, i) => ['b' + i, i])) as never)).buckets).toHaveLength(n);
    for (const buckets of [{}, Object.fromEntries(Array.from({ length: 17 }, (_, i) => ['b' + i, i])), { a: 1 }, { a: 0, b: 0 }, { a: -1 }, { a: NaN }, { a: Infinity }, { unmeasured: 0 }, { constructor: 0 }, { prototype: 0 }, { ['__proto__']: 0 }, { ['a'.repeat(65)]: 0 }, { '1bad': 0 }])
        expect(() => defineContainer(input(buckets as never))).toThrow(/INVALID_CONTAINER_DEFINITION/);
    for (const patch of [{ owner: 'Bad Package' }, { name: '1bad' }, { version: 0 }, { version: 1.5 }, { axis: 'both' }, { extra: 1 }])
        expect(() => defineContainer({ ...input(), ...patch } as never)).toThrow(/INVALID_CONTAINER_DEFINITION/);
});
test("hidden, symbolic, accessor and prototype data never masquerade as definitions", () => {
    let calls = 0;
    const getter = () => { calls++; throw Error('executed'); };
    for (const x of [Object.defineProperty(input(), 'owner', { get: getter }), Object.assign(input(), { [Symbol()]: 1 }), Object.defineProperty(input(), 'hidden', { value: 1 }), Object.assign(Object.create({ x: 1 }), input())])
        expect(() => defineContainer(x)).toThrow(/INVALID_CONTAINER_DEFINITION/);
    expect(() => defineContainer(input(Object.defineProperty({ narrow: 0 }, 'wide', { enumerable: true, get: getter }) as never))).toThrow(/INVALID_CONTAINER_DEFINITION/);
    expect(calls).toBe(0);
    const d = defineContainer(input());
    for (const buckets of [new Array(2), Object.assign([...d.buckets], { extra: 1 }), [Object.defineProperty({ name: 'narrow' }, 'min', { get: getter, enumerable: true })]])
        expect(() => admitContainerDefinition({ ...d, buckets })).toThrow(/INVALID_CONTAINER_DEFINITION/);
    expect(() => admitContainerDefinition({ ...d, formatVersion: 2 })).toThrow(/CONTAINER_UNSUPPORTED_VERSION/);
    expect(calls).toBe(0);
});
