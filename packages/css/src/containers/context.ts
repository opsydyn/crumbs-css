import { createContext } from "react";
import type { Context } from "react";
import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { containerRecord, containerError } from "./definition";
import type { ContainerOwnerProtocol } from "./owner";
type Owners = ReadonlyMap<string, ContainerOwnerProtocol> | null;
const registry = Symbol.for('crumbs.css.container-context.v1');
// The supported React installation supplies the ABI, including dev-only renderer fields.
const initialContext = createContext<Owners>(null);
function admitContext(input: unknown): Context<Owners> {
    const code = Code.ContainerUnsupportedVersion, path = 'container.context';
    const data = containerRecord(input, undefined, code, path);
    for (const key of Object.keys(initialContext)) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (!descriptor || !('value' in descriptor) || !descriptor.writable)
            return containerError(code, path, 'missing or immutable React context ABI field');
    }
    // Renderer fields can also appear in production data; React must never execute accessors.
    for (const key of ['_currentValue', '_currentValue2', '_threadCount', '_currentRenderer', '_currentRenderer2']) {
        const descriptor = Object.getOwnPropertyDescriptor(input, key);
        if (descriptor && !descriptor.writable)
            return containerError(code, path, 'immutable React context ABI field');
    }
    const consumer = containerRecord(data.Consumer, ['$$typeof', '_context'], code, path + '.Consumer');
    if (data.$$typeof !== Symbol.for('react.context') || data.Provider !== input || consumer.$$typeof !== Symbol.for('react.consumer') || consumer._context !== input || typeof data._threadCount !== 'number' || !Number.isInteger(data._threadCount) || data._threadCount < 0)
        return containerError(code, path, 'incompatible React context ABI');
    return input as Context<Owners>;
}
export function getSharedContainerContext(): Context<Owners> {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, registry);
    if (!descriptor) {
        const slot = Object.freeze({ formatVersion: 1, reactCreateContext: createContext, context: initialContext });
        Object.defineProperty(globalThis, registry, { value: slot });
        return initialContext;
    }
    if (!('value' in descriptor))
        return containerError(Code.ContainerUnsupportedVersion, 'container.context', 'expected own data registry');
    const slot = containerRecord(descriptor.value, ['formatVersion', 'reactCreateContext', 'context'], Code.ContainerUnsupportedVersion, 'container.context');
    if (slot.formatVersion !== 1 || slot.reactCreateContext !== createContext)
        return containerError(Code.ContainerUnsupportedVersion, 'container.context', 'incompatible version or React installation');
    return admitContext(slot.context);
}
