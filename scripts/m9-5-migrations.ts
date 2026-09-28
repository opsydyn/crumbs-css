import {
  chmodSync,
  closeSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { basename, dirname, relative, resolve, sep } from "node:path"
import { randomBytes } from "node:crypto"
import { decodeManifest } from "../packages/css/src/tooling/manifest/schema"
import type { DesignSystemManifest } from "../packages/css/src/tooling/manifest/model"
import { encodeCanonicalSourceMigrationReport } from "../packages/css/src/tooling/migrations/canonical-json"
import type {
  SourceMigration,
  SourceMigrationDiagnostic,
  SourceMigrationReport,
} from "../packages/css/src/tooling/migrations/model"
import {
  decodeSourceMigration,
  decodeSourceMigrationReport,
} from "../packages/css/src/tooling/migrations/schema"
import { planSourceMigration } from "../packages/css/src/tooling/migrations/plan"

export type SourceMigrationCliOptions = {
  readonly migrationPath: string
  readonly baselinePath: string
  readonly currentPath: string
  readonly filePaths: ReadonlyArray<string>
  readonly write?: true
  readonly format: "text" | "json"
}

export type SourceMigrationCliDependencies = {
  readonly cwd?: string
  readonly readTextFile?: (path: string) => string
  readonly fileMode?: (path: string) => number
  readonly atomicWrite?: (path: string, source: string, mode: number) => void
}

export type SourceMigrationCliExecution = {
  readonly exitCode: 0 | 1 | 2
  readonly stdout: string
  readonly stderr: string
  readonly report?: SourceMigrationReport
}

/** Parse strict, explicit-file migration command arguments. */
export function parseSourceMigrationArgs(
  args: ReadonlyArray<string>,
  cwd = process.cwd(),
): SourceMigrationCliOptions {
  const input = args[0] === "--" ? args.slice(1) : args
  const seen = new Set<string>()
  const filePaths: string[] = []
  let migrationPath: string | undefined
  let baselinePath: string | undefined
  let currentPath: string | undefined
  let write = false
  let format: "text" | "json" = "text"

  for (let index = 0; index < input.length;) {
    const option = input[index]!
    if (option === "--write") {
      if (seen.has(option)) throw new TypeError("Duplicate --write option.")
      seen.add(option)
      write = true
      index += 1
      continue
    }
    if (option !== "--migration" && option !== "--baseline" && option !== "--current" &&
      option !== "--file" && option !== "--format") {
      throw new TypeError(option.startsWith("--")
        ? "Unknown option " + JSON.stringify(option) + "."
        : "Unexpected positional argument " + JSON.stringify(option) + ".")
    }
    if (option !== "--file" && seen.has(option)) throw new TypeError("Duplicate " + option + " option.")
    const value = input[index + 1]
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      throw new TypeError("Missing value for " + option + ".")
    }
    if (option === "--file") filePaths.push(value)
    else {
      seen.add(option)
      if (option === "--migration") migrationPath = value
      else if (option === "--baseline") baselinePath = value
      else if (option === "--current") currentPath = value
      else if (value === "text" || value === "json") format = value
      else throw new TypeError("Unsupported --format value " + JSON.stringify(value) + "; expected text or json.")
    }
    index += 2
  }

  if (migrationPath === undefined) throw new TypeError("Missing required --migration <migration.json> option.")
  if (baselinePath === undefined) throw new TypeError("Missing required --baseline <manifest.json> option.")
  if (currentPath === undefined) throw new TypeError("Missing required --current <manifest.json> option.")
  if (filePaths.length === 0) throw new TypeError("At least one explicit --file <source.ts|source.tsx> option is required.")
  const normalizedPaths = new Set<string>()
  for (const path of filePaths) {
    const normalized = resolve(cwd, path)
    if (normalizedPaths.has(normalized)) {
      throw new TypeError("Duplicate normalized --file path " + JSON.stringify(path) + ".")
    }
    normalizedPaths.add(normalized)
  }

  return {
    migrationPath,
    baselinePath,
    currentPath,
    filePaths,
    ...(write ? { write: true as const } : {}),
    format,
  }
}

function displayPath(cwd: string, absolutePath: string): string {
  const path = relative(cwd, absolutePath).split(sep).join("/")
  return path.length === 0 ? basename(absolutePath) : path
}

function readText(path: string, label: string, display: string, readTextFile: (path: string) => string): string {
  try {
    return readTextFile(path)
  } catch {
    throw new TypeError("Cannot read " + label + " input " + JSON.stringify(display) + ".")
  }
}

