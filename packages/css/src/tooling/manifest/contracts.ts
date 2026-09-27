import {
  getThemeTokenAliasForContract,
  getThemeTokenDomainForContract,
  getThemeTokenOrigin,
  getThemeTokenPublicId,
  getThemeTokenVisibility,
  isThemeTokenOwnedByContract,
  type ThemeVar,
  type TokenDomain,
} from "../../theme-token"
import { getTokenContractIdentity } from "../../tokens/domains"
import { nativeComponentContractIdentityKey } from "../../components/contracts"
import type { NativeComponentRecipeDescriptor } from "../../components"
import { NativeComponentRecipeContractVersion, NativeComponentRecipeType } from "../../native-tags"
import {
  decodeManifestContractIdentity,
  decodeManifestSourceOrigin,
} from "./schema"
import type {
  ManifestComponent,
  ManifestSourceOrigin,
  ManifestStateConstraint,
  ManifestToken,
  ManifestTokenDomain,
} from "./model"

export type TokenContractRoot = {
  readonly contract: object
  readonly origin: ManifestSourceOrigin
}

export type ComponentRecipeRoot = {
  readonly recipe: NativeComponentRecipeDescriptor
  readonly origin: ManifestSourceOrigin
}

/** Project one explicitly supplied token contract without reading any theme values. */
export function projectTokenContract(contract: object, sourceOrigin: ManifestSourceOrigin): ReadonlyArray<ManifestToken> {
  const identity = getTokenContractIdentity(contract)
  if (identity === undefined) {
    throw new TypeError("Manifest token roots require a stable contract identity.")
  }
  const origin = normalizeRootOrigin(sourceOrigin, "token contract")
  const result: ManifestToken[] = []
  const ancestors = new Set<object>()

  const visit = (value: unknown, path: ReadonlyArray<string>): void => {
    if (typeof value === "string") {
      if (!isThemeTokenOwnedByContract(contract, value as ThemeVar)) {
        throw new TypeError(`Token contract contains a reference not owned by its supplied root at ${formatPath(path)}.`)
      }
      const token = value as ThemeVar
      const tokenOrigin = getThemeTokenOrigin(token)
      if (tokenOrigin === undefined || !samePath(tokenOrigin.path, path)) {
        throw new TypeError(`Token contract metadata does not match the supplied descriptor path ${formatPath(path)}.`)
      }
      const domain = getThemeTokenDomainForContract(contract, token)
      if (domain === undefined) throw new TypeError(`Token domain metadata is missing at ${formatPath(path)}.`)
      const aliasMetadata = getThemeTokenAliasForContract(contract, token)
      const record: ManifestToken = {
        id: getThemeTokenPublicId(token),
        contract: { owner: identity.owner, name: identity.name, version: identity.version },
        path: [...tokenOrigin.path],
        visibility: getThemeTokenVisibility(token),
        domain: normalizeDomain(domain),
        kind: aliasMetadata === undefined ? "definition" : "alias",
        ...(aliasMetadata === undefined ? {} : {
          alias: {
            ...(aliasMetadata.origin.targetPublicId === undefined ? {} : { targetId: aliasMetadata.origin.targetPublicId }),
            targetPath: [...aliasMetadata.targetPath],
            resolution: aliasMetadata.origin.targetPublicId === undefined ? "unresolved" : "internal",
            ...(aliasMetadata.fallback === undefined ? {} : { fallback: aliasMetadata.fallback }),
          },
        }),
        origin,
      }
      result.push(record)
      return
    }

    const entries = dataEntries(value, `token contract at ${formatPath(path)}`)
    if (ancestors.has(value as object)) throw new TypeError(`Token contract contains a cycle at ${formatPath(path)}.`)
    ancestors.add(value as object)
    try {
      for (const [key, child] of entries) visit(child, [...path, key])
    } finally {
      ancestors.delete(value as object)
    }
  }

  visit(contract, [])
  return result.sort((left, right) => compareOrdinal(left.id, right.id))
}

