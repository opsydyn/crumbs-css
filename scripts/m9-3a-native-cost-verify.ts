import { readFileSync, writeFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { join } from "node:path"

export function verifyNativeCost(value: any, app: string, platform: string, runId: string): void {
  const fail = (reason: string): never => { throw new Error(`${app}/${platform}: ${reason}`) }
  if (value?.error || value?.type !== "crumbs.m9.3a.native-cost" || value.version !== 1 || value.app !== app || value.platform !== platform || value.runId !== runId || value.engine !== "Hermes" || value.mode !== "development") fail("identity/error mismatch")
  const rows = value.rows
  for (const [name, targets] of [["disabled", 0], ["closed", 1]] as const) {
    const row = rows?.[name]
    if (!row || row.parentRenders !== 101 || row.getters !== 0 || row.explanations !== 0 || row.targets !== targets || row.reports !== 0 || row.updates !== 100 || !Number.isFinite(row.elapsedMs) || row.elapsedMs <= 0) fail(`${name} work/retention mismatch`)
    if (rows[`${name}Disposed`]?.targets !== 0 || rows[`${name}Disposed`]?.reports !== 0) fail(`${name} disposal mismatch`)
  }
  const selected = rows?.selected
  if (!selected || selected.parentRendersFromInspector !== 0 || selected.getters !== 20 || selected.explanations !== 20 || selected.targets !== 1 || selected.reports !== 1 || !Array.isArray(selected.explanationMs) || selected.explanationMs.length !== 20 || selected.explanationMs.some((n: unknown) => typeof n !== "number" || !Number.isFinite(n) || n < 0)) fail("selected work/retention mismatch")
}

if (import.meta.main) {
  const [directory, runId] = process.argv.slice(2)
  if (!directory || !runId) throw new Error("Usage: bun scripts/m9-3a-native-cost-verify.ts DIRECTORY RUN_ID")
  const rows = []
  for (const app of ["playground", "storybook"]) for (const platform of ["ios", "android"]) {
    const file = `${app}-${platform}.json`, text = readFileSync(join(directory, file), "utf8"), value = JSON.parse(text)
    verifyNativeCost(value, app, platform, runId)
    const sorted = [...value.rows.selected.explanationMs].sort((a: number,b: number) => a-b)
    rows.push({ app, platform, file, sha256: createHash("sha256").update(text).digest("hex"), disabledMs: value.rows.disabled.elapsedMs, closedMs: value.rows.closed.elapsedMs, explanationMedianMs: (sorted[9]+sorted[10])/2, explanationMaxMs: sorted[19] })
  }
  const result = { type: "crumbs.m9.3a.native-cost-matrix", version: 1, runId, status: "passed", rows, limits: "Development Hermes on Simulator/emulator, instrumented native source screen; JS diagnostic timings, not release frame/memory budgets or a usability study." }
  writeFileSync(join(directory, "matrix.json"), JSON.stringify(result,null,2)+"\n")
  console.log(JSON.stringify(result,null,2))
}
