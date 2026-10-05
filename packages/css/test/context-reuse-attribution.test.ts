import { expect, it } from "bun:test";
import { createAttribution, instrumentGuardSource } from "../bench/context-reuse/guard-attribution";
import { readFileSync } from "node:fs";
import { join } from "node:path";
it("nested guard measurements conserve exclusive time and preserve return values", () => {
  let now = 0; const profile = createAttribution(() => now);
  const outer = profile.begin("session"); now = 2;
  expect(profile.measure("read-bytes", () => { now = 7; return 42; })).toBe(42);
  now = 10; profile.end(outer);
  const rows = profile.drain();
  expect(rows.find(row => row.phase === "session")).toMatchObject({ calls: 1, inclusiveMs: 10, exclusiveMs: 5 });
  expect(rows.find(row => row.phase === "read-bytes")).toMatchObject({ calls: 1, inclusiveMs: 5, exclusiveMs: 5 });
  expect(profile.drain()).toEqual([]);
});
it("instrumentation preserves the original thrown error and records failed operations", () => {
  let now = 0; const profile = createAttribution(() => now), error = new Error("same failure");
  expect(() => profile.measure("sha256", () => { now = 3; throw error; })).toThrow(error);
  expect(profile.drain()).toEqual([{ phase: "sha256", calls: 1, inclusiveMs: 3, exclusiveMs: 3 }]);
});
it("cannot drain or close spans out of order while an async operation remains active", async () => {
  const profile = createAttribution(() => 0), outer = profile.begin("session"), inner = profile.begin("rebuild");
  expect(() => profile.end(outer)).toThrow("order");
  expect(() => profile.drain()).toThrow("active");
  await Promise.resolve(); profile.end(inner); profile.end(outer);
  expect(profile.drain()).toHaveLength(2);
});
it("disabled profiling preserves calls without collecting clocks or byte receipts", () => {
  const profile = createAttribution(() => { throw Error("Clock must not run"); }, false);
  expect(profile.measure("sha256", () => "same")).toBe("same");
  const span = profile.begin("session"); profile.end(span); expect(profile.drain()).toEqual([]);
});
it("AST instrumentation checks actual guard boundaries and rejects changed function shapes", () => {
  const dir = join(import.meta.dir, "../bench/context-reuse");
  for (const filename of ["identity.ts", "compile-session.ts"] as const) {
    const source = readFileSync(join(dir, filename), "utf8"), result = instrumentGuardSource(filename, source);
    expect(result.source).toContain("./guard-profile");
    expect(result.operations.every(row => row.matches > 0)).toBe(true);
    expect(result.operations.some(row => row.phase === "read-bytes")).toBe(true);
    expect(result.operations.some(row => row.phase === "sha256")).toBe(true);
    expect(() => instrumentGuardSource(filename, source.replace(filename === "identity.ts" ? "function captureConfiguration" : "function sourceInventory", "function renamedGuard"))).toThrow("Expected");
  }
});
it("keeps awaited call arguments in their async scope", () => {
  const source = readFileSync(join(import.meta.dir, "../bench/context-reuse/compile-session.ts"), "utf8");
  const result = instrumentGuardSource("compile-session.ts", source);
  expect(() => new Bun.Transpiler({ loader: "ts" }).transformSync(result.source)).not.toThrow();
});
it("attributes file bytes to the enclosing guard rather than a nested hash span", () => {
  let now = 0; const profile = createAttribution(() => now), outer = profile.begin("configuration");
  profile.measure("sha256", () => profile.read(() => { now = 2; return "é"; }));
  profile.end(outer);
  expect(profile.drain().find(row => row.phase === "read-bytes")).toMatchObject({ calls: 1, bytesRead: 2, readGroups: { configuration: { calls: 1, bytesRead: 2 } } });
});
