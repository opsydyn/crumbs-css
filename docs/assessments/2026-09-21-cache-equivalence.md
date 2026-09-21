# M4.5 cached and uncached evaluator equivalence

## Decision

Keep the production theme cache keyed by immutable input and theme identity,
and qualify it with an independent uncached oracle rather than adding a second
runtime cache mode. Recipe resolvers retain their existing finite cache; a
zero-capacity resolver and direct resolver calls provide the uncached comparison
path.

## Evidence

`theme-resolution-equivalence.property.test.ts` runs seeded generated style
arrays and literal/token objects through the cached resolver and an independent
flatten-and-token oracle. It checks equal values, repeated-call identity,
replacement theme/style isolation, and static-reference retention. The same
suite generates dependency-plan inputs and verifies that changing one declared
token replaces only its affected output path while preserving unrelated and
static references.

`recipe-runtime.property.test.ts` compares bounded, zero-capacity and direct
recipe resolution for generated variants, defaults, invalid selections and
compound matches. It also checks that resolver plans retain authored values
linearly and that one selection stores one result rather than an eager variant
Cartesian product.

## Contract

- Input styles, recipes and themes are immutable snapshots. Post-resolution
  mutation is not an invalidation mechanism.
- A new theme snapshot or style artifact has an independent cache identity and
  cannot return a result from an older snapshot.
- Same-input/same-theme cached calls retain their documented references. A
  changed dependency path may be replaced; unaffected dependency-plan paths
  and static outputs retain their references.
- Cache capacity is explicit and finite. `cacheSize: 0` retains no recipe
  selections, while the plan still evaluates the requested selection on demand.
- The generated cases use an independent oracle and fixed seeds so failures
  retain reproducible inputs rather than treating the production evaluator as
  its own oracle.

## Limits

These tests qualify semantic equivalence, identity, invalidation completeness
and the absence of eager recipe expansion. They do not measure React render
counts, Hermes/native frame time, device memory, Android behaviour or cache
retention under a long-running production workload. M4.6 owns device, bundle,
editor and retained-memory budgets.
