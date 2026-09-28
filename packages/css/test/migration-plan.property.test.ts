import { describe, expect, it } from "bun:test"
import * as fc from "fast-check"
import { applySourceEdits, type SourceEdit } from "../src/tooling/migrations/ast"

const editCode = "source.unsupported-syntax" as const
const identifier = fc.stringMatching(/^[a-z][a-z0-9]{0,6}$/u)
const segments = fc.array(identifier, { minLength: 1, maxLength: 12 })
const shuffleKeys = fc.array(fc.nat(), { minLength: 12, maxLength: 12 })

describe("safe source migration planner properties", () => {
  it("applies-generated-static-member-edits-independent-of-input-order", () => {
    fc.assert(fc.property(segments, shuffleKeys, (path, keys) => {
      const source = `tokens.${path.join(".")}`
      const edits: SourceEdit[] = []
      let offset = "tokens".length
      for (const segment of path) {
        const start = offset + 1
        edits.push({ start, end: start + segment.length, replacement: `${segment}Next`, code: editCode })
        offset = start + segment.length
      }
      const order = path.map((_, index) => index).sort((left, right) => keys[left]! - keys[right]! || left - right)
      const permuted = order.map(index => edits[index]!)
      const expected = `tokens.${path.map(segment => `${segment}Next`).join(".")}`
      expect(applySourceEdits(source, edits)).toBe(expected)
      expect(applySourceEdits(source, permuted)).toBe(expected)
    }), { numRuns: 150 })
  })
})
