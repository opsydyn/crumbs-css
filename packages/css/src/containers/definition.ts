import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { normalizeTokenContractIdentity } from "../tokens/identity";
import type { NativeContainerDefinition, NativeContainerDefinitionInput, NativeContainerBucket } from "./model";
export function containerError(code: typeof Code[keyof typeof Code], path: string, reason: string): never { throw Error(formatNativeStylesDiagnostic(code, `${path}: ${reason}`)); }
/** Read descriptors before values; branch objects are deliberately never traversed. */
export function containerRecord(input: unknown, fields: readonly string[] | undefined, code: typeof Code[keyof typeof Code], path: string): Record<string, unknown> {
    if (typeof input !== "object" || input === null || Array.isArray(input) || ![null, Object.prototype].includes(Object.getPrototypeOf(input)))
        return containerError(code, path, "expected plain record");
    const keys = Reflect.ownKeys(input);
    if (fields && (keys.length !== fields.length || fields.some(k => !Object.hasOwn(input, k))))
        return containerError(code, path, "unexpected or missing fields");
    const result: Record<string, unknown> = Object.create(null);
    for (const k of keys) {
        const d = Object.getOwnPropertyDescriptor(input, k);
        if (typeof k !== "string" || !d || !("value" in d) || !d.enumerable)
            return containerError(code, path, "expected own enumerable data fields");
        Object.defineProperty(result, k, { value: d.value, enumerable: true });
    }
    return result;
}
const namePattern = /^[A-Za-z][A-Za-z0-9._-]*$/;
function bucketName(name: unknown): name is string { return typeof name === 'string' && name.length <= 64 && namePattern.test(name) && !['unmeasured', '__proto__', 'prototype', 'constructor'].includes(name); }
function canonical(identityInput: unknown, axis: unknown, entries: readonly {
    name: unknown;
    min: unknown;
}[]): NativeContainerDefinition {
    const code = Code.InvalidContainerDefinition, identityData = containerRecord(identityInput, ['owner', 'name', 'version'], code, 'container.identity');
    let identity;
    try {
        identity = normalizeTokenContractIdentity(identityData as never);
    }
    catch {
        return containerError(code, 'container.identity', 'invalid owner/name/version');
    }
    if (!identity || (axis !== 'width' && axis !== 'height'))
        return containerError(code, 'container.axis', 'expected width or height');
    if (entries.length < 1 || entries.length > 16)
        return containerError(code, 'container.buckets', 'expected 1–16 buckets');
    const names = new Set<string>(), minima = new Set<number>();
    const buckets = entries.map(({ name, min }) => {
        if (!bucketName(name) || names.has(name))
            return containerError(code, 'container.buckets', 'invalid or duplicate bucket name');
        if (typeof min !== 'number' || !Number.isFinite(min) || min < 0 || minima.has(min))
            return containerError(code, `container.buckets.${name}`, 'expected distinct finite non-negative minimum');
        names.add(name);
        minima.add(min);
        return Object.freeze({ name, min: min === 0 ? 0 : min });
    });
    if (!minima.has(0))
        return containerError(code, 'container.buckets', 'exactly one zero minimum required');
    buckets.sort((a, b) => a.min - b.min);
    const result = Object.freeze({ $$type: 'crumbs.css.container-definition' as const, formatVersion: 1 as const, identity, axis, buckets: Object.freeze(buckets) }) as NativeContainerDefinition;
    definitions.set(result, result);
    return result;
}
const definitions = new WeakMap<object, NativeContainerDefinition>();
export function defineContainer<const B extends Readonly<Record<string, number>>>(input: NativeContainerDefinitionInput<B>): NativeContainerDefinition<Extract<keyof B, string>> {
    const code = Code.InvalidContainerDefinition, x = containerRecord(input, ['owner', 'name', 'version', 'axis', 'buckets'], code, 'container');
    const b = containerRecord(x.buckets, undefined, code, 'container.buckets');
    return canonical({ owner: x.owner, name: x.name, version: x.version }, x.axis, Object.keys(b).map(name => ({ name, min: b[name] }))) as NativeContainerDefinition<Extract<keyof B, string>>;
}
export function admitContainerDefinition(input: unknown): NativeContainerDefinition {
    if (typeof input === 'object' && input !== null) {
        const cached = definitions.get(input);
        if (cached)
            return cached;
    }
    const code = Code.InvalidContainerDefinition, x = containerRecord(input, ['$$type', 'formatVersion', 'identity', 'axis', 'buckets'], code, 'container');
    if (x.$$type !== 'crumbs.css.container-definition')
        return containerError(code, 'container', 'invalid tag');
    if (x.formatVersion !== 1)
        return containerError(Code.ContainerUnsupportedVersion, 'container', 'unsupported definition format');
    const b = x.buckets;
    if (!Array.isArray(b) || Object.getPrototypeOf(b) !== Array.prototype || b.length < 1 || b.length > 16 || Reflect.ownKeys(b).length !== b.length + 1)
        return containerError(code, 'container.buckets', 'expected dense undecorated array');
    const entries = [];
    for (let i = 0; i < b.length; i++) {
        const d = Object.getOwnPropertyDescriptor(b, String(i));
        if (!d || !('value' in d) || !d.enumerable)
            return containerError(code, 'container.buckets', 'expected own data entries');
        const e = containerRecord(d.value, ['name', 'min'], code, `container.buckets.${i}`);
        entries.push({ name: e.name, min: e.min });
    }
    const result = canonical(x.identity, x.axis, entries);
    // Cache only a fully validated descriptor whose complete data graph is immutable.
    if (Object.isFrozen(input) && Object.isFrozen(x.identity) && Object.isFrozen(b) && b.every(e => Object.isFrozen(e)))
        definitions.set(input as object, result);
    return result;
}
export function containerDefinitionKey(definition: NativeContainerDefinition): string { const d = admitContainerDefinition(definition); return `crumbs.css.container:${d.identity.owner}#${d.identity.name}@${d.identity.version}`; }
export function containerDefinitionSignature(definition: NativeContainerDefinition): string { const d = admitContainerDefinition(definition); return JSON.stringify([d.axis, d.buckets.map(b => [b.name, b.min])]); }
export function getContainerBucket<const D extends NativeContainerDefinition>(definition: D, size?: number): NativeContainerBucket<D> {
    const d = admitContainerDefinition(definition);
    if (size === undefined)
        return 'unmeasured';
    if (typeof size !== 'number' || !Number.isFinite(size) || size < 0)
        return containerError(Code.InvalidContainerMeasurement, containerDefinitionKey(d), 'expected finite non-negative size');
    let name = d.buckets[0]!.name;
    for (const b of d.buckets) {
        if (size < b.min)
            break;
        name = b.name;
    }
    return name as NativeContainerBucket<D>;
}
