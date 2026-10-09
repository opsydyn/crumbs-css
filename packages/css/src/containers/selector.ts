import type { ContainerOwnerProtocol } from "./owner";
import type { NativeContainerDefinition, NativeContainerBucket, NativeContainerValues, AdmittedContainerValues } from "./model";
export type ContainerSelectorStats = Readonly<{
    listeners: number;
    parentSubscriptions: number;
    notifications: number;
}>;
export type ContainerSelector<T> = Readonly<{
    getSnapshot: () => T;
    getServerSnapshot: () => T;
    subscribe: (listener: () => void) => () => void;
    activate: () => void;
    deactivate: () => void;
    inspect: () => ContainerSelectorStats;
}>;
export function createContainerSelector<const D extends NativeContainerDefinition, const V extends NativeContainerValues<D, unknown>>(owner: ContainerOwnerProtocol, values: AdmittedContainerValues<D, V>): ContainerSelector<V[NativeContainerBucket<D>]> {
    type T = V[NativeContainerBucket<D>];
    // Definition and exhaustive table admission established the bucket/key relationship.
    const read = () => values[owner.getSnapshot().bucket as NativeContainerBucket<D>] as T;
    let current = read(), parentOff: (() => void) | undefined, notifications = 0, active = true;
    const listeners = new Set<{
        listener: () => void;
    }>();
    const update = () => { const next = read(); if (Object.is(current, next))
        return; current = next; notifications++; for (const entry of [...listeners])
        if (listeners.has(entry))
            entry.listener(); };
    return Object.freeze({ getSnapshot: read, getServerSnapshot: () => values.unmeasured as T,
        activate() { active = true; if (listeners.size && !parentOff) { parentOff = owner.subscribe(update); update(); } },
        deactivate() { active = false; parentOff?.(); parentOff = undefined; },
        subscribe(listener: () => void) { const entry = { listener }; listeners.add(entry); if (active && listeners.size === 1) {
            current = read();
            parentOff = owner.subscribe(update);
        } let live = true; return () => { if (!live)
            return; live = false; listeners.delete(entry); if (listeners.size === 0) {
            parentOff?.();
            parentOff = undefined;
        } }; },
        inspect: () => Object.freeze({ listeners: listeners.size, parentSubscriptions: parentOff ? 1 : 0, notifications }) }) as ContainerSelector<V[NativeContainerBucket<D>]>;
}
