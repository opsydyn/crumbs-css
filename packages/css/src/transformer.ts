import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import * as path from "node:path"
import * as vm from "node:vm"
import type { Adapter } from "@vanilla-extract/css"
import * as vanillaAdapter from "@vanilla-extract/css/adapter"
import { transformCss } from "@vanilla-extract/css/transformCss"
import {
  compile,
  cssFileFilter,
  getSourceFromVirtualCssFile,
  parseFileScope,
  serializeCss,
  stringifyFileScope,
} from "@vanilla-extract/integration"
import { cssDeclarationsToRN } from "./css-to-rn"
import { NativeTransformCacheMetadataType, type NativeTransformCacheMetadata } from "./transform-cache"
import { assertNativeCssCompatibility, NativeStylesCompatibilityError } from "./native-compatibility"
import { NativeStylesDiagnosticCode } from "./diagnostics"
import { captureNativeExports } from "./export-values"
import { parseCssClassRules } from "./parse-virtual-css"
import { splitStructuredNativeValues } from "./structured-native-values"
import { getNativeCaptureMetadata } from "./compiler/native-capture"
import { captureCompatibilityIntoNativeIr } from "./compiler/compatibility-adapter"
import { emitStyleSheetModule, type BuildStyleSheetCodeOptions } from "./compiler/code-emission"
import {
  analyseDependencyInputs,
  createDependencyCacheIdentity,
} from "./compiler/dependency-analysis"
import { indexStyleExportOwnership } from "./compiler/export-ownership"
import {
  captureScalarIntoNativeIr,
  lowerScalarBlock,
  type ScalarDeclarationBlock,
} from "./compiler/native-ir"
import {
  captureStructuredIntoNativeIr,
  lowerStructuredBlock,
  StructuredIrAdmissionError,
  type StructuredDeclarationBlock,
} from "./compiler/structured-ir"

// Minimal esbuild plugin shape. `setup` receives `build: unknown` so it doesn't
// conflict with esbuild's PluginBuild, which is pulled in transitively and has
// stricter onEnd callback types. We cast to OnEndBuild inside setup instead.
type OnEndResult = { metafile?: { inputs: Record<string, unknown> } }
type OnEndBuild = { onEnd: (cb: (result: OnEndResult) => void) => void }
type EsbuildPlugin = { name: string; setup: (build: unknown) => void }
type Composition = { identifier: string; classList: string }
type CssBlock = Parameters<typeof transformCss>[0]["cssObjs"][number]
type StyleExportValue = unknown
type CapturedNativeModule = {
  readonly exports: Record<string, unknown>
  readonly virtualCssPaths: ReadonlyArray<string>
}
export type TransformCssTsOptions = {
  readonly strictDiagnostics?: boolean
  readonly useStyleSheet?: boolean
  readonly platform?: string | null
  readonly dev?: boolean
}
type NativeTransformResult = {
  readonly code: string
  readonly cacheMetadata: NativeTransformCacheMetadata
}
const originalNodeEnv = process.env.NODE_ENV

// -- Testable core functions --------------------------------------------------

/**
 * Generates the output JS module string from pre-built maps plus a list of
 * file-level compile-time dependencies (other .css.ts files imported by this
 * one via esbuild).
 *
 * The dep side-effect imports let Metro track those files in its module graph.
 * Metro 0.84 still caches an importing .css.ts transform by that file's own
 * content, so a dependency-only edit does not by itself rebuild baked values.
 * Direct .css.ts edits invalidate normally. Dependency-aware Metro cache stores
 * inspect the metadata attached to transformed results and miss when any
 * project-authored input hash changes.
 */
export function buildStyleSheetCode(
  exportMap: ReadonlyMap<string, StyleExportValue>,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
  depRelativePaths: ReadonlyArray<string> = [],
  options: BuildStyleSheetCodeOptions = {},
): string {
  return emitStyleSheetModule(exportMap, classStyles, depRelativePaths, options)
}

