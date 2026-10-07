import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { isAbsolute, join, resolve } from "node:path";
import { prepareQualificationFixture } from "./qualification-fixture";

const sha = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
function processTable() {
  const result = Bun.spawnSync(["ps", "-axo", "pid=,ppid=,rss=,comm="], { maxBuffer: 8 * 1024 * 1024 });
  if (result.exitCode !== 0) throw new Error("Cannot observe qualification processes");
  return result.stdout.toString().trim().split("\n").filter(Boolean).map(line => {
    const [pid, ppid, rss, ...command] = line.trim().split(/\s+/);
    return { pid: Number(pid), ppid: Number(ppid), rssKiB: Number(rss), command: command.join(" ") };
  });
}
function descendants(pid: number) {
  const all = processTable(), ids = new Set([pid]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of all) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return all.filter(row => ids.has(row.pid));
}
async function availablePort() {
  const server = createServer();
  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen({ port: 0, host: "127.0.0.1" }, () => resolvePromise());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not reserve a local Metro port");
  const port = address.port;
  await new Promise<void>((resolvePromise, reject) => server.close(error => error ? reject(error) : resolvePromise()));
  return port;
}
async function collect(stream: ReadableStream<Uint8Array>) { return new Response(stream).text(); }

async function main() {
  const [rootArg, node] = process.argv.slice(2);
  if (!rootArg || !isAbsolute(rootArg) || !node || !isAbsolute(node)) throw new Error("Usage: metro-invalidation-control.ts <empty-absolute-output-root> <exact-node-22-executable>");
  const root = resolve(rootArg);
  if (existsSync(root) && (!statSync(root).isDirectory() || readdirSync(root).length > 0)) throw new Error("Output root must be empty");
  const nodeVersion = Bun.spawnSync([node, "--version"]);
  if (nodeVersion.exitCode !== 0 || nodeVersion.stdout.toString().trim() !== "v22.0.0") throw new Error("Metro parity control requires the exact Node v22.0.0 executable");
  mkdirSync(root, { recursive: true });

  const fixture = await prepareQualificationFixture(root);
  const port = await availablePort();
  const trace = join(root, "trace-integration"); mkdirSync(trace);
  const session = join(root, "integration-session.json");
  writeFileSync(session, JSON.stringify({ mode: "immediate", settings: { capacity: 8, admission: "immediate" }, idleMs: 30000, domain: fixture.integration.domain }));
  const url = `http://[::1]:${port}/index.bundle?platform=ios&dev=false&minify=false&modulesOnly=false&runModule=true`;
  const child = Bun.spawn([node, fixture.expoCli, "start", "--offline", "--port", String(port), "--clear", "--max-workers", "1"], {
    cwd: fixture.integration.app,
    env: { ...process.env, CI: undefined, EXPO_NO_TELEMETRY: "1", EXPO_NO_METRO_WORKSPACE_ROOT: "1", CRUMBS_CONTEXT_QUALIFICATION_CONFIG: session,
      CRUMBS_QUALIFICATION_TRACE: trace, CRUMBS_QUALIFICATION_WORKERS: "1", CRUMBS_QUALIFICATION_THREADS: "0" },
    stdout: "pipe", stderr: "pipe",
  });
  const serverOutput = Promise.all([collect(child.stdout), collect(child.stderr)]);
  let observations: any[] = [];
  let probeExitCode: number | undefined;
  let probeOutput = "";
  let probeError = "";
  let shutdown: { pid: number; exitCode: number | null; survivors: ReturnType<typeof processTable> } | undefined;
  let failure: string | undefined;
  try {
    const probe = Bun.spawn([process.execPath, join(import.meta.dir, "qualification-incremental.ts"), root, url, trace, node, "--entry-only"], {
      cwd: fixture.integration.app, env: { ...process.env }, stdout: "pipe", stderr: "pipe",
    });
    [probeOutput, probeError, probeExitCode] = await Promise.all([collect(probe.stdout), collect(probe.stderr), probe.exited]);
    writeFileSync(join(root, "incremental-control.log"), probeOutput + probeError);
    const path = join(root, "integration-observations.json");
    if (await Bun.file(path).exists()) observations = JSON.parse(readFileSync(path, "utf8"));
    if (probeExitCode !== 0) failure = `Incremental Metro control exited ${probeExitCode}: ${probeError.slice(-3000)}`;
  } catch (error) { failure = String(error); }
  finally {
    const owned = descendants(child.pid), ownedPids = new Set(owned.map(row => row.pid));
    try { child.kill("SIGINT"); } catch { /* the server may have exited before cleanup */ }
    const exitCode = await child.exited;
    const [stdout, stderr] = await serverOutput;
    writeFileSync(join(root, "metro-server.log"), stdout + stderr);
    let survivors = processTable().filter(row => ownedPids.has(row.pid));
    for (let attempt = 0; survivors.length && attempt < 20; attempt++) { await Bun.sleep(100); survivors = processTable().filter(row => ownedPids.has(row.pid)); }
    shutdown = { pid: child.pid, exitCode, survivors };
  }

  const required = ["initial", "entry-edit", "import-removal", "entry-restored"];
  const rows = required.map(kind => observations.find(row => row.kind === kind));
  const parity = rows.every(row => row && row.status === 200 && row.expectedPresent && row.previousAbsent && row.referenceMatched
    && row.actual?.receipts?.[0]?.sourceHash === row.reference?.sourceHash
    && row.actual?.receipts?.[0]?.inputsHash === row.reference?.inputsHash
    && sha(JSON.stringify(row.actual.metadata)) === row.reference?.metadataHash
    && row.actual?.resultHash === row.reference?.resultHash);
  const restorationPath = join(root, "integration-restoration.json");
  const restoration = await Bun.file(restorationPath).exists() ? JSON.parse(readFileSync(restorationPath, "utf8")) : undefined;
  const filesRestored = Array.isArray(restoration?.files) && restoration.files.length > 0 && restoration.files.every((row: any) => row.originalSha256 === row.restoredSha256)
    && restoration.link?.originalTarget === restoration.link?.restoredTarget;
  const cleanShutdown = shutdown !== undefined && shutdown.exitCode !== null && shutdown.survivors.length === 0;
  const report = {
    schema: "crumbs-m10.5-metro-invalidation-v1", status: !failure && parity && filesRestored && cleanShutdown ? "passed" : "failed",
    sourceRevision: Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], { cwd: fixture.repo }).stdout.toString().trim(),
    node: nodeVersion.stdout.toString().trim(), bun: Bun.version, expoCli: fixture.expoCli, port, candidateTransformerSha256: sha(readFileSync(fixture.artifact.transformerPath)),
    candidateSourceInventorySha256: sha(JSON.stringify(fixture.artifact.sourceFiles)), probeExitCode, probeError: probeError || undefined,
    checks: { requiredStages: required, stageParity: parity, sourceInputMetadataAndResultCompared: parity, fixtureRestored: filesRestored, serverShutdown: cleanShutdown },
    stages: rows.map(row => row && ({ kind: row.kind, status: row.status, attempts: row.attempts, expectedPresent: row.expectedPresent, previousAbsent: row.previousAbsent,
      traceResolution: row.traceResolution, entry: [row.actual?.entryHash, row.currentEntryHash],
      source: [row.actual?.receipts?.[0]?.sourceHash, row.reference?.sourceHash], inputs: [row.actual?.receipts?.[0]?.inputsHash, row.reference?.inputsHash],
      metadata: [row.actual?.metadata && sha(JSON.stringify(row.actual.metadata)), row.reference?.metadataHash], result: [row.actual?.resultHash, row.reference?.resultHash],
      bypassReason: row.actual?.snapshot?.lastBypassReason })),
    shutdown, failure,
  };
  writeFileSync(join(root, "control-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (report.status !== "passed") process.exitCode = 1;
}

await main();
