import { createHash } from "node:crypto"
import { rm, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const repoRoot = resolve(import.meta.dirname, "../../../..")
const reproRoot = import.meta.dirname
const expectedBaseRevision = "df63092bb7de71448754c0268c783edb52c08608"
const isDescendant = spawnSync("git", ["merge-base", "--is-ancestor", expectedBaseRevision, "HEAD"], {cwd: repoRoot})
if (isDescendant.status !== 0) throw new Error(`HEAD must descend from candidate base ${expectedBaseRevision}`)
const sourceDiff = spawnSync("git", ["diff", "--quiet", expectedBaseRevision, "HEAD", "--", "packages/css", "apps/storybook", "scripts/packed-runtime-graph.ts"], {cwd: repoRoot})
if (sourceDiff.status !== 0) throw new Error("Candidate source paths differ from the recorded base revision")

const encoded = await readFile(join(reproRoot, "contract-derived-candidate.patch.b64"), "utf8")
const patch = Buffer.from(encoded.replace(/\s+/gu, ""), "base64")
const expectedSha256 = "85554fa6f1e6e4fc37d63c9d4fa6100cbbdb01705ded0acfd5371861edb4d14b"
const actualSha256 = createHash("sha256").update(patch).digest("hex")
if (actualSha256 !== expectedSha256) throw new Error(`Candidate patch digest mismatch: ${actualSha256}`)

const patchPath = join(tmpdir(), `crumbs-m105-contract-derived-${process.pid}.patch`)
try {
  await writeFile(patchPath, patch)
  const check = spawnSync("git", ["apply", "--check", "--unidiff-zero", patchPath], {
    cwd: repoRoot,
    encoding: "utf8",
  })
  if (check.status !== 0) throw new Error(`Candidate patch check failed:\n${check.stderr}\n${check.stdout}`)
  const applied = spawnSync("git", ["apply", "--unidiff-zero", patchPath], {
    cwd: repoRoot,
    encoding: "utf8",
  })
  if (applied.status !== 0) throw new Error(`Candidate patch application failed:\n${applied.stderr}\n${applied.stdout}`)
  process.stdout.write(`Applied candidate patch ${actualSha256} to ${repoRoot}\n`)
} finally {
  await rm(patchPath, {force: true})
}
