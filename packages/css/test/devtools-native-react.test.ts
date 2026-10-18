import { expect, it } from "bun:test"
import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
it("publishes committed inputs only and survives React effect replay", () => {
 const run = spawnSync(process.execPath, [resolve(import.meta.dir, "support/devtools-native-react-probe.tsx")], { encoding:"utf8" })
 expect(run.stderr + run.stdout).toContain("native inspector commits passed")
 expect(run.status).toBe(0)
})

it("selects, refreshes, previews and copies without regenerating or accepting stale captures", () => {
 const run = spawnSync(process.execPath, [resolve(import.meta.dir, "support/devtools-native-widget-probe.tsx")], { encoding:"utf8" })
 expect(run.stderr + run.stdout).toContain("native inspector widget passed")
 expect(run.status).toBe(0)
})

it("keeps closed bookkeeping free of explanation work and inspector work out of target parents", () => {
 const run = spawnSync(process.execPath, [resolve(import.meta.dir, "support/devtools-native-cost-probe.tsx")], { encoding: "utf8" })
 expect(run.status).toBe(0)
 expect(JSON.parse(run.stdout).closed.explanations).toBe(0)
})
