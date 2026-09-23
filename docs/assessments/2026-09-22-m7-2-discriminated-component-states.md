# M7.2 discriminated component states assessment

## Decision

Close M7.2 with typed, exhaustive state constraints on component recipes. The
descriptor records a finite state map and the resolver checks only the selected
case after applying defaults. A prohibited state returns base styles for each
slot and reports a development diagnostic; resolution does not enumerate
variant products.

## Contract delivered

- Newly authored `componentRecipe` descriptors use version 2 and may declare
  one `stateVariants` discriminator over existing variant axes. Its cases
  exactly cover the discriminator's authored values. Each case may constrain
  sibling axes to non-empty sets of values already declared by those axes.
- `NativeComponentRecipeProps<typeof recipe>` derives selections from the
  active state. Runtime resolution merges `defaultVariants` and the supplied
  selection before checking the selected case. Valid selections keep the
  authored base, variant, and compound order. A prohibited state returns only
  base slot styles, skipping all variants and compounds.
- A finite plan retains the authored variant branches and state constraints;
  it does not store the Cartesian product of possible selections. Theme-token
  resolution preserves descriptor version and state metadata.
- Runtime readers continue to accept version 1 descriptors with their prior
  unconstrained behavior and version 2 descriptors. Unsupported versions fail
  closed. Invalid independent variant values retain their existing
  warn-and-skip behavior unless they violate an active state constraint.

## Evidence

Implementation and qualification commits:

- `863cff4` — v2 descriptor, typed authoring contract, and state-aware
  resolution.
- `abd7a18` — independent property oracle and finite plan-size laws. The
  runtime oracle uses seed `20260922` for 100 runs; the plan property uses seed
  `20260923` for 100 runs. The focused command passed 8 tests across 2 files
  with 11,488 assertions.
- `9456cc8` — compiler artifacts, packed ESM/CommonJS consumer behavior, and
  runtime isolation. The focused command passed 12 tests across 3 files with
  53 assertions. Both module formats resolve defaults and valid loading states,
  return base-only styles for a prohibited state, and retain v1 resolution.
  The compiler test asserts the emitted tag, version, exact state map, authored
  style branches, and token resolution.

Full qualification passed on this workspace:

- `bun run check` — package build and typecheck passed; 806 tests passed with
  39,398 assertions across 135 files.
- `bun run docs:build` — 20 documentation pages built, including the updated
  package entrypoint reference.
- The M7.2 reference now documents exhaustive state cases, allowed values,
  default normalization, fail-closed runtime selection, descriptor
  compatibility, and the no-product-expansion guarantee.

## Remaining limits

This closes the software contract and package/docs qualification for M7.2. It
does not qualify device frame time, allocations, retained memory, or native
performance budgets. Performance-registry activation, visual Storybook
acceptance, Expo device acceptance, and Android remain parked for device-backed
work.

## Next recommendation

Proceed to **M7.3**: declare public and private tokens, slots, variants, and
extension points, then specify precedence for inherited defaults, local
variants, states, compounds, and permitted consumer overrides before freezing
the public API.
