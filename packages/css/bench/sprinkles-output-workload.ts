export type SprinklesStyleValue = string | number | boolean
export type SprinklesStyle = Readonly<Record<string, SprinklesStyleValue>>
export type SprinklesSelection = Readonly<Record<string, string>>

export const sprinklesOutputStrategies = ["atomic", "fused", "hybrid"] as const
export type SprinklesOutputStrategy = typeof sprinklesOutputStrategies[number]

type SprinklesPropertyMap = Readonly<Record<string, Readonly<Record<string, SprinklesStyle>>>>
type SprinklesShorthandMap = Readonly<Record<string, readonly string[]>>

export type SprinklesOutputFixture = {
  readonly name: string
  readonly properties: SprinklesPropertyMap
  readonly shorthands: SprinklesShorthandMap
  readonly selectionAxes: readonly string[]
  readonly selectionSpace: ReadonlyArray<SprinklesSelection>
  readonly hotSelections: ReadonlyArray<SprinklesSelection>
  readonly workload: ReadonlyArray<SprinklesSelection>
}

type AtomicArtifact = {
  readonly kind: "atomic"
  readonly selectionAxes: readonly string[]
  readonly properties: SprinklesPropertyMap
  readonly shorthands: SprinklesShorthandMap
}

type FusedArtifact = {
  readonly kind: "fused"
  readonly selectionAxes: readonly string[]
  readonly entries: Readonly<Record<string, SprinklesStyle>>
}

type HybridArtifact = {
  readonly kind: "hybrid"
  readonly selectionAxes: readonly string[]
  readonly atomic: AtomicArtifact
  readonly fused: Readonly<Record<string, SprinklesStyle>>
}

export type SprinklesOutputArtifact = AtomicArtifact | FusedArtifact | HybridArtifact

export type StrategySetupAllocations = {
  /** Number of atomic property/scale entries retained by the emitted strategy. */
  readonly atomicStyleEntries: number
  /** Number of pre-fused selection entries retained by the emitted strategy. */
  readonly fusedStyleEntries: number
  /** Number of selection lookup containers created during setup. */
  readonly lookupContainers: number
  /** Number of merged style objects created during setup. */
  readonly mergedStyleObjects: number
  /** Sum of the modelled setup allocations above. */
  readonly totalModelAllocations: number
}

export type SprinklesSelectionResult = {
  readonly styles: ReadonlyArray<SprinklesStyle>
  readonly strategyUsed: "atomic" | "fused"
  /** Output-array header plus one slot for each returned style reference. */
  readonly allocationUnits: number
  readonly arrayLength: number
}

export type SprinklesOutputRuntime = {
  readonly strategy: SprinklesOutputStrategy
  readonly artifact: SprinklesOutputArtifact
  readonly setup: StrategySetupAllocations
  readonly select: (selection: SprinklesSelection) => SprinklesSelectionResult
}

const selectionAxes = [
  "paddingLeft",
  "paddingRight",
  "backgroundColor",
  "color",
  "borderRadius",
  "px",
] as const

const properties = {
  paddingLeft: {
    sm: { paddingLeft: 4 },
    md: { paddingLeft: 8 },
    lg: { paddingLeft: 16 },
  },
  paddingRight: {
    sm: { paddingRight: 4 },
    md: { paddingRight: 8 },
    lg: { paddingRight: 16 },
  },
  backgroundColor: {
    canvas: { backgroundColor: "#ffffff" },
    surface: { backgroundColor: "#f2f3f5" },
    accent: { backgroundColor: "#2858c4" },
  },
  color: {
    muted: { color: "#68707c" },
    text: { color: "#16191f" },
    accent: { color: "#2858c4" },
  },
  borderRadius: {
    sm: { borderRadius: 4 },
    md: { borderRadius: 8 },
    lg: { borderRadius: 16 },
  },
} as const satisfies SprinklesPropertyMap

const shorthands = {
  px: ["paddingLeft", "paddingRight"],
} as const satisfies SprinklesShorthandMap

function selectionKey(selection: SprinklesSelection, axes: readonly string[] = selectionAxes): string {
  return axes
    .filter(name => Object.hasOwn(selection, name))
    .map(name => `${name}=${selection[name]}`)
    .join("|") || "<empty>"
}

