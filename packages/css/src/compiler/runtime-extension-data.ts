import { extensionDataProperties, extensionFailure, extensionLimit, copyExtensionArguments } from '../extensions/admission';
/** Descriptor-only bridge for the stylesheet evaluator's ordinary built-in prototypes. */
export function copyEvaluatorExtensionArguments(input: unknown, path: string): readonly unknown[] {
    const active = new Set<object>();
    let visited = 0;
    function copy(value: unknown, depth: number, p: string): unknown {
        if (++visited > 4096)
            extensionLimit(p);
        if (value === null || typeof value !== 'object')
            return value;
        if (depth > 32)
            extensionLimit(p);
        if (active.has(value))
            extensionFailure(p, 'cyclic data');
        if (!Object.isFrozen(value))
            extensionFailure(p, 'protocol snapshots must be deeply frozen');
        const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
        if (array && proto === null)
            extensionFailure(p, 'array prototype required');
        assertEvaluatorExtensionPrototype(value, p);
        const fields = extensionDataProperties(value, p), keys = Object.keys(fields).filter(k => !(array && k === 'length'));
        if (keys.length > 256 || (depth === 0 && keys.length > 16))
            extensionLimit(p);
        if (array && (keys.length !== fields.length?.value || keys.some((k, i) => k !== String(i))))
            extensionFailure(p, 'dense ordinary array required');
        const out: unknown[] | Record<string, unknown> = array ? [] : Object.create(proto === null ? null : Object.prototype);
        active.add(value);
        try {
            for (const k of keys) {
                if (k.length > 128)
                    extensionLimit(p);
                Object.defineProperty(out, k, { value: copy(fields[k]!.value, depth + 1, `${p}[${JSON.stringify(k)}]`), enumerable: true, writable: true, configurable: true });
            }
        }
        finally {
            active.delete(value);
        }
        return Object.freeze(out);
    }
    if (!Array.isArray(input))
        extensionFailure(path, 'argument tuple required');
    return copyExtensionArguments(copy(input, 0, path) as readonly unknown[], path);
}
export function assertEvaluatorExtensionPrototype(value: object, path: string): void {
    const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
    if (proto === null) {
        if (array)
            extensionFailure(path, 'array prototype required');
        return;
    }
    const ctor = Object.getOwnPropertyDescriptor(proto, 'constructor');
    const f = ctor && 'value' in ctor ? ctor.value : undefined;
    const prototype = typeof f === 'function' ? Object.getOwnPropertyDescriptor(f, 'prototype') : undefined;
    if (prototype?.value !== proto || typeof f !== 'function' || Function.prototype.toString.call(f) !== `function ${array ? 'Array' : 'Object'}() { [native code] }`)
        extensionFailure(path, 'unsupported evaluator prototype');
}
