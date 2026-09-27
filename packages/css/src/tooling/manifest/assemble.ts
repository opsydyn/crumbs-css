import { getTokenContractIdentity } from "../../tokens/domains"
import {
  decodeManifest,
  decodeManifestLifecycleAnnotation,
  decodeManifestUnresolvedReference,
} from "./schema"
import { projectComponentRecipe, projectTokenContract, type ComponentRecipeRoot, type TokenContractRoot } from "./contracts"
import type {
  DesignSystemManifest,
  ManifestComponent,
  ManifestDependency,
  ManifestLifecycle,
  ManifestLifecycleAnnotation,
  ManifestPackage,
  ManifestProducer,
  ManifestToken,
  ManifestUnresolvedReference,
} from "./model"

export type ManifestAssemblyInput = {
  readonly package: ManifestPackage
  readonly producer: ManifestProducer
  /** Explicit token contract roots; no source-tree discovery is performed. */
  readonly tokenContracts?: ReadonlyArray<TokenContractRoot>
  /** Explicit component recipe roots; no recipe registry is inspected. */
  readonly componentRecipes?: ReadonlyArray<ComponentRecipeRoot>
  readonly lifecycleAnnotations?: ReadonlyArray<ManifestLifecycleAnnotation>
  readonly unresolvedReferences?: ReadonlyArray<ManifestUnresolvedReference>
}

/** Assemble a v1 manifest from only the token and component roots supplied by the caller. */
export function assembleManifest(input: ManifestAssemblyInput): DesignSystemManifest {
  const roots: Array<{ readonly kind: "token-contract" | "component-recipe"; readonly id: string }> = []
  const rootIds = new Set<string>()
  const tokens: ManifestToken[] = []
  const components: ManifestComponent[] = []

  for (const root of input.tokenContracts ?? []) {
    const identity = getTokenContractIdentity(root.contract)
    if (identity === undefined) throw new TypeError("Manifest token roots require a stable contract identity.")
    const id = `${identity.owner}#${identity.name}@${identity.version}`
    addRoot(rootIds, roots, "token-contract", id)
    tokens.push(...projectTokenContract(root.contract, root.origin))
  }

  for (const root of input.componentRecipes ?? []) {
    const component = projectComponentRecipe(root.recipe, root.origin)
    addRoot(rootIds, roots, "component-recipe", component.id)
    components.push(component)
  }

  const entityIds = new Set<string>()
  for (const token of tokens) addEntity(entityIds, token.id)
  for (const component of components) addEntity(entityIds, component.id)

  const tokenIds = new Set(tokens.map(token => token.id))
  const dependencies: ManifestDependency[] = []
  const unresolved: ManifestUnresolvedReference[] = (input.unresolvedReferences ?? []).map(decodeManifestUnresolvedReference)
  for (const token of tokens) {
    if (token.alias === undefined) continue
    const alias = token.alias
    if (alias.resolution === "internal" && (alias.targetId === undefined || !tokenIds.has(alias.targetId))) {
      throw new TypeError(`Internal token alias ${JSON.stringify(token.id)} does not resolve to a declared token.`)
    }
    if (alias.resolution === "external" && alias.targetId === undefined) {
      throw new TypeError(`External token alias ${JSON.stringify(token.id)} requires an explicit stable target ID.`)
    }
    dependencies.push({
      from: token.id,
      ...(alias.targetId === undefined ? {} : { to: alias.targetId }),
      kind: "token-alias",
      resolution: alias.resolution,
    })
    if (alias.resolution === "unresolved") {
      unresolved.push({
        reference: `${token.id} -> ${alias.targetPath.join(".")}`,
        reason: "The alias target is outside the declared roots or has no stable contract identity.",
      })
    }
  }

  const lifecycleById = new Map<string, ManifestLifecycle>()
  for (const rawAnnotation of input.lifecycleAnnotations ?? []) {
    const annotation = decodeManifestLifecycleAnnotation(rawAnnotation)
    if (!entityIds.has(annotation.entityId)) {
      throw new TypeError(`Lifecycle annotation target ${JSON.stringify(annotation.entityId)} is not a declared manifest entity.`)
    }
    if (lifecycleById.has(annotation.entityId)) {
      throw new TypeError(`Duplicate lifecycle annotation for ${JSON.stringify(annotation.entityId)}.`)
    }
    if (annotation.replacement?.resolution === "declared" && !entityIds.has(annotation.replacement.id)) {
      throw new TypeError(`Declared lifecycle replacement ${JSON.stringify(annotation.replacement.id)} does not resolve to a manifest entity.`)
    }
    const { entityId: _entityId, ...lifecycle } = annotation
    lifecycleById.set(annotation.entityId, lifecycle)
  }

  const manifest = {
    format: "crumbs.design-system-manifest",
    schemaVersion: 1,
    package: input.package,
    producer: input.producer,
    tokens: tokens.map(token => attachLifecycle(token, lifecycleById.get(token.id))),
    components: components.map(component => attachLifecycle(component, lifecycleById.get(component.id))),
    modules: [],
    dependencies,
    capabilities: [],
    coverage: { roots, unresolved },
  }
  return decodeManifest(manifest)
}

function addRoot(
  seen: Set<string>,
  roots: Array<{ readonly kind: "token-contract" | "component-recipe"; readonly id: string }>,
  kind: "token-contract" | "component-recipe",
  id: string,
): void {
  if (seen.has(id)) throw new TypeError(`Duplicate manifest root identity ${JSON.stringify(id)}.`)
  seen.add(id)
  roots.push({ kind, id })
}

function addEntity(seen: Set<string>, id: string): void {
  if (seen.has(id)) throw new TypeError(`Duplicate or conflicting manifest entity identity ${JSON.stringify(id)}.`)
  seen.add(id)
}

function attachLifecycle<T extends { readonly id: string; readonly lifecycle?: ManifestLifecycle }>(
  record: T,
  lifecycle: ManifestLifecycle | undefined,
): T {
  return lifecycle === undefined ? record : { ...record, lifecycle }
}