function enumerateSelections(
  axes: readonly string[],
  propertyMap: SprinklesPropertyMap,
  shorthandMap: SprinklesShorthandMap,
): ReadonlyArray<SprinklesSelection> {
  const selections: Array<SprinklesSelection> = []
  const current: Record<string, string> = {}

  const visit = (index: number): void => {
    if (index === axes.length) {
      selections.push(Object.freeze({ ...current }))
      return
    }

    const name = axes[index]!
    visit(index + 1)
    const values = Object.hasOwn(propertyMap, name)
      ? Object.keys(propertyMap[name]!)
      : Object.hasOwn(shorthandMap, name)
        ? Object.keys(propertyMap[shorthandMap[name]![0]!]!)
        : []
    for (const value of values) {
      current[name] = value
      visit(index + 1)
      delete current[name]
    }
  }

  visit(0)
  return Object.freeze(selections)
}

const selectionSpace = enumerateSelections(selectionAxes, properties, shorthands)
const hotSelections = Object.freeze([
  {},
  { paddingLeft: "sm" },
  { paddingLeft: "md", paddingRight: "md" },
  { px: "sm" },
  { px: "md", backgroundColor: "surface" },
  { px: "lg", backgroundColor: "accent", color: "text" },
  { paddingLeft: "sm", paddingRight: "sm", borderRadius: "sm" },
  { paddingLeft: "md", paddingRight: "md", borderRadius: "md" },
  { backgroundColor: "canvas", color: "text" },
  { backgroundColor: "surface", color: "muted" },
  { backgroundColor: "accent", color: "accent", borderRadius: "lg" },
  { px: "sm", backgroundColor: "canvas", color: "text", borderRadius: "sm" },
] satisfies ReadonlyArray<SprinklesSelection>)

const hotKeys = new Set(hotSelections.map(selection => selectionKey(selection)))
const coldSelections = selectionSpace.filter(selection => !hotKeys.has(selectionKey(selection))).slice(0, 36)
const workload = Object.freeze([
  ...hotSelections.flatMap(selection => [selection, selection, selection]),
  ...coldSelections,
])

export const sprinklesOutputFixture: SprinklesOutputFixture = Object.freeze({
  name: "bounded-card-sprinkles",
  properties,
  shorthands,
  selectionAxes,
  selectionSpace,
  hotSelections,
  workload,
})

function countAtomicStyleEntries(propertyMap: SprinklesPropertyMap): number {
  return Object.values(propertyMap).reduce((total, scales) => total + Object.keys(scales).length, 0)
}

function resolveAtomicStyles(
  artifact: AtomicArtifact,
  selection: SprinklesSelection,
): ReadonlyArray<SprinklesStyle> {
  const styles: Array<SprinklesStyle> = []
  for (const name of artifact.selectionAxes) {
    const scaleName = selection[name]
    if (scaleName === undefined) continue

    const propertyScales = artifact.properties[name]
    if (propertyScales !== undefined) {
      const style = propertyScales[scaleName]
      if (style === undefined) throw new TypeError(`Unknown scale ${name}=${scaleName}`)
      styles.push(style)
      continue
    }

    const targets = artifact.shorthands[name]
    if (targets === undefined) throw new TypeError(`Unknown selection ${name}`)
    for (const target of targets) {
      const style = artifact.properties[target]?.[scaleName]
      if (style === undefined) throw new TypeError(`Unknown shorthand scale ${name}=${scaleName}`)
      styles.push(style)
    }
  }
  return Object.freeze(styles)
}

export function flattenStyleArray(styles: ReadonlyArray<SprinklesStyle>): SprinklesStyle {
  const merged: Record<string, SprinklesStyleValue> = {}
  for (const style of styles) Object.assign(merged, style)
  return Object.freeze(merged)
}

function createSelectionResult(
  styles: ReadonlyArray<SprinklesStyle>,
  strategyUsed: "atomic" | "fused",
): SprinklesSelectionResult {
  return Object.freeze({
    styles,
    strategyUsed,
    allocationUnits: 1 + styles.length,
    arrayLength: styles.length,
  })
}

function makeSetup(
  atomicStyleEntries: number,
  fusedStyleEntries: number,
  lookupContainers: number,
  mergedStyleObjects: number,
): StrategySetupAllocations {
  return Object.freeze({
    atomicStyleEntries,
    fusedStyleEntries,
    lookupContainers,
    mergedStyleObjects,
    totalModelAllocations: atomicStyleEntries + fusedStyleEntries + lookupContainers + mergedStyleObjects,
  })
}

