export type NativeComponentContractIdentity = {
  readonly owner: string
  readonly name: string
  readonly version: number
}

export type NativeComponentContractExtensionPoints = {
  readonly defaults?: ReadonlyArray<string>
  readonly variantValues?: ReadonlyArray<string>
  readonly compoundVariants?: true
  readonly slotStyles?: ReadonlyArray<string>
}

export type NativeComponentContract = {
  readonly identity: NativeComponentContractIdentity
  readonly public: {
    readonly slots: ReadonlyArray<string>
    readonly variants: Readonly<Record<string, ReadonlyArray<string>>>
  }
  readonly extensionPoints?: NativeComponentContractExtensionPoints
}

type ComponentSurface = {
  readonly slots: Readonly<Record<string, unknown>>
  readonly variants: Readonly<Record<string, Readonly<Record<string, unknown>>>>
}

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const CONTRACT_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/
const componentContractIdentities = sharedRegistry(
  Symbol.for("crumbs.css.component-contract-identities.v1"),
  () => new Map<string, string>(),
)

/** Validate and normalize public component metadata before it enters a descriptor. */
export function validateNativeComponentContract(
  value: unknown,
  surface: ComponentSurface,
  stateVariants?: unknown,
  options: {readonly registerIdentity?: boolean} = {},
): NativeComponentContract {
  const contractEntries = dataRecordEntries(value, "component contract")
  assertExactKeys(contractEntries, ["identity", "public"], ["extensionPoints"], "component contract")
  const rawContract = Object.fromEntries(contractEntries) as Record<string, unknown>
  const identity = validateIdentity(rawContract.identity)
  const publicEntries = dataRecordEntries(rawContract.public, "component contract public surface")
  assertExactKeys(publicEntries, ["slots", "variants"], [], "component contract public surface")
  const rawPublic = Object.fromEntries(publicEntries) as Record<string, unknown>

  const publicSlots = readStringList(rawPublic.slots, "public component slots")
  assertUniqueMembers(publicSlots, "public component slots")
  const actualSlots = new Set(Object.keys(surface.slots))
  for (const slot of publicSlots) {
    if (!actualSlots.has(slot)) {
      throw new TypeError("Component contract declares unknown public slot " + JSON.stringify(slot) + ".")
    }
  }

  const publicVariantEntries = dataRecordEntries(rawPublic.variants, "component contract public variants")
  const normalizedVariantEntries: Array<readonly [string, ReadonlyArray<string>]> = []
  for (const [axis, rawValues] of publicVariantEntries) {
    if (axis.length === 0) throw new TypeError("Public component variant axis names must be non-empty.")
    if (!Object.hasOwn(surface.variants, axis)) {
      throw new TypeError("Component contract declares unknown public variant axis " + JSON.stringify(axis) + ".")
    }
    const actualValues = surface.variants[axis]
    if (actualValues === undefined) throw new TypeError("Component recipe variant surface is missing " + JSON.stringify(axis) + ".")
    const values = readStringList(rawValues, "public values for variant " + JSON.stringify(axis))
    assertUniqueMembers(values, "public values for variant " + JSON.stringify(axis))
    for (const variantValue of values) {
      if (!Object.hasOwn(actualValues, variantValue)) {
        throw new TypeError(
          "Component contract declares unknown public value " + JSON.stringify(variantValue) +
          " for variant " + JSON.stringify(axis) + ".",
        )
      }
    }
    normalizedVariantEntries.push([axis, Object.freeze(values)])
  }
  const publicVariants = Object.fromEntries(normalizedVariantEntries) as Record<string, ReadonlyArray<string>>

  const normalizedPublic = Object.freeze({
    slots: Object.freeze(publicSlots),
    variants: Object.freeze(publicVariants),
  })
  const extensionPoints = rawContract.extensionPoints === undefined
    ? undefined
    : validateExtensionPoints(rawContract.extensionPoints, normalizedPublic)
  validatePublicStateProjection(normalizedPublic, stateVariants)

  const normalized = Object.freeze({
    identity,
    public: normalizedPublic,
    ...(extensionPoints === undefined ? {} : {extensionPoints}),
  })
  const key = nativeComponentContractIdentityKey(identity)
  const signature = nativeComponentContractSignature(normalized)
  assertContractIdentityAvailable(key, signature)
  if (options.registerIdentity !== false) componentContractIdentities.set(key, signature)
  return normalized
}

/** @internal Commit a previously validated descriptor identity after style capture succeeds. */
export function registerNativeComponentContract(contract: NativeComponentContract): void {
  const key = nativeComponentContractIdentityKey(contract.identity)
  const signature = nativeComponentContractSignature(contract)
  assertContractIdentityAvailable(key, signature)
  componentContractIdentities.set(key, signature)
}

