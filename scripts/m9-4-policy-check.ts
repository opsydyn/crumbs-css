import { readFileSync } from "node:fs"
import { decodeStyleExplanationMetadata } from "../packages/css/src/devtools/style-explanation-schema"
import { decodeManifest } from "../packages/css/src/tooling/manifest/schema"
import { encodeCanonicalDesignSystemPolicyReport } from "../packages/css/src/tooling/policy/canonical-json"
import { checkDesignSystemPolicy } from "../packages/css/src/tooling/policy/check"
import type { DesignSystemManifest } from "../packages/css/src/tooling/manifest/model"
import type {
  DesignSystemPolicy,
  DesignSystemPolicyReport,
  PolicyMeasurement,
  PolicyReportJson,
} from "../packages/css/src/tooling/policy/model"
import { decodeDesignSystemPolicy, decodePolicyMeasurements } from "../packages/css/src/tooling/policy/schema"
import type { StyleExplanationMetadata } from "../packages/css/src/devtools/style-explanation-model"

export type PolicyCheckOptions = {
  readonly policyPath: string
  readonly currentPath: string
  readonly consumerPaths: ReadonlyArray<string>
  readonly styleMetadataPaths: ReadonlyArray<string>
  readonly measurementPaths: ReadonlyArray<string>
  readonly evaluatedOn?: string
  readonly format: "text" | "json"
}

