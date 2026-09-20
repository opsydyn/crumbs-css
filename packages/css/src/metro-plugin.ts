import { createRequire } from "node:module"
import type { MetroConfig } from "metro"
import type { TransformResult } from "metro/private/DeltaBundler/types"
import type { MetroCache } from "metro-cache"
import { createNativeStylesCacheStore } from "./transform-cache"

export { createNativeStylesCacheStore } from "./transform-cache"

const requireFromHere = createRequire(import.meta.url)

export function withNativeStyles(config: MetroConfig): MetroConfig {
  // Metro must require() the compiled CJS transformer.
  // The build step emits dist/transformer.cjs before expo start is run.
  const transformerPath: string = resolveTransformerPath()
  const watchFolders = config.projectRoot === undefined
    ? config.watchFolders
    : [...new Set([config.projectRoot, ...(config.watchFolders ?? [])])]
  const configuredCacheStores = config.cacheStores
  const cacheStores = typeof configuredCacheStores === "function"
    ? (metroCache: MetroCache) => configuredCacheStores(metroCache).map(store => createNativeStylesCacheStore<TransformResult>(store))
    : Array.isArray(configuredCacheStores)
      ? configuredCacheStores.map(store => createNativeStylesCacheStore<TransformResult>(store))
      : configuredCacheStores
  return {
    ...config,
    transformerPath,
    ...(watchFolders === undefined ? {} : { watchFolders }),
    ...(cacheStores === undefined ? {} : { cacheStores }),
  }
}

function resolveTransformerPath(): string {
  try {
    return requireFromHere.resolve("./transformer.cjs")
  } catch {
    return requireFromHere.resolve("./transformer")
  }
}
