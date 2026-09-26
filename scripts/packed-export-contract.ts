import { spawn } from "node:child_process"
import { readFile, realpath, stat } from "node:fs/promises"
import { isAbsolute, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

export type PackedExportTarget = Readonly<{
  subpath: string
  conditions: ReadonlyArray<string>
  target: string
}>

export type PackedExportResolution = Readonly<{
  subpath: string
  import?: string
  require?: string
  types?: string
}>

/** Flatten conditional export targets without losing their subpath or conditions. */
export function collectPackedExportTargets(
  exports: Readonly<Record<string, unknown>>,
): ReadonlyArray<PackedExportTarget> {
  const entries = Object.keys(exports).some((key) => key.startsWith("."))
    ? Object.entries(exports)
    : [[".", exports] as const]
  const targets: Array<PackedExportTarget> = []

  const visit = (subpath: string, value: unknown, conditions: ReadonlyArray<string>): void => {
    if (value === null) return
    if (typeof value === "string") {
      targets.push({ subpath, conditions, target: value })
      return
    }
    if (Array.isArray(value)) {
      value.forEach((alternative, index) => visit(subpath, alternative, [...conditions, `fallback:${index}`]))
      return
    }
    if (typeof value === "object") {
      for (const [condition, branch] of Object.entries(value)) {
        visit(subpath, branch, [...conditions, condition])
      }
      return
    }
    throw new Error(`Unsupported export target for ${subpath}: expected a path or conditional map`)
  }

  for (const [subpath, value] of entries) {
    if (!subpath.startsWith(".")) {
      throw new Error(`Invalid package export key ${subpath}: expected a subpath beginning with .`)
    }
    visit(subpath, value, [])
  }
  return targets
}

/** Check every packed target and verify Node selects the manifest's import/require files. */
export async function verifyPackedExportMap(
  packageRoot: string,
  consumerRoot: string,
): Promise<ReadonlyArray<PackedExportResolution>> {
  const installedRoot = await realpath(packageRoot)
  const manifestPath = resolve(installedRoot, "package.json")
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
    readonly name?: unknown
    readonly exports?: unknown
  }
  if (typeof manifest.name !== "string" || !isRecord(manifest.exports)) {
    throw new Error(`Packed package at ${installedRoot} must declare a name and exports map`)
  }

  const targets = collectPackedExportTargets(manifest.exports)
  const checkedTargets = new Map<string, string>()
  for (const entry of targets) {
    if (!entry.target.startsWith("./") || isAbsolute(entry.target)) {
      throw new Error(`Export target ${entry.target} for ${entry.subpath} is outside the installed package`)
    }
    const candidate = resolve(installedRoot, entry.target.slice(2))
    if (!isPathWithin(installedRoot, candidate)) {
      throw new Error(`Export target ${entry.target} for ${entry.subpath} resolves outside the installed package`)
    }
    let canonicalTarget: string
    try {
      canonicalTarget = await realpath(candidate)
    } catch {
      throw new Error(`Export target ${entry.target} for ${entry.subpath} is missing; expected a regular file`)
    }
    if (!isPathWithin(installedRoot, canonicalTarget)) {
      throw new Error(`Export target ${entry.target} for ${entry.subpath} resolves outside the installed package`)
    }
    if (!(await stat(canonicalTarget)).isFile()) {
      throw new Error(`Export target ${entry.target} for ${entry.subpath} is not a regular file`)
    }
    checkedTargets.set(`${entry.subpath}\0${entry.target}`, canonicalTarget)
  }

  const subpaths = [...new Set(targets.map((entry) => entry.subpath))]
  const resolutions: Array<PackedExportResolution> = []
  for (const subpath of subpaths) {
    const entries = targets.filter((entry) => entry.subpath === subpath)
    const importTarget = selectTarget(entries, "import")
    const requireTarget = selectTarget(entries, "require")
    const typesTarget = selectTarget(entries, "types")
    const resolution: PackedExportResolution = {
      subpath,
      ...(importTarget === undefined ? {} : { import: importTarget }),
      ...(requireTarget === undefined ? {} : { require: requireTarget }),
      ...(typesTarget === undefined ? {} : { types: typesTarget }),
    }

    for (const [format, target] of [["import", importTarget], ["require", requireTarget]] as const) {
      if (target === undefined) continue
      const expected = checkedTargets.get(`${subpath}\0${target}`)
      if (expected === undefined) {
        throw new Error(`Selected ${format} target ${target} for ${subpath} was not validated`)
      }
      const actual = await resolveWithNode(consumerRoot, manifest.name, subpath, format)
      if (actual !== expected) {
        throw new Error(
          `Node ${format} resolution for ${manifest.name}${subpath === "." ? "" : subpath} selected ${actual}, expected ${expected} from ${target}`,
        )
      }
    }
    resolutions.push(resolution)
  }
  return resolutions
}

function selectTarget(
  entries: ReadonlyArray<PackedExportTarget>,
  condition: "import" | "require" | "types",
): string | undefined {
  const direct = entries.find((entry) => entry.conditions.includes(condition))
  if (direct !== undefined) return direct.target
  if (condition === "types") return undefined

  const opposite = condition === "import" ? "require" : "import"
  return entries.find((entry) =>
    !entry.conditions.includes(opposite) &&
    (entry.conditions.length === 0 || entry.conditions.includes("default"))
  )?.target
}

async function resolveWithNode(
  consumerRoot: string,
  packageName: string,
  subpath: string,
  format: "import" | "require",
): Promise<string> {
  const specifier = subpath === "." ? packageName : `${packageName}${subpath.slice(1)}`
  const source = format === "import"
    ? `process.stdout.write(import.meta.resolve(process.env.CRUMBS_EXPORT_SPECIFIER));`
    : `const { createRequire } = require("node:module"); const { resolve } = require("node:path"); process.stdout.write(createRequire(resolve(process.cwd(), "package.json")).resolve(process.env.CRUMBS_EXPORT_SPECIFIER));`
  const args = format === "import"
    ? ["--input-type=module", "-e", source]
    : ["-e", source]
  const output = await new Promise<string>((accept, reject) => {
    const child = spawn("node", args, {
      cwd: consumerRoot,
      env: { ...process.env, CRUMBS_EXPORT_SPECIFIER: specifier },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { stdout += chunk })
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => { stderr += chunk })
    child.once("error", reject)
    child.once("close", (code) => {
      if (code === 0) accept(stdout.trim())
      else reject(new Error(`Node ${format} resolution failed for ${specifier}: ${stderr.trim()}`))
    })
  })
  return format === "import" ? realpath(fileURLToPath(output)) : realpath(output)
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isPathWithin(root: string, candidate: string): boolean {
  const pathFromRoot = relative(root, candidate)
  return pathFromRoot === "" || (
    !isAbsolute(pathFromRoot) &&
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith(`..${sep}`)
  )
}
