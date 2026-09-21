import { createRequire } from "node:module"
import os from "node:os"
import path from "node:path"
import { readEmittedGraph } from "./effect-boundary-audit"

const packageRoot = path.resolve(import.meta.dir, "..")
const packageRequire = createRequire(path.join(packageRoot, "package.json"))

export const runtimeGraphEntrypoints = ["theme-core", "tokens", "theme"] as const
export const runtimeGraphFormats = ["esm", "cjs"] as const
export type RuntimeGraphEntrypoint = typeof runtimeGraphEntrypoints[number]
export type RuntimeGraphFormat = typeof runtimeGraphFormats[number]

type GraphArtifact = { file: string; bytes: number; sha256: string }
type GraphScan = {
  entry: string
  graphBytes: number
  samples: number[]
  externals: string[]
  nonliteralLoads: number
  artifacts: GraphArtifact[]
}

function commandOutput(command: string, args: string[]) {
  const result = Bun.spawnSync([command, ...args], { cwd: packageRoot, stdout: "pipe", stderr: "pipe" })
  return result.exitCode === 0 ? result.stdout.toString().trim() : "unavailable"
}

function environment() {
  return {
    bun: Bun.version,
    node: process.version,
    npm: commandOutput("npm", ["--version"]),
    platform: process.platform,
    architecture: process.arch,
    osRelease: process.platform === "darwin" ? commandOutput("sw_vers", ["-productVersion"]) : os.release(),
    buildTool: `tsdown ${packageRequire("tsdown/package.json").version}`,
  }
}

function sourceRevision() {
  return commandOutput("git", ["rev-parse", "HEAD"])
}

function scanEntrypoint(distRoot: string, entrypoint: RuntimeGraphEntrypoint, format: RuntimeGraphFormat, repetitions: number): GraphScan {
  const extension = format === "esm" ? "mjs" : "cjs"
  const entry = `${entrypoint}.${extension}`
  const entryPath = path.join(distRoot, entry)
  const scans = Array.from({ length: repetitions }, () => readEmittedGraph(entryPath))
  const normalize = (scan: ReturnType<typeof readEmittedGraph>) => ({
    bytes: scan.bytes,
    externals: scan.externals,
    nonliteralLoads: scan.nonliteralLoads,
    artifacts: scan.artifacts.map(artifact => ({
      file: path.relative(distRoot, artifact.file),
      bytes: artifact.bytes,
      sha256: artifact.sha256,
    })),
  })
  const first = normalize(scans[0]!)
  if (scans.some(scan => JSON.stringify(normalize(scan)) !== JSON.stringify(first))) {
    throw Error(`Runtime graph scan was not deterministic: ${entry}`)
  }
  return {
    entry,
    graphBytes: first.bytes,
    samples: scans.map(scan => scan.bytes),
    externals: first.externals,
    nonliteralLoads: first.nonliteralLoads,
    artifacts: first.artifacts,
  }
}

export function scanRuntimeGraphEvidence(packageRootOverride = packageRoot, repetitions = 5) {
  if (!Number.isInteger(repetitions) || repetitions < 5) throw Error("At least five independent graph scans are required")
  const distRoot = path.join(packageRootOverride, "dist")
  const currentGraphs = Object.fromEntries(runtimeGraphEntrypoints.map(entrypoint => [
    entrypoint,
    Object.fromEntries(runtimeGraphFormats.map(format => [format, scanEntrypoint(distRoot, entrypoint, format, repetitions)])),
  ])) as Record<RuntimeGraphEntrypoint, Record<RuntimeGraphFormat, GraphScan>>
  return {
    formatVersion: 1,
    recordedAt: new Date().toISOString(),
    sourceRevision: sourceRevision(),
    sourceState: "Current checkout after package build; every scan retains the same emitted artifact hashes",
    environment: environment(),
    protocol: {
      build: "bun run build",
      graphScanner: "packages/css/bench/effect-boundary-audit.ts readEmittedGraph",
      measure: "sum of emitted local graph artifact filesystem bytes",
      repetitions,
      repetitionOrder: "sequential scans of the same freshly rebuilt artifacts; graph bytes are deterministic and every scan retains the same artifact hashes",
      formats: [...runtimeGraphFormats],
      entrypoints: [...runtimeGraphEntrypoints],
    },
    currentGraphs,
  }
}