function sourceIdentity(filePath: string, projectRoot: string): { readonly packageOwner: string; readonly sourceId: string } {
  let directory = path.dirname(path.resolve(filePath))
  const resolvedProjectRoot = path.resolve(projectRoot)
  while (true) {
    const manifestPath = path.join(directory, "package.json")
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { name?: unknown }
      if (typeof manifest.name === "string" && manifest.name.length > 0) {
        return {
          packageOwner: manifest.name,
          sourceId: toPosixPath(path.relative(directory, path.resolve(filePath))),
        }
      }
    } catch {
      // Continue toward the project root when this directory is not a package.
    }
    if (directory === resolvedProjectRoot || path.dirname(directory) === directory) break
    directory = path.dirname(directory)
  }
  return {
    packageOwner: path.basename(resolvedProjectRoot) || "project",
    sourceId: toPosixPath(path.relative(resolvedProjectRoot, path.resolve(filePath))),
  }
}

function toPosixPath(value: string): string {
  return value.split(path.sep).join("/")
}

function evaluateCompiledCssModule(source: string, filePath: string, cssAdapter: Adapter): unknown {
  const fileRequire = createRequire(filePath)
  const module = { exports: {} as unknown, filename: filePath, id: filePath }
  const sandbox = {
    Buffer,
    __adapter__: cssAdapter,
    __dirname: path.dirname(filePath),
    __filename: filePath,
    console,
    exports: module.exports,
    global: undefined as unknown,
    module,
    process,
    require: fileRequire,
  }
  sandbox.global = sandbox

  const adapterBoundSource = `
    const { setAdapter, removeAdapter } = require('@vanilla-extract/css/adapter');
    setAdapter(__adapter__);
    try {
      ${source}
    } finally {
      if (removeAdapter) {
        removeAdapter();
      }
    }
  `

  new vm.Script(adapterBoundSource, { filename: filePath }).runInNewContext(sandbox)
  return module.exports
}

function restoreNodeEnv(value: string | undefined): void {
  if (value === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = value
  }
}

