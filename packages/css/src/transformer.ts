import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import * as path from "node:path"
import * as vm from "node:vm"
import type { Adapter, FileScope } from "@vanilla-extract/css"
import * as vanillaAdapter from "@vanilla-extract/css/adapter"
import { transformCss } from "@vanilla-extract/css/transformCss"
import {
  compile,
  cssFileFilter,
  getSourceFromVirtualCssFile,
  parseFileScope,
  serializeCss,
  serializeVanillaModule,
  stringifyFileScope,
} from "@vanilla-extract/integration"
import { cssDeclarationsToRN } from "./css-to-rn"
import { assertNativeCssCompatibility } from "./native-compatibility"
import { parseCssClassRules } from "./parse-virtual-css"

// Minimal esbuild plugin shape. `setup` receives `build: unknown` so it doesn't
// conflict with esbuild's PluginBuild, which is pulled in transitively and has
// stricter onEnd callback types. We cast to OnEndBuild inside setup instead.
type OnEndResult = { metafile?: { inputs: Record<string, unknown> } }
type OnEndBuild = { onEnd: (cb: (result: OnEndResult) => void) => void }
type EsbuildPlugin = { name: string; setup: (build: unknown) => void }
type Composition = { identifier: string; classList: string }
type CssBlock = Parameters<typeof transformCss>[0]["cssObjs"][number]
type StyleExportValue = unknown
export type TransformCssTsOptions = {
  readonly strictDiagnostics?: boolean
  readonly useStyleSheet?: boolean
}
type BuildStyleSheetCodeOptions = {
  readonly useStyleSheet?: boolean
}

const originalNodeEnv = process.env.NODE_ENV

// -- Testable core functions --------------------------------------------------

/**
 * Generates the output JS module string from pre-built maps plus a list of
 * file-level compile-time dependencies (other .css.ts files imported by this
 * one via esbuild).
 *
 * The dep side-effect imports let Metro track those files in its module graph,
 * so that when a shared token/theme file changes, Metro re-transforms every
 * .css.ts that depends on it rather than serving stale StyleSheet output.
 */
export function buildStyleSheetCode(
  exportMap: ReadonlyMap<string, StyleExportValue>,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
  depRelativePaths: ReadonlyArray<string> = [],
  options: BuildStyleSheetCodeOptions = {},
): string {
  const useStyleSheet = options.useStyleSheet ?? true
  const createEntries = [...classStyles.entries()]
    .map(([cls, styles]) => `  "${cls}": ${JSON.stringify(styles)}`)
    .join(",\n")

  const exports = [...exportMap.entries()]
    .map(([name, value]) => serializeStyleExport(name, value, classStyles))
    .join("\n")

  const depImports =
    depRelativePaths.length > 0 ? depRelativePaths.map((p) => `import "${p}";`).join("\n") : ""

  const parts = [
    useStyleSheet ? `import { StyleSheet } from "react-native";` : "",
    depImports,
    useStyleSheet
      ? `const _s = StyleSheet.create({\n${createEntries}\n});`
      : `const _s = {\n${createEntries}\n};`,
    exports,
  ].filter(Boolean)

  return parts.join("\n")
}

