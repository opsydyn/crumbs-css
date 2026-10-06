# M10.5 packed Expo/Hermes consumer measurement design

- **Status:** Proposed; conversational design approval authorises this specification, not implementation or revised budgets.
- **Date:** 2026-10-06
- **Roadmap:** M10.5
- **Source inspected:** `dfeef69`
- **Decision:** [Anchor runtime-budget revisions in Expo consumer evidence](../../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md)
- **Prior evidence:** [Runtime-boundary rejection](../../assessments/2026-10-06-m10-5-runtime-boundary.md) and [startup/graph feasibility](../../assessments/2026-10-06-m10-5-startup-graph-feasibility.md).

## Purpose and boundaries

Measure the cost of a representative packed Crumbs consumer in release-mode Expo/Hermes, against an equivalent plain React Native app. Separate JavaScript import/initial-render cost and shipping artifact size from Node package-host measurements. Produce reviewable evidence before proposing any replacement or additional performance target.

Preserve all public APIs, synchronous descriptor admission, package dependencies, export maps, existing thresholds and baselines. No Effect dependency, runtime restructuring, SDK upgrade, compiler cache or new styling feature belongs to this study. The existing host failures and Expo-version mismatch remain open. A valid measurement receipt is not a performance pass.

The implementation plan must cover this complete consumer matrix as one consolidated M10.5 study and admission decision. It must not report partial cells as completed M10.5 qualification. Spoken-reader acceptance, exhaustive native variants, animated Storybook FullUI and other outstanding host gates retain their separate evidence requirements. All physical-device work remains deferred.

## Selected approach

Use a dedicated measurement harness that stages isolated apps from the existing playground template and installs one production-built package tarball. Keep the interactive playground and its diagnostics unchanged.

Reusing the interactive Measure panel would start after imports and navigation, so it cannot measure entry-to-first-layout startup. Changing package-host limits from current Node results would not establish Expo/Hermes consumer cost. A dedicated startup scene gives explicit controls without changing consumer APIs.

The inspected `scripts/playground.ts` packed workflow runs `build:dev`. This study must instead run the production `bun run build`, then pack its exact output with lifecycle scripts disabled. Reuse staging/identity helpers only where their contracts fit; do not inherit a development build or mutate the generic runner to accommodate a special benchmark.

## Workload and matrix

| Variant | Styling entry | Purpose |
| --- | --- | --- |
| plain | React Native `StyleSheet` only | Matched control with no Crumbs dependency reachable in the mobile bundle |
| core | `@opsydyn/crumbs-css/theme/core` | Common provider, themed-style hook and token-reference consumer |
| compatibility | `@opsydyn/crumbs-css/theme` | The same consumer through the compatibility entry |

Run each variant on **iOS Simulator and Android Emulator**, giving six runtime cells. Each cell retains five independent cold-process launches. Collect paired production JavaScript and Hermes bytecode exports for the same six platform/variant combinations. Web and Node remain covered by their existing protocols; they are not substitutes for these cells.

Use one fixed screen: a themed root, title, descriptive text and ten repeated cards, each containing a label and an action-shaped view. No interaction, navigation, image downloads, fonts, animation, conditional platform branches or asynchronous theme load precedes the measurement. Keep the same native elements, text, dimensions and resolved style values in all variants. Use one immutable theme and one module-scoped style definition; core and compatibility differ only in the public import path. The plain control uses equivalent module-scoped `StyleSheet.create` values. Record the exact fixture source and expected resolved styles.

Use exported runtime token references and common provider/hooks; no authoring compiler runs at app startup. Only the selected entry is reachable. This tests a common themed-screen use case, not every compatibility feature, theme switching, recipe selection, sustained scrolling or all-feature imports. Do not generalise its results to those workloads.

Use the same stock Expo Metro configuration in all variants: this workload consumes packed runtime exports and does not require the Crumbs authoring transformer. Preserve Babel settings needed by the pinned Expo runtime. Run separate production Metro builds so tree-shaking cannot accidentally retain both Crumbs entries. No import-all fixture or synthetic dead-code references.

## Source and artifact identity

Preflight the authoritative checkout, package source digest and any relevant dirty files. Build once, pack once and install the same tarball into both Crumbs fixtures. The control shares the same application dependency versions but has no Crumbs dependency. Resolve the package from each staged app and reject workspace symlinks, repository source resolution, wrong version or a different tarball hash. Record the complete source revision plus source digest; a short Git revision alone is insufficient.

