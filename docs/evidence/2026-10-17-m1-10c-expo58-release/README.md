# M1.10c — SDK 58 release preparation

This packet records local compatibility, copied-skill and performance checks on the merged SDK 58 implementation, based on source `e33325035a343c448d97f83db2b9e68f55803ba8`. It is not proof of npm publication. The release-please [1.2.0 PR #9](https://github.com/opsydyn/crumbs-css/pull/9) remains the version mechanism.

## Compatibility and skill

The three `sdk-*-qualification.json` receipts pass strict npm resolution, exact installed package bytes, consumer types, ESM/CommonJS motion orders, peer-free motion probes, all-platform exports and runtime isolation. All use the same unpublished development artifact: SHA-256 `3f20bf89efbebc248a3924823b9478f7c771836ed6f2e58f42b5558f0e698bdf`, labelled 1.1.1 while development continues. It is neither the registry's 1.1.1 nor the eventual 1.2.0. Source receipts truthfully record a dirty working tree. Final documentation polish changes only packaged README/COMPATIBILITY bytes; [the inventory comparison](artifact/doc-finalization-diff.json) confirms executable/declaration bytes remain identical. Final clean-tag qualification must rerun against the actual 1.2.0 tarball.

The [copied skill](skill/copied-skill/SKILL.md) links its SDK/worker guidance without repository-relative dependencies. A fresh reference-only baseline agent could not retrieve SDK 58/Node/Rust setup from the old reference. A fresh forward application supplied the concrete configs, correct Node boundary cases, retained SDK 57 support and honest worker/publication boundaries. This is a bounded retrieval exercise, not an effectiveness benchmark.

The unchanged four-file ActionCard example passes SDK 58 strict consumer types, three expected negative type cases, actual installed compilation and public runtime resolution: primary/secondary variants, 8/16 padding, independent accent assignment and clearing to the theme fallback. The [receipt](skill/qualification.json) pins example hashes and all three runtime maps; compiler and Effect imports are absent. The archived harness uses this host's original paths. No new native skill interaction is claimed; native app acceptance remains in [M1.10b](../2026-10-16-m1-10b-expo58-apps/README.md).

## Matched host observations

[The final compiled-output-verified observation](performance/sdk-worker-performance-04/qualification.json) uses five independent processes per cohort, rotating SDK 57 Babel / SDK 58 Babel / SDK 58 Rust order. Every process has a fresh explicit Metro FileStore and file-map directory, the same Crumbs artifact/compiler dependency versions and the same minimal app. Cold time includes CLI startup and the first iOS production bundle. Repeated request and transitive token-edit times include HTTP/poll overhead; they are not internal compiler-cache statistics or device/FPS measurements.

| Median, milliseconds | SDK 57 Babel | SDK 58 Babel | SDK 58 Rust |
| --- | ---: | ---: | ---: |
| Startup + cold bundle | 4648.28 | 4528.48 | 2344.83 |
| Repeated bundle request | 70.01 | 61.76 | 100.90 |
| Dependency edit to changed compiled value | 99.35 | 92.58 | 135.74 |

Separate untimed instrumented servers prove actual backend execution: SDK 58 Rust records 679 distinct completions and 71 explicit fallback files, including the eligible app and React JSX dependency. Both Babel controls record zero Rust completions. Raw events, module counts, hashes and owned-process shutdown receipts are retained. Rust improves cold time in this small workload but increases repeated-request/edit time; no general speedup or resolution of the consumer's unresolved 2.5× report follows.

The first attempt failed before startup because Expo rejects simultaneous offline/localhost flags. Run 02 functionally passed, but SDK 57 ignored the SDK 58-only cache environment setting; its [validity review](performance/sdk-worker-performance-02/validity-review.json) excludes the cold comparison. Both attempts remain. Run 03 corrects isolation. Run 04 additionally requires all four compiled native padding edges, rejects stale styles/raw-token controls, and supplies the final qualified edit-timing observation. No numerical pass is selected and no budget changes.

## Release gate implementation

The normal publish workflow now qualifies the exact packed tarball on SDK 56, 57 and 58, seals the three receipt hashes with source/tarball identity, and rechecks the matrix before npm publish. Missing cohorts, dirty/different source, different tarballs/inventories, missing checks/platforms and altered sealed receipt bytes fail closed. Six regression tests pass after an observed five-assertion RED baseline. The existing host manifest, approved environment, numerical limits and historical exceptions are unchanged.

The SDK 56 runner initially exposed two harness mistakes: removing the `v` expected by the shared Node parser and treating retained dependency ranges as exact strings. Both failures are retained; corrections preserve genuine Node checks, strict npm peers and the existing exact Expo/RN pins. Skill harness failures used a nonexistent compiler export and asserted shorthand fields after native expansion; the real exported endpoint and expanded edges pass without changing library or example code.

Publication status and remaining host/CI prerequisites are recorded in [the release review](release-review.md).

The independent final review found one Important issue: SDK 56 inherited npm peer-bypass settings. A real offline conflicting-peer fixture reproduced it (RED), then explicit no-legacy/no-force CLI options and strict environment defaults fixed it (GREEN); incompatible resolution and ci are rejected, while a compatible cohort still installs. A Minor future-hardening suggestion—automatic receipt/lock revalidation inside the measurement helper—is deferred. [Manual post-measurement validation](performance/consumer-after-measurement.json) verifies both current installs and locks; a future reused install must be reverified before relying on an old receipt.

## Full host report

The unchanged full contract completed with stable source/artifact/policy identities: **10 blocking pass, 1 fail, 0 incomplete; 2 advisory pass, 8 fail**. Warm transforms record **9.869417 ms**, above the **6.514 ms** absolute and +15% limits. Cold transforms and incremental rebuild pass; no failed metric is relabelled or waived. [All rows and raw observations](host-report/comparison.json) and [policy rejection](checks/host-policy-check.log.gz) remain. This local source-bound report is not the final clean-tag hosted acceptance.

The first host attempt stopped at a missing source-map dependency, before comparison. [Its partial report](host-setup-failed/input-identity.json) is not numerical acceptance. A focused regression reproduced the missing new compiler edge; the scaffold repair preserves all approved baseline consumer versions and adds only newly declared compiler dependencies from the frozen current install. [Recorded additions](host-report/scaffold.json): parser7.29.3 and codec1.5.5, with manifest hashes. The corrected complete run does not alter any numerical threshold or historical baseline.

Final sequential `bun run check`: build/types, **1,907 library tests and 33 Storybook tests pass**, one optional explicit Node22 test skipped. The full genuine Node22 audit runs in the host report. Final docs build passes 34 pages. The scaffold regression is included in this complete post-repair run.
