import { afterAll, expect, it } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { tmpdir } from "node:os"

const roots: string[] = []
afterAll(() => roots.forEach(root => rmSync(root, { recursive: true, force: true })))
function fixture(version = "1.20.1") {
  const root = mkdtempSync(join(tmpdir(), "crumbs-matched-css-edge-")); roots.push(root)
  const css = join(root, "packages/css/node_modules/@vanilla-extract/css")
  const app = join(root, "apps/playground")
  mkdirSync(css, { recursive: true }); mkdirSync(app, { recursive: true })
  writeFileSync(join(css, "package.json"), JSON.stringify({ name: "@vanilla-extract/css", version }))
  writeFileSync(join(root, "packages/css/package.json"), "{}")
  writeFileSync(join(app, "package.json"), "{}")
  return { root, css, app }
}
function run(root: string) {
  const workflow = Bun.YAML.parse(readFileSync(resolve(import.meta.dir, "../../../.github/workflows/publish.yml"), "utf8")) as any
  const step = workflow.jobs.qualify.steps.find((step: any) => step.name === "Expose locked Vanilla Extract to matched baseline app")
  if (!step) throw new Error("Matched baseline dependency edge step is missing")
  return execFileSync("bash", ["-e", "-c", step.run], { env: { ...process.env, BASELINE_ROOT: root }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
}

it("exposes the exact package dependency to an isolated baseline app without altering its manifest", () => {
  const f = fixture(); const before = readFileSync(join(f.app, "package.json"), "utf8")
  const resolveFromApp = () => execFileSync("node", ["-e", 'const r = require("node:module").createRequire(process.argv[1]); process.stdout.write(require("node:fs").realpathSync(r.resolve("@vanilla-extract/css/package.json")))', join(f.app, "package.json")], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
  expect(resolveFromApp).toThrow()
  run(f.root)
  expect(resolveFromApp()).toBe(realpathSync(join(f.css, "package.json")))
  expect(readFileSync(join(f.app, "package.json"), "utf8")).toBe(before)
  expect(() => run(f.root)).not.toThrow()
})

it("rejects a drifting locked package or existing app edge without replacing it", () => {
  const wrongPackage = fixture("1.20.2")
  expect(() => run(wrongPackage.root)).toThrow("Locked Vanilla Extract must be 1.20.1")
  const f = fixture(); const other = join(f.app, "node_modules/@vanilla-extract/css")
  mkdirSync(other, { recursive: true })
  writeFileSync(join(other, "package.json"), JSON.stringify({ name: "@vanilla-extract/css", version: "1.20.2" }))
  expect(() => run(f.root)).toThrow("Existing baseline edge differs")
  expect(JSON.parse(readFileSync(join(other, "package.json"), "utf8")).version).toBe("1.20.2")
})