function readJson(path: string, label: string, display: string, readTextFile: (path: string) => string): unknown {
  const text = readText(path, label, display, readTextFile)
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new TypeError("Invalid JSON in " + label + " input " + JSON.stringify(display) + ".")
  }
}


function atomicReplace(path: string, source: string, mode: number): void {
  const directory = dirname(path)
  const prefix = "." + basename(path) + ".crumbs-migration-"
  let descriptor: number | undefined
  let temporaryPath = ""
  for (let attempt = 0; attempt < 8; attempt += 1) {
    temporaryPath = resolve(directory, prefix + randomBytes(8).toString("hex") + ".tmp")
    try {
      descriptor = openSync(temporaryPath, "wx", mode)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
    }
  }
  if (descriptor === undefined) throw new Error("Could not reserve an atomic replacement file.")
  try {
    writeFileSync(descriptor, source, { encoding: "utf8" })
    fsyncSync(descriptor)
    closeSync(descriptor)
    descriptor = undefined
    chmodSync(temporaryPath, mode)
    renameSync(temporaryPath, path)
    temporaryPath = ""
  } finally {
    if (descriptor !== undefined) {
      try { closeSync(descriptor) } catch {}
    }
    if (temporaryPath.length > 0) {
      try { unlinkSync(temporaryPath) } catch {}
    }
  }
}

function renderText(report: SourceMigrationReport): string {
  const lines = [
    "Crumbs source migration report v" + report.schemaVersion,
    "Migration: " + report.migration.id + "@" + report.migration.revision,
    "Provider: " + report.provider.name,
    "Baseline: " + report.provider.baselineVersion,
    "Current: " + report.provider.currentVersion,
    "Files: " + report.files.length,
  ]
  for (const file of report.files) {
    lines.push("- [" + file.status + "] " + file.path +
      " — proposed " + file.proposedEditCount + ", applied " + file.appliedEditCount)
    lines.push("  sha256: " + file.beforeSha256 + " -> " + file.afterSha256)
  }
  if (report.diagnostics.length === 0) lines.push("Findings: none")
  else {
    lines.push("Findings: " + report.diagnostics.length)
    for (const diagnostic of report.diagnostics) {
      const location = diagnostic.path === undefined
        ? ""
        : " " + diagnostic.path + (diagnostic.line === undefined ? "" : ":" + diagnostic.line +
          (diagnostic.column === undefined ? "" : ":" + diagnostic.column))
      lines.push("- [" + diagnostic.code + "]" + location + " — " + diagnostic.message)
    }
  }
  lines.push("Analysis limits:")
  for (const limit of report.analysisLimits) lines.push("- " + limit.code + ": " + limit.message)
  return lines.join("\n") + "\n"
}

function render(report: SourceMigrationReport, format: "text" | "json"): string {
  return format === "json" ? encodeCanonicalSourceMigrationReport(report) : renderText(report)
}

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Source migration command failed."
}

function writeFailureReport(
  report: SourceMigrationReport,
  failedPath: string,
  completedPaths: ReadonlySet<string>,
): SourceMigrationReport {
  const files = report.files.map(file => {
    if (completedPaths.has(file.path)) {
      return { ...file, status: "written" as const, appliedEditCount: file.proposedEditCount }
    }
    if (file.path === failedPath) {
      return { ...file, status: "write-failed" as const, afterSha256: file.beforeSha256, appliedEditCount: 0 }
    }
    return {
      ...file,
      status: file.proposedEditCount === 0 ? "unchanged" as const : "ready" as const,
      afterSha256: file.beforeSha256,
      appliedEditCount: 0,
    }
  })
  const diagnostic: SourceMigrationDiagnostic = {
    code: "io.write-failed",
    message: "Atomic replacement failed; later named files were not attempted.",
    path: failedPath,
  }
  return decodeSourceMigrationReport({
    ...report,
    files,
    diagnostics: [...report.diagnostics, diagnostic],
  })
}

/**
 * Execute the command against explicit paths. Dependencies permit deterministic write-failure testing;
 * the default CLI uses synchronous local file operations.
 */
