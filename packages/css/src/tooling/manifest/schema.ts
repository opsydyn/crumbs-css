import * as Schema from "effect/Schema"
import { makeDataCodec } from "../../contracts/data-codec"
import {
  DESIGN_SYSTEM_MANIFEST_FORMAT,
  DESIGN_SYSTEM_MANIFEST_VERSION,
  type DesignSystemManifest,
} from "./model"

const IdentifierText = Schema.NonEmptyString.check(Schema.makeFilter<string>(value =>
  value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value)))
const PackageName = Schema.String.check(Schema.isPattern(/^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/))
const SemVer = Schema.String.check(Schema.isPattern(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/))
const PositiveSafeInteger = Schema.Finite.check(
  Schema.makeFilter<number>(value => Number.isSafeInteger(value) && value > 0),
)
const JsonNumber = Schema.Finite.check(Schema.makeFilter<number>(value => !Object.is(value, -0)))
const JsonScalar = Schema.Union([Schema.String, JsonNumber, Schema.Boolean])
const NonEmptyTextArray = Schema.Array(IdentifierText).check(Schema.isMinLength(1))
const SetTextArray = Schema.Array(IdentifierText)
const PackageRelativePath = Schema.String.check(Schema.makeFilter<string>(value => {
  if (value.length === 0 || value.startsWith("/") || value.includes("\\") || /^[A-Za-z]:/u.test(value)) return false
  return value.split("/").every(segment => segment.length > 0 && segment !== "." && segment !== "..")
}))

const PackageSchema = Schema.Struct({ name: PackageName, version: SemVer })
const CompilerSchema = Schema.Struct({ name: PackageName, version: SemVer })
const ArtifactSchema = Schema.Struct({ name: IdentifierText, version: PositiveSafeInteger })
const ContractIdentitySchema = Schema.Struct({
  owner: PackageName,
  name: Schema.String.check(Schema.isPattern(/^[A-Za-z][A-Za-z0-9._-]*$/)),
  version: PositiveSafeInteger,
})
const SourceOriginSchema = Schema.Struct({
  path: PackageRelativePath,
  exportPath: Schema.optionalKey(IdentifierText),
})
const LifecycleSchema = Schema.Struct({
  deprecatedSince: IdentifierText,
  reason: Schema.optionalKey(IdentifierText),
  replacement: Schema.optionalKey(Schema.Struct({
    id: IdentifierText,
    resolution: Schema.Literals(["declared", "external"]),
  })),
})
const TokenDomainSchema = Schema.Union([
  Schema.Struct({ kind: Schema.Literal("color") }),
  Schema.Struct({ kind: Schema.Literal("length"), allowNegative: Schema.Boolean }),
  Schema.Struct({ kind: Schema.Literal("duration") }),
  Schema.Struct({ kind: Schema.Literal("opacity") }),
  Schema.Struct({ kind: Schema.Literal("enum"), values: NonEmptyTextArray }),
])
const TokenAliasSchema = Schema.Struct({
  targetId: Schema.optionalKey(IdentifierText),
  targetPath: NonEmptyTextArray,
  resolution: Schema.Literals(["internal", "external", "unresolved"]),
  fallback: Schema.optionalKey(Schema.Union([Schema.String, JsonNumber])),
})
const TokenSchema = Schema.Struct({
  id: IdentifierText,
  contract: ContractIdentitySchema,
  path: NonEmptyTextArray,
  visibility: Schema.Literals(["public", "private"]),
  domain: TokenDomainSchema,
  kind: Schema.Literals(["definition", "alias"]),
  alias: Schema.optionalKey(TokenAliasSchema),
  origin: SourceOriginSchema,
  lifecycle: Schema.optionalKey(LifecycleSchema),
}).check(Schema.makeFilter(token => token.kind === "alias"
  ? token.alias !== undefined
  : token.alias === undefined))
const StringSetRecordSchema = Schema.Record(IdentifierText, SetTextArray)
const ComponentSchema = Schema.Struct({
  id: IdentifierText,
  contract: ContractIdentitySchema,
  origin: SourceOriginSchema,
  slots: SetTextArray,
  variants: StringSetRecordSchema,
  extensionPoints: SetTextArray,
  stateConstraints: StringSetRecordSchema,
  defaults: Schema.Record(IdentifierText, JsonScalar),
  lifecycle: Schema.optionalKey(LifecycleSchema),
})
const ModuleSchema = Schema.Struct({
  id: IdentifierText,
  origin: SourceOriginSchema,
  exports: SetTextArray,
})
const DependencyOriginSchema = Schema.Struct({
  moduleId: IdentifierText,
  exportPath: IdentifierText,
  property: Schema.optionalKey(IdentifierText),
})
const DependencySchema = Schema.Struct({
  from: IdentifierText,
  to: Schema.optionalKey(IdentifierText),
  kind: Schema.Literals(["token-alias", "style-token"]),
  resolution: Schema.Literals(["internal", "external", "unresolved"]),
  origin: Schema.optionalKey(DependencyOriginSchema),
})
const CapabilitySchema = Schema.Struct({
  moduleId: IdentifierText,
  exportPath: IdentifierText,
  property: IdentifierText,
  primitive: IdentifierText,
  evidence: Schema.Literal("compiler-observed"),
})
const CoverageRootSchema = Schema.Struct({
  kind: Schema.Literals(["token-contract", "component-recipe", "style-module"]),
  id: IdentifierText,
})
const UnresolvedReferenceSchema = Schema.Struct({
  reference: IdentifierText,
  reason: Schema.optionalKey(IdentifierText),
  origin: Schema.optionalKey(DependencyOriginSchema),
})

/** Effect Schema stays in this tooling-only implementation module. */
export const designSystemManifestSchema = Schema.Struct({
  format: Schema.Literal(DESIGN_SYSTEM_MANIFEST_FORMAT),
  schemaVersion: Schema.Literal(DESIGN_SYSTEM_MANIFEST_VERSION),
  package: PackageSchema,
  producer: Schema.Struct({ compiler: CompilerSchema, artifact: ArtifactSchema }),
  tokens: Schema.Array(TokenSchema),
  components: Schema.Array(ComponentSchema),
  modules: Schema.Array(ModuleSchema),
  dependencies: Schema.Array(DependencySchema),
  capabilities: Schema.Array(CapabilitySchema),
  coverage: Schema.Struct({
    roots: Schema.Array(CoverageRootSchema),
    unresolved: Schema.Array(UnresolvedReferenceSchema),
  }),
})

const manifestDataCodec = makeDataCodec("design-system-manifest-v1", designSystemManifestSchema)

/** Validate unknown input and return an ordinary, detached JSON-data record. */
export function decodeManifest(input: unknown): DesignSystemManifest {
  const result = manifestDataCodec.decode(input)
  if (result.ok) return result.value as DesignSystemManifest
  const detail = result.issues.map(issue => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
    return `${path}: ${issue.message}`
  }).join("; ")
  throw new TypeError(`Invalid Crumbs design-system manifest v1: ${detail}`)
}
