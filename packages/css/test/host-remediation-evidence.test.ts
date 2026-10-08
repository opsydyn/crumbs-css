import { expect, it } from "bun:test"
import { createHash } from "node:crypto"
import { gzipSync } from "node:zlib"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const verifier = resolve(import.meta.dir, "../../../docs/evidence/2026-10-08-m10-5-consolidated-host-remediation/verify.py")
const hash = (data: string | Uint8Array) => createHash("sha256").update(data).digest("hex")
const formats = ["esm", "cjs"] as const
const entries = ["theme-core", "tokens", "theme"] as const

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "crumbs-rejection-packet-")), tree = join(root, "tree")
  mkdirSync(join(tree, "src"), { recursive: true }); mkdirSync(join(tree, "dist"))
  writeFileSync(join(tree, "src/x.ts"), "x")
  const sources = [{ path: "src/x.ts", sha256: hash("x") }]
  const artifacts = entries.flatMap(entry => formats.map(format => {
    const name = `${entry}.${format === "esm" ? "mjs" : "cjs"}`
    writeFileSync(join(tree, "dist", name), "x")
    return { path: `dist/${name}`, sha256: hash("x") }
  }))
  const inventory = { sourceRevision: "fixture-control", sources, artifacts }
  for (const cohort of ["control", "candidate"]) {
    const child = Bun.spawnSync(["tar", "-czf", join(root, `${cohort}-package.tar.gz`), "-C", tree, "src", "dist"], {
      env: { ...process.env, COPYFILE_DISABLE: "1" },
    })
    expect(child.exitCode).toBe(0)
  }
  const files = sources.map(row => ({ path: `packages/css/${row.path}`, sha256: row.sha256, executable: false }))
  const identity = { format: "crumbs.guarantees-source-identity", version: 1, sha256: hash(JSON.stringify(files)), files }
  const metrics = entries.flatMap(entry => formats.map(format => ({
    id: `runtime-${entry === "theme" ? "theme-compatibility" : entry === "tokens" ? "tokens" : "theme-core"}-${format}-graph-bytes`,
    baseline: { value: 0 }, threshold: { status: "approved", absoluteMax: 0, maxRegressionPercent: 0 },
  })))
  const currentGraphs = Object.fromEntries(entries.map(entry => [entry, Object.fromEntries(formats.map(format => {
    const file = `${entry}.${format === "esm" ? "mjs" : "cjs"}`
    return [format, { entry: file, graphBytes: 1, samples: Array(5).fill(1), externals: ["react"], nonliteralLoads: 0,
      artifacts: [{ file, bytes: 1, sha256: hash("x") }] }]
  }))]))
  const outcome = { kind: "value", graph: { root: 1, nodes: [] }, trace: [] }
  const parity = { cases: [{ id: 0 }], control: [{ label: "0:fixture", outcome }], candidate: [{ label: "0:fixture", outcome }], mismatches: [] }
  const raw = { control: inventory, candidate: inventory, restoration: { inventory, failures: [] },
    candidateSource: identity, registry: { metrics }, graph: { protocol: { repetitions: 5 }, currentGraphs },
    comparison: { splitComparison: { allPassed: false, metrics: metrics.map(metric => ({ id: metric.id, baseline: 0, current: { median: 1 }, result: "fail" })) } },
    controlParity: parity, candidateParity: parity }
  writeFileSync(join(root, "raw.json.gz"), gzipSync(JSON.stringify(raw)))
  writeFileSync(join(root, "candidate.patch"), "fixture patch\n")
  const names = ["control-package.tar.gz", "candidate-package.tar.gz", "raw.json.gz", "candidate.patch"]
  const packet = { format: "crumbs.m10.5.graph-rejection", version: 1, synthetic: true, disposition: "rejected", hostGate: "not-run",
    controlRevision: "fixture-control", candidateSourceDigest: identity.sha256,
    files: Object.fromEntries(names.map(name => [name, hash(readFileSync(join(root, name)))])) }
  writeFileSync(join(root, "packet.json"), JSON.stringify(packet))
  return { root, packet }
}

for (const mutation of ["none", "altered", "missing", "source", "failed-host", "parity"] as const) {
  it(`offline rejection verifier handles ${mutation} evidence`, () => {
    const { root, packet } = fixture()
    try {
      if (mutation === "altered") writeFileSync(join(root, "candidate.patch"), "altered")
      if (mutation === "missing") rmSync(join(root, "control-package.tar.gz"))
      if (mutation === "source") packet.candidateSourceDigest = "wrong"
      if (mutation === "failed-host") Object.assign(packet, { disposition: "accepted", hostGate: { rows: [{ result: "fail" }] } })
      if (mutation === "parity") {
        const { gunzipSync } = require("node:zlib") as typeof import("node:zlib")
        const raw = JSON.parse(gunzipSync(readFileSync(join(root, "raw.json.gz"))).toString())
        raw.candidateParity.candidate[0].outcome.trace = ["different"]
        writeFileSync(join(root, "raw.json.gz"), gzipSync(JSON.stringify(raw)))
        packet.files["raw.json.gz"] = hash(readFileSync(join(root, "raw.json.gz")))
      }
      writeFileSync(join(root, "packet.json"), JSON.stringify(packet))
      const result = Bun.spawnSync(["python3", verifier, root], { stdout: "pipe", stderr: "pipe" })
      if (mutation === "none" && result.exitCode !== 0) throw new Error(result.stderr.toString())
      expect(result.exitCode).toBe(mutation === "none" ? 0 : 1)
      if (mutation === "none") expect(result.stdout.toString()).toContain("synthetic")
      else expect(result.stderr.toString()).toContain({
        altered: "Raw file hash", missing: "No such file", source: "Source digest",
        "failed-host": "cannot certify acceptance", parity: "Differential receipt mismatch",
      }[mutation])
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
}
