import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { admitContainerDefinition, containerRecord, containerError, containerDefinitionSignature } from "./definition";
import type { NativeContainerDefinition, NativeContainerBucket, NativeContainerValues, ExactContainerValues, AdmittedContainerValues } from "./model";
const tables = new WeakMap<object, {
    signature: string;
    copy: object;
}>();
export function admitContainerValues<const D extends NativeContainerDefinition, const V extends NativeContainerValues<NoInfer<D>, unknown>>(definition: D, values: ExactContainerValues<NoInfer<D>, V>): AdmittedContainerValues<D, V> {
    const d = admitContainerDefinition(definition), signature = containerDefinitionSignature(d);
    const cached = typeof values === 'object' && values !== null ? tables.get(values) : undefined;
    if (cached?.signature === signature)
        return cached.copy as AdmittedContainerValues<D, V>;
    const data = containerRecord(values, ['unmeasured', ...d.buckets.map(b => b.name)], Code.InvalidContainerValues, 'container.values'), copy = Object.freeze(data) as AdmittedContainerValues<D, V>;
    if (Object.isFrozen(values))
        tables.set(values, { signature, copy });
    return copy;
}
export function resolveContainerValue<const D extends NativeContainerDefinition, const V extends NativeContainerValues<NoInfer<D>, unknown>>(definition: D, bucket: NoInfer<NativeContainerBucket<D>>, values: ExactContainerValues<NoInfer<D>, V>): V[NativeContainerBucket<D>] {
    const table = admitContainerValues<D, V>(definition, values);
    if (typeof bucket !== 'string' || !Object.hasOwn(table, bucket))
        return containerError(Code.InvalidContainerValues, 'container.bucket', 'unknown bucket'); // Admission copied exactly these keys without changing their values.
    return table[bucket] as V[NativeContainerBucket<D>];
}
