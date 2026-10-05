"use strict";
// Offline replay of archived observations. --live also checks the original inventory and owned copy.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { gunzipSync } = require("node:zlib");
const { createRequire } = require("node:module");
const { Script } = require("node:vm");
const root = path.resolve(__dirname, "../../..");
const ts = createRequire(path.join(root, "packages/css/package.json"))("typescript");
const sha = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const read = file => fs.readFileSync(path.join(__dirname, file));
const collection = JSON.parse(read("collection.json"));
assert.equal(collection.environment.floorNode, "v22.0.0");
assert.equal(collection.environment.currentNode, "v24.15.0");
assert.equal(collection.shippingRestored, true); assert.equal(collection.candidateRestored, true);
assert.equal(collection.rawReports.length, 16);
assert.equal(new Set(collection.rawReports.map(file => file.path)).size, 16);
const reports = new Map();
for (const file of collection.rawReports) {
  const bytes = read(file.path); assert.equal(sha(bytes), file.sha256);
  const report = JSON.parse(gunzipSync(bytes)); reports.set(file.path.replace(".json.gz", ""), report);
  assert.equal(report.failure, undefined); assert.equal(report.restored, true);
  if (!file.path.includes("shipping")) {
    assert.equal(report.closed.state, "closed");
    for (const key of ["live", "retained", "creating", "disposing", "quarantined", "pending", "cleanupFailures"]) assert.equal(report.closed[key], 0);
  }
}
function semantic(code) {
  const output = ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Script(output).runInNewContext({ exports, require: name => name === "react-native" ? { StyleSheet: { create: value => value } } : {} });
  return JSON.parse(JSON.stringify(exports));
}
function success(report) {
  for (const row of report.operations) { assert.equal(row.error, undefined); assert(row.result); }
}
const card = (width, opacity = 0.5) => ({ backgroundColor: "#123456", opacity, width });
const radius = { borderBottomLeftRadius: 9, borderBottomRightRadius: 9, borderTopLeftRadius: 9, borderTopRightRadius: 9 };
const goldens = [card(24), card(24), { height: 27 }, { height: 27 }, card(24), { height: 27 }, radius, card(54), card(54), card(84), card(84, 0.75), { width: 7 }, null, null, radius, { width: 31 }];
const entries = ["A", "A", "B", "B", "A", "B", "C", "A", "A", "A", "A", "A", "bad", "bad", "C", "bad"];
function matrix(report) {
  assert.equal(report.operations.length, 16);
  for (const [index, row] of report.operations.entries()) {
    assert.equal(row.operationId, index); assert.equal(row.entry, entries[index]);
    if (index === 12) { assert.equal(row.error?.name, "NativeIrAdmissionError"); assert.match(row.error.message, /CRUMBS_IR_INVALID_VALUE.*Invalid position/); assert.equal(row.result, undefined); }
    else if (index === 13) { assert.equal(row.error?.name, "Error"); assert.match(row.error.message, /Build failed with 1 error:[\s\S]*Unexpected token/); assert.equal(row.result, undefined); }
    else { assert.equal(row.error, undefined); assert(row.result); assert.deepEqual(semantic(row.result.code).card, goldens[index]); }
  }
}
const exactRows = report => report.operations.map(({ operationId, entry, settings, result, error }) => ({ operationId, entry, settings, result, error }));
let exactResultComparisons = 0;
for (const group of ["current", "floor"]) {
  const fresh = reports.get(`${group}-fresh-matrix`); matrix(fresh);
  assert.equal(fresh.node, collection.environment[`${group === "floor" ? "floor" : "current"}Node`]);
  for (const mode of ["immediate", "repeat"]) {
    const retained = reports.get(`${group}-${mode}-matrix`); matrix(retained);
    assert.equal(retained.compilerKey, fresh.compilerKey); assert.equal(retained.node, fresh.node);
    assert.deepEqual(exactRows(retained), exactRows(fresh)); assert.deepEqual(retained.receipts, fresh.receipts);
    assert(retained.closed.hits > 0); exactResultComparisons += fresh.operations.length;
  }
}
const direct = reports.get("current-fresh-direct"); success(direct); assert.equal(direct.operations.length, 4);
for (const mode of ["immediate", "repeat"]) {
  const retained = reports.get(`current-${mode}-direct`); success(retained);
  assert.deepEqual(exactRows(retained), exactRows(direct)); assert.deepEqual(retained.receipts, direct.receipts); assert(retained.closed.hits > 0);
  exactResultComparisons += direct.operations.length;
}
const fresh = reports.get("current-fresh-matrix"), absent = reports.get("current-absent"); matrix(absent);
assert.deepEqual(exactRows(absent), exactRows(fresh)); assert.equal(absent.closed.hits, 0); exactResultComparisons += fresh.operations.length;
const shipping = reports.get("current-shipping-matrix"); matrix(shipping); assert.notEqual(shipping.compilerKey, fresh.compilerKey);
for (const row of fresh.operations) {
  const other = shipping.operations.find(item => item.operationId === row.operationId); assert(other);
  assert.deepEqual(row.error, other.error);
  if (row.result) { assert.deepEqual(semantic(row.result.code), semantic(other.result.code)); assert.deepEqual(row.result.__crumbsNativeStyles, other.result.__crumbsNativeStyles); }
}
const normal = reports.get("negative-normal"), stale = reports.get("negative-stale"); success(normal); success(stale);
assert.equal(normal.receipts.at(-1).receipt.source, stale.receipts.at(-1).receipt.source);
assert.notDeepEqual(normal.receipts.at(-1).evaluatedReceipt.inputs, stale.receipts.at(-1).evaluatedReceipt.inputs);
assert.notDeepEqual(normal.operations.at(-1).result.__crumbsNativeStyles, stale.operations.at(-1).result.__crumbsNativeStyles);
assert.notDeepEqual(normal.operations.at(-1).result, stale.operations.at(-1).result);
const bypass = reports.get("current-bypass"), artifact = reports.get("current-artifact"), unstable = reports.get("current-unstable");
for (const report of [bypass, artifact, unstable]) success(report);
assert.equal(bypass.operations[1].snapshot.lastBypassReason, "entry-buffer-mismatch");
assert.equal(bypass.operations[2].snapshot.lastBypassReason, "unknown-build-option");
assert.equal(bypass.operations[3].snapshot.state, "disabled"); assert.equal(bypass.operations[3].snapshot.lastBypassReason, "package-info-changed");
assert.equal(artifact.operations[1].snapshot.state, "disabled"); assert.equal(artifact.operations[1].snapshot.lastBypassReason, "loaded-artifact-changed");
assert.equal(unstable.operations[0].snapshot.retained, 0); assert.equal(unstable.operations[0].snapshot.lastBypassReason, "source-unstable");
assert.equal(collection.artifact.patchReceipt.length, 6); assert(collection.artifact.patchReceipt.every(edit => edit.matches === 1));
for (const [file, source] of [["copied-transformer.ts.txt", "src/transformer.ts"], ["qualification-adapter.ts.txt", "src/qualification-adapter.ts"]]) {
  assert.equal(sha(read(file)), collection.artifact.sourceFiles.find(item => item.path === source).copiedSha256);
}
const changedSources = collection.artifact.sourceFiles.filter(file => file.originalSha256 !== file.copiedSha256).map(file => file.path);
assert.deepEqual(changedSources, ["src/qualification-adapter.ts", "src/transformer.ts"]);
for (const file of collection.artifact.originalFiles.filter(file => file.path.includes("/packages/css/dist/"))) {
  const copied = path.join(collection.artifact.packageRoot, "dist", file.path.split("/packages/css/dist/")[1]);
  assert.equal(collection.artifact.artifactFiles.find(item => item.path === copied)?.sha256, file.sha256);
}
if (process.argv.includes("--live")) {
  for (const file of collection.artifact.originalFiles) { const original = file.path.includes("/packages/css/") ? path.join(root, "packages/css", file.path.split("/packages/css/")[1]) : file.path; assert.equal(sha(fs.readFileSync(original)), file.sha256); }
  for (const file of collection.tooling) assert.equal(sha(fs.readFileSync(path.join(root, file.path))), file.sha256);
  for (const file of collection.artifact.artifactFiles) assert.equal(sha(fs.readFileSync(file.path)), file.sha256);
  for (const file of collection.fixture.files) assert.equal(sha(fs.readFileSync(file.path)), file.sha256);
  for (const file of collection.artifact.sourceFiles) assert.equal(sha(fs.readFileSync(path.join(collection.artifact.packageRoot, file.path))), file.copiedSha256);
}
console.log(JSON.stringify({ rawReports: reports.size, exactResultComparisons, shippingSemanticComparisons: shipping.operations.length, staleControlRejected: true, expectedOutcomes: true, liveHashesChecked: process.argv.includes("--live") }));
