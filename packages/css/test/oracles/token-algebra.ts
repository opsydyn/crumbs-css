/** Independent reference implementation: no production helpers. */
export function colorOracle(left: readonly number[], right: readonly number[], t: number, linear: boolean): number[] {
    if (t === 0)
        return [...left];
    if (t === 1)
        return [...right];
    const alpha = (1 - t) * left[3]! + t * right[3]!;
    if (alpha === 0)
        return [0, 0, 0, 0];
    const linearise = (x: number) => x > .04045 ? Math.pow((x + .055) / 1.055, 2.4) : x / 12.92;
    const encoded = (x: number) => x > .0031308 ? 1.055 * Math.pow(x, 1 / 2.4) - .055 : 12.92 * x;
    const channels = [0, 1, 2].map(i => { const a = linear ? linearise(left[i]!) : left[i]!, b = linear ? linearise(right[i]!) : right[i]!; const c = ((1 - t) * left[3]! * a + t * right[3]! * b) / alpha; return linear ? encoded(c) : c; });
    return [...channels, alpha];
}
export function typographyOracle(base: readonly [
    number,
    number,
    number
], ratio: number, step: number): readonly [
    number,
    number,
    number
] { const f = Math.pow(ratio, step); return [base[0] * f, base[1] * f, base[2] * f]; }
