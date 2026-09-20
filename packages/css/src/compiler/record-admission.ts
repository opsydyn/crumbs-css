export class CompilerRecordAdmissionError extends TypeError {
  override readonly name = "CompilerRecordAdmissionError"
}

/**
 * Reads an object without invoking inherited fields or enumerable accessors.
 * Compiler records are data boundaries, so accessor-backed values are rejected
 * before validation or emission can accidentally execute user code.
 */
export function ownEnumerableDataEntries(
  value: object,
  path = "<record>",
): ReadonlyArray<readonly [string, unknown]> {
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const entries: Array<readonly [string, unknown]> = []
  for (const [key, descriptor] of Object.entries(descriptors)) {
    if (!descriptor.enumerable) continue
    if (!("value" in descriptor)) {
      throw new CompilerRecordAdmissionError(`Unsupported accessor at ${path}.${key}`)
    }
    entries.push([key, descriptor.value])
  }
  return entries
}

export function sortedOwnEnumerableDataEntries(
  value: object,
  path = "<record>",
): ReadonlyArray<readonly [string, unknown]> {
  return [...ownEnumerableDataEntries(value, path)].sort(([left], [right]) => left.localeCompare(right))
}
