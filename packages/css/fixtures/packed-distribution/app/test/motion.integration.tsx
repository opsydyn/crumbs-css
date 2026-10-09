import { expect, test, mock } from 'bun:test';
import * as React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const require = createRequire(import.meta.url), fake = require('./motion-peer.cjs');
mock.module('react-native', () => fake.peer);
const loadedFormats: string[] = [];
let modules: Awaited<ReturnType<typeof loadModules>> | undefined;
async function loadModules() {
    type NativeModule = typeof import('@opsydyn/crumbs-css/theme/motion/native');
    const esm = async () => { const value = await import('@opsydyn/crumbs-css/theme/motion/native'); loadedFormats.push('esm'); return value; };
    const cjs = () => { const value = require('@opsydyn/crumbs-css/theme/motion/native') as NativeModule; loadedFormats.push('cjs'); return value; };
    const first = process.env.CRUMBS_IMPORT_ORDER === 'cjs-first' ? cjs() : await esm();
    const second = process.env.CRUMBS_IMPORT_ORDER === 'cjs-first' ? await esm() : cjs();
    const pure = await import('@opsydyn/crumbs-css/theme/motion');
    return { first, second, pure };
}
async function load() { return modules ??= await loadModules(); }
const input = { states: { resting: { opacity: .6, translateX: 0 }, selected: { opacity: 1, translateX: 112 } }, transition: { duration: 180, easing: 'ease-in-out' } } as const;
const options = { initial: 'resting', motion: 'full', duration: 180 } as const;
test('native Hook exists in the installed artifact', async () => { const { first, second } = await load(); expect(Object.keys(first)).toEqual(['useNativeMotion']); expect(Object.keys(second)).toEqual(['useNativeMotion']); expect(loadedFormats).toEqual(process.env.CRUMBS_IMPORT_ORDER === 'cjs-first' ? ['cjs', 'esm'] : ['esm', 'cjs']); console.log('actual native import sequence: ' + loadedFormats.join(' -> ')); });
test('stable controller, committed options, captured duration and initial lifetime', async () => { const { first, pure } = await load(), d = pure.defineMotion(input); let o: any = { ...options }, c!: ReturnType<typeof first.useNativeMotion>, commits = 0; function Owner() { c = first.useNativeMotion(d, o); React.useLayoutEffect(() => { commits++; }); return React.createElement('view'); } let root!: ReturnType<typeof Renderer.create>; await act(() => { root = Renderer.create(React.createElement(Owner)); }); const original = c, style = c.style; const run = c.animateTo('selected'); fake.sample(); expect(fake.stats.timings.at(-1).config).toMatchObject({ duration: 180, useNativeDriver: true, isInteraction: false }); o = { ...options, initial: 'selected', duration: 250 }; await act(() => root.update(React.createElement(Owner))); expect(c).toBe(original); expect(c.style).toBe(style); expect(fake.stats.timings.at(-1).config.duration).toBe(180); const count = commits; fake.finish(); expect(commits).toBe(count); expect((await run.result).status).toBe('finished'); const next = c.animateTo('resting'); fake.sample(); expect(fake.stats.timings.at(-1).config.duration).toBe(250); await act(() => root.unmount()); expect((await next.result).status).toBe('cancelled'); expect(fake.stats.listeners).toBe(0); });
test('aborted render cannot publish speculative reduced motion', async () => { const { first, pure } = await load(), d = pure.defineMotion(input); let suspended = false, o: any = { ...options }, c!: ReturnType<typeof first.useNativeMotion>; const pending = new Promise(() => { }); function Owner() { const candidate = first.useNativeMotion(d, o); if (suspended)
    throw pending; c = candidate; return React.createElement('view'); } const tree = () => React.createElement(React.Suspense, { fallback: React.createElement('fallback') }, React.createElement(Owner)); let root!: ReturnType<typeof Renderer.create>; await act(() => { root = Renderer.create(tree()); }); const run = c.animateTo('selected'); let result: unknown; run.result.then(x => result = x); suspended = true; o = { ...options, motion: 'reduced' }; await act(() => { React.startTransition(() => root.update(tree())); }); expect(result).toBeUndefined(); fake.sample(); fake.finish(); expect(await run.result).toEqual({ status: 'finished', target: 'selected', mode: 'animated' }); await act(() => root.unmount()); });
