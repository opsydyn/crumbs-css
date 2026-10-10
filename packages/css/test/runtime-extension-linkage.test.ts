import { expect, it, spyOn } from 'bun:test';
import * as fs from 'node:fs';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { defineExtension } from '../src/extensions';
import { createRuntimeExtensionCapture } from '../src/compiler/runtime-extension-capture';
import { hasChangedResolutionIdentity } from '../src/compiler/resolution-identity';
const root = path.resolve(import.meta.dir, '..');
async function linker() { const api = await import('../src/compiler/runtime-extension-linkage').catch(() => undefined); expect(api).toBeDefined(); return api!; }
function fixture() { const dir = mkdtempSync(path.join(root, 'fixtures/.extension-linkage-')); const pkg = path.join(dir, 'node_modules/@acme/runtime'); mkdirSync(pkg, { recursive: true }); writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: '@fixture/link', type: 'module', exports: { './runtime': './self.mjs' } })); writeFileSync(path.join(dir, 'entry.css.ts'), 'export const control=1;'); writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ name: '@acme/runtime', type: 'module', exports: { '.': { import: './runtime.mjs', require: './runtime.cjs' } } })); writeFileSync(path.join(pkg, 'runtime.mjs'), `throw new Error('RUNTIME_SENTINEL');export function make(){return ()=>0;}`); writeFileSync(path.join(pkg, 'runtime.cjs'), `exports.make = function make(){return ()=>0;};`); return { dir, pkg, options: { cwd: dir, absoluteEntryPath: path.join(dir, 'entry.css.ts'), platform: null, dev: true }, clean: () => rmSync(dir, { recursive: true, force: true }) }; }
function captured(importPath = '@acme/runtime', importName = 'make') {
    const make = defineExtension<{
        make: () => () => void;
    }>().factory({ importPath, importName: 'make' });
    const fn = make();
    if (importName === 'make')
        return [createRuntimeExtensionCapture('entry.css.ts', new Set(), null).capture(fn, 'Component')];
    const d = Object.getOwnPropertyDescriptor(fn, Symbol.for('crumbs.css.runtime-extension'))!.value;
    const altered = () => 0;
    Object.defineProperty(altered, Symbol.for('crumbs.css.runtime-extension'), { value: Object.freeze({ ...d, importName }) });
    Object.freeze(altered);
    return [createRuntimeExtensionCapture('entry.css.ts', new Set(), null).capture(altered, 'Component')];
}
it('runtime sentinel and native peer code are not evaluated by inert named-link probes', async () => {
    const f = fixture();
    try {
        const api = await linker();
        const result = await api.linkRuntimeExtensions(captured(), f.options);
        expect(result.endpoints).toHaveLength(1);
        await expect(import(path.join(f.pkg, 'runtime.mjs'))).rejects.toThrow('RUNTIME_SENTINEL');
        writeFileSync(path.join(f.pkg, 'runtime.mjs'), `import {View} from 'react-native';throw new Error('NATIVE_SENTINEL');export function make(){return View;}`);
        expect((await api.linkRuntimeExtensions(captured(), f.options)).endpoints).toHaveLength(1);
    }
    finally {
        f.clean();
    }
});
it('missing named exports and dynamically manufactured CommonJS names are refused', async () => {
    const f = fixture();
    try {
        const api = await linker();
        await expect(api.linkRuntimeExtensions(captured('@acme/runtime', 'missing'), f.options)).rejects.toThrow(/extension.unresolved-import/);
        writeFileSync(path.join(f.pkg, 'runtime.cjs'), `const name='make';exports[name]=()=>()=>0;`);
        await expect(api.linkRuntimeExtensions(captured(), f.options)).rejects.toThrow(/extension.unresolved-import/);
    }
    finally {
        f.clean();
    }
});
it('conditional exports and self references/static reexports resolve to recorded endpoints', async () => {
    const f = fixture();
    try {
        const api = await linker();
        writeFileSync(path.join(f.pkg, 'package.json'), JSON.stringify({ name: '@acme/runtime', type: 'module', exports: { '.': { 'react-native': { ios: { import: './ios.mjs', require: './runtime.cjs' }, default: { import: './runtime.mjs', require: './runtime.cjs' } }, import: './runtime.mjs', require: './runtime.cjs' } } }));
        writeFileSync(path.join(f.pkg, 'ios.mjs'), `export {make} from './runtime.mjs';`);
        writeFileSync(path.join(f.dir, 'self.mjs'), `export function make(){return ()=>0;}`);
        const result = await api.linkRuntimeExtensions(captured(), { ...f.options, platform: 'ios' });
        expect(result.endpoints[0]!.targets.map(t => path.basename(t.logicalPath))).toEqual(['runtime.mjs', 'runtime.cjs']);
        expect(result.endpoints[0]!.targets[0]!.conditionSet).toContain('react-native');
        expect((await api.linkRuntimeExtensions(captured('@fixture/link/runtime'), f.options)).endpoints).toHaveLength(1);
    }
    finally {
        f.clean();
    }
});
it('runtime body and package or symlink retargets invalidate current receipts', async () => {
    const f = fixture();
    try {
        const api = await linker();
        let receipt = (await api.linkRuntimeExtensions(captured(), f.options)).resolutionIdentity;
        expect(hasChangedResolutionIdentity(receipt)).toBe(false);
        writeFileSync(path.join(f.pkg, 'runtime.mjs'), `export function make(){return ()=>1;}`);
        expect(hasChangedResolutionIdentity(receipt)).toBe(true);
        receipt = (await api.linkRuntimeExtensions(captured(), f.options)).resolutionIdentity;
        writeFileSync(path.join(f.pkg, 'package.json'), JSON.stringify({ name: '@acme/runtime', type: 'module', exports: { '.': './runtime.mjs' } }));
        expect(hasChangedResolutionIdentity(receipt)).toBe(true);
        const linked = path.join(f.dir, 'node_modules/@acme/link');
        symlinkSync(f.pkg, linked);
        receipt = (await api.linkRuntimeExtensions(captured('@acme/link'), f.options)).resolutionIdentity;
        unlinkSync(linked);
        const next = path.join(f.dir, 'other');
        mkdirSync(next);
        writeFileSync(path.join(next, 'package.json'), JSON.stringify({ name: '@acme/link', type: 'module', exports: { '.': './runtime.mjs' } }));
        writeFileSync(path.join(next, 'runtime.mjs'), `export function make(){return ()=>2;}`);
        symlinkSync(next, linked);
        expect(hasChangedResolutionIdentity(receipt)).toBe(true);
    }
    finally {
        f.clean();
    }
});
it('sources changing during every linkage pass fail rather than publishing a stale receipt', async () => {
    const f = fixture();
    const api = await linker();
    const target = path.join(f.pkg, 'runtime.mjs');
    const original = fs.readFileSync;
    let edits = 0;
    const spy = spyOn(fs, 'readFileSync').mockImplementation(((file: unknown, ...args: unknown[]) => {
        const value = Reflect.apply(original, fs, [file, ...args]);
        if (String(file) === target) {
            writeFileSync(target, `export function make(){return ()=>${++edits};}`);
        }
        return value;
    }) as typeof fs.readFileSync);
    try {
        await expect(api.linkRuntimeExtensions(captured(), f.options)).rejects.toThrow(/extension.unresolved-import.*changed during linkage/);
        expect(edits).toBeGreaterThan(0);
    }
    finally {
        spy.mockRestore();
        f.clean();
    }
});
it('an ESM-only package must prove the requested named export', async () => {
    const f = fixture();
    try {
        const api = await linker();
        writeFileSync(path.join(f.pkg, 'package.json'), JSON.stringify({ name: '@acme/runtime', type: 'module', exports: { '.': './runtime.mjs' } }));
        await expect(api.linkRuntimeExtensions(captured('@acme/runtime', 'missing'), f.options)).rejects.toThrow(/extension.unresolved-import/);
    }
    finally {
        f.clean();
    }
});
it('mixed ESM-to-CommonJS reexports fail closed before a missing runtime name can ship', async () => {
    const f = fixture();
    try {
        const api = await linker();
        writeFileSync(path.join(f.pkg, 'runtime.mjs'), `export { missing as make } from './actual.cjs';`);
        writeFileSync(path.join(f.pkg, 'actual.cjs'), `exports.other=function other(){return ()=>0;};`);
        await expect(api.linkRuntimeExtensions(captured(), f.options)).rejects.toThrow(/extension.unresolved-import/);
    }
    finally {
        f.clean();
    }
});
it('Node default conditions are not replaced by compiler development or production branches', async () => {
    const f = fixture();
    try {
        const api = await linker();
        writeFileSync(path.join(f.pkg, 'package.json'), JSON.stringify({ name: '@acme/runtime', type: 'module', exports: { '.': { development: './runtime.mjs', production: './runtime.mjs', default: './actual.mjs' } } }));
        writeFileSync(path.join(f.pkg, 'actual.mjs'), `export function other(){return ()=>0;}`);
        for (const dev of [true, false])
            await expect(api.linkRuntimeExtensions(captured(), { ...f.options, dev })).rejects.toThrow(/extension.unresolved-import/);
    }
    finally {
        f.clean();
    }
});
it('ambiguous Metro platform siblings are refused and missing candidates invalidate receipts', async () => {
    const f = fixture();
    try {
        const api = await linker();
        writeFileSync(path.join(f.pkg, 'package.json'), JSON.stringify({ name: '@acme/runtime', type: 'module', main: './runtime' }));
        rmSync(path.join(f.pkg, 'runtime.mjs'));
        rmSync(path.join(f.pkg, 'runtime.cjs'));
        writeFileSync(path.join(f.pkg, 'runtime.js'), `export function make(){return ()=>0;}`);
        const options = { ...f.options, platform: 'ios' };
        const result = await api.linkRuntimeExtensions(captured(), options);
        expect(result.endpoints[0]!.targets.every(t => t.logicalPath.endsWith('runtime.js'))).toBe(true);
        expect(hasChangedResolutionIdentity(result.resolutionIdentity)).toBe(false);
        writeFileSync(path.join(f.pkg, 'runtime.ios.js'), `export function other(){return ()=>0;}`);
        expect(hasChangedResolutionIdentity(result.resolutionIdentity)).toBe(true);
        await expect(api.linkRuntimeExtensions(captured(), options)).rejects.toThrow(/extension.unresolved-import/);
    }
    finally {
        f.clean();
    }
});
it('stock Expo conditions select react-native default rather than an unasserted ios branch', async () => {
    const f = fixture();
    try {
        const api = await linker();
        writeFileSync(path.join(f.pkg, 'package.json'), JSON.stringify({ name: '@acme/runtime', type: 'module', exports: { '.': { 'react-native': { ios: './runtime.mjs', default: './actual.mjs' }, default: './runtime.mjs' } } }));
        writeFileSync(path.join(f.pkg, 'actual.mjs'), `export function other(){return ()=>0;}`);
        await expect(api.linkRuntimeExtensions(captured(), { ...f.options, platform: 'ios' })).rejects.toThrow(/extension.unresolved-import/);
    }
    finally {
        f.clean();
    }
});
it('Node-only built-in conditions cannot bypass the supported cross-version proof', async () => {
    const f = fixture();
    try {
        const api = await linker();
        writeFileSync(path.join(f.pkg, 'other.mjs'), `export function other(){return ()=>0;}`);
        for (const condition of ['module-sync', 'node-addons']) {
            writeFileSync(path.join(f.pkg, 'package.json'), JSON.stringify({ name: '@acme/runtime', type: 'module', exports: { '.': { [condition]: './other.mjs', default: './runtime.mjs' } } }));
            await expect(api.linkRuntimeExtensions(captured(), f.options)).rejects.toThrow(/extension.unresolved-import/);
        }
    }
    finally {
        f.clean();
    }
});
