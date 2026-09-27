import type {NativeConditionSnapshot} from "../conditions"

/**
 * Versioned, inspectable native expression data. Expression nodes contain no
 * closures, React values or runtime services, so a compiler can serialise and
 * analyse them before a later evaluator is introduced.
 */
export const NativeExpressionType = "crumbs.css.expression" as const
export const NativeExpressionVersion = 1 as const
export const NativeExpressionProgramType = "crumbs.css.expression-program" as const
export const NativeExpressionProgramVersion = 1 as const

export type NativeExpressionNumberDomain = Readonly<{
  readonly kind: "number"
  readonly unit: "unitless"
}>

export type NativeExpressionLengthDomain = Readonly<{
  readonly kind: "length"
  readonly unit: "px"
  readonly allowNegative: boolean
}>

export type NativeExpressionDurationDomain = Readonly<{
  readonly kind: "duration"
  readonly unit: "ms"
}>

export type NativeExpressionOpacityDomain = Readonly<{
  readonly kind: "opacity"
  readonly unit: "fraction"
}>

export type NativeExpressionColorDomain = Readonly<{
  readonly kind: "color"
  readonly format: "native"
}>

export type NativeExpressionEnumDomain<TValue extends string = string> = Readonly<{
  readonly kind: "enum"
  readonly values: readonly [TValue, ...TValue[]]
}>

export type NativeExpressionDomain =
  | NativeExpressionNumberDomain
  | NativeExpressionLengthDomain
  | NativeExpressionDurationDomain
  | NativeExpressionOpacityDomain
  | NativeExpressionColorDomain
  | NativeExpressionEnumDomain

export type NativeExpressionDomainInput =
  | NativeExpressionNumberDomain
  | NativeExpressionLengthDomain
  | NativeExpressionDurationDomain
  | NativeExpressionOpacityDomain
  | NativeExpressionColorDomain
  | Readonly<{
      readonly kind: "enum"
      readonly values: readonly [string, ...string[]]
    }>

export type NativeExpressionValue<TDomain extends NativeExpressionDomain> =
  TDomain extends NativeExpressionEnumDomain<infer TValue>
    ? TValue
    : TDomain extends NativeExpressionColorDomain
      ? string
      : TDomain extends
          | NativeExpressionNumberDomain
          | NativeExpressionLengthDomain
          | NativeExpressionDurationDomain
          | NativeExpressionOpacityDomain
        ? number
        : never

export type NativeExpressionDependency = Readonly<
  | {
      readonly kind: "token"
      readonly name: string
    }
  | {
      readonly kind: "condition"
      readonly key: NativeConditionKey
    }
>

export type NativeConditionKey = keyof NativeConditionSnapshot
export type NativeConditionValue<TKey extends NativeConditionKey> = NativeConditionSnapshot[TKey]

type NativeExpressionNodeKind =
  | "literal"
  | "token-reference"
  | "condition-reference"
  | "alias"
  | "fallback"
  | "compose"
  | "add"
  | "subtract"
  | "scale"
  | "clamp"
  | "match"

type NativeExpressionNodeBase<TDomain extends NativeExpressionDomain> = Readonly<{
  readonly $$type: typeof NativeExpressionType
  readonly version: typeof NativeExpressionVersion
  readonly kind: NativeExpressionNodeKind
  readonly domain: TDomain
  readonly dependencies: readonly NativeExpressionDependency[]
}>

export type NativeExpressionLiteral<TDomain extends NativeExpressionDomain> =
  NativeExpressionNodeBase<TDomain> &
    Readonly<{
      readonly kind: "literal"
      readonly value: NativeExpressionValue<TDomain>
    }>

export type NativeExpressionTokenReference<TDomain extends NativeExpressionDomain> =
  NativeExpressionNodeBase<TDomain> &
    Readonly<{
      readonly kind: "token-reference"
      readonly token: string
    }>

export type NativeExpressionConditionReference<
  TKey extends NativeConditionKey,
> = NativeExpressionNodeBase<NativeExpressionEnumDomain<NativeConditionValue<TKey>>> &
  Readonly<{
    readonly kind: "condition-reference"
    readonly condition: TKey
  }>

export type NativeExpressionAlias<TDomain extends NativeExpressionDomain> =
  NativeExpressionNodeBase<TDomain> &
    Readonly<{
      readonly kind: "alias"
      readonly name: string
      readonly expression: NativeExpression<TDomain>
    }>

export type NativeExpressionFallback<TDomain extends NativeExpressionDomain> =
  NativeExpressionNodeBase<TDomain> &
    Readonly<{
      readonly kind: "fallback"
      readonly primary: NativeExpression<TDomain>
      readonly fallback: NativeExpression<TDomain>
      readonly onMissing: "use-fallback"
    }>

export type NativeExpressionCompose<TDomain extends NativeExpressionDomain> =
  NativeExpressionNodeBase<TDomain> &
    Readonly<{
      readonly kind: "compose"
      readonly expressions: readonly NativeExpression<TDomain>[]
      readonly order: "left-to-right"
    }>

export type NativeExpressionAdd<TDomain extends NativeExpressionDomain> =
  NativeExpressionNodeBase<TDomain> &
    Readonly<{
      readonly kind: "add"
      readonly left: NativeExpression<TDomain>
      readonly right: NativeExpression<TDomain>
    }>

