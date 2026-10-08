import type { NativePrimitiveDomain } from "../compiler/native-capture";
import type { TokenContractIdentity } from "../tokens/identity";
import type { TokenDomain, TokenDomainValue, PublicDomainThemeVar, UnbrandedThemeLiteral, NativeThemeTokenReference } from "../theme-token";
import type { TokenDomainDefinition } from "../tokens/domains";
export const NativeLocalVarType = "crumbs.css.local-var" as const;
export const NativeLocalFallbackType = "crumbs.css.local-fallback" as const;
export const NativeVarAssignmentsType = "crumbs.css.local-assignments" as const;
export const NativeLocalStylePlanType = "crumbs.css.local-style-plan" as const;
declare const localVarBrand: unique symbol;
declare const localFallbackBrand: unique symbol;
declare const assignmentsBrand: unique symbol;
declare const planBrand: unique symbol;
export type NativeLocalDomain<D extends TokenDomainDefinition> = D extends "color" | {
  readonly kind: "color";
} ? {
  readonly kind: "color";
} : D extends "duration" | {
  readonly kind: "duration";
} ? {
  readonly kind: "duration";
} : D extends "opacity" | {
  readonly kind: "opacity";
} ? {
  readonly kind: "opacity";
} : D extends "length" | {
  readonly kind: "length";
} ? {
  readonly kind: "length";
  readonly allowNegative: D extends {
    readonly allowNegative: true;
  } ? true : false;
} : D extends {
  readonly kind: "enum";
  readonly values: infer V extends readonly string[];
} ? {
  readonly kind: "enum";
  readonly values: ReadonlyArray<V[number]>;
} : never;
export type LocalVarData = {
  readonly $$type: typeof NativeLocalVarType;
  readonly version: 1;
  readonly identity: TokenContractIdentity;
  readonly domain: TokenDomain;
};
export type NativeLocalVar<D extends TokenDomain = TokenDomain> = LocalVarData & {
  readonly domain: D;
  readonly [localVarBrand]: (domain: D) => D;
};
export type AnyLocalVar = LocalVarData & {
  readonly [localVarBrand]: unknown;
};
export type LocalLiteral<D extends TokenDomain> = TokenDomainValue<D> extends infer V ? V extends string ? V & UnbrandedThemeLiteral : V : never;
export type NativeLocalTerminalInput<D extends TokenDomain> = LocalLiteral<D> | PublicDomainThemeVar<D>;
export type LocalTerminal = {
  readonly kind: "literal";
  readonly value: string | number;
} | {
  readonly kind: "theme";
  readonly reference: NativeThemeTokenReference;
  readonly domain: TokenDomain;
  readonly publicId: string;
  readonly contractIdentity?: TokenContractIdentity;
};
export type LocalFallbackData = {
  readonly $$type: typeof NativeLocalFallbackType;
  readonly version: 1;
  readonly variables: readonly AnyLocalVar[];
  readonly terminal: LocalTerminal;
};
export type NativeLocalFallback<D extends TokenDomain = TokenDomain> = LocalFallbackData & {
  readonly variables: readonly NativeLocalVar<D>[];
  readonly [localFallbackBrand]: (domain: D) => D;
};
export type AnyLocalFallback = LocalFallbackData & {
  readonly [localFallbackBrand]: unknown;
};
export type NativeLocalVarShape = {
  readonly [key: string]: AnyLocalVar | NativeLocalVarShape;
};
export type NativeLocalVarValues<S extends NativeLocalVarShape> = {
  readonly [K in keyof S]: S[K] extends NativeLocalVar<infer D> ? LocalLiteral<D> : S[K] extends NativeLocalVarShape ? NativeLocalVarValues<S[K]> : never;
};
export type NativeVarAssignments = {
  readonly $$type: typeof NativeVarAssignmentsType;
  readonly version: 1;
  readonly bindings: readonly {
    readonly variable: AnyLocalVar;
    readonly value: string | number;
  }[];
  readonly [assignmentsBrand]: true;
};
export type NativeLocalStylePlan<S> = {
  readonly $$type: typeof NativeLocalStylePlanType;
  readonly version: 1;
  readonly primitiveDomain: NativePrimitiveDomain;
  readonly declarations: readonly {
    readonly property: string;
    readonly value: unknown;
  }[];
  readonly dependencies: {
    readonly localVars: readonly string[];
    readonly tokens: readonly string[];
  };
  readonly [planBrand]: S;
};
export type ResolvedAssignedStyles<S extends Readonly<Record<string, unknown>>> = {
  readonly [K in keyof S]: S[K] extends NativeLocalStylePlan<infer T> ? T : S[K];
};
export function nativeLocalVarKey(variable: LocalVarData): string { return `crumbs.css.local-var:${variable.identity.owner}#${variable.identity.name}@${variable.identity.version}`; }
export function localOperandCandidate(input: unknown): boolean {
  if (typeof input !== "object" || input === null)
    return false;
  const d = Object.getOwnPropertyDescriptor(input, "$$type");
  return d !== undefined && "value" in d && (d.value === NativeLocalVarType || d.value === NativeLocalFallbackType);
}
