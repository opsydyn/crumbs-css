export type CoverageAxis = {
  readonly name: string
  readonly values: ReadonlyArray<string>
}

export type PublicVariantContract = {
  readonly identity: {
    readonly owner: string
    readonly name: string
    readonly version: number
  }
  readonly public: {
    readonly slots: ReadonlyArray<string>
    readonly variants: Readonly<Record<string, ReadonlyArray<string>>>
  }
}

export type ContractRecipeLike = {
  readonly contract?: PublicVariantContract
  readonly stateVariants?: Readonly<Record<string, unknown>>
}

export type ContractReviewCase = {
  readonly selection: Readonly<Record<string, string | boolean>>
  readonly status: "reachable" | "unreachable"
  readonly reason?: string
}

export function generateFullRows(
  axes: ReadonlyArray<CoverageAxis>,
): ReadonlyArray<Readonly<Record<string, string>>> {
  validateAxes(axes)
  return cartesianRows(axes)
}

/**
 * Return a deterministic greedy covering array. Every individual value and
 * every pair of values across distinct axes appears at least once.
 */
export function generatePairwiseRows(
  axes: ReadonlyArray<CoverageAxis>,
): ReadonlyArray<Readonly<Record<string, string>>> {
  validateAxes(axes)
  const candidates = cartesianRows(axes)
  if (axes.length === 0) return [{}]
  const candidateFeatures = candidates.map(row => new Set(featuresOf(row, axes)))
  const allFeatures = new Set(candidateFeatures.flatMap(features => [...features]))
  let best: ReadonlyArray<number> | undefined

  // A small set of different first rows avoids poor greedy tie-breaks on tiny
  // axes (for example, the 2x2x2 theme matrix) while keeping larger contracts
  // bounded to a single deterministic pass.
  const starts = candidates.length <= 64
    ? candidates.map((_, index) => index)
    : [0]
  for (const start of starts) {
    const uncovered = new Set(allFeatures)
    const selected = [start]
    for (const feature of candidateFeatures[start]!) uncovered.delete(feature)
    const used = new Set(selected)

    while (uncovered.size > 0) {
      let bestIndex = -1
      let bestCoverage = 0

      for (let index = 0; index < candidates.length; index += 1) {
        if (used.has(index)) continue
        let coverage = 0
        for (const feature of candidateFeatures[index]!) {
          if (uncovered.has(feature)) coverage += 1
        }
        if (coverage > bestCoverage) {
          bestIndex = index
          bestCoverage = coverage
        }
      }

      if (bestIndex < 0 || bestCoverage === 0) {
        throw new Error("Unable to complete pairwise coverage for the declared axes.")
      }
      used.add(bestIndex)
      selected.push(bestIndex)
      for (const feature of candidateFeatures[bestIndex]!) uncovered.delete(feature)
    }

    if (best === undefined || selected.length < best.length) best = selected
  }

  if (candidates.length <= 12) {
    const minimum = minimumCover(candidateFeatures, allFeatures)
    if (minimum !== undefined) best = minimum
  }

  return (best ?? []).map(index => candidates[index]!)
}

/** Enumerate all public variant selections and derive reachability from stateVariants. */
export function enumerateContractReviewCases(
  recipe: ContractRecipeLike,
): ReadonlyArray<ContractReviewCase> {
  const contract = recipe.contract
  if (contract === undefined) {
    throw new TypeError("Contract review cases require a declared public component contract.")
  }

  const axes = Object.entries(contract.public.variants).map(([name, values]) => ({name, values}))
  validateAxes(axes)
  const candidates = cartesianVariantSelections(axes)
  const stateEntries = recipe.stateVariants === undefined
    ? []
    : Object.entries(recipe.stateVariants)

  if (stateEntries.length > 1) {
    throw new TypeError("Contract review cases currently require a single state discriminator.")
  }

  const discriminator = stateEntries[0]?.[0]
  const stateCases = stateEntries[0]?.[1]
  if (discriminator !== undefined && !Object.hasOwn(contract.public.variants, discriminator)) {
    throw new TypeError(`State discriminator ${JSON.stringify(discriminator)} is not public.`)
  }

  return candidates.map(selection => {
    if (discriminator === undefined || stateCases === undefined) {
      return {selection, status: "reachable"}
    }

    const stateName = String(selection[discriminator])
    const constraints = asRecord(stateCases, `State case ${JSON.stringify(stateName)}`)[stateName]
    if (constraints === undefined) {
      throw new TypeError(`State contract is missing discriminator case ${JSON.stringify(stateName)}.`)
    }

    for (const [axis, allowedValues] of Object.entries(asRecord(
      constraints,
      `State constraints for ${JSON.stringify(stateName)}`,
    ))) {
      if (!Object.hasOwn(selection, axis)) {
        throw new TypeError(`State contract constrains non-public variant ${JSON.stringify(axis)}.`)
      }
      if (!Array.isArray(allowedValues) || allowedValues.length === 0) {
        throw new TypeError(`State constraint ${JSON.stringify(axis)} must contain allowed values.`)
      }
      const actualValue = selection[axis]!
      const allowed = allowedValues as ReadonlyArray<string | boolean>
      if (!allowed.some(value => String(value) === String(actualValue))) {
        return {
          selection,
          status: "unreachable",
          reason: `state ${discriminator}=${stateName} allows ${axis}=${allowed.map(String).join("|")}, received ${String(actualValue)}`,
        }
      }
    }

    return {selection, status: "reachable"}
  })
}

