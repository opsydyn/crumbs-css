import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readFile, stat, writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { auditPackedRuntimeEntrypoints } from "../../../../scripts/packed-runtime-graph"

const repoRoot = resolve(import.meta.dirname, "../../../..")
const packageRoot = resolve(repoRoot, "packages/css")
const entries = [
  {subpath: "./theme/token", targets: {esm: "dist/theme-token.mjs", cjs: "dist/theme-token.cjs"}},
  {subpath: "./theme/core", targets: {esm: "dist/theme-core.mjs", cjs: "dist/theme-core.cjs"}},
] as const
const records: Array<Record<string, unknown>> = []

for (let repetition = 1; repetition <= 5; repetition += 1) {
  const build = spawnSync("bun", ["run", "--filter", "@opsydyn/crumbs-css", "build"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  })
  if (build.status !== 0) {
    throw new Error(`Build ${repetition} failed: ${build.stderr}\n${build.stdout}`)
  }
  const formats: Array<Record<string, unknown>> = []
  for (const entry of entries) {
    for (const [format, relativePath] of Object.entries(entry.targets)) {
      const path = resolve(packageRoot, relativePath)
      const [contents, fileStat] = await Promise.all([readFile(path), stat(path)])
      formats.push({
        subpath: entry.subpath,
        format,
        path: relativePath,
        bytes: fileStat.size,
        sha256: createHash("sha256").update(contents).digest("hex"),
      })
    }
  }
  records.push({repetition, formats})
}

const graphs = (await auditPackedRuntimeEntrypoints(packageRoot))
  .filter((graph) => entries.some((entry) => entry.subpath === graph.subpath))
const graphReports = await Promise.all(graphs.map(async (graph) => {
  const fileReports = await Promise.all(graph.files.map(async (relativePath) => {
    const contents = await readFile(resolve(packageRoot, relativePath))
    return {path: relativePath, bytes: contents.byteLength, sha256: createHash("sha256").update(contents).digest("hex")}
  }))
  return {
    subpath: graph.subpath,
    format: graph.format,
    files: fileReports,
    graphBytes: fileReports.reduce((sum, file) => sum + file.bytes, 0),
    externalSpecifiers: graph.externalSpecifiers,
    dynamicLoaderExceptions: graph.dynamicLoaderExceptions,
  }
}))

const report = {
  protocol: "five independent package builds; one emitted local graph scan per import format",
  sourceRevision: "8ba4cf9cbd6783b307676076c5b8febe6fb7af49",
  runtime: {
    bun: spawnSync("bun", ["--version"], {encoding: "utf8"}).stdout.trim(),
    nodeExecutable: spawnSync("node", ["--version"], {encoding: "utf8"}).stdout.trim(),
    bunNodeCompatibility: process.version,
    platform: process.platform,
    architecture: process.arch,
  },
  candidateBudgetScreen: {
    esmMaximumBytes: 17271,
    cjsMaximumBytes: 17641,
    status: "inherited-comparison-only; not an admitted budget for ./theme/token",
  },
  repetitions: records,
  graphs: graphReports,
}
const output = JSON.stringify(report, null, 2) + "\n"
await writeFile(resolve(import.meta.dirname, "measurements.json"), output)
process.stdout.write(output)
