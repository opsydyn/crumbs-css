import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { cpus, release } from "node:os"
import { join, resolve } from "node:path"
import { probeBoundary, summarizeLoadSamples } from "./effect-boundary-audit"

const packageRoot = resolve(import.meta.dir, "..")

export function measureRuntimeInitialization(floorNode: string, repetitions = 15) {
  if (!floorNode) throw Error("Exact Node 22 floor path is required")
  if (!Number.isSafeInteger(repetitions) || repetitions < 5) throw Error("At least five retained repetitions are required")
  const floorVersion = Bun.spawnSync([floorNode, "-p", "process.version"]).stdout.toString().trim()
  if (floorVersion !== "v22.0.0") throw Error("Runtime initialization floor must be exact Node v22.0.0")
  const currentNode = Bun.spawnSync(["node", "-p", "process.execPath"]).stdout.toString().trim()
  if (!currentNode) throw Error("Current Node executable is unavailable")
  const scenarios = []
  for (const [runtime, node] of [["floor", floorNode], ["current", currentNode]] as const) {
    for (const format of ["esm", "cjs"] as const) {
      const entry = join(packageRoot, "dist", `theme.${format === "esm" ? "mjs" : "cjs"}`)
      const warmup = probeBoundary(node, entry, format, "runtime")
      const samples = Array.from({ length: repetitions }, () => probeBoundary(node, entry, format, "runtime"))
      scenarios.push({ runtime, format, node: samples[0]!.node, entrySha256: createHash("sha256").update(readFileSync(entry)).digest("hex"),
        warmup: { excluded: true, ...warmup }, samples, summary: summarizeLoadSamples(samples) })
    }
  }
  return {
    formatVersion: 1,
    recordedAt: new Date().toISOString(),
    sourceRevision: Bun.spawnSync(["git", "rev-parse", "HEAD"], { cwd: packageRoot }).stdout.toString().trim(),
    environment: { platform: process.platform, architecture: process.arch, osRelease: release(), cpu: cpus()[0]?.model ?? "unknown",
      floorNode, currentNode, repetitions },
    protocol: "One excluded fresh-process warmup per runtime/format followed by retained fresh-process module evaluation; process startup excluded; forced GC before and after load; OS caches warm and uncontrolled",
    scenarios,
  }
}

if (import.meta.main) {
  const output = process.argv[2]
  if (!output) throw Error("Output JSON path is required")
  const report = measureRuntimeInitialization(process.env.CRUMBS_AUDIT_NODE_FLOOR ?? "", Number(process.argv[3] ?? 15))
  await Bun.write(output, JSON.stringify(report, null, 2) + "\n")
  console.log(`RUNTIME_INITIALIZATION_REPORT ${output}`)
}
