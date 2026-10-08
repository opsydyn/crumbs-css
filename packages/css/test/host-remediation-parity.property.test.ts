import { expect, it } from "bun:test"
import fc from "fast-check"
import { resolve } from "node:path"
import { runHostRuntimeParity, type HostParityCase } from "../bench/host-remediation/runtime-parity"

const modes = ["none", "permission", "state", "sparse", "symbol", "accessor", "proxy", "cycle", "null"] as const

it("compares generated runtime journeys in independent processes", async () => {
  const packageRoot = resolve(import.meta.dir, "..")
  // Ordinary suite verifies the harness against itself. Qualification supplies
  // the separately archived immutable control and retains both raw cohorts.
  const control = process.env.CRUMBS_HOST_REMEDIATION_CONTROL ?? packageRoot
  const samples = fc.sample(fc.tuple(fc.integer({ min: -100, max: 100 }), fc.constantFrom(...modes)), {
    seed: 20261008, numRuns: 100,
  })
  const cases: HostParityCase[] = samples.map(([scalar, mode], id) => ({ id, scalar, mode }))
  // Always exercise every boundary class, regardless of the generated seed.
  cases.push(...modes.map((mode, index) => ({ id: 100 + index, scalar: 12, mode })))
  const report = await runHostRuntimeParity(control, packageRoot, cases)
  expect(report.control.length).toBe(cases.length * 7)
  expect(report.mismatches).toEqual([])
  const proxy = report.control.find(row => row.label === "106:contract")!
  expect(proxy.outcome.trace).toEqual(["ownKeys", "ownKeys", "descriptor:0", "descriptor:length"])
  for (const cohort of [report.control, report.candidate]) {
    expect(cohort.find(row => row.label === "105:contract")!.outcome.trace).not.toContain("getter")
    expect(cohort.find(row => row.label === "108:contract")!.outcome.kind).toBe("value")
  }
}, 30_000)
