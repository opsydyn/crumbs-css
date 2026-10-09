# M11.4 — Pure colour and typography token algebra

Status: complete in the implementation commit containing this record; functional host, iOS Simulator and Android emulator qualification passed, whole-slice review completed and its Important finding repaired. This accepts a development artifact, without release-policy or publication qualification.

## Delivered API

The additive optional `@opsydyn/crumbs-css/tokens/algebra` entry exports ten functions for colour construction, explicit encoded/linear sRGB premultiplied interpolation, alpha replacement/attenuation, native colour emission and immutable named typography scales. Descriptors are frozen ordinary versioned data. Admission rejects unsupported fields/accessors/decorated tuples before reading values; native numeric metrics remain unscaled. Existing semantic palettes, scalar/token brands, compiler/expression behaviour and all 28 old value surfaces are preserved.

The new entry has zero runtime externals and is isolated in both directions from old graphs. It costs 8,969 raw/2,645 gzip bytes for ESM and 9,291 raw/2,723 gzip for CommonJS. No product dependency, version, peer range, lock or numerical policy changed.

## Qualification

Final source types, Storybook/playground types and 1,768 CSS/29 Storybook tests pass (one existing optional exact-floor skip). Independent reference vectors and seed20261009 property checks cover premultiplied colour laws, bounded descriptor admission, float32 representability, native units, signed spacing and direct-from-base finite scales. Installed declarations pass Bundler and Node16 checks.

The exact retained tarball `9143d7bc7db3033e234dc4021174f54a620e7527d709d83ee949154b41c8f19c` passes frozen physical installation, exact inventories, true ESM-first/CJS-first traces, four genuine Node22.0.0/24.15.0 format probes consuming two physical copies without runtime peers, integration controls and iOS/Android/web Expo exports. Packed peers are React/RTR19.2.3, React Native0.85.3, Expo56.0.4, Metro0.87.1 and TypeScript6.0.3.

Fresh Expo Go/Hermes native qualification passes 12 finite phases on each platform, including rendered independent colour/alpha controls, named steps/ratios, unrelated-state independence and actual native font preference changes/restoration. iOS uses its owned iPhone17/iOS26.5 Simulator; Android uses its owned Android36 ARM64 emulator. Both generated/control Text samples agree within one native layout unit, and pixel controls within2/255. Base16/24/-.25 remains unchanged. Real preferences/scale and native geometry are observed, rather than injected.

Two Text samples remount when the real native scale changes because this Expo/RN cohort retained previous mounted measurements. Font comparisons start from the initial blue/sRGB/ratio1.25 scenario so Android activity recreation cannot substitute a design-ratio change for font scaling. This does not qualify universal live Text invalidation or design-state persistence across activity recreation.

The worktree docs build repeats the known Astro metadata failure with external dependency symlinks. A byte-identical audited source/config builds all32 pages in the owned frozen installation; the authored inputs remain unchanged afterwards.

## Cost evidence

These consumed host workloads introduce no numeric thresholds or native FPS claim. Fresh process timings are diagnostics, without attributing differences to causal improvements.

| Workload | Count per process | Run1 ms | Run2 ms |
| --- | ---: | ---: | ---: |
| colour-construct-mix-replace-attenuate-emit | 10,000 | 37.781 | 39.570 |
| typography-construct-scale-emit | 10,000 | 13.824 | 14.602 |
| typography-scale-3 | 1,000 | 2.303 | 2.227 |
| typography-scale-32 | 1,000 | 7.673 | 7.729 |

## M10.5 remains separate

The unchanged collector uses the matching Expo56.0.4/Metro0.84.4/React19.2.5 baseline through an owned temporary read-only dependency overlay. Its selected dependency bytes, original app link, source/artifact and policy are verified and restored. All21 rows retain current environment and measurement identities. Blocking pass IDs: cold-transform-ms, incremental-rebuild, editor-tsc-wall-10000, editor-tsgo-wall-10000, editor-tsc-memory-10000, editor-tsgo-memory-10000, editor-tsc-instantiations-10000, editor-tsgo-instantiations-10000, editor-first-completion-10000, editor-warm-completion-10000. Blocking failures: warm-transform-ms=9.110458ms. Incomplete blocking rows: 0. Release policy qualified: `false`. Existing warm-transform and historical incremental dispositions remain under M10.5; no numerical waiver or release claim is inferred.

## Review and closure

One fresh whole-slice review verified37 focused tests/7,054 assertions and the proposed source/evidence bindings. Its Important finding exposed union members hiding extra properties or broad step maps. Nine source and installed negative cases reproduced the gap before the repair; all-valid union controls and the full suite pass afterwards. Aggregated union keys and invalid-string members now reject the whole invalid union, with inference preserved by applying NoInfer around the completed guards. No second review was dispatched.

The repaired artifact was freshly installed/exported and qualified on both native platforms. Runtime ESM/CJS bytes are unchanged, so the two existing cost samples still bind exactly. Final source digest: `da0a45b86e8903022560ea139dd8fb0aa045865fc3db55f82b29773103a33095`. Collector source digest: `68a3bb139bef960645e06ae02f4a07de9be4a3e7904407bdaa1d2aeb686e7b39`. All 1,688 consumed-byte checks pass after restoring five original dependency roots and two owned workspace links. A final rerun after dependency restoration cannot execute the old compiler/tooling imports from the incomplete original primary-linked installation (missing Effect/vanilla-extract modules). Its raw failure is retained; the final full-suite gate uses the already-qualified frozen installation and restores every original link afterwards. This does not repair or qualify that original local installation. An independent cleanup check confirms the owned devices/processes/socket and Metro ports are clear; recorded native cleanup verifies both original preferences and the reverse mapping.

One Minor remains deferred: bounded safe field/step paths in TokenAlgebraError diagnostics. The chronological rulings and their costs are preserved in `execution/progress.md`; the review report and its original proposed manifest/diff are retained separately from the refreshed accepted cohort.

## Evidence and limits

See [evidence index](../evidence/2026-10-09-m11-4-token-algebra/README.md). Superseded source cohorts and failed native attempts remain distinct; a passed platform prefix in a failed receipt establishes no acceptance. Exact consumed exports, generated inputs, served bundle/maps, images, raw commands, seeded checks and execution records are retained with hashes.

Physical devices, spoken readers, interactive browser behaviour, live authored HMR, release Hermes/FPS, arbitrary Proxy safety and unrecorded peers/platforms remain unqualified. M11.5 — constrained serialization and extension protocol — is the next feature slice; its implementation and publication await separate authority.
