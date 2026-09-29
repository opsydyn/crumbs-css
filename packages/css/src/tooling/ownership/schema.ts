import * as Schema from "effect/Schema"
import { makeDataCodec } from "../../contracts/data-codec"
import {
  DESIGN_SYSTEM_OWNERSHIP_FORMAT,
  DESIGN_SYSTEM_OWNERSHIP_VERSION,
  type DesignSystemOwnership,
  type OwnershipAssignment,
  type OwnershipOwner,
} from "./model"

const SafeText = Schema.NonEmptyString.check(Schema.makeFilter<string>(value =>
  value === value.trim() && !/[\u0000-\u001f\u007f-\u009f]/u.test(value)))

const OwnerSchema = Schema.Struct({ id: SafeText, displayName: SafeText })
const AssignmentSchema = Schema.Struct({ entityId: SafeText, ownerId: SafeText })
const OwnershipSchema = Schema.Struct({
  format: Schema.Literal(DESIGN_SYSTEM_OWNERSHIP_FORMAT),
  schemaVersion: Schema.Literal(DESIGN_SYSTEM_OWNERSHIP_VERSION),
  owners: Schema.Array(OwnerSchema),
  assignments: Schema.Array(AssignmentSchema),
})
const ownershipCodec = makeDataCodec("design-system-ownership-v1", OwnershipSchema)

function decodeError(issues: ReadonlyArray<{ readonly path: ReadonlyArray<string | number>; readonly message: string }>): TypeError {
  const detail = issues.map(issue => {
    const path = issue.path.length === 0 ? "<root>" : issue.path.join(".")
    return `${path}: ${issue.message}`
  }).join("; ")
  return new TypeError(`Invalid Crumbs design-system ownership v1: ${detail}`)
}

/** Validate the strict v1 ownership document and return detached plain data. */
export function decodeDesignSystemOwnership(input: unknown): DesignSystemOwnership {
  const decoded = ownershipCodec.decode(input)
  if (!decoded.ok) throw decodeError(decoded.issues)

  const ownership = decoded.value as DesignSystemOwnership
  const ownerIds = new Set<string>()
  for (const owner of ownership.owners as ReadonlyArray<OwnershipOwner>) {
    if (ownerIds.has(owner.id)) {
      throw new TypeError(`Invalid Crumbs design-system ownership v1: duplicate owner ID ${JSON.stringify(owner.id)}.`)
    }
    ownerIds.add(owner.id)
  }

  const entityIds = new Set<string>()
  for (const assignment of ownership.assignments as ReadonlyArray<OwnershipAssignment>) {
    if (entityIds.has(assignment.entityId)) {
      throw new TypeError(`Invalid Crumbs design-system ownership v1: duplicate entity assignment ${JSON.stringify(assignment.entityId)}.`)
    }
    entityIds.add(assignment.entityId)
    if (!ownerIds.has(assignment.ownerId)) {
      throw new TypeError(`Invalid Crumbs design-system ownership v1: unknown owner ID ${JSON.stringify(assignment.ownerId)}.`)
    }
  }

  return ownership
}