export type NativeExpressionSubtract<TDomain extends NativeExpressionDomain> =
  NativeExpressionNodeBase<TDomain> &
    Readonly<{
      readonly kind: "subtract"
      readonly left: NativeExpression<TDomain>
      readonly right: NativeExpression<TDomain>
    }>

export type NativeExpressionScale<TDomain extends NativeExpressionDomain> =
  NativeExpressionNodeBase<TDomain> &
    Readonly<{
      readonly kind: "scale"
      readonly expression: NativeExpression<TDomain>
      readonly factor: number
    }>

export type NativeExpressionClamp<TDomain extends NativeExpressionDomain> =
  NativeExpressionNodeBase<TDomain> &
    Readonly<{
      readonly kind: "clamp"
      readonly expression: NativeExpression<TDomain>
      readonly minimum: number
      readonly maximum: number
    }>

export type NativeExpressionMatchCase<
  TKey extends NativeConditionKey,
  TDomain extends NativeExpressionDomain,
> = Readonly<{
  readonly value: NativeConditionValue<TKey>
  readonly expression: NativeExpression<TDomain>
}>

export type NativeExpressionMatch<
  TKey extends NativeConditionKey,
  TDomain extends NativeExpressionDomain,
> = NativeExpressionNodeBase<TDomain> &
  Readonly<{
    readonly kind: "match"
    readonly condition: TKey
    readonly cases: readonly NativeExpressionMatchCase<TKey, TDomain>[]
    readonly fallback?: NativeExpression<TDomain>
    readonly exhaustive: true
  }>

export type NativeExpression<TDomain extends NativeExpressionDomain = NativeExpressionDomain> =
  | NativeExpressionLiteral<TDomain>
  | NativeExpressionTokenReference<TDomain>
  | NativeExpressionConditionReference<NativeConditionKey>
  | NativeExpressionAlias<TDomain>
  | NativeExpressionFallback<TDomain>
  | NativeExpressionCompose<TDomain>
  | NativeExpressionAdd<TDomain>
  | NativeExpressionSubtract<TDomain>
  | NativeExpressionScale<TDomain>
  | NativeExpressionClamp<TDomain>
  | NativeExpressionMatch<NativeConditionKey, TDomain>

export type NativeExpressionProgram<
  TDomain extends NativeExpressionDomain = NativeExpressionDomain,
> = Readonly<{
  readonly $$type: typeof NativeExpressionProgramType
  readonly version: typeof NativeExpressionProgramVersion
  readonly root: NativeExpression<TDomain>
  readonly dependencies: readonly NativeExpressionDependency[]
}>

type AdditiveDomain =
  | NativeExpressionNumberDomain
  | NativeExpressionLengthDomain
  | NativeExpressionDurationDomain
type NumericDomain = AdditiveDomain | NativeExpressionOpacityDomain
type PreventInference<T> = [T][T extends unknown ? 0 : never]

const CONDITION_VALUES = {
  platform: ["android", "ios", "macos", "visionos", "web", "windows", "unknown"],
  widthBucket: ["compact", "medium", "expanded"],
  heightBucket: ["short", "regular", "tall"],
  orientation: ["portrait", "landscape"],
  direction: ["ltr", "rtl"],
  fontScaleBucket: ["normal", "large", "extraLarge"],
  motion: ["full", "reduced"],
  contrast: ["normal", "more", "less"],
} as const satisfies {
  readonly [TKey in NativeConditionKey]: readonly NativeConditionSnapshot[TKey][]
}

const NODE_KINDS: readonly NativeExpressionNodeKind[] = [
  "literal",
  "token-reference",
  "condition-reference",
  "alias",
  "fallback",
  "compose",
  "add",
  "subtract",
  "scale",
  "clamp",
  "match",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function assertRecord(value: unknown, message: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(message)
}

function assertExactKeys(value: Record<string, unknown>, keys: readonly string[]): void {
  const allowed = new Set(keys)
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`Unsupported native expression field: ${key}`)
  }
}

function nonEmptyString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(message)
  if (value !== value.trim()) throw new TypeError(message)
  return value
}

function finiteNumber(value: unknown, message: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(message)
  return value
}

function freezeDependencies(
  dependencies: readonly NativeExpressionDependency[],
): readonly NativeExpressionDependency[] {
  const unique = new Map<string, NativeExpressionDependency>()
  for (const dependency of dependencies) {
    const key = nativeExpressionDependencyKey(dependency)
    if (!unique.has(key)) unique.set(key, Object.freeze({...dependency}))
  }
  return Object.freeze(
    [...unique.entries()]
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([, dependency]) => dependency),
  )
}

function tokenDependency(name: string): NativeExpressionDependency {
  return Object.freeze({kind: "token", name})
}

function conditionDependency(key: NativeConditionKey): NativeExpressionDependency {
  return Object.freeze({kind: "condition", key})
}

function mergeDependencies(
  ...dependencies: readonly (readonly NativeExpressionDependency[])[]
): readonly NativeExpressionDependency[] {
  return freezeDependencies(dependencies.flat())
}

