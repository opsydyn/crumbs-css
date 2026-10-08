import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { isThemeTokenReference, isThemeTokenReferenceCandidate } from "../theme-token";
import { assertNativeLocalPropertyDomain, assertNativeLocalPropertyValue, propertyPrimitives } from "../native-property-policy";
import { structuredPropertyPrimitives, isNativeStructuredValue } from "../native-structured-policy";
import { NativeLocalStylePlanType, NativeLocalVarType, localOperandCandidate, nativeLocalVarKey, type NativeLocalStylePlan, type AnyLocalVar } from "./model";
import { copyLocalData, exactLocalRecord, localError, admitLocalOperand, assertLocalDefinitions, isImmutableLocalData } from "./admission";
import type { NativePrimitiveDomain } from "../compiler/native-capture";
const plans = new WeakMap<object, NativeLocalStylePlan<unknown>>();
export function localPlanCandidate(input: unknown): boolean { return typeof input === "object" && input !== null && Object.getOwnPropertyDescriptor(input, "$$type")?.value === NativeLocalStylePlanType; }
export function admitLocalStylePlan(input: unknown, path: string): NativeLocalStylePlan<unknown> {
  if (typeof input === "object" && input !== null) {
    const prior = plans.get(input);
    if (prior)
      return prior;
  }
  const raw = copyLocalData(input, Code.InvalidLocalVar, path), x = exactLocalRecord(raw, ["$$type", "version", "primitiveDomain", "declarations", "dependencies"], Code.InvalidLocalVar, path);
  if (x.$$type !== NativeLocalStylePlanType)
    localError(Code.InvalidLocalVar, path, "invalid plan tag");
  if (x.version !== 1)
    localError(Code.LocalVarUnsupportedVersion, path, "unsupported plan version");
  const kinds = x.primitiveDomain;
  if (!Array.isArray(kinds) || !kinds.length || ["view", "text", "image"].filter(k => kinds.includes(k)).join() !== kinds.join())
    localError(Code.InvalidLocalVar, path, "invalid primitive domain");
  const primitive = kinds as unknown as NativePrimitiveDomain;
  if (!Array.isArray(x.declarations))
    localError(Code.InvalidLocalVar, path, "declarations must be an array");
  const variables: AnyLocalVar[] = [], tokens = new Set<string>(), properties = new Set<string>();
  const declarations = x.declarations.map((input, i) => {
    const d = exactLocalRecord(input, ["property", "value"], Code.InvalidLocalVar, `${path}.${i}`);
    if (typeof d.property !== "string" || properties.has(d.property))
      localError(Code.InvalidLocalVar, path, "invalid or repeated canonical property");
    properties.add(d.property);
    let value = d.value;
    if (localOperandCandidate(value)) {
      value = admitLocalOperand(value);
      const operand = value as ReturnType<typeof admitLocalOperand>;
      const vars = operand.$$type === NativeLocalVarType ? [operand] : operand.variables;
      assertNativeLocalPropertyDomain(d.property, primitive, vars[0]!.domain);
      variables.push(...vars);
      if (operand.$$type !== NativeLocalVarType && operand.terminal.kind === "theme")
        tokens.add(operand.terminal.reference.varName);
    }
    else if (isThemeTokenReferenceCandidate(value)) {
      if (!isThemeTokenReference(value) || !Object.hasOwn(propertyPrimitives, d.property))
        localError(Code.InvalidLocalVar, path, "invalid native theme reference");
      const allowed = propertyPrimitives[d.property as keyof typeof propertyPrimitives];
      if (!primitive.every(k => allowed.includes(k)))
        localError(Code.LocalVarInvalidPropertyValue, path, "wrong theme property primitive");
      tokens.add(value.varName);
    }
    else if (Object.hasOwn(structuredPropertyPrimitives, d.property)) {
      const allowed = structuredPropertyPrimitives[d.property as keyof typeof structuredPropertyPrimitives];
      if (!primitive.every(k => allowed.includes(k)) || !isNativeStructuredValue(d.property, value))
        localError(Code.LocalVarInvalidPropertyValue, path, "invalid structured native value");
    }
    else
      assertNativeLocalPropertyValue(d.property, primitive, value);
    return Object.freeze({ property: d.property, value });
  });
  assertLocalDefinitions(variables);
  const dependencies = exactLocalRecord(x.dependencies, ["localVars", "tokens"], Code.InvalidLocalVar, path + ".dependencies");
  const localVars = [...new Set(variables.map(nativeLocalVarKey))].sort(), themeTokens = [...tokens].sort();
  if (!Array.isArray(dependencies.localVars) || !Array.isArray(dependencies.tokens) || JSON.stringify(dependencies.localVars) !== JSON.stringify(localVars) || JSON.stringify(dependencies.tokens) !== JSON.stringify(themeTokens))
    localError(Code.InvalidLocalVar, path, "dependency tables do not match declarations");
  const result = Object.freeze({ $$type: NativeLocalStylePlanType, version: 1, primitiveDomain: primitive, declarations: Object.freeze(declarations), dependencies: Object.freeze({ localVars: Object.freeze(localVars), tokens: Object.freeze(themeTokens) }) }) as NativeLocalStylePlan<unknown>;
  if (typeof input === "object" && input !== null && isImmutableLocalData(input))
    plans.set(input, result);
  plans.set(result, result);
  return result;
}
