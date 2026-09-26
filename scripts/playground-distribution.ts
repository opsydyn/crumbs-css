import { resolve } from "node:path"
import { buildPackedDistributionArtifacts } from "./packed-distribution-build"

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  if (args.length !== 1 || args[0] !== "--artifacts-only") {
    throw new Error("Usage: bun run playground:distribution --artifacts-only")
  }

  const repositoryRoot = resolve(import.meta.dir, "..")
  const artifacts = await buildPackedDistributionArtifacts(repositoryRoot)
  console.log(JSON.stringify(artifacts, null, 2))
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
}
