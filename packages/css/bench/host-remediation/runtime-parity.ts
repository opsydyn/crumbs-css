import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { compareRuntimeOutcomes, type RuntimeOutcome } from "./receipts"

export type HostParityCase = Readonly<{
  id: number
  scalar: number
  mode: "none" | "permission" | "state" | "sparse" | "symbol" | "accessor" | "proxy" | "cycle" | "null"
}>
export type HostParityRow = Readonly<{ label: string; outcome: RuntimeOutcome }>

async function cohort(packageRoot: string, cases: readonly HostParityCase[]): Promise<HostParityRow[]> {
  const child = Bun.spawn([process.execPath, join(import.meta.dir, "runtime-worker.ts"), packageRoot], {
    cwd: packageRoot, stdin: "pipe", stdout: "pipe", stderr: "pipe",
  })
  child.stdin.write(JSON.stringify(cases)); child.stdin.end()
  const [exit, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
  if (exit !== 0) throw new Error(`Runtime parity worker failed (${exit}): ${stderr}`)
  const result = JSON.parse(stdout) as HostParityRow[]
  if (!Array.isArray(result) || result.length !== cases.length * 7 || new Set(result.map(row => row.label)).size !== result.length) {
    throw new Error("Invalid runtime parity cohort")
  }
  return result
}

export async function runHostRuntimeParity(controlRoot: string, candidateRoot: string, cases: readonly HostParityCase[]) {
  const control = await cohort(controlRoot, cases), candidate = await cohort(candidateRoot, cases)
  const mismatches = control.flatMap((row, index) => {
    const other = candidate[index]!
    const differences = [...compareRuntimeOutcomes(row.outcome, other.outcome)]
    if (other.label !== row.label) differences.push("label")
    return differences.length || other.label !== row.label ? [{ label: row.label, differences }] : []
  })
  return { control, candidate, mismatches }
}

if (import.meta.main) {
  const [control, output] = process.argv.slice(2)
  if (!control || !output) throw new Error("Usage: runtime-parity.ts <control-package-root> <output-directory>")
  const modes = ["none", "permission", "state", "sparse", "symbol", "accessor", "proxy", "cycle", "null"] as const
  const cases = Array.from({ length: 180 }, (_, id) => ({ id, scalar: (id * 37) % 201 - 100, mode: modes[id % modes.length]! }))
  const report = await runHostRuntimeParity(resolve(control), resolve(import.meta.dir, "../.."), cases)
  mkdirSync(output, { recursive: true })
  writeFileSync(join(output, "runtime-parity.json"), JSON.stringify({ cases, ...report }, null, 2) + "\n")
  console.log(JSON.stringify({ rows: report.control.length, mismatches: report.mismatches }))
  if (report.mismatches.length) process.exitCode = 1
}
