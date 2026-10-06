# M10.5 packed Expo/Hermes consumer study

The consolidated software-device measurement matrix is structurally complete: six production release apps/bundle matches, six JavaScript/Hermes export pairs, 30 valid retained cold-process launches and six excluded warm-ups. This is consumer evidence for a later budget policy decision, not a performance pass or closure of M10.5.

The fixed ten-card themed screen compares plain React Native StyleSheet.create, packed theme/core and packed compatibility theme. Themed variants exercise the same ThemeProvider/useThemedStyles token workload; actual resolved tree equivalence was checked with the real core hooks separately from native evidence. The recorded interval starts before Expo/scene imports and ends at the first positive-size root onLayout callback. Native process startup, bundle prelude, paint/frame presentation, allocation, retained memory and receipt transport are excluded.

See [the complete evidence and reproduction instructions](../evidence/2026-10-06-m10-5-expo-hermes/README.md), [raw native attempts](../evidence/2026-10-06-m10-5-expo-hermes/attempts.jsonl), [summary](../evidence/2026-10-06-m10-5-expo-hermes/summary.json) and [bundle attribution](../evidence/2026-10-06-m10-5-expo-hermes/bundle-attribution.json). Software/toolchain/device fingerprints matched before and after collection. Shared resolved dependency graphs were equal, with only the documented packed-Crumbs closure added; staged source/config/lock/package hashes and per-run command/receipt proof are validated again by report.

## Cold-process layout interval

| Platform | Variant | Attempts | Valid | Excluded warm-ups | Min ms | Median ms | Max ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ios | plain | 5 | 5 | 1 | 22.367 | 22.684 | 22.857 |
| ios | core | 5 | 5 | 1 | 22.456 | 22.795 | 22.885 |
| ios | compatibility | 5 | 5 | 1 | 22.476 | 23.112 | 23.537 |
| android | plain | 5 | 5 | 1 | 43.835 | 54.442 | 65.168 |
| android | core | 5 | 5 | 1 | 27.090 | 49.425 | 53.579 |
| android | compatibility | 5 | 5 | 1 | 39.046 | 47.866 | 52.420 |

| Platform | Variant vs plain | Median delta ms | Median ratio |
| --- | --- | ---: | ---: |
| ios | core | +0.111 | 1.005 |
| ios | compatibility | +0.428 | 1.019 |
| android | core | -5.017 | 0.908 |
| android | compatibility | -6.576 | 0.879 |

Five samples per cell are descriptive and too small for confidence intervals, tail guarantees or a general causal speed claim. Platforms are compared only against their own plain control and are not pooled. Host load and software-device execution limit generalization; all physical-device work remains deferred.

## Artifact contribution

| Cell | JS bytes | Mapped Crumbs JS bytes | Unmapped JS bytes | Hermes bytes | Hermes delta vs plain |
| --- | ---: | ---: | ---: | ---: | ---: |
| ios/plain | 1021224 | 0 | 82654 | 1256940 | 0 |
| ios/core | 1055579 | 33860 | 82696 | 1307012 | 50072 |
| ios/compatibility | 1114623 | 92687 | 82904 | 1384328 | 127388 |
| android/plain | 1026207 | 0 | 83084 | 1260796 | 0 |
| android/core | 1060562 | 33860 | 83126 | 1311124 | 50328 |
| android/compatibility | 1119606 | 92687 | 83334 | 1388196 | 127400 |

Source-map attribution conserves exact UTF-8 bytes with unmapped prefixes/segments/separators explicit; it does not assign causal execution cost. Hermes deltas cover whole platform bundles only. The exact native binaries embed byte-identical measured Hermes artifacts, and installed iOS whole-app/Android APK hashes were checked before and after each attempt. The controlled native embedding is explicit; ordinary consumer build-pipeline parity and distribution signing are outside this study.

## Environment, recovery and boundaries

Recorded toolchain: Bun 1.4.2 (`process.version` v26.3.0 is its Node compatibility field), Expo 56.0.23, React Native 0.85.3, React 19.2.3, Metro 0.84.4, Xcode 26.5/17F42 and Java 17.0.20.1. The owned iPhone 17 Simulator uses iOS 26.5; the owned arm64 Android API 36 Emulator uses the recorded 2048 MiB/two-core/swiftshader/no-snapshot configuration. Generated native settings and signing inputs are retained. Prebuild warnings recommending newer Expo/RN versions are retained rather than waived; the actual matched locked versions above were used throughout.

Earlier preparation failures exposed generated-JS typecheck, parser API, CRLF identity and real Metro peer-resolution gaps; observed failing regressions and fixes are retained. Cohort f stopped on host ENOSPC before any timing; its failed writes and recovery cleanup remain explicit. Fresh cohort h includes disk admission guards and separately verified iOS URL-consent setup. The previous preflight-only shutdown failure was retained before booting only the owned Simulator and retrying unchanged inputs. The previous first warm-up failed at iOS URL consent, then separate diagnostic transport checks passed after accepting only the owned scheme confirmations. Those diagnostic timings are excluded from the fresh cohort. Final apps and reverse mapping were cleaned without affecting unrelated apps/devices or the protected Simulator. Local build artifacts are linked and hash-inventoried, not claimed to be committed; preserve the archive before worktree removal.

Focused harness tests, harness TypeScript, full package (1496 passed; one explicit Node-22-only check skipped) and Storybook (23 passed) tests, budget-registry validation and whitespace checks passed. These checks do not establish physical acceptance, native startup/visual readiness, frame budgets, allocations or retained memory. The existing unchanged 21-metric host comparison remains 11 passes, nine failures and one Expo environment mismatch; no new host qualification is claimed.

**M10.5 remains open.** Recommend **M10.5 — consumer-evidence review and explicit performance-target policy decision**. Review this matrix before selecting mobile targets or changing any host ceilings; keep the policy ADR proposed and preserve public APIs, package dependencies and every current threshold/baseline in this slice.

Toolchain evidence boundary: contemporaneous iOS `.xcode.env.local` files and build logs identify the Node 24.15.0 executable. The supplemental post-run receipt records actual Node/npm executable paths and versions (Node 24.15.0, npm 11.12.1); npm was not version-recorded during collection. Immutable H fingerprints retain the original Bun compatibility field. See `supplemental-toolchain.json` and the retained native-config files.