Keep the currently installed Expo/React/React Native version family. Capture exact resolved versions, install lockfiles and Node/Bun/npm versions. Both Crumbs apps must resolve to the identical dependency graph; compare the control graph after excluding the Crumbs package and its exclusively required dependencies. Record differences rather than silently discarding them. Verify a single React runtime in each app.

Use distinct disposable app identifiers under `dev.crumbs.m105` and a dedicated staging root. Record the generated native project, release build configuration, signing context where applicable, native application binary hash, Metro output hashes, Hermes version and bytecode version. The executable must embed the measured bundle and report the corresponding study, variant and artifact identities. An export measured separately from an unrelated running binary is insufficient.

Build a release binary for each platform/variant; Expo Go, development clients, Metro-served bundles and debug builds do not qualify. A release-mode app on a Simulator or Emulator remains software-context evidence.

## Timing protocol

Measure **JavaScript entry execution to the first positive-size layout of the themed root** using one monotonic `performance.now()` clock inside the app. The control uses the corresponding root layout. Set the entry marker before synchronous loading of Expo registration, React Native and the scene. Static imports above the marker are prohibited because they execute first. Bundle prelude execution and native process startup before the entry marker are excluded and must be stated in the report.

Capture exactly one root `onLayout` timestamp after width and height are both positive. Include imports, provider construction, token resolution, initial render and the callback delivery in this interval. Freeze the receipt before transport or extra state changes. Record dimensions, entry timestamp, layout timestamp, elapsed milliseconds, `__DEV__`, Hermes detection and the binary/fixture identities. No instrumentation update or receipt transport runs before the layout timestamp.

Call this metric `js-entry-to-first-root-layout-ms`. It is neither time from OS launch, native frame presentation, visual readiness nor a JS/UI frame budget. Do not subtract an estimated transport delay or native launch time.

A cold-process launch terminates only the selected app, verifies its previous process exited, then launches it anew. It does not clear OS caches, reinstall between retained runs or reset the software device. Allow one explicitly excluded warm-up per cell. Execute five balanced rounds: rotate the three variants in deterministic order per round, separately per platform, and retain the schedule. Every retained sample gets a fresh random run ID. Save all failed attempts and their reasons; retries use new IDs and never erase or overwrite failures. A study with replacements is labelled and reports both attempted and retained counts.

Reject duplicate run IDs, mismatched identities, non-Hermes or development runs, non-finite/negative timings, non-positive dimensions and missing completion. A bounded launch timeout is a failed attempt, not a zero value. A source, binary or environment change starts a new cohort; do not mix it into existing medians.

Summarise five valid samples per cell as minimum, median and maximum. Within each platform report core-minus-plain and compatibility-minus-plain median deltas and ratios, with raw sample tables. These are descriptive results, not confidence intervals or proof of a causal microsecond effect. Do not pool iOS and Android samples or infer physical-device performance.

## Receipt transport and device ownership

Use a Node loopback collector with a per-study unpredictable token and a single-use run allowlist. Post the frozen receipt using the app's native fetch only after the layout marker. Keep collection/logging outside the measured interval. On Android, route the explicitly selected Emulator through an owned `adb reverse` mapping; iOS Simulator can reach the host loopback endpoint. Any local HTTP permission belongs only to generated measurement apps. Production application network settings remain unchanged. Collector validation rejects unexpected variants, devices, tokens, run IDs and oversized/malformed bodies. The original receipt and validation outcome are both retained.

Before native work, select or create dedicated disposable software devices and record their UUID/serial and study ownership. Require an explicit Simulator UUID or Android Emulator serial for every native command. Reject physical devices and ambiguous selectors. **Never operate Simulator `1F706822-9584-4340-B426-EECF36F9D8EA`**: no boot, launch, install, termination, shutdown or erase commands may target it.

Do not issue global `simctl shutdown all`, global device resets, wildcard app termination or unrestricted `adb` mutations. Monitor device identity and boot state between runs; unexpected shutdown, app replacement or ownership drift fails the current attempt and stops native collection until resolved. Cleanup may remove only apps, port mappings, child processes, staging roots and disposable devices recorded as created by this study. Preserve existing apps/devices, unrelated Metro processes and all existing untracked worktree files. Cleanup must be repeatable after cancellation without broadening its scope.

## Metro and Hermes artifact accounting

