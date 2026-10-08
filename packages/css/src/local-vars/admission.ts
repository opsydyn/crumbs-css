import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { normalizeTokenContractIdentity } from "../tokens/identity";
import { isThemeTokenReference } from "../theme-token";
import type { TokenDomain } from "../theme-token";
import { normalizeTokenDomainDefinition, isTokenDomainValue, tokenDomainsEqual } from "../tokens/domain-values";
import { NativeLocalVarType, NativeLocalFallbackType, NativeVarAssignmentsType, nativeLocalVarKey, type AnyLocalVar, type AnyLocalFallback, type NativeVarAssignments } from "./model";
export function localError(code: typeof Code[keyof typeof Code], path: string, reason: string): never { throw new Error(formatNativeStylesDiagnostic(code, `${path}: ${reason}`)); }
/** Descriptor-only clone. Mutable originals never enter the admission cache. */
export function copyLocalData(input: unknown, code: typeof Code[keyof typeof Code], path = "local", depth = 0, seen = new Set<object>()): unknown {
  if (input === null || typeof input !== "object") {
    if (typeof input === "string" || typeof input === "number" || typeof input === "boolean" || input === null)
      return input;
    return localError(code, path, "expected plain data");
  }
  if (depth >= 64 || seen.has(input))
    return localError(code, path, "cyclic or over-depth data");
  const proto = Object.getPrototypeOf(input);
  if (Array.isArray(input) ? proto !== Array.prototype : proto !== null && proto !== Object.prototype)
    return localError(code, path, "unsupported prototype");
  seen.add(input);
  const out: Record<string, unknown> | unknown[] = Array.isArray(input) ? [] : {};
  const keys = Reflect.ownKeys(input);
  if (Array.isArray(input)) {
    const len = Object.getOwnPropertyDescriptor(input, "length")?.value;
    if (!Number.isSafeInteger(len) || len < 0 || keys.length !== len + 1)
      return localError(code, path, "array must be dense and undecorated");
  }
  for (const key of keys) {
    if (Array.isArray(input) && key === "length")
      continue;
    const d = Object.getOwnPropertyDescriptor(input, key);
    if (typeof key !== "string" || !d || !("value" in d) || !d.enumerable)
      return localError(code, path, "expected own enumerable data fields");
    if (Array.isArray(input) && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= (input.length)))
      return localError(code, path, "decorated array");
    Object.defineProperty(out, key, { value: copyLocalData(d.value, code, `${path}.${key}`, depth + 1, seen), enumerable: true });
  }
  seen.delete(input);
  return Object.freeze(out);
}
export function exactLocalRecord(input: unknown, fields: readonly string[], code: typeof Code[keyof typeof Code], path: string): Record<string, unknown> {
  if (typeof input !== "object" || input === null || Array.isArray(input) || Object.keys(input).length !== fields.length || fields.some(k => !Object.hasOwn(input, k)))
    return localError(code, path, "unexpected or missing fields");
  return input as Record<string, unknown>;
}
export function localDomain(input: unknown, code: typeof Code[keyof typeof Code], path: string): TokenDomain {
  const record = input as Record<string, unknown>;
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return localError(code, path, "invalid domain");
  const fields = record.kind === "length" ? ["kind", "allowNegative"] : record.kind === "enum" ? ["kind", "values"] : ["kind"];
  exactLocalRecord(input, fields, code, path);
  if (record.kind === "length" && typeof record.allowNegative !== "boolean")
    return localError(code, path, "invalid length permission");
  try {
    const d = normalizeTokenDomainDefinition(input as TokenDomain);
    return Object.freeze(d.kind === "enum" ? { kind: "enum", values: Object.freeze([...d.values].sort()) } : d);
  }
  catch {
    return localError(code, path, "invalid domain");
  }
}
export function literalLocalValue(domain: TokenDomain, value: unknown): value is string | number { return isTokenDomainValue(domain, value) && !(typeof value === "string" && /^\s*var\(/.test(value)); }
const operands = new WeakMap<object, AnyLocalVar | AnyLocalFallback>();
const assignments = new WeakMap<object, NativeVarAssignments>();
export function isImmutableLocalData(input: unknown, seen = new Set<object>()): boolean {
  if (typeof input !== "object" || input === null)
    return true;
  if (!Object.isFrozen(input) || seen.has(input))
    return false;
  seen.add(input);
  const result = Reflect.ownKeys(input).every(k => { const d = Object.getOwnPropertyDescriptor(input, k); return d !== undefined && "value" in d && isImmutableLocalData(d.value, seen); });
  seen.delete(input);
  return result;
}
export function readLocalVar(input: unknown, path = "variable"): AnyLocalVar {
  const code = Code.InvalidLocalVar;
  const x = exactLocalRecord(input, ["$$type", "version", "identity", "domain"], code, path);
  if (x.$$type !== NativeLocalVarType)
    return localError(code, path, "invalid tag");
  if (x.version !== 1)
    return localError(Code.LocalVarUnsupportedVersion, path, "unsupported variable version");
  const identity = exactLocalRecord(x.identity, ["owner", "name", "version"], code, path + ".identity");
  let normalized;
  try {
    normalized = normalizeTokenContractIdentity(identity as never);
  }
  catch {
    return localError(code, path, "invalid identity");
  }
  if (!normalized)
    return localError(code, path, "identity required");
  return Object.freeze({ $$type: NativeLocalVarType, version: 1, identity: normalized, domain: localDomain(x.domain, code, path + ".domain") }) as AnyLocalVar;
}
export function assertLocalDefinitions(variables: readonly AnyLocalVar[]): void {
  const table = new Map<string, AnyLocalVar>();
  for (const variable of variables) {
    const key = nativeLocalVarKey(variable);
    const prior = table.get(key);
    if (prior && !tokenDomainsEqual(prior.domain, variable.domain))
      localError(Code.LocalVarConflict, key, "conflicting domains");
    table.set(key, variable);
  }
}
export function admitLocalOperand(input: unknown): AnyLocalVar | AnyLocalFallback {
  if (typeof input === "object" && input !== null) {
    const cached = operands.get(input);
    if (cached)
      return cached;
  }
  const raw = copyLocalData(input, Code.InvalidLocalVar) as Record<string, unknown>;
  let result: AnyLocalVar | AnyLocalFallback;
  if (raw?.$$type === NativeLocalVarType)
    result = readLocalVar(raw);
  else {
    const x = exactLocalRecord(raw, ["$$type", "version", "variables", "terminal"], Code.InvalidLocalVar, "fallback");
    if (x.$$type !== NativeLocalFallbackType)
      localError(Code.InvalidLocalVar, "fallback", "invalid tag");
    if (x.version !== 1)
      localError(Code.LocalVarUnsupportedVersion, "fallback", "unsupported fallback version");
    if (!Array.isArray(x.variables) || x.variables.length < 1 || x.variables.length > 16)
      localError(Code.InvalidLocalVar, "fallback", "expected 1 to 16 handles");
    const variables = x.variables.map((v, i) => readLocalVar(v, `fallback.${i}`));
    const domain = variables[0]!.domain;
    assertLocalDefinitions(variables);
    if (variables.some(v => !tokenDomainsEqual(v.domain, domain)))
      localError(Code.LocalVarDomainMismatch, "fallback", "different domains");
    const terminal = x.terminal as Record<string, unknown>;
    if (terminal?.kind === "literal") {
      exactLocalRecord(terminal, ["kind", "value"], Code.InvalidLocalVar, "terminal");
      if (!literalLocalValue(domain, terminal.value))
        localError(Code.InvalidLocalVar, "terminal", "invalid literal");
    }
    else {
      exactLocalRecord(terminal, terminal && Object.hasOwn(terminal, "contractIdentity") ? ["kind", "reference", "domain", "publicId", "contractIdentity"] : ["kind", "reference", "domain", "publicId"], Code.InvalidLocalVar, "terminal");
      if (terminal.kind !== "theme" || !isThemeTokenReference(terminal.reference) || typeof terminal.publicId !== "string" || !terminal.publicId)
        localError(Code.InvalidLocalVar, "terminal", "invalid theme reference");
      const td = localDomain(terminal.domain, Code.InvalidLocalVar, "terminal.domain");
      if (!tokenDomainsEqual(td, domain))
        localError(Code.LocalVarDomainMismatch, "terminal", "different domain");
      if (Object.hasOwn(terminal, "contractIdentity")) {
        exactLocalRecord(terminal.contractIdentity, ["owner", "name", "version"], Code.InvalidLocalVar, "terminal.identity");
        try {
          normalizeTokenContractIdentity(terminal.contractIdentity as never);
        }
        catch {
          localError(Code.InvalidLocalVar, "terminal", "invalid theme identity");
        }
      }
    }
    result = Object.freeze({ $$type: NativeLocalFallbackType, version: 1, variables: Object.freeze(variables), terminal }) as AnyLocalFallback;
  }
  if (typeof input === "object" && input !== null && isImmutableLocalData(input))
    operands.set(input, result);
  operands.set(result, result);
  return result;
}
export const emptyVarAssignments = Object.freeze({ $$type: NativeVarAssignmentsType, version: 1, bindings: Object.freeze([]) }) as unknown as NativeVarAssignments;
export function admitVarAssignments(input: unknown): NativeVarAssignments {
  if (typeof input === "object" && input !== null) {
    const cached = assignments.get(input);
    if (cached)
      return cached;
  }
  const raw = copyLocalData(input, Code.InvalidLocalAssignments);
  const x = exactLocalRecord(raw, ["$$type", "version", "bindings"], Code.InvalidLocalAssignments, "assignments");
  if (x.$$type !== NativeVarAssignmentsType)
    localError(Code.InvalidLocalAssignments, "assignments", "invalid tag");
  if (x.version !== 1)
    localError(Code.LocalVarUnsupportedVersion, "assignments", "unsupported version");
  if (!Array.isArray(x.bindings))
    localError(Code.InvalidLocalAssignments, "assignments", "bindings must be an array");
  const table = new Map<string, {
    variable: AnyLocalVar;
    value: string | number;
  }>();
  for (const binding of x.bindings) {
    const b = exactLocalRecord(binding, ["variable", "value"], Code.InvalidLocalAssignments, "binding");
    const variable = readLocalVar(b.variable);
    const key = nativeLocalVarKey(variable);
    if (!literalLocalValue(variable.domain, b.value))
      localError(Code.InvalidLocalAssignments, key, "invalid domain literal");
    const prior = table.get(key);
    if (prior && (!tokenDomainsEqual(prior.variable.domain, variable.domain) || !Object.is(prior.value, b.value)))
      localError(Code.LocalVarConflict, key, "conflicting binding");
    table.set(key, Object.freeze({ variable, value: b.value }));
  }
  const result = table.size === 0 ? emptyVarAssignments : Object.freeze({ $$type: NativeVarAssignmentsType, version: 1, bindings: Object.freeze([...table].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, v]) => v)) }) as NativeVarAssignments;
  if (typeof input === "object" && input !== null && isImmutableLocalData(input))
    assignments.set(input, result);
  assignments.set(result, result);
  return result;
}
