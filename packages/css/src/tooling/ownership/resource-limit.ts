import { OWNERSHIP_MAX_REPORT_REFERENCES } from "./model"

export class OwnershipResourceLimitError extends RangeError {
  readonly code = "ownership.resource-limit-exceeded" as const

  constructor(
    readonly limit: number,
    readonly actual: number,
  ) {
    super(`Ownership report has ${actual} references; the maximum is ${limit}.`)
    this.name = "OwnershipResourceLimitError"
  }
}

export function assertOwnershipReferenceLimit(actual: number): void {
  if (actual > OWNERSHIP_MAX_REPORT_REFERENCES) {
    throw new OwnershipResourceLimitError(OWNERSHIP_MAX_REPORT_REFERENCES, actual)
  }
}

export function readOwnDataField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor !== undefined && "value" in descriptor ? descriptor.value : undefined
}

export function readOwnArrayLength(value: unknown, key: string): number | undefined {
  const field = readOwnDataField(value, key)
  return Array.isArray(field) ? field.length : undefined
}
