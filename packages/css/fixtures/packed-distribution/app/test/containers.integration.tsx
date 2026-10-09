import { expect, test } from 'bun:test';
import * as React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { createRequire } from 'node:module';
(globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const esm = await import('@opsydyn/crumbs-css/theme/containers');
const cjs = require('@opsydyn/crumbs-css/theme/containers') as typeof esm;
const first = process.env.CRUMBS_IMPORT_ORDER === 'cjs-first' ? cjs : esm, second = first === esm ? cjs : esm;
const define = (name = 'card', wide = 240) => first.defineContainer({ owner: '@fixture/ui', name, version: 1, axis: 'width', buckets: { narrow: 0, wide } });
const d = define();
const event = (width: number) => ({ nativeEvent: { layout: { width, height: 100, x: 0, y: 0 }, target: 1 }, timeStamp: 1, target: 1 } as never);
const values = Object.freeze({ unmeasured: 'initial', narrow: 'stacked', wide: 'row' });
const protocol = (layout: unknown) => (layout as Record<symbol, {
    inspect: () => {
        listeners: number;
        providerClaims: number;
        phase: string;
    };
}>)[Symbol.for('crumbs.css.container-owner.v1')]!;
test('installed React observes measurements, mutable tables and semantic replacement with retired callbacks', async () => {
    let layout!: ReturnType<typeof first.useContainerLayout>, selected: unknown;
    let def = d;
    const table = { ...values };
    const captures: typeof layout[] = [];
    function Reader() { selected = second.useContainerValue(def, table); return React.createElement('span', null, String(selected)); }
    function Owner() { layout = first.useContainerLayout(def); captures.push(layout); return React.createElement(second.ContainerProvider, { layout }, React.createElement(Reader)); }
    let root!: ReturnType<typeof Renderer.create>;
    await act(() => { root = Renderer.create(React.createElement(Owner)); });
    expect(selected).toBe('initial');
    const original = layout;
    await act(() => layout.onLayout(event(0)));
    expect(selected).toBe('stacked');
    await act(() => layout.onLayout(event(240)));
    expect(selected).toBe('row');
    table.wide = 'changed';
    await act(() => root.update(React.createElement(Owner)));
    expect(selected).toBe('changed');
    expect(layout).toBe(original);
    def = first.defineContainer({ owner: '@fixture/ui', name: 'card', version: 1, axis: 'width', buckets: { wide: 240, narrow: 0 } });
    await act(() => root.update(React.createElement(Owner)));
    expect(layout).toBe(original);
    expect(selected).toBe('changed');
    def = define('card', 300);
    await act(() => root.update(React.createElement(Owner)));
    expect(layout).not.toBe(original);
    expect(selected).toBe('initial');
    original.onLayout(Object.defineProperty({}, 'nativeEvent', { get() { throw Error('retired read'); } }) as never);
    const changed = layout;
    def = define('replacement');
    await act(() => root.update(React.createElement(Owner)));
    expect(layout).not.toBe(changed);
    expect(selected).toBe('initial');
    await act(() => layout.onLayout(event(288)));
    expect(selected).toBe('changed');
    const beforeKey = layout;
    await act(() => root.update(React.createElement(Owner, { key: 1 })));
    expect(layout).not.toBe(beforeKey);
    expect(selected).toBe('initial');
    await act(() => root.unmount());
    for (const l of new Set(captures))
        expect(protocol(l).inspect()).toMatchObject({ listeners: 0, providerClaims: 0 });
});
test('same-output crossings skip consumer commits and independent siblings stay unchanged', async () => {
    const a = {}, b = {}, table = Object.freeze({ unmeasured: a, narrow: a, wide: b });
    const layouts: Record<string, ReturnType<typeof first.useContainerLayout>> = {};
    const seen: Record<string, unknown> = {}, commits: Record<string, number> = {};
    function Reader({ id }: {
        id: string;
    }) { const v = second.useContainerValue(d, table); seen[id] = v; React.useEffect(() => { commits[id] = (commits[id] ?? 0) + 1; }, [v]); return React.createElement('span', null, id); }
    function Owner({ id }: {
        id: string;
    }) { const layout = first.useContainerLayout(d); layouts[id] = layout; return React.createElement(second.ContainerProvider, { layout }, React.createElement(Reader, { id })); }
    let root!: ReturnType<typeof Renderer.create>;
    await act(() => { root = Renderer.create(React.createElement(React.Fragment, null, React.createElement(Owner, { id: 'a' }), React.createElement(Owner, { id: 'b' }))); });
    await act(() => layouts.a!.onLayout(event(176)));
    expect(commits.a).toBe(1);
    await act(() => layouts.a!.onLayout(event(288)));
    expect(commits.a).toBe(2);
    expect(seen.b).toBe(a);
    expect(commits.b).toBe(1);
    await act(() => root.unmount());
    for (const l of Object.values(layouts))
        expect(protocol(l).inspect()).toMatchObject({ listeners: 0, providerClaims: 0 });
});
test('nearest same-identity owner shadows even unmeasured while different identities retain outer lookup', async () => {
    const region = define('region');
    let outer!: ReturnType<typeof first.useContainerLayout>, inner!: typeof outer;
    const seen: Record<string, unknown> = {};
    function Reader({ id, definition = d }: {
        id: string;
        definition?: typeof d;
    }) { seen[id] = second.useContainerValue(definition, values); return React.createElement('span', null, id); }
    function Inner({ definition }: {
        definition: typeof d;
    }) { const layout = first.useContainerLayout(definition); inner = layout; return React.createElement(second.ContainerProvider, { layout }, React.createElement(Reader, { id: 'inner' })); }
    function Tree({ definition }: {
        definition: typeof d;
    }) { outer = first.useContainerLayout(d); return React.createElement(second.ContainerProvider, { layout: outer }, React.createElement(Reader, { id: 'outer' }), React.createElement(Inner, { definition })); }
    let root!: ReturnType<typeof Renderer.create>;
    await act(() => { root = Renderer.create(React.createElement(Tree, { definition: d })); });
    await act(() => outer.onLayout(event(288)));
    expect(seen.outer).toBe('row');
    expect(seen.inner).toBe('initial');
    await act(() => inner.onLayout(event(96)));
    expect(seen.inner).toBe('stacked');
    await act(() => root.update(React.createElement(Tree, { definition: region })));
    expect(seen.inner).toBe('row');
    await act(() => root.unmount());
    await expect((async () => { await act(() => { Renderer.create(React.createElement(Tree, { definition: define('card', 300) })); }); })()).rejects.toThrow(/CONTRACT_MISMATCH/);
});
test('Strict Mode replay resubscribes, keyed remount resets, and initial commit updates cannot be missed', async () => {
    let layout!: ReturnType<typeof first.useContainerLayout>, seen: unknown;
    function Reader() { seen = second.useContainerValue(d, values); return React.createElement('span', null, String(seen)); }
    function Early() { React.useLayoutEffect(() => { layout.onLayout(event(288)); }, []); return React.createElement(Reader); }
    function Owner() { layout = first.useContainerLayout(d); return React.createElement(second.ContainerProvider, { layout }, React.createElement(Early)); }
    let root!: ReturnType<typeof Renderer.create>;
    await act(() => { root = Renderer.create(React.createElement(React.StrictMode, null, React.createElement(Owner, { key: 0 }))); });
    expect(seen).toBe('row');
    await act(() => layout.onLayout(event(176)));
    expect(seen).toBe('stacked');
    const old = layout;
    await act(() => root.update(React.createElement(React.StrictMode, null, React.createElement(Owner, { key: 1 }))));
    expect(layout).not.toBe(old);
    expect(seen).toBe('row');
    expect(protocol(old).inspect()).toMatchObject({ listeners: 0, providerClaims: 0 });
    await act(() => root.unmount());
    expect(protocol(layout).inspect()).toMatchObject({ listeners: 0, providerClaims: 0 });
});
test('missing providers and duplicate committed claims fail without poisoning subsequent trees', async () => {
    function Missing() { second.useContainerValue(d, values); return null; }
    await expect((async () => { await act(() => { Renderer.create(React.createElement(Missing)); }); })()).rejects.toThrow(/PROVIDER_REQUIRED/);
    let layout!: ReturnType<typeof first.useContainerLayout>;
    function Double() { layout = first.useContainerLayout(d); return React.createElement(React.Fragment, null, React.createElement(second.ContainerProvider, { layout }), React.createElement(second.ContainerProvider, { layout })); }
    await expect((async () => { await act(() => { Renderer.create(React.createElement(Double)); }); })()).rejects.toThrow(/OWNER_IN_USE/);
    expect(protocol(layout).inspect()).toMatchObject({ listeners: 0, providerClaims: 0 });
});
test('suspended never-committed owners allocate no claims or subscriptions', async () => {
    let abandoned!: ReturnType<typeof first.useContainerLayout>, live!: typeof abandoned;
    const pending = new Promise(() => { });
    function Suspended() { abandoned = first.useContainerLayout(d); throw pending; }
    function Replacement() { live = first.useContainerLayout(d); return React.createElement(second.ContainerProvider, { layout: live }); }
    let root!: ReturnType<typeof Renderer.create>;
    await act(() => { root = Renderer.create(React.createElement(React.Suspense, { fallback: React.createElement('span', null, 'pending') }, React.createElement(Suspended))); });
    expect(protocol(abandoned).inspect()).toMatchObject({ phase: 'created', listeners: 0, providerClaims: 0 });
    await act(() => root.update(React.createElement(Replacement)));
    expect(live).not.toBe(abandoned);
    expect(live.definition).toEqual(d);
    await act(() => root.unmount());
    expect(protocol(live).inspect()).toMatchObject({ listeners: 0, providerClaims: 0 });
});

test('committed Suspense hide/reveal reconnects stable selections without reviving retired subscriptions', async () => {
    let layout!: ReturnType<typeof first.useContainerLayout>, seen: unknown, hidden = false;
    const pending = new Promise(() => {});
    function Reader() { seen = second.useContainerValue(d, values); if (hidden) throw pending; return React.createElement('span', null, String(seen)); }
    function Owner() { layout = first.useContainerLayout(d); return React.createElement(second.ContainerProvider, {layout}, React.createElement(Reader)); }
    const tree = () => React.createElement(React.Suspense, {fallback: React.createElement('span', null, 'pending')}, React.createElement(Owner));
    let root!: ReturnType<typeof Renderer.create>;
    await act(() => { root = Renderer.create(tree()); });
    const original = layout;
    await act(() => layout.onLayout(event(176)));
    expect(seen).toBe('stacked');
    for (let replay = 0; replay < 3; replay++) {
        hidden = true;
        await act(() => root.update(tree()));
        expect(protocol(original).inspect()).toMatchObject({phase:'inactive',listeners:0,providerClaims:0});
        original.onLayout(Object.defineProperty({}, 'nativeEvent', {get(){throw Error('hidden read');}}) as never);
        hidden = false;
        await act(() => root.update(tree()));
        expect(layout).toBe(original);
        expect(protocol(layout).inspect()).toMatchObject({phase:'active',listeners:1,providerClaims:1});
        await act(() => layout.onLayout(event(288)));
        expect(seen).toBe('row');
        await act(() => layout.onLayout(event(176)));
        expect(seen).toBe('stacked');
    }
    await act(() => root.unmount());
    expect(protocol(original).inspect()).toMatchObject({phase:'inactive',listeners:0,providerClaims:0});
});
