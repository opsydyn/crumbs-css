import { t as TokenContractIdentity } from "./identity-DwBRSt_G.mjs";
import { h as UnbrandedThemeLiteral, i as NativeThemeTokenReference, m as TokenDomainValue, p as TokenDomain } from "./theme-token-5fLFCMug.mjs";
import { f as TokenDomainDefinition } from "./domains-DjWDvNbl.mjs";

//#region src/compiler/native-capture.d.ts
type NativePrimitiveKind = "view" | "text" | "image";
type NativePrimitiveDomain = readonly [NativePrimitiveKind, ...NativePrimitiveKind[]];
//#endregion
//#region src/local-vars/model.d.ts
declare const NativeLocalVarType: "crumbs.css.local-var";
declare const NativeLocalFallbackType: "crumbs.css.local-fallback";
declare const NativeVarAssignmentsType: "crumbs.css.local-assignments";
declare const NativeLocalStylePlanType: "crumbs.css.local-style-plan";
declare const localVarBrand: unique symbol;
declare const localFallbackBrand: unique symbol;
declare const assignmentsBrand: unique symbol;
declare const planBrand: unique symbol;
type NativeLocalDomain<D extends TokenDomainDefinition> = D extends "color" | {
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
type LocalVarData = {
  readonly $$type: typeof NativeLocalVarType;
  readonly version: 1;
  readonly identity: TokenContractIdentity;
  readonly domain: TokenDomain;
};
type NativeLocalVar<D extends TokenDomain = TokenDomain> = LocalVarData & {
  readonly domain: D;
  readonly [localVarBrand]: (domain: D) => D;
};
type AnyLocalVar = LocalVarData & {
  readonly [localVarBrand]: unknown;
};
type LocalLiteral<D extends TokenDomain> = TokenDomainValue<D> extends infer V ? V extends string ? V & UnbrandedThemeLiteral : V : never;
type LocalTerminal = {
  readonly kind: "literal";
  readonly value: string | number;
} | {
  readonly kind: "theme";
  readonly reference: NativeThemeTokenReference;
  readonly domain: TokenDomain;
  readonly publicId: string;
  readonly contractIdentity?: TokenContractIdentity;
};
type LocalFallbackData = {
  readonly $$type: typeof NativeLocalFallbackType;
  readonly version: 1;
  readonly variables: readonly AnyLocalVar[];
  readonly terminal: LocalTerminal;
};
type NativeLocalFallback<D extends TokenDomain = TokenDomain> = LocalFallbackData & {
  readonly variables: readonly NativeLocalVar<D>[];
  readonly [localFallbackBrand]: (domain: D) => D;
};
type AnyLocalFallback = LocalFallbackData & {
  readonly [localFallbackBrand]: unknown;
};
type NativeLocalVarShape = {
  readonly [key: string]: AnyLocalVar | NativeLocalVarShape;
};
type NativeLocalVarValues<S extends NativeLocalVarShape> = { readonly [K in keyof S]: S[K] extends NativeLocalVar<infer D> ? LocalLiteral<D> : S[K] extends NativeLocalVarShape ? NativeLocalVarValues<S[K]> : never };
type NativeVarAssignments = {
  readonly $$type: typeof NativeVarAssignmentsType;
  readonly version: 1;
  readonly bindings: readonly {
    readonly variable: AnyLocalVar;
    readonly value: string | number;
  }[];
  readonly [assignmentsBrand]: true;
};
type NativeLocalStylePlan<S> = {
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
type ResolvedAssignedStyles<S extends Readonly<Record<string, unknown>>> = { readonly [K in keyof S]: S[K] extends NativeLocalStylePlan<infer T> ? T : S[K] };
//#endregion
export { NativeLocalFallback as a, NativeLocalVarShape as c, ResolvedAssignedStyles as d, NativePrimitiveDomain as f, NativeLocalDomain as i, NativeLocalVarValues as l, AnyLocalVar as n, NativeLocalStylePlan as o, NativePrimitiveKind as p, LocalLiteral as r, NativeLocalVar as s, AnyLocalFallback as t, NativeVarAssignments as u };