/**
 * Stable identity for a token contract.
 *
 * The owner is normally the publishing package name, `name` is the contract
 * name within that package, and `version` is the compatibility version of the
 * contract shape. Keeping these fields explicit makes identity independent of
 * module evaluation order, object identity, and the package copy that happens
 * to create the contract at runtime.
 */
export type TokenContractIdentity = {
  readonly owner: string
  readonly name: string
  readonly version: number
}

export type TokenContractIdentityInput = TokenContractIdentity | {
  readonly identity?: TokenContractIdentity
}

const PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/
const CONTRACT_NAME = /^[A-Za-z][A-Za-z0-9._-]*$/

/** Normalize and validate the public identity input once at contract creation. */
export function normalizeTokenContractIdentity(
  input: TokenContractIdentityInput | undefined,
): TokenContractIdentity | undefined {
  if (input === undefined) return undefined
  const identityDescriptor = isRecord(input)
    ? Object.getOwnPropertyDescriptor(input, "identity")
    : undefined
  const candidate = identityDescriptor !== undefined && "value" in identityDescriptor
    ? identityDescriptor.value
    : input
  if (candidate === undefined) return undefined
  const owner = isRecord(candidate) ? ownData(candidate, "owner") : undefined
  const name = isRecord(candidate) ? ownData(candidate, "name") : undefined
  const version = isRecord(candidate) ? ownData(candidate, "version") : undefined
  if (!isRecord(candidate) || Object.keys(candidate).length !== 3 ||
    typeof owner !== "string" || !PACKAGE_NAME.test(owner) ||
    typeof name !== "string" || !CONTRACT_NAME.test(name) ||
    typeof version !== "number" || !Number.isSafeInteger(version) || version <= 0) {
    throw new Error(
      "Invalid token contract identity. Expected { owner: package-name, name: identifier, version: positive-safe-integer }.",
    )
  }
  return Object.freeze({
    owner,
    name,
    version,
  })
}

/** A stable key suitable for maps and React context lookup. */
export function tokenContractIdentityKey(identity: TokenContractIdentity): string {
  return `${identity.owner}#${identity.name}@${identity.version}`
}

/**
 * A public, inspectable token ID. Length prefixes keep path segment boundaries
 * unambiguous even when authored names contain punctuation.
 */
export function tokenPublicId(
  identity: TokenContractIdentity,
  path: ReadonlyArray<string>,
): string {
  const encodedPath = path.map(segment => `${segment.length}:${segment}`).join("/")
  return `${identity.owner}/${identity.name}@${identity.version}#${encodedPath}`
}

/**
 * CSS variable names cannot contain the package separators used by public IDs.
 * Fixed-width hexadecimal code points provide a deterministic, collision-free
 * encoding while remaining inside the native token-name grammar.
 */
export function tokenVariableName(
  identity: TokenContractIdentity,
  path: ReadonlyArray<string>,
): string {
  const identityPart = [identity.owner, identity.name]
    .map(encodeSegment)
    .join("-")
  const pathPart = path.map(encodeSegment).join("-")
  return `--crumbs-${identityPart}-v${identity.version}-${pathPart}`
}

/** Build a canonical contract-shape signature for duplicate-copy/hot-reload checks. */
export function tokenContractShapeSignature(
  entries: ReadonlyArray<{
    readonly path: ReadonlyArray<string>
    readonly domain: { readonly kind: string; readonly allowNegative?: boolean; readonly values?: ReadonlyArray<string> }
    readonly alias?: { readonly target: ReadonlyArray<string>; readonly fallback?: string | number }
  }>,
): string {
  return entries
    .map(entry => {
      const path = entry.path.map(segment => segment.length + ":" + segment).join("/")
      const alias = entry.alias === undefined
        ? ""
        : "|alias:" + entry.alias.target.map(segment => segment.length + ":" + segment).join("/") +
          (entry.alias.fallback === undefined ? "" : "|fallback:" + JSON.stringify(entry.alias.fallback))
      return path + "=" + domainSignature(entry.domain) + alias
    })
    .sort()
    .join(";")
}

function domainSignature(domain: { readonly kind: string; readonly allowNegative?: boolean; readonly values?: ReadonlyArray<string> }): string {
  if (domain.kind === "length") return `length:${domain.allowNegative === true ? "negative" : "positive"}`
  if (domain.kind === "enum") return `enum:${[...(domain.values ?? [])].sort().map(value => `${value.length}:${value}`).join(",")}`
  return domain.kind
}

function encodeSegment(value: string): string {
  let encoded = ""
  for (const character of value) {
    encoded += (character.codePointAt(0) ?? 0).toString(16).padStart(6, "0")
  }
  return encoded || "0"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function ownData(value: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor !== undefined && descriptor.enumerable === true && "value" in descriptor
    ? descriptor.value
    : undefined
}
