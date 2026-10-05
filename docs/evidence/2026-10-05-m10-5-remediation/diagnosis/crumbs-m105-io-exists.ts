import { createHash } from "node:crypto"
import { existsSync, readFileSync, realpathSync } from "node:fs"
import * as path from "node:path"

export type ResolutionFileReceipt = Readonly<{ sourcePath: string; sourceHash: string | null; canonicalPath: string | null }>
export type ResolutionIdentity = Readonly<{
  cacheable: boolean
  files: readonly ResolutionFileReceipt[]
  links: readonly Readonly<{ sourcePath: string; canonicalPath: string | null }>[]
}>
const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex")
function canonical(sourcePath: string): string | null {
  try { return existsSync(sourcePath) ? realpathSync(sourcePath) : null } catch { return null }
}
function fileReceipt(sourcePath: string): ResolutionFileReceipt {
  try { if (!existsSync(sourcePath)) return {sourcePath,sourceHash:null,canonicalPath:null}; return { sourcePath, sourceHash: hash(readFileSync(sourcePath)), canonicalPath: canonical(sourcePath) } }
  catch { return { sourcePath, sourceHash: null, canonicalPath: canonical(sourcePath) } }
}

// JSONC comments/trailing commas are configuration syntax, never evaluated code.
function readJsonc(bytes: string): Record<string, unknown> {
  let output = "", quoted = false, escaped = false
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i]!
    if (quoted) { output += c; if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; continue }
    if (c === '"') { quoted = true; output += c; continue }
    if (c === "/" && bytes[i + 1] === "/") { while (i + 1 < bytes.length && bytes[i + 1] !== "\n") i++; output += " "; continue }
    if (c === "/" && bytes[i + 1] === "*") { const end = bytes.indexOf("*/", i + 2); if (end < 0) throw Error("Unterminated config comment"); i = end + 1; output += " "; continue }
    output += c
  }
  let clean = ""; quoted = false; escaped = false
  for (let i = 0; i < output.length; i++) {
    const c = output[i]!
    if (quoted) { clean += c; if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') quoted = false; continue }
    if (c === '"') { quoted = true; clean += c; continue }
    if (c === ",") { let j = i + 1; while (j < output.length && /\s/.test(output[j]!)) j++; if (output[j] === "}" || output[j] === "]") continue }
    clean += c
  }
  const value: unknown = JSON.parse(clean.replace(/^\uFEFF/, ""))
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid config object")
  return value as Record<string, unknown>
}
function ancestors(start: string): string[] {
  const result: string[] = []
  for (let dir = path.resolve(start); result.length < 64; dir = path.dirname(dir)) {
    result.push(dir); if (path.dirname(dir) === dir) break
  }
  return result
}