test('Strict Mode and three committed Suspense hide/reveal cycles retire runs', async () => { const { first, pure } = await load(), d = pure.defineMotion(input); let hide = false, c!: ReturnType<typeof first.useNativeMotion>; const pending = new Promise(() => { }); function Owner() { c = first.useNativeMotion(d, options); if (hide)
    throw pending; return React.createElement('view'); } const tree = () => React.createElement(React.StrictMode, null, React.createElement(React.Suspense, { fallback: React.createElement('fallback') }, React.createElement(Owner))); let root!: ReturnType<typeof Renderer.create>; await act(() => { root = Renderer.create(tree()); }); for (let cycle = 0; cycle < 3; cycle++) {
    const controller = c, run = c.animateTo('selected');
    if (cycle % 2)
        fake.sample();
    hide = true;
    await act(() => root.update(tree()));
    expect(await run.result).toEqual({ status: 'cancelled', target: 'selected', reason: 'deactivated' });
    const starts = fake.stats.timings.length;
    fake.sample();
    fake.finish();
    expect(fake.stats.timings.length).toBe(starts);
    expect(await controller.animateTo('selected').result).toEqual({ status: 'cancelled', target: 'selected', reason: 'deactivated' });
    hide = false;
    await act(() => root.update(tree()));
    expect(c).toBe(controller);
    const resumed = c.animateTo('resting');
    fake.sample();
    fake.finish();
    expect((await resumed.result).status).toBe('finished');
} await act(() => root.unmount()); });
test('replacement owners and two physical copies remain independent', async () => { const { first, second, pure } = await load(); const installed = dirname(require.resolve('@opsydyn/crumbs-css/package.json')), foreign = await import(resolve(installed, '../crumbs-css-copy/dist/theme-motion.mjs')); const foreignHook = await import(resolve(installed, '../crumbs-css-copy/dist/theme-motion-native.mjs')); let definition = pure.defineMotion(input), a!: ReturnType<typeof first.useNativeMotion>, b!: typeof a; const other = foreign.defineMotion(input); function Owner() { a = second.useNativeMotion(definition, options); b = foreignHook.useNativeMotion(other, options); return React.createElement('view'); } let root!: ReturnType<typeof Renderer.create>; await act(() => { root = Renderer.create(React.createElement(Owner)); }); const old = a, ar = a.animateTo('selected'), br = b.animateTo('selected'); definition = pure.defineMotion(input); await act(() => root.update(React.createElement(Owner))); expect(a).not.toBe(old); expect((await ar.result).status).toBe('cancelled'); const before = fake.stats.timings.length; old.cancel(); old.set('selected'); expect(fake.stats.timings.length).toBe(before); fake.sample(); fake.finish(); expect((await br.result).status).toBe('finished'); await act(() => root.unmount()); });
test('reduced policy completes current run and unsupported platforms reject', async () => { const { first, pure } = await load(), d = pure.defineMotion(input); let o: any = { ...options }, c!: ReturnType<typeof first.useNativeMotion>; function Owner() { c = first.useNativeMotion(d, o); return React.createElement('view'); } let root!: ReturnType<typeof Renderer.create>; await act(() => { root = Renderer.create(React.createElement(Owner)); }); const run = c.animateTo('selected'); o = { ...options, motion: 'reduced' }; await act(() => root.update(React.createElement(Owner))); expect(await run.result).toEqual({ status: 'finished', target: 'selected', mode: 'immediate' }); const starts = fake.stats.timings.length; fake.sample(); fake.finish(); expect(fake.stats.timings.length).toBe(starts); await act(() => root.unmount()); fake.peer.Platform.OS = 'macos'; try {
    await expect((async () => { await act(() => { Renderer.create(React.createElement(Owner)); }); })()).rejects.toThrow('CRUMBS_CSS_MOTION_UNSUPPORTED_PLATFORM');
}
finally {
    fake.peer.Platform.OS = 'ios';
} });