function domainKey(domain: NativeExpressionDomain): string {
  switch (domain.kind) {
    case "number":
      return "number:unitless"
    case "length":
      return `length:px:${domain.allowNegative ? "negative" : "nonnegative"}`
    case "duration":
      return "duration:ms"
    case "opacity":
      return "opacity:fraction"
    case "color":
      return "color:native"
    case "enum":
      return `enum:${domain.values.join("|")}`
  }
}

export function nativeExpressionDomainKey(domain: NativeExpressionDomain): string {
  return domainKey(createNativeExpressionDomain(domain) as NativeExpressionDomain)
}

function assertDomainInput(value: NativeExpressionDomainInput): void {
  assertRecord(value, "native expression domain must be an object")
  if (typeof value.kind !== "string") throw new TypeError("native expression domain kind is required")
  switch (value.kind) {
    case "number":
      assertExactKeys(value, ["kind", "unit"])
      if (value.unit !== "unitless") throw new TypeError("number domains use unitless")
      return
    case "length":
      assertExactKeys(value, ["kind", "unit", "allowNegative"])
      if (value.unit !== "px") throw new TypeError("length domains use px")
      if (typeof value.allowNegative !== "boolean") {
        throw new TypeError("length domain allowNegative must be a boolean")
      }
      return
    case "duration":
      assertExactKeys(value, ["kind", "unit"])
      if (value.unit !== "ms") throw new TypeError("duration domains use ms")
      return
    case "opacity":
      assertExactKeys(value, ["kind", "unit"])
      if (value.unit !== "fraction") throw new TypeError("opacity domains use fraction")
      return
    case "color":
      assertExactKeys(value, ["kind", "format"])
      if (value.format !== "native") throw new TypeError("color domains use native format")
      return
    case "enum":
      assertExactKeys(value, ["kind", "values"])
      if (!Array.isArray(value.values) || value.values.length === 0) {
        throw new TypeError("enum domains need at least one value")
      }
      if (value.values.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
        throw new TypeError("enum domain values must be non-empty strings")
      }
      if (new Set(value.values).size !== value.values.length) {
        throw new TypeError("enum domain values must be unique")
      }
      return
    default:
      throw new TypeError("Unsupported native expression domain")
  }
}

export function createNativeExpressionDomain<const TDomain extends NativeExpressionDomain>(
  input: TDomain,
): Readonly<TDomain> {
  assertDomainInput(input)
  if (input.kind === "enum") {
    const values = Object.freeze([...input.values].sort()) as unknown as readonly [string, ...string[]]
    return Object.freeze({...input, values}) as Readonly<TDomain>
  }
  return Object.freeze({...input}) as Readonly<TDomain>
}

function assertExpression(value: unknown): asserts value is NativeExpression {
  if (!isNativeExpression(value)) throw new TypeError("native expression node is invalid")
}

function assertSameDomain(left: NativeExpression, right: NativeExpression): void {
  if (domainKey(left.domain) !== domainKey(right.domain)) {
    throw new TypeError("expression domains must match")
  }
}

function assertNumericDomain(domain: NativeExpressionDomain): asserts domain is NumericDomain {
  if (!["number", "length", "duration", "opacity"].includes(domain.kind)) {
    throw new TypeError("scalar operation requires a numeric expression domain")
  }
}

function assertAdditiveDomain(domain: NativeExpressionDomain): asserts domain is AdditiveDomain {
  if (!["number", "length", "duration"].includes(domain.kind)) {
    throw new TypeError("add only supports number, length, and duration domains")
  }
}

function assertLiteralValue<TDomain extends NativeExpressionDomain>(
  domain: TDomain,
  value: unknown,
): asserts value is NativeExpressionValue<TDomain> {
  switch (domain.kind) {
    case "number":
    case "length":
    case "duration":
    case "opacity":
      const numericValue = finiteNumber(value, `literal value must be finite for ${domain.kind}`)
      if (domain.kind === "opacity" && (numericValue < 0 || numericValue > 1)) {
        throw new TypeError("opacity literal must be between 0 and 1")
      }
      if (domain.kind === "length" && !domain.allowNegative && numericValue < 0) {
        throw new TypeError("length literal cannot be negative in this domain")
      }
      return
    case "color":
      nonEmptyString(value, "color literal must be a non-empty string")
      return
    case "enum":
      const enumValue = nonEmptyString(value, "enum literal must be a non-empty string")
      if (!domain.values.includes(enumValue)) {
        throw new TypeError("enum literal is not in its domain")
      }
      return
  }
}

function makeNode<TNode extends NativeExpression>(node: TNode): TNode {
  return Object.freeze(node)
}

export function createNativeExpressionLiteral<const TDomain extends NativeExpressionDomain>(
  domain: TDomain,
  value: NativeExpressionValue<TDomain>,
): NativeExpressionLiteral<TDomain> {
  const canonicalDomain = createNativeExpressionDomain(domain) as TDomain
  assertLiteralValue<TDomain>(canonicalDomain, value)
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "literal",
    domain: canonicalDomain,
    value,
    dependencies: Object.freeze([]),
  }) as NativeExpressionLiteral<TDomain>
}