// Mirrors vanilla-extract's processVanillaFile, but uses createRequire in the VM
// sandbox. The upstream eval package's require-like shim returns undefined for
// @vanilla-extract/css/adapter under Bun, which breaks Expo/Metro script runs.
async function processVanillaFileForNative({
  source,
  filePath,
  outputCss = true,
  identOption = process.env.NODE_ENV === "production" ? "short" : "debug",
  nativeValuesByClass,
  nativeIrByClass,
  nativeStructuredIrByClass,
  projectRoot,
}: {
  source: string
  filePath: string
  outputCss?: boolean
  identOption?: ReturnType<Adapter["getIdentOption"]>
  nativeValuesByClass: Map<string, Record<string, unknown>>
  nativeIrByClass: Map<string, ScalarDeclarationBlock>
  nativeStructuredIrByClass: Map<string, StructuredDeclarationBlock>
  projectRoot: string
}): Promise<CapturedNativeModule> {
  const cssByFileScope = new Map<string, CssBlock[]>()
  const localClassNames = new Set<string>()
  const composedClassLists: Composition[] = []
  const usedCompositions = new Set<string>()
  const cssAdapter: Adapter = {
    appendCss: (css, fileScope) => {
      if (!outputCss) return
      if (css.type === "local") {
        const source = sourceIdentity(fileScope.filePath, projectRoot)
        const captureContext = {
          packageOwner: source.packageOwner,
          sourceId: source.sourceId,
          className: css.selector,
        }
        const rule = css.rule as Record<string, unknown>
        if (getNativeCaptureMetadata(rule) === undefined) {
          const compatibility = captureCompatibilityIntoNativeIr(rule, captureContext)
          if (compatibility.structuredBlock !== undefined) {
            nativeStructuredIrByClass.set(css.selector, compatibility.structuredBlock)
          }
          if (compatibility.scalarBlock !== undefined) {
            nativeIrByClass.set(css.selector, compatibility.scalarBlock)
          }
          css = { ...css, rule: compatibility.cssRule }
        } else {
          let structured: ReturnType<typeof captureStructuredIntoNativeIr>
          try {
            structured = captureStructuredIntoNativeIr(rule, captureContext)
          } catch (error) {
            if (!(error instanceof StructuredIrAdmissionError)) throw error
            throw new NativeStylesCompatibilityError(
              NativeStylesDiagnosticCode.UnsupportedStructuredValue,
              `${error.diagnostics[0].detail} Pass this value through the React Native runtime style prop instead.`,
            )
          }
          if (structured.block !== undefined) {
            nativeStructuredIrByClass.set(css.selector, structured.block)
          }
          const scalar = captureScalarIntoNativeIr(structured.cssRule, captureContext)
          if (scalar.block !== undefined) nativeIrByClass.set(css.selector, scalar.block)
          const { cssRule, nativeValues } = splitStructuredNativeValues(
            scalar.cssRule, `${fileScope.filePath} (class ${css.selector})`,
          )
          if (Object.keys(nativeValues).length > 0) nativeValuesByClass.set(css.selector, nativeValues)
          css = { ...css, rule: cssRule }
        }
      }
      const serialisedFileScope = stringifyFileScope(fileScope)
      const fileScopeCss = cssByFileScope.get(serialisedFileScope) ?? []
      fileScopeCss.push(css)
      cssByFileScope.set(serialisedFileScope, fileScopeCss)
    },
    getIdentOption: () => identOption,
    markCompositionUsed: (identifier) => {
      usedCompositions.add(identifier)
    },
    onEndFileScope: () => {},
    registerClassName: (className) => {
      localClassNames.add(className)
    },
    registerComposition: (composedClassList) => {
      composedClassLists.push(composedClassList)
    },
  }

  const currentNodeEnv = process.env.NODE_ENV
  restoreNodeEnv(originalNodeEnv)
  let evalResult: unknown
  try {
    evalResult = evaluateCompiledCssModule(source, filePath, cssAdapter)
  } finally {
    restoreNodeEnv(currentNodeEnv)
  }

  const virtualCssPaths: string[] = []
  for (const [serialisedFileScope, fileScopeCss] of cssByFileScope) {
    const fileScope = parseFileScope(serialisedFileScope)
    vanillaAdapter.setAdapter(cssAdapter)
    let css: string
    try {
      css = transformCss({
        composedClassLists,
        cssObjs: fileScopeCss,
        localClassNames: Array.from(localClassNames),
      }).join("\n")
    } finally {
      vanillaAdapter.removeAdapter()
    }

    const fileName = `${fileScope.filePath}.vanilla.css`
    virtualCssPaths.push(`${fileName}?source=${await serializeCss(css)}`)
  }

  const unusedCompositions = composedClassLists
    .filter(({ identifier }) => !usedCompositions.has(identifier))
    .map(({ identifier }) => identifier)
  const unusedCompositionRegex =
    unusedCompositions.length > 0 ? RegExp(`(${unusedCompositions.join("|")})\\s`, "g") : null

  return {
    exports: captureNativeExports(evalResult as Record<string, unknown>, filePath,
      new Set([...localClassNames, ...composedClassLists.map(entry => entry.classList)]), unusedCompositionRegex),
    virtualCssPaths: Object.freeze(virtualCssPaths),
  }
}

/**
 * Runs the full vanilla-extract → StyleSheet pipeline for a .css.ts file.
 * Also captures esbuild's metafile to extract compile-time dependencies (other
 * .css.ts files imported by this one) and returns them as paths relative to
 * the entry file's directory.
 */
export async function transformCssTsToStyleSheet(
  filePath: string,
  cwd: string,
  options: TransformCssTsOptions = {},
): Promise<string> {
  return (await transformCssTsToStyleSheetWithMetadata(filePath, cwd, options)).code
}

