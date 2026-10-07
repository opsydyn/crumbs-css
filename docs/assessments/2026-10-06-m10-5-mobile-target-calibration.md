# M10.5 mobile-target calibration assessment

Date: 2026-10-07. Scope: complete the approved M10.5 software-device calibration and evidence handoff.

## Decision

The revision-3 reader admitted exactly three comparable fresh cohorts, B/C/D, with no exclusions. The packet is eligible for a later policy proposal review; targetApproved remains false. **Recommend no numerical mobile performance target from this evidence.** The measured variant deltas do not have a stable direction, Android timing varies materially between runs and cohorts, and there is no product-approved tolerated-regression rationale for this synthetic workload. Do not change the budget registry or enforcement.

M10.5 remains open. The mobile study neither closes nor waives the existing host gate. Recommended next M10.5 slice: requalify the nine retained host failures and the Expo environment mismatch against the current checkout, then decide any host remediation from fresh evidence. Physical-device work remains deferred.

## Scope and evidence boundary

The six cells compare plain React Native StyleSheet.create, packed Crumbs theme/core, and packed compatibility theme on an iPhone 17 Simulator running iOS 26.5 and an arm64 Android 16/API 36 Emulator. Each cohort used the same ten-card screen, locked Expo 56.0.23 / React Native 0.85.3 / React 19.2.3 / Metro 0.84.4 graph, one excluded warm-up and five retained cold launches per cell. The metric is JavaScript entry to the first positive-size root onLayout; native process startup, first paint/frame, allocation, memory and physical-device behaviour are outside the measurement.

B, C and D use the same frozen source digest, packed package, direct Node/npm executable identity, dependency graph, fixture, lock/config, JS, source-map and Hermes identities. The machine-readable [revision-3 protocol](../evidence/2026-10-06-m10-5-mobile-target-calibration/protocol-revision-3.json), [protocol amendment](../evidence/2026-10-06-m10-5-mobile-target-calibration/protocol-revision-3-amendment.json), individual cohort archives and [final calibration report](../evidence/2026-10-06-m10-5-mobile-target-calibration/calibration-report-revision-3.json) preserve exact identities and raw attempts.

## Per-cohort launch results

All times below are milliseconds. Each sample list is in retained round order 0–4; warm-ups are excluded. The full-precision values, run IDs, receipts and per-cohort evidence remain in each archive.

### Cohort B — e34294a8-4a94-4414-981a-58b779ae61a6 / cb07ba81-4299-4ede-a936-91f90a2bf493

Archive: m105-mobile-calibration-20261006-b. Standalone report complete; 30 retained cold launches, six excluded warm-ups, zero failures.

| Cell | Five retained samples, rounds 0–4 (ms) | Min | Median | Max |
| --- | --- | ---: | ---: | ---: |
| ios/plain | 22.701, 22.893, 24.257, 21.941, 23.030 | 21.941 | 22.893 | 24.257 |
| ios/core | 23.577, 22.869, 23.930, 23.036, 22.110 | 22.110 | 23.036 | 23.930 |
| ios/compatibility | 22.554, 22.528, 22.042, 22.470, 22.557 | 22.042 | 22.528 | 22.557 |
| android/plain | 47.749, 16.516, 47.350, 40.461, 55.642 | 16.516 | 47.350 | 55.642 |
| android/core | 40.907, 44.025, 48.981, 48.549, 29.661 | 29.661 | 44.025 | 48.981 |
| android/compatibility | 24.610, 40.057, 55.975, 46.642, 49.164 | 24.610 | 46.642 | 55.975 |

### Cohort C — 0698d48a-a7f8-469f-ba7a-7dc7eb63765d / d160d781-7bfa-4601-b2a3-01dabbb2894a

Archive: m105-mobile-calibration-20261006-c. Standalone report complete; 30 retained cold launches, six excluded warm-ups, zero failures.

