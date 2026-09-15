# Native IR semantic contract v1

**Status:** accepted for M2 implementation
**Scope:** internal compiler meaning; no public API or published artifact ABI
**Governing decision:** [D1, D2, D3, D8, D10 and D11](../decisions/adopt-native-design-system-compiler.md)

## Purpose and boundary

The native intermediate representation preserves React Native styling intent before browser CSS serialization can erase structure, ordering, ownership or source context. Compiler passes consume immutable data and return either a value or a non-empty diagnostic collection. No pass mutates an admitted node, consults a process-global style registry, executes user values, or performs React/runtime work.

IR version 1 is an internal semantic contract. It is distinct from the M1.2 `NativeArtifact` version-1 prototype envelope and from the external artifact encoding to be designed in M2.5. An unsupported IR version fails before linking or normalization. There is no automatic legacy/new-compiler fallback.

The pipeline is:

```text
captured exports
  -> schema and domain admission
  -> reference linking
  -> property normalization
  -> dependency analysis
  -> native emission
```

Effect Schema validates untrusted or phase-crossing data. Once admitted, the core passes operate as total functions over immutable tagged unions. Effect may coordinate compiler resources and diagnostics, but ordinary runtime style selection does not receive Effect values or services. Optics may implement reusable compiler transformations only when their laws are stated against the semantic equality below.

## Module algebra

The normative model is equivalent to these readonly algebraic data types. Names illustrate shape and meaning; they do not reserve a public TypeScript API.

```ts
type PrimitiveKind = "view" | "text" | "image"
type PrimitiveDomain = NonEmptyReadonlySet<PrimitiveKind>

type NativeIrModule = {
  readonly _tag: "NativeIrModule"
  readonly irVersion: 1
  readonly module: ModuleIdentity
  readonly definitions: readonly Definition[]
  readonly exports: readonly ExportEntry[]
}

type Definition =
  | StyleDefinition
  | StyleMapDefinition
  | RecipeDefinition
  | TokenContractDefinition
  | OrdinaryDataDefinition

type StyleExpression =
  | DeclarationBlock
  | OrderedComposition
  | StyleReference

type DeclarationBlock = {
  readonly _tag: "DeclarationBlock"
  readonly primitiveDomain: PrimitiveDomain
  readonly declarations: readonly NativeDeclaration[]
  readonly provenance: SourceProvenance
}

type OrderedComposition = {
  readonly _tag: "OrderedComposition"
  readonly primitiveDomain: PrimitiveDomain
  readonly items: readonly StyleExpression[]
  readonly provenance: SourceProvenance
}

type StyleReference = {
  readonly _tag: "StyleReference"
  readonly primitiveDomain: PrimitiveDomain
  readonly target: DefinitionIdentity
  readonly provenance: SourceProvenance
}

type NativeDeclaration = {
  readonly _tag: "NativeDeclaration"
  readonly property: CanonicalNativeProperty
  readonly value: AdmittedNativeValue | TokenReference
  readonly provenance: PropertyProvenance
}
```

Every definition identity is qualified by package owner, logical module identity and local definition name. A class string, JavaScript object shape, debug label or source evaluation order cannot establish identity. Duplicate definition identities, export names or style-map keys are errors.

`PrimitiveDomain` is stored in canonical `view`, `text`, `image` order. A primitive helper creates a singleton domain. Generic `style` authoring derives the intersection of target kinds that admit every declaration and reference. Composition intersects its item domains; an empty intersection is `CRUMBS_IR_PRIMITIVE_MISMATCH`. Consumption chooses one member of the domain and emission retains that choice. Primitive kind never comes from a TypeScript assertion alone.

## Values and token references

An admitted native value is a supported finite scalar, dense ordered array, or plain/null-prototype record whose leaves are admitted values. Structured properties such as `transform` and `shadowOffset` remain whole values. Arrays preserve order. Record key order has no semantic meaning. Accessors, functions, symbols, instances, cycles, sparse arrays and non-finite numbers are rejected before IR admission. Style-declaration `undefined` means omission and is never an admitted declaration value.

Numbers use `Object.is` semantics, so `-0` and `0` are distinct compiler values. Any JSON artifact encoding must represent signed zero explicitly or reject it at that encoding boundary. This does not change the narrower M1.2 prototype codec policy.

