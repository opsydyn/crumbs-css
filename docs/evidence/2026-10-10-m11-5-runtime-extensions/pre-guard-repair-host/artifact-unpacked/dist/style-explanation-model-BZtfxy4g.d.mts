import { o as NativeConditionMatcher, s as NativeConditionSnapshot } from "./index-D5bu2_y1.mjs";
import { t as NativeConditionKey } from "./index-DwiLqNzn.mjs";
import { f as NativePrimitiveDomain } from "./model-DAuWjF1q.mjs";
import { it as NativeComponentRecipeExtensionDescriptor } from "./native-style-minqF-Hg.mjs";
import { t as TokenContractIdentity } from "./identity-DwBRSt_G.mjs";
import { L as NativeTheme } from "./domains-DjWDvNbl.mjs";

//#region src/devtools/style-explanation-model.d.ts
declare const STYLE_EXPLANATION_METADATA_TYPE: "crumbs.css.style-explanation-metadata";
declare const STYLE_EXPLANATION_REPORT_TYPE: "crumbs.css.style-explanation";
declare const STYLE_EXPLANATION_VALUE_TYPE: "crumbs.css.style-explanation-value";
declare const STYLE_EXPLANATION_VERSION: 1;
type StyleExplanationPathSegment = string | number;
type StyleExplanationPath = ReadonlyArray<StyleExplanationPathSegment>;
/** Explicit inputs used for one on-demand style explanation. */
type StyleExplanationSnapshot = {
  readonly theme?: NativeTheme<Record<string, unknown>>;
  readonly selection?: Readonly<Record<string, unknown>>;
  readonly conditions?: NativeConditionSnapshot;
  readonly extensions?: ReadonlyArray<NativeComponentRecipeExtensionDescriptor>;
};
type ExplainStyleInput = {
  readonly module: Readonly<Record<string, unknown>>;
  readonly exportPath: StyleExplanationPath;
  readonly current: StyleExplanationSnapshot;
  readonly previous?: StyleExplanationSnapshot;
};
type StyleExplanationOpaqueReason = "accessor" | "cycle" | "depth-limit" | "function" | "symbol" | "bigint" | "non-finite-number" | "unsupported-object";
type StyleExplanationThemeTokenIdentity = {
  readonly varName: string;
  readonly contract?: TokenContractIdentity;
};
type StyleExplanationNegativeZero = {
  readonly $$type: typeof STYLE_EXPLANATION_VALUE_TYPE;
  readonly version: typeof STYLE_EXPLANATION_VERSION;
  readonly kind: "negative-zero";
};
type StyleExplanationUndefined = {
  readonly $$type: typeof STYLE_EXPLANATION_VALUE_TYPE;
  readonly version: typeof STYLE_EXPLANATION_VERSION;
  readonly kind: "undefined";
};
type StyleExplanationThemeToken = {
  readonly $$type: typeof STYLE_EXPLANATION_VALUE_TYPE;
  readonly version: typeof STYLE_EXPLANATION_VERSION;
  readonly kind: "theme-token";
  readonly identity: StyleExplanationThemeTokenIdentity;
  readonly resolvedValue: StyleExplanationValue;
};
type StyleExplanationOpaqueValue = {
  readonly $$type: typeof STYLE_EXPLANATION_VALUE_TYPE;
  readonly version: typeof STYLE_EXPLANATION_VERSION;
  readonly kind: "opaque";
  readonly reason: StyleExplanationOpaqueReason;
};
interface StyleExplanationValueArray extends ReadonlyArray<StyleExplanationValue> {}
interface StyleExplanationValueRecord {
  readonly [key: string]: StyleExplanationValue;
}
type StyleExplanationJsonValue = null | boolean | number | string | StyleExplanationValueArray | StyleExplanationValueRecord;
type StyleExplanationValue = StyleExplanationJsonValue | StyleExplanationNegativeZero | StyleExplanationUndefined | StyleExplanationThemeToken | StyleExplanationOpaqueValue;
type StyleExplanationCoverageReason = "metadata-missing" | "compatibility-only" | "opaque-value" | "dependency-metadata-missing";
type StyleExplanationCoverage = {
  readonly status: "complete" | "partial" | "unavailable";
  readonly reasons: ReadonlyArray<StyleExplanationCoverageReason>;
};
type StyleExplanationDeclaration = {
  readonly id: string;
  readonly sourceId: string;
  readonly packageOwner: string;
  readonly logicalPath: StyleExplanationPath;
  readonly authoredProperty: string;
  readonly canonicalProperty: string;
  readonly shorthandExpansionPath: ReadonlyArray<string>;
  readonly primitiveDomain: NativePrimitiveDomain;
  readonly order: number;
  readonly value: StyleExplanationValue;
};
type StyleExplanationBranchKind = "recipe" | "component-recipe" | "extension" | "sprinkles" | "condition" | "expression";
type StyleExplanationBranchReason = "selection-mismatch" | "compound-mismatch" | "state-rejected" | "condition-unmatched" | "not-selected" | "superseded";
type StyleExplanationBranchMetadata = {
  readonly kind: StyleExplanationBranchKind;
  readonly path: StyleExplanationPath;
  readonly identity: string;
  readonly order: number;
  readonly selector: Readonly<Record<string, StyleExplanationValue>>;
  readonly sourceId?: string;
};
type StyleExplanationExportMetadata = {
  readonly path: StyleExplanationPath;
  readonly candidates: ReadonlyArray<StyleExplanationDeclaration>;
  readonly branches: ReadonlyArray<StyleExplanationBranchMetadata>;
  readonly tokenDependencies: ReadonlyArray<string>;
  readonly coverage: StyleExplanationCoverage;
};
type StyleExplanationMetadata = {
  readonly $$type: typeof STYLE_EXPLANATION_METADATA_TYPE;
  readonly version: typeof STYLE_EXPLANATION_VERSION;
  readonly moduleId: string;
  readonly exports: ReadonlyArray<StyleExplanationExportMetadata>;
};
type StyleExplanationBranchDecision = {
  readonly kind: StyleExplanationBranchKind;
  readonly path: StyleExplanationPath;
  readonly identity: string;
  readonly order: number;
  readonly matched: boolean;
  readonly selected: boolean;
  readonly reason?: StyleExplanationBranchReason;
};
type StyleExplanationConditionDecision = {
  readonly path: StyleExplanationPath;
  readonly identity: string;
  readonly matcher: NativeConditionMatcher;
  readonly matchedAxes: ReadonlyArray<keyof NativeConditionSnapshot>;
  readonly specificity: number;
  readonly declarationOrder: number;
  readonly matched: boolean;
  readonly selected: boolean;
};
type StyleExplanationExpressionDecision = {
  readonly path: StyleExplanationPath;
  readonly condition: NativeConditionKey;
  readonly value: string;
  readonly selectedBranch: "case" | "fallback";
  readonly selectedCaseValue?: string;
};
type StyleExplanationPropertyExplanation = {
  readonly slot?: string;
  readonly property: string;
  readonly value: StyleExplanationValue;
  readonly winner?: StyleExplanationDeclaration;
  readonly overridden: ReadonlyArray<StyleExplanationDeclaration>;
  readonly coverage: StyleExplanationCoverage;
};
type StyleExplanationChangedInput = {
  readonly kind: "theme-token" | "theme-contract" | "selection" | "condition" | "extension";
  readonly path: StyleExplanationPath;
  readonly previous?: StyleExplanationValue;
  readonly current?: StyleExplanationValue;
};
type StyleExplanationTransitionStatus = "not-compared" | "relevant-input-change" | "no-effective-change" | "unavailable";
type StyleExplanationReport = {
  readonly $$type: typeof STYLE_EXPLANATION_REPORT_TYPE;
  readonly version: typeof STYLE_EXPLANATION_VERSION;
  readonly target: {
    readonly moduleId?: string;
    readonly exportPath: StyleExplanationPath;
  };
  readonly resolution: {
    readonly value: StyleExplanationValue;
    readonly branches: ReadonlyArray<StyleExplanationBranchDecision>;
  };
  readonly conditions: {
    readonly snapshot?: NativeConditionSnapshot;
    readonly decisions: ReadonlyArray<StyleExplanationConditionDecision>;
    readonly expressionMatches: ReadonlyArray<StyleExplanationExpressionDecision>;
  };
  readonly composition: {
    readonly properties: ReadonlyArray<StyleExplanationPropertyExplanation>;
  };
  readonly dependencies: {
    readonly declaredTokens: ReadonlyArray<string>;
    readonly activeTokens: ReadonlyArray<string>;
    readonly changedTokens: ReadonlyArray<string>;
  };
  readonly transition: {
    readonly status: StyleExplanationTransitionStatus;
    readonly changedInputs: ReadonlyArray<StyleExplanationChangedInput>;
    readonly affectedPaths: ReadonlyArray<StyleExplanationPath>;
  };
  readonly coverage: StyleExplanationCoverage;
};
//#endregion
export { StyleExplanationUndefined as A, StyleExplanationPathSegment as C, StyleExplanationThemeToken as D, StyleExplanationSnapshot as E, StyleExplanationValueArray as M, StyleExplanationValueRecord as N, StyleExplanationThemeTokenIdentity as O, StyleExplanationPath as S, StyleExplanationReport as T, StyleExplanationJsonValue as _, STYLE_EXPLANATION_VERSION as a, StyleExplanationOpaqueReason as b, StyleExplanationBranchMetadata as c, StyleExplanationConditionDecision as d, StyleExplanationCoverage as f, StyleExplanationExpressionDecision as g, StyleExplanationExportMetadata as h, STYLE_EXPLANATION_VALUE_TYPE as i, StyleExplanationValue as j, StyleExplanationTransitionStatus as k, StyleExplanationBranchReason as l, StyleExplanationDeclaration as m, STYLE_EXPLANATION_METADATA_TYPE as n, StyleExplanationBranchDecision as o, StyleExplanationCoverageReason as p, STYLE_EXPLANATION_REPORT_TYPE as r, StyleExplanationBranchKind as s, ExplainStyleInput as t, StyleExplanationChangedInput as u, StyleExplanationMetadata as v, StyleExplanationPropertyExplanation as w, StyleExplanationOpaqueValue as x, StyleExplanationNegativeZero as y };