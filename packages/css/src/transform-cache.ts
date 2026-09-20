import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import type { CacheStore } from "metro-cache"

export const NativeTransformCacheMetadataType = "crumbs.css.transform-cache" as const

export type NativeTransformCacheMetadata = {
  readonly $$type: typeof NativeTransformCacheMetadataType
  readonly dependencies: ReadonlyArray<{
    readonly sourcePath: string
    readonly sourceHash: string
  }>
}

type CachedTransformResult = {
  readonly __crumbsNativeStyles?: unknown
}

export function createNativeStylesCacheStore<T>(inner: CacheStore<T>): CacheStore<T> {
  return {
    name: `crumbs-dependency-aware:${inner.name ?? "cache"}`,
    async get(key) {
      const value = await inner.get(key)
      const metadata = readMetadata(value)
      if (metadata === undefined) return value
      const changed = dependenciesChanged(metadata)
      return changed ? null : value
    },
    set(key, value) {
      return inner.set(key, value)
    },
    clear() {
      return inner.clear()
    },
  }
}

function readMetadata(value: unknown): NativeTransformCacheMetadata | undefined {
  if (value === null || typeof value !== "object") return undefined
  const metadata = (value as CachedTransformResult).__crumbsNativeStyles
  if (metadata === null || typeof metadata !== "object") return undefined
  const candidate = metadata as { $$type?: unknown; dependencies?: unknown }
  if (candidate.$$type !== NativeTransformCacheMetadataType || !Array.isArray(candidate.dependencies)) return undefined
  if (!candidate.dependencies.every(dependency => {
    if (dependency === null || typeof dependency !== "object") return false
    const item = dependency as { sourcePath?: unknown; sourceHash?: unknown }
    return typeof item.sourcePath === "string" && typeof item.sourceHash === "string"
  })) return undefined
  return candidate as NativeTransformCacheMetadata
}

function dependenciesChanged(metadata: NativeTransformCacheMetadata): boolean {
  return metadata.dependencies.some(dependency => {
    try {
      return createHash("sha256").update(readFileSync(dependency.sourcePath)).digest("hex") !== dependency.sourceHash
    } catch {
      return true
    }
  })
}
