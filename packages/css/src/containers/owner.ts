import type { LayoutChangeEvent } from "react-native";
import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { admitContainerDefinition, containerDefinitionKey, containerDefinitionSignature, containerError, getContainerBucket } from "./definition";
import type { NativeContainerDefinition } from "./model";
export type ContainerSnapshot = Readonly<{
    key: string;
    signature: string;
    bucket: string;
}>;
export type ContainerOwnerStats = Readonly<{
    phase: 'created' | 'active' | 'inactive';
    listeners: number;
    providerClaims: number;
    internedSnapshots: number;
    publications: number;
}>;
export type ContainerOwnerProtocol = Readonly<{
    formatVersion: 1;
    definition: NativeContainerDefinition;
    key: string;
    signature: string;
    getSnapshot: () => ContainerSnapshot;
    getServerSnapshot: () => ContainerSnapshot;
    subscribe: (listener: () => void) => () => void;
    updateSize: (size: unknown) => boolean;
    onLayout: (event: LayoutChangeEvent) => void;
    activate: () => void;
    deactivate: () => void;
    claimProvider: (token: object) => () => void;
    inspect: () => ContainerOwnerStats;
}>;
function eventField(value: unknown, field: string, key: string): unknown { if (typeof value !== 'object' || value === null)
    return containerError(Code.InvalidContainerMeasurement, key, `missing ${field}`); const d = Object.getOwnPropertyDescriptor(value, field); if (!d || !('value' in d))
    return containerError(Code.InvalidContainerMeasurement, key, `expected own data ${field}`); return d.value; }
export function createContainerOwner(input: NativeContainerDefinition): ContainerOwnerProtocol {
    const definition = admitContainerDefinition(input), key = containerDefinitionKey(definition), signature = containerDefinitionSignature(definition), snapshots = new Map<string, ContainerSnapshot>();
    const intern = (bucket: string) => { let s = snapshots.get(bucket); if (!s) {
        s = Object.freeze({ key, signature, bucket });
        snapshots.set(bucket, s);
    } return s; };
    const initial = intern('unmeasured');
    let current = initial, phase: ContainerOwnerStats['phase'] = 'created', publications = 0, notifying = false, generation = 0, claim: {
        token: object;
        generation: number;
    } | undefined;
    // Each registration is distinct, including repeated registration of one callback.
    const listeners = new Set<{
        listener: () => void;
    }>();
    const updateSize = (size: unknown): boolean => {
        if (phase === 'inactive')
            return false;
        const bucket = getContainerBucket(definition, size as number);
        if (bucket === current.bucket)
            return false;
        if (notifying)
            return containerError(Code.ContainerReentrantUpdate, key, 'measurement attempted publication during notification');
        current = intern(bucket);
        publications++;
        notifying = true;
        try {
            for (const entry of [...listeners])
                if (listeners.has(entry))
                    entry.listener();
        }
        finally {
            notifying = false;
        }
        return true;
    };
    const onLayout = (event: LayoutChangeEvent) => { if (phase === 'inactive')
        return; const native = eventField(event, 'nativeEvent', key), layout = eventField(native, 'layout', key), size = eventField(layout, definition.axis, key); if (size === undefined)
        return containerError(Code.InvalidContainerMeasurement, key, `missing ${definition.axis}`); updateSize(size); };
    return Object.freeze({ formatVersion: 1, definition, key, signature, getSnapshot: () => current, getServerSnapshot: () => initial,
        subscribe(listener: () => void) { const registration = { listener }; listeners.add(registration); let live = true; return () => { if (live) {
            live = false;
            listeners.delete(registration);
        } }; }, updateSize, onLayout,
        activate() { phase = 'active'; }, deactivate() { phase = 'inactive'; listeners.clear(); claim = undefined; generation++; },
        claimProvider(token: object) { if (claim)
            return containerError(Code.ContainerOwnerInUse, key, 'one layout handle requires one committed provider'); const g = ++generation; claim = { token, generation: g }; let live = true; return () => { if (live) {
            live = false;
            if (claim?.token === token && claim.generation === g)
                claim = undefined;
        } }; },
        inspect: () => Object.freeze({ phase, listeners: listeners.size, providerClaims: claim ? 1 : 0, internedSnapshots: snapshots.size, publications }) });
}
