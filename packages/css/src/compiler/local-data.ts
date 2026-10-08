import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { copyLocalData, localError } from "../local-vars/admission";
/** The CSS evaluator owns a separate realm. Copy its plain descriptors into the compiler realm before runtime admission. */
export function copyCompilerLocalData(input: unknown): unknown {
  function copy(value: unknown, depth: number, active: Set<object>): unknown {
    if (typeof value !== "object" || value === null)
      return value;
    if (depth >= 64 || active.has(value))
      localError(Code.InvalidLocalVar, "compiler ingress", "cyclic or over-depth data");
    const array = Array.isArray(value), proto = Object.getPrototypeOf(value);
    if (proto !== null) {
      const ctor = Object.getOwnPropertyDescriptor(proto, "constructor");
      const nativePrototype = ctor && "value" in ctor && typeof ctor.value === "function" ? Object.getOwnPropertyDescriptor(ctor.value, "prototype") : undefined;
      if (!nativePrototype || !("value" in nativePrototype) || nativePrototype.value !== proto || !ctor || !("value" in ctor) || typeof ctor.value !== "function" || !new RegExp(`^function ${array ? "Array" : "Object"}\\(\\) \\{ \\[native code\\] \\}$`).test(Function.prototype.toString.call(ctor.value)))
        localError(Code.InvalidLocalVar, "compiler ingress", "unsupported evaluator prototype");
    }
    const out: unknown[] | Record<string, unknown> = array ? [] : {};
    active.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const d = Object.getOwnPropertyDescriptor(value, key);
      if (typeof key !== "string" || !d || !("value" in d) || (!d.enumerable && !(array && key === "length")))
        localError(Code.InvalidLocalVar, "compiler ingress", "expected own data");
      if (array && key === "length")
        continue;
      Object.defineProperty(out, key, { value: copy(d.value, depth + 1, active), enumerable: true });
    }
    if (array && Reflect.ownKeys(value).length !== value.length + 1)
      localError(Code.InvalidLocalVar, "compiler ingress", "decorated or sparse array");
    active.delete(value);
    return Object.freeze(out);
  }
  return copyLocalData(copy(input, 0, new Set()), Code.InvalidLocalVar, "compiler ingress");
}