/** Project only the public surface of a validated component recipe descriptor. */
export function projectComponentRecipe(recipe: NativeComponentRecipeDescriptor, sourceOrigin: ManifestSourceOrigin): ManifestComponent {
  const origin = normalizeRootOrigin(sourceOrigin, "component recipe")
  if (readField(recipe, "$$type", "component recipe") !== NativeComponentRecipeType ||
    readField(recipe, "version", "component recipe") !== NativeComponentRecipeContractVersion) {
    throw new TypeError("Manifest component roots require a versioned recipe with a stable public contract.")
  }
  const rawContract = readField(recipe, "contract", "component recipe")
  if (rawContract === undefined || rawContract === null) {
    throw new TypeError("Manifest component roots require a stable public contract identity.")
  }
  const identity = decodeManifestContractIdentity(readField(rawContract, "identity", "component contract"))
  const publicSurface = readField(rawContract, "public", "component contract")
  const slots = readStringArray(readField(publicSurface, "slots", "component public surface"), "public component slots")
  const variants: Record<string, ReadonlyArray<string>> = Object.create(null) as Record<string, ReadonlyArray<string>>
  for (const [axis, values] of dataEntries(readField(publicSurface, "variants", "component public surface"), "public component variants")) {
    variants[axis] = readStringArray(values, `public values for variant ${JSON.stringify(axis)}`)
  }
  const publicAxes = new Set(Object.keys(variants))
  const extensionPoints = projectExtensionPoints(optionalField(rawContract, "extensionPoints", "component contract"))
  const rawDefaults = dataEntries(readField(recipe, "defaultVariants", "component recipe"), "component defaults")
  const defaults: Record<string, string | number | boolean> = Object.create(null) as Record<string, string | number | boolean>
  for (const [axis, value] of rawDefaults) {
    if (!publicAxes.has(axis)) continue
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new TypeError(`Public default for ${JSON.stringify(axis)} must be a JSON scalar.`)
    }
    defaults[axis] = value
  }

  return {
    id: nativeComponentContractIdentityKey(identity),
    contract: identity,
    origin,
    slots: [...slots].sort(compareOrdinal),
    variants: Object.fromEntries(Object.keys(variants).sort(compareOrdinal).map(axis => [axis, [...variants[axis]!].sort(compareOrdinal)])),
    extensionPoints: extensionPoints.sort(compareOrdinal),
    stateConstraints: projectPublicStateConstraints(optionalField(recipe, "stateVariants", "component recipe"), variants),
    defaults: Object.fromEntries(Object.keys(defaults).sort(compareOrdinal).map(axis => [axis, defaults[axis]!])),
  }
}

function normalizeRootOrigin(input: ManifestSourceOrigin, kind: string): ManifestSourceOrigin {
  const origin = decodeManifestSourceOrigin(input)
  if (origin.exportPath === undefined) {
    throw new TypeError(`Manifest ${kind} roots require an explicit source export path.`)
  }
  return origin
}

function normalizeDomain(domain: TokenDomain): ManifestTokenDomain {
  switch (domain.kind) {
    case "color":
    case "duration":
    case "opacity":
      return { kind: domain.kind }
    case "length":
      return { kind: "length", allowNegative: domain.allowNegative }
    case "enum":
      return { kind: "enum", values: [...domain.values] }
  }
}

function projectExtensionPoints(value: unknown): string[] {
  if (value === undefined) return []
  const entries = dataEntries(value, "component extension points")
  const result: string[] = []
  for (const [kind, raw] of entries) {
    if (kind === "compoundVariants") {
      if (raw !== true) throw new TypeError("Component compoundVariants extension permission must be true when present.")
      result.push("compoundVariants")
      continue
    }
    if (kind !== "defaults" && kind !== "variantValues" && kind !== "slotStyles") {
      throw new TypeError(`Unknown component extension permission ${JSON.stringify(kind)}.`)
    }
    for (const entry of readStringArray(raw, `component extension point ${kind}`)) result.push(`${kind}:${entry}`)
  }
  return [...new Set(result)].sort(compareOrdinal)
}

