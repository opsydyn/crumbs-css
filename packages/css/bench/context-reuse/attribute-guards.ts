import { mkdirSync, readFileSync, writeFileSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { buildAttributionCandidate } from "./guard-attribution";
import { prepareQualificationFixture } from "./qualification-fixture";
import { qualificationHash as hash } from "./qualify";
import { shippingInventory } from "./build-candidate";
export function guardAttributionPlan(blocks = 5) {
  if (!Number.isSafeInteger(blocks) || blocks < 1 || blocks > 5) throw Error("Invalid attribution blocks");
  const rows: { id: string; workload: string; block: number; mode: string; capacity: number; profile: boolean }[] = [];
  for (const workload of ["seven-entry", "hot-scan", "32-entry"]) for (let block = 0; block < blocks; block++) {
    const variants = ["fresh", "immediate", "repeat"].flatMap(mode => [false, true].map(profile => ({ mode, profile })));
    if (block % 2) variants.reverse();
    for (const row of variants) rows.push({ id: `${workload}-${block}-${row.mode}-${row.profile ? "on" : "off"}`, workload, block, ...row, capacity: 8 });
  }
  return rows;
}
export async function runGuardAttribution(outputRoot: string, { currentNode = "node", smoke = false } = {}) {
  const before = shippingInventory(); let patches: unknown;
  const f = await prepareQualificationFixture(outputRoot, async directory => { const result = await buildAttributionCandidate(directory); patches = result.patches; return result.artifact; });
  const prior = join(f.repo, "docs/evidence/2026-10-05-m10-5-cache-qualification"), priorPath = "raw/fresh-trace.json.gz";
  const manifest = JSON.parse(readFileSync(join(prior, "archive-manifest.json"), "utf8"));
  const priorBytes = readFileSync(join(prior, priorPath));
  if (hash(priorBytes) !== manifest.find((row: any) => row.path === priorPath)?.sha256) throw Error("Captured Expo upstream provenance mismatch");
  const trace = JSON.parse(gunzipSync(priorBytes).toString()).find((row: any) => row.kind === "transform");
  const node = Bun.spawnSync([currentNode, "--version"]); if (node.exitCode) throw Error("Current Node unavailable");
  const nodeVersion = node.stdout.toString().trim();
  const matrix = smoke ? guardAttributionPlan(1).filter(row => row.workload === "seven-entry") : guardAttributionPlan();
  const raw = join(outputRoot, "raw"), receipts = join(outputRoot, "receipts"); mkdirSync(raw); mkdirSync(receipts);
  const report: any = { formatVersion: 1, base: "99d9ffb", scope: "Private guard attribution, capacity8 diagnostic subset, no shipping optimisation or production admission", environment: { node: nodeVersion, bun: Bun.version, platform: process.platform, arch: process.arch, currentNode, executableSha256: hash(readFileSync(realpathSync(Bun.which(currentNode) ?? currentNode))), upstreamTraceSha256: hash(priorBytes) }, fixture: f, patches, matrix, raw: [], shippingBefore: before };
  const save = () => writeFileSync(join(outputRoot, "report.json"), JSON.stringify(report, null, 2)); save(); // Frozen before transforms.
  for (const row of matrix) {
    const requests = row.workload === "seven-entry" ? Array.from({ length: 63 }, (_, i) => i % 7) : row.workload === "32-entry" ? Array.from({ length: 64 }, (_, i) => i % 32) : [...Array.from({ length: 32 }, (_, i) => i % 4), ...Array.from({ length: 32 }, (_, i) => i), ...Array.from({ length: 32 }, (_, i) => i % 4)];
    const session = join(outputRoot, row.id + "-session.json"), spec = join(outputRoot, row.id + "-spec.json"), output = join(outputRoot, row.id + ".json");
    writeFileSync(session, JSON.stringify({ mode: row.mode, settings: { capacity: 8, admission: row.mode === "repeat" ? "repeat" : "immediate" }, idleMs: 120000, domain: f.fixture.domain }));
    writeFileSync(spec, JSON.stringify({ id: row.id, kind: "performance", workload: row.workload, mode: row.mode, capacity: 8, guardProfile: row.profile, transformerPath: f.artifact.transformerPath, app: f.app, entries: f.entries.map(path => relative(f.app, path)), config: trace.args[0], options: trace.args[3], requests, receiptStore: receipts, output }));
    const startedAt = Date.now(), began = performance.now();
    const child = Bun.spawn([currentNode, join(import.meta.dir, "qualification-probe.cjs"), spec], { cwd: f.app, env: { ...process.env, CRUMBS_CONTEXT_QUALIFICATION_CONFIG: session, CRUMBS_GUARD_PROFILE: row.profile ? "1" : "0" }, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    writeFileSync(join(outputRoot, row.id + ".log"), stdout + stderr);
    const result = exitCode === 0 ? JSON.parse(readFileSync(output, "utf8")) : null;
    const ps = Bun.spawnSync(["ps", "-axo", "pid=,ppid=,rss=,comm="]); if (ps.exitCode) throw Error("Cannot observe probe exit");
    const pids = new Set([child.pid, ...(result?.memory.service.map((r: any) => r.pid) ?? [])]);
    const survivors = ps.stdout.toString().trim().split("\n").filter(line => pids.has(Number(line.trim().split(/\s+/)[0])));
    const data = { row, run: { pid: child.pid, startedAt, finishedAt: Date.now(), elapsedMs: performance.now() - began, exitCode, stderr }, result, survivors };
    const bytes = gzipSync(Buffer.from(JSON.stringify(data))), path = join(raw, row.id + ".json.gz"); writeFileSync(path, bytes);
    report.raw.push({ id: row.id, path, sha256: hash(bytes) }); save();
    if (exitCode || survivors.length) throw Error(`Probe failed ${row.id}: ${stderr}`);
    console.log(`${report.raw.length}/${matrix.length} ${row.id}: hits=${result.closed.hits}`);
  }
  report.shippingAfter = shippingInventory();
  if (JSON.stringify(before) !== JSON.stringify(report.shippingAfter)) throw Error("Shipping inventory changed");
  save(); return report;
}
if (import.meta.main) { const root = process.argv[2]; if (!root) throw Error("usage: bun attribute-guards.ts <empty-owned-root> [--smoke]"); await runGuardAttribution(root, { smoke: process.argv.includes("--smoke") }); }