| Cell | Five retained samples, rounds 0–4 (ms) | Min | Median | Max |
| --- | --- | ---: | ---: | ---: |
| ios/plain | 22.668, 22.473, 22.828, 22.577, 22.158 | 22.158 | 22.577 | 22.828 |
| ios/core | 22.457, 22.319, 22.585, 22.505, 22.267 | 22.267 | 22.457 | 22.585 |
| ios/compatibility | 22.321, 24.320, 22.507, 24.723, 23.350 | 22.321 | 23.350 | 24.723 |
| android/plain | 51.833, 67.751, 54.109, 63.145, 46.967 | 46.967 | 54.109 | 67.751 |
| android/core | 47.613, 38.736, 43.069, 41.692, 45.044 | 38.736 | 43.069 | 47.613 |
| android/compatibility | 38.503, 61.959, 46.847, 52.033, 38.930 | 38.503 | 46.847 | 61.959 |

### Cohort D — 4620d156-8d34-40f2-87dc-d0926c34bbbc / b8136e10-ff33-4d5c-9c9b-fd2d3c54128c

Archive: m105-mobile-calibration-20261007-d. Standalone report complete; 30 retained cold launches, six excluded warm-ups, zero failures.

| Cell | Five retained samples, rounds 0–4 (ms) | Min | Median | Max |
| --- | --- | ---: | ---: | ---: |
| ios/plain | 21.907, 22.514, 21.781, 21.251, 20.813 | 20.813 | 21.781 | 22.514 |
| ios/core | 20.811, 22.000, 21.773, 22.165, 22.084 | 20.811 | 22.000 | 22.165 |
| ios/compatibility | 21.698, 21.485, 22.824, 21.422, 20.955 | 20.955 | 21.485 | 22.824 |
| android/plain | 62.515, 42.500, 42.514, 46.297, 32.585 | 32.585 | 42.514 | 62.515 |
| android/core | 30.967, 47.276, 61.102, 46.065, 43.439 | 30.967 | 46.065 | 61.102 |
| android/compatibility | 44.343, 49.998, 42.970, 46.084, 49.241 | 42.970 | 46.084 | 49.998 |

## Variation and artifact comparison

The table compares cohort medians only; it does not pool the 15 launches per cell. The range is the min/max of the three cohort medians.

| Cell | Cohort B median | Cohort C median | Cohort D median | Range of cohort medians | Span |
| --- | ---: | ---: | ---: | ---: | ---: |
| ios/plain | 22.893 | 22.577 | 21.781 | 21.781–22.893 | 1.113 |
| ios/core | 23.036 | 22.457 | 22.000 | 22.000–23.036 | 1.036 |
| ios/compatibility | 22.528 | 23.350 | 21.485 | 21.485–23.350 | 1.865 |
| android/plain | 47.350 | 54.109 | 42.514 | 42.514–54.109 | 11.594 |
| android/core | 44.025 | 43.069 | 46.065 | 43.069–46.065 | 2.996 |
| android/compatibility | 46.642 | 46.847 | 46.084 | 46.084–46.847 | 0.762 |

Variant deltas versus the matching plain control change direction across cohorts on Android; iOS deltas stay close to zero but also change sign for core. This does not support a stable, attributable latency penalty for a numerical ceiling.

| Platform | Variant | B delta vs plain | C delta vs plain | D delta vs plain |
| --- | --- | ---: | ---: | ---: |
| ios | core | +0.142 | -0.120 | +0.219 |
| ios | compatibility | -0.366 | +0.773 | -0.296 |
| android | core | -3.324 | -11.040 | +3.550 |
| android | compatibility | -0.708 | -7.262 | +3.570 |

Across all six cells, JavaScript, source-map and Hermes bundle hashes are identical across B/C/D. Native binary hashes differ between cohort builds, while each standalone report validates the installed binary against its own exact bundle and study identity.

