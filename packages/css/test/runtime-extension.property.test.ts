import { test, expect } from 'bun:test';
import fc from 'fast-check';
import { defineExtension } from '../src/extensions';
import { extensionValueShape } from './oracles/runtime-extension';
const leaf = fc.oneof(fc.constant(undefined), fc.constant(null), fc.boolean(), fc.double({ noNaN: true, noDefaultInfinity: true }), fc.string({ maxLength: 32 }));
const value = fc.oneof(leaf, fc.array(leaf, { maxLength: 8 }), fc.dictionary(fc.string({ maxLength: 16 }), leaf, { maxKeys: 8 }));
const create = defineExtension<{
    make: (value: unknown) => () => void;
}>().factory({ importPath: 'pkg/runtime', importName: 'make' });
test('snapshot_meaning_matches_independent_ordinary_value_oracle', () => { fc.assert(fc.property(value, input => { const result = create(input); const args = Object.getOwnPropertyDescriptor(result, Symbol.for('crumbs.css.runtime-extension'))!.value.args; expect(extensionValueShape(args[0])).toEqual(extensionValueShape(input)); expect(Object.isFrozen(args)).toBe(true); if (input && typeof input === 'object')
    expect(Object.isFrozen(input)).toBe(false); }), { seed: 20261009, numRuns: 200 }); });
test('separate_invocations_are_never_interned', () => { fc.assert(fc.property(value, input => { expect(create(input)).not.toBe(create(input)); }), { seed: 20261009, numRuns: 200 }); });
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { captureNativeExports } from '../src/export-values';
import { collectRuntimeExtensions } from '../src/compiler/runtime-extension-capture';
import { linkRuntimeExtensions } from '../src/compiler/runtime-extension-linkage';
import { buildStyleSheetCode } from '../src/transformer';
const sample = fc.oneof(value, fc.constant(-0), fc.constant({ $$type: 'crumbs.css.class', className: 'ordinary' }).map(v => ({ ...v })), fc.dictionary(fc.constantFrom('__proto__', 'constructor', 'missing', 'n'), leaf, { maxKeys: 4 }).map(v => Object.assign(Object.create(null), v)));
async function propertyFixture(run: (ctx: {
    code: (bindings: Record<string, unknown>) => string;
    load: (bindings: Record<string, unknown>) => Promise<Record<string, any>>;
    make: (x: unknown) => () => void;
}) => Promise<void>) {
    const dir = mkdtempSync(path.join(path.resolve(import.meta.dir, '../fixtures'), '.extension-property-')), pkg = path.join(dir, 'node_modules/@acme/property');
    mkdirSync(pkg, { recursive: true });
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@fixture/property', type: 'module' }));
    const entry = path.join(dir, 'entry.css.ts');
    writeFileSync(entry, 'export const control=1;');
    writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: '@acme/property', type: 'module', exports: { '.': './runtime.mjs' } }));
    writeFileSync(path.join(pkg, 'runtime.mjs'), `export function make(...args){return function result(){return args;};}`);
    const make = defineExtension<{
        make: (x: unknown) => () => void;
    }>().factory({ importPath: '@acme/property', importName: 'make' });
    const captured = captureNativeExports({ result: make(0) }, entry, new Set(), null);
    const proof = await linkRuntimeExtensions(collectRuntimeExtensions(new Map(Object.entries(captured))), { cwd: dir, absoluteEntryPath: entry, platform: null, dev: true });
    let ordinal = 0;
    const code = (bindings: Record<string, unknown>) => buildStyleSheetCode(new Map(Object.entries(captureNativeExports(bindings, entry, new Set(), null))), new Map(), [], { useStyleSheet: false, runtimeExtensionLinkage: proof });
    try {
        await run({ make, code, async load(bindings) { const file = path.join(dir, `generated-${ordinal++}.mjs`); writeFileSync(file, code(bindings)); return await import(file); } });
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
function frozenTree(value: unknown): boolean { return value === null || typeof value !== 'object' || Object.isFrozen(value) && Object.values(value).every(frozenTree); }
test('emitted portable meaning matches the independent oracle', async () => { await propertyFixture(async (ctx) => { await fc.assert(fc.asyncProperty(sample, async (input) => { const runtime = await ctx.load({ result: ctx.make(input) }); expect(extensionValueShape(runtime.result()[0])).toEqual(extensionValueShape(input)); expect(frozenTree(runtime.result()[0])).toBe(true); }), { seed: 20261009, numRuns: 200 }); }); });
test('named export permutations produce identical emitted bytes', async () => { await propertyFixture(async (ctx) => { await fc.assert(fc.asyncProperty(sample, fc.shuffledSubarray(['z', 'A', 'a', 'control'], { minLength: 4, maxLength: 4 }), async (input, order) => { const a = ctx.make(input), b = ctx.make(input), bindings = { z: [a, b], A: { alias: a }, a: b, control: 7 }; const expected = ctx.code(bindings); expect(ctx.code(Object.fromEntries(order.map(k => [k, bindings[k as keyof typeof bindings]])))).toBe(expected); }), { seed: 20261009, numRuns: 200 }); }); });
test('captured snapshots survive caller mutation and remain frozen after real module import', async () => { await propertyFixture(async (ctx) => { await fc.assert(fc.asyncProperty(sample, async (input) => { const expected = extensionValueShape(input), placeholder = ctx.make(input); if (input && typeof input === 'object') {
    if (Array.isArray(input))
        input.push('mutation');
    else
        Object.defineProperty(input, 'mutation', { value: true, enumerable: true, writable: true, configurable: true });
} const runtime = await ctx.load({ result: placeholder }); expect(extensionValueShape(runtime.result()[0])).toEqual(expected); expect(frozenTree(runtime.result()[0])).toBe(true); }), { seed: 20261009, numRuns: 200 }); }); });
test('alias versus distinct identity and unrelated data are independent', async () => { await propertyFixture(async (ctx) => { await fc.assert(fc.asyncProperty(sample, fc.integer(), async (input, unrelated) => { const first = ctx.make(input), second = ctx.make(input); const runtime = await ctx.load({ first, alias: first, nested: [first], second, unrelated }); expect(runtime.first).toBe(runtime.alias); expect(runtime.nested[0]).toBe(runtime.first); expect(runtime.second).not.toBe(runtime.first); expect(extensionValueShape(runtime.first()[0])).toEqual(extensionValueShape(input)); expect(extensionValueShape(runtime.second()[0])).toEqual(extensionValueShape(input)); expect(runtime.unrelated).toBe(unrelated); }), { seed: 20261009, numRuns: 200 }); }); });
