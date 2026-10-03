# M10.5 targeted resolver CPU attribution

- Date: 2026-10-03
- Roadmap: M10.5
- Base revision: `7a91789e7ea9f46559605a510b4ce417bc225b8f`
- Status: measured extension-validation candidate selected for a separate implementation slice; no production code changed

## Workloads and method

The component-contract workload validates an eight-axis, six-value-per-axis
surface with three slots, extension points, and a state constraint. The
extension workload normalizes a descriptor with eight axes and six values per
axis, eight compounds, and one slot override. Both use fresh Node processes,
12,000 warm-up calls, a 1,200 ms V8 Inspector CPU profile, and a 1,000 µs
sampling interval; each workload has seven profiles. The ESM scratch bundles
were built from this revision with Node 22 output target and source maps, then
attributed back to the same source revision.

The host was macOS arm64 with Bun 1.4.2 and Node v24.15.0. This is internal
validator CPU attribution on a Node host; it is not a React Native, Hermes,
Metro, device, render-loop, or release-performance measurement.

## Findings

`readArray` in `contracts.ts` accounted for 2,502 of 5,663 sampled component-
contract frames (44.18%). The component workload accumulated 8.479 seconds of
sampled CPU time across its seven profiles. This identifies the array
validation path for later investigation; it does not isolate which operation
inside that function is responsible for the whole cost.

`normalizeClassReference` in `extension-contract.ts` accounted for 5,285 of
5,896 sampled extension-descriptor frames (89.64%; 89.24% of sampled time).
Ordinary nested style records are tested as possible class references before
cloning, then tested again by `cloneAndFreezeDescriptorStyle`. The class
reference predicate invokes the complete validator and catches its failure,
so ordinary style records repeatedly pay for prototype, key, and descriptor
checks that cannot succeed.

## Candidate A/B

A scratch candidate removed only the top-level class-reference probe from
`normalizeDescriptorStyle`. The recursive clone still detects and normalizes
class references at the root and at nested positions. The paired benchmark
used the representative extension descriptor above, alternating variant
order over 13 fresh processes per variant. Each process made 1,000 warm-up and
700 measured calls; garbage collection ran before the timed section. Both
scratch builds used the same Node 22-targeted, unminified ESM configuration.

| Variant | Median per descriptor | Observed range |
| --- | ---: | ---: |
| Current source | 549.233 µs | 534.083–557.934 µs |
| Skip duplicate top-level probe | 308.123 µs | 301.343–315.140 µs |

The candidate median was 43.90% lower, and the sampled ranges did not overlap.
The behavior receipt matched for a plain frozen style, an untagged class
reference that receives the internal marker, and an accessor rejection whose
getter remained uncalled. This is a focused receipt, not a complete regression
qualification of the candidate.

The machine-readable profile and A/B summary is in
[evidence/2026-10-03-m10-5-targeted-resolver-profile/qualification.json](../evidence/2026-10-03-m10-5-targeted-resolver-profile/qualification.json).
Raw CPU profiles were temporary scratch files and are not committed.

## Decision and limits

Select the redundant top-level class-reference probe for the next M10.5
implementation slice. Before retaining a production change, add or extend
regression coverage for plain nested data, tagged and untagged class references,
accessors, symbols, prototypes, cycles, and adversarial proxy behavior; then
repeat the paired benchmark against the production implementation and run the
extension contract tests, package typecheck, and package build. The separate
`readArray` hotspot remains a measured investigation candidate.

No runtime budget, threshold, entry graph, or API contract changed in this
slice. The measurements do not qualify React Native, Hermes, Metro, device
performance, or the M10.5 release/device gates. Android remains last.