export function createNativeExpressionTokenReference<const TDomain extends NativeExpressionDomain>(
  token: string,
  domain: TDomain,
): NativeExpressionTokenReference<TDomain> {
  const name = nonEmptyString(token, "token reference name must be non-empty")
  const canonicalDomain = createNativeExpressionDomain(domain) as TDomain
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "token-reference",
    domain: canonicalDomain,
    token: name,
    dependencies: freezeDependencies([tokenDependency(name)]),
  }) as NativeExpressionTokenReference<TDomain>
}

export function createNativeExpressionConditionReference<const TKey extends NativeConditionKey>(
  condition: TKey,
): NativeExpressionConditionReference<TKey> {
  if (
    typeof condition !== "string" ||
    !Object.prototype.hasOwnProperty.call(CONDITION_VALUES, condition)
  ) {
    throw new TypeError(`Unsupported native condition: ${String(condition)}`)
  }
  const domain = createNativeExpressionDomain({
    kind: "enum",
    values: CONDITION_VALUES[condition],
  }) as unknown as NativeExpressionEnumDomain<NativeConditionValue<TKey>>
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "condition-reference",
    domain,
    condition,
    dependencies: freezeDependencies([conditionDependency(condition)]),
  }) as NativeExpressionConditionReference<TKey>
}

export function createNativeExpressionAlias<TDomain extends NativeExpressionDomain>(
  name: string,
  expression: NativeExpression<TDomain>,
): NativeExpressionAlias<TDomain> {
  const alias = nonEmptyString(name, "alias name must be non-empty")
  assertExpression(expression)
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "alias",
    domain: expression.domain,
    name: alias,
    expression,
    dependencies: expression.dependencies,
  }) as NativeExpressionAlias<TDomain>
}

export function createNativeExpressionFallback<TDomain extends NativeExpressionDomain>(
  primary: NativeExpression<TDomain>,
  fallback: NativeExpression<TDomain>,
): NativeExpressionFallback<TDomain> {
  assertExpression(primary)
  assertExpression(fallback)
  assertSameDomain(primary, fallback)
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "fallback",
    domain: primary.domain,
    primary,
    fallback,
    onMissing: "use-fallback",
    dependencies: mergeDependencies(primary.dependencies, fallback.dependencies),
  }) as NativeExpressionFallback<TDomain>
}

export function createNativeExpressionCompose<TDomain extends NativeExpressionDomain>(
  expressions: readonly [
    NativeExpression<TDomain>,
    ...ReadonlyArray<NativeExpression<PreventInference<TDomain>>>,
  ],
): NativeExpressionCompose<TDomain> {
  if (expressions.length === 0) throw new TypeError("composition needs at least one expression")
  const [first, ...rest] = expressions
  assertExpression(first)
  for (const expression of rest) {
    assertExpression(expression)
    assertSameDomain(first, expression)
  }
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "compose",
    domain: first.domain,
    expressions: Object.freeze([...expressions]),
    order: "left-to-right",
    dependencies: mergeDependencies(...expressions.map((expression) => expression.dependencies)),
  }) as NativeExpressionCompose<TDomain>
}

export function createNativeExpressionAdd<TDomain extends AdditiveDomain>(
  left: NativeExpression<TDomain>,
  right: NativeExpression<PreventInference<TDomain>>,
): NativeExpressionAdd<TDomain> {
  assertExpression(left)
  assertExpression(right)
  assertAdditiveDomain(left.domain)
  assertSameDomain(left, right)
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "add",
    domain: left.domain,
    left,
    right,
    dependencies: mergeDependencies(left.dependencies, right.dependencies),
  }) as NativeExpressionAdd<TDomain>
}

export function createNativeExpressionSubtract<TDomain extends AdditiveDomain>(
  left: NativeExpression<TDomain>,
  right: NativeExpression<PreventInference<TDomain>>,
): NativeExpressionSubtract<TDomain> {
  assertExpression(left)
  assertExpression(right)
  assertAdditiveDomain(left.domain)
  assertSameDomain(left, right)
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "subtract",
    domain: left.domain,
    left,
    right,
    dependencies: mergeDependencies(left.dependencies, right.dependencies),
  }) as NativeExpressionSubtract<TDomain>
}

export function createNativeExpressionScale<TDomain extends NumericDomain>(
  expression: NativeExpression<TDomain>,
  factor: number,
): NativeExpressionScale<TDomain> {
  assertExpression(expression)
  assertNumericDomain(expression.domain)
  finiteNumber(factor, "scale factor must be finite")
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "scale",
    domain: expression.domain,
    expression,
    factor,
    dependencies: expression.dependencies,
  }) as NativeExpressionScale<TDomain>
}

export function createNativeExpressionClamp<TDomain extends NumericDomain>(
  expression: NativeExpression<TDomain>,
  minimum: number,
  maximum: number,
): NativeExpressionClamp<TDomain> {
  assertExpression(expression)
  assertNumericDomain(expression.domain)
  finiteNumber(minimum, "clamp minimum must be finite")
  finiteNumber(maximum, "clamp maximum must be finite")
  if (minimum > maximum) throw new TypeError("clamp minimum must not exceed maximum")
  if (expression.domain.kind === "opacity" && (minimum < 0 || maximum > 1)) {
    throw new TypeError("opacity clamp bounds must be between 0 and 1")
  }
  return makeNode({
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "clamp",
    domain: expression.domain,
    expression,
    minimum,
    maximum,
    dependencies: expression.dependencies,
  }) as NativeExpressionClamp<TDomain>
}