function validateAxes(axes: ReadonlyArray<CoverageAxis>): void {
  const names = new Set<string>()
  for (const axis of axes) {
    if (axis.name.length === 0 || names.has(axis.name)) {
      throw new TypeError("Coverage axis names must be non-empty and unique.")
    }
    names.add(axis.name)
    if (axis.values.length === 0) {
      throw new TypeError(`Coverage axis ${JSON.stringify(axis.name)} must declare at least one value.`)
    }
    if (axis.values.some(value => value.length === 0) || new Set(axis.values).size !== axis.values.length) {
      throw new TypeError(`Coverage axis ${JSON.stringify(axis.name)} values must be non-empty and unique.`)
    }
  }
}

function cartesianRows(
  axes: ReadonlyArray<CoverageAxis>,
): Array<Readonly<Record<string, string>>> {
  return cartesianVariantSelections(axes).map(row => row as Readonly<Record<string, string>>)
}

function cartesianVariantSelections(
  axes: ReadonlyArray<CoverageAxis>,
): Array<Readonly<Record<string, string | boolean>>> {
  let rows: Array<Readonly<Record<string, string | boolean>>> = [{}]
  for (const axis of axes) {
    const next: Array<Readonly<Record<string, string | boolean>>> = []
    for (const row of rows) {
      for (const value of axis.values) {
        next.push({
          ...row,
          [axis.name]: booleanVariantValue(axis.values, value),
        })
      }
    }
    rows = next
  }
  return rows
}

function booleanVariantValue(values: ReadonlyArray<string>, value: string): string | boolean {
  return values.includes("false") && values.includes("true") && values.length === 2
    ? value === "true"
    : value
}

function featuresOf(
  row: Readonly<Record<string, string | boolean>>,
  axes: ReadonlyArray<CoverageAxis>,
): ReadonlyArray<string> {
  const features: string[] = []
  for (const axis of axes) {
    features.push(JSON.stringify([axis.name, row[axis.name]]))
  }
  for (let left = 0; left < axes.length; left += 1) {
    for (let right = left + 1; right < axes.length; right += 1) {
      const leftName = axes[left]!.name
      const rightName = axes[right]!.name
      features.push(JSON.stringify([leftName, row[leftName], rightName, row[rightName]]))
    }
  }
  return features
}

function minimumCover(
  candidateFeatures: ReadonlyArray<ReadonlySet<string>>,
  allFeatures: ReadonlySet<string>,
): ReadonlyArray<number> | undefined {
  for (let size = 1; size <= candidateFeatures.length; size += 1) {
    const search = (
      start: number,
      remaining: number,
      selected: ReadonlyArray<number>,
      covered: ReadonlySet<string>,
    ): ReadonlyArray<number> | undefined => {
      if (remaining === 0) {
        return covered.size === allFeatures.size ? selected : undefined
      }
      if (candidateFeatures.length - start < remaining) return undefined

      for (let index = start; index <= candidateFeatures.length - remaining; index += 1) {
        const nextCovered = new Set(covered)
        for (const feature of candidateFeatures[index]!) nextCovered.add(feature)
        const result = search(index + 1, remaining - 1, [...selected, index], nextCovered)
        if (result !== undefined) return result
      }
      return undefined
    }

    const result = search(0, size, [], new Set())
    if (result !== undefined) return result
  }
  return undefined
}

function asRecord(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be a record.`)
  }
  return value as Readonly<Record<string, unknown>>
}
