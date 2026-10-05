import fc from "fast-check";
import { expect, it } from "bun:test";
import { admitGate, performancePlan, runCacheQualification } from "../bench/context-reuse/qualify";
const hash = "a".repeat(64), other = "b".repeat(64);
const domain = { node: "v24.15.0", artifactSha256: hash, workloadSha256: hash };
const common = { environment: domain, attempted: true, controls: true };
const bundle = { ...common, responses: [{ status: 200, bytes: 10, sha256: hash, expectedPresent: true, previousAbsent: true }] };
it("app serialization failure cannot count as a successful bundle", () => {
    expect(admitGate("bundle", bundle).status).toBe("passed");
    expect(admitGate("bundle", { ...bundle, responses: [{ ...bundle.responses[0], status: 500, error: "Unexpected module with full source map found" }] }).status).toBe("failed");
});
it("entry edits do not prove unchanged importers rebuild for all dependency families", () => {
    const edits = ["plain-token", "nested-css", "workspace-source"].map(kind => ({ kind, importerUnchanged: true, expectedPresent: true, previousAbsent: true, referenceMatched: true, status: 200, sha256: hash }));
    expect(admitGate("dependency", { ...common, edits }).status).toBe("passed");
    expect(admitGate("dependency", { ...common, edits: [{ ...edits[0], kind: "entry" }] }).status).toBe("failed");
    expect(admitGate("dependency", { ...common, edits: edits.map(edit => ({ ...edit, previousAbsent: false })) }).status).toBe("failed");
});
it("source-only parity cannot hide stale inputs or native metadata", () => {
    const pair = { source: [hash, hash], inputs: [hash, hash], metadata: [hash, hash], result: [hash, hash] };
    expect(admitGate("parity", { ...common, pairs: [pair] }).status).toBe("passed");
    expect(admitGate("parity", { ...common, pairs: [{ ...pair, metadata: [hash, other] }] }).status).toBe("failed");
    expect(admitGate("parity", { ...common, pairs: [{ ...pair, inputs: [hash, other] }] }).status).toBe("failed");
});
it("failed cleanup and surviving processes cannot pass lifecycle", () => {
    const evidence = { ...common, live: 0, cleanupFailures: 0, created: 4, disposed: 4, survivors: [], scope: "owned-close" };
    expect(admitGate("lifecycle", evidence).status).toBe("passed");
    expect(admitGate("lifecycle", { ...evidence, survivors: [123] }).status).toBe("failed");
    expect(admitGate("lifecycle", { ...evidence, cleanupFailures: 1 }).status).toBe("failed");
    expect(admitGate("lifecycle", { ...evidence, disposed: 3 }).status).toBe("failed");
    expect(admitGate("lifecycle", { ...evidence, scope: "process-exit", disposed: 0 }).status).toBe("passed");
});
it("missing environment, unexecuted topology and absent controls remain not-run", () => {
    expect(admitGate("bundle", { ...bundle, environment: undefined }).status).toBe("not-run");
    expect(admitGate("bundle", { ...bundle, attempted: false }).status).toBe("not-run");
    expect(admitGate("dependency", { ...common, controls: false }).status).toBe("not-run");
});
it("freezes 105 unique processes, five fresh pairs per workload and alternating orders", () => {
    const plan = performancePlan();
    expect(plan).toHaveLength(105);
    const workloads = ["seven-entry", "hot-scan", "32-entry"];
    for (const workload of workloads)
        for (let block = 0; block < 5; block++) {
            const rows = plan.filter(row => row.workload === workload && row.block === block);
            expect(rows).toHaveLength(7);
            expect(rows.filter(row => row.mode === "fresh")).toHaveLength(1);
            expect(rows.filter(row => row.mode !== "fresh").map(row => `${row.mode}:${row.capacity}`).sort()).toEqual(["immediate:16", "immediate:4", "immediate:8", "repeat:16", "repeat:4", "repeat:8"]);
            expect(rows[block % 2 ? 6 : 0]?.mode).toBe("fresh");
        }
    expect(new Set(plan.map(row => row.id)).size).toBe(105);
});
it("rejects a non-Node floor executable before creating any owned fixture", async () => {
    await expect(runCacheQualification({ outputRoot: "/not-created-by-qualification", floorNode: process.execPath, currentNode: "node" })).rejects.toThrow("Exact Node v22.0.0 required");
});
it("malformed HTTP evidence cannot pass bundle admission", () => {
    for (const status of [undefined, NaN, 200.5])
        expect(admitGate("bundle", { ...bundle, responses: [{ ...bundle.responses[0], status }] }).status).toBe("failed");
});
it("arbitrary non-true dependency proofs cannot pass evidence admission", () => {
    const edits = ["plain-token", "nested-css", "workspace-source"].map(kind => ({ kind, importerUnchanged: true, expectedPresent: true, previousAbsent: true, referenceMatched: true, status: 200, sha256: hash }));
    fc.assert(fc.property(fc.constantFrom("importerUnchanged", "expectedPresent", "previousAbsent", "referenceMatched"), fc.jsonValue().filter(value => value !== true), (field, value) => {
        const poisoned = edits.map(row => ({ ...row, [field]: value }));
        expect(admitGate("dependency", { ...common, edits: poisoned }).status).not.toBe("passed");
    }), { seed: 10507, numRuns: 100 });
});
it("parity alone cannot admit a slower performance candidate", () => {
    const pairs = [{ freshMs: 10, retainedMs: 35 }];
    expect(admitGate("benefit", { ...common, pairs }).status).toBe("failed");
    expect(admitGate("benefit", { ...common, pairs: [{ freshMs: 10, retainedMs: 8 }] }).status).toBe("passed");
    expect(admitGate("benefit", { ...common, pairs: [{ freshMs: 0, retainedMs: 8 }] }).status).toBe("failed");
});
const ownerRows = [8, 8, 7].map((live, index) => {
    const previous = index === 0 ? 0 : index === 1 ? 8 : 16;
    return { project: index === 2 ? "second" : "first", status: 200, bundleBytes: 10, bodyError: null, mainPid: 123, mainAlive: true,
        before: { live, disposals: previous }, after: { live: 0, creating: 0, disposing: 0, quarantined: 0, cleanupFailures: 0, disposals: previous + live } };
});
const ownerEvidence = { ...common, projects: ["first", "first", "second"], mainPid: 123, survivors: [],
    data: { rows: ownerRows, closed: { state: "closed", live: 0, cleanupFailures: 0, misses: 23, disposals: 23 } } };
