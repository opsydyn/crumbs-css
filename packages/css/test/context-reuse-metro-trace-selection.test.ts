import { expect, it } from "bun:test";
import { isNewMetroTrace, metroTraceId, selectExactMetroTrace, type MetroTraceMatch } from "../bench/context-reuse/metro-trace-selection";

it("matches a restored Metro cache result to the exact earlier transform, not the latest trace", () => {
  const original: MetroTraceMatch = { id: "41:0", entryHash: "entry-original", sourceHash: "source-original", inputsHash: "inputs-original", metadataHash: "metadata-original", resultHash: "result-original" };
  const removed: MetroTraceMatch = { id: "41:2", entryHash: "entry-removed", sourceHash: "source-removed", inputsHash: "inputs-removed", metadataHash: "metadata-removed", resultHash: "result-removed" };
  const restored: MetroTraceMatch = { ...original, id: "41:3" };
  const expected = { entryHash: original.entryHash, sourceHash: original.sourceHash, inputsHash: original.inputsHash, metadataHash: original.metadataHash, resultHash: original.resultHash };
  const prior = new Set([metroTraceId({ pid: 41, sequence: 0 }), metroTraceId({ pid: 41, sequence: 2 })]);

  expect(selectExactMetroTrace([original, removed], expected)).toBe(original);
  expect(isNewMetroTrace(prior, original)).toBe(false);
  expect(selectExactMetroTrace([original, removed, restored], expected)).toBe(restored);
  expect(isNewMetroTrace(prior, restored)).toBe(true);
  expect(selectExactMetroTrace([original, { ...removed, metadataHash: original.metadataHash }], expected)).toBe(original);
});

it("requires entry, source, input, metadata and final result identities to match together", () => {
  const exact: MetroTraceMatch = { id: "10:1", entryHash: "e", sourceHash: "s", inputsHash: "i", metadataHash: "m", resultHash: "r" };
  const expected = { entryHash: "e", sourceHash: "s", inputsHash: "i", metadataHash: "m", resultHash: "r" };
  for (const key of Object.keys(expected) as (keyof typeof expected)[]) {
    expect(selectExactMetroTrace([{ ...exact, [key]: `${expected[key]}-stale` }], expected)).toBeUndefined();
  }
});
