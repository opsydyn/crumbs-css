# M5.4 Sprinkles output strategy comparison assessment

## Decision

Use a bounded hybrid output policy for compiler emission. Pre-fuse only the
measured hot selections and keep atomic property/scale entries as the fallback
for cold or newly encountered selections. This gives design-system authors a
small static output for common paths without creating the full Cartesian
product of a finite utility system.

The current `createSprinklesResolver` remains the M5.3 atomic lookup path. A
runtime default change needs release Hermes and device evidence; this slice
chooses the output policy for the compiler and records the evidence needed for
that follow-up.

## Identical fixture and protocol

`packages/css/bench/sprinkles-output-workload.ts` defines one bounded card
fixture with five property axes (`paddingLeft`, `paddingRight`,
`backgroundColor`, `color`, and `borderRadius`), three values per axis, and an
overlapping `px` shorthand targeting both padding longhands. Omitting or
selecting each axis produces 4,096 finite selections. Twelve common selections
form the hot set; the measured workload repeats those selections and adds 36
cold selections for 72 inputs total.

The strategies are:

- **Atomic:** retain 15 property/scale entries and construct an ordered style
  array for each selection.
- **Fused:** precompute one merged style entry for every one of the 4,096
  selections.
- **Hybrid:** retain the same 15 atomic entries and precompute only the 12 hot
  merged entries; cold selections use the atomic path.

Every full finite selection is flattened and compared across all three
strategies before timing. The benchmark then performs two setup warmups and
seven setup samples per strategy. Selection timing uses the same 20,000
operation workload for seven samples after 2,000 warmup operations.

Artifact bytes are the UTF-8 length of canonical JSON for the strategy
artifact. They are a comparable representation measure, not a Metro or
Hermes bundle size. `allocationUnits` is deliberately a model count: one
returned style-array header plus one slot per returned style reference. Setup
allocation counts retain atomic entries, fused entries, lookup containers, and
merged style objects. These fields are not native heap measurements.

## Host evidence

The run was recorded on Bun 1.4.2, macOS 25.6.0, Apple M4 Pro. The raw report
is [comparison.json](../evidence/2026-09-22-m5-4-sprinkles-output/comparison.json).

| Strategy | Artifact bytes | Setup median | Selection median | Mean array length | Mean allocation units | Maximum array length |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Atomic | 674 | 0.0012 ms | 0.208 µs | 2.666 | 3.666 | 5 |
| Fused | 611,714 | 2.8061 ms | 0.252 µs | 1.000 | 2.000 | 1 |
| Hybrid | 1,831 | 0.0071 ms | 0.281 µs | 1.916 | 2.916 | 4 |

Fused gives the shortest output arrays, but its artifact is about 908 times
larger than atomic and its setup retains 4,096 merged objects. It is therefore
not a viable default for a large design system. Atomic has the smallest host
artifact, lowest setup work, and fastest measured selection path, but it keeps
the largest arrays for the mixed workload. Hybrid reduces mean array length by
about 28% and modelled selection allocations by about 20% relative to atomic,
while keeping the artifact about 99.7% smaller than fused and the setup work
bounded to the 12 hot entries. Its host selection timing is slower than
atomic because canonical key lookup is still part of this diagnostic path;
that cost must be measured again in release Hermes.

The resulting default is **hybrid compiler output**. The policy is deliberately
bounded: hot-set size must be explicit, the atomic fallback remains available,
and eager expansion of every possible combination is prohibited. The report
does not promote the host microsecond timings into a native performance claim.

## Qualification limits

- Native frames are `not-run`: there is no release Hermes Expo/device harness
  for this fixture in the current checkout.
- Native heap allocations and retained memory are `not-run`; the allocation
  numbers above are a deterministic model for comparing output shapes.
- The evidence does not update the active performance-budget registry or
  qualify a device budget. Android remains the final device-enabled move.
- The next slice, **M5.5**, owns deterministic output, token-only policy,
  invalid scale/property diagnostics, repeated-selection identity, and
  compiler/runtime equivalence coverage. A later device run must repeat this
  fixture against the same implementation and workload before changing the
  runtime default.