export type NativeExpressionMatchOptions<
  TKey extends NativeConditionKey,
  TDomain extends NativeExpressionDomain,
> = Readonly<{
  readonly condition: TKey
  readonly cases: readonly NativeExpressionMatchCase<TKey, TDomain>[]
  readonly fallback?: NativeExpression<TDomain>
}>

export function createNativeExpressionMatch<
  const TKey extends NativeConditionKey,
  TDomain extends NativeExpressionDomain,
>(
  options: NativeExpressionMatchOptions<TKey, TDomain>,
): NativeExpressionMatch<TKey, TDomain> {
  if (
    typeof options.condition !== "string" ||
    !Object.prototype.hasOwnProperty.call(CONDITION_VALUES, options.condition)
  ) {
    throw new TypeError(`Unsupported native condition: ${String(options.condition)}`)
  }
  const values = CONDITION_VALUES[options.condition] as unknown as readonly NativeConditionValue<TKey>[]
  if (!Array.isArray(options.cases) || options.cases.length === 0) {
    throw new TypeError("exhaustive match needs at least one case")
  }
  const allowed = new Set<NativeConditionValue<TKey>>(values)
  const seen = new Set<NativeConditionValue<TKey>>()
  const cases = options.cases.map((entry) => {
    assertRecord(entry, "exhaustive match case must be an object")
    assertExactKeys(entry, ["value", "expression"])
    if (!allowed.has(entry.value as NativeConditionValue<TKey>)) {
      throw new TypeError("invalid exhaustive match case")
    }
    const value = entry.value as NativeConditionValue<TKey>
    if (seen.has(value)) throw new TypeError("duplicate exhaustive match case")
    seen.add(value)
    assertExpression(entry.expression)
    return {value, expression: entry.expression as NativeExpression<TDomain>}
  })
  const [firstCase] = cases
  if (!firstCase) throw new TypeError("exhaustive match needs at least one case")
  for (const entry of cases.slice(1)) assertSameDomain(firstCase.expression, entry.expression)
  if (options.fallback !== undefined) {
    assertExpression(options.fallback)
    assertSameDomain(firstCase.expression, options.fallback)
  } else if (seen.size !== values.length) {
    const missing = values.filter((value) => !seen.has(value))
    throw new TypeError(`exhaustive match is missing cases: ${missing.join(", ")}`)
  }
  const sortedCases = Object.freeze(
    [...cases].sort((left, right) => values.indexOf(left.value) - values.indexOf(right.value)),
  )
  const output: {
    readonly $$type: typeof NativeExpressionType
    readonly version: typeof NativeExpressionVersion
    readonly kind: "match"
    readonly domain: TDomain
    readonly condition: TKey
    readonly cases: readonly NativeExpressionMatchCase<TKey, TDomain>[]
    readonly fallback?: NativeExpression<TDomain>
    readonly exhaustive: true
    readonly dependencies: readonly NativeExpressionDependency[]
  } = {
    $$type: NativeExpressionType,
    version: NativeExpressionVersion,
    kind: "match",
    domain: firstCase.expression.domain as TDomain,
    condition: options.condition,
    cases: sortedCases,
    exhaustive: true,
    dependencies: mergeDependencies(
      [conditionDependency(options.condition)],
      ...cases.map((entry) => entry.expression.dependencies),
      ...(options.fallback === undefined ? [] : [options.fallback.dependencies]),
    ),
  }
  if (options.fallback !== undefined) {
    Object.assign(output, {fallback: options.fallback})
  }
  return makeNode(output as NativeExpressionMatch<TKey, TDomain>)
}

export function createNativeExpressionProgram<TDomain extends NativeExpressionDomain>(
  root: NativeExpression<TDomain>,
): NativeExpressionProgram<TDomain> {
  assertExpression(root)
  return Object.freeze({
    $$type: NativeExpressionProgramType,
    version: NativeExpressionProgramVersion,
    root,
    dependencies: root.dependencies,
  })
}

export function nativeExpressionDependencyKey(dependency: NativeExpressionDependency): string {
  if (dependency.kind === "token") return `token:${dependency.name}`
  return `condition:${dependency.key}`
}

export function isNativeExpression(value: unknown): value is NativeExpression {
  if (!isRecord(value)) return false
  return (
    value.$$type === NativeExpressionType &&
    value.version === NativeExpressionVersion &&
    typeof value.kind === "string" &&
    (NODE_KINDS as readonly string[]).includes(value.kind) &&
    isRecord(value.domain) &&
    Array.isArray(value.dependencies)
  )
}

export function isNativeExpressionProgram(value: unknown): value is NativeExpressionProgram {
  if (!isRecord(value)) return false
  return (
    value.$$type === NativeExpressionProgramType &&
    value.version === NativeExpressionProgramVersion &&
    isNativeExpression(value.root) &&
    Array.isArray(value.dependencies)
  )
}

export type NativeExpressionEvaluationErrorCode =
  | "missing-input"
  | "invalid-input"
  | "domain-error"

export class NativeExpressionEvaluationError extends Error {
  readonly code: NativeExpressionEvaluationErrorCode
  readonly dependency?: NativeExpressionDependency

