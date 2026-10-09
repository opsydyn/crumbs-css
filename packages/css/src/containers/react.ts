import { createElement, useContext, useLayoutEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactElement } from "react";
import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { admitContainerDefinition, containerDefinitionKey, containerDefinitionSignature, containerRecord, containerError } from "./definition";
import { createContainerOwner } from "./owner";
import type { ContainerOwnerProtocol } from "./owner";
import { admitContainerValues } from "./values";
import { createContainerSelector } from "./selector";
import { getSharedContainerContext } from "./context";
import type { NativeContainerDefinition, NativeContainerLayout, ContainerProviderProps, NativeContainerValues, ExactContainerValues, NativeContainerBucket } from "./model";
const ownerSlot = Symbol.for('crumbs.css.container-owner.v1');
const Context = getSharedContainerContext();
export function createContainerLayout<D extends NativeContainerDefinition>(owner: ContainerOwnerProtocol): NativeContainerLayout<D> {
    const handle = { definition: owner.definition, onLayout: owner.onLayout };
    Object.defineProperty(handle, ownerSlot, { value: owner });
    return Object.freeze(handle) as NativeContainerLayout<D>;
}
export function admitContainerLayout(input: unknown): ContainerOwnerProtocol {
    const code = Code.InvalidContainerDefinition, path = 'container.layout';
    if (typeof input !== 'object' || input === null || ![null, Object.prototype].includes(Object.getPrototypeOf(input)))
        return containerError(code, path, 'expected layout handle');
    const keys = Reflect.ownKeys(input);
    if (keys.length !== 3 || !keys.includes(ownerSlot))
        return containerError(code, path, 'invalid closed handle');
    const slot = Object.getOwnPropertyDescriptor(input, ownerSlot);
    if (!slot || !('value' in slot) || slot.enumerable)
        return containerError(code, path, 'expected owner data protocol');
    const publicData: Record<string, unknown> = {};
    for (const key of ['definition', 'onLayout']) {
        const d = Object.getOwnPropertyDescriptor(input, key);
        if (!d || !('value' in d) || !d.enumerable)
            return containerError(code, path, 'expected own public data');
        publicData[key] = d.value;
    }
    const methods = ['getSnapshot', 'getServerSnapshot', 'subscribe', 'updateSize', 'onLayout', 'activate', 'deactivate', 'claimProvider', 'inspect'];
    const facade = containerRecord(slot.value, ['formatVersion', 'definition', 'key', 'signature', ...methods], code, path + '.owner');
    if (facade.formatVersion !== 1)
        return containerError(Code.ContainerUnsupportedVersion, path, 'unsupported owner protocol');
    const definition = admitContainerDefinition(facade.definition);
    if (methods.some(k => typeof facade[k] !== 'function') || publicData.definition !== facade.definition || publicData.onLayout !== facade.onLayout || facade.key !== containerDefinitionKey(definition) || facade.signature !== containerDefinitionSignature(definition) || !Object.isFrozen(slot.value) || !Object.isFrozen(input))
        return containerError(code, path, 'incompatible immutable handle');
    // The complete closed v1 facade has been checked without invoking any method.
    return slot.value as ContainerOwnerProtocol;
}
export function useContainerLayout<const D extends NativeContainerDefinition>(definition: D): NativeContainerLayout<D> {
    const d = admitContainerDefinition(definition), key = containerDefinitionKey(d), signature = containerDefinitionSignature(d);
    // Semantic identity preserves a live handle across equivalent descriptor copies.
    const owner = useMemo(() => createContainerOwner(d), [key, signature]);
    const layout = useMemo(() => createContainerLayout<D>(owner), [owner]);
    useLayoutEffect(() => { owner.activate(); return () => owner.deactivate(); }, [owner]);
    return layout;
}
export function ContainerProvider<D extends NativeContainerDefinition>({ layout, children }: ContainerProviderProps<D>): ReactElement {
    const parent = useContext(Context), owner = admitContainerLayout(layout), token = useMemo(() => ({}), []);
    const inherited = parent?.get(owner.key);
    if (inherited && inherited.signature !== owner.signature)
        return containerError(Code.ContainerContractMismatch, owner.key, 'nested provider definition shape mismatch');
    const owners = useMemo(() => { const map = new Map(parent); map.set(owner.key, owner); return map as ReadonlyMap<string, ContainerOwnerProtocol>; }, [parent, owner]);
    useLayoutEffect(() => owner.claimProvider(token), [owner, token]);
    return createElement(Context.Provider, { value: owners }, children);
}
export function useContainerValue<const D extends NativeContainerDefinition, const V extends NativeContainerValues<NoInfer<D>, unknown>>(definition: D, values: ExactContainerValues<NoInfer<D>, V>): V[NativeContainerBucket<D>] {
    const owners = useContext(Context), d = admitContainerDefinition(definition), key = containerDefinitionKey(d), owner = owners?.get(key);
    if (!owner)
        return containerError(Code.ContainerProviderRequired, key, 'matching container provider required');
    if (owner.signature !== containerDefinitionSignature(d))
        return containerError(Code.ContainerContractMismatch, key, 'requested definition shape mismatch');
    // Mutable caller tables are admitted on every render; frozen tables have weak admission caching.
    const table = admitContainerValues<D, V>(definition, values), selector = useMemo(() => createContainerSelector<D, V>(owner, table), [owner, table]);
    // Suspense disconnects layout effects while retaining passive store subscriptions.
    // Reconnect with a fresh owner registration; never revive a retired registration.
    useLayoutEffect(() => { selector.activate(); return () => selector.deactivate(); }, [selector]);
    return useSyncExternalStore(selector.subscribe, selector.getSnapshot, selector.getServerSnapshot) as V[NativeContainerBucket<D>];
}
