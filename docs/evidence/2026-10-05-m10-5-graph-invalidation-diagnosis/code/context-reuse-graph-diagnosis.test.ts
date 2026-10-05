import { describe, expect, test } from "bun:test";
import { isCurrentGraphEntry } from "../bench/context-reuse/graph-diagnosis";
describe("M10.5 graph diagnosis current entry boundary", () => {
 test("rejects an older transform even when its native value is unchanged", () => {
  expect(isCurrentGraphEntry({entryHash:"old",diskEntryHash:"old"},"new")).toBe(false);
 });
 test("rejects missing trace and mixed disk/supplied bytes", () => {
  expect(isCurrentGraphEntry(undefined,"new")).toBe(false);
  expect(isCurrentGraphEntry({entryHash:"new",diskEntryHash:"old"},"new")).toBe(false);
 });
 test("accepts an exact entry-byte observation", () => {
  expect(isCurrentGraphEntry({entryHash:"new",diskEntryHash:"new"},"new")).toBe(true);
 });
});