function serializeStyleExport(
  name: string,
  value: StyleExportValue,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
): string {
  if (typeof value === "string") {
    return classStyles.has(value)
      ? `export const ${name} = _s["${value}"];`
      : `export const ${name} = undefined;`
  }

  return `export const ${name} = ${serializeExportValue(value, classStyles)};`
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
  serializeVirtualCssPath,
}: {
  source: string
  filePath: string
  outputCss?: boolean
  identOption?: ReturnType<Adapter["getIdentOption"]>
  serializeVirtualCssPath?: (file: {
    fileName: string
    fileScope: FileScope
    source: string
  }) => string | Promise<string>
}): Promise<string> {
  const cssByFileScope = new Map<string, CssBlock[]>()
  const localClassNames = new Set<string>()
  const composedClassLists: Composition[] = []
  const usedCompositions = new Set<string>()
  const cssAdapter: Adapter = {
    appendCss: (css, fileScope) => {
      if (!outputCss) return
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

  const cssImports: string[] = []
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
    const virtualCssFilePath =
      serializeVirtualCssPath !== undefined
        ? await serializeVirtualCssPath({ fileName, fileScope, source: css })
        : `import '${fileName}?source=${await serializeCss(css)}';`
    cssImports.push(virtualCssFilePath)
  }

  const unusedCompositions = composedClassLists
    .filter(({ identifier }) => !usedCompositions.has(identifier))
    .map(({ identifier }) => identifier)
  const unusedCompositionRegex =
    unusedCompositions.length > 0 ? RegExp(`(${unusedCompositions.join("|")})\\s`, "g") : null

  return serializeVanillaModule(
    cssImports,
    evalResult as Record<string, unknown>,
    unusedCompositionRegex,
  )
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

  const vanillaFile = await processVanillaFileForNative({
    source,
    filePath: absoluteFilePath,
    identOption,
  })

  const lines = vanillaFile.split("\n")

  // The vanilla file can have multiple virtual CSS import lines (one per file in
  // the import graph). Collect all of them so classes from transitive deps are
  // available for composition resolution, but only the entry file's classes end
  // up in the final StyleSheet.
  const virtualImportRe = /^import\s+'([^']+\.vanilla\.css[^']*)';$/
  const virtualPaths: string[] = []
  let firstNonImportIdx = 0
  for (let i = 0; i < lines.length; i++) {
    const m = virtualImportRe.exec(lines[i] ?? "")
    if (m !== null) {
      const vp = m[1]
      if (vp !== undefined) virtualPaths.push(vp)
      firstNonImportIdx = i + 1
    }
  }

  const exportMap = new Map<string, StyleExportValue>()
  const remaining = lines.slice(firstNonImportIdx).join("\n")
  collectStyleExports(remaining, exportMap)

  const classStyles = new Map<string, Record<string, unknown>>()
  for (const vp of virtualPaths) {
    const cssFile = await getSourceFromVirtualCssFile(vp)
    assertNativeCssCompatibility(cssFile.source)
    for (const [cls, decls] of parseCssClassRules(cssFile.source)) {
      const exportName = findExportNameForClass(cls, exportMap)
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

  // Resolve composed class names (space-separated) by merging their styles.
  // VE composition: style([base, extra]) → export = "extra__x base__y"
  // Each name is looked up individually; later entries override earlier ones,
  // matching CSS cascade order (rightmost class wins on equal specificity).
  const resolvedClassStyles = new Map<string, Record<string, unknown>>()
  for (const compositeName of collectExportClassNames(exportMap)) {
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
  const entryDir = path.dirname(absoluteFilePath)
  const projectRoot = path.resolve(cwd)
  const depRelativePaths = Object.keys(capturedInputs)
    .map((p) => path.resolve(cwd, p))
    .filter((abs) => shouldEmitDependencyImport(abs, absoluteFilePath, projectRoot))
    .map((abs) => toRelativeImport(entryDir, abs))

  return buildStyleSheetCode(
    exportMap,
    resolvedClassStyles,
    depRelativePaths,
    options.useStyleSheet === undefined ? {} : { useStyleSheet: options.useStyleSheet },
  )
}

function shouldEmitDependencyImport(
  absoluteDependencyPath: string,
  absoluteEntryPath: string,
  projectRoot: string,
): boolean {
  return (
    absoluteDependencyPath !== absoluteEntryPath &&
    isInsidePath(projectRoot, absoluteDependencyPath) &&
    !isInsidePath(path.join(projectRoot, "node_modules"), absoluteDependencyPath) &&
    !isInsidePath(path.join(projectRoot, "dist"), absoluteDependencyPath) &&
    !isInsidePath(nativeStylesDistRoot(), absoluteDependencyPath)
  )
}

function nativeStylesDistRoot(): string {
  return path.resolve(path.dirname(__filename), "../dist")
}

function isInsidePath(parentPath: string, childPath: string): boolean {
  const relative = path.relative(parentPath, childPath)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function toRelativeImport(fromDir: string, absoluteDependencyPath: string): string {
  const rel = path.relative(fromDir, absoluteDependencyPath)
  return rel.startsWith(".") ? rel : `./${rel}`
}

function collectStyleExports(source: string, exportMap: Map<string, StyleExportValue>): void {
  const exports: Record<string, unknown> = {}
  const cjsSource = source.replace(
    /export\s+(?:var|const|let)\s+(\w+)\s*=/g,
    (_, name: string) => `exports.${name} =`,
  )

  try {
    new vm.Script(cjsSource).runInNewContext({ exports })
  } catch {
    collectStyleExportsWithRegex(source, exportMap)
    return
  }

  for (const [name, value] of Object.entries(exports)) {
    exportMap.set(name, value)
  }
}

function collectStyleExportsWithRegex(
  source: string,
  exportMap: Map<string, StyleExportValue>,
): void {
  const objectExportRe = /export\s+(?:var|const|let)\s+(\w+)\s*=\s*\{([\s\S]*?)\};/g
  const objectRanges: Array<readonly [number, number]> = []
  for (let m = objectExportRe.exec(source); m !== null; m = objectExportRe.exec(source)) {
    const name = m[1]
    const body = m[2]
    if (name !== undefined && body !== undefined) exportMap.set(name, parseExportObject(body))
    objectRanges.push([m.index, objectExportRe.lastIndex])
  }

  const flatExportRe = /export\s+(?:var|const|let)\s+(\w+)\s*=\s*["']([^"']+)["']/g
  for (let m = flatExportRe.exec(source); m !== null; m = flatExportRe.exec(source)) {
    if (objectRanges.some(([start, end]) => m.index >= start && m.index < end)) continue
    const name = m[1]
    const cls = m[2]
    if (name !== undefined && cls !== undefined) exportMap.set(name, cls)
  }
}

function parseExportObject(body: string): Record<string, string> {
  const result: Record<string, string> = {}
  const entryRe = /(?:["']?)([\w-]+)(?:["']?)\s*:\s*["']([^"']+)["']/g
  for (let m = entryRe.exec(body); m !== null; m = entryRe.exec(body)) {
    const key = m[1]
    const value = m[2]
    if (key !== undefined && value !== undefined) result[key] = value
  }
  return result
}

function collectExportClassNames(
  exportMap: ReadonlyMap<string, StyleExportValue>,
): ReadonlyArray<string> {
  return [...exportMap.values()].flatMap(collectClassNamesFromExportValue)
}

function findExportNameForClass(
  className: string,
  exportMap: ReadonlyMap<string, StyleExportValue>,
): string | undefined {
  for (const [name, value] of exportMap) {
    if (collectClassNamesFromExportValue(value).includes(className)) return name
  }

  return undefined
}

function serializeExportValue(
  value: unknown,
  classStyles: ReadonlyMap<string, Record<string, unknown>>,
): string {
  if (isRecipeClassRef(value)) {
    return classStyles.has(value.className) ? `_s["${value.className}"]` : "undefined"
  }
  if (typeof value === "string") {
    return classStyles.has(value) ? `_s["${value}"]` : JSON.stringify(value)
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    value === undefined
  ) {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeExportValue(entry, classStyles)).join(", ")}]`
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, entry]) => `${JSON.stringify(key)}: ${serializeExportValue(entry, classStyles)}`)
      .join(", ")
    return `{ ${entries} }`
  }

  return "undefined"
}

function collectClassNamesFromExportValue(value: unknown): ReadonlyArray<string> {
  if (isRecipeClassRef(value)) return [value.className]
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(collectClassNamesFromExportValue)
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(collectClassNamesFromExportValue)
  }
  return []
}

function isRecipeClassRef(value: unknown): value is { readonly className: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$type" in value &&
    value.$$type === "crumbs.css.class" &&
    "className" in value &&
    typeof value.className === "string"
  )
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
  const code = await transformCssTsToStyleSheet(filename, projectRoot, {
    strictDiagnostics:
      nativeStylesConfig?.strictDiagnostics === true ||
      process.env.CRUMBS_CSS_STRICT === "1",
    useStyleSheet: options.platform !== "web",
  })
  return defaultTransform(config, projectRoot, filename, Buffer.from(code), options)
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
