import { createVar, fallbackVar } from "../src/local-vars/authoring";
import { assignVars } from "../src/local-vars/assignments";
import { resolveAssignedStyles } from "../src/local-vars/resolver";
import { createAssignedStyleSelector } from "../src/local-vars/selector";
import { createLocalStylePlan } from "../src/compiler/local-vars";
import { readEmittedGraph } from "./effect-boundary-audit";
import { cpus, release } from "node:os";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--output")
  throw Error("Usage: local-vars.bench.ts --output file");
const warmup = 20, samples = 100;
function assert(condition: unknown, message: string): asserts condition { if (!condition)
  throw Error(message); }
function measure(name: string, prepare: () => () => unknown) {
  const timings = [];
  for (let i = -warmup; i < samples; i++) {
    const run = prepare(), start = performance.now();
    run();
    const elapsed = performance.now() - start;
    if (i >= 0)
      timings.push(elapsed);
  }
  const sorted = [...timings].sort((a, b) => a - b);
  return { name, samplesMs: timings, medianMs: (sorted[49]! + sorted[50]!) / 2, warmup, samples };
}
const fixtures = [];
for (const size of [1, 16, 64]) {
  const entries = Array.from({ length: size }, (_, i) => [String(i), createVar("opacity", { owner: "@bench/local-vars", name: `Card${size}.alpha${i}`, version: 1 })] as const);
  const shape = Object.freeze(Object.fromEntries(entries)), values = Object.freeze(Object.fromEntries(entries.map(([key]) => [key, .25])));
  const styles = Object.freeze(Object.fromEntries(entries.map(([key, variable]) => [key, createLocalStylePlan(["view"], [{ property: "opacity", value: fallbackVar(variable, 1) }])]))), base = assignVars(shape, values);
  const result = resolveAssignedStyles(styles, base);
  assert(resolveAssignedStyles(styles, base) === result, "Identical pure inputs lost identity");
  const changed = { ...values, 0: .5 }, extra = createVar("opacity", { owner: "@bench/local-vars", name: `Unused${size}`, version: 1 });
  const select = createAssignedStyleSelector(styles), initial = select(base), updated = select(assignVars(shape, changed));
  assert(updated["0"] !== initial["0"], "Used value did not change");
  for (const [key] of entries.slice(1))
    assert(updated[key] === initial[key], "Unaffected export lost identity");
  assert(select(assignVars({ ...shape, unused: extra }, { ...changed, unused: .75 })) === updated, "Unused assignment changed map identity");
  fixtures.push({ size, assertions: "passed", measurements: [
      measure("assignment construction and admission", () => () => assignVars(shape, values)),
      measure("first resolution including assignment construction", () => () => resolveAssignedStyles(styles, assignVars(shape, values))),
      measure("identical admitted input hit", () => () => resolveAssignedStyles(styles, base)),
      measure("used update including assignment construction", () => { const reader = createAssignedStyleSelector(styles); reader(base); return () => reader(assignVars(shape, changed)); }),
      measure("unused update including assignment construction", () => { const reader = createAssignedStyleSelector(styles); reader(base); return () => reader(assignVars({ ...shape, unused: extra }, { ...values, unused: .75 })); }),
    ] });
}
const dist = resolve(import.meta.dir, "../dist"), graphs = [];
for (const entry of ["theme-vars", "theme", "theme-core", "theme-token"])
  for (const suffix of ["mjs", "cjs"]) {
    const graph = readEmittedGraph(resolve(dist, `${entry}.${suffix}`)), bytes = Buffer.concat(graph.files.map(file => readFileSync(file)));
    graphs.push({ entry, format: suffix, files: graph.files, bytes: bytes.length, gzipBytes: gzipSync(bytes).length });
  }
const sources = ["../src/local-vars/resolver.ts", "../src/local-vars/admission.ts", "../src/local-vars/assignments.ts", "local-vars.bench.ts"].map(file => ({ path: file, sha256: createHash("sha256").update(readFileSync(resolve(import.meta.dir, file))).digest("hex") }));
await Bun.write(args[1]!, JSON.stringify({ schema: "crumbs.m11.1.diagnostic-cost.v1", recordedAt: new Date().toISOString(), environment: { bun: Bun.version, nodeCompatibility: process.version, platform: process.platform, architecture: process.arch, cpu: cpus()[0]?.model, os: release() }, protocol: { warmup, samples, units: "Individual host wall-clock milliseconds; warmup excluded; fixture preparation outside timing; named assignment construction/admission inside timing", limits: "Diagnostic only; no release budget or native allocation claim" }, sources, fixtures, graphs }, null, 2) + "\n");
console.log(JSON.stringify({ output: args[1], fixtures: fixtures.map(f => ({ size: f.size, medians: f.measurements.map(m => ({ name: m.name, ms: m.medianMs })) })) }));
