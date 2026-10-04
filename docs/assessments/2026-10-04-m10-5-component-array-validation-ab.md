# M10.5 component-contract array-validation A/B

- Date: 2026-10-04
- Base revision: `bb97310a374dd4b6ae2b6f74db8d7caf744ff574`
- Status: scratch candidates measured; no production source changed

## Profile context and method

The M10.5 targeted resolver profile attributed 2,502 of 5,663 component-contract samples (44.18%) to `readArray`. The current `packages/css/src/components/contracts.ts` SHA-256 still matches the profiled source, so that attribution applies to this base revision.

The A/B workload calls `validateNativeComponentContract` on an eight-axis, six-values-per-axis contract, with three slots, extension permissions, and one public-state constraint. Each variant was built as unminified, source-mapped ESM targeting Node 22. Thirteen fresh Node v24.15.0 processes per variant performed 12,000 warm-up calls, an explicit GC, then 700 timed calls. Variant start order rotated across the five builds. The host was macOS 26.6.2 arm64.

| Variant | Median per contract | Range | Change from baseline |
| --- | ---: | ---: | ---: |
| Current validator | 20.984 µs | 20.631–21.500 µs | — |
| Merge symbol check into own-key scan | 20.686 µs | 20.213–21.459 µs | −1.42% |
| Read descriptors per index | 16.457 µs | 16.156–17.085 µs | −21.57% |
| Reuse validated key snapshot for descriptors | 18.261 µs | 17.955–20.018 µs | −12.98% |
| Replace bulk descriptor call but retain third key scan | 19.782 µs | 19.480–21.948 µs | −5.73% |

The first and last candidate ranges overlap the baseline. The per-index and descriptor-snapshot ranges do not. The descriptor-snapshot candidate keeps the descriptor lookup for `length`; it reuses the already validated own-key list and replaces `Object.getOwnPropertyDescriptors` with explicit descriptor collection.

## Behavior receipts and proxy boundary

Seven deterministic cases and 300 `fast-check` generated array shapes agreed across all five variants for normalized values, validation outcomes, and diagnostics. The cases cover valid normalization, holes, extra and non-canonical keys, non-enumerable indexes, symbol diagnostic precedence, accessors, and custom array prototypes. Accessor getters remained uncalled.

Proxy receipts expose a compatibility boundary. The current implementation calls the array proxy's `ownKeys` trap three times and reads descriptors for `0` and `length`. The descriptor-snapshot candidate calls `ownKeys` twice and still reads both descriptors. A side-effectful proxy can observe that the third `ownKeys` call no longer occurs; a proxy whose trap changes its response by call number can therefore behave differently. The per-index candidate also omits the `length` descriptor read: a proxy that throws when asked for that descriptor is rejected by the current implementation but accepted by that candidate. That candidate is not eligible for production adoption without an explicit compatibility decision.

The same-trap-enumeration candidate retained all three `ownKeys` calls and the `0`, `length` descriptor reads, but its timing range overlaps baseline. The single-own-key candidate retained bulk descriptor extraction and was neutral within the observed spread.

## Decision and limits

The descriptor-snapshot variant is the strongest performance candidate that retains descriptor reads for array `length`, at a 12.98% lower median with non-overlapping ranges. It still changes the number of proxy `ownKeys` trap calls, so this A/B does not establish a behavior-preserving production change. Keep the validator unchanged until the next M10.5 slice defines and tests the contract for side-effectful and stateful proxy traps. Then repeat the A/B against production source with those adversarial cases covered.

This is a Node v24.15.0 host microbenchmark over Node 22-targeted scratch bundles. It is not React Native, Hermes, Metro, device, render-loop, release-budget, or release-gate evidence. It does not change the M10.5 host-budget limits; the exact Node v22.0.0 host-budget gate remains the final M10.5 step, and Android remains last. Machine-readable timings, source/build hashes, and receipts are in [qualification.json](../evidence/2026-10-04-m10-5-array-validation-ab/qualification.json).
