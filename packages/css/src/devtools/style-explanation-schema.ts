import * as Schema from "effect/Schema"
import { makeDataCodec } from "../contracts/data-codec"
import type {
  StyleExplanationCoverage,
  StyleExplanationMetadata,
  StyleExplanationReport,
  StyleExplanationValue,
} from "./style-explanation-model"
import {
  STYLE_EXPLANATION_METADATA_TYPE,
  STYLE_EXPLANATION_REPORT_TYPE,
  STYLE_EXPLANATION_VALUE_TYPE,
  STYLE_EXPLANATION_VERSION,
} from "./style-explanation-model"

const SafeText = Schema.NonEmptyString.check(Schema.makeFilter<string>(value =>
  value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value)))
const Index = Schema.Finite.check(Schema.makeFilter<number>(value => Number.isSafeInteger(value) && value >= 0))
const PathSegment = Schema.Union([SafeText, Index])
const Path = Schema.Array(PathSegment)
const PropertyName = Schema.String.check(Schema.isPattern(/^[A-Za-z][A-Za-z0-9_]*$/))
const TokenName = Schema.String.check(Schema.isPattern(/^--crumbs-[A-Za-z0-9_-]+$/))
const PackageName = Schema.String.check(Schema.isPattern(/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/))
const RelativeIdentity = SafeText.check(Schema.makeFilter<string>(value => {
  if (value.startsWith("/") || value.includes("\\") || /^[A-Za-z]:/u.test(value) || /^file:/iu.test(value)) return false
  return !value.split("/").some(segment => segment === "" || segment === "." || segment === "..")
}))
const IdentityText = SafeText
const JsonNumber = Schema.Finite.check(Schema.makeFilter<number>(value => !Object.is(value, -0)))

const NativePrimitiveKind = Schema.Literals(["view", "text", "image"])
const PrimitiveDomain = Schema.Array(NativePrimitiveKind).check(
  Schema.isMinLength(1),
  Schema.makeFilter<ReadonlyArray<"view" | "text" | "image">>(domain => new Set(domain).size === domain.length),
)
const ContractIdentity = Schema.Struct({ owner: PackageName, name: IdentityText, version: Index.check(Schema.isGreaterThan(0)) })
const ValueNodeBase = {
  $$type: Schema.Literal(STYLE_EXPLANATION_VALUE_TYPE),
  version: Schema.Literal(STYLE_EXPLANATION_VERSION),
}

const NegativeZeroValue = Schema.Struct({ ...ValueNodeBase, kind: Schema.Literal("negative-zero") })
const UndefinedValue = Schema.Struct({ ...ValueNodeBase, kind: Schema.Literal("undefined") })
const OpaqueValue = Schema.Struct({
  ...ValueNodeBase,
  kind: Schema.Literal("opaque"),
  reason: Schema.Literals([
    "accessor", "cycle", "depth-limit", "function", "symbol", "bigint",
    "non-finite-number", "unsupported-object",
  ]),
})
const ThemeTokenIdentity = Schema.Struct({
  varName: TokenName,
  contract: Schema.optionalKey(ContractIdentity),
})

function isReservedValueTag(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getOwnPropertyDescriptor(value, "$$type")?.value === STYLE_EXPLANATION_VALUE_TYPE
}

// The outer makeDataCodec first makes a detached, getter-free data copy. The
// recursive codec can therefore safely validate nested records and arrays.
const StyleExplanationValueSchema: Schema.ConstraintCodec<StyleExplanationValue, StyleExplanationValue, never, never> =
  Schema.suspend(() => Schema.Union([
    Schema.Null,
    Schema.Boolean,
    Schema.String,
    JsonNumber,
    Schema.Array(StyleExplanationValueSchema),
    Schema.Record(Schema.String, StyleExplanationValueSchema).check(
      Schema.makeFilter<Readonly<Record<string, StyleExplanationValue>>>(record => !isReservedValueTag(record)),
    ),
    NegativeZeroValue,
    UndefinedValue,
    OpaqueValue,
    Schema.Struct({
      ...ValueNodeBase,
      kind: Schema.Literal("theme-token"),
      identity: ThemeTokenIdentity,
      resolvedValue: StyleExplanationValueSchema,
    }),
  ]))

