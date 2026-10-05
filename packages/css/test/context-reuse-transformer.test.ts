import { afterAll, expect, it } from "bun:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { Script } from "node:vm";
import ts from "typescript";
import { resolve } from "node:path";
import { byteHash, runTransformerProbe, transformerFixture } from "./support/context-reuse-transformer";
import { buildCandidate, patchTransformer, shippingInventory } from "../bench/context-reuse/build-candidate";
const roots: string[] = [];
afterAll(() => { for (const root of roots) rmSync(root, { recursive: true, force: true }); });
const original = readFileSync(resolve(import.meta.dir, "../src/transformer.ts"), "utf8");
it("AST seam checks unique matches and preserves the native lowering tail verbatim", () => {
  const patch = patchTransformer(original);
  expect(patch.patchReceipt).toEqual([
    { operation: "native-helper-rename", matches: 1 }, { operation: "receipt-parameter", matches: 1 },
    { operation: "compile-capture-replacement", matches: 1 }, { operation: "native-gate-wrapper", matches: 1 },
    { operation: "metro-entry-buffer", matches: 1 }, { operation: "private-adapter-import", matches: 1 },
  ]);
  expect(patch.source).toContain("qualificationRunNative");
  const tail = original.slice(original.indexOf("  const nativeValuesByClass", original.indexOf("async function transformCssTsToStyleSheetWithMetadata")), original.indexOf("function nativeStylesDistRoot"));
  expect(patch.source).toContain(tail);
  expect(() => patchTransformer(original.replace("let capturedInputs:", "let absentInputs:"))).toThrow();
  expect(() => patchTransformer(original + "\n" + original)).toThrow();
  expect(() => patchTransformer(original.replace("esbuildOptions: { plugins: [capturePlugin] }", "esbuildOptions: { plugins: [capturePlugin], conditions: [\"unknown\"] }"))).toThrow();
});
it("builds an owned artifact with provenance instead of changing shipping outputs", async () => {
  const root = realpathSync(mkdtempSync(`${tmpdir()}/crumbs-candidate-`)); roots.push(root);
  const artifact = await buildCandidate(root);
  expect(artifact.transformerPath).toBe(`${root}/package/dist/qualification-transformer.cjs`);
  expect(artifact.artifactFiles.length).toBeGreaterThan(0);
  expect(artifact.patchReceipt.every((item: { matches: number }) => item.matches === 1)).toBe(true);
  expect(readFileSync(resolve(import.meta.dir, "../src/transformer.ts"), "utf8")).toBe(original);
}, 120000);

