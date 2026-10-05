import { createHash } from "node:crypto";
export type GateStatus = "passed" | "failed" | "not-run";
export type GateResult = Readonly<{
    status: GateStatus;
    reason: string;
}>;
const hash = (value: unknown) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export function admitGate(kind: string, evidence: any): GateResult {
    const outcome = (status: GateStatus, reason: string) => Object.freeze({ status, reason });
    if (evidence?.attempted !== true || evidence?.controls !== true || !/^v\d+\.\d+\.\d+$/.test(evidence?.environment?.node ?? "") || !hash(evidence?.environment?.artifactSha256) || !hash(evidence?.environment?.workloadSha256))
        return outcome("not-run", "Missing execution, environment identity or required control");
    const fail = (reason: string) => outcome("failed", reason);
    if (kind === "owner") {
        const data = evidence.data, rows = data?.rows, projects = evidence.projects;
        if (!Array.isArray(rows) || rows.length !== 3 || !Array.isArray(projects) || projects.length !== 3 || projects[0] !== projects[1] || projects[1] === projects[2] || !Number.isSafeInteger(evidence.mainPid) || evidence.mainPid < 1)
            return fail("Missing same-process restart/second-project observations");
        if (Array.from(rows).some((row: any, index) => !row || row.project !== projects[index] || row.mainPid !== evidence.mainPid || row.mainAlive !== true || row.status !== 200 || row.bodyError || !Number.isSafeInteger(row.bundleBytes) || row.bundleBytes < 1 || !row.before || !Number.isSafeInteger(row.before.live) || row.before.live < 1 || !row.after || ["live", "creating", "disposing", "quarantined", "cleanupFailures"].some(key => row.after[key] !== 0) || !Number.isSafeInteger(row.before.disposals) || !Number.isSafeInteger(row.after.disposals) || row.after.disposals - row.before.disposals !== row.before.live))
            return fail("Failed owner bundle, project transition or idle disposal; final close cannot repair its evidence");
        if (data.closed?.state !== "closed")
            return fail("Owner did not complete explicit close");
        return admitGate("lifecycle", { ...evidence, scope: "owned-close", live: data.closed.live, cleanupFailures: data.closed.cleanupFailures, created: data.closed.misses, disposed: data.closed.disposals });
    }
    if (kind === "topology") {
        if (!Number.isSafeInteger(evidence.workers) || evidence.workers < 1 || typeof evidence.threads !== "boolean" || !Array.isArray(evidence.rows))
            return outcome("not-run", "Missing requested topology or transform observations");
        const rows = evidence.rows.filter((row: any) => row?.kind === "transform");
        if (!rows.length)
            return outcome("not-run", "No transform-worker topology observed");
        if (rows.some((row: any) => !Number.isSafeInteger(row.pid) || row.pid < 1 || !Number.isSafeInteger(row.threadId) || row.threadId < 0))
            return fail("Malformed worker topology observations");
        const pids = new Set(rows.map((row: any) => row.pid)), threads = new Set(rows.filter((row: any) => row.threadId > 0).map((row: any) => row.threadId));
        if (evidence.threads ? pids.size !== 1 || threads.size !== evidence.workers : pids.size !== evidence.workers || threads.size !== 0)
            return outcome("not-run", "Requested topology was not fully exercised by actual transforms");
        return outcome("passed", "Actual transform PID/thread observations establish requested topology");
    }
    if (kind === "bundle") {
        if (!Array.isArray(evidence.responses) || !evidence.responses.length || Array.from(evidence.responses).some((row: any) => !row || !Number.isSafeInteger(row.status) || row.status < 200 || row.status >= 300 || row.error || !Number.isSafeInteger(row.bytes) || row.bytes < 1 || !hash(row.sha256) || row.expectedPresent !== true || row.previousAbsent !== true))
            return fail("Bundle response did not establish successful expected output");
    }
    else if (kind === "dependency") {
        const required = ["plain-token", "nested-css", "workspace-source"];
        if (!Array.isArray(evidence.edits) || !required.every(kind => evidence.edits.some((row: any) => row?.kind === kind)))
            return fail("Missing dependency family; entry changes are insufficient");
        if (Array.from(evidence.edits).some((row: any) => !row || !Number.isSafeInteger(row.status) || row.status < 200 || row.status >= 300 || !hash(row.sha256) || row.importerUnchanged !== true || row.expectedPresent !== true || row.previousAbsent !== true || row.referenceMatched !== true))
            return fail("Unchanged importer or fresh reference did not prove dependency invalidation");
    }
    else if (kind === "parity") {
        if (!Array.isArray(evidence.pairs) || !evidence.pairs.length || Array.from(evidence.pairs).some((row: any) => !row || ["source", "inputs", "metadata", "result"].some(key => !Array.isArray(row[key]) || row[key].length !== 2 || !hash(row[key][0]) || row[key][0] !== row[key][1])))
            return fail("Source/input/native metadata/full result parity failed");
    }
    else if (kind === "benefit") {
        if (!Array.isArray(evidence.pairs) || !evidence.pairs.length || Array.from(evidence.pairs).some((row: any) => !row || !Number.isFinite(row.freshMs) || row.freshMs <= 0 || !Number.isFinite(row.retainedMs) || row.retainedMs <= 0 || row.retainedMs >= row.freshMs))
            return fail("Retained transforms did not improve every supplied fresh pair; parity is not performance benefit");
    }
    else if (kind === "lifecycle") {
        if (evidence.live !== 0 || evidence.cleanupFailures !== 0 || !Array.isArray(evidence.survivors) || evidence.survivors.length || !Number.isSafeInteger(evidence.created) || evidence.created < 1 || !Number.isSafeInteger(evidence.disposed) || evidence.disposed < 0 || !["owned-close", "idle", "process-exit"].includes(evidence.scope) || (evidence.scope !== "process-exit" && evidence.created !== evidence.disposed))
            return fail("Unresolved owned resources, disposal failures or observed process survivors");
    }
    else
        return outcome("not-run", "Unknown evidence gate");
    return outcome("passed", "All required observations and controls passed");
}
export type PerformanceRow = Readonly<{
    id: string;
    workload: string;
    block: number;
    mode: "fresh" | "immediate" | "repeat";
    capacity: number;
}>;
export function performancePlan(): readonly PerformanceRow[] {
    const result: PerformanceRow[] = [];
    for (const workload of ["seven-entry", "hot-scan", "32-entry"])
        for (let block = 0; block < 5; block++) {
            const variants: {
                mode: PerformanceRow["mode"];
                capacity: number;
            }[] = [{ mode: "fresh", capacity: 4 }];
            for (const mode of ["immediate", "repeat"] as const)
                for (const capacity of [4, 8, 16])
                    variants.push({ mode, capacity });
            if (block % 2)
                variants.reverse();
            for (const { mode, capacity } of variants)
                result.push(Object.freeze({ id: `${workload}-${block}-${mode}-${capacity}`, workload, block, mode, capacity }));
        }
    return Object.freeze(result);
}
export const qualificationHash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
import { mkdirSync, readFileSync, writeFileSync, readdirSync, realpathSync } from "node:fs";
import { join, relative } from "node:path";
import { gzipSync } from "node:zlib";
import { prepareQualificationFixture, type QualificationFixture } from "./qualification-fixture";
import { shippingInventory } from "./build-candidate";
export type QualificationReport = {
    formatVersion: number;
    base: string;
    environment: any;
    matrix: readonly PerformanceRow[];
    gates: Record<string, GateResult>;
    raw: any[];
    shippingBefore: unknown;
    shippingAfter?: unknown;
    fixture: any;
};
const sha = qualificationHash;
function processTable(): {
    pid: number;
    ppid: number;
    command: string;
    rssKiB: number;
}[] {
    const result = Bun.spawnSync(["ps", "-axo", "pid=,ppid=,rss=,comm="], { maxBuffer: 8 * 1024 * 1024 });
    if (result.exitCode)
        throw Error("Cannot observe qualification processes");
    return result.stdout.toString().trim().split("\n").map(line => { const [pid, ppid, rss, ...command] = line.trim().split(/\s+/); return { pid: Number(pid), ppid: Number(ppid), rssKiB: Number(rss), command: command.join(" ") }; });
}
function descendants(pid: number) {
    const all = processTable(), ids = new Set([pid]);
    let change = true;
    while (change) {
        change = false;
        for (const row of all)
            if (ids.has(row.ppid) && !ids.has(row.pid)) {
                ids.add(row.pid);
                change = true;
            }
    }
    return all.filter(row => ids.has(row.pid));
}
async function command(args: string[], cwd: string, env: Record<string, string | undefined>, log: string) {
    const start = performance.now();
    const child = Bun.spawn(args, { cwd, env, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    writeFileSync(log, stdout + stderr);
    return { pid: child.pid, exitCode, elapsedMs: performance.now() - start, stdout, stderr };
}
function readJson(path: string): any { return JSON.parse(readFileSync(path, "utf8")); }
function bundleValue(body: string, value: number) { return ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight"].every(field => new RegExp('\\b' + field + '"?\\s*:\\s*' + value + '\\b').test(body)); }
async function request(url: string, timeout = 45000) {
    const start = performance.now();
    let error = "";
    while (performance.now() - start < timeout) {
        try {
            const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
            const body = await response.text();
            return { status: response.status, body, sha256: sha(body), bytes: Buffer.byteLength(body), elapsedMs: performance.now() - start };
        }
        catch (value) {
            error = String(value);
            await Bun.sleep(250);
        }
    }
    return { status: 0, body: error, sha256: sha(error), bytes: Buffer.byteLength(error), elapsedMs: performance.now() - start };
}
function version(node: string) {
    const p = Bun.spawnSync([node, "--version"]);
    if (p.exitCode)
        throw Error(`Cannot execute ${node}`);
    return p.stdout.toString().trim();
}
export async function runCacheQualification({ outputRoot, floorNode, currentNode }: {
    outputRoot: string;
    floorNode: string;
    currentNode: string;
}): Promise<QualificationReport> {
    const currentVersion = version(currentNode), floorVersion = version(floorNode);
    if (floorVersion !== "v22.0.0")
        throw Error(`Exact Node v22.0.0 required; got ${floorVersion}`);
    const f = await prepareQualificationFixture(outputRoot), rawDir = join(outputRoot, "raw"), receiptStore = join(outputRoot, "receipts");
    mkdirSync(rawDir);
    mkdirSync(receiptStore);
    const environment = { node: currentVersion, floorNode: floorVersion, currentNode, floorExecutable: floorNode, currentBinarySha256: sha(readFileSync(realpathSync(Bun.which(currentNode) ?? currentNode))), floorBinarySha256: sha(readFileSync(realpathSync(floorNode))), artifactSha256: sha(JSON.stringify(f.artifact.artifactFiles)), workloadSha256: sha(JSON.stringify(f.entries.map(path => ({ path, sha256: sha(readFileSync(path)) })))), bun: Bun.version };
    const report: QualificationReport = { formatVersion: 1, base: "bb1a696", environment, matrix: performancePlan(), gates: {}, raw: [], shippingBefore: shippingInventory(), fixture: f };
    const common = { environment, attempted: true, controls: true };
    const save = () => writeFileSync(join(outputRoot, "report.json"), JSON.stringify(report, null, 2));
    save(); // frozen before measurement
    const add = (name: string, data: any) => { const path = join(rawDir, name + ".json.gz"), bytes = gzipSync(Buffer.from(JSON.stringify(data)), { level: 9 }); writeFileSync(path, bytes); report.raw.push({ name, path, sha256: sha(bytes) }); save(); };
    async function probe(id: string, node: string, mode: string, capacity: number, requests: number[], extra: any = {}, project = f.app, domain = f.fixture.domain, config?: any, options?: any) {
        const session = join(outputRoot, id + "-session.json"), spec = join(outputRoot, id + "-spec.json"), output = join(outputRoot, id + ".json");
        writeFileSync(session, JSON.stringify({ mode, settings: { capacity, admission: mode === "repeat" ? "repeat" : "immediate" }, idleMs: extra.idleMs ?? 120000, domain }));
        const selected = config ?? traceConfig?.args[0], flags = options ?? traceConfig?.args[3];
        if (!selected || !flags)
            throw Error("Actual Expo upstream trace unavailable");
        writeFileSync(spec, JSON.stringify({ id, kind: extra.kind ?? "performance", transformerPath: f.artifact.transformerPath, app: project, entries: (project === f.app ? f.entries : f.integration.entries).map(path => relative(project, path)), config: selected, options: flags, requests, mode, capacity, receiptStore, output, ...extra }));
        const run = await command([node, join(import.meta.dir, "qualification-probe.cjs"), spec], project, { ...process.env, CRUMBS_CONTEXT_QUALIFICATION_CONFIG: session }, join(outputRoot, id + ".log"));
        const result = run.exitCode === 0 ? readJson(output) : null;
        let survivors: any[] = [];
        if (result) {
            const pids = new Set([run.pid, ...result.memory.service.map((row: any) => row.pid)]);
            survivors = processTable().filter(row => pids.has(row.pid));
        }
        const value = { run: { pid: run.pid, exitCode: run.exitCode, elapsedMs: run.elapsedMs, stderr: run.stderr }, result, survivors };
        add(id, value);
        return value;
    }
    async function expo(id: string, project: string, node: string, mode: string, domain: any, workers: number, threads: boolean, port: number) {
        const trace = join(outputRoot, "trace-" + id);
        mkdirSync(trace);
        const session = join(outputRoot, id + "-session.json");
        writeFileSync(session, JSON.stringify({ mode, settings: { capacity: 8, admission: "immediate" }, idleMs: 30000, domain }));
        const log = join(outputRoot, id + ".log");
        const child = Bun.spawn([node, f.expoCli, "start", "--offline", "--port", String(port), "--clear", "--max-workers", String(workers)], { cwd: project, env: { ...process.env, CI: undefined, EXPO_NO_TELEMETRY: "1", EXPO_NO_METRO_WORKSPACE_ROOT: "1", CRUMBS_CONTEXT_QUALIFICATION_CONFIG: session, CRUMBS_QUALIFICATION_TRACE: trace, CRUMBS_QUALIFICATION_WORKERS: String(workers), CRUMBS_QUALIFICATION_THREADS: threads ? "1" : "0" }, stdout: "pipe", stderr: "pipe" });
        const outputs = Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
        return { child, trace, log, url: `http://[::1]:${port}/index.bundle?platform=ios&dev=false&minify=false&modulesOnly=false&runModule=true`, async stop() {
                const owned = descendants(child.pid);
                child.kill("SIGINT");
                const exitCode = await child.exited;
                const text = await outputs;
                writeFileSync(log, text.join("\n"));
                const ids = new Set(owned.map(row => row.pid));
                let survivors = processTable().filter(row => ids.has(row.pid));
                for (let i = 0; survivors.length && i < 20; i++) {
                    await Bun.sleep(100);
                    survivors = processTable().filter(row => ids.has(row.pid));
                }
                return { exitCode, owned, survivors };
            } };
    }
    const traces = (directory: string) => readdirSync(directory).flatMap(file => readFileSync(join(directory, file), "utf8").trim().split("\n").filter(Boolean).map(line => JSON.parse(line))).sort((a, b) => a.at - b.at);
    let traceConfig: any;
    const fresh = await expo("fresh-cli", f.app, currentNode, "fresh", f.fixture.domain, 1, false, 8148);
    try {
        const development = await request(fresh.url.replace("dev=false", "dev=true"));
        writeFileSync(join(outputRoot, "development-response.json.gz"), gzipSync(Buffer.from(development.body)));
        add("fresh-development", { ...development, body: development.status >= 400 ? development.body : undefined });
        report.gates.developmentBundle = admitGate("bundle", { ...common, responses: [{ ...development, expectedPresent: bundleValue(development.body, 40000), previousAbsent: true, error: development.status >= 400 ? development.body : undefined }] });
        const production = await request(fresh.url);
        writeFileSync(join(outputRoot, "production-response.js.gz"), gzipSync(Buffer.from(production.body)));
        add("fresh-production", { ...production, body: production.status >= 400 ? production.body : undefined });
        report.gates.freshBundle = admitGate("bundle", { ...common, responses: [{ ...production, expectedPresent: bundleValue(production.body, 40000), previousAbsent: true }] });
        traceConfig = traces(fresh.trace).find(row => row.kind === "transform");
        add("fresh-trace", traces(fresh.trace));
    }
    finally {
        add("fresh-shutdown", await fresh.stop());
    }
    if (!traceConfig) {
        report.gates.performance = { status: "not-run", reason: "No actual Expo CSS upstream trace" };
        save();
        return report;
    }
    const integration = await expo("integration-cli", f.integration.app, currentNode, "immediate", f.integration.domain, 1, false, 8149);
    try {
        const run = await command([process.execPath, join(import.meta.dir, "qualification-incremental.ts"), outputRoot, integration.url, integration.trace, currentNode], f.integration.app, { ...process.env }, join(outputRoot, "integration-controls.log"));
        if (run.exitCode !== 0) {
            report.gates.dependency = { status: "failed", reason: "Incremental control process failed: " + run.stderr };
        }
        else {
            const rows = readJson(join(outputRoot, "integration-observations.json"));
            add("incremental", rows);
            add("incremental-restoration", readJson(join(outputRoot, "integration-restoration.json")));
            report.gates.dependency = admitGate("dependency", { ...common, edits: rows.filter((row: any) => ["plain-token", "nested-css", "workspace-source"].includes(row.kind)) });
            const changes = rows.filter((row: any) => ["entry-edit", "import-removal", "entry-restored", "import-replacement", "alias-added", "alias-retarget", "workspace-package-import", "manifest-exports", "symlink-retarget", "installation-lock", "syntax-repair"].includes(row.kind));
            report.gates.resolution = { status: changes.every((row: any) => row.status === 200 && row.expectedPresent && row.previousAbsent && row.referenceMatched) ? "passed" : "failed", reason: changes.filter((row: any) => row.expectedPresent !== true || row.previousAbsent !== true || row.referenceMatched !== true).map((row: any) => row.kind).join(", ") || "All configuration/installation/import controls matched fresh" };
            report.gates.nativeParity = admitGate("parity", { ...common, pairs: rows.filter((row: any) => row.actual && row.reference).map((row: any) => ({ source: [row.actual.receipts[0].sourceHash, row.reference.sourceHash], inputs: [row.actual.receipts[0].inputsHash, row.reference.inputsHash], metadata: [sha(JSON.stringify(row.actual.metadata)), row.reference.metadataHash], result: [row.actual.resultHash, row.reference.resultHash] })) });
            const syntax = rows.find((row: any) => row.kind === "syntax-error");
            report.gates.syntaxRepair = { status: syntax?.status >= 400 && syntax.diagnostic && rows.find((row: any) => row.kind === "syntax-repair")?.referenceMatched ? "passed" : "failed", reason: "Actual error/repair receipts recorded" };
        }
        add("integration-trace", traces(integration.trace));
    }
    finally {
        add("integration-shutdown", await integration.stop());
    }
    for (const [id, workers, threads] of [["multi-worker", 2, false], ["worker-threads", 2, true]] as const) {
        const server = await expo(id, f.app, currentNode, "immediate", f.fixture.domain, workers, threads, 8148);
        try {
            const response = await request(server.url);
            const rows = traces(server.trace);
            add(id, { ...response, body: response.status >= 400 ? response.body : undefined, rows, workers, threads });
            const bundle = admitGate("bundle", { ...common, responses: [{ ...response, expectedPresent: bundleValue(response.body, 40000), previousAbsent: true }] });
            const topology = admitGate("topology", { ...common, rows, workers, threads });
            report.gates[id] = bundle.status === "passed" ? topology : bundle;
        }
        finally {
            const shutdown = await server.stop();
            add(id + "-shutdown", shutdown);
            report.gates[id + "-exit"] = report.gates[id]?.status === "passed" ? { status: shutdown.survivors.length ? "failed" : "passed", reason: "Observed worker/service process exit; no awaited disposal claim" } : { status: "not-run", reason: "Requested successful worker topology was not established" };
        }
    }
    const ownerSession = join(outputRoot, "owner-session.json"), ownerOutput = join(outputRoot, "owner.json"), ownerTrace = join(outputRoot, "owner-trace");
    mkdirSync(ownerTrace);
    const unionDomain = { ...f.fixture.domain, configurationFiles: [...new Set([...f.fixture.domain.configurationFiles, ...f.integration.domain.configurationFiles])], allowedInputRoots: [...new Set([...f.fixture.domain.allowedInputRoots, ...f.integration.domain.allowedInputRoots])], symlinkPaths: f.integration.domain.symlinkPaths };
    writeFileSync(ownerSession, JSON.stringify({ mode: "immediate", settings: { capacity: 8, admission: "immediate" }, idleMs: 1000, domain: unionDomain }));
    const owner = await command([currentNode, join(import.meta.dir, "qualification-owner.cjs"), join(outputRoot, "qualification-fixture.json"), ownerOutput], f.app, { ...process.env, CRUMBS_CONTEXT_QUALIFICATION_CONFIG: ownerSession, CRUMBS_QUALIFICATION_TRACE: ownerTrace, EXPO_NO_METRO_WORKSPACE_ROOT: "1" }, join(outputRoot, "owner.log"));
    const ownerData = owner.exitCode === 0 ? readJson(ownerOutput) : null;
    add("long-lived-owner", { run: owner, data: ownerData, trace: traces(ownerTrace) });
    report.gates.longLivedOwner = ownerData ? admitGate("owner", { ...common, data: ownerData, projects: [f.integration.app, f.integration.app, f.app], mainPid: owner.pid, survivors: processTable().filter(row => row.pid === owner.pid).map(row => row.pid) }) : { status: "failed", reason: owner.stderr };
    // Isolated real timers; outside timed throughput collection. Keep logs during long waits.
    const idle = await Promise.all([1000, 30000, 120000].map(idleMs => probe("idle-" + idleMs, currentNode, "immediate", 8, [0, 1, 2, 3, 4, 5, 6], { kind: "idle", idleMs })));
    report.gates.idle = { status: idle.every(row => row.result?.cycles.length === 3 && row.result.closed.live === 0 && !row.survivors.length) ? "passed" : "failed", reason: "Three real idle/reopen cycles at each 1/30/120-second setting; no global service stop" };
    const seven = Array.from({ length: 63 }, (_, index) => index % 7), floor: any[] = [];
    for (const mode of ["fresh", "immediate", "repeat"])
        floor.push(await probe("floor-" + mode, floorNode, mode, 8, seven));
    const rowsEqual = (left: any, right: any) => JSON.stringify(left.map((row: any) => ({ index: row.index, sourceHash: row.sourceHash, inputsHash: row.inputsHash, metadataHash: row.metadataHash, resultHash: row.resultHash }))) === JSON.stringify(right.map((row: any) => ({ index: row.index, sourceHash: row.sourceHash, inputsHash: row.inputsHash, metadataHash: row.metadataHash, resultHash: row.resultHash })));
    report.gates.floor = { status: floor.every(row => row.result && row.result.node === "v22.0.0" && row.result.closed.live === 0 && !row.survivors.length) && floor.slice(1).every(row => rowsEqual(row.result.rows, floor[0].result.rows) && row.result.closed.hits > 0) ? "passed" : "failed", reason: "Exact Node floor behavioural full-transform parity; not floor performance budgets" };
    const matrixResults = new Map<string, any>();
    for (const row of report.matrix) {
        const requests = row.workload === "seven-entry" ? seven : row.workload === "32-entry" ? Array.from({ length: 64 }, (_, index) => index % 32) : [...Array.from({ length: 32 }, (_, index) => index % 4), ...Array.from({ length: 32 }, (_, index) => index), ...Array.from({ length: 32 }, (_, index) => index % 4)];
        const result = await probe(row.id, currentNode, row.mode, row.capacity, requests, { workload: row.workload, block: row.block });
        matrixResults.set(row.id, result);
        console.log(`${matrixResults.size}/105 ${row.id} exit=${result.run.exitCode} hits=${result.result?.closed.hits}`);
    }
    let matrixPassed = true;
    for (const row of report.matrix) {
        const actual = matrixResults.get(row.id), baseline = matrixResults.get(`${row.workload}-${row.block}-fresh-4`);
        if (!actual.result || !baseline.result || !rowsEqual(actual.result.rows, baseline.result.rows) || actual.result.closed.live !== 0 || actual.survivors.length)
            matrixPassed = false;
    }
    report.gates.performance = { status: matrixPassed ? "passed" : "failed", reason: "105 fixed fresh-process runs; exact paired receipts/results; timing results do not select a default or pass host budgets" };
    const warmMedian = (rows: any[]) => {
        const seen = new Set<number>(), times: number[] = [];
        for (const row of rows) {
            if (seen.has(row.index))
                times.push(row.elapsedMs);
            seen.add(row.index);
        }
        times.sort((a, b) => a - b);
        const middle = Math.floor(times.length / 2);
        return times.length % 2 ? times[middle]! : (times[middle - 1]! + times[middle]!) / 2;
    };
    report.gates.performanceBenefit = matrixPassed ? admitGate("benefit", { ...common, pairs: report.matrix.filter(row => row.mode !== "fresh").map(row => ({ freshMs: warmMedian(matrixResults.get(`${row.workload}-${row.block}-fresh-4`).result.rows), retainedMs: warmMedian(matrixResults.get(row.id).result.rows) })) }) : { status: "not-run", reason: "Matrix parity failed; no performance benefit admission" };
    report.gates.installedPackageReplacement = { status: "not-run", reason: "Owned lock marker plus dependency edit; no lock-only/installed dependency replacement" };
    report.gates.hostBudgets = { status: "not-run", reason: "Unchanged approved host baselines not rerun" };
    report.gates.devicePerformance = { status: "not-run", reason: "No device performance trial" };
    report.shippingAfter = shippingInventory();
    report.gates.shipping = { status: JSON.stringify(report.shippingBefore) === JSON.stringify(report.shippingAfter) ? "passed" : "failed", reason: "Original source/dist/fixtures/package/build-policy inventory" };
    save();
    return report;
}
if (import.meta.main) {
    const [outputRoot, floorNode, currentNode = "node"] = process.argv.slice(2);
    if (!outputRoot || !floorNode)
        throw Error("usage: bun qualify.ts <empty-owned-root> <exact-node22> [current-node]");
    await runCacheQualification({ outputRoot, floorNode, currentNode });
}
