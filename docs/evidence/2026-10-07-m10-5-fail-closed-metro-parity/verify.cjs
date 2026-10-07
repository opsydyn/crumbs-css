const { createHash } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { resolve, join } = require("node:path");

const evidence = __dirname;
const repository = resolve(evidence, "../../..");
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const readJson = path => JSON.parse(readFileSync(join(evidence, path), "utf8"));
const fail = message => { throw new Error(message); };

const archive = readJson("archive-manifest.json");
for (const row of archive.files) {
  const actual = sha256(readFileSync(join(evidence, row.path)));
  if (actual !== row.sha256) fail(`Archive hash mismatch: ${row.path}`);
}

const sourceManifest = readJson("source-manifest.json");
for (const row of sourceManifest.files) {
  const actual = sha256(readFileSync(join(repository, row.path)));
  if (actual !== row.sha256) fail(`Source hash mismatch: ${row.path}`);
}

const report = readJson("qualification.json");
if (report.status !== "passed" || report.checks.stageParity !== true || report.checks.fixtureRestored !== true || report.checks.serverShutdown !== true) {
  fail("The retained Metro control did not pass all required gates");
}
const stages = report.stages;
const required = ["initial", "entry-edit", "import-removal", "entry-restored"];
if (stages.length !== required.length || stages.some((row, index) => row.kind !== required[index])) fail("Required stage order differs");
for (const stage of stages) {
  if (stage.status !== 200 || !stage.expectedPresent || !stage.previousAbsent) fail(`Bundle behavior failed at ${stage.kind}`);
  for (const field of ["entry", "source", "inputs", "metadata", "result"]) {
    if (!Array.isArray(stage[field]) || stage[field].length !== 2 || stage[field][0] !== stage[field][1]) fail(`${field} parity failed at ${stage.kind}`);
  }
}
if (stages[1].bypassReason !== "source-changed" || stages[2].bypassReason !== "source-changed") fail("Changed sources did not fail closed");
if (stages[3].traceResolution !== "exact-prior-transform-cache-hit") fail("Restored entry was not attributed to an exact prior Metro cache result");

const observations = readJson("metro-observations.json");
if (observations.length !== required.length) fail("Observation stage count differs");
const trace = readFileSync(join(evidence, "transform-trace.jsonl"), "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
for (let index = 0; index < required.length; index++) {
  const row = observations[index];
  if (row.kind !== required[index] || row.referenceMatched !== true) fail(`Observation reference mismatch at ${required[index]}`);
  const actual = row.actual;
  const reference = row.reference;
  if (!actual || !reference || actual.entryHash !== row.currentEntryHash) fail(`Entry identity missing at ${required[index]}`);
  if (actual.receipts?.[0]?.sourceHash !== reference.sourceHash || actual.receipts?.[0]?.inputsHash !== reference.inputsHash
      || row.actualMetadataHash !== row.referenceMetadataHash || row.referenceMetadataHash !== reference.metadataHash || actual.resultHash !== reference.resultHash) {
    fail(`Selected Metro transform differs from fresh reference at ${required[index]}`);
  }
  if (!trace.some(item => item.pid === actual.pid && item.sequence === actual.sequence && item.entryHash === actual.entryHash && item.resultHash === actual.resultHash)) {
    fail(`Selected transform is absent from retained worker trace at ${required[index]}`);
  }
}

const restoration = readJson("restoration.json");
if (!restoration.files.length || restoration.files.some(row => row.originalSha256 !== row.restoredSha256)
    || restoration.link.originalTarget !== restoration.link.restoredTarget) fail("Fixture restoration failed");
if (report.shutdown.exitCode !== 0 || report.shutdown.survivors.length !== 0) fail("Owned Metro server shutdown was not clean");

console.log(`M10.5 fail-closed Metro evidence verified: ${stages.length} stages, ${trace.length} transform traces, ${sourceManifest.files.length} pinned source files.`);
