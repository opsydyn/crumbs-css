import { test, expect } from 'bun:test';
import { defineContainer } from '../src/containers/definition';
import { createContainerOwner } from '../src/containers/owner';
const d = defineContainer({ owner: 'x', name: 'card', version: 1, axis: 'width', buckets: { narrow: 0, wide: 240 } });
const event = (width: unknown, height: unknown = 100) => ({ nativeEvent: { layout: { width, height, x: 0, y: 0 } }, timeStamp: 1, target: 1 } as never);
test('created owners keep first measurement and publish only finite bucket changes', () => { const o = createContainerOwner(d), initial = o.getSnapshot(); expect(initial.bucket).toBe('unmeasured'); let calls = 0; const off = o.subscribe(() => calls++); o.onLayout(event(0)); expect(o.getSnapshot().bucket).toBe('narrow'); expect(o.getServerSnapshot()).toBe(initial); for (let i = 0; i < 10000; i++)
    o.updateSize(i / 100); expect(calls).toBe(1); o.updateSize(240); expect(calls).toBe(2); expect(o.getSnapshot()).toEqual({ key: 'crumbs.css.container:x#card@1', signature: '["width",[["narrow",0],["wide",240]]]', bucket: 'wide' }); off(); off(); expect(o.inspect().listeners).toBe(0); });
test('malformed live events preserve snapshot and retired callbacks ignore payload getters', () => { const o = createContainerOwner(d); o.onLayout(event(176)); const before = o.getSnapshot(); for (const x of [null, {}, event(null), event(-1), event(NaN), event(Infinity)])
    expect(() => o.onLayout(x as never)).toThrow(/INVALID_CONTAINER_MEASUREMENT/); expect(o.getSnapshot()).toBe(before); o.onLayout(event(176, NaN)); expect(o.getSnapshot()).toBe(before); o.deactivate(); o.onLayout(Object.defineProperty({}, 'nativeEvent', { get() { throw Error('read retired payload'); } }) as never); expect(o.inspect().listeners).toBe(0); });
test('16 buckets intern at most 17 snapshots across repeated events', () => { const o = createContainerOwner(defineContainer({ ...d.identity, axis: 'width', buckets: Object.fromEntries(Array.from({ length: 16 }, (_, i) => ['b' + i, i])) })); for (let j = 0; j < 100; j++)
    for (let i = 0; i < 16; i++)
        o.updateSize(i); expect(o.inspect().internedSnapshots).toBe(17); });
test('provider generations and unsubscribe registrations survive strict replay without stale release', () => { const o = createContainerOwner(d), token = {}; const old = o.claimProvider(token); expect(() => o.claimProvider({})).toThrow(/OWNER_IN_USE/); o.updateSize(250); const snapshot = o.getSnapshot(); let calls = 0; o.subscribe(() => calls++); o.deactivate(); o.activate(); const release = o.claimProvider(token); old(); expect(o.inspect().providerClaims).toBe(1); o.subscribe(() => calls++); o.updateSize(10); expect(calls).toBe(1); expect(snapshot.bucket).toBe('wide'); release(); release(); o.deactivate(); expect(o.inspect()).toMatchObject({ listeners: 0, providerClaims: 0, phase: 'inactive' }); });
test('removed subscriptions are skipped and reentrant transactions cannot recursively publish', () => { const o = createContainerOwner(d); let second = 0; let off = () => { }; o.subscribe(() => off()); off = o.subscribe(() => second++); o.updateSize(10); expect(second).toBe(0); const stop = o.subscribe(() => { const same = o.getSnapshot().bucket === 'narrow' ? 10 : 250; expect(o.updateSize(same)).toBe(false); o.updateSize(same === 10 ? 250 : 10); }); expect(() => o.updateSize(250)).toThrow(/REENTRANT_UPDATE/); expect(o.getSnapshot().bucket).toBe('wide'); stop(); expect(o.updateSize(10)).toBe(true); });
test('sequential layout feedback is exposed rather than silently suppressed', () => { const o = createContainerOwner(d), trace: string[] = []; for (let i = 0; i < 12; i++) {
    o.updateSize(i % 2 ? 288 : 176);
    trace.push(o.getSnapshot().bucket);
} expect(trace).toEqual(Array.from({ length: 12 }, (_, i) => i % 2 ? 'wide' : 'narrow')); expect(o.inspect().publications).toBe(12); });

test('accepts RN88 prototype-backed nativeEvent accessors at the host event boundary', () => {
    class LayoutEvent extends Event {
        constructor(private readonly payload: unknown) { super('layout'); }
        get nativeEvent() { return this.payload; }
    }
    const owner = createContainerOwner(d); let publications = 0; owner.subscribe(() => publications++);
    owner.onLayout(new LayoutEvent({ layout: { width: 176, height: 100 } }) as never);
    expect(owner.getSnapshot().bucket).toBe('narrow');
    owner.onLayout(new LayoutEvent({ layout: { width: 288, height: 100 } }) as never);
    expect(owner.getSnapshot().bucket).toBe('wide');
    expect(publications).toBe(2);
});

test('normalizes failed host nativeEvent reads and never reads retired or nested accessors', () => {
    const owner = createContainerOwner(d); owner.onLayout(event(176)); const before = owner.getSnapshot(); let reads = 0;
    const broken = Object.defineProperty({}, 'nativeEvent', { get() { reads++; throw Error('host payload unavailable'); } });
    expect(() => owner.onLayout(broken as never)).toThrow(/INVALID_CONTAINER_MEASUREMENT/);
    expect(reads).toBe(1); expect(owner.getSnapshot()).toBe(before);
    let nestedReads = 0;
    expect(() => owner.onLayout({nativeEvent: Object.defineProperty({}, 'layout', {get() {nestedReads++; return {width:288};}})} as never)).toThrow(/INVALID_CONTAINER_MEASUREMENT/);
    expect(nestedReads).toBe(0); expect(owner.getSnapshot()).toBe(before);
    owner.deactivate(); owner.onLayout(broken as never); expect(reads).toBe(1);
});
