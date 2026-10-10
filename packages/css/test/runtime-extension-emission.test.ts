import { expect, it } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { transformCssTsToStyleSheet, buildStyleSheetCode } from '../src/transformer';
import { captureNativeExports } from '../src/export-values';
import { defineExtension } from '../src/extensions';
const root = path.resolve(import.meta.dir, '..');
async function fixture(runtime: string, authoring: string, check: (code: string, control: Record<string, any>, load: () => Promise<Record<string, any>>) => Promise<void>) {
    const dir = mkdtempSync(path.join(root, 'fixtures/.extension-emission-'));
    const pkg = path.join(dir, 'node_modules/@acme/runtime');
    mkdirSync(pkg, { recursive: true });
    mkdirSync(path.join(dir, 'node_modules/@opsydyn'), { recursive: true });
    symlinkSync(root, path.join(dir, 'node_modules/@opsydyn/crumbs-css'));
    writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@fixture/emission', type: 'module' }));
    writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: '@acme/runtime', type: 'module', exports: { '.': { import: './runtime.mjs', require: './runtime.cjs' } } }));
    writeFileSync(path.join(pkg, 'runtime.mjs'), runtime);
    writeFileSync(path.join(pkg, 'runtime.cjs'), `exports.make=function make(){return ()=>0;};`);
    const file = path.join(dir, 'case.css.ts');
    writeFileSync(file, `import {viewStyle} from '@opsydyn/crumbs-css/style';import {defineExtension} from '@opsydyn/crumbs-css/extensions';const factory=defineExtension<{make:(...args:unknown[])=>()=>unknown}>().factory({importPath:'@acme/runtime',importName:'make'});${authoring}`);
    try {
        const code = await transformCssTsToStyleSheet(file, dir, { useStyleSheet: false, includeStyleExplanations: false });
        const output = path.join(dir, 'compiled.mjs');
        writeFileSync(output, code);
        const control = await import(path.join(pkg, 'runtime.mjs'));
        await check(code, control, () => import(output));
    }
    finally {
        rmSync(dir, { recursive: true, force: true });
    }
}
it('aliases reconstruct once with exact arity and undefined this; separate invocations remain distinct', async () => {
    await fixture(`export const calls=[];export function make(){const args=Array.from(arguments);calls.push({argc:arguments.length,thisValue:this,args});return function result(){return args;};}`, `export const first=factory({missing:undefined,n:-0},undefined);export const firstAlias=first;export const nested=[first];export const second=factory({missing:undefined,n:-0},undefined);`, async (code, control, load) => {
        expect(control.calls).toEqual([]);
        const runtime = await load();
        expect(typeof runtime.first).toBe('function');
        expect(runtime.first).toBe(runtime.firstAlias);
        expect(runtime.nested[0]).toBe(runtime.first);
        expect(runtime.second).not.toBe(runtime.first);
        expect(control.calls.map((c: any) => c.argc)).toEqual([2, 2]);
        expect(control.calls.every((c: any) => c.thisValue === undefined)).toBe(true);
        expect(Object.is(control.calls[0].args[0].n, -0)).toBe(true);
        expect(Object.hasOwn(control.calls[0].args[0], 'missing')).toBe(true);
        expect(Object.isFrozen(control.calls[0].args[0])).toBe(true);
        expect(code).not.toContain('@opsydyn/crumbs-css/extensions');
        expect(code).not.toContain('Symbol.for("crumbs.css.runtime-extension")');
    });
});
it('factory exceptions propagate unchanged and are not retried', async () => {
    await fixture(`export let calls=0;export const sentinel={error:'factory failure'};export function make(){calls++;throw sentinel;}`, `export const result=factory();`, async (_code, control, load) => {
        let failure: unknown;
        try {
            await load();
        }
        catch (error) {
            failure = error;
        }
        expect(failure).toBe(control.sentinel);
        expect(control.calls).toBe(1);
    });
});
it('invalid imported factory and returned shape have stable own code/path TypeErrors', async () => {
    for (const [runtime, expected] of [[`export const make=3;`, 'extension.invalid-factory'], [`export function make(){return 3;}`, 'extension.invalid-result']] as const) {
        await fixture(runtime, `export const nested={result:factory()};`, async (_code, _control, load) => {
            let failure: any;
            try {
                await load();
            }
            catch (error) {
                failure = error;
            }
            expect(failure).toBeInstanceOf(TypeError);
            expect(Object.hasOwn(failure, 'code')).toBe(true);
            expect(failure.code).toBe(expected);
            expect(failure.path).toBe('nested.result');
        });
    }
});
it('fresh argument snapshots preserve null prototypes and own prototype-like keys without freezing shared style exports', async () => {
    await fixture(`export function make(...args){return ()=>args;}`, `export const style=viewStyle({opacity:0.5});const data=Object.assign(Object.create(null),JSON.parse('{"__proto__":{"safe":true}}'),{missing:undefined,n:-0});export const result=factory(style,data);`, async (_code, _control, load) => { const out = await load(); const args = out.result(); expect(args[0]).toEqual({ opacity: 0.5 }); expect(args[0]).not.toBe(out.style); expect(Object.isFrozen(args[0])).toBe(true); expect(Object.isFrozen(out.style)).toBe(false); out.style.opacity = 1; expect(args[0].opacity).toBe(0.5); expect(Object.getPrototypeOf(args[1])).toBeNull(); expect(Object.hasOwn(args[1], '__proto__')).toBe(true); expect(Object.hasOwn(args[1], 'missing')).toBe(true); expect(Object.is(args[1].n, -0)).toBe(true); });
});
it('ordinary modules retain their exact emission bytes', () => {
    const captured = captureNativeExports({ label: 'plain', view: 'base' }, 'control.css.ts', new Set(['base']), null);
    expect(buildStyleSheetCode(new Map(Object.entries(captured)), new Map([['base', { opacity: 0.5 }]]), [], { useStyleSheet: false })).toBe(`const _s = {\n  "base": {"opacity":0.5}\n};\nexport const __crumbsModule = Object.freeze({$$type:"crumbs.css.native-module",version:2,tokens:Object.freeze([]),dependencyPlan:Object.freeze({$$type:"crumbs.css.theme-dependency-plan",version:1,entries:Object.freeze([])}),conditions:Object.freeze([])});\nexport const label = "plain";\nexport const view = _s["base"];`);
});
it('direct module emission refuses an unverified endpoint', () => {
    const factory = defineExtension<{
        make: () => () => void;
    }>().factory({ importPath: '@acme/runtime', importName: 'make' });
    const out = captureNativeExports({ result: factory() }, 'case.css.ts', new Set(), null);
    expect(() => buildStyleSheetCode(new Map(Object.entries(out)), new Map(), [], { useStyleSheet: false })).toThrow(/extension.unresolved-import/);
});
it('omitted and explicit undefined arguments remain different and private aliases avoid authored names', async () => {
    await fixture(`export const calls=[];export function make(){calls.push(arguments.length);return ()=>0;}`, `export const __crumbsExtensionError0=7;export const __crumbsExtensionFactory1=8;export const a=factory();export const b=factory(undefined);`, async (_code, control, load) => { const out = await load(); expect(control.calls).toEqual([0, 1]); expect(out.__crumbsExtensionError0).toBe(7); expect(out.__crumbsExtensionFactory1).toBe(8); });
});
it('an empty genuine native style becomes an empty argument record', async () => { await fixture(`export function make(style){return ()=>style;}`, `export const result=factory(viewStyle({}));`, async (_code, _control, load) => { const out = await load(); expect(out.result()).toEqual({}); expect(Object.isFrozen(out.result())).toBe(true); }); });
it('the runtime factory owns its rest tuple; only supplied argument data is frozen', async () => { await fixture(`export function make(...args){return ()=>args;}`, `export const result=factory({value:1});`, async (_code, _control, load) => { const out = await load(), args = out.result(); expect(Object.isFrozen(args)).toBe(false); expect(Object.isFrozen(args[0])).toBe(true); args.push('owned runtime state'); expect(out.result()[0]).toEqual({ value: 1 }); }); });
it('documented maximum container depth survives actual compiled reconstruction', async () => {
    await fixture(`export function make(value){return ()=>value;}`, `let value=null;for(let i=0;i<32;i++)value=[value];export const result=factory(value);`, async (_code, _control, load) => {
        let value = (await load()).result();
        for (let i = 0; i < 32; i++) {
            expect(Object.isFrozen(value)).toBe(true);
            value = value[0];
        }
        expect(value).toBeNull();
    });
});
