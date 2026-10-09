import { test, expect } from 'bun:test';
import fc from 'fast-check';
import { defineContainer } from '../src/containers/definition';
import { createContainerOwner } from '../src/containers/owner';
import { expectedContainerBucket } from './oracles/containers';
const d = defineContainer({ owner: 'x', name: 'card', version: 1, axis: 'width', buckets: { a: 0, b: 240, c: 500 } });
test('lifecycle and malformed event sequences preserve oracle state and finite collections', () => fc.assert(fc.property(fc.array(fc.oneof(fc.integer({ min: 0, max: 1000 }), fc.constantFrom('stop', 'start', 'sub', 'off', 'invalid')), { maxLength: 100 }), (actions) => {
    const o = createContainerOwner(d);
    let active = true, want = 'unmeasured', count = 0, off: (() => void) | undefined;
    for (const action of actions) {
        if (typeof action === 'number') {
            const next = expectedContainerBucket(d.buckets, action);
            if (active && next !== want) {
                count++;
                want = next;
            }
            o.updateSize(action);
        }
        else if (action === 'stop') {
            o.deactivate();
            active = false;
            off = undefined;
        }
        else if (action === 'start') {
            o.activate();
            active = true;
        }
        else if (action === 'sub') {
            off?.();
            off = o.subscribe(() => { });
        }
        else if (action === 'off') {
            off?.();
            off = undefined;
        }
        else {
            const before = o.getSnapshot();
            if (active)
                expect(() => o.onLayout({ nativeEvent: { layout: { width: NaN } } } as never)).toThrow();
            else
                o.onLayout(null as never);
            expect(o.getSnapshot()).toBe(before);
        }
        expect(o.getSnapshot().bucket).toBe(want);
        expect(o.inspect().publications).toBe(count);
        expect(o.inspect().internedSnapshots).toBeLessThanOrEqual(4);
    }
    off?.();
    o.deactivate();
    expect(o.inspect()).toMatchObject({ listeners: 0, providerClaims: 0 });
}), { seed: 20261009, numRuns: 300 }));
