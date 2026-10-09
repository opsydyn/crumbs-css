import { test, expect } from 'bun:test';
import { defineContainer } from '../src/containers/definition';
import { admitContainerValues } from '../src/containers/values';
import { createContainerOwner } from '../src/containers/owner';
import { createContainerSelector } from '../src/containers/selector';
const d = defineContainer({ owner: 'x', name: 'card', version: 1, axis: 'width', buckets: { narrow: 0, wide: 240 } });
test('Object.is selection suppresses same-reference crossings and detaches the final subscription', () => { const o = createContainerOwner(d), a = {}, b = {}, s = createContainerSelector(o, admitContainerValues(d, { unmeasured: a, narrow: a, wide: b })); let calls = 0; const off = s.subscribe(() => calls++); expect(o.inspect().listeners).toBe(1); o.updateSize(10); expect(calls).toBe(0); o.updateSize(250); expect(calls).toBe(1); o.updateSize(260); expect(calls).toBe(1); expect(s.getSnapshot()).toBe(b); expect(s.getServerSnapshot()).toBe(a); off(); off(); expect(o.inspect().listeners).toBe(0); const again = s.subscribe(() => calls++); o.updateSize(10); expect(calls).toBe(2); again(); expect(s.inspect()).toMatchObject({ listeners: 0, parentSubscriptions: 0 }); });
test('selection catches an update before subscribe and table replacement without a measurement', () => { const o = createContainerOwner(d), a = {}, b = {}, table = { unmeasured: a, narrow: a, wide: a }; const old = createContainerSelector(o, admitContainerValues(d, table)); o.updateSize(10); expect(old.getSnapshot()).toBe(a); table.narrow = b; const fresh = createContainerSelector(o, admitContainerValues(d, table)); expect(old.getSnapshot()).toBe(a); expect(fresh.getSnapshot()).toBe(b); });
test('a read from an earlier owner listener cannot swallow the selector notification',()=>{const o=createContainerOwner(d),a={},b={},s=createContainerSelector(o,admitContainerValues(d,{unmeasured:a,narrow:a,wide:b}));let calls=0;o.subscribe(()=>s.getSnapshot());const off=s.subscribe(()=>calls++);o.updateSize(250);expect(calls).toBe(1);off();});

test('selector layout reconnection restores retained listeners through a fresh registration',()=>{
 const o=createContainerOwner(d),s=createContainerSelector(o,admitContainerValues(d,{unmeasured:'initial',narrow:'small',wide:'large'}));let calls=0;
 o.activate();const off=s.subscribe(()=>calls++);o.updateSize(100);expect(calls).toBe(1);
 s.deactivate();o.deactivate();expect(o.inspect().listeners).toBe(0);expect(s.inspect()).toMatchObject({listeners:1,parentSubscriptions:0});
 s.activate();o.activate();s.activate();expect(o.inspect().listeners).toBe(1);o.updateSize(300);expect(calls).toBe(2);expect(s.getSnapshot()).toBe('large');
 s.deactivate();o.updateSize(100);expect(calls).toBe(2);s.activate();expect(calls).toBe(3);expect(s.getSnapshot()).toBe('small');
 off();s.deactivate();o.deactivate();expect(o.inspect().listeners).toBe(0);expect(s.inspect()).toMatchObject({listeners:0,parentSubscriptions:0});
});
