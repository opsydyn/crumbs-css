import { createHash } from "node:crypto"
import { transformCssTsToStyleSheet } from "../src/transformer"

export type FirstTransformSample = {
  durationMs: number
  outputSha256: string
  outputBytes: number
  pid: number
}

export async function measureFirstTransform(fixture: string, root: string): Promise<FirstTransformSample> {
  const child = Bun.spawn([process.execPath, import.meta.path, fixture, root], {
    cwd: root, stdout: "pipe", stderr: "pipe",
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
  ])
  if (exitCode !== 0) throw Error(`First-transform child failed (${exitCode}): ${stderr}`)
  const sample = JSON.parse(stdout) as FirstTransformSample
  if (!Number.isFinite(sample.durationMs) || sample.durationMs <= 0 || !Number.isSafeInteger(sample.pid) || sample.pid === process.pid) throw Error("Invalid first-transform receipt")
  return sample
}

if (import.meta.main) {
  const [fixture, root] = process.argv.slice(2)
  if (!fixture || !root) throw Error("First-transform worker requires fixture and root")
  // Imports and process startup are excluded; lazy compiler initialization is included.
  const start = performance.now()
  const output = await transformCssTsToStyleSheet(fixture, root, { strictDiagnostics: true })
  const durationMs = performance.now() - start
  await Bun.write(Bun.stdout, JSON.stringify({
    durationMs, outputSha256: createHash("sha256").update(output).digest("hex"),
    outputBytes: Buffer.byteLength(output), pid: process.pid,
  }) + "\n")
  process.exit(0)
}