export function executeSourceMigrationCommand(
  args: ReadonlyArray<string>,
  dependencies: SourceMigrationCliDependencies = {},
): SourceMigrationCliExecution {
  const cwd = resolve(dependencies.cwd ?? process.cwd())
  let options: SourceMigrationCliOptions
  try {
    options = parseSourceMigrationArgs(args, cwd)
  } catch (error) {
    return { exitCode: 2, stdout: "", stderr: safeErrorMessage(error) + "\n" }
  }

  const readTextFile = dependencies.readTextFile ?? (path => readFileSync(path, "utf8"))
  const getFileMode = dependencies.fileMode ?? (path => lstatSync(path).mode & 0o7777)
  const migrationAbsolute = resolve(cwd, options.migrationPath)
  const baselineAbsolute = resolve(cwd, options.baselinePath)
  const currentAbsolute = resolve(cwd, options.currentPath)
  const migrationDisplay = displayPath(cwd, migrationAbsolute)
  const baselineDisplay = displayPath(cwd, baselineAbsolute)
  const currentDisplay = displayPath(cwd, currentAbsolute)

  let migration: SourceMigration
  let baseline: DesignSystemManifest
  let current: DesignSystemManifest
  try {
    migration = decodeSourceMigration(readJson(migrationAbsolute, "migration", migrationDisplay, readTextFile))
    baseline = decodeManifest(readJson(baselineAbsolute, "baseline manifest", baselineDisplay, readTextFile))
    current = decodeManifest(readJson(currentAbsolute, "current manifest", currentDisplay, readTextFile))
  } catch (error) {
    return { exitCode: 2, stdout: "", stderr: safeErrorMessage(error) + "\n" }
  }

  const sources: Array<{ readonly path: string; readonly source: string }> = []
  const absolutePaths = new Map<string, { readonly absolutePath: string; readonly mode: number }>()
  try {
    for (const filePath of options.filePaths) {
      const absolutePath = resolve(cwd, filePath)
      const path = displayPath(cwd, absolutePath)
      let stat
      try {
        stat = lstatSync(absolutePath)
      } catch {
        throw new TypeError("Cannot read source file " + JSON.stringify(path) + ".")
      }
      if (!stat.isFile() || stat.isSymbolicLink()) {
        throw new TypeError("Source input is not a regular file: " + JSON.stringify(path) + ".")
      }
      const source = readText(absolutePath, "source file", path, readTextFile)
      let mode: number
      try {
        mode = getFileMode(absolutePath) & 0o7777
      } catch {
        throw new TypeError("Cannot inspect source file mode " + JSON.stringify(path) + ".")
      }
      sources.push({ path, source })
      absolutePaths.set(path, { absolutePath, mode })
    }
  } catch (error) {
    return { exitCode: 2, stdout: "", stderr: safeErrorMessage(error) + "\n" }
  }

  let planned
  try {
    planned = planSourceMigration({ migration, baseline, current, files: sources })
  } catch (error) {
    return { exitCode: 2, stdout: "", stderr: safeErrorMessage(error) + "\n" }
  }
  if (planned.report.diagnostics.some(diagnostic => diagnostic.code === "source.parse-error")) {
    return {
      exitCode: 2,
      stdout: render(planned.report, options.format),
      stderr: "",
      report: planned.report,
    }
  }
  if (planned.report.diagnostics.length > 0) {
    return {
      exitCode: 1,
      stdout: render(planned.report, options.format),
      stderr: "",
      report: planned.report,
    }
  }
  if (options.write !== true) {
    return {
      exitCode: 0,
      stdout: render(planned.report, options.format),
      stderr: "",
      report: planned.report,
    }
  }

  const atomicWrite = dependencies.atomicWrite ?? atomicReplace
  const completedPaths = new Set<string>()
  let failedPath: string | undefined
  for (const output of planned.outputs) {
    if (!output.changed) continue
    const location = absolutePaths.get(output.path)
    if (location === undefined) {
      failedPath = output.path
      break
    }
    try {
      atomicWrite(location.absolutePath, output.source, location.mode)
      completedPaths.add(output.path)
    } catch {
      failedPath = output.path
      break
    }
  }
  const changedPaths = new Set(planned.outputs.filter(output => output.changed).map(output => output.path))
  const report = failedPath === undefined
    ? decodeSourceMigrationReport({
      ...planned.report,
      files: planned.report.files.map(file => !changedPaths.has(file.path)
        ? file
        : { ...file, status: "written" as const, appliedEditCount: file.proposedEditCount }),
    })
    : writeFailureReport(planned.report, failedPath, completedPaths)
  return {
    exitCode: failedPath === undefined ? 0 : 2,
    stdout: render(report, options.format),
    stderr: "",
    report,
  }
}

if (import.meta.main) {
  const execution = executeSourceMigrationCommand(process.argv.slice(2))
  if (execution.stdout.length > 0) process.stdout.write(execution.stdout)
  if (execution.stderr.length > 0) process.stderr.write(execution.stderr)
  process.exitCode = execution.exitCode
}