export function nativeComponentContractIdentityKey(identity: NativeComponentContractIdentity): string {
  return identity.owner + "#" + identity.name + "@" + identity.version
}

/** Canonical signature ignores declaration order because these lists are sets. */
export function nativeComponentContractSignature(contract: NativeComponentContract): string {
  const publicVariants = Object.entries(contract.public.variants)
    .sort(([left], [right]) => compareText(left, right))
    .map(([axis, values]) => encode(axis) + "=" + encodeSet(values))
    .join(";")
  const extensionPoints = contract.extensionPoints
  return [
    "slots=" + encodeSet(contract.public.slots),
    "variants=" + publicVariants,
    "defaults=" + encodeSet(extensionPoints?.defaults ?? []),
    "variantValues=" + encodeSet(extensionPoints?.variantValues ?? []),
    "compoundVariants=" + (extensionPoints?.compoundVariants === true ? "1" : "0"),
    "slotStyles=" + encodeSet(extensionPoints?.slotStyles ?? []),
  ].join("|")
}

function validateIdentity(value: unknown): NativeComponentContractIdentity {
  const entries = dataRecordEntries(value, "component contract identity")
  assertExactKeys(entries, ["owner", "name", "version"], [], "component contract identity")
  const identity = Object.fromEntries(entries) as Record<string, unknown>
  if (typeof identity.owner !== "string" || !PACKAGE_NAME.test(identity.owner) ||
    typeof identity.name !== "string" || !CONTRACT_NAME.test(identity.name) ||
    typeof identity.version !== "number" || !Number.isSafeInteger(identity.version) || identity.version <= 0) {
    throw new TypeError(
      "Invalid component contract identity. Expected { owner: package-name, name: identifier, version: positive-safe-integer }.",
    )
  }
  return Object.freeze({
    owner: identity.owner,
    name: identity.name,
    version: identity.version,
  })
}

function validateExtensionPoints(
  value: unknown,
  publicSurface: NativeComponentContract["public"],
): NativeComponentContractExtensionPoints {
  const entries = dataRecordEntries(value, "component contract extension points")
  assertExactKeys(entries, [], ["defaults", "variantValues", "compoundVariants", "slotStyles"], "component contract extension points")
  const raw = Object.fromEntries(entries) as Record<string, unknown>
  const publicAxes = new Set(Object.keys(publicSurface.variants))
  const publicSlots = new Set(publicSurface.slots)
  const defaults = raw.defaults === undefined
    ? undefined
    : validateExtensionAxisList(raw.defaults, "defaults", publicAxes)
  const variantValues = raw.variantValues === undefined
    ? undefined
    : validateExtensionAxisList(raw.variantValues, "variantValues", publicAxes)
  const slotStyles = raw.slotStyles === undefined
    ? undefined
    : readStringList(raw.slotStyles, "extension permission slotStyles").map(slot => {
        if (!publicSlots.has(slot)) {
          throw new TypeError("Extension permission slotStyles names non-public slot " + JSON.stringify(slot) + ".")
        }
        return slot
      })
  if (slotStyles !== undefined) assertUniqueMembers(slotStyles, "extension permission slotStyles")
  if (raw.compoundVariants !== undefined && raw.compoundVariants !== true) {
    throw new TypeError("Extension permission compoundVariants must be true when declared.")
  }
  return Object.freeze({
    ...(defaults === undefined ? {} : {defaults: Object.freeze(defaults)}),
    ...(variantValues === undefined ? {} : {variantValues: Object.freeze(variantValues)}),
    ...(raw.compoundVariants === true ? {compoundVariants: true as const} : {}),
    ...(slotStyles === undefined ? {} : {slotStyles: Object.freeze(slotStyles)}),
  })
}

function validateExtensionAxisList(
  value: unknown,
  permission: "defaults" | "variantValues",
  publicAxes: ReadonlySet<string>,
): ReadonlyArray<string> {
  const axes = readStringList(value, "extension permission " + permission)
  assertUniqueMembers(axes, "extension permission " + permission)
  for (const axis of axes) {
    if (!publicAxes.has(axis)) {
      throw new TypeError(
        "Extension permission " + permission + " names non-public variant axis " + JSON.stringify(axis) + ".",
      )
    }
  }
  return axes
}