Export production bundles with the same fixtures and Metro inputs. Record exact CLI commands, platform, minification, source-map settings, worker settings, resolved Expo/Hermes versions and resulting files. The local CLI supports `--no-bytecode`; collect a paired production JavaScript export with that flag and a default Hermes bytecode export. Verify actual artifact headers/metadata rather than treating CLI defaults as proof of bytecode generation. The running release binary must be matched to its embedded Hermes artifact; separately record any native packaging transformation.

For JavaScript, report uncompressed bundle bytes and mapped generated-byte contributions grouped by Crumbs packed runtime, React/React Native/Expo, fixture and other dependencies. Specify source-map accounting rules, count unmapped generated spans separately, and conserve the total generated UTF-8 bytes. This is mapping-based attribution, not an exact ownership claim for every byte or a compressed per-module size. Retain source names, mapping coverage and the totals so attribution can be audited.

For Hermes, report **whole bundle bytecode bytes** and same-platform core/control and compatibility/control deltas. JavaScript source maps do not establish exact per-source Hermes bytecode size. Do not publish per-module bytecode attribution or subtract a common prefix as an ownership calculation. Native app binary size is recorded for identity/context only, not attributed to Crumbs by this study.

Validate platform/variant source provenance: Crumbs cells must contain packed runtime code, never repository source or compiler/Effect/tooling code; plain cells must contain no Crumbs code. Reuse rejection rules from `scripts/runtime-bundle-contract.ts` where applicable, but add a dedicated matrix validator. Its existing all-platform/positive-Crumbs contract cannot validate a plain control or a native-only cohort. Do not weaken that existing validator.

## Proposed implementation responsibilities

| Owner | Responsibility |
| --- | --- |
| `scripts/measure-expo-consumer-runtime.ts` | Study orchestration, pack/stage/install, exports, explicit software-device adapters, collector and evidence manifest |
| `scripts/measure-expo-consumer-runtime.test.ts` | Receipt, cohort, provenance, artifact accounting and cleanup contracts using existing repository test tools |
| Isolated generated fixture apps | Identical startup scenes, one selected public entry, entry/layout markers and post-measurement receipt delivery |
| `docs/evidence/<date>-m10-5-expo-hermes/` | Immutable raw receipts, command logs, identity/hash manifests, mapping reports and comparison report |

Keep pure receipt validation, summary arithmetic, source-map accounting and cohort identity separate from process/device adapters. Use explicit input/output records and discriminated results for validation failures. Do not introduce a new runtime or test dependency solely for this harness. No public measurement API is added to Crumbs.

Evidence must retain the exact fixture and reproduction commands, package and binary identities, dependency locks, device/OS/host details, run schedule, every attempt, artifact inventory/hashes and conclusions. Retain generated bundles/maps/binaries in an identified local artifact archive with hashes and access instructions; do not imply that large files are committed when only their receipts are in Git. If an artifact is unavailable, mark that evidence incomplete rather than claiming reproducibility from a hash alone.

## Verification and admission

Before native sampling, verify equivalent resolved styles/native tree, packed resolution, single React identity and production/Hermes settings. Unit tests exercise invalid/missing/duplicate receipts, wrong cohorts, deterministic summaries, UTF-8 accounting including unmapped spans, prohibited source reachability and explicit cleanup ownership. Adapter tests assert protected UUID rejection and that no physical/global selector can be used. Failure-injection checks cover lost collector delivery, launch timeout, unexpected device shutdown and interruption; failed attempts remain visible.

Successful execution requires all six cells with five valid retained samples, paired JS/Hermes artifacts, provenance and binary identity checks, raw failures retained, reproducible commands and scoped cleanup. A missing platform or release-build prerequisite yields an incomplete study with a concrete blocker; it never yields a simulated native result. Validate evidence before writing the summary or proposing targets.

One final report compares all variants/platforms and explains uncertainty, dependency differences and exclusions. Reconcile it with the existing host-budget report without replacing that report or calling different environments comparable. Run existing package-host/packed isolation checks if the implementation changes shared tooling; do not rerun unrelated physical acceptance or reinterpret prior measurements as current.

No comparator ceiling, baseline or roadmap acceptance checkbox changes under this specification. After reviewing this matrix, a separate explicit policy decision may propose consumer runtime targets and any host-limit treatment. It must identify workloads, platforms, absolute/relative rules, retained evidence and reviewers. Until then **M10.5 remains open**, and physical-device qualification remains deferred.

## Handoff

Next numbered slice: **M10.5 — packed Expo/Hermes consumer matrix implementation plan**, after review of this written specification. The plan must cover the entire study, verification and evidence decision together. Implementation starts only after plan review and selection of execution method.
