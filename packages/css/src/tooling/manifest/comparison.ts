import { decodeManifest } from "./schema"
import type {
  DesignSystemManifest,
  ManifestComponent,
  ManifestToken,
} from "./model"
import type {
  ManifestAnalysisLimit,
  ManifestCompatibilityFinding,
  ManifestReportJson,
} from "./comparison-report-model"

export type ManifestContractComparison = {
  readonly provider: {
    readonly name: string
    readonly baselineVersion: string
    readonly currentVersion: string
  }
  readonly findings: ReadonlyArray<ManifestCompatibilityFinding>
  readonly analysisLimits: ReadonlyArray<ManifestAnalysisLimit>
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function sortObjectKeys(value: ManifestReportJson): ManifestReportJson {
  if (Array.isArray(value)) return value.map(sortObjectKeys)
  if (value === null || typeof value !== "object") return value
  const record = value as { readonly [key: string]: ManifestReportJson }
  const result: Record<string, ManifestReportJson> = Object.create(null) as Record<string, ManifestReportJson>
  for (const key of Object.keys(record).sort(compareOrdinal)) {
    Object.defineProperty(result, key, {
      value: sortObjectKeys(record[key]!),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return result
}

function canonicalJson(value: ManifestReportJson): string {
  return JSON.stringify(sortObjectKeys(value))
}

function normalizeTokenDomain(token: ManifestToken["domain"]): ManifestReportJson {
  return token.kind === "enum"
    ? { kind: token.kind, values: [...token.values].sort(compareOrdinal) }
    : token
}

function tokenContractValue(token: ManifestToken): ManifestReportJson {
  return {
    path: [...token.path],
    visibility: token.visibility,
    domain: normalizeTokenDomain(token.domain),
  }
}

function componentContractValue(component: ManifestComponent): ManifestReportJson {
  const variants: Record<string, ManifestReportJson> = Object.create(null) as Record<string, ManifestReportJson>
  for (const axis of Object.keys(component.variants).sort(compareOrdinal)) {
    variants[axis] = [...component.variants[axis]!].sort(compareOrdinal)
  }
  const defaults: Record<string, ManifestReportJson> = Object.create(null) as Record<string, ManifestReportJson>
  for (const key of Object.keys(component.defaults).sort(compareOrdinal)) {
    defaults[key] = component.defaults[key]!
  }
  return {
    slots: [...component.slots].sort(compareOrdinal),
    variants,
    defaults,
  }
}

function makeFinding(input: {
  readonly code: ManifestCompatibilityFinding["code"]
  readonly level: ManifestCompatibilityFinding["level"]
  readonly entityId: string
  readonly fieldPath: string
  readonly message: string
  readonly before?: ManifestReportJson
  readonly after?: ManifestReportJson
}): ManifestCompatibilityFinding {
  return {
    code: input.code,
    level: input.level,
    entityId: input.entityId,
    fieldPath: input.fieldPath,
    message: input.message,
    ...(input.before === undefined ? {} : { before: input.before }),
    ...(input.after === undefined ? {} : { after: input.after }),
    affectedConsumers: [],
  }
}

function compareFindings(left: ManifestCompatibilityFinding, right: ManifestCompatibilityFinding): number {
  return compareOrdinal(left.code, right.code) ||
    compareOrdinal(left.entityId, right.entityId) ||
    compareOrdinal(left.fieldPath, right.fieldPath) ||
    compareOrdinal(canonicalJson(left as unknown as ManifestReportJson), canonicalJson(right as unknown as ManifestReportJson))
}

function compareAnalysisLimits(left: ManifestAnalysisLimit, right: ManifestAnalysisLimit): number {
  return compareOrdinal(left.code, right.code) || compareOrdinal(left.message, right.message)
}

function publicTokenFindings(
  baseline: DesignSystemManifest,
  current: DesignSystemManifest,
): ReadonlyArray<ManifestCompatibilityFinding> {
  const baselineById = new Map(baseline.tokens.map(token => [token.id, token]))
  const currentById = new Map(current.tokens.map(token => [token.id, token]))
  const findings: ManifestCompatibilityFinding[] = []

  for (const before of baseline.tokens) {
    if (before.visibility !== "public") continue
    const after = currentById.get(before.id)
    if (after === undefined) {
      findings.push(makeFinding({
        code: "token.removed",
        level: "error",
        entityId: before.id,
        fieldPath: "token",
        message: `Public token ${JSON.stringify(before.id)} was removed.`,
        before: tokenContractValue(before),
      }))
      continue
    }
    if (after.visibility === "private") {
      findings.push(makeFinding({
        code: "token.visibility-reduced",
        level: "error",
        entityId: before.id,
        fieldPath: "visibility",
        message: `Public token ${JSON.stringify(before.id)} is now private.`,
        before: "public",
        after: "private",
      }))
      continue
    }
    const beforeDomain = normalizeTokenDomain(before.domain)
    const afterDomain = normalizeTokenDomain(after.domain)
    if (canonicalJson(beforeDomain) !== canonicalJson(afterDomain)) {
      findings.push(makeFinding({
        code: "token.domain-changed",
        level: "error",
        entityId: before.id,
        fieldPath: "domain",
        message: `Public token ${JSON.stringify(before.id)} changed domain.`,
        before: beforeDomain,
        after: afterDomain,
      }))
    }
  }

  for (const after of current.tokens) {
    if (after.visibility !== "public") continue
    const before = baselineById.get(after.id)
    if (before === undefined || before.visibility === "private") {
      findings.push(makeFinding({
        code: "token.added",
        level: "info",
        entityId: after.id,
        fieldPath: "token",
        message: `Public token ${JSON.stringify(after.id)} was added.`,
        after: tokenContractValue(after),
      }))
    }
  }
  return findings
}

function componentFindings(
  baseline: DesignSystemManifest,
  current: DesignSystemManifest,
): ReadonlyArray<ManifestCompatibilityFinding> {
  const baselineById = new Map(baseline.components.map(component => [component.id, component]))
  const currentById = new Map(current.components.map(component => [component.id, component]))
  const findings: ManifestCompatibilityFinding[] = []

  for (const before of baseline.components) {
    const after = currentById.get(before.id)
    if (after === undefined) {
      findings.push(makeFinding({
        code: "component.removed",
        level: "error",
        entityId: before.id,
        fieldPath: "component",
        message: `Component ${JSON.stringify(before.id)} was removed.`,
        before: componentContractValue(before),
      }))
      continue
    }

    const beforeSlots = new Set(before.slots)
    const afterSlots = new Set(after.slots)
    for (const slot of before.slots) {
      if (!afterSlots.has(slot)) {
        findings.push(makeFinding({
          code: "component.slot-removed",
          level: "error",
          entityId: before.id,
          fieldPath: `slots.${slot}`,
          message: `Component ${JSON.stringify(before.id)} removed slot ${JSON.stringify(slot)}.`,
          before: slot,
        }))
      }
    }
    for (const slot of after.slots) {
      if (!beforeSlots.has(slot)) {
        findings.push(makeFinding({
          code: "component.slot-added",
          level: "info",
          entityId: before.id,
          fieldPath: `slots.${slot}`,
          message: `Component ${JSON.stringify(before.id)} added slot ${JSON.stringify(slot)}.`,
          after: slot,
        }))
      }
    }

    const beforeAxes = new Set(Object.keys(before.variants))
    const afterAxes = new Set(Object.keys(after.variants))
    for (const axis of Object.keys(before.variants)) {
      const beforeValues = before.variants[axis]!
      const afterValues = after.variants[axis]
      if (afterValues === undefined) {
        findings.push(makeFinding({
          code: "component.variant-removed",
          level: "error",
          entityId: before.id,
          fieldPath: `variants.${axis}`,
          message: `Component ${JSON.stringify(before.id)} removed variant axis ${JSON.stringify(axis)}.`,
          before: [...beforeValues].sort(compareOrdinal),
        }))
        continue
      }
      const afterValueSet = new Set(afterValues)
      const beforeValueSet = new Set(beforeValues)
      for (const value of beforeValues) {
        if (!afterValueSet.has(value)) {
          findings.push(makeFinding({
            code: "component.variant-removed",
            level: "error",
            entityId: before.id,
            fieldPath: `variants.${axis}.values.${value}`,
            message: `Component ${JSON.stringify(before.id)} removed value ${JSON.stringify(value)} from variant ${JSON.stringify(axis)}.`,
            before: value,
          }))
        }
      }
      for (const value of afterValues) {
        if (!beforeValueSet.has(value)) {
          findings.push(makeFinding({
            code: "component.variant-added",
            level: "info",
            entityId: before.id,
            fieldPath: `variants.${axis}.values.${value}`,
            message: `Component ${JSON.stringify(before.id)} added value ${JSON.stringify(value)} to variant ${JSON.stringify(axis)}.`,
            after: value,
          }))
        }
      }
    }
    for (const axis of Object.keys(after.variants)) {
      if (!beforeAxes.has(axis)) {
        findings.push(makeFinding({
          code: "component.variant-added",
          level: "info",
          entityId: before.id,
          fieldPath: `variants.${axis}`,
          message: `Component ${JSON.stringify(before.id)} added variant axis ${JSON.stringify(axis)}.`,
          after: [...after.variants[axis]!].sort(compareOrdinal),
        }))
      }
    }

    const defaultKeys = new Set([...Object.keys(before.defaults), ...Object.keys(after.defaults)])
    for (const key of [...defaultKeys].sort(compareOrdinal)) {
      const beforeHasDefault = Object.prototype.hasOwnProperty.call(before.defaults, key)
      const afterHasDefault = Object.prototype.hasOwnProperty.call(after.defaults, key)
      const beforeDefault = before.defaults[key]
      const afterDefault = after.defaults[key]
      if (beforeHasDefault === afterHasDefault && beforeDefault === afterDefault) continue
      findings.push(makeFinding({
        code: "component.default-changed",
        level: "warning",
        entityId: before.id,
        fieldPath: `defaults.${key}`,
        message: `Component ${JSON.stringify(before.id)} changed default ${JSON.stringify(key)}.`,
        ...(beforeHasDefault ? { before: beforeDefault } : {}),
        ...(afterHasDefault ? { after: afterDefault } : {}),
      }))
    }
  }

  for (const after of current.components) {
    if (baselineById.has(after.id)) continue
    findings.push(makeFinding({
      code: "component.added",
      level: "info",
      entityId: after.id,
      fieldPath: "component",
      message: `Component ${JSON.stringify(after.id)} was added.`,
      after: componentContractValue(after),
    }))
  }
  return findings
}

function buildAnalysisLimits(baseline: DesignSystemManifest, current: DesignSystemManifest): ReadonlyArray<ManifestAnalysisLimit> {
  const limits: ManifestAnalysisLimit[] = [
    { code: "explicit-coverage", message: "Comparison is limited to the coverage roots declared in the supplied manifests." },
    { code: "component-use-unavailable", message: "Manifest v1 does not record consumer use of component slots or variants." },
  ]
  if (baseline.coverage.unresolved.length > 0 || current.coverage.unresolved.length > 0) {
    limits.push({ code: "unresolved-references", message: "One or more supplied manifests contain unresolved references." })
  }
  return limits.sort(compareAnalysisLimits)
}

/** Compare public token and component contracts using M9.1 stable record IDs. */
export function compareManifestContracts(baselineInput: unknown, currentInput: unknown): ManifestContractComparison {
  const baseline = decodeManifest(baselineInput)
  const current = decodeManifest(currentInput)
  if (baseline.package.name !== current.package.name) {
    throw new TypeError(`Manifest package names must match for comparison; received ${JSON.stringify(baseline.package.name)} and ${JSON.stringify(current.package.name)}.`)
  }

  const findings = [...publicTokenFindings(baseline, current), ...componentFindings(baseline, current)].sort(compareFindings)
  return {
    provider: {
      name: current.package.name,
      baselineVersion: baseline.package.version,
      currentVersion: current.package.version,
    },
    findings,
    analysisLimits: buildAnalysisLimits(baseline, current),
  }
}
