import type { NativeConditionMatcher, NativeConditionSnapshot } from "../conditions"
import type { NativeConditionKey } from "../expressions"
import type { NativePrimitiveDomain, NativePrimitiveKind } from "../compiler/native-capture"
import type { NativeComponentRecipeExtensionDescriptor } from "../components/extension-contract"
import type { NativeTheme } from "../native-style"
import type { TokenContractIdentity } from "../tokens/identity"

export const STYLE_EXPLANATION_METADATA_TYPE = "crumbs.css.style-explanation-metadata" as const
export const STYLE_EXPLANATION_REPORT_TYPE = "crumbs.css.style-explanation" as const
export const STYLE_EXPLANATION_VALUE_TYPE = "crumbs.css.style-explanation-value" as const
export const STYLE_EXPLANATION_VERSION = 1 as const

export type StyleExplanationPathSegment = string | number
export type StyleExplanationPath = ReadonlyArray<StyleExplanationPathSegment>

/** Explicit inputs used for one on-demand style explanation. */
export type StyleExplanationSnapshot = {
  readonly theme?: NativeTheme<Record<string, unknown>>
  readonly selection?: Readonly<Record<string, unknown>>
  readonly conditions?: NativeConditionSnapshot
  readonly extensions?: ReadonlyArray<NativeComponentRecipeExtensionDescriptor>
}

export type ExplainStyleInput = {
  readonly module: Readonly<Record<string, unknown>>
  readonly exportPath: StyleExplanationPath
  readonly current: StyleExplanationSnapshot
  readonly previous?: StyleExplanationSnapshot
}

export type StyleExplanationOpaqueReason =
  | "accessor"
  | "cycle"
  | "depth-limit"
  | "function"
  | "symbol"
  | "bigint"
  | "non-finite-number"
  | "unsupported-object"

export type StyleExplanationThemeTokenIdentity = {
  readonly varName: string
  readonly contract?: TokenContractIdentity
}

export type StyleExplanationNegativeZero = {
  readonly $$type: typeof STYLE_EXPLANATION_VALUE_TYPE
  readonly version: typeof STYLE_EXPLANATION_VERSION
  readonly kind: "negative-zero"
}

export type StyleExplanationUndefined = {
  readonly $$type: typeof STYLE_EXPLANATION_VALUE_TYPE
  readonly version: typeof STYLE_EXPLANATION_VERSION
  readonly kind: "undefined"
}

export type StyleExplanationThemeToken = {
  readonly $$type: typeof STYLE_EXPLANATION_VALUE_TYPE
  readonly version: typeof STYLE_EXPLANATION_VERSION
  readonly kind: "theme-token"
  readonly identity: StyleExplanationThemeTokenIdentity
  readonly resolvedValue: StyleExplanationValue
}

export type StyleExplanationOpaqueValue = {
  readonly $$type: typeof STYLE_EXPLANATION_VALUE_TYPE
  readonly version: typeof STYLE_EXPLANATION_VERSION
  readonly kind: "opaque"
  readonly reason: StyleExplanationOpaqueReason
}

export interface StyleExplanationValueArray extends ReadonlyArray<StyleExplanationValue> {}
export interface StyleExplanationValueRecord {
  readonly [key: string]: StyleExplanationValue
}

export type StyleExplanationJsonValue = null | boolean | number | string
  | StyleExplanationValueArray
  | StyleExplanationValueRecord

export type StyleExplanationValue = StyleExplanationJsonValue
  | StyleExplanationNegativeZero
  | StyleExplanationUndefined
  | StyleExplanationThemeToken
  | StyleExplanationOpaqueValue

export type StyleExplanationCoverageReason =
  | "metadata-missing"
  | "compatibility-only"
  | "opaque-value"
  | "dependency-metadata-missing"

export type StyleExplanationCoverage = {
  readonly status: "complete" | "partial" | "unavailable"
  readonly reasons: ReadonlyArray<StyleExplanationCoverageReason>
}

export type StyleExplanationDeclaration = {
  readonly id: string
  readonly sourceId: string
  readonly packageOwner: string
  readonly logicalPath: StyleExplanationPath
  readonly authoredProperty: string
  readonly canonicalProperty: string
  readonly shorthandExpansionPath: ReadonlyArray<string>
  readonly primitiveDomain: NativePrimitiveDomain
  readonly order: number
  readonly value: StyleExplanationValue
}