/** Compiler-only receipts. No configuration or package code is executed. */
export function captureResolutionIdentity(
  inputs: Readonly<Record<string, unknown>>,
  options: { readonly cwd: string; readonly absoluteEntryPath: string; readonly verification?: boolean },
): ResolutionIdentity {
  const files = new Map<string, ResolutionFileReceipt>(), links = new Map<string, string | null>()
  let cacheable = true
  const fileLimit = options.verification ? Number.POSITIVE_INFINITY : 512
  const linkLimit = options.verification ? Number.POSITIVE_INFINITY : 512
  const configLimit = options.verification ? Number.POSITIVE_INFINITY : 64
  const aliasConfigs: { directory: string; baseUrl?: string; paths: Record<string, unknown> }[] = []
  const admit = (file: string) => {
    const absolute = path.resolve(file)
    const existing = files.get(absolute)
    if (existing !== undefined) return existing
    if (files.size >= fileLimit && !files.has(absolute)) { cacheable = false; return undefined }
    const receipt = fileReceipt(absolute); files.set(absolute, receipt); return receipt
  }
  const linkReceipt = (logical: string) => {
    if (links.has(logical)) return
    if (links.size >= linkLimit && !links.has(logical)) { cacheable = false; return }
    links.set(logical, canonical(logical))
  }
  const packageReceipt = (original: string, importer: string) => {
    const name = original.startsWith("@") ? original.split("/").slice(0, 2).join("/") : original.split("/")[0]!
    for (const dir of ancestors(path.dirname(importer))) {
      const logical = path.join(dir, "node_modules", name)
      linkReceipt(logical); admit(path.join(logical, "package.json"))
    }
  }
  // Follow current logical package paths, never Node's cached require.resolve.
  // Config extends uses require/node/default export conditions in esbuild's
  // Node compilation graph (including the package tsconfig field).
  const exportTarget = (value: unknown): string | undefined => {
    if (typeof value === "string") return value
    if (Array.isArray(value)) { for (const child of value) { const target = exportTarget(child); if (target !== undefined) return target } }
    else if (value !== null && typeof value === "object") for (const [condition, child] of Object.entries(value)) {
      if (["require", "node", "default"].includes(condition)) { const target = exportTarget(child); if (target !== undefined) return target }
    }
    return undefined
  }
  const packageConfig = (base: string, importer: string): string | undefined => {
    packageReceipt(base, importer)
    const name = base.startsWith("@") ? base.split("/").slice(0, 2).join("/") : base.split("/")[0]!
    const subpath = base.slice(name.length), exportKey = "." + subpath
    for (const directory of ancestors(path.dirname(importer))) {
      const root = path.join(directory, "node_modules", name)
      let joined = path.join(root, subpath)
      const manifest = admit(path.join(root, "package.json"))
      if (manifest?.sourceHash !== null && manifest !== undefined) {
        try {
          const data = JSON.parse(readFileSync(manifest.sourcePath, "utf8"))
          if (typeof data.tsconfig === "string") joined = path.resolve(root, data.tsconfig)
          let exported: unknown = data.exports
          let starValue: string | undefined
          if (exported !== null && typeof exported === "object" && !Array.isArray(exported) && Object.keys(exported).some(key => key.startsWith("."))) {
            const record = exported as Record<string, unknown>
            exported = record[exportKey]
            if (exported === undefined) for (const pattern of Object.keys(record).filter(key => key.includes("*")).sort((a,b) => b.indexOf("*") - a.indexOf("*") || b.length - a.length)) {
              const star = pattern.indexOf("*")
              if (exportKey.startsWith(pattern.slice(0,star)) && exportKey.endsWith(pattern.slice(star+1))) { exported = record[pattern]; starValue = exportKey.slice(star,exportKey.length-(pattern.length-star-1)); break }
            }
          } else if (exportKey !== ".") exported = undefined
          const target = exportTarget(exported)
          if (target !== undefined) {
            const file = path.resolve(root, starValue === undefined ? target : target.replaceAll("*",starValue))
            if (admit(file)?.sourceHash !== null) return file
          }
        } catch { cacheable = false }
      }
      for (const file of [path.join(joined,"tsconfig.json"),joined,joined+".json"]) if (admit(file)?.sourceHash !== null) return file
    }
    return undefined
  }
  const configs = new Set<string>(), active = new Set<string>()
  const config = (file: string) => {
    const logical = path.resolve(file), logicalReceipt = admit(logical)
    const absolute = logicalReceipt?.canonicalPath ?? logical, receipt = admit(absolute)
    if (receipt === undefined || active.has(absolute) || configs.size >= configLimit) { cacheable = false; return }
    if (configs.has(absolute)) return
    configs.add(absolute)
    if (receipt.sourceHash === null) { cacheable = false; return }
    active.add(absolute)
    try {
      const data = readJsonc(readFileSync(absolute, "utf8")), bases = data.extends === undefined ? [] : Array.isArray(data.extends) ? data.extends : [data.extends]
      const compiler = data.compilerOptions
      if (compiler !== null && typeof compiler === "object" && !Array.isArray(compiler)) {
        const value = compiler as Record<string, unknown>
        const paths = value.paths
        aliasConfigs.push({ directory: path.dirname(absolute), ...(typeof value.baseUrl === "string" ? {baseUrl:value.baseUrl} : {}), paths: paths !== null && typeof paths === "object" && !Array.isArray(paths) ? paths as Record<string, unknown> : {} })
      }
      for (const base of bases) {
        if (typeof base !== "string") { cacheable = false; continue }
        if (base.startsWith(".") || path.isAbsolute(base)) {
          const target = path.resolve(path.dirname(absolute), base)
          const exact = admit(target)
          if (exact?.sourceHash !== null && exact !== undefined) config(target)
          else config(target.endsWith(".json") ? target : target + ".json")
        } else {
          const target = packageConfig(base, absolute)
          if (target === undefined) cacheable = false
          else config(target)
        }
      }
    } catch { cacheable = false }
    finally { active.delete(absolute) }
  }
  admit(options.absoluteEntryPath)
  const authoredInputs = Object.keys(inputs).map(input => path.resolve(options.cwd, input)).filter(input => !input.split(path.sep).some(segment => segment === "node_modules" || segment === "dist"))
  for (const input of authoredInputs) admit(input)
  const dirs = new Set([...ancestors(path.dirname(options.absoluteEntryPath)), ...ancestors(options.cwd), ...authoredInputs.flatMap(input => ancestors(path.dirname(input)))])
  for (const dir of dirs) {
    for (const name of ["tsconfig.json", "jsconfig.json"]) { const file = path.join(dir, name); if (admit(file)?.sourceHash !== null) config(file) }
    for (const name of ["package.json", "bun.lock", "bun.lockb", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"]) admit(path.join(dir, name))
  }
  const pathCandidates = (logical: string) => {
    for (const candidate of [logical, ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css.ts"].map(extension => logical + extension), ...["index.ts", "index.tsx", "index.js", "index.jsx"].map(name => path.join(logical, name))]) linkReceipt(candidate)
  }
  const aliasBases = new Set([options.cwd, ...aliasConfigs.map(config => config.directory), ...aliasConfigs.filter(config => config.baseUrl !== undefined).map(config => path.resolve(config.directory, config.baseUrl!))])
  for (const [input, info] of Object.entries(inputs)) {
    const absolute = path.resolve(options.cwd, input)
    if (absolute.split(path.sep).some(segment => segment === "node_modules" || segment === "dist")) continue
    const imports = info !== null && typeof info === "object" && "imports" in info ? info.imports : undefined
    if (!Array.isArray(imports)) continue
    for (const item of imports) {
      if (item === null || typeof item !== "object" || item.external === true || typeof item.original !== "string") continue
      const original: string = item.original
      if (original.startsWith(".") || path.isAbsolute(original)) {
        const logical = path.resolve(path.dirname(absolute), original)
        // Observe both unresolved and extension/index candidates. Metro/esbuild
        // may report only the canonical target, losing the authored link spelling.
        pathCandidates(logical)
        continue
      }
      if (original.includes(":")) continue
      for (const config of aliasConfigs) {
        if (config.baseUrl !== undefined) pathCandidates(path.resolve(config.directory, config.baseUrl, original))
        for (const [pattern, targets] of Object.entries(config.paths)) {
          const star = pattern.indexOf("*")
          const matched = star < 0 ? original === pattern : original.startsWith(pattern.slice(0, star)) && original.endsWith(pattern.slice(star + 1))
          if (!matched || !Array.isArray(targets)) continue
          const segment = star < 0 ? "" : original.slice(star, original.length - (pattern.length - star - 1))
          for (const target of targets) if (typeof target === "string") for (const base of aliasBases) pathCandidates(path.resolve(base, target.replace("*", segment)))
        }
      }
      packageReceipt(original, absolute)
    }
  }
  return Object.freeze({ cacheable, files: Object.freeze([...files.values()].sort((a, b) => a.sourcePath.localeCompare(b.sourcePath)).map(receipt => Object.freeze(receipt))), links: Object.freeze([...links].sort(([a], [b]) => a.localeCompare(b)).map(([sourcePath, canonicalPath]) => Object.freeze({ sourcePath, canonicalPath }))) })
}

export function hasChangedResolutionIdentity(receipt: ResolutionIdentity): boolean {
  if (receipt === null || typeof receipt !== "object" || receipt.cacheable !== true || !Array.isArray(receipt.files) || !Array.isArray(receipt.links)) return true
  if (!receipt.files.every(item => item !== null && typeof item === "object" && typeof item.sourcePath === "string" && (item.sourceHash === null || typeof item.sourceHash === "string") && (item.canonicalPath === null || typeof item.canonicalPath === "string"))
    || !receipt.links.every(item => item !== null && typeof item === "object" && typeof item.sourcePath === "string" && (item.canonicalPath === null || typeof item.canonicalPath === "string"))) return true
  return receipt.files.some(prior => {
    const current = fileReceipt(prior.sourcePath)
    return current.sourceHash !== prior.sourceHash || current.canonicalPath !== prior.canonicalPath
  }) || receipt.links.some(prior => canonical(prior.sourcePath) !== prior.canonicalPath)
}

/** vanilla-extract caches package scope per cwd; scope changes need a fresh worker. */
export function assertPackageScopeIdentity(cwd: string, cached: { readonly name: string; readonly path: string }): void {
  for (const directory of ancestors(cwd)) {
    const manifest = path.join(directory, 'package.json')
    let name: unknown
    try { name = JSON.parse(readFileSync(manifest, 'utf8')).name }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue
      throw new Error(`Restart Metro after changing package scope: ${manifest}`, { cause: error })
    }
    if (!name) continue
    if (name !== cached.name || canonical(manifest) !== canonical(cached.path)) {
      throw new Error(`Restart Metro after changing package scope: ${manifest}`)
    }
    return
  }
  throw new Error(`Restart Metro after changing package scope: ${cwd}`)
}
