import type {
  DesignSystemManifest,
  ManifestComponent,
  ManifestToken,
} from "../manifest/model"
import { decodeManifest } from "../manifest/schema"
import type {
  SourceComponentMigration,
  SourceMigration,
  SourceTokenMigration,
} from "./model"
import { decodeSourceMigration } from "./schema"

export type ValidatedTokenMigration = {
  readonly mapping: SourceTokenMigration
  readonly from: ManifestToken
  readonly to: ManifestToken
}

export type ValidatedComponentMigration = {
  readonly mapping: SourceComponentMigration
  readonly from: ManifestComponent
  readonly to: ManifestComponent
}

export type ValidatedSourceMigration = {
  readonly migration: SourceMigration
  readonly baseline: DesignSystemManifest
  readonly current: DesignSystemManifest
  readonly tokens: ReadonlyArray<ValidatedTokenMigration>
  readonly tokensByFromId: ReadonlyMap<string, ValidatedTokenMigration>
  readonly components: ReadonlyArray<ValidatedComponentMigration>
  readonly componentsByFromId: ReadonlyMap<string, ValidatedComponentMigration>
}

function manifestEntity<T extends { readonly id: string }>(
  entities: ReadonlyArray<T>,
  id: string,
  label: string,
): T {
  const entity = entities.find(candidate => candidate.id === id)
  if (entity === undefined) throw new TypeError(`Invalid source migration: ${label} ${JSON.stringify(id)} is not present.`)
  return entity
}

function assertLifecycleTarget(
  entity: { readonly lifecycle?: { readonly replacement?: { readonly id: string; readonly resolution: "declared" | "external" } } },
  toId: string,
  kind: string,
): void {
  const replacement = entity.lifecycle?.replacement
  if (replacement === undefined) return
  if (replacement.resolution === "external") {
    throw new TypeError(`Invalid source migration: external lifecycle replacement on ${kind} ${JSON.stringify(entity === undefined ? "" : (entity as { readonly id?: string }).id ?? "")}.`)
  }
  if (replacement.id !== toId) {
    throw new TypeError(`Invalid source migration: declared lifecycle replacement for ${kind} does not agree with migration target ${JSON.stringify(toId)}.`)
  }
}

function assertUniqueValues(values: ReadonlyArray<string>, label: string, id: string): void {
  if (new Set(values).size !== values.length) {
    throw new TypeError(`Invalid source migration: baseline ${label} for ${JSON.stringify(id)} contains duplicates.`)
  }
}

function sameDomain(left: ManifestToken["domain"], right: ManifestToken["domain"]): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

/** Validate an explicit migration map against exactly the supplied manifests. */
export function validateSourceMigration(input: {
  readonly migration: SourceMigration
  readonly baseline: DesignSystemManifest
  readonly current: DesignSystemManifest
}): ValidatedSourceMigration {
  const migration = decodeSourceMigration(input.migration)
  const baseline = decodeManifest(input.baseline)
  const current = decodeManifest(input.current)
  if (migration.provider !== baseline.package.name || migration.provider !== current.package.name) {
    throw new TypeError("Invalid source migration: provider must match baseline and current manifest package identity.")
  }

  const tokens: ValidatedTokenMigration[] = []
  const tokensByFromId = new Map<string, ValidatedTokenMigration>()
  for (const mapping of migration.tokens) {
    const from = manifestEntity(baseline.tokens, mapping.fromId, "baseline token")
    const to = manifestEntity(current.tokens, mapping.toId, "current token")
    if (!sameDomain(from.domain, to.domain)) {
      throw new TypeError(`Invalid source migration: token domain differs for ${JSON.stringify(mapping.fromId)} and ${JSON.stringify(mapping.toId)}.`)
    }
    assertLifecycleTarget(from, mapping.toId, "token")
    const validated = { mapping, from, to }
    tokens.push(validated)
    tokensByFromId.set(mapping.fromId, validated)
  }

  const components: ValidatedComponentMigration[] = []
  const componentsByFromId = new Map<string, ValidatedComponentMigration>()
  for (const mapping of migration.components) {
    const from = manifestEntity(baseline.components, mapping.fromId, "baseline component")
    const to = manifestEntity(current.components, mapping.toId, "current component")
    assertLifecycleTarget(from, mapping.toId, "component")
    assertUniqueValues(from.slots, "component slots", mapping.fromId)
    assertUniqueValues(to.slots, "component slots", mapping.toId)
    const oldSlots = new Set(from.slots)
    const mappedSlots = Object.keys(mapping.slots)
    if (mappedSlots.length !== oldSlots.size || mappedSlots.some(slot => !oldSlots.has(slot))) {
      throw new TypeError(`Invalid source migration: component slot map must exactly match and map every baseline slot for ${JSON.stringify(mapping.fromId)}.`)
    }
    const currentSlots = new Set(to.slots)
    for (const [oldSlot, newSlot] of Object.entries(mapping.slots)) {
      if (!oldSlots.has(oldSlot)) continue
      if (!currentSlots.has(newSlot)) {
        throw new TypeError(`Invalid source migration: current component slot ${JSON.stringify(newSlot)} does not exist on ${JSON.stringify(mapping.toId)}.`)
      }
    }
    const validated = { mapping, from, to }
    components.push(validated)
    componentsByFromId.set(mapping.fromId, validated)
  }

  return { migration, baseline, current, tokens, tokensByFromId, components, componentsByFromId }
}