A token reference contains its full contract identity, canonical non-empty token path and declared value domain. Display variable names are metadata and never establish identity. References with the same path in different contracts are distinct. Contract mismatch, path/domain mismatch and missing required values are errors. Tokens remain symbolic through normalization; only surviving declarations contribute dependencies or require resolution.

## Declaration and composition semantics

Normalization proceeds in this order:

1. Validate the node, primitive domain, property domain and reference identity.
2. Expand each supported alias or shorthand at its original sequence position into canonical React Native properties.
3. Link references, rejecting missing targets, cycles and primitive-domain mismatches.
4. Flatten compositions depth-first from left to right without deduplicating repeated references.
5. Select the last declaration for each canonical property. A structured value replaces the previous value as a whole.
6. Derive token/condition dependencies from the surviving declarations only.

Ordered composition is associative and has an empty composition as its identity. It is neither commutative nor idempotent. These laws concern meaning after successful admission and normalization; they do not permit reordering diagnostics or source provenance. A missing token in a completely overridden declaration is not resolved and does not fail evaluation.

Normalization is idempotent under semantic equality. It may reuse unchanged immutable nodes, but structural sharing is a separate identity/performance guarantee. Optimizers may remove dead declarations or fuse blocks only when semantic equality and deterministic diagnostics are preserved.

## Style maps

A style map is an explicit tagged definition containing unique named entries and one primitive domain per entry. Map key order does not define style precedence. Selecting an entry yields its style expression; precedence begins only when that expression participates in an ordered composition. Semantic map equality requires the same key set and semantically equal entries with equal primitive domains. Unknown keys fail at typed authoring where possible and at validated dynamic ingress otherwise.

## Recipes

A recipe definition contains an optional base expression, an ordered array of variant axes, an optional default for each axis, and an ordered array of compound variants. Axis and value names are unique. The selection algorithm is:

1. Reject unknown axes, explicit `undefined`, invalid values and values outside the declared primitive domain.
2. Apply the base.
3. For each axis in definition order, apply the explicit selection or its default when present.
4. Apply every matching compound in array order.

Absence selects a default; explicit `undefined` is invalid input. Boolean selections normalize to the canonical keys `"true"` and `"false"` before lookup, compound comparison and cache-key construction. Omission, `false` and the string `"false"` therefore remain distinguishable at ingress even when two normalize to the same admitted selection.

Recipe semantic equality is extensional over the finite admitted selection domain: public axes/values/default behavior must match, invalid selections must fail equivalently, and every admitted selection must produce semantically equal styles. Implementations may compare a canonical representation when it is proven equivalent; they must not eagerly materialize an unbounded Cartesian product.

## Export metadata

Every named export has an explicit kind: `style`, `style-map`, `recipe`, `token-contract`, or `ordinary-data`. Style-bearing entries record the target definition identity and primitive domain. Token contracts record their qualified identity and public token paths/domains. Ordinary data uses the admitted data contract and cannot be reclassified from a tag-like string or object shape.

Export order is retained for deterministic diagnostics and manifest presentation but has no effect on style meaning. Default exports remain unsupported during this migration. Development metadata may add debug names, dependency edges and source provenance. Minimal production artifacts omit source coordinates and compiler-only descriptions while preserving all identities and dependency data required for correct linking and runtime resolution.

## Provenance

`SourceProvenance` records package owner, a normalized package-relative POSIX source ID, export path, logical value path, one-based line/column when available, and origin: `crumbs-native`, `vanilla-extract-adapter`, or `generated`. `PropertyProvenance` additionally records the authored property spelling, canonical property and shorthand expansion path. Derived nodes retain ordered `derivedFrom` references when one source location is insufficient.

Absolute host paths are never stable identities and must not enter portable artifacts or cache keys. Source coordinates and debug labels affect diagnostics, not semantic style equality. Content, dependency, compiler, platform and configuration hashes are separate cache inputs; moving identical source may preserve emitted semantics while changing diagnostic provenance.

The compatibility adapter must identify itself as the origin and retain the browser spelling that produced each canonical native declaration. Generated nodes must point to their owning definition and generation rule. Missing provenance at an ingress that promises it is an error, not an empty placeholder.