function projectPublicStateConstraints(value: unknown, variants: Readonly<Record<string, ReadonlyArray<string>>>): ReadonlyArray<ManifestStateConstraint> {
  if (value === undefined) return []
  const result: ManifestStateConstraint[] = []
  for (const [discriminator, rawCases] of dataEntries(value, "component state variants")) {
    const publicDiscriminatorValues = variants[discriminator]
    // A private discriminator and its cases are implementation details.
    if (publicDiscriminatorValues === undefined) continue
    for (const [stateCase, rawAxes] of dataEntries(rawCases, `state cases for ${JSON.stringify(discriminator)}`)) {
      if (!publicDiscriminatorValues.includes(stateCase)) continue
      const axes: Record<string, ReadonlyArray<string | boolean>> = Object.create(null) as Record<string, ReadonlyArray<string | boolean>>
      for (const [axis, rawValues] of dataEntries(rawAxes, `state constraints for ${JSON.stringify(stateCase)}`)) {
        const publicValues = variants[axis]
        if (publicValues === undefined) {
          throw new TypeError(`Public state ${JSON.stringify(stateCase)} depends on non-public variant axis ${JSON.stringify(axis)}.`)
        }
        const allowed = readArray(rawValues, `state values for ${JSON.stringify(axis)}`).map(item => {
          if (typeof item !== "string" && typeof item !== "boolean") {
            throw new TypeError(`Public state values for ${JSON.stringify(axis)} must be strings or booleans.`)
          }
          if (!publicValues.includes(String(item))) {
            throw new TypeError(`Public state ${JSON.stringify(stateCase)} includes a non-public value for ${JSON.stringify(axis)}.`)
          }
          return item
        })
        axes[axis] = allowed.sort(compareStateValue)
      }
      result.push({
        discriminator,
        case: stateCase,
        axes: Object.fromEntries(Object.keys(axes).sort(compareOrdinal).map(axis => [axis, axes[axis]!])),
      })
    }
  }
  return result.sort((left, right) => compareOrdinal(left.discriminator, right.discriminator) || compareOrdinal(left.case, right.case))
}

function readField(record: unknown, key: string, label: string): unknown {
  if (typeof record !== "object" || record === null) throw new TypeError(`Expected ${label} to be a data record.`)
  const descriptor = Object.getOwnPropertyDescriptor(record, key)
  if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
    throw new TypeError(`Expected ${label}.${key} to be an own enumerable data field.`)
  }
  return descriptor.value
}

function optionalField(record: unknown, key: string, label: string): unknown {
  if (typeof record !== "object" || record === null) throw new TypeError(`Expected ${label} to be a data record.`)
  const descriptor = Object.getOwnPropertyDescriptor(record, key)
  if (descriptor === undefined) return undefined
  if (!("value" in descriptor) || descriptor.enumerable !== true) {
    throw new TypeError(`Expected ${label}.${key} to be an own enumerable data field.`)
  }
  return descriptor.value
}

function dataEntries(value: unknown, label: string): Array<readonly [string, unknown]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`Expected ${label} to be a plain record.`)
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`Expected ${label} to be a plain record.`)
  for (const symbol of Object.getOwnPropertySymbols(value)) {
    if (Object.getOwnPropertyDescriptor(value, symbol)?.enumerable === true) throw new TypeError(`${label} cannot contain enumerable symbol fields.`)
  }
  return Object.keys(value).map(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) {
      throw new TypeError(`Expected ${label}.${key} to be an own enumerable data field.`)
    }
    return [key, descriptor.value] as const
  })
}

function readStringArray(value: unknown, label: string): string[] {
  return readArray(value, label).map(item => {
    if (typeof item !== "string" || item.length === 0) throw new TypeError(`${label} must contain only non-empty strings.`)
    return item
  })
}

function readArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) throw new TypeError(`Expected ${label} to be a plain array.`)
  const length = Object.getOwnPropertyDescriptor(value, "length")?.value
  if (typeof length !== "number" || Reflect.ownKeys(value).length !== length + 1) throw new TypeError(`${label} must be a dense array without extra properties.`)
  const result: unknown[] = []
  for (let index = 0; index < length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index))
    if (descriptor === undefined || !("value" in descriptor) || descriptor.enumerable !== true) throw new TypeError(`${label} must be a dense data array.`)
    result.push(descriptor.value)
  }
  return result
}

function samePath(left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean {
  return left.length === right.length && left.every((segment, index) => segment === right[index])
}

function formatPath(path: ReadonlyArray<string>): string {
  return path.length === 0 ? "<root>" : path.join(".")
}

function compareOrdinal(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function compareStateValue(left: string | boolean, right: string | boolean): number {
  if (typeof left !== typeof right) return typeof left === "string" ? -1 : 1
  if (typeof left === "string" && typeof right === "string") return compareOrdinal(left, right)
  return Number(left) - Number(right)
}
