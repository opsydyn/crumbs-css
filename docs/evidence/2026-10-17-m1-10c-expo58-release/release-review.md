# M1.10c release review — blocked for publication

**Final-tag update:** see the [exact v1.2.0 decision and report](final-release/README.md). PRs #10/#9 are merged, the GitHub release exists, and the approved one-job Mac qualification has completed with three numerical blockers. The preliminary snapshot below remains historical evidence.

**Decision at the preliminary snapshot: publication remains blocked.** This is not a new exception request, final release acceptance or instruction to publish development bytes.

- Merged functional source: `e33325035a343c448d97f83db2b9e68f55803ba8`, incorporating reviewed PR #8 / `441bd2e`.
- Hosted frozen/three-SDK/app-worker CI: [39013112767](https://github.com/opsydyn/crumbs-css/actions/runs/39013112767), successful on `441bd2e`. Final preparation and generated release source need their own CI.
- Compatibility/skill/benchmark development tarball: SHA-256 `3f20bf89efbebc248a3924823b9478f7c771836ed6f2e58f42b5558f0e698bdf`; development version 1.1.1, not the registry package or final release candidate. Same artifact passes SDK 56/57/58; final documentation polish changes two documentation files only. Receipts and exact scope are indexed in [README](README.md).
- Current normal verification: build/types pass; 1,907 library tests and 33 Storybook tests pass, one optional explicit Node-floor probe skipped. Docs build passes 34 pages. Genuine Node 22.0.0 remains required by the unchanged full host audit.
- Native acceptance: both apps under Babel and Rust on owned iOS 26.5 / Android 16 targets, in [M1.10b](../2026-10-16-m1-10b-expo58-apps/README.md). No source/runtime change in this preparation slice. Physical, spoken-reader, release-FPS and iOS 27/DeviceHub acceptance remain deferred.

## Remaining prerequisites

1. The unchanged full host report is complete and blocked: 10 blocking passes, 1 blocking failure (warm transform 9.869417 ms against the 6.514 ms absolute / +15% limits), 0 incomplete; 2 advisory passes and 8 advisory failures. Prior v1/v1.1 numerical dispositions do not apply to 1.2.0. Remediation or a new final-artifact-specific disposition is required before publication.
2. Integrate reviewed M1.10c changes with clean hosted CI. Release-please [PR #9](https://github.com/opsydyn/crumbs-css/pull/9) remains the normal 1.2.0 version/tag mechanism.
3. Restore the required trusted macOS ARM64 `crumbs-m4-pro` runner: GitHub currently reports zero registered runners. A local report cannot substitute for the hosted publish-job acceptance or npm provenance.
4. On the actual final clean release tag, rerun the normal full host policy and exact-artifact SDK 56/57/58 qualification, seal/reverify both bundles, and publish only that artifact. If a blocking metric fails, stop for remediation or a new concrete artifact-specific disposition. No threshold or gate is waived here.
5. Independently verify npm version/dist-tag/integrity/provenance and fresh installed consumers after publication. Update release status from registry evidence, keeping GitHub, npm and documentation deployment distinct.

The human has authorised pursuing npm publication and explicitly approved merging PR #8. These authorisations do not invent a passing host report, register a runner, waive numerical policy or prove publication. npm `latest` remains 1.1.1 at this review snapshot.

## Complete local host result

[Policy check](checks/host-policy-check.log.gz) and [comparison](host-report/comparison.json) retain all numerical outcomes. Cold transform median 74.943958 ms and matched incremental rebuild 136.103959 ms pass. Warm transform median 9.869417 ms fails; no numerical retry selected a pass. Runtime initialisation (four formats/Node cohorts) and theme-core/compatibility graph sizes (four formats) exceed advisory budgets. Token graph sizes and the remaining ten blocking editor/compiler/incremental checks pass.

Source input digest `e00142f3c78e7c92b5f3374c90ff63319e0bb89ce5c284cf76cbae0b14463efd` is identical before and after measurement; built artifacts and policy bindings are also unchanged. The report is based on working-tree source `e333250`, not final 1.2.0 tag/provenance. It cannot qualify a future rebuilt release by itself. The initial setup failure is separately retained: baseline dependencies predated new compiler parser/codec imports. The repaired scaffold adds only newly declared compiler edges from the frozen current installation and records their versions/hashes while retaining approved Expo56/Metro0.84.4/VE1.20.1 and consumer versions. Its focused RED→GREEN proof and actual corrected host run pass setup. No historical baseline, numerical threshold or policy role changed.
