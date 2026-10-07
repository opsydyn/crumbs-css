import { createHash } from "node:crypto"
import { rm, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"

const repoRoot = resolve(import.meta.dirname, "../../../..")
const reproRoot = import.meta.dirname
const encoded = await readFile(join(reproRoot, "theme-token-only-candidate.patch.b64"), "utf8")
const patch = Buffer.from(encoded.replace(/\s+/gu, ""), "base64")
const expectedSha256 = "66f1d4ffc90efbcafee0e49fdd6812284d026c225ddb111f352ad83207ddc528"
const actualSha256 = createHash("sha256").update(patch).digest("hex")
if (actualSha256 !== expectedSha256) throw new Error(`Candidate patch digest mismatch: ${actualSha256}`)

const patchPath = join(tmpdir(), `crumbs-m105-token-only-${process.pid}.patch`)
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
