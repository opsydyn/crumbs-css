import { copyCompilerLocalData } from "./local-data";
import { NativeStylesDiagnosticCode as Code } from "../diagnostics";
import { getNativeCaptureMetadata, type NativePrimitiveDomain } from "./native-capture";
import type { ScalarCaptureContext, MigratedScalarProperty, PropertyProvenance, ScalarDeclarationBlock } from "./native-ir";
import { propertyPrimitives, scalarAliasExpansions, assertNativeLocalPropertyDomain } from "../native-property-policy";
import { localOperandCandidate, NativeLocalVarType, NativeLocalStylePlanType, nativeLocalVarKey, type AnyLocalVar, type AnyLocalFallback, type NativeLocalStylePlan } from "../local-vars/model";
import { admitLocalOperand, copyLocalData, assertLocalDefinitions, localError } from "../local-vars/admission";
import { isThemeTokenReference, createThemeTokenReference } from "../theme-token";
import { admitLocalStylePlan } from "../local-vars/plan-admission";
import { validateLocalStylePlanSchema } from "./local-vars-schema";
export type LocalVarDeclaration = {
  readonly property: MigratedScalarProperty;
  readonly value: AnyLocalVar | AnyLocalFallback;
  readonly provenance: PropertyProvenance;
};
export type LocalVarCaptureResult = {
  readonly cssRule: Record<string, unknown>;
  readonly declarations: readonly LocalVarDeclaration[];
  readonly propertyOrder: readonly string[];
};
export function captureLocalVarsIntoNativeIr(rule: Readonly<Record<string, unknown>>, context: ScalarCaptureContext): LocalVarCaptureResult {
  const metadata = getNativeCaptureMetadata(rule), descriptors = Object.getOwnPropertyDescriptors(rule), order = Object.keys(descriptors).filter(p => descriptors[p]?.enumerable);
  const declarations: LocalVarDeclaration[] = [];
  for (const authoredProperty of order) {
    const descriptor = descriptors[authoredProperty]!;
    if (!("value" in descriptor))
      localError(Code.InvalidLocalVar, `${context.sourceId}.${authoredProperty}`, "accessor declaration");
    if (!localOperandCandidate(descriptor.value))
      continue;
    if (!metadata)
      localError(Code.InvalidLocalVar, authoredProperty, "local variables require native primitive authoring");
    const value = admitLocalOperand(copyCompilerLocalData(descriptor.value)), variable = value.$$type === NativeLocalVarType ? value : value.variables[0]!;
    const canonical = Object.hasOwn(scalarAliasExpansions, authoredProperty) ? scalarAliasExpansions[authoredProperty as keyof typeof scalarAliasExpansions] : [authoredProperty as MigratedScalarProperty];
    for (const property of canonical) {
      const allowed = propertyPrimitives[property];
      const primitives = metadata.primitiveDomain.filter(p => allowed?.includes(p));
      if (!primitives.length)
        localError(Code.LocalVarDomainMismatch, `${context.sourceId}.${authoredProperty}`, "unsupported native property or primitive");
      assertNativeLocalPropertyDomain(property, primitives as unknown as NativePrimitiveDomain, variable.domain);
      declarations.push(Object.freeze({ property, value, provenance: Object.freeze({ packageOwner: context.packageOwner, sourceId: context.sourceId, exportPath: Object.freeze([]), logicalPath: Object.freeze([context.className, authoredProperty]), origin: metadata.origin, authoredProperty: authoredProperty as PropertyProvenance["authoredProperty"], canonicalProperty: property, shorthandExpansionPath: Object.freeze(property === authoredProperty ? [] : [authoredProperty, property]) }) }));
    }
    delete descriptors[authoredProperty];
  }
  return { cssRule: declarations.length ? Object.create(Object.getPrototypeOf(rule), descriptors) : rule as Record<string, unknown>, declarations: Object.freeze(declarations), propertyOrder: Object.freeze(order) };
}
export function replayLocalDeclarations(staticValues: Record<string, unknown>, capture: LocalVarCaptureResult, scalar?: ScalarDeclarationBlock): Record<string, unknown> {
  const result = { ...staticValues };
  for (const d of [...(scalar?.declarations ?? []), ...capture.declarations])
    delete result[d.property];
  const write = (property: string, value: unknown) => { delete result[property]; result[property] = value; };
  for (const property of capture.propertyOrder) {
    for (const d of scalar?.declarations ?? [])
      if (d.provenance.authoredProperty === property)
        write(d.property, typeof d.value === "object" ? createThemeTokenReference(d.value.varName) : d.value);
    for (const d of capture.declarations)
      if (d.provenance.authoredProperty === property)
        write(d.property, d.value);
  }
  return result;
}
export function createLocalStylePlan(primitiveDomain: NativePrimitiveDomain, declarations: readonly {
  property: string;
  value: unknown;
}[]): NativeLocalStylePlan<unknown> {
  const winners = new Map<string, unknown>();
  for (const d of declarations) {
    winners.delete(d.property);
    winners.set(d.property, d.value);
  }
  const locals: AnyLocalVar[] = [], tokens = new Set<string>();
  function visit(value: unknown): void {
    if (localOperandCandidate(value)) {
      const operand = admitLocalOperand(value);
      locals.push(...(operand.$$type === NativeLocalVarType ? [operand] : operand.variables));
      if (operand.$$type !== NativeLocalVarType && operand.terminal.kind === "theme")
        tokens.add(operand.terminal.reference.varName);
      return;
    }
    if (isThemeTokenReference(value)) {
      tokens.add(value.varName);
      return;
    }
    if (value && typeof value === "object")
      for (const nested of Object.values(value))
        visit(nested);
  }
  for (const [property, value] of winners) {
    if (localOperandCandidate(value)) {
      const operand = admitLocalOperand(value);
      assertNativeLocalPropertyDomain(property, primitiveDomain, operand.$$type === NativeLocalVarType ? operand.domain : operand.variables[0]!.domain);
    }
    visit(value);
  }
  assertLocalDefinitions(locals);
  const result = copyLocalData({ $$type: NativeLocalStylePlanType, version: 1, primitiveDomain, declarations: [...winners].map(([property, value]) => ({ property, value })), dependencies: { localVars: [...new Set(locals.map(nativeLocalVarKey))].sort(), tokens: [...tokens].sort() } }, Code.InvalidLocalVar) as NativeLocalStylePlan<unknown>;
  validateLocalStylePlanSchema(result);
  return admitLocalStylePlan(result, "compiled local plan");
}
