import { tokenVariableName } from "../../tokens/identity"
import type { DesignSystemManifest, ManifestComponent, ManifestToken } from "../manifest/model"
import type { DesignSystemOwnership, OwnershipOwner, OwnershipUnresolvedReason } from "./model"

export type OwnershipEntityKind = "token" | "component"

export type OwnershipEntityIndex = {
  readonly byId: ReadonlyMap<string, OwnershipEntityKind>
  readonly tokenIdsByVariableName: ReadonlyMap<string, ReadonlyArray<string>>
}

export type OwnershipResolution =
  | { readonly entityId: string; readonly status: "assigned"; readonly owner: OwnershipOwner }
  | { readonly entityId: string; readonly status: "unassigned" }
  | {
    readonly entityId: string
    readonly status: "unresolved"
    readonly reason: Extract<OwnershipUnresolvedReason, "entity-not-in-supplied-manifests">
  }

type IndexedEntityIdentity = {
  readonly kind: OwnershipEntityKind
  readonly signature: string
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function tokenIdentitySignature(token: ManifestToken): string {
  return JSON.stringify([
    token.contract.owner,
    token.contract.name,
    token.contract.version,
    token.path,
  ])
}

function componentIdentitySignature(component: ManifestComponent): string {
  return JSON.stringify([
    component.contract.owner,
    component.contract.name,
    component.contract.version,
  ])
}

function registerEntity(
  id: string,
  kind: OwnershipEntityKind,
  signature: string,
  byId: Map<string, OwnershipEntityKind>,
  identitiesById: Map<string, IndexedEntityIdentity>,
): void {
  const previous = identitiesById.get(id)
  if (previous === undefined) {
    byId.set(id, kind)
    identitiesById.set(id, { kind, signature })
    return
  }
  if (previous.kind !== kind) {
    throw new TypeError(`Conflicting manifest entity identity ${JSON.stringify(id)} is both a ${previous.kind} and a ${kind}.`)
  }
  if (previous.signature !== signature) {
    throw new TypeError(`Contradictory ${kind} identity for manifest entity ${JSON.stringify(id)}.`)
  }
}

/** Build exact token/component and generated token-variable indexes once. */
export function buildOwnershipEntityIndex(manifests: ReadonlyArray<DesignSystemManifest>): OwnershipEntityIndex {
  if (manifests.length === 0) {
    throw new TypeError("At least one explicitly supplied design-system manifest is required.")
  }

  const packageVersions = new Set<string>()
  const byId = new Map<string, OwnershipEntityKind>()
  const identitiesById = new Map<string, IndexedEntityIdentity>()
  const tokenIdsByVariableName = new Map<string, Set<string>>()

  for (const manifest of manifests) {
    const packageVersion = JSON.stringify([manifest.package.name, manifest.package.version])
    if (packageVersions.has(packageVersion)) {
      throw new TypeError(`Duplicate manifest package identity ${JSON.stringify(`${manifest.package.name}@${manifest.package.version}`)}.`)
    }
    packageVersions.add(packageVersion)

    for (const token of manifest.tokens) {
      registerEntity(token.id, "token", tokenIdentitySignature(token), byId, identitiesById)
      const variableName = tokenVariableName(token.contract, token.path)
      const tokenIds = tokenIdsByVariableName.get(variableName) ?? new Set<string>()
      tokenIds.add(token.id)
      tokenIdsByVariableName.set(variableName, tokenIds)
    }

    for (const component of manifest.components) {
      registerEntity(component.id, "component", componentIdentitySignature(component), byId, identitiesById)
    }
  }

  const orderedById = new Map([...byId.entries()].sort(([left], [right]) => compareStrings(left, right)))
  const orderedVariableNames = [...tokenIdsByVariableName.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([name, ids]) => [name, [...ids].sort(compareStrings)] as const)

  return {
    byId: orderedById,
    tokenIdsByVariableName: new Map(orderedVariableNames),
  }
}

/** Pre-index ownership assignments so each report reference resolves in constant time. */
export function buildOwnershipAssignmentIndex(
  ownership: DesignSystemOwnership,
): ReadonlyMap<string, OwnershipOwner> {
  const ownersById = new Map(ownership.owners.map(owner => [owner.id, owner] as const))
  const assignmentsByEntityId = new Map<string, OwnershipOwner>()
  for (const assignment of ownership.assignments) {
    const owner = ownersById.get(assignment.ownerId)
    if (owner === undefined) {
      throw new TypeError(`Ownership assignment references unknown owner ID ${JSON.stringify(assignment.ownerId)}.`)
    }
    if (assignmentsByEntityId.has(assignment.entityId)) {
      throw new TypeError(`Duplicate ownership assignment for entity ID ${JSON.stringify(assignment.entityId)}.`)
    }
    assignmentsByEntityId.set(assignment.entityId, owner)
  }
  return assignmentsByEntityId
}

/** Resolve one exact stable ID; report adapters add the source JSON Pointer. */
export function resolveOwnershipEntity(
  entityId: string,
  ownership: DesignSystemOwnership,
  index: OwnershipEntityIndex,
  assignmentsByEntityId: ReadonlyMap<string, OwnershipOwner> = buildOwnershipAssignmentIndex(ownership),
): OwnershipResolution {
  if (!index.byId.has(entityId)) {
    return { entityId, status: "unresolved", reason: "entity-not-in-supplied-manifests" }
  }

  const owner = assignmentsByEntityId.get(entityId)
  return owner === undefined
    ? { entityId, status: "unassigned" }
    : { entityId, status: "assigned", owner: { id: owner.id, displayName: owner.displayName } }
}