export type StyleExplanationBranchKind =
  | "recipe"
  | "component-recipe"
  | "extension"
  | "sprinkles"
  | "condition"
  | "expression"

export type StyleExplanationBranchReason =
  | "selection-mismatch"
  | "compound-mismatch"
  | "state-rejected"
  | "condition-unmatched"
  | "not-selected"
  | "superseded"

export type StyleExplanationBranchMetadata = {
  readonly kind: StyleExplanationBranchKind
  readonly path: StyleExplanationPath
  readonly identity: string
  readonly order: number
  readonly selector: Readonly<Record<string, StyleExplanationValue>>
  readonly sourceId?: string
}

export type StyleExplanationExportMetadata = {
  readonly path: StyleExplanationPath
  readonly candidates: ReadonlyArray<StyleExplanationDeclaration>
  readonly branches: ReadonlyArray<StyleExplanationBranchMetadata>
  readonly tokenDependencies: ReadonlyArray<string>
  readonly coverage: StyleExplanationCoverage
}

export type StyleExplanationMetadata = {
  readonly $$type: typeof STYLE_EXPLANATION_METADATA_TYPE
  readonly version: typeof STYLE_EXPLANATION_VERSION
  readonly moduleId: string
  readonly exports: ReadonlyArray<StyleExplanationExportMetadata>
}

export type StyleExplanationBranchDecision = {
  readonly kind: StyleExplanationBranchKind
  readonly path: StyleExplanationPath
  readonly identity: string
  readonly order: number
  readonly matched: boolean
  readonly selected: boolean
  readonly reason?: StyleExplanationBranchReason
}

export type StyleExplanationConditionDecision = {
  readonly path: StyleExplanationPath
  readonly identity: string
  readonly matcher: NativeConditionMatcher
  readonly matchedAxes: ReadonlyArray<keyof NativeConditionSnapshot>
  readonly specificity: number
  readonly declarationOrder: number
  readonly matched: boolean
  readonly selected: boolean
}

export type StyleExplanationExpressionDecision = {
  readonly path: StyleExplanationPath
  readonly condition: NativeConditionKey
  readonly value: string
  readonly selectedBranch: "case" | "fallback"
  readonly selectedCaseValue?: string
}

export type StyleExplanationPropertyExplanation = {
  readonly slot?: string
  readonly property: string
  readonly value: StyleExplanationValue
  readonly winner?: StyleExplanationDeclaration
  readonly overridden: ReadonlyArray<StyleExplanationDeclaration>
  readonly coverage: StyleExplanationCoverage
}

export type StyleExplanationChangedInput = {
  readonly kind: "theme-token" | "theme-contract" | "selection" | "condition" | "extension"
  readonly path: StyleExplanationPath
  readonly previous?: StyleExplanationValue
  readonly current?: StyleExplanationValue
}

export type StyleExplanationTransitionStatus =
  | "not-compared"
  | "relevant-input-change"
  | "no-effective-change"
  | "unavailable"

export type StyleExplanationReport = {
  readonly $$type: typeof STYLE_EXPLANATION_REPORT_TYPE
  readonly version: typeof STYLE_EXPLANATION_VERSION
  readonly target: {
    readonly moduleId?: string
    readonly exportPath: StyleExplanationPath
  }
  readonly resolution: {
    readonly value: StyleExplanationValue
    readonly branches: ReadonlyArray<StyleExplanationBranchDecision>
  }
  readonly conditions: {
    readonly snapshot?: NativeConditionSnapshot
    readonly decisions: ReadonlyArray<StyleExplanationConditionDecision>
    readonly expressionMatches: ReadonlyArray<StyleExplanationExpressionDecision>
  }
  readonly composition: {
    readonly properties: ReadonlyArray<StyleExplanationPropertyExplanation>
  }
  readonly dependencies: {
    readonly declaredTokens: ReadonlyArray<string>
    readonly activeTokens: ReadonlyArray<string>
    readonly changedTokens: ReadonlyArray<string>
  }
  readonly transition: {
    readonly status: StyleExplanationTransitionStatus
    readonly changedInputs: ReadonlyArray<StyleExplanationChangedInput>
    readonly affectedPaths: ReadonlyArray<StyleExplanationPath>
  }
  readonly coverage: StyleExplanationCoverage
}

export type { NativePrimitiveDomain, NativePrimitiveKind }