## Equality and determinism

Three equality relations are deliberately separate:

- **Identity equality** compares qualified contract, module and definition identities. It determines linking and cache ownership.
- **Semantic style equality** chooses a primitive, successfully links and normalizes both expressions, then compares canonical property maps before runtime token resolution. It ignores source provenance, declaration grouping, composition nesting and record key order. It preserves array order, uses `Object.is` for scalar leaves, and compares surviving token references by qualified contract/path/domain identity. Distinct references remain distinct even when one theme currently resolves them to equal values.
- **Artifact equality** additionally compares IR/artifact versions, module identity, export names/kinds/targets, primitive domains, token contracts and ordinary data. Development provenance is excluded unless a development-artifact comparison explicitly requests it.

Style-map equality is key-set based. Recipe equality follows the finite extensional rule above. Invalid IR has no style semantics; two failures are not semantically equal merely because their messages match.

Given the same admitted module, dependency artifacts, platform and compiler configuration, normalization and emission must produce the same semantic result and deterministic export/declaration ordering. Canonical bytes and hashing remain an M2.5 encoding decision and are not inferred from JavaScript property enumeration.

## Diagnostic contract

Each compiler phase returns a value or a non-empty ordered diagnostic collection. Independent errors accumulate; a phase may stop only where continuing would fabricate meaning or execute unsafe data. Diagnostics contain a stable code, phase, severity, owning module/export/definition identity, source/property provenance when known, a concise detail, and actionable remediation. Ordering is deterministic by module, export, source position, phase and code.

The initial IR code family is:

| Code | Meaning |
| --- | --- |
| `CRUMBS_IR_UNSUPPORTED_VERSION` | IR or linked dependency version is unsupported |
| `CRUMBS_IR_INVALID_NODE` | Tagged node or exact fields fail admission |
| `CRUMBS_IR_DUPLICATE_IDENTITY` | Definition, export, map key or variant identity is duplicated |
| `CRUMBS_IR_MISSING_REFERENCE` | Qualified style/export target is absent |
| `CRUMBS_IR_REFERENCE_CYCLE` | The reference graph contains a cycle |
| `CRUMBS_IR_PRIMITIVE_MISMATCH` | Primitive domains have an empty intersection or consumption is invalid |
| `CRUMBS_IR_INVALID_PROPERTY` | Property is unsupported for its primitive domain |
| `CRUMBS_IR_INVALID_VALUE` | Value is unsupported for the canonical property/domain |
| `CRUMBS_IR_INVALID_TOKEN_REFERENCE` | Token identity, path or value domain is malformed or incompatible |
| `CRUMBS_IR_MISSING_TOKEN` | A surviving required token has no value |
| `CRUMBS_IR_CONTRACT_MISMATCH` | Reference and owning contract identities disagree |
| `CRUMBS_IR_INVALID_RECIPE_SELECTION` | Axis/value/omission input violates the recipe contract |
| `CRUMBS_IR_UNSUPPORTED_EXPORT` | Export kind or data cannot enter the IR |

Existing `CRUMBS_CSS_*` diagnostics remain the public compatibility surface until a later migration explicitly maps IR diagnostics. Mapping preserves the IR code and provenance in development evidence; it cannot turn an error into a warning or silently use the legacy compiler.

## Executable laws and delivery gates

The test-only [v1 reference evaluator](../../packages/css/test/oracles/native-ir-v1.ts) is independent of production compiler code. Its property suite fixes these laws with reproducible seeds:

- associative ordered composition, empty identity and a noncommutative counterexample;
- last-winner evaluation and dead-dependency removal before token resolution;
- provenance-insensitive semantic equality with ordered arrays, unordered record keys and signed-zero distinction;
- qualified reference linking, cycle detection and deterministic error accumulation;
- base, variant-definition and compound-array recipe order, including omission versus explicit `undefined`.

M2 implementation compares each migrated property family against this oracle and adds adversarial generators plus committed shrunk counterexamples. Schema-derived generators may supply valid shapes, but invalid mutations and expected results remain independently defined.

This specification does not add production IR nodes, wire compiler capture, encode an external artifact, change public authoring types, broaden property support, alter runtime resolution, or claim performance/device acceptance.
