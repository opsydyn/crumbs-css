import type { NativeTheme } from "../theme-contract";
import { resolveThemeTokens } from "../theme-runtime";
import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { getThemeTokenPublicId,getThemeTokenVisibility,getThemeContractIdentityKey, getThemeTokenDomainForContract, isThemeTokenContract, isThemeTokenReference, type TokenDomain, type NativeThemeTokenReference, type ThemeVar } from "../theme-token";
import { tokenContractIdentityKey, normalizeTokenContractIdentity, type TokenContractIdentity } from "../tokens/identity";
import { isTokenDomainValue, tokenDomainsEqual } from "../tokens/domain-values";
import { assertNativeLocalPropertyValue, propertyPrimitives } from "../native-property-policy";
import { structuredPropertyPrimitives, isNativeStructuredValue } from "../native-structured-policy";
import { NativeStyleMapSymbol, markNativeStyleMap } from "../native-style-map";
import { NativeLocalVarType, localOperandCandidate, nativeLocalVarKey, type NativeVarAssignments, type ResolvedAssignedStyles, type AnyLocalVar, type NativeLocalStylePlan } from "./model";
import { admitVarAssignments, admitLocalOperand, copyLocalData, assertLocalDefinitions, localError, isImmutableLocalData, exactLocalRecord } from "./admission";
import { admitLocalStylePlan, localPlanCandidate } from "./plan-admission";
type Styles = Readonly<Record<string, unknown>>;
export type AssignedThemeSnapshot = Omit<NativeTheme<Record<string, unknown>>, "values"> & {
  readonly values: unknown;
};
type Theme = AssignedThemeSnapshot;
type ThemeRead = {
  readonly reference: NativeThemeTokenReference;
  readonly publicId?: string;
  readonly domain?: TokenDomain;
  readonly contractIdentity?: TokenContractIdentity;
};
const missing = Symbol("absent local"), noTheme = Object.freeze({});
type LocalRead = string | number | typeof missing;
export type AssignedExportState = {
  readonly input: unknown;
  readonly output: unknown;
  readonly localReads: ReadonlyMap<string, LocalRead>;
  readonly themeReads: readonly {
    readonly read: ThemeRead;
    readonly value: unknown;
  }[];
};
export type AssignedResolutionState = {
  readonly styles: Styles;
  readonly result: Styles;
  readonly exports: ReadonlyMap<string, AssignedExportState>;
};
const maps = new WeakMap<object, Styles>();
const memo = new WeakMap<object, WeakMap<object, WeakMap<object, AssignedResolutionState>>>();
function ownRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value) || ![null, Object.prototype].includes(Object.getPrototypeOf(value)))
    localError(Code.InvalidLocalVar, path, "expected a plain record");
  return value as Record<string, unknown>;
}
function rejectNestedLocals(value: unknown, path: string): void {
  if (localOperandCandidate(value) || localPlanCandidate(value))
    localError(Code.InvalidLocalVar, path, "local operands require scalar plan slots");
  if (value && typeof value === "object")
    for (const child of Object.values(value))
      rejectNestedLocals(child, path);
}
function admitStyles(input: Styles): Styles {
  const prior = maps.get(input);
  if (prior)
    return prior;
  const record = ownRecord(input, "styles"), result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(record)) {
    const d = Object.getOwnPropertyDescriptor(record, key)!;
    if (key === NativeStyleMapSymbol) {
      if (!("value" in d) || !d.enumerable || d.value !== true)
        localError(Code.InvalidLocalVar, "styles", "invalid native map marker");
      continue;
    }
    if (typeof key !== "string" || !("value" in d) || !d.enumerable)
      localError(Code.InvalidLocalVar, "styles", "expected own enumerable style exports");
    if (d.value === undefined) {
      Object.defineProperty(result, key, { value: undefined, enumerable: true });
      continue;
    }
    if (localPlanCandidate(d.value)) {
      Object.defineProperty(result, key, { value: admitLocalStylePlan(d.value, `styles.${key}`), enumerable: true });
      continue;
    }
    const copied = copyLocalData(d.value, Code.InvalidLocalVar, `styles.${key}`);
    const style = ownRecord(copied, `styles.${key}`);
    if (Object.hasOwn(style, "$$type"))
      localError(Code.InvalidLocalVar, `styles.${key}`, "expected primitive styles, not a descriptor or operand");
    for (const [property, value] of Object.entries(style)) {
      rejectNestedLocals(value, `styles.${key}.${property}`);
      if (isThemeTokenReference(value)) {
        if (!Object.hasOwn(propertyPrimitives, property))
          localError(Code.LocalVarInvalidPropertyValue, `styles.${key}.${property}`, "unsupported native token property");
        continue;
      }
      if (Object.hasOwn(structuredPropertyPrimitives, property)) {
        if (!isNativeStructuredValue(property, value))
          localError(Code.LocalVarInvalidPropertyValue, `styles.${key}.${property}`, "invalid static structured value");
      }
      else {
        const primitives = propertyPrimitives[property as keyof typeof propertyPrimitives];
        if (!primitives)
          localError(Code.LocalVarInvalidPropertyValue, `styles.${key}.${property}`, "unsupported native property");
        assertNativeLocalPropertyValue(property, primitives, value);
      }
    }
    Object.defineProperty(result, key, { value: isImmutableLocalData(d.value) ? d.value : copied, enumerable: true });
  }
  if (Object.hasOwn(record, NativeStyleMapSymbol))
    markNativeStyleMap(result);
  Object.freeze(result);
  if (isImmutableLocalData(input))
    maps.set(input, result);
  maps.set(result, result);
  return result;
}
function variablesInStyles(styles: Styles): AnyLocalVar[] {
  const result: AnyLocalVar[] = [];
  for (const input of Object.values(styles))
    if (localPlanCandidate(input))
      for (const d of (input as NativeLocalStylePlan<unknown>).declarations)
        if (localOperandCandidate(d.value)) {
          const v = admitLocalOperand(d.value);
          result.push(...(v.$$type === NativeLocalVarType ? [v] : v.variables));
        }
  return result;
}
function ownThemeField(theme: object, key: string): unknown {
  const d = Object.getOwnPropertyDescriptor(theme, key);
  if (!d || !("value" in d) || !d.enumerable)
    localError(Code.InvalidThemeContract, `theme.${key}`, "expected an own data field");
  return d.value;
}
function themeFrame(theme: Theme | undefined): Theme {
  if (theme === undefined)
    throw new Error("Missing native theme provider for a reached local fallback or theme token");
  const raw = ownRecord(theme, "theme"), contract = ownThemeField(raw, "contract"), tokens = ownThemeField(raw, "tokens"), values = ownThemeField(raw, "values");
  ownRecord(contract, "theme.contract");
  // Validate contract descriptors while retaining the registered ownership object.
  function validateContract(value: object, active = new Set<object>(), depth = 0): void {
    if (active.has(value) || depth >= 64)
      localError(Code.InvalidThemeContract, "theme.contract", "cyclic or over-depth contract");
    ownRecord(value, "theme.contract");
    active.add(value);
    for (const key of Reflect.ownKeys(value)) {
      const d = Object.getOwnPropertyDescriptor(value, key)!;
      if (key === Symbol.for("crumbs.css.theme-contract-identity.v1")) {
        if (!("value" in d))
          localError(Code.InvalidThemeContract, "theme.contract", "invalid identity metadata");
        const metadata = exactLocalRecord(copyLocalData(d.value, Code.InvalidThemeContract, "theme.contract.identity"), ["identity", "key", "signature"], Code.InvalidThemeContract, "theme.contract.identity");
        let identity: TokenContractIdentity | undefined;
        try {
          identity = normalizeTokenContractIdentity(metadata.identity as TokenContractIdentity);
        }
        catch {
          localError(Code.InvalidThemeContract, "theme.contract", "invalid identity metadata");
        }
        if (!identity || metadata.key !== tokenContractIdentityKey(identity) || typeof metadata.signature !== "string")
          localError(Code.InvalidThemeContract, "theme.contract", "invalid identity metadata");
        continue;
      }
      if (typeof key !== "string" || !("value" in d) || !d.enumerable)
        localError(Code.InvalidThemeContract, "theme.contract", "invalid data descriptor");
      if (typeof d.value === "object" && d.value !== null)
        validateContract(d.value, active, depth + 1);
      else if (typeof d.value !== "string")
        localError(Code.InvalidThemeContract, "theme.contract", "invalid token reference");
    }
    active.delete(value);
  }
  validateContract(contract as object);
  const tokenCopy = copyLocalData(tokens, Code.InvalidThemeContract, "theme.tokens");
  ownRecord(tokenCopy, "theme.tokens");
  for (const value of Object.values(tokenCopy as object))
    if (typeof value !== "string" && typeof value !== "number" || typeof value === "number" && !Number.isFinite(value))
      localError(Code.InvalidThemeContract, "theme.tokens", "invalid token value");
  const valueCopy = copyLocalData(values, Code.InvalidThemeContract, "theme.values");
  return Object.freeze({ contract: contract as Record<string, unknown>, tokens: tokenCopy as Record<string, string | number>, values: valueCopy as Theme["values"] });
}
function readTheme(read: ThemeRead, frame: Theme): unknown {
  if (read.contractIdentity && getThemeContractIdentityKey(frame.contract) !== tokenContractIdentityKey(read.contractIdentity))
    localError(Code.TokenThemeTokenContractMismatch, read.reference.varName, "theme contract identity does not match fallback owner");
  const token = `var(${read.reference.varName})` as ThemeVar, domain = getThemeTokenDomainForContract(frame.contract, token);
  if (read.domain && (!isThemeTokenContract(frame.contract) || !domain || !tokenDomainsEqual(domain, read.domain)))
    localError(Code.LocalVarDomainMismatch, read.reference.varName, "theme terminal domain does not match its owning contract");
  if(read.domain){
    if(getThemeTokenVisibility(token)!=="public"||getThemeTokenPublicId(token)!==read.publicId)localError(Code.InvalidLocalVar,read.reference.varName,"theme terminal must retain public token identity")
  }
  const resolved = resolveThemeTokens(Object.freeze({ value: read.reference }), frame as NativeTheme<Record<string, unknown>>) as {
    value: unknown;
  };
  if (domain && !isTokenDomainValue(domain, resolved.value))
    localError(Code.LocalVarDomainMismatch, read.reference.varName, "invalid owning theme domain value");
  return resolved.value;
}
export function equalAssignedOutput(a: unknown, b: unknown): boolean {
  if (Object.is(a, b))
    return true;
  if (!a || !b || typeof a !== "object" || typeof b !== "object" || Array.isArray(a) !== Array.isArray(b))
    return false;
  const ak = Object.keys(a), bk = Object.keys(b);
  return ak.length === bk.length && ak.every(k => Object.hasOwn(b, k) && equalAssignedOutput((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}
function reconcileAssignedState(state: AssignedResolutionState, previous: AssignedResolutionState): AssignedResolutionState {
  const result: Record<string, unknown> = {}, exports = new Map<string, AssignedExportState>();
  for (const [name, row] of state.exports) {
    const prior = previous.exports.get(name), output = prior && equalAssignedOutput(row.output, prior.output) ? prior.output : row.output;
    exports.set(name, output === row.output ? row : { ...row, output });
    Object.defineProperty(result, name, { value: output, enumerable: true });
  }
  if (Object.hasOwn(state.result, NativeStyleMapSymbol))
    markNativeStyleMap(result);
  Object.freeze(result);
  const same = Object.keys(result).length === Object.keys(previous.result).length && Object.keys(result).every(k => Object.hasOwn(previous.result, k) && result[k] === previous.result[k]);
  return { ...state, exports, result: same ? previous.result : result };
}
export function resolveAssignedState(styles: Styles, input: NativeVarAssignments, theme?: Theme, previous?: AssignedResolutionState): AssignedResolutionState {
  const admitted = admitStyles(styles), assignments = admitVarAssignments(input), themeKey = theme === undefined ? noTheme : isImmutableLocalData(theme) ? theme : undefined;
  const cached = themeKey && memo.get(admitted)?.get(assignments)?.get(themeKey);
  if (cached)
    return previous ? reconcileAssignedState(cached, previous) : cached;
  const allVars = [...variablesInStyles(admitted), ...assignments.bindings.map(b => b.variable)];
  assertLocalDefinitions(allVars);
  const bindings = new Map(assignments.bindings.map(b => [nativeLocalVarKey(b.variable), b.value]));
  let frame: Theme | undefined;
  const currentFrame = () => frame ?? (frame = themeFrame(theme));
  const exports = new Map<string, AssignedExportState>(), result: Record<string, unknown> = {};
  for (const [name, row] of Object.entries(admitted)) {
    const prior = previous?.exports.get(name);
    if (prior && prior.input === row && [...prior.localReads].every(([id, value]) => Object.is(bindings.has(id) ? bindings.get(id) : missing, value)) && prior.themeReads.every(({ read, value }) => Object.is(readTheme(read, currentFrame()), value))) {
      exports.set(name, prior);
      Object.defineProperty(result, name, { value: prior.output, enumerable: true });
      continue;
    }
    const localReads = new Map<string, LocalRead>(), themeReads: {
      read: ThemeRead;
      value: unknown;
    }[] = [];
    const themeValue = (read: ThemeRead) => { const value = readTheme(read, currentFrame()); themeReads.push({ read, value }); return value; };
    const localValue = (value: unknown, path: string): unknown => {
      if (isThemeTokenReference(value))
        return themeValue({ reference: value });
      if (!localOperandCandidate(value))
        return value;
      const operand = admitLocalOperand(value), variables = operand.$$type === NativeLocalVarType ? [operand] : operand.variables;
      for (const variable of variables) {
        const key = nativeLocalVarKey(variable), next = bindings.has(key) ? bindings.get(key)! : missing;
        localReads.set(key, next);
        if (next !== missing)
          return next;
      }
      if (operand.$$type === NativeLocalVarType)
        localError(Code.LocalVarRequired, path, `required local variable ${nativeLocalVarKey(operand)} is unassigned`);
      return operand.terminal.kind === "literal" ? operand.terminal.value : themeValue(operand.terminal);
    };
    let output: unknown = row;
    if (localPlanCandidate(row)) {
      const plan = row as NativeLocalStylePlan<unknown>, resolved: Record<string, unknown> = {};
      for (const d of plan.declarations) {
        const value = localValue(d.value, `resolution.${name}.${d.property}`);
        if (!Object.hasOwn(structuredPropertyPrimitives, d.property)) {
          const operand = localOperandCandidate(d.value) ? admitLocalOperand(d.value) : undefined;
          const variables = operand ? operand.$$type === NativeLocalVarType ? [operand] : operand.variables : [];
          const context = `resolution.${name}.${d.property}${variables.length ? ` (${variables.map(nativeLocalVarKey).join(", ")})` : ""}`;
          assertNativeLocalPropertyValue(d.property, plan.primitiveDomain, value, context);
        }
        Object.defineProperty(resolved, d.property, { value, enumerable: true });
      }
      output = Object.freeze(resolved);
    }
    else if (row && typeof row === "object") {
      let changed = false;
      const resolved: Record<string, unknown> = {};
      for (const [property, value] of Object.entries(row)) {
        const next = localValue(value, `resolution.${name}.${property}`);
        if (isThemeTokenReference(value))
          assertNativeLocalPropertyValue(property, propertyPrimitives[property as keyof typeof propertyPrimitives], next);
        changed ||= next !== value;
        Object.defineProperty(resolved, property, { value: next, enumerable: true });
      }
      if (changed)
        output = Object.freeze(resolved);
    }
    if (prior && equalAssignedOutput(output, prior.output))
      output = prior.output;
    exports.set(name, { input: row, output, localReads, themeReads });
    Object.defineProperty(result, name, { value: output, enumerable: true });
  }
  if (Object.hasOwn(admitted, NativeStyleMapSymbol))
    markNativeStyleMap(result);
  Object.freeze(result);
  const same = previous && Object.keys(result).length === Object.keys(previous.result).length && Object.keys(result).every(k => Object.hasOwn(previous.result, k) && result[k] === previous.result[k]);
  const state = { styles: admitted, result: same ? previous.result : result, exports };
  if (themeKey && !previous) {
    let byAssignments = memo.get(admitted);
    if (!byAssignments) {
      byAssignments = new WeakMap();
      memo.set(admitted, byAssignments);
    }
    let byTheme = byAssignments.get(assignments);
    if (!byTheme) {
      byTheme = new WeakMap();
      byAssignments.set(assignments, byTheme);
    }
    byTheme.set(themeKey, state);
  }
  return state;
}
export function resolveAssignedStyles<const S extends Styles, TContract extends Record<string, unknown> = Record<string, unknown>>(styles: S, assignments: NativeVarAssignments, theme?: NativeTheme<TContract>): ResolvedAssignedStyles<S> { return resolveAssignedState(styles, assignments, theme).result as ResolvedAssignedStyles<S>; }
