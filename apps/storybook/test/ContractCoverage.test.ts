import { describe, expect, it } from "bun:test"
import {
  enumerateContractReviewCases,
  generatePairwiseRows,
} from "../scripts/contract-coverage-model"

describe("reference contract coverage model", () => {
  it("chooses a deterministic pairwise theme sample without losing any pair", () => {
    const axes = [
      { name: "brand", values: ["foundry", "signal"] },
      { name: "mode", values: ["dark", "light"] },
      { name: "density", values: ["compact", "comfortable"] },
    ] as const

    const rows = generatePairwiseRows(axes)
    expect(rows).toHaveLength(4)

    for (let left = 0; left < axes.length; left += 1) {
      for (let right = left + 1; right < axes.length; right += 1) {
        for (const leftValue of axes[left]!.values) {
          for (const rightValue of axes[right]!.values) {
            expect(rows.some(row =>
              row[axes[left]!.name] === leftValue &&
              row[axes[right]!.name] === rightValue,
            )).toBe(true)
          }
        }
      }
    }
  })

  it("enumerates every public recipe state and identifies contract-unreachable selections", () => {
    const recipe = {
      contract: {
        identity: { owner: "@crumbs/storybook", name: "Action", version: 1 },
        public: {
          slots: ["root"],
          variants: {
            disabled: ["false", "true"],
            pressed: ["false", "true"],
          },
        },
      },
      stateVariants: {
        disabled: {
          false: { pressed: [false, true] },
          true: { pressed: [false] },
        },
      },
    } as const

    const cases = enumerateContractReviewCases(recipe)

    expect(cases).toHaveLength(4)
    expect(cases.filter(reviewCase => reviewCase.status === "reachable")).toHaveLength(3)
    expect(cases.find(reviewCase => reviewCase.status === "unreachable")).toMatchObject({
      selection: { disabled: true, pressed: true },
      reason: "state disabled=true allows pressed=false, received true",
    })
  })

  it("treats a recipe without public variants as one reachable base case", () => {
    expect(enumerateContractReviewCases({
      contract: {
        identity: { owner: "@crumbs/storybook", name: "Dialog", version: 1 },
        public: { slots: ["root"], variants: {} },
      },
    })).toEqual([{ selection: {}, status: "reachable" }])
  })
})