let built: Promise<Awaited<ReturnType<typeof buildCandidate>>> | undefined;
let fixture: ReturnType<typeof transformerFixture>;
function candidate() {
  built ??= (async () => { const root = realpathSync(mkdtempSync(`${tmpdir()}/crumbs-transform-parity-`)); roots.push(root); const artifact = await buildCandidate(root); fixture = transformerFixture(root, artifact); return artifact; })();
  return built;
}
const results = (report: any) => report.operations.map((row: any) => ({ operationId: row.operationId, entry: row.entry, settings: row.settings, result: row.result, error: row.error }));
function assertSuccess(report: any) {
  assert.equal(report.failure, undefined);
  assert.equal(report.restored, true);
  for (const row of report.operations) { assert.equal(row.error, undefined); assert(row.result); }
}
function assertMatrix(report: any) {
  assert.equal(report.failure, undefined); assert.equal(report.restored, true);
  assert.equal(report.operations.length, 16);
  const cardA = (width: number, opacity = 0.5) => ({ backgroundColor: "#123456", opacity, width });
  const radius = { borderBottomLeftRadius: 9, borderBottomRightRadius: 9, borderTopLeftRadius: 9, borderTopRightRadius: 9 };
  const goldens = [cardA(24), cardA(24), { height: 27 }, { height: 27 }, cardA(24), { height: 27 }, radius, cardA(54), cardA(54), cardA(84), cardA(84, 0.75), { width: 7 }, null, null, radius, { width: 31 }];
  const entries = ["A", "A", "B", "B", "A", "B", "C", "A", "A", "A", "A", "A", "bad", "bad", "C", "bad"];
  for (const [index, row] of report.operations.entries()) {
    assert.equal(row.operationId, index); assert.equal(row.entry, entries[index]);
    if (index === 12) { assert.equal(row.error?.name, "NativeIrAdmissionError"); assert.match(row.error.message, /CRUMBS_IR_INVALID_VALUE.*Invalid position/); assert.equal(row.result, undefined); }
    else if (index === 13) { assert.equal(row.error?.name, "Error"); assert.match(row.error.message, /Build failed with 1 error:[\s\S]*Unexpected token/); assert.equal(row.result, undefined); }
    else { assert.equal(row.error, undefined, `Unexpected failure for operation ${index}`); assert(row.result); assert.deepEqual(semanticExports(row.result.code).card, goldens[index]); }
  }
}
it("one candidate artifact gives exact receipts, metadata, Metro results and diagnostics across modes", async () => {
  const artifact = await candidate(); const before = artifact.artifactFiles.map(file => byteHash(file.path));
  const fresh = runTransformerProbe("node", artifact, fixture, "fresh");
  assertMatrix(fresh);
  const unexpectedFailure = structuredClone(fresh);
  unexpectedFailure.operations[15] = { ...unexpectedFailure.operations[15], result: undefined, error: { name: "Error", message: "unexpected repaired transform failure" } };
  expect(() => assertMatrix(unexpectedFailure)).toThrow();
  for (const mode of ["immediate", "repeat"] as const) {
    const report = runTransformerProbe("node", artifact, fixture, mode);
    assertMatrix(report);
    expect(report.compilerKey).toBe(fresh.compilerKey);
    expect(results(report)).toEqual(results(fresh)); expect(report.receipts).toEqual(fresh.receipts);
    expect(report.operations.some((row: any) => row.snapshot.hits > 0)).toBe(true);
    expect(report.closed).toMatchObject({ state: "closed", live: 0 }); expect(report.restored).toBe(true);
  }
  assertMatrix(fresh);
  expect(artifact.artifactFiles.map(file => byteHash(file.path))).toEqual(before);
  expect(shippingInventory()).toEqual(artifact.originalFiles);
}, 120000);
it("stale-input negative control diverges native metadata/results despite the same rebuilt source", async () => {
  const artifact = await candidate(); const normal = runTransformerProbe("node", artifact, fixture, "immediate", "negative");
  const stale = runTransformerProbe("node", artifact, fixture, "immediate", "negative", true);
  assertSuccess(normal); assertSuccess(stale);
  expect(stale.receipts.at(-1).receipt.source).toBe(normal.receipts.at(-1).receipt.source);
  expect(stale.receipts.at(-1).evaluatedReceipt.inputs).not.toEqual(normal.receipts.at(-1).evaluatedReceipt.inputs);
  expect(stale.operations.at(-1).result).not.toEqual(normal.operations.at(-1).result);
}, 120000);
it("buffer, unknown option, package-cache, artifact and unstable-input cases expose their bypass scope", async () => {
  const artifact = await candidate(); const bypass = runTransformerProbe("node", artifact, fixture, "immediate", "bypass");
  assertSuccess(bypass);
  expect(bypass.operations[1].snapshot.lastBypassReason).toBe("entry-buffer-mismatch");
  expect(bypass.operations[2].snapshot.lastBypassReason).toBe("unknown-build-option");
  expect(bypass.operations[3].snapshot).toMatchObject({ state: "disabled", lastBypassReason: "package-info-changed" });
  const changed = runTransformerProbe("node", artifact, fixture, "immediate", "artifact");
  assertSuccess(changed);
  expect(changed.operations[1].snapshot).toMatchObject({ state: "disabled", lastBypassReason: "loaded-artifact-changed" });
  const unstable = runTransformerProbe("node", artifact, fixture, "immediate", "unstable");
  assertSuccess(unstable);
  expect(unstable.operations[0].snapshot).toMatchObject({ retained: 0, lastBypassReason: "source-unstable" });
}, 120000);

