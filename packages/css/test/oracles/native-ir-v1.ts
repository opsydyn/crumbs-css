export type PrimitiveKind = "view" | "text" | "image"

export type SourceProvenance = {
  readonly sourceId: string
  readonly exportPath: ReadonlyArray<string | number>
  readonly propertyPath: ReadonlyArray<string | number>
  readonly line: number
  readonly column: number
  readonly origin: "crumbs-native" | "vanilla-extract-adapter" | "generated"
  readonly originalProperty?: string
}

export type ContractIdentity = {
  readonly owner: string
  readonly name: string
  readonly version: number
}

export type DefinitionIdentity = {
  readonly owner: string
  readonly module: string
  readonly name: string
}

export type TokenReference = {
  readonly _tag: "TokenReference"
  readonly contract: ContractIdentity
  readonly path: ReadonlyArray<string>
}

export type NativeValue = string | number | boolean | null | ReadonlyArray<NativeValue> | {
  readonly [key: string]: NativeValue
}
export type DeclarationValue = NativeValue | TokenReference

export type NativeIrDeclaration = {
  readonly _tag: "Declaration"
  readonly property: string
  readonly value: DeclarationValue
  readonly provenance: SourceProvenance
}

export type StyleExpression = {
  readonly _tag: "DeclarationBlock"
  readonly primitive: PrimitiveKind
  readonly declarations: ReadonlyArray<NativeIrDeclaration>
  readonly provenance: SourceProvenance
} | {
  readonly _tag: "Composition"
  readonly primitive: PrimitiveKind
  readonly items: ReadonlyArray<StyleExpression>
  readonly provenance: SourceProvenance
} | {
  readonly _tag: "StyleReference"
  readonly primitive: PrimitiveKind
  readonly target: DefinitionIdentity
  readonly provenance: SourceProvenance
}

export type NativeIrRecipe = {
  readonly _tag: "Recipe"
  readonly primitive: PrimitiveKind
  readonly base?: StyleExpression
  readonly variants: ReadonlyArray<{
    readonly name: string
    readonly defaultValue?: string | boolean
    readonly values: Readonly<Record<string, StyleExpression>>
  }>
  readonly compounds: ReadonlyArray<{
    readonly when: Readonly<Record<string, string | boolean>>
    readonly style: StyleExpression
  }>
  readonly provenance: SourceProvenance
}

export type IrDiagnosticCode =
  | "CRUMBS_IR_PRIMITIVE_MISMATCH"
  | "CRUMBS_IR_MISSING_REFERENCE"
  | "CRUMBS_IR_REFERENCE_CYCLE"
  | "CRUMBS_IR_MISSING_TOKEN"
  | "CRUMBS_IR_INVALID_RECIPE_SELECTION"

export type IrDiagnostic = {
  readonly code: IrDiagnosticCode
  readonly provenance: SourceProvenance
  readonly detail: string
}

export type EvaluationEnvironment = {
  readonly definitions: ReadonlyArray<{
    readonly identity: DefinitionIdentity
    readonly expression: StyleExpression
  }>
  readonly tokens: Readonly<Record<string, NativeValue>>
}

export type EvaluationResult =
  | { readonly ok: true; readonly value: Readonly<Record<string, NativeValue>> }
  | { readonly ok: false; readonly errors: readonly [IrDiagnostic, ...ReadonlyArray<IrDiagnostic>] }

type NormalizedStyle = {
  readonly declarations: Readonly<Record<string, NativeIrDeclaration>>
  readonly errors: ReadonlyArray<IrDiagnostic>
}

function diagnostic(code: IrDiagnosticCode, provenance: SourceProvenance, detail: string): IrDiagnostic {
  return { code, provenance, detail }
}

function tokenKey(reference: TokenReference) {
  return `${reference.contract.owner}\u0000${reference.contract.name}\u0000${reference.contract.version}\u0000${reference.path.join("\u0000")}`
}

function definitionKey(identity: DefinitionIdentity) {
  return `${identity.owner}\u0000${identity.module}\u0000${identity.name}`
}

function isTokenReference(value: DeclarationValue): value is TokenReference {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    "_tag" in value && value._tag === "TokenReference"
}

function flatten(
  expression: StyleExpression,
  primitive: PrimitiveKind,
  environment: EvaluationEnvironment,
  references: ReadonlyArray<string>,
): { readonly declarations: ReadonlyArray<NativeIrDeclaration>; readonly errors: ReadonlyArray<IrDiagnostic> } {
  if (expression.primitive !== primitive) {
    return {
      declarations: [],
      errors: [diagnostic("CRUMBS_IR_PRIMITIVE_MISMATCH", expression.provenance, `${expression.primitive} cannot enter ${primitive}`)],
    }
  }
  switch (expression._tag) {
    case "DeclarationBlock":
      return { declarations: expression.declarations, errors: [] }
    case "Composition": {
      const parts = expression.items.map(item => flatten(item, primitive, environment, references))
      return {
        declarations: parts.flatMap(part => part.declarations),
        errors: parts.flatMap(part => part.errors),
      }
    }
    case "StyleReference": {
      const key = definitionKey(expression.target)
      if (references.includes(key)) {
        return {
          declarations: [],
          errors: [diagnostic("CRUMBS_IR_REFERENCE_CYCLE", expression.provenance, [...references, key].join(" -> "))],
        }
      }
      const target = environment.definitions.find(definition => definitionKey(definition.identity) === key)?.expression
      if (target === undefined) {
        return {
          declarations: [],
          errors: [diagnostic("CRUMBS_IR_MISSING_REFERENCE", expression.provenance, key)],
        }
      }
      return flatten(target, primitive, environment, [...references, key])
    }
  }
}

