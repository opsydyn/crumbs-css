import { s as NativeConditionSnapshot } from "./index-D5bu2_y1.mjs";

//#region src/expressions/index.d.ts
/**
 * Versioned, inspectable native expression data. Expression nodes contain no
 * closures, React values or runtime services, so a compiler can serialise and
 * analyse them before a later evaluator is introduced.
 */
declare const NativeExpressionType: "crumbs.css.expression";
declare const NativeExpressionVersion: 1;
declare const NativeExpressionProgramType: "crumbs.css.expression-program";
declare const NativeExpressionProgramVersion: 1;
type NativeExpressionNumberDomain = Readonly<{
  readonly kind: "number";
  readonly unit: "unitless";
}>;
type NativeExpressionLengthDomain = Readonly<{
  readonly kind: "length";
  readonly unit: "px";
  readonly allowNegative: boolean;
}>;
type NativeExpressionDurationDomain = Readonly<{
  readonly kind: "duration";
  readonly unit: "ms";
}>;
type NativeExpressionOpacityDomain = Readonly<{
  readonly kind: "opacity";
  readonly unit: "fraction";
}>;
type NativeExpressionColorDomain = Readonly<{
  readonly kind: "color";
  readonly format: "native";
}>;
type NativeExpressionEnumDomain<TValue extends string = string> = Readonly<{
  readonly kind: "enum";
  readonly values: readonly [TValue, ...TValue[]];
}>;
type NativeExpressionDomain = NativeExpressionNumberDomain | NativeExpressionLengthDomain | NativeExpressionDurationDomain | NativeExpressionOpacityDomain | NativeExpressionColorDomain | NativeExpressionEnumDomain;
type NativeExpressionDomainInput = NativeExpressionNumberDomain | NativeExpressionLengthDomain | NativeExpressionDurationDomain | NativeExpressionOpacityDomain | NativeExpressionColorDomain | Readonly<{
  readonly kind: "enum";
  readonly values: readonly [string, ...string[]];
}>;
type NativeExpressionValue<TDomain extends NativeExpressionDomain> = TDomain extends NativeExpressionEnumDomain<infer TValue> ? TValue : TDomain extends NativeExpressionColorDomain ? string : TDomain extends NativeExpressionNumberDomain | NativeExpressionLengthDomain | NativeExpressionDurationDomain | NativeExpressionOpacityDomain ? number : never;
type NativeExpressionDependency = Readonly<{
  readonly kind: "token";
  readonly name: string;
} | {
  readonly kind: "condition";
  readonly key: NativeConditionKey;
}>;
type NativeConditionKey = keyof NativeConditionSnapshot;
type NativeConditionValue<TKey extends NativeConditionKey> = NativeConditionSnapshot[TKey];
type NativeExpressionNodeKind = "literal" | "token-reference" | "condition-reference" | "alias" | "fallback" | "compose" | "add" | "subtract" | "scale" | "clamp" | "match";
type NativeExpressionNodeBase<TDomain extends NativeExpressionDomain> = Readonly<{
  readonly $$type: typeof NativeExpressionType;
  readonly version: typeof NativeExpressionVersion;
  readonly kind: NativeExpressionNodeKind;
  readonly domain: TDomain;
  readonly dependencies: readonly NativeExpressionDependency[];
}>;
type NativeExpressionLiteral<TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "literal";
  readonly value: NativeExpressionValue<TDomain>;
}>;
type NativeExpressionTokenReference<TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "token-reference";
  readonly token: string;
}>;
type NativeExpressionConditionReference<TKey extends NativeConditionKey> = NativeExpressionNodeBase<NativeExpressionEnumDomain<NativeConditionValue<TKey>>> & Readonly<{
  readonly kind: "condition-reference";
  readonly condition: TKey;
}>;
type NativeExpressionAlias<TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "alias";
  readonly name: string;
  readonly expression: NativeExpression<TDomain>;
}>;
type NativeExpressionFallback<TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "fallback";
  readonly primary: NativeExpression<TDomain>;
  readonly fallback: NativeExpression<TDomain>;
  readonly onMissing: "use-fallback";
}>;
type NativeExpressionCompose<TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "compose";
  readonly expressions: readonly NativeExpression<TDomain>[];
  readonly order: "left-to-right";
}>;
type NativeExpressionAdd<TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "add";
  readonly left: NativeExpression<TDomain>;
  readonly right: NativeExpression<TDomain>;
}>;
type NativeExpressionSubtract<TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "subtract";
  readonly left: NativeExpression<TDomain>;
  readonly right: NativeExpression<TDomain>;
}>;
type NativeExpressionScale<TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "scale";
  readonly expression: NativeExpression<TDomain>;
  readonly factor: number;
}>;
type NativeExpressionClamp<TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "clamp";
  readonly expression: NativeExpression<TDomain>;
  readonly minimum: number;
  readonly maximum: number;
}>;
type NativeExpressionMatchCase<TKey extends NativeConditionKey, TDomain extends NativeExpressionDomain> = Readonly<{
  readonly value: NativeConditionValue<TKey>;
  readonly expression: NativeExpression<TDomain>;
}>;
type NativeExpressionMatch<TKey extends NativeConditionKey, TDomain extends NativeExpressionDomain> = NativeExpressionNodeBase<TDomain> & Readonly<{
  readonly kind: "match";
  readonly condition: TKey;
  readonly cases: readonly NativeExpressionMatchCase<TKey, TDomain>[];
  readonly fallback?: NativeExpression<TDomain>;
  readonly exhaustive: true;
}>;
type NativeExpression<TDomain extends NativeExpressionDomain = NativeExpressionDomain> = NativeExpressionLiteral<TDomain> | NativeExpressionTokenReference<TDomain> | NativeExpressionConditionReference<NativeConditionKey> | NativeExpressionAlias<TDomain> | NativeExpressionFallback<TDomain> | NativeExpressionCompose<TDomain> | NativeExpressionAdd<TDomain> | NativeExpressionSubtract<TDomain> | NativeExpressionScale<TDomain> | NativeExpressionClamp<TDomain> | NativeExpressionMatch<NativeConditionKey, TDomain>;
type NativeExpressionProgram<TDomain extends NativeExpressionDomain = NativeExpressionDomain> = Readonly<{
  readonly $$type: typeof NativeExpressionProgramType;
  readonly version: typeof NativeExpressionProgramVersion;
  readonly root: NativeExpression<TDomain>;
  readonly dependencies: readonly NativeExpressionDependency[];
}>;
type AdditiveDomain = NativeExpressionNumberDomain | NativeExpressionLengthDomain | NativeExpressionDurationDomain;
type NumericDomain = AdditiveDomain | NativeExpressionOpacityDomain;
type PreventInference<T> = [T][T extends unknown ? 0 : never];
declare function nativeExpressionDomainKey(domain: NativeExpressionDomain): string;
declare function createNativeExpressionDomain<const TDomain extends NativeExpressionDomain>(input: TDomain): Readonly<TDomain>;
declare function createNativeExpressionLiteral<const TDomain extends NativeExpressionDomain>(domain: TDomain, value: NativeExpressionValue<TDomain>): NativeExpressionLiteral<TDomain>;
declare function createNativeExpressionTokenReference<const TDomain extends NativeExpressionDomain>(token: string, domain: TDomain): NativeExpressionTokenReference<TDomain>;
declare function createNativeExpressionConditionReference<const TKey extends NativeConditionKey>(condition: TKey): NativeExpressionConditionReference<TKey>;
declare function createNativeExpressionAlias<TDomain extends NativeExpressionDomain>(name: string, expression: NativeExpression<TDomain>): NativeExpressionAlias<TDomain>;
declare function createNativeExpressionFallback<TDomain extends NativeExpressionDomain>(primary: NativeExpression<TDomain>, fallback: NativeExpression<TDomain>): NativeExpressionFallback<TDomain>;
declare function createNativeExpressionCompose<TDomain extends NativeExpressionDomain>(expressions: readonly [NativeExpression<TDomain>, ...ReadonlyArray<NativeExpression<PreventInference<TDomain>>>]): NativeExpressionCompose<TDomain>;
declare function createNativeExpressionAdd<TDomain extends AdditiveDomain>(left: NativeExpression<TDomain>, right: NativeExpression<PreventInference<TDomain>>): NativeExpressionAdd<TDomain>;
declare function createNativeExpressionSubtract<TDomain extends AdditiveDomain>(left: NativeExpression<TDomain>, right: NativeExpression<PreventInference<TDomain>>): NativeExpressionSubtract<TDomain>;
declare function createNativeExpressionScale<TDomain extends NumericDomain>(expression: NativeExpression<TDomain>, factor: number): NativeExpressionScale<TDomain>;
declare function createNativeExpressionClamp<TDomain extends NumericDomain>(expression: NativeExpression<TDomain>, minimum: number, maximum: number): NativeExpressionClamp<TDomain>;
type NativeExpressionMatchOptions<TKey extends NativeConditionKey, TDomain extends NativeExpressionDomain> = Readonly<{
  readonly condition: TKey;
  readonly cases: readonly NativeExpressionMatchCase<TKey, TDomain>[];
  readonly fallback?: NativeExpression<TDomain>;
}>;
declare function createNativeExpressionMatch<const TKey extends NativeConditionKey, TDomain extends NativeExpressionDomain>(options: NativeExpressionMatchOptions<TKey, TDomain>): NativeExpressionMatch<TKey, TDomain>;
declare function createNativeExpressionProgram<TDomain extends NativeExpressionDomain>(root: NativeExpression<TDomain>): NativeExpressionProgram<TDomain>;
declare function nativeExpressionDependencyKey(dependency: NativeExpressionDependency): string;
declare function isNativeExpression(value: unknown): value is NativeExpression;
declare function isNativeExpressionProgram(value: unknown): value is NativeExpressionProgram;
type NativeExpressionEvaluationErrorCode = "missing-input" | "invalid-input" | "domain-error";
declare class NativeExpressionEvaluationError extends Error {
  readonly code: NativeExpressionEvaluationErrorCode;
  readonly dependency?: NativeExpressionDependency;
  constructor(code: NativeExpressionEvaluationErrorCode, message: string, dependency?: NativeExpressionDependency);
}
type NativeExpressionEvaluationState = Readonly<{
  readonly tokens?: Readonly<Record<string, unknown>>;
  readonly conditions: NativeConditionSnapshot;
}>;
type NativeExpressionRuntimeStats = Readonly<{
  readonly evaluations: number;
  readonly skipped: number;
  readonly declaredDependencies: readonly NativeExpressionDependency[];
  readonly disposed: boolean;
}>;
type NativeExpressionRuntime<TDomain extends NativeExpressionDomain = NativeExpressionDomain> = Readonly<{
  readonly getValue: () => NativeExpressionValue<TDomain>;
  readonly getState: () => NativeExpressionEvaluationState;
  readonly getStats: () => NativeExpressionRuntimeStats; /** Returns true only when a declared dependency caused a new evaluation. */
  readonly update: (state: NativeExpressionEvaluationState) => boolean;
  readonly dispose: () => void;
}>;
type NativeExpressionMatchTrace = Readonly<{
  readonly condition: NativeConditionKey;
  readonly value: string;
  readonly selectedBranch: "case" | "fallback";
  readonly selectedCaseValue?: string;
}>;
declare function evaluateNativeExpression<TDomain extends NativeExpressionDomain>(expression: NativeExpression<TDomain>, state?: NativeExpressionEvaluationState): NativeExpressionValue<TDomain>;
/** @internal Evaluate with opt-in match evidence; the value uses the same evaluator as the ordinary API. */
declare function evaluateNativeExpressionWithTrace<TDomain extends NativeExpressionDomain>(expression: NativeExpression<TDomain>, state?: NativeExpressionEvaluationState): Readonly<{
  readonly value: NativeExpressionValue<TDomain>;
  readonly matches: ReadonlyArray<NativeExpressionMatchTrace>;
}>;
declare function foldNativeExpression<TDomain extends NativeExpressionDomain>(expression: NativeExpression<TDomain>): NativeExpression<TDomain>;
declare function createNativeExpressionRuntime<TDomain extends NativeExpressionDomain>(program: NativeExpressionProgram<TDomain>, initialState?: NativeExpressionEvaluationState): NativeExpressionRuntime<TDomain>;
//#endregion
export { evaluateNativeExpressionWithTrace as $, NativeExpressionRuntime as A, createNativeExpressionClamp as B, NativeExpressionMatchOptions as C, NativeExpressionProgram as D, NativeExpressionOpacityDomain as E, NativeExpressionType as F, createNativeExpressionLiteral as G, createNativeExpressionConditionReference as H, NativeExpressionValue as I, createNativeExpressionRuntime as J, createNativeExpressionMatch as K, NativeExpressionVersion as L, NativeExpressionScale as M, NativeExpressionSubtract as N, NativeExpressionProgramType as O, NativeExpressionTokenReference as P, evaluateNativeExpression as Q, createNativeExpressionAdd as R, NativeExpressionMatchCase as S, NativeExpressionNumberDomain as T, createNativeExpressionDomain as U, createNativeExpressionCompose as V, createNativeExpressionFallback as W, createNativeExpressionSubtract as X, createNativeExpressionScale as Y, createNativeExpressionTokenReference as Z, NativeExpressionEvaluationState as _, NativeExpressionAlias as a, NativeExpressionLiteral as b, NativeExpressionCompose as c, NativeExpressionDomain as d, foldNativeExpression as et, NativeExpressionDomainInput as f, NativeExpressionEvaluationErrorCode as g, NativeExpressionEvaluationError as h, NativeExpressionAdd as i, nativeExpressionDomainKey as it, NativeExpressionRuntimeStats as j, NativeExpressionProgramVersion as k, NativeExpressionConditionReference as l, NativeExpressionEnumDomain as m, NativeConditionValue as n, isNativeExpressionProgram as nt, NativeExpressionClamp as o, NativeExpressionDurationDomain as p, createNativeExpressionProgram as q, NativeExpression as r, nativeExpressionDependencyKey as rt, NativeExpressionColorDomain as s, NativeConditionKey as t, isNativeExpression as tt, NativeExpressionDependency as u, NativeExpressionFallback as v, NativeExpressionMatchTrace as w, NativeExpressionMatch as x, NativeExpressionLengthDomain as y, createNativeExpressionAlias as z };