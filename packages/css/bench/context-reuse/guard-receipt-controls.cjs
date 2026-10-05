"use strict";
// Supplementary owned-fixture controls, outside all timed measurements.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), cp = require("node:child_process");
const [root, kind, output] = process.argv.slice(2);
const fixture = JSON.parse(fs.readFileSync(path.join(root, "report.json"))).fixture;
const spec = JSON.parse(fs.readFileSync(path.join(root, "seven-entry-0-immediate-on-spec.json")));
const t = require(fixture.artifact.transformerPath), entry = fixture.entries[0];
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const originals = new Map();
function edit(file, text) { if (!originals.has(file)) originals.set(file, { bytes: fs.readFileSync(file), stat: fs.statSync(file) }); fs.writeFileSync(file, text); }
t.__crumbsQualificationProfileDrain();
async function run(buffer = fs.readFileSync(entry)) {
  const result = await t.transform(spec.config, fixture.app, spec.entries[0], buffer, spec.options);
  const phases = t.__crumbsQualificationProfileDrain(), receipts = t.__crumbsQualificationDrainReceipts();
  if (receipts.length !== 1) throw Error("Expected one current receipt");
  const receipt = receipts[0].receipt;
  const store = path.join(root, "control-receipts"); fs.mkdirSync(store, { recursive: true });
  for (const [kind, value] of Object.entries({ source: receipt.source, inputs: receipt.inputs, metadata: result.__crumbsNativeStyles, result })) {
    const bytes = kind === "source" ? value : JSON.stringify(value);
    fs.writeFileSync(path.join(store, kind + "-" + hash(bytes) + ".json.gz"), require("node:zlib").gzipSync(Buffer.from(bytes)));
  }
  return { sourceHash: hash(receipt.source), inputsHash: hash(JSON.stringify(receipt.inputs)), metadataHash: hash(JSON.stringify(result.__crumbsNativeStyles)), resultHash: hash(JSON.stringify(result)), phases, snapshot: t.__crumbsQualificationSnapshot() };
}
(async () => {
  let before, after, error, failedPhases, reference;
  try {
    if (kind === "reference") { after = await run(); }
    else {
      if (kind === "unstable") { originals.set(entry, { bytes: fs.readFileSync(entry), stat: fs.statSync(entry) }); t.__crumbsQualificationUnstableOnce(entry, fs.readFileSync(entry, "utf8")); }
      before = await run();
      const changed = fs.readFileSync(entry, "utf8").replace("40000", "50000");
      if (kind === "repair") {
        edit(entry, "export const broken = ;");
        try { await run(); throw Error("Broken stylesheet admitted"); }
        catch (e) { if (e.message === "Broken stylesheet admitted") throw e; error = { name: e.name, message: e.message }; failedPhases = t.__crumbsQualificationProfileDrain(); t.__crumbsQualificationDrainReceipts(); }
        fs.writeFileSync(entry, originals.get(entry).bytes); after = await run();
      } else if (kind === "entry") {
        edit(entry, changed); const old = originals.get(entry).stat; fs.utimesSync(entry, old.atime, old.mtime); after = await run();
      } else if (kind === "buffer") after = await run(Buffer.from("export const stale = 1;"));
      else if (kind === "unknown") { t.__crumbsQualificationOptionsOnce({ alias: {} }); after = await run(); }
      else if (kind === "unstable") { t.__crumbsQualificationUnstableOnce(entry, changed); after = await run(); }
      else if (kind === "package") { const file = path.join(fixture.app, "package.json"); const value = JSON.parse(fs.readFileSync(file)); edit(file, JSON.stringify({ ...value, name: "guard-receipts-renamed-fixture" })); after = await run(); }
      else if (kind === "artifact") { const file = fixture.artifact.transformerPath; edit(file, fs.readFileSync(file, "utf8") + "\n// owned loaded-artifact control\n"); after = await run(); }
      else throw Error("Unknown control");
      const referenceConfig = path.join(root, "reference-session.json");
      const config = JSON.parse(fs.readFileSync(process.env.CRUMBS_CONTEXT_QUALIFICATION_CONFIG));
      fs.writeFileSync(referenceConfig, JSON.stringify({ ...config, mode: "fresh", settings: { capacity: 8, admission: "immediate" } }));
      const referenceOutput = output + ".reference.json";
      const child = cp.spawnSync(process.execPath, [__filename, root, "reference", referenceOutput], { env: { ...process.env, CRUMBS_CONTEXT_QUALIFICATION_CONFIG: referenceConfig }, encoding: "utf8", timeout: 120000 });
      if (child.status !== 0) throw Error("Fresh reference failed: " + child.stderr);
      reference = JSON.parse(fs.readFileSync(referenceOutput)).after;
      for (const key of ["sourceHash", "inputsHash", "metadataHash", "resultHash"]) if (kind !== "package" && after[key] !== reference[key]) throw Error("Fresh control parity failed " + kind + " " + key);
    }
  } finally {
    for (const [file, original] of originals) { fs.writeFileSync(file, original.bytes); fs.utimesSync(file, original.stat.atime, original.stat.mtime); }
    await t.__crumbsQualificationClose();
  }
  const restored = [...originals].map(([file, value]) => ({ path: file, originalSha256: hash(value.bytes), restoredSha256: hash(fs.readFileSync(file)) }));
  fs.writeFileSync(output, JSON.stringify({ node: process.version, kind, deduplicate: process.env.CRUMBS_GUARD_RECEIPTS === "1", before, after, error, failedPhases, reference, restored, closed: t.__crumbsQualificationSnapshot() }));
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
