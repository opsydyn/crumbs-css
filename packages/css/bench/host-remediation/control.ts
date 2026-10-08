import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, symlinkSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { join, resolve } from "node:path"

const repository = resolve(import.meta.dir, "../../../..")
export const hostRemediationControlRevision = "c5206d1" as const
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex")
export type ControlInventory = Readonly<{
  sourceRevision: string
  sources: readonly Readonly<{ path: string; sha256: string }>[]
  artifacts: readonly Readonly<{ path: string; sha256: string }>[]
}>

function files(root: string, relative = ""): Array<{ path: string; sha256: string }> {
  if (!existsSync(join(root, relative))) return []
  return readdirSync(join(root, relative)).sort().flatMap(name => {
    const path = relative ? `${relative}/${name}` : name
    return statSync(join(root, path)).isDirectory() ? files(root, path) : [{ path, sha256: sha256(readFileSync(join(root, path))) }]
  })
}

export function captureControlInventory(packageRoot: string, sourceRevision: string): ControlInventory {
  const sources = files(packageRoot, "src")
  for (const path of ["package.json", "tsdown.config.ts", "build-policy.ts"]) {
    if (existsSync(join(packageRoot, path))) sources.push({ path, sha256: sha256(readFileSync(join(packageRoot, path))) })
  }
  sources.sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)
  return { sourceRevision, sources, artifacts: files(packageRoot, "dist") }
}

export function verifyControlInventory(packageRoot: string, expected: ControlInventory, revision: string): readonly string[] {
  const current = captureControlInventory(packageRoot, revision)
  const failures: string[] = []
  if (expected.sourceRevision !== revision) failures.push("source revision")
  if (JSON.stringify(expected.sources) !== JSON.stringify(current.sources) || current.sources.length === 0) failures.push("source inventory")
  if (JSON.stringify(expected.artifacts) !== JSON.stringify(current.artifacts) || current.artifacts.length === 0) failures.push("artifact inventory")
  return failures
}

export async function prepareHostRemediationControl(outputRoot: string) {
  if (existsSync(outputRoot)) throw new Error(`Control output already exists: ${outputRoot}`)
  mkdirSync(outputRoot, { recursive: true })
  const sourceRevision = execFileSync("git", ["rev-parse", hostRemediationControlRevision], { cwd: repository, encoding: "utf8" }).trim()
  const archive = join(outputRoot, "source.tar")
  execFileSync("git", ["archive", "--format=tar", `--output=${archive}`, sourceRevision], { cwd: repository })
  const tree = join(outputRoot, "tree")
  mkdirSync(tree)
  execFileSync("tar", ["-xf", archive, "-C", tree])
  const packageRoot = join(tree, "packages/css")
  symlinkSync(join(repository, "node_modules"), join(tree, "node_modules"), "dir")
  symlinkSync(join(repository, "packages/css/node_modules"), join(packageRoot, "node_modules"), "dir")
  const child = Bun.spawn([process.execPath, "run", "build"], { cwd: packageRoot, stdout: "pipe", stderr: "pipe" })
  const [exit, stdout, stderr] = await Promise.all([child.exited, new Response(child.stdout).text(), new Response(child.stderr).text()])
  writeFileSync(join(outputRoot, "build.log"), stdout + stderr)
  if (exit !== 0) throw new Error(`Control build failed (${exit}); see ${join(outputRoot, "build.log")}`)
  const inventory = captureControlInventory(packageRoot, sourceRevision)
  const require = createRequire(join(packageRoot, "package.json"))
  const tools = ["react", "effect", "tsdown", "@vanilla-extract/css", "@vanilla-extract/integration"].map(name => {
    const manifestPath = require.resolve(`${name}/package.json`)
    return { name, manifestPath, version: JSON.parse(readFileSync(manifestPath, "utf8")).version, manifestSha256: sha256(readFileSync(manifestPath)) }
  })
  writeFileSync(join(outputRoot, "inventory.json"), JSON.stringify({ ...inventory, packageRoot,
    archiveSha256: sha256(readFileSync(archive)), tools, bun: Bun.version, node: execFileSync("node", ["--version"], { encoding: "utf8" }).trim() }, null, 2) + "\n")
  const failures = verifyControlInventory(packageRoot, inventory, sourceRevision)
  if (failures.length) throw new Error(`Control inventory mismatch: ${failures.join(", ")}`)
  return { sourceRevision, packageRoot, artifacts: inventory.artifacts }
}

if (import.meta.main) {
  if (!process.argv[2]) throw new Error("Control output directory required")
  console.log(JSON.stringify(await prepareHostRemediationControl(resolve(process.argv[2])), null, 2))
}