function semanticExports(code: string) {
  const source = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports: Record<string, unknown> = {};
  new Script(source).runInNewContext({ exports, require: (name: string) => name === "react-native" ? { StyleSheet: { create: (value: unknown) => value } } : {} });
  return JSON.parse(JSON.stringify(exports));
}
it("shipping-fresh and candidate-fresh share semantic goldens with their genuine different compiler keys", async () => {
  const artifact = await candidate(); const report = runTransformerProbe("node", artifact, fixture, "fresh");
  const shipping = runTransformerProbe("node", { ...artifact, transformerPath: resolve(import.meta.dir, "../dist/transformer.cjs") }, fixture, "fresh");
  assertMatrix(report); assertMatrix(shipping);
  expect(shipping.compilerKey).not.toBe(report.compilerKey);
  for (let index = 0; index < report.operations.length; index++) {
    const actual = report.operations[index]; const reference = shipping.operations.find((row: any) => row.operationId === actual.operationId);
    expect(actual.error).toEqual(reference.error);
    if (actual.result) { expect(semanticExports(actual.result.code)).toEqual(semanticExports(reference.result.code)); expect(actual.result.__crumbsNativeStyles).toEqual(reference.result.__crumbsNativeStyles); }
  }
  expect(semanticExports(report.operations[0].result.code).card).toEqual({ backgroundColor: "#123456", opacity: 0.5, width: 24 });
}, 120000);
it("absence of candidate configuration stays fresh", async () => {
  const artifact = await candidate(); const fresh = runTransformerProbe("node", artifact, fixture, "fresh");
  const absent = runTransformerProbe("node", artifact, fixture, "absent");
  assertMatrix(fresh); assertMatrix(absent);
  expect(results(absent)).toEqual(results(fresh)); expect(absent.closed.live).toBe(0);
}, 120000);
it.skipIf(!process.env.CRUMBS_AUDIT_NODE_FLOOR)("explicit exact Node 22.0.0 runs complete-transform modes", async () => {
  const artifact = await candidate();
  const floor = process.env.CRUMBS_AUDIT_NODE_FLOOR!;
  expect(Bun.spawnSync([floor, "--version"]).stdout.toString().trim()).toBe("v22.0.0");
  const baseline = runTransformerProbe(floor, artifact, fixture, "fresh");
  assertMatrix(baseline);
  expect(baseline.node).toBe("v22.0.0");
  for (const mode of ["immediate", "repeat"] as const) {
    const report = runTransformerProbe(floor, artifact, fixture, mode);
    assertMatrix(report);
    expect(results(report)).toEqual(results(baseline)); expect(report.receipts).toEqual(baseline.receipts);
    expect(report.operations.some((row: any) => row.snapshot.hits > 0)).toBe(true); expect(report.closed.live).toBe(0); expect(report.restored).toBe(true);
  }
}, 120000);

it("direct stylesheet and manifest-sidecar entrypoints share the same receipt gate", async () => {
  const artifact = await candidate(); const fresh = runTransformerProbe("node", artifact, fixture, "fresh", "direct");
  assertSuccess(fresh);
  for (const mode of ["immediate", "repeat"] as const) {
    const retained = runTransformerProbe("node", artifact, fixture, mode, "direct");
    assertSuccess(retained);
    expect(results(retained)).toEqual(results(fresh)); expect(retained.receipts).toEqual(fresh.receipts);
    expect(retained.operations.at(-1).snapshot.hits).toBeGreaterThan(0); expect(retained.closed.live).toBe(0);
  }
}, 120000);