| Cell | JS bytes | Mapped Crumbs JS bytes | Hermes bytes | Hermes delta vs plain |
| --- | ---: | ---: | ---: | ---: |
| ios/plain | 1021240 | 0 | 1256868 | 0 |
| ios/core | 1055595 | 33860 | 1306968 | 50100 |
| ios/compatibility | 1114639 | 92687 | 1384256 | 127388 |
| android/plain | 1026223 | 0 | 1260728 | 0 |
| android/core | 1060578 | 33860 | 1311072 | 50344 |
| android/compatibility | 1119622 | 92687 | 1388120 | 127392 |

Mapped Crumbs JavaScript contribution and whole-bundle Hermes deltas are separate measures. Neither is converted into a runtime limit. The Android plain B cohort includes a valid 16.516 ms sample, retained as recorded; it widens that cell’s within-cohort range and is not discarded as an outlier.

## Exclusions and unresolved gates

| Record | Status and reason |
| --- | --- |
| Calibration cohort A, m105-mobile-calibration-20261006-a | Failed-incomplete and retained, excluded from the three-cohort set. android/core reached its 3 GiB build gate with 2.6 GiB free after four release artifacts. It produced zero launch attempts; scoped app cleanup succeeded. A was never retried. See [A audit](../evidence/2026-10-06-m10-5-mobile-target-calibration/cohort-a-incomplete-audit.json). |
| Calibration B/C/D | All complete, each with 30 valid retained launches, six excluded warm-ups and no report failures. The admission report has excluded: []. |
| Historical H reference | Complete but legacy-unverified; contemporaneous direct Node/npm executable receipts are absent or do not match. It is reference-only and does not count toward the three fresh cohorts. |
| Earlier H attempts a–g | All seven remain retained outside this revision’s candidate set. The historical ledger records a–e as pre-collector preparation attempts (generated-JS typecheck, parser API, CRLF identity, Metro peer-resolution and Xcode project API issues); f stopped on host ENOSPC during Android/core before timings; g first stopped on a shut-down owned Simulator, then its iOS warm-up failed at the OS Open-in-app URL confirmation. See the [historical prior-cohort ledger](../evidence/2026-10-06-m10-5-expo-hermes/prior-cohorts.json) and [study report](2026-10-06-m10-5-expo-hermes-runtime.md). |
| Existing host comparison | The retained comparison still reports 11 passes, nine failures and one Expo environment mismatch. It belongs to a recorded candidate revision/working tree, not a fresh current-checkout qualification. Registry readiness remains false; this mobile report does not pass, replace or waive any host metric. |

The current host registry still has pending JS/UI frame, allocation and retained-memory thresholds, three missing baselines, and retained-memory diagnostic-only status. Physical-device, native-startup, frames, allocation and memory acceptance remain open.

## Cache and evidence integrity

After each complete standalone report, the protocol-listed cache paths were removed only after a pre-delete manifest proved zero proof/input references. For B, C and D, the post-prune standalone report remained complete, the stored summary SHA-256 was byte-identical, and retained native/JS/source-map/Hermes artifact hashes were verified. Detailed manifests and results are in cohort-b-cache-pruning-plan.json, cohort-b-cache-pruning.json, cohort-c-cache-pruning-plan.json, cohort-c-cache-pruning.json, cohort-d-cache-pruning-plan.json and cohort-d-cache-pruning.json.

The [revision-3 evidence index](../evidence/2026-10-06-m10-5-mobile-target-calibration/evidence-index-revision-3.json) hashes the protocol versions, failed-A records, all active cohort summaries/proof inventories and the final report. No public styling API, dependency or performance budget changed in this slice.

## Recommended next work

Continue M10.5 with a fresh current-checkout investigation of the nine retained host failures and the Expo environment mismatch. Keep every approved maximum, allowed regression, baseline selector and enforcement rule unchanged while identifying reproducible causes. Revisit mobile numeric targets only after a product owner states a meaningful tolerated regression and a representative workload/environment supports it.