async function transformCssTsToStyleSheetWithMetadata(
  filePath: string,
  cwd: string,
  options: TransformCssTsOptions = {},
): Promise<NativeTransformResult> {
  const identOption = process.env.NODE_ENV === "production" ? "short" : "debug"
  const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(cwd, filePath)

  // Capture esbuild's resolved inputs via an onEnd plugin so we know which
  // files this .css.ts depends on at compile time.
  let capturedInputs: Record<string, unknown> = {}
  const capturePlugin: EsbuildPlugin = {
    name: "crumbs-capture-deps",
    setup(build) {
      ;(build as OnEndBuild).onEnd((result) => {
        capturedInputs = result.metafile?.inputs ?? {}
      })
    },
  }

  const { source } = await compile({
    filePath: absoluteFilePath,
    cwd,
    identOption,
    esbuildOptions: { plugins: [capturePlugin] },
  })

  const nativeValuesByClass = new Map<string, Record<string, unknown>>()
  const nativeIrByClass = new Map<string, ScalarDeclarationBlock>()
  const nativeStructuredIrByClass = new Map<string, StructuredDeclarationBlock>()
  const nativeModule = await processVanillaFileForNative({
    source,
    filePath: absoluteFilePath,
    identOption,
    nativeValuesByClass,
    nativeIrByClass,
    nativeStructuredIrByClass,
    projectRoot: cwd,
  })

  // Virtual CSS paths and safe named exports come from one compiler pass. The
  // final native module never serializes this data into a vanilla module and
  // evaluates it again merely to recover the same values.
  const virtualPaths = nativeModule.virtualCssPaths
  const exportMap = new Map<string, StyleExportValue>(Object.entries(nativeModule.exports))
  const exportOwnership = indexStyleExportOwnership(exportMap)

  const classStyles = new Map<string, Record<string, unknown>>()
  for (const vp of virtualPaths) {
    const cssFile = await getSourceFromVirtualCssFile(vp)
    assertNativeCssCompatibility(cssFile.source)
    for (const [cls, decls] of parseCssClassRules(cssFile.source)) {
      const exportName = exportOwnership.exportNameForClass(cls)
      const rnStyles = cssDeclarationsToRN(decls, {
        context: {
          className: cls,
          filePath: path.relative(cwd, absoluteFilePath),
          ...(exportName === undefined ? {} : { exportName }),
        },
        ...(options.strictDiagnostics === undefined
          ? {}
          : { strictDiagnostics: options.strictDiagnostics }),
      })
      if (Object.keys(rnStyles).length > 0) {
        classStyles.set(cls, rnStyles)
      }
    }
  }

  for (const [cls, nativeValues] of nativeValuesByClass) {
    classStyles.set(cls, { ...classStyles.get(cls), ...nativeValues })
  }
  for (const [cls, block] of nativeIrByClass) {
    classStyles.set(cls, { ...classStyles.get(cls), ...lowerScalarBlock(block) })
  }
  for (const [cls, block] of nativeStructuredIrByClass) {
    classStyles.set(cls, { ...classStyles.get(cls), ...lowerStructuredBlock(block) })
  }

  // Resolve composed class names (space-separated) by merging their styles.
  // Crumbs captures each inline rule and base in authored native order.
  // Later entries override earlier ones, including repeated and nested bases.
  // Raw vanilla-extract compositions retain upstream class-list semantics;
  // browser class-list order itself does not describe a CSS cascade.
  const resolvedClassStyles = new Map<string, Record<string, unknown>>()
  for (const compositeName of exportOwnership.classNames) {
    if (resolvedClassStyles.has(compositeName)) continue
    const classNames = compositeName.trim().split(/\s+/)
    const merged: Record<string, unknown> = {}
    for (const cls of classNames) {
      Object.assign(merged, classStyles.get(cls) ?? {})
    }
    if (Object.keys(merged).length > 0) {
      resolvedClassStyles.set(compositeName, merged)
    }
  }

  // Convert captured metafile inputs to relative dep paths.
  // Exclude the entry file itself, third-party packages, and this package's
  // compiled internals. Only user-authored project files should be emitted as
  // Metro-visible side-effect imports.
  const dependencyInputs = analyseDependencyInputs(capturedInputs, {
    cwd,
    absoluteEntryPath: absoluteFilePath,
    nativeStylesDistRoot: nativeStylesDistRoot(),
  })
  const depRelativePaths = dependencyInputs.map(({ importPath }) => importPath)
  const cacheIdentity = createDependencyCacheIdentity(dependencyInputs, {
    compilerKey: getCacheKey(),
    platform: options.platform ?? null,
    dev: options.dev ?? process.env.NODE_ENV !== "production",
    strictDiagnostics: options.strictDiagnostics === true,
    useStyleSheet: options.useStyleSheet ?? true,
    identOption: String(identOption),
  })

  const code = buildStyleSheetCode(
    exportMap,
    resolvedClassStyles,
    depRelativePaths,
    {
      ...(options.useStyleSheet === undefined ? {} : { useStyleSheet: options.useStyleSheet }),
      cacheIdentity,
    },
  )
  return {
    code,
    cacheMetadata: {
      $$type: NativeTransformCacheMetadataType,
      dependencies: Object.freeze(dependencyInputs.map(({ sourcePath, sourceHash }) => ({ sourcePath, sourceHash }))),
    },
  }
}

