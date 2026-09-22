import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import {
  createSprinklesOutputStrategies,
  flattenStyleArray,
  serializeStrategyArtifact,
  sprinklesOutputFixture,
} from "../bench/sprinkles-output-workload"

describe("Sprinkles output strategy workload", () => {
  it("preserves the same resolved style semantics for atomic, fused, and hybrid output", () => {
    const strategies = createSprinklesOutputStrategies(sprinklesOutputFixture)
    const indices = fc.integer({ min: 0, max: sprinklesOutputFixture.selectionSpace.length - 1 })

    fc.assert(fc.property(indices, (index) => {
      const selection = sprinklesOutputFixture.selectionSpace[index]!
      const expected = flattenStyleArray(strategies.atomic.select(selection).styles)

      for (const strategy of [strategies.fused, strategies.hybrid]) {
        expect(flattenStyleArray(strategy.select(selection).styles)).toEqual(expected)
      }
    }), { numRuns: 100 })
  })

  it("keeps Cartesian expansion in the fused strategy and bounds hybrid precomputation to hot selections", () => {
    const strategies = createSprinklesOutputStrategies(sprinklesOutputFixture)
    const atomicEntryCount = Object.values(sprinklesOutputFixture.properties)
      .reduce((total, scales) => total + Object.keys(scales).length, 0)

    expect(strategies.atomic.artifact.kind).toBe("atomic")
    expect(strategies.atomic.setup.atomicStyleEntries).toBe(atomicEntryCount)
    expect(strategies.fused.artifact.kind).toBe("fused")
    expect(strategies.fused.setup.fusedStyleEntries).toBe(sprinklesOutputFixture.selectionSpace.length)
    expect(strategies.hybrid.artifact.kind).toBe("hybrid")
    expect(strategies.hybrid.setup.fusedStyleEntries).toBe(sprinklesOutputFixture.hotSelections.length)
    expect(strategies.hybrid.setup.fusedStyleEntries).toBeLessThan(strategies.fused.setup.fusedStyleEntries)
  })

  it("makes hybrid selection strategy and allocation observations explicit", () => {
    const strategies = createSprinklesOutputStrategies(sprinklesOutputFixture)
    const hot = sprinklesOutputFixture.hotSelections[0]!
    const cold = sprinklesOutputFixture.workload.find(selection =>
      !sprinklesOutputFixture.hotSelections.some(candidate => JSON.stringify(candidate) === JSON.stringify(selection)),
    )!

    expect(strategies.hybrid.select(hot)).toMatchObject({ strategyUsed: "fused", allocationUnits: 2 })
    expect(strategies.hybrid.select(cold)).toMatchObject({ strategyUsed: "atomic" })
    expect(strategies.fused.select(hot)).toMatchObject({ strategyUsed: "fused", allocationUnits: 2 })
    expect(strategies.atomic.select(hot).allocationUnits).toBeGreaterThanOrEqual(1)
  })

  it("serializes each artifact deterministically", () => {
    const first = createSprinklesOutputStrategies(sprinklesOutputFixture)
    const second = createSprinklesOutputStrategies(sprinklesOutputFixture)

    for (const strategy of ["atomic", "fused", "hybrid"] as const) {
      expect(serializeStrategyArtifact(first[strategy].artifact))
        .toBe(serializeStrategyArtifact(second[strategy].artifact))
    }
  })
})
