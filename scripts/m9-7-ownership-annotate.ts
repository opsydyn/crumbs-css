import { readFileSync } from "node:fs"
import {
  annotateDesignSystemReport,
  decodeDesignSystemOwnership,
  decodeOwnedReport,
  encodeCanonicalOwnedReport,
  type OwnedReport,
  type OwnershipAttribution,
  type SupportedSourceReport,
} from "../packages/css/src/tooling/ownership"
import { decodeManifest } from "../packages/css/src/tooling/manifest/schema"
import type { DesignSystemManifest } from "../packages/css/src/tooling/manifest/model"

export type OwnershipAnnotateOptions = {
  readonly ownershipPath: string
  readonly manifestPaths: ReadonlyArray<string>
  readonly reportPath: string
  readonly format: "text" | "json"
}

/** Parse strict explicit-file arguments, accepting Bun's leading `--`. */
export function parseOwnershipAnnotateArgs(args: ReadonlyArray<string>): OwnershipAnnotateOptions {
  const input = args[0] === "--" ? args.slice(1) : args
  const seen = new Set<string>()
  const manifestPaths: string[] = []
  let ownershipPath: string | undefined
  let reportPath: string | undefined
  let format: "text" | "json" = "text"

  for (let index = 0; index < input.length;) {
    const option = input[index]!
    if (option !== "--ownership" && option !== "--manifest" && option !== "--report" && option !== "--format") {
      throw new TypeError(option.startsWith("--")
        ? `Unknown option ${JSON.stringify(option)}.`
        : `Unexpected positional argument ${JSON.stringify(option)}.`)
    }

    if (option !== "--manifest" && seen.has(option)) throw new TypeError(`Duplicate ${option} option.`)
    const value = input[index + 1]
    if (value === undefined || value.length === 0 || value.startsWith("--")) {
      throw new TypeError(`Missing value for ${option}.`)
    }

    if (option === "--manifest") manifestPaths.push(value)
    else {
      seen.add(option)
      if (option === "--ownership") ownershipPath = value
      else if (option === "--report") reportPath = value
      else if (value === "text" || value === "json") format = value
      else throw new TypeError(`Unsupported --format value ${JSON.stringify(value)}; expected text or json.`)
    }
    index += 2
  }

  if (ownershipPath === undefined) throw new TypeError("Missing required --ownership <ownership.json> option.")
  if (manifestPaths.length === 0) throw new TypeError("Missing required --manifest <manifest.json> option; supply at least one manifest.")
  if (reportPath === undefined) throw new TypeError("Missing required --report <report.json> option.")
  return { ownershipPath, manifestPaths, reportPath, format }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    const code = "code" in error && typeof error.code === "string" ? `${error.code}: ` : ""
    return `${code}${error.message}`
  }
  return String(error)
}

function readJsonFile(label: string, path: string): unknown {
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

function readOwnership(path: string) {
  const input = readJsonFile("ownership metadata", path)
  try {
    return decodeDesignSystemOwnership(input)
  } catch (error) {
    throw new TypeError(`Invalid ownership metadata at ${JSON.stringify(path)}: ${errorMessage(error)}`)
  }
}

function readManifest(path: string): DesignSystemManifest {
  const input = readJsonFile("manifest", path)
  try {
    return decodeManifest(input)
  } catch (error) {
    throw new TypeError(`Invalid manifest at ${JSON.stringify(path)}: ${errorMessage(error)}`)
  }
}

/** Read only explicitly named inputs and return the validated ownership report. */
export function executeOwnershipAnnotateCommand(options: OwnershipAnnotateOptions): {
  readonly ownedReport: OwnedReport
  readonly exitCode: 0
} {
  const ownership = readOwnership(options.ownershipPath)
  const manifests = options.manifestPaths.map(readManifest)
  const sourceReport = readJsonFile("source report", options.reportPath)
  try {
    return {
      ownedReport: annotateDesignSystemReport({
        ownership,
        manifests,
        report: sourceReport as SupportedSourceReport,
      }),
      exitCode: 0,
    }
  } catch (error) {
    throw new TypeError(`Cannot annotate source report at ${JSON.stringify(options.reportPath)}: ${errorMessage(error)}`)
  }
}

function compareAttributions(left: OwnershipAttribution, right: OwnershipAttribution): number {
  const leftEntityId = left.entityId ?? ""
  const rightEntityId = right.entityId ?? ""
  return compareStrings(left.jsonPointer, right.jsonPointer) ||
    compareStrings(leftEntityId, rightEntityId) ||
    compareStrings(left.status, right.status)
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

/** Render validated attribution counts and source locations as deterministic text. */
export function formatOwnershipReportText(input: OwnedReport): string {
  const report = decodeOwnedReport(input)
  const attributions = [...report.attributions].sort(compareAttributions)
  let assigned = 0
  let unassigned = 0
  let unresolved = 0
  for (const attribution of attributions) {
    if (attribution.status === "assigned") assigned += 1
    else if (attribution.status === "unassigned") unassigned += 1
    else unresolved += 1
  }
  const lines = [
    `Crumbs design-system ownership report v${report.schemaVersion}`,
    `Source: ${report.source.format} v${report.source.schemaVersion}`,
    `Attributions: ${attributions.length}`,
    `Assigned: ${assigned}`,
    `Unassigned: ${unassigned}`,
    `Unresolved: ${unresolved}`,
  ]

  if (attributions.length > 0) {
    lines.push("Attribution locations:")
    for (const attribution of attributions) {
      const details = attribution.status === "assigned"
        ? `owner ${attribution.owner.displayName} (${attribution.owner.id})`
        : attribution.status === "unresolved"
          ? attribution.reason
          : "no owner assigned"
      lines.push(`- [${attribution.status}] ${attribution.entityId ?? "<no stable ID>"} — ${attribution.jsonPointer} (${details})`)
    }
  }

  if (report.analysisLimits.length > 0) {
    lines.push("Analysis limits:")
    for (const limit of report.analysisLimits) lines.push(`- ${limit.code}: ${limit.message}`)
  }
  return `${lines.join("\n")}\n`
}

if (import.meta.main) {
  try {
    const options = parseOwnershipAnnotateArgs(process.argv.slice(2))
    const result = executeOwnershipAnnotateCommand(options)
    process.stdout.write(options.format === "json"
      ? encodeCanonicalOwnedReport(result.ownedReport)
      : formatOwnershipReportText(result.ownedReport))
    process.exitCode = result.exitCode
  } catch (error) {
    process.stderr.write(`${errorMessage(error)}\n`)
    process.exitCode = 2
  }
}
