import * as Schema from "effect/Schema"
import { makeDataCodec } from "../../contracts/data-codec"
import {
  DESIGN_SYSTEM_MANIFEST_FORMAT,
  DESIGN_SYSTEM_MANIFEST_VERSION,
  type DesignSystemManifest,
  type ManifestContractIdentity,
  type ManifestLifecycleAnnotation,
  type ManifestSourceOrigin,
  type ManifestUnresolvedReference,
} from "./model"
import type { DataCodec } from "../../contracts/data-codec"

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
const ReplacementSchema = Schema.Struct({
  id: IdentifierText,
  resolution: Schema.Literals(["declared", "external"]),
})
const LifecycleFields = {
  deprecatedSince: SemVer,
  reason: Schema.optionalKey(IdentifierText),
  replacement: Schema.optionalKey(ReplacementSchema),
}
const LifecycleSchema = Schema.Struct(LifecycleFields)
const LifecycleAnnotationSchema = Schema.Struct({ entityId: IdentifierText, ...LifecycleFields })
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
const StateConstraintSchema = Schema.Struct({
  discriminator: IdentifierText,
  case: IdentifierText,
  axes: Schema.Record(IdentifierText, Schema.Array(Schema.Union([Schema.String, Schema.Boolean]))),
})
const ComponentSchema = Schema.Struct({
  id: IdentifierText,
  contract: ContractIdentitySchema,
  origin: SourceOriginSchema,
  slots: SetTextArray,
  variants: StringSetRecordSchema,
  extensionPoints: SetTextArray,
  stateConstraints: Schema.Array(StateConstraintSchema),
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
const contractIdentityCodec = makeDataCodec("manifest-contract-identity", ContractIdentitySchema)
const sourceOriginCodec = makeDataCodec("manifest-source-origin", SourceOriginSchema)
const lifecycleAnnotationCodec = makeDataCodec("manifest-lifecycle-annotation", LifecycleAnnotationSchema)
const unresolvedReferenceCodec = makeDataCodec("manifest-unresolved-reference", UnresolvedReferenceSchema)

function decodeToolingInput<T>(codec: DataCodec<T>, input: unknown, boundary: string): T {
  const result = codec.decode(input)
  if (result.ok) return result.value
  const detail = result.issues.map(issue => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
    return `${path}: ${issue.message}`
  }).join("; ")
  throw new TypeError(`Invalid ${boundary}: ${detail}`)
}

/** Validate unknown input and return an ordinary, detached JSON-data record. */
export function decodeManifest(input: unknown): DesignSystemManifest {
  const manifest = decodeToolingInput(manifestDataCodec, input, "Crumbs design-system manifest v1") as DesignSystemManifest
  validateManifestGraph(manifest)
  return manifest
}

/** Validate cross-record links that cannot be expressed by the structural Schema alone. */
function validateManifestGraph(manifest: DesignSystemManifest): void {
  const tokenById = new Map<string, DesignSystemManifest["tokens"][number]>()
  const moduleById = new Map<string, DesignSystemManifest["modules"][number]>()
  const entityIds = new Set<string>()
  const componentIds = new Set<string>()
  const addEntity = (id: string, kind: string): void => {
    if (entityIds.has(id)) throw new TypeError(`Duplicate or conflicting manifest ${kind} identity ${JSON.stringify(id)}.`)
    entityIds.add(id)
  }

  for (const token of manifest.tokens) {
    addEntity(token.id, "token")
    tokenById.set(token.id, token)
  }
  for (const component of manifest.components) {
    addEntity(component.id, "component")
    componentIds.add(component.id)
  }
  for (const module of manifest.modules) {
    addEntity(module.id, "style module")
    const expectedId = `${manifest.package.name}#${module.origin.path}`
    if (module.id !== expectedId) {
      throw new TypeError(`Style module identity ${JSON.stringify(module.id)} must match package-relative origin ${JSON.stringify(expectedId)}.`)
    }
    moduleById.set(module.id, module)
  }

  const coverageRootById = new Map<string, DesignSystemManifest["coverage"]["roots"][number]["kind"]>()
  for (const root of manifest.coverage.roots) {
    if (coverageRootById.has(root.id)) {
      throw new TypeError(`Duplicate manifest coverage root ${JSON.stringify(root.id)}.`)
    }
    if (root.kind === "component-recipe" && !componentIds.has(root.id)) {
      throw new TypeError(`Component-recipe coverage root ${JSON.stringify(root.id)} has no declared component.`)
    }
    if (root.kind === "style-module" && !moduleById.has(root.id)) {
      throw new TypeError(`Style-module coverage root ${JSON.stringify(root.id)} has no declared module.`)
    }
    if (root.kind === "token-contract") assertTokenContractCoverageRootId(root.id)
    // A token-contract root can represent an explicitly selected empty contract;
    // v1 has no separate contract table from which to resolve that identity.
    coverageRootById.set(root.id, root.kind)
  }
  for (const token of manifest.tokens) {
    const rootId = `${token.contract.owner}#${token.contract.name}@${token.contract.version}`
    if (coverageRootById.get(rootId) !== "token-contract") {
      throw new TypeError(`Token ${JSON.stringify(token.id)} is missing its token-contract coverage root ${JSON.stringify(rootId)}.`)
    }
  }
  for (const component of manifest.components) {
    if (coverageRootById.get(component.id) !== "component-recipe") {
      throw new TypeError(`Component ${JSON.stringify(component.id)} is missing its component-recipe coverage root.`)
    }
  }
  for (const module of manifest.modules) {
    if (coverageRootById.get(module.id) !== "style-module") {
      throw new TypeError(`Style module ${JSON.stringify(module.id)} is missing its style-module coverage root.`)
    }
  }

  for (const token of manifest.tokens) {
    const alias = token.alias
    if (alias === undefined) continue
    if (alias.resolution === "internal") {
      if (alias.targetId === undefined) {
        throw new TypeError(`Internal token alias ${JSON.stringify(token.id)} requires a target ID.`)
      }
      const target = tokenById.get(alias.targetId)
      if (target === undefined) {
        throw new TypeError(`Internal token alias ${JSON.stringify(token.id)} targets undeclared token ${JSON.stringify(alias.targetId)}.`)
      }
      if (target.path.length !== alias.targetPath.length ||
        target.path.some((segment, index) => segment !== alias.targetPath[index])) {
        throw new TypeError(`Internal token alias ${JSON.stringify(token.id)} target path disagrees with token ${JSON.stringify(alias.targetId)}.`)
      }
    } else if (alias.resolution === "external") {
      if (alias.targetId === undefined) {
        throw new TypeError(`External token alias ${JSON.stringify(token.id)} requires a stable target ID.`)
      }
      if (entityIds.has(alias.targetId)) {
        throw new TypeError(`External token alias ${JSON.stringify(token.id)} targets a token declared in this manifest.`)
      }
    } else if (alias.targetId !== undefined) {
      throw new TypeError(`Unresolved token alias ${JSON.stringify(token.id)} cannot claim a target ID.`)
    }
  }

  const aliasDependencyCount = new Map<string, number>()
  for (const dependency of manifest.dependencies) {
    if (dependency.resolution === "unresolved" && dependency.to !== undefined) {
      throw new TypeError(`Unresolved manifest dependency from ${JSON.stringify(dependency.from)} cannot include a target ID.`)
    }
    if (dependency.resolution !== "unresolved" && dependency.to === undefined) {
      throw new TypeError(`Resolved manifest dependency from ${JSON.stringify(dependency.from)} requires a target ID.`)
    }

    if (dependency.kind === "token-alias") {
      const source = tokenById.get(dependency.from)
      if (source?.alias === undefined) {
        throw new TypeError(`Token-alias dependency source ${JSON.stringify(dependency.from)} is not a declared alias token.`)
      }
      if (dependency.resolution === "internal" && !tokenById.has(dependency.to!)) {
        throw new TypeError(`Internal token-alias dependency from ${JSON.stringify(dependency.from)} targets an undeclared token.`)
      }
      if (dependency.resolution === "external" && entityIds.has(dependency.to!)) {
        throw new TypeError(`External token-alias dependency from ${JSON.stringify(dependency.from)} targets a declared manifest entity.`)
      }
      if (source.alias.resolution !== dependency.resolution || source.alias.targetId !== dependency.to) {
        throw new TypeError(`Token-alias dependency from ${JSON.stringify(dependency.from)} disagrees with its alias record.`)
      }
      aliasDependencyCount.set(dependency.from, (aliasDependencyCount.get(dependency.from) ?? 0) + 1)
      continue
    }

    const source = moduleById.get(dependency.from)
    if (source === undefined) {
      throw new TypeError(`Style-token dependency source ${JSON.stringify(dependency.from)} is not a declared style module.`)
    }
    if (dependency.resolution === "internal" && !tokenById.has(dependency.to!)) {
      throw new TypeError(`Internal style-token dependency from ${JSON.stringify(dependency.from)} targets an undeclared token.`)
    }
    if (dependency.resolution === "external" && entityIds.has(dependency.to!)) {
      throw new TypeError(`External style-token dependency from ${JSON.stringify(dependency.from)} targets a declared manifest entity.`)
    }
    if (dependency.origin === undefined) {
      throw new TypeError(`Style-token dependency from ${JSON.stringify(dependency.from)} requires a compiler source origin.`)
    }
    assertManifestDependencyOrigin(dependency.origin, dependency.from, source.exports, "style-token dependency")
  }

  for (const token of manifest.tokens) {
    if (token.alias === undefined) continue
    if (aliasDependencyCount.get(token.id) !== 1) {
      throw new TypeError(`Alias token ${JSON.stringify(token.id)} must have exactly one matching token-alias dependency.`)
    }
  }

  const aliasVisitState = new Map<string, "visiting" | "visited">()
  const visitAlias = (id: string): void => {
    const state = aliasVisitState.get(id)
    if (state === "visiting") throw new TypeError(`Token alias cycle includes ${JSON.stringify(id)}.`)
    if (state === "visited") return
    aliasVisitState.set(id, "visiting")
    const alias = tokenById.get(id)?.alias
    if (alias?.resolution === "internal" && alias.targetId !== undefined) visitAlias(alias.targetId)
    aliasVisitState.set(id, "visited")
  }
  for (const token of manifest.tokens) if (token.alias !== undefined) visitAlias(token.id)

  for (const capability of manifest.capabilities) {
    const module = moduleById.get(capability.moduleId)
    if (module === undefined || !module.exports.includes(capability.exportPath)) {
      throw new TypeError(`Compiler capability for ${JSON.stringify(capability.moduleId)} must reference a declared style-module export.`)
    }
  }
  for (const entity of [...manifest.tokens, ...manifest.components]) {
    const replacement = entity.lifecycle?.replacement
    if (replacement?.resolution === "declared" && !entityIds.has(replacement.id)) {
      throw new TypeError(`Declared lifecycle replacement ${JSON.stringify(replacement.id)} does not resolve to a manifest entity.`)
    }
  }
  for (const unresolved of manifest.coverage.unresolved) {
    if (unresolved.origin === undefined) continue
    const module = moduleById.get(unresolved.origin.moduleId)
    if (module === undefined || !module.exports.includes(unresolved.origin.exportPath)) {
      throw new TypeError(`Unresolved reference origin for ${JSON.stringify(unresolved.reference)} must reference a declared style-module export.`)
    }
  }
}

function assertManifestDependencyOrigin(
  origin: DesignSystemManifest["dependencies"][number]["origin"],
  moduleId: string,
  exports: ReadonlyArray<string>,
  label: string,
): void {
  if (origin === undefined) return
  if (origin.moduleId !== moduleId || !exports.includes(origin.exportPath)) {
    throw new TypeError(`${label} origin for ${JSON.stringify(moduleId)} must reference one of its declared exports.`)
  }
}

function assertTokenContractCoverageRootId(id: string): void {
  const identitySeparator = id.lastIndexOf("#")
  const versionSeparator = id.lastIndexOf("@")
  if (identitySeparator <= 0 || versionSeparator <= identitySeparator + 1) {
    throw new TypeError(`Token-contract coverage root ${JSON.stringify(id)} must encode a stable contract identity.`)
  }
  const versionText = id.slice(versionSeparator + 1)
  const version = Number(versionText)
  if (!Number.isSafeInteger(version) || version <= 0 || String(version) !== versionText) {
    throw new TypeError(`Token-contract coverage root ${JSON.stringify(id)} must encode a positive contract version.`)
  }
  decodeToolingInput(contractIdentityCodec, {
    owner: id.slice(0, identitySeparator),
    name: id.slice(identitySeparator + 1, versionSeparator),
    version,
  }, `token-contract coverage root ${JSON.stringify(id)}`)
}

export function decodeManifestContractIdentity(input: unknown): ManifestContractIdentity {
  return decodeToolingInput(contractIdentityCodec, input, "manifest contract identity") as ManifestContractIdentity
}

export function decodeManifestSourceOrigin(input: unknown): ManifestSourceOrigin {
  return decodeToolingInput(sourceOriginCodec, input, "manifest source origin") as ManifestSourceOrigin
}

export function decodeManifestLifecycleAnnotation(input: unknown): ManifestLifecycleAnnotation {
  return decodeToolingInput(lifecycleAnnotationCodec, input, "manifest lifecycle annotation") as ManifestLifecycleAnnotation
}

export function decodeManifestUnresolvedReference(input: unknown): ManifestUnresolvedReference {
  return decodeToolingInput(unresolvedReferenceCodec, input, "manifest unresolved reference") as ManifestUnresolvedReference
}