const CoverageReason = Schema.Literals([
  "metadata-missing", "compatibility-only", "opaque-value", "dependency-metadata-missing",
])
const Coverage: Schema.ConstraintCodec<StyleExplanationCoverage, StyleExplanationCoverage, never, never> =
  Schema.Struct({
    status: Schema.Literals(["complete", "partial", "unavailable"]),
    reasons: Schema.Array(CoverageReason),
  }).check(Schema.makeFilter<StyleExplanationCoverage>(coverage => {
    const unique = new Set(coverage.reasons)
    if (unique.size !== coverage.reasons.length) return false
    return coverage.status === "complete" ? coverage.reasons.length === 0 : coverage.reasons.length > 0
  }))

const Declaration = Schema.Struct({
  id: IdentityText,
  sourceId: RelativeIdentity,
  packageOwner: PackageName,
  logicalPath: Path,
  authoredProperty: PropertyName,
  canonicalProperty: PropertyName,
  shorthandExpansionPath: Schema.Array(PropertyName),
  primitiveDomain: PrimitiveDomain,
  order: Index,
  value: StyleExplanationValueSchema,
})
const BranchKind = Schema.Literals(["recipe", "component-recipe", "extension", "sprinkles", "condition", "expression"])
const BranchMetadata = Schema.Struct({
  kind: BranchKind,
  path: Path,
  identity: IdentityText,
  order: Index,
  selector: Schema.Record(Schema.String, StyleExplanationValueSchema),
  sourceId: Schema.optionalKey(RelativeIdentity),
})
const ExportMetadata = Schema.Struct({
  path: Path,
  candidates: Schema.Array(Declaration),
  branches: Schema.Array(BranchMetadata),
  tokenDependencies: Schema.Array(TokenName),
  coverage: Coverage,
})
const MetadataSchema = Schema.Struct({
  $$type: Schema.Literal(STYLE_EXPLANATION_METADATA_TYPE),
  version: Schema.Literal(STYLE_EXPLANATION_VERSION),
  moduleId: RelativeIdentity,
  exports: Schema.Array(ExportMetadata),
})

const NativeConditionSnapshot = Schema.Struct({
  platform: Schema.Literals(["android", "ios", "macos", "visionos", "web", "windows", "unknown"]),
  widthBucket: Schema.Literals(["compact", "medium", "expanded"]),
  heightBucket: Schema.Literals(["short", "regular", "tall"]),
  orientation: Schema.Literals(["portrait", "landscape"]),
  direction: Schema.Literals(["ltr", "rtl"]),
  fontScaleBucket: Schema.Literals(["normal", "large", "extraLarge"]),
  motion: Schema.Literals(["full", "reduced"]),
  contrast: Schema.Literals(["normal", "more", "less"]),
})
const NativeConditionMatcher = Schema.Struct({
  platform: Schema.optionalKey(Schema.Literals(["android", "ios", "macos", "visionos", "web", "windows", "unknown"])),
  widthBucket: Schema.optionalKey(Schema.Literals(["compact", "medium", "expanded"])),
  heightBucket: Schema.optionalKey(Schema.Literals(["short", "regular", "tall"])),
  orientation: Schema.optionalKey(Schema.Literals(["portrait", "landscape"])),
  direction: Schema.optionalKey(Schema.Literals(["ltr", "rtl"])),
  fontScaleBucket: Schema.optionalKey(Schema.Literals(["normal", "large", "extraLarge"])),
  motion: Schema.optionalKey(Schema.Literals(["full", "reduced"])),
  contrast: Schema.optionalKey(Schema.Literals(["normal", "more", "less"])),
})
const NativeConditionKey = Schema.Literals([
  "platform", "widthBucket", "heightBucket", "orientation", "direction", "fontScaleBucket", "motion", "contrast",
])
const CoverageReport = Coverage
const BranchDecision = Schema.Struct({
  kind: BranchKind,
  path: Path,
  identity: IdentityText,
  order: Index,
  matched: Schema.Boolean,
  selected: Schema.Boolean,
  reason: Schema.optionalKey(Schema.Literals([
    "selection-mismatch", "compound-mismatch", "state-rejected", "condition-unmatched", "not-selected", "superseded",
  ])),
})
const ConditionDecision = Schema.Struct({
  path: Path,
  identity: IdentityText,
  matcher: NativeConditionMatcher,
  matchedAxes: Schema.Array(NativeConditionKey),
  specificity: Index,
  declarationOrder: Index,
  matched: Schema.Boolean,
  selected: Schema.Boolean,
})
const ExpressionDecision = Schema.Struct({
  path: Path,
  condition: NativeConditionKey,
  value: SafeText,
  selectedBranch: Schema.Literals(["case", "fallback"]),
  selectedCaseValue: Schema.optionalKey(SafeText),
})
const PropertyExplanation = Schema.Struct({
  property: PropertyName,
  value: StyleExplanationValueSchema,
  winner: Schema.optionalKey(Declaration),
  overridden: Schema.Array(Declaration),
  coverage: CoverageReport,
})
const ChangedInput = Schema.Struct({
  kind: Schema.Literals(["theme-token", "theme-contract", "selection", "condition", "extension"]),
  path: Path,
  previous: Schema.optionalKey(StyleExplanationValueSchema),
  current: Schema.optionalKey(StyleExplanationValueSchema),
})
const Transition = Schema.Struct({
  status: Schema.Literals(["not-compared", "relevant-input-change", "no-effective-change", "unavailable"]),
  changedInputs: Schema.Array(ChangedInput),
  affectedPaths: Schema.Array(Path),
}).check(Schema.makeFilter(value =>
  (value.status !== "not-compared" && value.status !== "unavailable") ||
  (value.changedInputs.length === 0 && value.affectedPaths.length === 0)))
