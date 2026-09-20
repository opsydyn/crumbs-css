import { createRequire } from "node:module"
import * as path from "node:path"
import type { MetroConfig } from "metro"
import type { TransformResult } from "metro/private/DeltaBundler/types"
import type { MetroCache } from "metro-cache"
import { hasChangedNativeTransformDependencies, createNativeStylesCacheStore, createNativeTransformResultKey } from "./transform-cache"

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
  const enhanceMiddleware = createNativeStylesEnhanceMiddleware(
    config.server?.enhanceMiddleware as unknown as ((middleware: NativeMetroMiddleware, server: NativeMetroServer) => NativeMetroMiddleware) | undefined,
  )
  return {
    ...config,
    transformerPath,
    ...(watchFolders === undefined ? {} : { watchFolders }),
    ...(cacheStores === undefined ? {} : { cacheStores }),
    ...(enhanceMiddleware === undefined ? {} : { server: { ...config.server, enhanceMiddleware } }),
  }
}

type NativeMetroGraphModule = {
  readonly path: string
  readonly __crumbsNativeStyles?: unknown
}

type NativeMetroRevision = {
  readonly graph: {
    readonly dependencies: ReadonlyMap<string, NativeMetroGraphModule>
  }
}

type NativeMetroServer = {
  readonly _config?: {
    readonly projectRoot?: string
  }
  getBundler(): {
    readonly _revisionsByGraphId?: ReadonlyMap<unknown, Promise<NativeMetroRevision>>
    getDeltaBundler(): {
      readonly _changeEventSource?: {
        emit(event: "change", payload: {
          readonly rootDir: string
          readonly changes: {
            readonly addedFiles: ReadonlyMap<string, { readonly isSymlink: false }>
            readonly modifiedFiles: ReadonlyMap<string, { readonly isSymlink: false }>
            readonly removedFiles: ReadonlyMap<string, { readonly isSymlink: false }>
          }
          readonly logger?: unknown
        }): void
      }
    }
  }
}

type NativeMetroTransformResult = {
  readonly unstable_transformResultKey?: unknown
  readonly __crumbsNativeStyles?: unknown
}

type NativeMetroTransformBundler = {
  transformFile: (...args: ReadonlyArray<unknown>) => Promise<NativeMetroTransformResult>
  __crumbsNativeStylesResultKeyBridge?: true
}

type NativeMetroMiddleware = (request: unknown, response: unknown, next: (error?: unknown) => void) => unknown

function createNativeStylesEnhanceMiddleware(
  originalEnhance: ((middleware: NativeMetroMiddleware, server: NativeMetroServer) => NativeMetroMiddleware) | undefined,
) {
  return (middleware: NativeMetroMiddleware, server: NativeMetroServer): NativeMetroMiddleware => {
    installNativeTransformResultKeyBridge(server)
    let pendingInvalidation: Promise<void> | undefined
    const wrapped: NativeMetroMiddleware = (request, response, next) => {
      const requestUrl = typeof request === "object" && request !== null && "url" in request
        ? (request as { url?: unknown }).url
        : undefined
      if (typeof requestUrl !== "string" || !requestUrl.includes(".bundle")) return middleware(request, response, next)
      pendingInvalidation ??= emitStaleNativeImporterChanges(server).finally(() => { pendingInvalidation = undefined })
      return pendingInvalidation.then(() => middleware(request, response, next), next)
    }
    return originalEnhance === undefined ? wrapped : originalEnhance(wrapped, server)
  }
}

function installNativeTransformResultKeyBridge(server: NativeMetroServer): void {
  const bundler = (server.getBundler() as unknown as { readonly _bundler?: NativeMetroTransformBundler })._bundler
  if (bundler === undefined || bundler.__crumbsNativeStylesResultKeyBridge === true) return
  const originalTransformFile = bundler.transformFile.bind(bundler)
  bundler.transformFile = async (...args) => {
    const result = await originalTransformFile(...args)
    const resultKey = createNativeTransformResultKey(result, result.unstable_transformResultKey)
    return resultKey === undefined ? result : { ...result, unstable_transformResultKey: resultKey }
  }
  bundler.__crumbsNativeStylesResultKeyBridge = true
}

async function emitStaleNativeImporterChanges(server: NativeMetroServer): Promise<void> {
  const revisions = server.getBundler()._revisionsByGraphId?.values()
  const stalePaths = new Set<string>()
  if (revisions !== undefined) {
    for (const revisionPromise of revisions) {
      const revision = await revisionPromise
      for (const module of revision.graph.dependencies.values()) {
        if (hasChangedNativeTransformDependencies({ __crumbsNativeStyles: module.__crumbsNativeStyles })) stalePaths.add(module.path)
      }
    }
  }
  if (stalePaths.size === 0) return
  const eventSource = server.getBundler().getDeltaBundler()._changeEventSource
  if (eventSource === undefined) return
  const rootDir = server._config?.projectRoot ?? path.parse([...stalePaths][0]!).root
  const modifiedFiles = new Map<string, { readonly isSymlink: false }>()
  for (const stalePath of stalePaths) modifiedFiles.set(path.relative(rootDir, stalePath), { isSymlink: false })
  eventSource.emit("change", {
    rootDir,
    changes: { addedFiles: new Map(), modifiedFiles, removedFiles: new Map() },
  })
}

function resolveTransformerPath(): string {
  try {
    return requireFromHere.resolve("./transformer.cjs")
  } catch {
    return requireFromHere.resolve("./transformer")
  }
}
