# M10.5 extension descriptor normalization fast path

- Date: 2026-10-03
- Roadmap: M10.5
- Baseline revision: `7a91789e7ea9f46559605a510b4ce417bc225b8f`
- Implementation base: `713ff15`
- Status: retained; the measured duplicate class-reference probe is removed without changing the public contract

## Change

`normalizeDescriptorStyle` previously called `isNativeClassReference` before
handing the same value to `cloneAndFreezeDescriptorStyle`, which checks for
class references itself. It now delegates directly to the recursive clone.
The clone still validates, normalizes, marks, and freezes class references at
the root and at nested positions. No public API, descriptor version, export,
budget, or entry graph changed.

The regression test first failed against the baseline: a plain proxied style
record triggered three own-key scans, above the new limit of two. After the
change it passes. Additional boundary tests verify tagged and untagged class
references are normalized, frozen, and marked; accessors are rejected without
running getters; symbol keys, custom prototypes, and cycles remain rejected.

## Performance evidence

The follow-up A/B compiled the original source and the actual implementation
source into equivalent, unminified Node 22-targeted ESM scratch bundles. The
workload uses eight variant axes with six values each, eight compound variants,
and one slot override. Thirteen fresh processes per variant alternated run
order; each made 1,000 warm-up and 700 measured validations, with garbage
collection before timing. The host was macOS arm64, Bun 1.4.2, Node v24.15.0.

| Variant | Median per descriptor | Observed range |
| --- | ---: | ---: |
| Baseline | 512.156 µs | 493.702–526.672 µs |
| Implementation | 286.358 µs | 281.049–304.952 µs |

The implementation median was 44.09% lower and the observed ranges did not
overlap. Source hashes, per-process samples, and the behavior receipt are
recorded in [machine-readable evidence](../evidence/2026-10-03-m10-5-extension-normalization-fast-path/qualification.json).

This is a descriptor-validation microbenchmark on a Node host. It is not a
React Native, Hermes, Metro, device, render-loop, or release-performance
measurement, and does not qualify or alter any M10.5 performance threshold.

## Verification

- Focused extension descriptor, extension-chain, and resolution-plan tests: 22 passed (2,003 assertions).
- Full CSS package suite: 1,352 passed; one generated ordered-graph test in `native-composition.test.ts` exceeded its 5-second suite timeout. That file passed all six tests when run alone.
- CSS package typecheck and build: passed.
- Documentation build: 28 pages.
- `git diff --check`: passed.

M10.5 remains open. The component-contract `readArray` path is still a separate
measured hotspot; isolate its internal cost before selecting another code
candidate. The exact Node v22.0.0 host-budget gate remains a final M10.5 step,
and Android remains last.
