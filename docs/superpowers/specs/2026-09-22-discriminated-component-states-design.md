# Discriminated component states design

**Status:** Proposed design for roadmap M7.2
**Governing decisions:** D9 (component styling contracts), D10 (inspectable
contracts), D11 (artifact compatibility), and D12 (executable evidence) in the
  [design-system ADR](../../decisions/adopt-native-design-system-compiler.md).

## Intent

M7.1 added primitive-aware component slots and one shared selection space for
component variants. That selection space currently models every variant axis
as independently selectable. Design systems need a way to describe mutually
exclusive state combinations such as `status: "loading"` requiring
`busy: true` and allowing only selected tones. Consumers should get a
discriminated TypeScript union, and runtime artifacts must enforce the same
contract when JavaScript, stale bundles, or untyped external inputs bypass
TypeScript.

The extension stays inside `componentRecipe`. Existing independent variants,
slot styles, compound variants, and `componentRecipeFromRecipe` remain
available. The feature stores finite constraints and checks one normalized
selection; it must not enumerate every possible variant product.

## Goals

- Describe a finite, exhaustive state discriminator using existing component
  variant values.
- Derive a discriminated union of valid component selections from that
  declaration, rejecting prohibited combinations at compile time.
- Apply defaults before checking runtime state constraints, with the
  type-level selection contract reflecting the same defaults.
- Validate state contracts at authoring and artifact-resolution boundaries.
- Reject a prohibited runtime selection before adding any variant or compound
  styles, while retaining the slot base styles and reporting a development
  diagnostic.
- Version the serialized descriptor so older runtimes fail closed on new
  stateful artifacts; newer runtimes continue to read v1 artifacts.
- Keep selection work proportional to the authored cases and selected axes,
  with no Cartesian expansion or unbounded cache growth.

## Non-goals

- State-specific extension precedence or consumer overrides (M7.3).
- Public/private contract metadata, team extension, or change-impact manifests
  (M7.3–M7.4).
- Accessibility or behavior ownership (M7.5).
- Generating stories or exhaustive visual combinations (M10).
- Device frame/allocation/memory qualification, Android acceptance, or
  activating the performance registry. Those remain separately gated.
- Adding Effect imports to ordinary consumers or to the React Native runtime.

## Chosen API

Add an optional `stateVariants` map to the existing `componentRecipe` config.
It has one entry: the key is an existing variant used as the discriminator;
each discriminator value names one exhaustive state case. Each case may
constrain other variant axes to a non-empty tuple of allowed values.

```ts
const button = componentRecipe({
  slots: {root: "view", label: "text"},
  variants: {
    status: {
      ready: {root: {opacity: 1}},
      loading: {root: {opacity: 0.7}},
      disabled: {root: {opacity: 0.45}},
    },
    tone: {
      primary: {root: {backgroundColor: "navy"}},
      quiet: {root: {backgroundColor: "transparent"}},
    },
    busy: {
      false: {label: {opacity: 1}},
      true: {label: {opacity: 0.7}},
    },
  },
  defaultVariants: {status: "ready", tone: "primary", busy: false},
  stateVariants: {
    status: {
      ready: {tone: ["primary", "quiet"], busy: [false]},
      loading: {tone: ["primary"], busy: [true]},
      disabled: {tone: ["primary", "quiet"], busy: [false]},
    },
  },
})

type ButtonProps = NativeComponentRecipeProps<typeof button>

const ready: ButtonProps = {tone: "quiet"} // status defaults to ready
const loading: ButtonProps = {status: "loading", busy: true}
// @ts-expect-error loading does not allow the quiet tone
const invalid: ButtonProps = {status: "loading", busy: true, tone: "quiet"}
```

The `status` variant continues to own its styles. `stateVariants` adds only
selection constraints; it does not add another style-composition layer or
change branch precedence. A variant axis omitted from one state's constraint
record is unrestricted in that state. A listed axis is restricted to exactly
the listed values.

## Type contract

The state discriminator must be a key in `variants`. Its case keys must be
exactly the discriminator variant's value keys: adding or removing a state
variant without updating `stateVariants` is a type error. A case cannot
constrain its own discriminator. Every constrained axis must exist in
`variants`, and every allowed value must exist in that axis.

For a boolean discriminator, the `"true"` and `"false"` case keys map to the
boolean literals `true` and `false` in the inferred selection union, matching
the existing component variant selection convention. State constraint value
tuples use the same string/boolean value domain as ordinary variant selection.

`NativeComponentRecipeProps<TRecipe>` becomes a union with one member per
state case. Each member has the case's literal discriminator and the allowed
value union for every constrained axis. Unconstrained axes retain their
existing optional selection type. The default case may omit its discriminator;
other cases must provide it. A constrained axis may be omitted in a case only
when that case permits the corresponding default value. Otherwise it is
required in that union member. This lets partial selections remain ergonomic
while keeping default normalization and type checking aligned.

A stateful recipe must provide a `defaultVariants` entry for its discriminator
and for each axis constrained by the default case. Those default values must
select one declared case and satisfy that case's constraints. This ensures
that calling a resolver with no selection produces a valid normalized state.
Non-stateful component recipes keep the M7.1 selection type and behavior.

The authoring signature remains const-generic so case names, axes, value
tuples, and defaults infer from the config. Runtime constructor validation
repeats all state-shape and value checks for JavaScript callers. The public
style API exports the new state config type only if needed to express the
inferred contract; no userland Effect type is introduced.

