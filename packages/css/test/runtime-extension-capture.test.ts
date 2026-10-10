import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { transformCssTsToStyleSheet } from '../src/transformer';
import { expect, it } from 'bun:test';
import { runInNewContext } from 'node:vm';
import { defineExtension } from '../src/extensions';
import { captureNativeExports, ExportRecordType } from '../src/export-values';
const marker = Symbol.for('crumbs.css.runtime-extension');
const factory = defineExtension<{
    make: (...args: unknown[]) => () => void;
}>().factory({ importPath: '@acme/runtime', importName: 'make' });
const cap = (value: Record<string, unknown>, handles: ReadonlySet<string> = new Set()) => captureNativeExports(value, 'test.css.ts', handles, /unused\s/g);
async function api() { return await import('../src/compiler/runtime-extension-capture').catch(() => undefined); }
it('nested aliases share one capture; distinct invocations remain distinct; ids follow code-unit export order', async () => {
    const a = factory({ value: undefined }), b = factory({ value: undefined });
    const out = cap({ z: [a, b], a: { second: a } });
    const m = await api();
    expect(m).toBeDefined();
    const first = (out.a as {
        entries: [
            string,
            unknown
        ][];
    }).entries[0]![1];
    const rest = out.z as unknown[];
    expect(m!.isCapturedRuntimeExtension(first)).toBe(true);
    expect(first).toBe(rest[0]);
    expect(first).not.toBe(rest[1]);
    expect((first as {
        id: number;
    }).id).toBe(0);
    expect((rest[1] as {
        id: number;
    }).id).toBe(1);
    expect(Object.keys(out)).toEqual(['z', 'a']);
});
it('spoofed class and extension records remain ordinary data; unmarked and upstream functions stay rejected', () => {
    const out = cap({ data: { $$type: 'crumbs.css.runtime-extension', version: 1, importPath: '@acme/runtime', importName: 'make', args: [] } });
    expect((out.data as {
        $$type: string;
    }).$$type).toBe(ExportRecordType);
    expect(() => cap({ data: () => 1 })).toThrow(/CRUMBS_CSS_UNSUPPORTED_EXPORT/);
    expect(() => cap({ data: Object.assign(() => 1, { __recipe__: {} }) })).toThrow(/CRUMBS_CSS_UNSUPPORTED_EXPORT/);
    const result = cap({ data: factory({ $$type: 'crumbs.css.class', className: 'base' }) }, new Set(['base']));
    expect((result.data as {
        args: unknown[];
    }).args).toEqual([{ $$type: 'crumbs.css.class', className: 'base' }]);
});
it('known evaluator realm copies frozen data safely without inspecting a function body', async () => {
    const foreign = runInNewContext(`(()=>{const f=()=>{throw new Error('executed')};Object.defineProperty(f,Symbol.for('crumbs.css.runtime-extension'),{value:Object.freeze({$$type:'crumbs.css.runtime-extension',version:1,importPath:'@acme/runtime',importName:'make',args:Object.freeze([Object.freeze(Object.assign(Object.create(null),{x:undefined,n:-0}))])})});return Object.freeze(f)})()`);
    const out = cap({ native: foreign });
    const value = (out.native as {
        args: Record<string, unknown>[];
    }).args[0]!;
    expect(Object.getPrototypeOf(value)).toBeNull();
    expect(Object.hasOwn(value, 'x')).toBe(true);
    expect(Object.is(value.n, -0)).toBe(true);
    expect(Object.isFrozen(value)).toBe(true);
});
it('independently rejects forged versions, marker accessors, mutable snapshots and decorated placeholders', () => {
    const descriptor = Object.getOwnPropertyDescriptor(factory(), marker)!;
    const cases = [{ ...descriptor.value, version: 2 }, { ...descriptor.value, args: [] }, { ...descriptor.value, extra: true }];
    for (const d of cases) {
        const f = () => 0;
        Object.defineProperty(f, marker, { value: Object.freeze(d) });
        expect(() => cap({ nested: [f] })).toThrow(/CRUMBS_CSS_UNSUPPORTED_EXPORT.*nested\[0\].*extension\./);
    }
    let calls = 0;
    const accessor = () => 0;
    Object.defineProperty(accessor, marker, { get() { calls++; return descriptor.value; } });
    expect(() => cap({ data: accessor })).toThrow(/CRUMBS_CSS_UNSUPPORTED_EXPORT/);
    expect(calls).toBe(0);
    const decorated = () => 0;
    Object.defineProperty(decorated, marker, descriptor);
    Object.defineProperty(decorated, 'extra', { value: 3 });
    expect(() => cap({ data: decorated })).toThrow(/extension.invalid-argument/);
});
it('enforces per-module unique placeholder and endpoint quotas, counting aliases once', () => {
    const shared = factory();
    expect(() => cap({ data: Array(128).fill(shared) })).not.toThrow();
    expect(() => cap({ data: Array.from({ length: 129 }, () => factory()) })).toThrow(/extension.resource-limit/);
    const endpoints = Array.from({ length: 33 }, (_, i) => defineExtension<{
        make: () => () => void;
    }>().factory({ importPath: `@acme/runtime${i}`, importName: 'make' })());
    expect(() => cap({ data: endpoints.slice(0, 32) })).not.toThrow();
    expect(() => cap({ data: endpoints })).toThrow(/extension.resource-limit/);
});
it('lowers genuine composed style refs into fresh snapshots and rejects nested local operands and expanded limits', async () => {
    const m = await api();
    expect(m).toBeDefined();
    const captured = cap({ native: factory('unused base') }, new Set(['unused base'])).native as Parameters<NonNullable<typeof m>['lowerRuntimeExtensionArguments']>[0];
    const style = { opacity: 0.5 };
    const args = m!.lowerRuntimeExtensionArguments(captured, new Map([['base', style]]), new Map());
    expect(args).toEqual([{ opacity: 0.5 }]);
    expect(args[0]).not.toBe(style);
    expect(Object.isFrozen(style)).toBe(false);
    expect(Object.isFrozen(args[0])).toBe(true);
    const large = Object.fromEntries(Array.from({ length: 257 }, (_, i) => [`k${i}`, i]));
    expect(() => m!.lowerRuntimeExtensionArguments(captured, new Map([['base', large]]), new Map())).toThrow(/extension.resource-limit/);
    expect(() => m!.lowerRuntimeExtensionArguments(captured, new Map([['base', style]]), new Map([['base', {}]]))).toThrow(/extension.invalid-argument/);
    for (const tag of ['crumbs.css.local-var', 'crumbs.css.local-fallback', 'crumbs.css.local-assignments', 'crumbs.css.local-style-plan'])
        expect(() => cap({ native: factory({ nested: [{ $$type: tag }] }) })).toThrow(/extension.invalid-argument/);
});
it('rejects inherited protocol descriptors and invalid intrinsic fields independently of helper identity', () => {
    const original = Object.getOwnPropertyDescriptor(factory(), marker)!.value;
    const bad = Object.freeze(Object.assign(Object.create({ hidden: true }), original));
    const inherited = () => 0;
    Object.defineProperty(inherited, marker, { value: bad });
    Object.freeze(inherited);
    expect(() => cap({ data: inherited })).toThrow(/extension.invalid-argument/);
    const invalid = () => 0;
    Object.defineProperty(invalid, 'length', { value: 'not a length' });
    Object.defineProperty(invalid, marker, { value: original });
    Object.freeze(invalid);
    expect(() => cap({ data: invalid })).toThrow(/extension.invalid-argument/);
    const version = () => 0;
    Object.defineProperty(version, marker, { value: Object.freeze({ ...original, version: 2 }) });
    Object.freeze(version);
    expect(() => cap({ data: version })).toThrow(/extension.unsupported-version/);
});
it('native composition still validates property domains before an extension can be emitted', async () => {
    const root = path.resolve(import.meta.dir, '..'), dir = mkdtempSync(path.join(root, 'fixtures/.extension-capture-'));
    const file = path.join(dir, 'case.css.ts');
    try {
        writeFileSync(file, `import {defineExtension} from '@opsydyn/crumbs-css/extensions';import {viewStyle,textStyle} from '@opsydyn/crumbs-css/style';const factory=defineExtension<{make:(x:unknown)=>()=>void}>().factory({importPath:'@acme/runtime',importName:'make'});export const Component=factory(viewStyle([viewStyle({opacity:0.5}),{textShadowOffset:{width:1,height:2}}] as never));`);
        await expect(transformCssTsToStyleSheet(file, root, { useStyleSheet: false })).rejects.toThrow(/primitive|CRUMBS_STRUCTURED_IR/);
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
});
it('capture admits exactly 32 nested containers and lowering retains the scalar leaf', async () => {
    let value: unknown = null;
    for (let i = 0; i < 32; i++)
        value = [value];
    const out = cap({ result: factory(value) });
    const m = await api();
    const args = m!.lowerRuntimeExtensionArguments(out.result as any, new Map(), new Map());
    let leaf: any = args[0];
    for (let i = 0; i < 32; i++) {
        expect(Object.isFrozen(leaf)).toBe(true);
        leaf = leaf[0];
    }
    expect(leaf).toBeNull();
    expect(() => factory([value])).toThrow(/extension.resource-limit/);
    const original = factory(value), descriptor = Object.getOwnPropertyDescriptor(original, marker)!.value;
    const forged = () => undefined;
    Object.defineProperty(forged, marker, { value: Object.freeze({ ...descriptor, args: Object.freeze([Object.freeze([descriptor.args[0]])]) }) });
    Object.freeze(forged);
    expect(() => cap({ result: forged })).toThrow(/extension.resource-limit/);
});