it("final close cannot mask a failed middle owner bundle or idle timeout", () => {
    expect(admitGate("owner", ownerEvidence).status).toBe("passed");
    expect(admitGate("owner", { ...ownerEvidence, data: { ...ownerEvidence.data, rows: ownerRows.map((row, i) => i === 1 ? { ...row, status: 500 } : row) } }).status).toBe("failed");
    expect(admitGate("owner", { ...ownerEvidence, data: { ...ownerEvidence.data, rows: ownerRows.map((row, i) => i === 1 ? { ...row, after: { ...row.after, live: 8, disposals: 8 } } : row) } }).status).toBe("failed");
    expect(admitGate("owner", { ...ownerEvidence, data: { ...ownerEvidence.data, rows: ownerRows.map((row, i) => i === 2 ? { ...row, project: "first", mainPid: 456 } : row) } }).status).toBe("failed");
});
it("requested worker count and thread flags cannot stand in for observed topology", () => {
    const processRows = [{ kind: "transform", pid: 1, threadId: 0 }, { kind: "transform", pid: 2, threadId: 0 }];
    expect(admitGate("topology", { ...common, workers: 2, threads: false, rows: processRows }).status).toBe("passed");
    expect(admitGate("topology", { ...common, workers: 2, threads: false, rows: processRows.slice(0, 1) }).status).toBe("not-run");
    expect(admitGate("topology", { ...common, workers: 2, threads: true, rows: processRows }).status).toBe("not-run");
    expect(admitGate("topology", { ...common, workers: 2, threads: true, rows: [{ kind: "transform", pid: 1, threadId: 1 }, { kind: "transform", pid: 1, threadId: 2 }] }).status).toBe("passed");
    expect(admitGate("topology", { ...common, workers: 2, threads: true, rows: [] }).status).toBe("not-run");
});