function buildAtomicArtifact(fixture: SprinklesOutputFixture): AtomicArtifact {
  return Object.freeze({
    kind: "atomic",
    selectionAxes: fixture.selectionAxes,
    properties: fixture.properties,
    shorthands: fixture.shorthands,
  })
}

function buildFusedEntries(
  fixture: SprinklesOutputFixture,
  selections: ReadonlyArray<SprinklesSelection>,
  atomicArtifact: AtomicArtifact,
): Readonly<Record<string, SprinklesStyle>> {
  const entries: Record<string, SprinklesStyle> = {}
  for (const selection of selections) {
    const key = selectionKey(selection, fixture.selectionAxes)
    entries[key] = flattenStyleArray(resolveAtomicStyles(atomicArtifact, selection))
  }
  return Object.freeze(entries)
}

export function createSprinklesOutputStrategy(
  strategy: SprinklesOutputStrategy,
  fixture: SprinklesOutputFixture = sprinklesOutputFixture,
): SprinklesOutputRuntime {
  const atomicArtifact = buildAtomicArtifact(fixture)
  const atomicStyleEntries = countAtomicStyleEntries(fixture.properties)
  if (strategy === "atomic") {
    return Object.freeze({
      strategy,
      artifact: atomicArtifact,
      setup: makeSetup(atomicStyleEntries, 0, 1, 0),
      select: selection => createSelectionResult(resolveAtomicStyles(atomicArtifact, selection), "atomic"),
    })
  }

  if (strategy === "fused") {
    const fusedEntries = buildFusedEntries(fixture, fixture.selectionSpace, atomicArtifact)
    const fusedArtifact: FusedArtifact = Object.freeze({
      kind: "fused",
      selectionAxes: fixture.selectionAxes,
      entries: fusedEntries,
    })
    return Object.freeze({
      strategy,
      artifact: fusedArtifact,
      setup: makeSetup(0, fixture.selectionSpace.length, 1, fixture.selectionSpace.length),
      select: selection => {
        const key = selectionKey(selection, fixture.selectionAxes)
        const style = fusedEntries[key]
        if (style === undefined) throw new TypeError(`Fused strategy has no selection ${key}`)
        return createSelectionResult(Object.freeze([style]), "fused")
      },
    })
  }

  const hybridEntries = buildFusedEntries(fixture, fixture.hotSelections, atomicArtifact)
  const hybridArtifact: HybridArtifact = Object.freeze({
    kind: "hybrid",
    selectionAxes: fixture.selectionAxes,
    atomic: atomicArtifact,
    fused: hybridEntries,
  })
  return Object.freeze({
    strategy,
    artifact: hybridArtifact,
    setup: makeSetup(atomicStyleEntries, fixture.hotSelections.length, 2, fixture.hotSelections.length),
    select: selection => {
      const key = selectionKey(selection, fixture.selectionAxes)
      const style = hybridEntries[key]
      if (style !== undefined) return createSelectionResult(Object.freeze([style]), "fused")
      return createSelectionResult(resolveAtomicStyles(atomicArtifact, selection), "atomic")
    },
  })
}

export function createSprinklesOutputStrategies(
  fixture: SprinklesOutputFixture = sprinklesOutputFixture,
): Readonly<Record<SprinklesOutputStrategy, SprinklesOutputRuntime>> {
  return Object.freeze(Object.fromEntries(
    sprinklesOutputStrategies.map(strategy => [strategy, createSprinklesOutputStrategy(strategy, fixture)]),
  )) as Readonly<Record<SprinklesOutputStrategy, SprinklesOutputRuntime>>
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value !== "object" || value === null) return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalize(nested)]),
  )
}

export function serializeStrategyArtifact(artifact: SprinklesOutputArtifact): string {
  return JSON.stringify(canonicalize(artifact))
}

export function strategyArtifactBytes(artifact: SprinklesOutputArtifact): number {
  return new TextEncoder().encode(serializeStrategyArtifact(artifact)).byteLength
}

export function strategySelectionKey(selection: SprinklesSelection): string {
  return selectionKey(selection)
}