/** Parse strict explicit-file command arguments, accepting Bun's leading `--`. */
export function parsePolicyCheckArgs(args: ReadonlyArray<string>): PolicyCheckOptions {
  const input = args[0] === "--" ? args.slice(1) : args
  const seen = new Set<string>()
  const consumers: string[] = []
  const styleMetadata: string[] = []
  const measurements: string[] = []
  let policyPath: string | undefined
  let currentPath: string | undefined
  let evaluatedOn: string | undefined
  let format: "text" | "json" = "text"

  for (let index = 0; index < input.length;) {
    const option = input[index]!
    if (
      option !== "--policy" && option !== "--current" && option !== "--consumer" &&
      option !== "--style-metadata" && option !== "--measurement" &&
      option !== "--evaluated-on" && option !== "--format"
    ) {
      throw new TypeError(option.startsWith("--")
        ? `Unknown option ${JSON.stringify(option)}.`
        : `Unexpected positional argument ${JSON.stringify(option)}.`)
    }
    const repeatable = option === "--consumer" || option === "--style-metadata" || option === "--measurement"
    if (!repeatable && seen.has(option)) throw new TypeError(`Duplicate ${option} option.`)
    const value = input[index + 1]
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      throw new TypeError(`Missing value for ${option}.`)
    }
    if (repeatable) {
      if (option === "--consumer") consumers.push(value)
      else if (option === "--style-metadata") styleMetadata.push(value)
      else measurements.push(value)
    } else {
      seen.add(option)
      if (option === "--policy") policyPath = value
      else if (option === "--current") currentPath = value
      else if (option === "--evaluated-on") evaluatedOn = value
      else if (value === "text" || value === "json") format = value
      else throw new TypeError(`Unsupported --format value ${JSON.stringify(value)}; expected text or json.`)
    }
    index += 2
  }

  if (policyPath === undefined) throw new TypeError("Missing required --policy <policy.json> option.")
  if (currentPath === undefined) throw new TypeError("Missing required --current <manifest.json> option.")
  return {
    policyPath,
    currentPath,
    consumerPaths: consumers,
    styleMetadataPaths: styleMetadata,
    measurementPaths: measurements,
    ...(evaluatedOn === undefined ? {} : { evaluatedOn }),
    format,
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function readJson(label: string, path: string): unknown {
  let source: string
  try {
    source = readFileSync(path, "utf8")
  } catch (error) {
    throw new TypeError(`Cannot read ${label} at ${JSON.stringify(path)}: ${errorMessage(error)}`)
  }
  try {
    return JSON.parse(source) as unknown
  } catch (error) {
    throw new TypeError(`Invalid JSON in ${label} at ${JSON.stringify(path)}: ${errorMessage(error)}`)
  }
}

function readDecoded<T>(label: string, path: string, decode: (input: unknown) => T): T {
  try {
    return decode(readJson(label, path))
  } catch (error) {
    const detail = errorMessage(error)
    if (detail.includes(JSON.stringify(path))) throw error
    throw new TypeError(`Invalid ${label} at ${JSON.stringify(path)}: ${detail}`)
  }
}

function sortJsonKeys(value: PolicyReportJson): PolicyReportJson {
  if (Array.isArray(value)) return value.map(sortJsonKeys)
  if (value === null || typeof value !== "object") return value
  const record = value as { readonly [key: string]: PolicyReportJson }
  const output: Record<string, PolicyReportJson> = Object.create(null) as Record<string, PolicyReportJson>
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

function formatJsonValue(value: PolicyReportJson): string {
  return JSON.stringify(sortJsonKeys(value))
}

/** Render a deterministic text view of the complete policy report. */
export function formatPolicyReportText(report: DesignSystemPolicyReport): string {
  const lines = [
    `Crumbs design-system policy report v${report.schemaVersion}`,
    `Policy: ${report.policy.policyId}@${report.policy.version}`,
    `Preset: ${report.preset.name}@${report.preset.version}`,
    `Provider: ${report.provider.name}@${report.provider.version}`,
    `Supplied consumers: ${report.suppliedConsumers.length === 0
      ? "none"
      : report.suppliedConsumers.map(({ name, version }) => `${name}@${version}`).join(", ")}`,
    ...(report.evaluatedOn === undefined ? [] : [`Evaluated on: ${report.evaluatedOn}`]),
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
      lines.push(`- [${finding.level}] ${finding.ruleId} — ${finding.subjectId} (${finding.fieldPath}) — ${finding.disposition}`)
      lines.push(`  ${finding.message}`)
      if (finding.exception !== undefined) {
        lines.push(`  exception: ${finding.exception.reason}${finding.exception.expiresOn === undefined ? "" : ` (expires ${finding.exception.expiresOn})`}`)
      }
      lines.push(`  evidence: ${formatJsonValue(finding.evidence)}`)
    }
  }

  if (report.exceptionDiagnostics.length === 0) lines.push("Exception diagnostics: none")
  else {
    lines.push("Exception diagnostics:")
    for (const diagnostic of report.exceptionDiagnostics) {
      lines.push(`- [${diagnostic.level}] ${diagnostic.code} — ${diagnostic.ruleId} / ${diagnostic.subjectId}`)
      lines.push(`  ${diagnostic.reason}${diagnostic.expiresOn === undefined ? "" : ` (expired ${diagnostic.expiresOn})`}`)
    }
  }

  if (report.analysisLimits.length === 0) lines.push("Analysis limits: none")
  else {
    lines.push("Analysis limits:")
    for (const limit of report.analysisLimits) {
      lines.push(`- ${limit.code}${limit.subjectId === undefined ? "" : ` — ${limit.subjectId}`}: ${limit.message}`)
    }
  }
  return `${lines.join("\n")}\n`
}

function run(options: PolicyCheckOptions): { readonly report: DesignSystemPolicyReport; readonly exitCode: 0 | 1 } {
  const policy: DesignSystemPolicy = readDecoded("policy", options.policyPath, decodeDesignSystemPolicy)
  const current: DesignSystemManifest = readDecoded("current manifest", options.currentPath, decodeManifest)
  const consumers = options.consumerPaths.map(path => readDecoded("consumer manifest", path, decodeManifest))
  const styleMetadata: ReadonlyArray<StyleExplanationMetadata> = options.styleMetadataPaths.map(path =>
    readDecoded("style metadata", path, decodeStyleExplanationMetadata))
  const measurements: PolicyMeasurement[] = options.measurementPaths.flatMap(path =>
    readDecoded("measurement list", path, decodePolicyMeasurements))
  let report: DesignSystemPolicyReport
  try {
    report = checkDesignSystemPolicy({
      policy,
      current,
      consumers,
      styleMetadata,
      measurements,
      ...(options.evaluatedOn === undefined ? {} : { evaluatedOn: options.evaluatedOn }),
    })
  } catch (error) {
    throw new TypeError(`Cannot evaluate policy ${JSON.stringify(options.policyPath)} against current manifest ${JSON.stringify(options.currentPath)}: ${errorMessage(error)}`)
  }
  const hasActiveError = report.findings.some(finding => finding.disposition === "active" && finding.level === "error")
  return { report, exitCode: hasActiveError ? 1 : 0 }
}

if (import.meta.main) {
  try {
    const options = parsePolicyCheckArgs(process.argv.slice(2))
    const result = run(options)
    process.stdout.write(options.format === "json"
      ? encodeCanonicalDesignSystemPolicyReport(result.report)
      : formatPolicyReportText(result.report))
    process.exitCode = result.exitCode
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`)
    process.exitCode = 2
  }
}
