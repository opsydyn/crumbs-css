# M10.5 source-profile runtime diagnosis

- Date: 2026-10-02
- Roadmap: M10.5
- Source revision measured: `78d9fd0971305d36014022b2eff06387978d1d54`
- Status: diagnostic assessment; no production runtime, budget, threshold, baseline, or workload changes.

## Evidence boundary

This run profiles fresh Node processes while they load the default unminified `theme-core` and compatibility `theme` ESM/CJS entries. The exact Node floor was v22.0.0; the current executable was Node v24.15.0. Each of the eight matrix cells used one excluded warmup and fifteen retained profiles. All 128 behavior receipts passed. Source maps were emitted to scratch storage, and source attribution was enabled only when the default and diagnostic JavaScript matched after normalizing the emitted source-map annotation. All 28 compared artifacts matched. The raw profiles and scratch builds remain under `/private/tmp/crumbs-m10-5-profile-2026-10-02T22-02-32.410Z-wGOlbC/`.

The CPU profile samples are diagnostic only. They do not measure an approved wall-time threshold, identify parse/link time by subtraction, or establish Hermes, Metro, render, device, accessibility, visual, or release performance. The unchanged, uninstrumented host-budget suite is retained separately in the [host comparison report](../evidence/2026-10-02-m10-5-source-profile/host-budgets/comparison.json) and its sibling reports. The machine-readable profile, artifact, sample, hash, and host comparison summary is [profile-summary.json](../evidence/2026-10-02-m10-5-source-profile/profile-summary.json).

## Profile findings

The matrix covered `theme-core` and `theme`, in ESM and CJS, on Node v22.0.0 and v24.15.0. It recorded 206 CPU samples across the 120 retained profiles. Only one sample mapped to a Crumbs source location: `packages/css/src/components/contracts.ts:351`, `sharedRegistry`, in the Node v24.15.0 compatibility ESM cell. The other seven cells produced no mapped Crumbs samples. A single sample is not repeated source evidence, so no optimization candidate or scratch A/B was established.

The profile summary retains every frame and separates Node loader, unmapped, missing-map, and generated-output attribution. Inspector/control and other unattributed frames remain visible; no profiler overhead or parse/link duration is subtracted and relabelled as Crumbs work. The source hashes, default and diagnostic artifact hashes, parity results, all 128 raw-profile hashes, runtime identities, sample protocol, and behavior receipts are recorded in `profile-summary.json`.

## Uninstrumented host-budget result

The exact-floor host suite completed on the same source revision and retained all thirteen JSON reports. `comparison.json` records one pass, ten failures against approved limits, and ten incomplete comparisons. The only pass was `cold-transform-ms`. The ten failures were:

| Metric | Baseline | Current median | Change |
| --- | ---: | ---: | ---: |
| Node 22 ESM initialization | 6.294 ms | 7.939 ms | +26.1% |
| Node 22 CJS initialization | 3.402 ms | 4.885 ms | +43.6% |
| Current Node ESM initialization | 2.556 ms | 4.342 ms | +69.9% |
| Current Node CJS initialization | 2.037 ms | 3.386 ms | +66.3% |
| `theme/core` ESM graph | 17,271 B | 64,700 B | +274.6% |
| `theme/core` CJS graph | 17,641 B | 65,559 B | +271.6% |
| `tokens` ESM graph | 56,013 B | 60,968 B | +8.8% |
| `tokens` CJS graph | 63,308 B | 68,590 B | +8.3% |
| Compatibility `theme` ESM graph | 44,017 B | 164,366 B | +273.4% |
| Compatibility `theme` CJS graph | 44,764 B | 171,993 B | +284.2% |

The ten incomplete comparisons comprise one warm-transform protocol-order mismatch, one incremental Metro environment/workload-identity mismatch, and eight editor comparisons whose revision, package version, feature coverage, and scale-source identities do not match the retained baseline. These measurements remain incomplete rather than passes or failures against the approved thresholds. The direct recipe-selection and warm-transform smoke ceilings were within their recorded limits in all five benchmark runs; they do not override the incomplete warm-transform comparison above.

The threshold review retains 21 approved metric decisions, but registry readiness remains false: four device-facing thresholds are pending, three lack active baselines, and retained-memory remains diagnostic-only. No thresholds, baselines, or registry memberships changed. The host run reports `performanceQualified: false` and confirms the existing M10.5 runtime graph and initialization work remains open.

## Recommendation

The next M10.5 slice should be a bounded, non-breaking source-level graph and initialization optimization A/B for `theme/core` and compatibility `theme`. Choose a candidate from repeated source/graph evidence, preserve public exports and compatibility-to-focused function identity, and compare against the unchanged approved host gates. This profile's singleton sample is not a candidate. Keep incomplete Metro/editor comparisons and visual, screen-reader, physical-device, release-device, and Android-specific gates separate; M10.5 remains open.