function validatePublicStateProjection(
  publicSurface: NativeComponentContract["public"],
  stateVariants: unknown,
): void {
  if (stateVariants === undefined) return
  const discriminators = dataRecordEntries(stateVariants, "component recipe stateVariants")
  if (discriminators.length !== 1) return
  const [discriminator, rawCases] = discriminators[0]!
  if (!Object.hasOwn(publicSurface.variants, discriminator)) return
  const publicDiscriminatorValues = publicSurface.variants[discriminator]!
  const publicValues = new Set(publicDiscriminatorValues)
  const cases = dataRecordEntries(rawCases, "public state cases for " + JSON.stringify(discriminator))
  for (const [caseName, rawConstraints] of cases) {
    if (!publicValues.has(caseName)) {
      throw new TypeError(
        "Public state contract for " + JSON.stringify(discriminator) +
        " omits state case " + JSON.stringify(caseName) + ".",
      )
    }
    const constraints = dataRecordEntries(rawConstraints, "public state " + JSON.stringify(caseName) + " constraints")
    for (const [axis, rawAllowedValues] of constraints) {
      if (!Object.hasOwn(publicSurface.variants, axis)) {
        throw new TypeError(
          "Public state " + JSON.stringify(caseName) + " depends on private variant axis " + JSON.stringify(axis) + ".",
        )
      }
      const publicAxisValues = publicSurface.variants[axis]!
      const allowedValues = readStateValues(rawAllowedValues, caseName, axis)
      const publicValueSet = new Set(publicAxisValues)
      for (const allowedValue of allowedValues) {
        if (!publicValueSet.has(String(allowedValue))) {
          throw new TypeError(
            "Public state " + JSON.stringify(caseName) + " requires private value " +
            JSON.stringify(allowedValue) + " for variant " + JSON.stringify(axis) + ".",
          )
        }
      }
    }
  }
}

function readStateValues(value: unknown, caseName: string, axis: string): ReadonlyArray<string | boolean> {
  const values = readArray(value, "public state " + JSON.stringify(caseName) + " constraint " + JSON.stringify(axis))
  return values.map(entry => {
    if (typeof entry !== "string" && typeof entry !== "boolean") {
      throw new TypeError("Public state constraint for " + JSON.stringify(axis) + " must contain only strings or booleans.")
    }
    return entry
  })
}

function readStringList(value: unknown, context: string): string[] {
  return readArray(value, context).map(entry => {
    if (typeof entry !== "string" || entry.length === 0) {
      throw new TypeError(context + " must contain non-empty strings.")
    }
    return entry
  })
}

function readArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(context + " must be an array.")
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError(context + " cannot contain symbol properties.")
  }
  const keys = Reflect.ownKeys(value)
  for (const key of keys) {
    if (key === "length") continue
    if (typeof key !== "string" || !/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= value.length) {
      throw new TypeError(context + " must contain only indexed values.")
    }
  }
  // Reuse the validated snapshot instead of enumerating a proxy again.
  const descriptors: Record<string, PropertyDescriptor | undefined> = Object.create(null)
  for (const key of keys) {
    descriptors[String(key)] = Object.getOwnPropertyDescriptor(value, key)
  }
  const result: unknown[] = []
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = descriptors[String(index)]
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(context + " must contain dense enumerable data values.")
    }
    result.push(descriptor.value)
  }
  return result
}

function dataRecordEntries(value: unknown, context: string): Array<[string, unknown]> {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError(context + " must be a plain data record.")
  }
  const entries: Array<[string, unknown]> = []
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") throw new TypeError(context + " cannot contain symbol keys.")
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      throw new TypeError(context + " must contain enumerable data properties.")
    }
    entries.push([key, descriptor.value])
  }
  return entries
}

function assertExactKeys(
  entries: ReadonlyArray<readonly [string, unknown]>,
  required: ReadonlyArray<string>,
  optional: ReadonlyArray<string>,
  context: string,
): void {
  const keys = new Set(entries.map(([key]) => key))
  for (const key of required) {
    if (!keys.has(key)) throw new TypeError(context + " is missing " + JSON.stringify(key) + ".")
  }
  for (const key of keys) {
    if (!required.includes(key) && !optional.includes(key)) {
      throw new TypeError(context + " has unknown property " + JSON.stringify(key) + ".")
    }
  }
}

function assertUniqueMembers(values: ReadonlyArray<string>, context: string): void {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) throw new TypeError(context + " contains duplicate entry " + JSON.stringify(value) + ".")
    seen.add(value)
  }
}

function encodeSet(values: ReadonlyArray<string>): string {
  return [...values].sort(compareText).map(encode).join(",")
}

function encode(value: string): string {
  return value.length + ":" + value
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function assertContractIdentityAvailable(key: string, signature: string): void {
  const previous = componentContractIdentities.get(key)
  if (previous !== undefined && previous !== signature) {
    throw new Error(
      "Component contract identity " + JSON.stringify(key) +
      " was registered with a different public surface or extension permissions. Increment the contract version.",
    )
  }
}

function sharedRegistry<T>(key: symbol, create: () => T): T {
  const root = globalThis as unknown as Record<PropertyKey, unknown>
  const descriptor = Object.getOwnPropertyDescriptor(root, key)
  if (descriptor !== undefined && "value" in descriptor) return descriptor.value as T
  const value = create()
  Object.defineProperty(root, key, {value, enumerable: false, configurable: false, writable: false})
  return value
}
