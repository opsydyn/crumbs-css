# M10.5 matched Expo/Metro incremental rebuild requalification

- Date: 2026-10-07
- Roadmap: M10.5
- Status: incremental-rebuild gate passed
- Scope: requalify the existing Metro metric against its approved environment and unchanged limits

## Decision

The current compiler's Metro incremental-rebuild result passes after matching the approved Expo 56.0.4 / Metro 0.84.4 / React Native 0.85.3 environment. The five-sample median is **129.318750 ms**, a **4.33%** increase over the approved 123.950500 ms baseline. It is below both the 137.506 ms absolute maximum and the 10% regression cap. This closes the previously incomplete Metro comparison; it does not close M10.5.

## Measurement

| Sample | Edit-to-receipt |
| --- | ---: |
| 1 | 130.638667 ms |
| 2 | 129.318750 ms |
| 3 | 130.956792 ms |
| 4 | 128.507917 ms |
| 5 | 129.223083 ms |
| **Median** | **129.318750 ms** |

The approved baseline cohort has median 123.950500 ms. The relative cap is 136.345550 ms and the approved absolute maximum is 137.506 ms; the candidate passes both. The request path, cache state, edit type, repetition count and host identity match the baseline report. All three dependency controls proved their new baked values and absence of prior values. The persistent-cache `strictDiagnostics` configuration control passed, and all edited fixtures were restored byte-for-byte.

The host was macOS 25.6.0 on arm64 / Apple M4 Pro. Expo, Metro, React Native, Expo Metro Runtime, React, React DOM and the Expo Babel preset resolved to the approved locked versions recorded in the evidence packet. The [raw report](../evidence/2026-10-07-m10-5-matched-metro-requalification/metro-incremental.json) and [machine-readable qualification](../evidence/2026-10-07-m10-5-matched-metro-requalification/qualification.json) retain the samples, receipts and identities.

## Provenance

The measurement ran from a disposable checkout using the approved baseline lock scaffold and current compiler runtime artifacts. The raw runner reports scaffold revision `43c5ece39360cf321fdb074d82cee41d5daaba23` with a dirty source tree because current artifacts, Metro configuration and fixture files were overlaid. That revision is not the compiler source identity. The qualification record pins current compiler revision `fa9d347101b0b2757a7b4db90462df90adb8b6dc`, current tracked-source digest `db9a02ecd57c1c0c11f96ea19640fb975f447ae03bf52117ef2dcc3c349f9894`, benchmark and source hashes, and the Metro plugin artifact hash. Runtime `.mjs` and `.cjs` artifacts match the current build; differing `.d.mts` declaration chunks are not loaded by Metro.

The baseline playground manifest did not expose the Vanilla Extract adapter to the filtered disposable app install. The temporary app therefore mirrored the current manifest's direct `@vanilla-extract/css` range, resolving to the already-locked 1.20.1 package. Expo, Metro, React and React Native versions were unchanged. No repository package dependency or runtime code changed in this slice.

## Remaining qualification

The other nine host gates still fail: four runtime-initialization measurements, warm transform, and four theme graph-size measurements. This work adds no release Hermes, native-rendering or physical-device evidence. Physical-device work remains deferred, and all host budgets and baselines remain unchanged.

The next bounded M10.5 slice should reattribute the current warm-transform workload inside Vanilla Extract integration compilation and generated-module evaluation. Earlier phase profiles explain prior 8.0–8.3 ms observations, not the current 9.754 ms result against the 6.514 ms ceiling. Split integration build and development-identifier costs on the current exact fixtures before testing a single parity-preserving candidate; stop without a production change if it alters generated module bodies or does not meet the unchanged gate.
