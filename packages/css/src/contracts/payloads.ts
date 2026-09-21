import * as Schema from "effect/Schema"
import { NativeStylesDiagnosticCode } from "../diagnostics"
import { NativeThemeTokenReferenceType } from "../theme-token"
import { makeDataCodec, type DataCodec } from "./data-codec"
import type { TokenContractIdentity } from "../tokens/identity"

// ADR D1-D3 / M1.2: internal shape contracts; not the published compiler ABI.
const JsonNumber = Schema.Finite.check(Schema.makeFilter<number>(value => Object.is(value, -0)
  ? { path: [], issue: "Signed zero cannot round trip through this JSON number domain" } : undefined))
const SafeInteger = JsonNumber.check(Schema.makeFilter<number>(value => Number.isSafeInteger(value)))
const PositiveInteger = SafeInteger.check(Schema.isGreaterThan(0))
const Index = SafeInteger.check(Schema.isGreaterThanOrEqualTo(0))
const Identifier = Schema.NonEmptyString.check(Schema.isPattern(/^[A-Za-z][A-Za-z0-9._-]*$/))
const PackageName = Schema.String.check(Schema.isPattern(/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/))
const TokenName = Schema.String.check(Schema.isPattern(/^--crumbs-[A-Za-z0-9_-]+$/))
export const ContractIdentitySchema = Schema.Struct({ owner: PackageName, name: Identifier, version: PositiveInteger })
export type ContractIdentity = TokenContractIdentity
export const LegacyThemeTokenReferenceSchema = Schema.Struct({ $$type: Schema.Literal(NativeThemeTokenReferenceType), varName: TokenName })
export const ThemeTokenReferenceSchema = Schema.Struct({ _tag: Schema.Literal("ThemeTokenReference"), contract: ContractIdentitySchema, varName: TokenName })
export type ThemeTokenReference = typeof ThemeTokenReferenceSchema.Type
export const SourceSchema = Schema.Struct({
  file: Schema.NonEmptyString, exportName: Schema.NonEmptyString,
  path: Schema.Array(Schema.Union([Schema.NonEmptyString, Index])),
  line: Schema.optionalKey(PositiveInteger), column: Schema.optionalKey(PositiveInteger),
})
const numericString = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)"
const FiniteNumericText = Schema.makeFilter<string>(value => Number.isFinite(Number.parseFloat(value)))
const Angle = Schema.String.check(Schema.isPattern(new RegExp(`^${numericString}(?:deg|rad)$`)), FiniteNumericText)
const Percentage = Schema.String.check(Schema.isPattern(new RegExp(`^${numericString}%$`)), FiniteNumericText)
const Translation = Schema.Union([JsonNumber, Percentage])
const Matrix = Schema.Array(JsonNumber).check(Schema.isMinLength(16), Schema.isMaxLength(16))
const TransformEntry = Schema.Union([
  Schema.Struct({ perspective: JsonNumber }), Schema.Struct({ rotate: Angle }),
  Schema.Struct({ rotateX: Angle }), Schema.Struct({ rotateY: Angle }), Schema.Struct({ rotateZ: Angle }),
  Schema.Struct({ scale: JsonNumber }), Schema.Struct({ scaleX: JsonNumber }), Schema.Struct({ scaleY: JsonNumber }),
  Schema.Struct({ translateX: Translation }), Schema.Struct({ translateY: Translation }),
  Schema.Struct({ skewX: Angle }), Schema.Struct({ skewY: Angle }), Schema.Struct({ matrix: Matrix }),
])
const declarationTag = Schema.Literal("NativeDeclaration")
const ScalarProperty = Schema.String.check(Schema.isPattern(/^[A-Za-z][A-Za-z0-9]*$/),
  Schema.makeFilter<string>(value => value !== "transform" && value !== "shadowOffset"))
export const NativeDeclarationSchema = Schema.Union([
  Schema.Struct({ _tag: declarationTag, property: ScalarProperty, value: Schema.Union([Schema.String, JsonNumber, Schema.Boolean, ThemeTokenReferenceSchema]), source: SourceSchema }),
  Schema.Struct({ _tag: declarationTag, property: Schema.Literal("transform"), value: Schema.Array(TransformEntry), source: SourceSchema }),
  Schema.Struct({ _tag: declarationTag, property: Schema.Literal("shadowOffset"), value: Schema.Struct({ width: JsonNumber, height: JsonNumber }), source: SourceSchema }),
])
export type NativeDeclaration = typeof NativeDeclarationSchema.Type
export const StructuredDiagnosticSchema = Schema.Struct({
  _tag: Schema.Literal("Diagnostic"), code: Schema.Literals(Object.values(NativeStylesDiagnosticCode)),
  severity: Schema.Literals(["error", "warning"]), message: Schema.NonEmptyString, source: Schema.optionalKey(SourceSchema),
})
export type StructuredDiagnostic = typeof StructuredDiagnosticSchema.Type
export const NativeArtifactVersion = 1 as const
export const NativeArtifactSchema = Schema.Struct({
  _tag: Schema.Literal("NativeArtifact"), version: Schema.Literal(NativeArtifactVersion),
  contract: ContractIdentitySchema, declarations: Schema.Array(NativeDeclarationSchema),
}).check(Schema.makeFilter(artifact => artifact.declarations.flatMap((declaration, index) => {
  const value = declaration.value
  if (typeof value !== "object" || value === null || !("_tag" in value)) return []
  const expected = artifact.contract, actual = value.contract
  return expected.owner === actual.owner && expected.name === actual.name && expected.version === actual.version ? []
    : [{ path: ["declarations", index, "value", "contract"], issue: "Token reference contract does not match artifact contract" }]
})))
export type NativeArtifact = typeof NativeArtifactSchema.Type
export const ExternalTokenThemeVersion = 1 as const
export const ExternalTokenThemeSchema = Schema.Struct({
  _tag: Schema.Literal("CrumbsTokenTheme"),
  version: Schema.Literal(ExternalTokenThemeVersion),
  contract: ContractIdentitySchema,
  values: Schema.Record(Schema.String, Schema.Union([Schema.String, JsonNumber])),
})
export type ExternalTokenTheme = {
  readonly _tag: "CrumbsTokenTheme"
  readonly version: typeof ExternalTokenThemeVersion
  readonly contract: ContractIdentity
  readonly values: Readonly<Record<string, string | number>>
}
export const contractIdentityCodec = makeDataCodec("contract-identity", ContractIdentitySchema)
export const legacyThemeTokenReferenceCodec = makeDataCodec("legacy-theme-token-reference", LegacyThemeTokenReferenceSchema)
export const themeTokenReferenceCodec = makeDataCodec("theme-token-reference", ThemeTokenReferenceSchema)
export const nativeDeclarationCodec = makeDataCodec("native-declaration", NativeDeclarationSchema)
export const structuredDiagnosticCodec = makeDataCodec("structured-diagnostic", StructuredDiagnosticSchema)
export const nativeArtifactCodec = makeDataCodec("native-artifact", NativeArtifactSchema)
export const externalTokenThemeCodec: DataCodec<ExternalTokenTheme> = makeDataCodec("external-token-theme", ExternalTokenThemeSchema)