const ReportSchema = Schema.Struct({
  $$type: Schema.Literal(STYLE_EXPLANATION_REPORT_TYPE),
  version: Schema.Literal(STYLE_EXPLANATION_VERSION),
  target: Schema.Struct({ moduleId: Schema.optionalKey(RelativeIdentity), exportPath: Path }),
  resolution: Schema.Struct({
    value: StyleExplanationValueSchema,
    branches: Schema.Array(BranchDecision),
  }),
  conditions: Schema.Struct({
    snapshot: Schema.optionalKey(NativeConditionSnapshot),
    decisions: Schema.Array(ConditionDecision),
    expressionMatches: Schema.Array(ExpressionDecision),
  }),
  composition: Schema.Struct({ properties: Schema.Array(PropertyExplanation) }),
  dependencies: Schema.Struct({
    declaredTokens: Schema.Array(TokenName),
    activeTokens: Schema.Array(TokenName),
    changedTokens: Schema.Array(TokenName),
  }),
  transition: Transition,
  coverage: CoverageReport,
})

const metadataCodec = makeDataCodec("style-explanation-metadata-v1", MetadataSchema)
const reportCodec = makeDataCodec("style-explanation-report-v1", ReportSchema)

function decodeError(label: string, issues: ReadonlyArray<{ readonly path: ReadonlyArray<string | number>; readonly message: string }>): TypeError {
  const detail = issues.map(issue => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
    return `${path}: ${issue.message}`
  }).join("; ")
  return new TypeError(`Invalid ${label}: ${detail}`)
}

export function decodeStyleExplanationMetadata(input: unknown): StyleExplanationMetadata {
  const decoded = metadataCodec.decode(input)
  if (!decoded.ok) throw decodeError("Crumbs style explanation metadata v1", decoded.issues)
  const exportPaths = decoded.value.exports.map(entry => JSON.stringify(entry.path))
  if (new Set(exportPaths).size !== exportPaths.length) {
    throw new TypeError("Invalid Crumbs style explanation metadata v1: duplicate export path")
  }
  return decoded.value as StyleExplanationMetadata
}

export function decodeStyleExplanationReport(input: unknown): StyleExplanationReport {
  const decoded = reportCodec.decode(input)
  if (!decoded.ok) throw decodeError("Crumbs style explanation report v1", decoded.issues)
  return decoded.value as StyleExplanationReport
}
