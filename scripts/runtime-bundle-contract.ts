import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

type SourceMap = { sources?: unknown; sections?: Array<{ map: SourceMap }> }

export function assertRuntimeBundleSources(sources: ReadonlyArray<string>): number {
  let crumbs = 0
  for (const original of sources) {
    const source = original.replaceAll("\\", "/")
    if (/(?:^|\/)node_modules\/effect\//.test(source)) {
      throw new Error(`Effect dependency in ordinary runtime bundle: ${source}`)
    }
    if (/(?:^|\/)node_modules\/(?:@vanilla-extract\/|css-to-react-native\/|esbuild\/)/.test(source)) {
      throw new Error(`Compiler dependency in runtime bundle: ${source}`)
    }
    if (/(?:node_modules\/@opsydyn\/crumbs-css|packages\/css)\/(?:dist|src)\//.test(source)) {
      if (!/\/theme(?:-core)?\.(?:mjs|cjs)$/.test(source)) {
        throw new Error(`Non-runtime Crumbs module in runtime bundle: ${source}`)
      }
      crumbs++
    }
  }
  return crumbs
}

export async function verifyRuntimeBundles(directory: string) {
  const maps: string[] = []
  async function walk(root: string) {
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const file = join(root, entry.name)
      if (entry.isDirectory()) await walk(file)
      else if (entry.name.endsWith(".map")) maps.push(file)
    }
  }
  await walk(directory)
  const results: Array<{ file: string; crumbs: number }> = []
  function sources(map: SourceMap): string[] {
    const own = Array.isArray(map.sources)
      ? map.sources.filter((item): item is string => typeof item === "string")
      : []
    return [...own, ...(map.sections ?? []).flatMap(section => sources(section.map))]
  }
  for (const file of maps) {
    const map = JSON.parse(await readFile(file, "utf8")) as SourceMap
    results.push({ file, crumbs: assertRuntimeBundleSources(sources(map)) })
  }
  const missingPlatform = ["ios", "android", "web"].some(platform =>
    !results.some(result => result.crumbs > 0 && result.file.replaceAll("\\", "/").includes(`/${platform}/`)),
  )
  if (missingPlatform) {
    throw new Error("Runtime qualification requires iOS, Android and web source maps containing Crumbs runtime code")
  }
  return results
}

if (import.meta.main) {
  console.log(JSON.stringify(await verifyRuntimeBundles(process.argv[2]!), null, 2))
}