  constructor(
    code: NativeExpressionEvaluationErrorCode,
    message: string,
    dependency?: NativeExpressionDependency,
  ) {
    super(message)
    this.name = "NativeExpressionEvaluationError"
    this.code = code
    if (dependency !== undefined) this.dependency = dependency
  }
}

export type NativeExpressionEvaluationState = Readonly<{
  readonly tokens?: Readonly<Record<string, unknown>>
  readonly conditions: NativeConditionSnapshot
}>

export type NativeExpressionRuntimeStats = Readonly<{
  readonly evaluations: number
  readonly skipped: number
  readonly declaredDependencies: readonly NativeExpressionDependency[]
  readonly disposed: boolean
}>

export type NativeExpressionRuntime<
  TDomain extends NativeExpressionDomain = NativeExpressionDomain,
> = Readonly<{
  readonly getValue: () => NativeExpressionValue<TDomain>
  readonly getState: () => NativeExpressionEvaluationState
  readonly getStats: () => NativeExpressionRuntimeStats
  /** Returns true only when a declared dependency caused a new evaluation. */
  readonly update: (state: NativeExpressionEvaluationState) => boolean
  readonly dispose: () => void
}>

const DEFAULT_EVALUATION_CONDITIONS: NativeConditionSnapshot = Object.freeze({
  platform: "unknown",
  widthBucket: "compact",
  heightBucket: "short",
  orientation: "portrait",
  direction: "ltr",
  fontScaleBucket: "normal",
  motion: "full",
  contrast: "normal",
})

function evaluationError(
  code: NativeExpressionEvaluationErrorCode,
  message: string,
  dependency?: NativeExpressionDependency,
): NativeExpressionEvaluationError {
  return new NativeExpressionEvaluationError(code, message, dependency)
}

function assertEvaluationRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) throw evaluationError("invalid-input", message)
  return value
}

function normalizeEvaluationConditions(value: unknown): NativeConditionSnapshot {
  const conditions = assertEvaluationRecord(value, "native expression conditions must be an object")
  const keys = Object.keys(CONDITION_VALUES)
  if (Object.keys(conditions).length !== keys.length || keys.some((key) => !Object.hasOwn(conditions, key))) {
    throw evaluationError("invalid-input", "native expression conditions must contain every finite axis")
  }
  for (const key of keys) {
    const candidate = conditions[key]
    if (!(CONDITION_VALUES[key as NativeConditionKey] as readonly unknown[]).includes(candidate)) {
      throw evaluationError("invalid-input", `invalid native expression condition value for ${key}`)
    }
  }
  return Object.freeze({...conditions}) as NativeConditionSnapshot
}

function normalizeEvaluationState(state: NativeExpressionEvaluationState | undefined): NativeExpressionEvaluationState {
  const candidate = (state ?? {conditions: DEFAULT_EVALUATION_CONDITIONS}) as Record<string, unknown>
  const conditions = normalizeEvaluationConditions(candidate.conditions)
  const tokens = candidate.tokens === undefined
    ? {}
    : assertEvaluationRecord(candidate.tokens, "native expression tokens must be an object")
  return Object.freeze({
    tokens: Object.freeze({...tokens}),
    conditions,
  })
}

function tokenValue(
  expression: NativeExpressionTokenReference<NativeExpressionDomain>,
  state: NativeExpressionEvaluationState,
): unknown {
  const tokens = state.tokens ?? {}
  if (!Object.hasOwn(tokens, expression.token) || tokens[expression.token] === undefined) {
    throw evaluationError(
      "missing-input",
      `missing native expression token ${expression.token}`,
      tokenDependency(expression.token),
    )
  }
  return tokens[expression.token]
}

export type NativeExpressionMatchTrace = Readonly<{
  readonly condition: NativeConditionKey
  readonly value: string
  readonly selectedBranch: "case" | "fallback"
  readonly selectedCaseValue?: string
}>