function normalizeStyle(expression: StyleExpression, environment: EvaluationEnvironment): NormalizedStyle {
  const flattened = flatten(expression, expression.primitive, environment, [])
  const winners = new Map<string, NativeIrDeclaration>()
  for (const declaration of flattened.declarations) winners.set(declaration.property, declaration)
  return {
    declarations: Object.fromEntries(winners),
    errors: flattened.errors,
  }
}

export function evaluateStyle(expression: StyleExpression, environment: EvaluationEnvironment): EvaluationResult {
  const normalized = normalizeStyle(expression, environment)
  const value: Record<string, NativeValue> = {}
  const errors = [...normalized.errors]
  for (const [property, declaration] of Object.entries(normalized.declarations)) {
    const declarationValue = declaration.value
    if (!isTokenReference(declarationValue)) {
      value[property] = declarationValue
      continue
    }
    const resolved = environment.tokens[tokenKey(declarationValue)]
    if (resolved === undefined) {
      errors.push(diagnostic("CRUMBS_IR_MISSING_TOKEN", declaration.provenance, declarationValue.path.join(".")))
    } else {
      value[property] = resolved
    }
  }
  return errors.length === 0
    ? { ok: true, value }
    : { ok: false, errors: errors as [IrDiagnostic, ...IrDiagnostic[]] }
}

function semanticValueEqual(left: DeclarationValue, right: DeclarationValue): boolean {
  if (typeof left !== "object" || left === null || typeof right !== "object" || right === null) {
    return Object.is(left, right)
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
      left.every((value, index) => semanticValueEqual(value, right[index]!))
  }
  const leftRecord = left as Readonly<Record<string, DeclarationValue>>
  const rightRecord = right as Readonly<Record<string, DeclarationValue>>
  const leftKeys = Object.keys(leftRecord).sort()
  const rightKeys = Object.keys(rightRecord).sort()
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) =>
    key === rightKeys[index] && semanticValueEqual(leftRecord[key]!, rightRecord[key]!),
  )
}

export function semanticStyleEqual(left: StyleExpression, right: StyleExpression, environment: EvaluationEnvironment): boolean {
  if (left.primitive !== right.primitive) return false
  const leftResult = normalizeStyle(left, environment)
  const rightResult = normalizeStyle(right, environment)
  if (leftResult.errors.length > 0 || rightResult.errors.length > 0) return false
  const values = (result: NormalizedStyle) => Object.fromEntries(
    Object.entries(result.declarations).map(([property, declaration]) => [property, declaration.value]),
  )
  return semanticValueEqual(values(leftResult), values(rightResult))
}

export function selectRecipe(
  recipe: NativeIrRecipe,
  selection: Readonly<Record<string, string | boolean | undefined>>,
  environment: EvaluationEnvironment,
): EvaluationResult {
  const errors: IrDiagnostic[] = []
  const axes = new Map(recipe.variants.map(variant => [variant.name, variant]))
  for (const [name, value] of Object.entries(selection)) {
    if (!axes.has(name) || value === undefined) {
      errors.push(diagnostic("CRUMBS_IR_INVALID_RECIPE_SELECTION", recipe.provenance, `${name}=${String(value)}`))
    }
  }
  const selected: Record<string, string> = {}
  const styles: StyleExpression[] = recipe.base === undefined ? [] : [recipe.base]
  for (const variant of recipe.variants) {
    const raw = Object.prototype.hasOwnProperty.call(selection, variant.name)
      ? selection[variant.name]
      : variant.defaultValue
    if (raw === undefined) continue
    const normalized = String(raw)
    const style = variant.values[normalized]
    if (style === undefined) {
      errors.push(diagnostic("CRUMBS_IR_INVALID_RECIPE_SELECTION", recipe.provenance, `${variant.name}=${normalized}`))
      continue
    }
    selected[variant.name] = normalized
    styles.push(style)
  }
  for (const compound of recipe.compounds) {
    if (Object.entries(compound.when).every(([name, value]) => selected[name] === String(value))) styles.push(compound.style)
  }
  if (errors.length > 0) return { ok: false, errors: errors as [IrDiagnostic, ...IrDiagnostic[]] }
  return evaluateStyle({
    _tag: "Composition",
    primitive: recipe.primitive,
    items: styles,
    provenance: recipe.provenance,
  }, environment)
}