function nativeStylesDistRoot(): string {
  return path.resolve(path.dirname(__filename), "../dist")
}

// -- Metro transformer -------------------------------------------------------

// Bust the Metro transform cache when the transformer itself is rebuilt.
export function getCacheKey(): string {
  return createHash("md5")
    .update("@opsydyn/crumbs-css")
    .update(readFileSync(__filename))
    .digest("hex")
}

type TransformFn = (
  config: Record<string, unknown>,
  projectRoot: string,
  filename: string,
  data: Buffer,
  options: { platform?: string | null; dev: boolean },
) => Promise<unknown>

export async function transform(
  // Metro passes config.transformer (not the full config) to the transform fn.
  // upstreamTransformerPath is a custom field we add via metro.config.js.
  config: Record<string, unknown> & { upstreamTransformerPath?: string },
  projectRoot: string,
  filename: string,
  data: Buffer,
  options: { platform?: string | null; dev: boolean },
): Promise<unknown> {
  // Use the upstream transformer saved in metro.config.js (Expo's default
  // transform worker, which handles CSS modules, env files, etc.). Without this,
  // we'd fall through to bare metro-transform-worker which can't handle CSS.
  const upstreamPath = config.upstreamTransformerPath
  const defaultTransform: TransformFn =
    upstreamPath != null
      ? (require(upstreamPath) as { transform: TransformFn }).transform // eslint-disable-line @typescript-eslint/no-require-imports
      : getMetroTransformWorker()

  if (!cssFileFilter.test(filename)) {
    return defaultTransform(config, projectRoot, filename, data, options)
  }

  const nativeStylesConfig = config.nativeStyles as { strictDiagnostics?: boolean } | undefined
  const transformed = await transformCssTsToStyleSheetWithMetadata(filename, projectRoot, {
    strictDiagnostics:
      nativeStylesConfig?.strictDiagnostics === true ||
      process.env.CRUMBS_CSS_STRICT === "1",
    useStyleSheet: options.platform !== "web",
    platform: options.platform ?? null,
    dev: options.dev,
  })
  const result = await defaultTransform(config, projectRoot, filename, Buffer.from(transformed.code), options) as Record<string, unknown>
  const upstreamKey = typeof result.unstable_transformResultKey === "string" ? result.unstable_transformResultKey : "crumbs"
  const dependencyAwareKey = `${upstreamKey}:crumbs:${createHash("sha1").update(transformed.code).digest("hex")}`
  return { ...result, unstable_transformResultKey: dependencyAwareKey, __crumbsNativeStyles: transformed.cacheMetadata }
}

function getMetroTransformWorker(): TransformFn {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const worker = require("metro-transform-worker") as {
    transform?: TransformFn
    default?: { transform?: TransformFn }
  }

  const transformWorker = worker.transform ?? worker.default?.transform
  if (transformWorker === undefined) {
    throw new Error("metro-transform-worker has no transform export")
  }

  return transformWorker
}