function evaluateNode<TDomain extends NativeExpressionDomain>(
  expression: NativeExpression<TDomain>,
  state: NativeExpressionEvaluationState,
  matches?: Array<NativeExpressionMatchTrace>,
): NativeExpressionValue<TDomain> {
  switch (expression.kind) {
    case "literal": {
      try {
        assertLiteralValue(expression.domain, expression.value)
      } catch (error) {
        if (error instanceof TypeError) {
          throw evaluationError("domain-error", `literal does not satisfy its ${expression.domain.kind} domain`)
        }
        throw error
      }
      return expression.value as NativeExpressionValue<TDomain>
    }
    case "token-reference": {
      const value = tokenValue(
        expression as NativeExpressionTokenReference<NativeExpressionDomain>,
        state,
      )
      try {
        assertLiteralValue(expression.domain, value)
      } catch (error) {
        if (error instanceof TypeError) {
          throw evaluationError(
            "domain-error",
            `token ${expression.token} did not provide a valid ${expression.domain.kind} value`,
            tokenDependency(expression.token),
          )
        }
        throw error
      }
      return value as NativeExpressionValue<TDomain>
    }
    case "condition-reference": {
      const value = state.conditions[expression.condition]
      try {
        assertLiteralValue(expression.domain, value)
      } catch (error) {
        if (error instanceof TypeError) {
          throw evaluationError(
            "invalid-input",
            `condition ${expression.condition} did not provide a valid value`,
            conditionDependency(expression.condition),
          )
        }
        throw error
      }
      return value as NativeExpressionValue<TDomain>
    }
    case "alias":
      return evaluateNode(expression.expression, state, matches) as NativeExpressionValue<TDomain>
    case "fallback":
      try {
        return evaluateNode(expression.primary, state, matches) as NativeExpressionValue<TDomain>
      } catch (error) {
        if (error instanceof NativeExpressionEvaluationError && error.code === "missing-input") {
          return evaluateNode(expression.fallback, state, matches) as NativeExpressionValue<TDomain>
        }
        throw error
      }
    case "compose": {
      let value: unknown
      for (const entry of expression.expressions) value = evaluateNode(entry, state, matches)
      return value as NativeExpressionValue<TDomain>
    }
    case "add": {
      const value = (evaluateNode(expression.left, state, matches) as number) +
        (evaluateNode(expression.right, state, matches) as number)
      try {
        assertLiteralValue(expression.domain, value)
      } catch (error) {
        if (error instanceof TypeError) {
          throw evaluationError("domain-error", "add result does not satisfy its expression domain")
        }
        throw error
      }
      return value as NativeExpressionValue<TDomain>
    }
    case "subtract": {
      const value = (evaluateNode(expression.left, state, matches) as number) -
        (evaluateNode(expression.right, state, matches) as number)
      try {
        assertLiteralValue(expression.domain, value)
      } catch (error) {
        if (error instanceof TypeError) {
          throw evaluationError("domain-error", "subtract result does not satisfy its expression domain")
        }
        throw error
      }
      return value as NativeExpressionValue<TDomain>
    }
    case "scale": {
      const value = (evaluateNode(expression.expression, state, matches) as number) * expression.factor
      try {
        assertLiteralValue(expression.domain, value)
      } catch (error) {
        if (error instanceof TypeError) {
          throw evaluationError("domain-error", "scale result does not satisfy its expression domain")
        }
        throw error
      }
      return value as NativeExpressionValue<TDomain>
    }
    case "clamp": {
      const input = evaluateNode(expression.expression, state, matches) as number
      const value = Math.min(expression.maximum, Math.max(expression.minimum, input))
      try {
        assertLiteralValue(expression.domain, value)
      } catch (error) {
        if (error instanceof TypeError) {
          throw evaluationError("domain-error", "clamp result does not satisfy its expression domain")
        }
        throw error
      }
      return value as NativeExpressionValue<TDomain>
    }
    case "match": {
      const conditionValue = state.conditions[expression.condition]
      const selected = expression.cases.find((entry) => entry.value === conditionValue)
      if (selected !== undefined) {
        matches?.push({
          condition: expression.condition,
          value: String(conditionValue),
          selectedBranch: "case",
          selectedCaseValue: String(selected.value),
        })
        return evaluateNode(selected.expression, state, matches) as NativeExpressionValue<TDomain>
      }
      if (expression.fallback !== undefined) {
        matches?.push({ condition: expression.condition, value: String(conditionValue), selectedBranch: "fallback" })
        return evaluateNode(expression.fallback, state, matches) as NativeExpressionValue<TDomain>
      }
      throw evaluationError(
        "invalid-input",
        `exhaustive match did not cover ${expression.condition}=${String(conditionValue)}`,
        conditionDependency(expression.condition),
      )
    }
  }
}

export function evaluateNativeExpression<TDomain extends NativeExpressionDomain>(
  expression: NativeExpression<TDomain>,
  state?: NativeExpressionEvaluationState,
): NativeExpressionValue<TDomain> {
  assertExpression(expression)
  return evaluateNode(expression, normalizeEvaluationState(state))
}

/** @internal Evaluate with opt-in match evidence; the value uses the same evaluator as the ordinary API. */
export function evaluateNativeExpressionWithTrace<TDomain extends NativeExpressionDomain>(
  expression: NativeExpression<TDomain>,
  state?: NativeExpressionEvaluationState,
): Readonly<{ readonly value: NativeExpressionValue<TDomain>; readonly matches: ReadonlyArray<NativeExpressionMatchTrace> }> {
  assertExpression(expression)
  const matches: Array<NativeExpressionMatchTrace> = []
  const value = evaluateNode(expression, normalizeEvaluationState(state), matches)
  return Object.freeze({ value, matches: Object.freeze(matches.map(match => Object.freeze(match))) })
}

