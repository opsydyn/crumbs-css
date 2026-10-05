"use strict";
// Private direct full-transform/idle probe with Expo's captured stock upstream config; no WorkerFarm patch.
const fs = require("node:fs"), path = require("node:path"), crypto = require("node:crypto"), { spawnSync } = require("node:child_process");
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const loadedAt = performance.now();
const t = require(spec.transformerPath);
const moduleLoadMs = performance.now() - loadedAt;
const hash = value => crypto.createHash("sha256").update(value).digest("hex");
const rows = [];
function memory() {
    const proc = spawnSync("ps", ["-axo", "pid=,ppid=,rss=,comm="], { encoding: "utf8" });
    if (proc.status !== 0)
        throw Error("Cannot observe qualification child processes");
    const all = proc.stdout.trim().split("\n").map(line => { const [pid, ppid, rss, ...command] = line.trim().split(/\s+/); return { pid: +pid, ppid: +ppid, rssKiB: +rss, command: command.join(" ") }; });
    const owned = new Set([process.pid]);
    let changed = true;
    while (changed) {
        changed = false;
        for (const row of all)
            if (owned.has(row.ppid) && !owned.has(row.pid)) {
                owned.add(row.pid);
                changed = true;
            }
    }
    const service = all.filter(row => owned.has(row.pid) && row.command.includes("esbuild"));
    return { nodeRssBytes: process.memoryUsage().rss, serviceRssBytes: service.reduce((sum, row) => sum + row.rssKiB * 1024, 0), service };
}
async function transform(index) {
    const filename = spec.entries[index];
    const start = performance.now();
    const result = await t.transform(spec.config, spec.app, filename, fs.readFileSync(filename), spec.options);
    const elapsedMs = performance.now() - start;
    const snapshot = t.__crumbsQualificationSnapshot();
    const receipts = t.__crumbsQualificationDrainReceipts();
    if (receipts.length !== 1)
        throw Error("Expected one current CSS receipt");
    const receipt = receipts[0].receipt;
    const values = { source: receipt.source, inputs: receipt.inputs, metadata: result.__crumbsNativeStyles, result };
    if (spec.receiptStore)
        for (const [kind, value] of Object.entries(values)) {
            const bytes = kind === 'source' ? value : JSON.stringify(value);
            const file = path.join(spec.receiptStore, kind + '-' + hash(bytes) + '.json.gz');
            if (!fs.existsSync(file))
                fs.writeFileSync(file, require('node:zlib').gzipSync(Buffer.from(bytes)));
        }
    rows.push({ index, elapsedMs, queueWaitMs: snapshot.queueWaitMs, sourceHash: hash(receipt.source), inputsHash: hash(JSON.stringify(receipt.inputs)), metadataHash: hash(JSON.stringify(result.__crumbsNativeStyles)), resultHash: hash(JSON.stringify(result)), snapshot });
}
(async () => {
    const start = performance.now();
    let beforeClose, closed;
    try {
        if (spec.kind === "idle") {
            for (let cycle = 0; cycle < 3; cycle++) {
                for (let i = 0; i < 7; i++)
                    await transform(i);
                const before = t.__crumbsQualificationSnapshot();
                const began = performance.now();
                while (performance.now() - began < spec.idleMs + 150) {
                    await new Promise(resolve => setTimeout(resolve, Math.min(30000, spec.idleMs + 150 - (performance.now() - began))));
                    console.log(JSON.stringify({ progress: "idle", idleMs: spec.idleMs, cycle, elapsedMs: performance.now() - began, snapshot: t.__crumbsQualificationSnapshot() }));
                }
                const after = t.__crumbsQualificationSnapshot();
                if (after.live !== 0 || after.retained !== 0 || after.disposals - before.disposals !== 7 || after.cleanupFailures)
                    throw Error("Idle expiry did not dispose seven owned contexts");
                spec.cycles ??= [];
                spec.cycles.push({ cycle, before, after, waitMs: performance.now() - began, memory: memory() });
            }
            // Explicit reopening after the third expired generation.
            for (let i = 0; i < 7; i++)
                await transform(i);
        }
        else
            for (const index of spec.requests)
                await transform(index);
        beforeClose = t.__crumbsQualificationSnapshot();
        const sample = memory();
        await t.__crumbsQualificationClose();
        closed = t.__crumbsQualificationSnapshot();
        const report = { moduleLoadMs, node: process.version, pid: process.pid, kind: spec.kind, id: spec.id, workload: spec.workload, mode: spec.mode, capacity: spec.capacity, requests: spec.requests, rows, cycles: spec.cycles, totalMs: performance.now() - start, beforeClose, closed, memory: sample, memoryAfterClose: memory() };
        fs.writeFileSync(spec.output, JSON.stringify(report));
        console.log(JSON.stringify({ completed: spec.id, rows: rows.length, hits: closed.hits, live: closed.live }));
    }
    catch (error) {
        try {
            await t.__crumbsQualificationClose();
        }
        catch { }
        ;
        console.error(error.stack);
        process.exitCode = 1;
    }
})();