## Descriptor and compatibility

Newly authored component recipes emit descriptor version 2. Version 2 adds the
plain-data `stateVariants` map. Recipes without state constraints emit an
empty or omitted map under v2 and retain their existing selection behavior.
`componentRecipeFromRecipe` also emits v2 when called by the new authoring
entrypoint.

The runtime accepts v1 descriptors as the existing unconstrained component
contract and v2 descriptors with optional state constraints. It rejects
unknown versions and malformed state records before resolving any branch.
The generic compiler capture/emitter continues to preserve descriptor tags,
versions, state records, and nested class references. Theme resolution copies
and freezes state metadata without interpreting it as a style branch.

## Normalization and runtime behavior

The resolver merges `defaultVariants` with the caller selection once, then
looks up the selected discriminator case and checks only that case's listed
axes. A selection is valid only when every normalized value satisfies the
case. The resolver applies base styles, then variant and compound styles using
the existing authored ordering for a valid selection.

If a runtime selection has an unknown discriminator or violates a declared
case, the resolver reports a deduplicated development diagnostic and returns
the base slot styles only. It does not apply any variant or compound branch,
avoiding a visually mixed state. Every declared slot remains present with a
frozen style array. Existing behavior for non-stateful recipes and individually
invalid independent variant values remains unchanged.

The resolution plan stores the finite case records and value memberships.
Validation and selection inspect only authored state cases and the axes in the
selected case. Descriptor and plan size grow with authored cases and
constraints, not with the product of variant domains. Existing bounded cache
capacity, identity, disposal, and key canonicalization remain in force; cache
keys still represent the normalized selection.

## Errors and compatibility policy

- Authoring throws a descriptive `TypeError` for unknown discriminator or
  constrained axes, missing or extra state cases, empty/duplicate allowed
  values, values absent from a variant, invalid defaults, or non-data records.
- Plan creation throws before partial resolution for malformed v2 state data,
  invalid defaults, or an unsupported descriptor version.
- A prohibited runtime selection reports the component, discriminator,
  normalized selection, and supported case constraints in development, then
  returns base-only slot arrays. Production avoids console diagnostics and
  follows the same deterministic base-only result.
- A v1 descriptor remains unconstrained and resolves with existing M7.1
  behavior. A v1 runtime encountering a v2 artifact rejects it as unsupported
  rather than silently ignoring state constraints.

## Data flow and testing

The public data path remains:

1. `componentRecipe` type-checks and validates the declaration, then emits a
   deeply frozen versioned descriptor.
2. Compiler capture and emission preserve the state map as plain data.
3. Theme token resolution walks style branches as today and preserves state
   constraints unchanged.
4. `createComponentRecipeResolutionPlan` validates and indexes the finite
   state constraints once.
5. Resolution merges defaults, validates the selected state, and only then
   chooses the existing base/variant/compound styles.

Acceptance coverage includes:

- Positive and negative TypeScript fixtures for exhaustive cases, narrowed
  state values, defaults, default-case omission, required non-default
  discriminators, and prohibited combinations.
- Constructor and plan tests for missing/extra cases, unknown values, invalid
  defaults, frozen descriptors, and malformed v2 artifacts.
- Runtime tests proving defaults normalize before state checks, valid states
  preserve authored style order, prohibited states return base-only results,
  diagnostics are deduplicated, and v1 descriptors still resolve.
- A seeded `fast-check` property test comparing valid and invalid selections
  against an independent state/recipe reference evaluator. The oracle must not
  call the implementation's case matcher or reuse its normalized plan.
- A size law showing stored state/plan entries grow with authored cases and
  constraints rather than with the Cartesian product of variant values.
- Compiler/emission, theme-resolution, packed ESM/CommonJS consumer, runtime
  isolation, and public API tests for the v2 artifact.
- Documentation that explains the type contract, defaults, runtime fail-closed
  behavior, descriptor compatibility, and product-free selection cost.

No native device, Hermes frame/allocation/memory, visual Storybook, performance
registry, or Android claim is made by M7.2. Those gates remain incomplete.

## Alternatives considered

| Option | Advantages | Costs and reason for outcome |
| --- | --- | --- |
| `stateVariants` constraints over existing axes | Reuses one variant/style plan; produces one inferred discriminated union; constraints are inspectable plain data; runtime checks one selected case | Adds a finite state declaration and a descriptor version; chosen because it preserves M7.1 branch ordering and avoids duplicated style definitions. |
| Nested recipe per state | Each state can be authored independently and is easy to understand in isolation | Duplicates shared styles/defaults and creates precedence questions across nested recipes; it also encourages multiple plans/caches. |
| Type-only discriminated-union helper | Minimal descriptor changes | Compiled artifacts and JavaScript consumers could still resolve prohibited combinations; rejected because the contract must be enforced at runtime. |

## Delivery boundary

The implementation plan may modify the component authoring types and
constructor, component descriptor tags/version handling, component resolution
plan, theme-resolution preservation, compiler/packed-consumer tests, public
API documentation, the M7.2 assessment, and the M7.2 roadmap ledger. It must
not modify `.release-please-manifest.json`, `bun.lock`, or
`packages/css/package.json`, introduce consumer-facing Effect imports, mark
M7.3–M7.5 complete, or claim device/Android qualification.