function foldNode<TDomain extends NativeExpressionDomain>(
  expression: NativeExpression<TDomain>,
): NativeExpression<TDomain> {
  switch (expression.kind) {
    case "literal":
    case "token-reference":
    case "condition-reference":
      return expression
    case "alias":
      return createNativeExpressionAlias(expression.name, foldChild(expression.expression)) as NativeExpression<TDomain>
    case "fallback":
      return createNativeExpressionFallback(
        foldChild(expression.primary),
        foldChild(expression.fallback),
      ) as NativeExpression<TDomain>
    case "compose": {
      const entries = expression.expressions.map((entry) => foldChild(entry)) as unknown as readonly [
        NativeExpression<TDomain>,
        ...ReadonlyArray<NativeExpression<TDomain>>,
      ]
      return createNativeExpressionCompose(entries) as NativeExpression<TDomain>
    }
    case "add":
      return createNativeExpressionAdd(
        foldChild(expression.left) as unknown as NativeExpression<AdditiveDomain>,
        foldChild(expression.right) as unknown as NativeExpression<AdditiveDomain>,
      ) as NativeExpression<TDomain>
    case "subtract":
      return createNativeExpressionSubtract(
        foldChild(expression.left) as unknown as NativeExpression<AdditiveDomain>,
        foldChild(expression.right) as unknown as NativeExpression<AdditiveDomain>,
      ) as NativeExpression<TDomain>
    case "scale":
      return createNativeExpressionScale(
        foldChild(expression.expression) as unknown as NativeExpression<NumericDomain>,
        expression.factor,
      ) as NativeExpression<TDomain>
    case "clamp":
      return createNativeExpressionClamp(
        foldChild(expression.expression) as unknown as NativeExpression<NumericDomain>,
        expression.minimum,
        expression.maximum,
      ) as NativeExpression<TDomain>
    case "match": {
      const cases = expression.cases.map((entry) => ({
        value: entry.value,
        expression: foldChild(entry.expression),
      }))
      return createNativeExpressionMatch({
        condition: expression.condition,
        cases,
        ...(expression.fallback === undefined
          ? {}
          : {fallback: foldChild(expression.fallback)}),
      }) as NativeExpression<TDomain>
    }
  }
}

function foldChild<TDomain extends NativeExpressionDomain>(
  expression: NativeExpression<TDomain>,
): NativeExpression<TDomain> {
  const folded = foldNode(expression)
  if (folded.dependencies.length === 0 && folded.kind !== "literal") {
    const value = evaluateNativeExpression(folded, {conditions: DEFAULT_EVALUATION_CONDITIONS})
    return createNativeExpressionLiteral(
      folded.domain,
      value as NativeExpressionValue<TDomain>,
    ) as NativeExpression<TDomain>
  }
  return folded
}

export function foldNativeExpression<TDomain extends NativeExpressionDomain>(
  expression: NativeExpression<TDomain>,
): NativeExpression<TDomain> {
  assertExpression(expression)
  const folded = foldNode(expression)
  if (folded.dependencies.length === 0) {
    const value = evaluateNativeExpression(folded, {conditions: DEFAULT_EVALUATION_CONDITIONS})
    return createNativeExpressionLiteral(
      folded.domain,
      value as NativeExpressionValue<TDomain>,
    ) as NativeExpression<TDomain>
  }
  return folded
}

function dependencySetsEqual(
  left: readonly NativeExpressionDependency[],
  right: readonly NativeExpressionDependency[],
): boolean {
  if (left.length !== right.length) return false
  return left.every((dependency, index) =>
    nativeExpressionDependencyKey(dependency) === nativeExpressionDependencyKey(right[index] as NativeExpressionDependency),
  )
}

function dependencyChanged(
  dependency: NativeExpressionDependency,
  previous: NativeExpressionEvaluationState,
  next: NativeExpressionEvaluationState,
): boolean {
  if (dependency.kind === "condition") {
    return previous.conditions[dependency.key] !== next.conditions[dependency.key]
  }
  const previousTokens = previous.tokens ?? {}
  const nextTokens = next.tokens ?? {}
  const previousPresent = Object.hasOwn(previousTokens, dependency.name) &&
    previousTokens[dependency.name] !== undefined
  const nextPresent = Object.hasOwn(nextTokens, dependency.name) &&
    nextTokens[dependency.name] !== undefined
  if (previousPresent !== nextPresent) return true
  return previousPresent && !Object.is(previousTokens[dependency.name], nextTokens[dependency.name])
}

export function createNativeExpressionRuntime<TDomain extends NativeExpressionDomain>(
  program: NativeExpressionProgram<TDomain>,
  initialState?: NativeExpressionEvaluationState,
): NativeExpressionRuntime<TDomain> {
  if (!isNativeExpressionProgram(program)) {
    throw evaluationError("invalid-input", "native expression program is invalid")
  }
  if (!dependencySetsEqual(program.dependencies, program.root.dependencies)) {
    throw evaluationError("invalid-input", "program dependencies do not match its root")
  }
  const root = foldNativeExpression(program.root)
  const dependencies = root.dependencies
  let currentState = normalizeEvaluationState(initialState)
  let currentValue = evaluateNativeExpression(root, currentState) as NativeExpressionValue<TDomain>
  let evaluations = 1
  let skipped = 0
  let disposed = false

  return {
    getValue: () => currentValue,
    getState: () => currentState,
    getStats: () => Object.freeze({
      evaluations,
      skipped,
      declaredDependencies: dependencies,
      disposed,
    }),
    update(nextState) {
      if (disposed) throw new Error("native expression runtime has been disposed")
      const normalized = normalizeEvaluationState(nextState)
      if (!dependencies.some((dependency) => dependencyChanged(dependency, currentState, normalized))) {
        currentState = normalized
        skipped += 1
        return false
      }
      const nextValue = evaluateNativeExpression(root, normalized) as NativeExpressionValue<TDomain>
      currentState = normalized
      currentValue = nextValue
      evaluations += 1
      return true
    },
    dispose() {
      disposed = true
    },
  }
}
