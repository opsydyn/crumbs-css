import { readFileSync } from "node:fs"
import { checkManifestConsumers } from "../packages/css/src/tooling/manifest/consumer-check"
import { encodeCanonicalManifestCompatibilityReport } from "../packages/css/src/tooling/manifest/comparison-report-canonical-json"
import { compareManifests } from "../packages/css/src/tooling/manifest/comparison"
import { decodeManifest } from "../packages/css/src/tooling/manifest/schema"
import type {
  ManifestCompatibilityReport,
  ManifestReportJson,
} from "../packages/css/src/tooling/manifest/comparison-report-model"

export type ManifestCheckOptions = {
  readonly currentPath: string
  readonly baselinePath?: string
  readonly consumerPaths: ReadonlyArray<string>
  readonly format: "text" | "json"
}

/** Parse strict explicit-file command arguments, accepting Bun's leading `--`. */
export function parseManifestCheckArgs(args: ReadonlyArray<string>): ManifestCheckOptions {
  const input = args[0] === "--" ? args.slice(1) : args
  const seen = new Set<string>()
  const consumers: string[] = []
  let currentPath: string | undefined
  let baselinePath: string | undefined
  let format: "text" | "json" = "text"

  for (let index = 0; index < input.length;) {
    const option = input[index]!
    if (option !== "--current" && option !== "--baseline" && option !== "--consumer" && option !== "--format") {
      throw new TypeError(option.startsWith("--") ? `Unknown option ${JSON.stringify(option)}.` : `Unexpected positional argument ${JSON.stringify(option)}.`)
    }
    if (option !== "--consumer" && seen.has(option)) throw new TypeError(`Duplicate ${option} option.`)
    const value = input[index + 1]
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      throw new TypeError(`Missing value for ${option}.`)
    }
    if (option === "--consumer") consumers.push(value)
    else {
      seen.add(option)
      if (option === "--current") currentPath = value
      else if (option === "--baseline") baselinePath = value
      else if (value === "text" || value === "json") format = value
      else throw new TypeError(`Unsupported --format value ${JSON.stringify(value)}; expected text or json.`)
    }
    index += 2
  }

  if (currentPath === undefined) throw new TypeError("Missing required --current <manifest.json> option.")
  return {
    currentPath,
    ...(baselinePath === undefined ? {} : { baselinePath }),
    consumerPaths: consumers,
    format,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function readManifest(label: string, path: string): unknown {
  let source: string
  try {
    source = readFileSync(path, "utf8")
  } catch (error) {
    throw new TypeError(`Cannot read ${label} manifest at ${JSON.stringify(path)}: ${errorMessage(error)}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch (error) {
    throw new TypeError(`Invalid JSON in ${label} manifest at ${JSON.stringify(path)}: ${errorMessage(error)}`)
  }
  try {
    return decodeManifest(parsed)
  } catch (error) {
    throw new TypeError(`Invalid ${label} manifest at ${JSON.stringify(path)}: ${errorMessage(error)}`)
  }
}

function sortJsonKeys(value: ManifestReportJson): ManifestReportJson {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (value === null || typeof value !== "object") return value
  const record = value as { readonly [key: string]: ManifestReportJson }
  const output: Record<string, ManifestReportJson> = Object.create(null) as Record<string, ManifestReportJson>
  for (const key of Object.keys(record).sort()) {
    Object.defineProperty(output, key, {
      value: sortJsonKeys(record[key]!),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return output
}

function formatJsonValue(value: ManifestReportJson): string {
  return JSON.stringify(sortJsonKeys(value))
}

/** Render the same evidence in a concise deterministic human-readable report. */
export function formatManifestCompatibilityText(report: ManifestCompatibilityReport): string {
  const lines = [
    `Crumbs design-system compatibility report v${report.schemaVersion}`,
    `Mode: ${report.mode}`,
    `Provider: ${report.provider.name}`,
    ...(report.provider.baselineVersion === undefined ? [] : [`Baseline version: ${report.provider.baselineVersion}`]),
    `Current version: ${report.provider.currentVersion}`,
    `Supplied consumers: ${report.suppliedConsumers.length === 0 ? "none" : report.suppliedConsumers.map(({ name, version }) => `${name}@${version}`).join(", ")}`,
  ]

  if (report.findings.length === 0) lines.push("Findings: none")
  else {
    const counts = {
      error: report.findings.filter(finding => finding.level === "error").length,
      warning: report.findings.filter(finding => finding.level === "warning").length,
      info: report.findings.filter(finding => finding.level === "info").length,
    }
    lines.push(`Findings: ${counts.error} error, ${counts.warning} warning, ${counts.info} info`)
    for (const finding of report.findings) {
      lines.push(`- [${finding.level}] ${finding.code} — ${finding.entityId} (${finding.fieldPath})`)
      lines.push(`  ${finding.message}`)
      if (finding.before !== undefined) lines.push(`  before: ${formatJsonValue(finding.before)}`)
      if (finding.after !== undefined) lines.push(`  after: ${formatJsonValue(finding.after)}`)
      for (const reference of finding.affectedConsumers) {
        const { dependency } = reference
        const origin = dependency.origin === undefined
          ? ""
          : ` at ${dependency.origin.moduleId}:${dependency.origin.exportPath}${dependency.origin.property === undefined ? "" : `.${dependency.origin.property}`}`
        lines.push(`  consumer: ${reference.package.name}@${reference.package.version} ${dependency.kind} ${dependency.from} -> ${dependency.to}${origin}`)
      }
    }
  }

  lines.push("Analysis limits:")
  for (const limit of report.analysisLimits) lines.push(`- ${limit.code}: ${limit.message}`)
  return `${lines.join("\n")}\n`
}

function run(options: ManifestCheckOptions): { readonly report: ManifestCompatibilityReport; readonly exitCode: 0 | 1 } {
  const current = readManifest("current", options.currentPath)
  const consumers = options.consumerPaths.map(path => readManifest("consumer", path))
  let report: ManifestCompatibilityReport
  if (options.baselinePath === undefined) {
    try {
      report = checkManifestConsumers({ current, consumers })
    } catch (error) {
      const labels = options.consumerPaths.length === 0 ? "none" : options.consumerPaths.map(path => JSON.stringify(path)).join(", ")
      throw new TypeError(`Invalid supplied consumer manifests (${labels}): ${errorMessage(error)}`)
    }
  } else {
    const baseline = readManifest("baseline", options.baselinePath)
    try {
      report = compareManifests({ baseline, current, consumers })
    } catch (error) {
      const labels = options.consumerPaths.length === 0 ? "none" : options.consumerPaths.map(path => JSON.stringify(path)).join(", ")
      throw new TypeError(`Cannot compare baseline manifest ${JSON.stringify(options.baselinePath)} with current manifest ${JSON.stringify(options.currentPath)} and supplied consumers (${labels}): ${errorMessage(error)}`)
    }
  }
  return { report, exitCode: report.findings.some(finding => finding.level === "error") ? 1 : 0 }
}

if (import.meta.main) {
  try {
    const options = parseManifestCheckArgs(process.argv.slice(2))
    const result = run(options)
    process.stdout.write(options.format === "json"
      ? encodeCanonicalManifestCompatibilityReport(result.report)
      : formatManifestCompatibilityText(result.report))
    process.exitCode = result.exitCode
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`)
    process.exitCode = 2
  }
}
