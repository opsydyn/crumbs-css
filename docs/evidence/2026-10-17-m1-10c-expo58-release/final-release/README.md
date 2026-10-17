# M1.10c final v1.2.0 release decision — publication blocked

The GitHub source release [v1.2.0](https://github.com/opsydyn/crumbs-css/releases/tag/v1.2.0) exists at `5a13f913b17ae957172968144ec83c391caee337`. npm `latest` remains **1.1.1**, independently checked on 2026-10-17. This packet supersedes the preliminary working-tree host result in the parent review for this exact release decision.

## Exact candidate

- Package: `@opsydyn/crumbs-css@1.2.0`, packed from the unchanged, already-built release checkout with `npm pack --ignore-scripts`.
- Tarball SHA-256: `4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e`.
- Host report inventory digest: `22a99b9542d94242b46be612044687589e67a58a17bd09bafff112038e340094` (SHA-256 of the compact JSON array of relative paths and file hashes, sorted with JavaScript `localeCompare`).
- Measured source digest: `daf68a184c239e288c8ef743dfbf5e5213be0629562fd49a5d4c2e5261b31d5d`, identical before and after measurement; artifact and policy inventories also stayed unchanged.
- Machine-readable identity and full report inventory: [candidate.json](candidate.json).

## Final-tag qualification

[Normal publish run 39020184159](https://github.com/opsydyn/crumbs-css/actions/runs/39020184159), attempt 1, used the explicitly approved ephemeral Mac runner. Setup, frozen installs, matched scaffold, full host measurement and evidence upload succeeded. The sole failed step was **Require the current report to satisfy consumer release policy**. npm publication was skipped. The runner removed its credentials and registration after its one job; the repository runner list was empty afterward.

The release check rebuilt the package, passed types and all **1,907 library tests**, ran the smoke benchmarks and checked the packed distribution. The independent [host verification](host-verification.json) rederives the same three numerical blockers from the retained [raw report](host-report/comparison.json), with no additional source, artifact, protocol or policy-identity errors. The normal host-qualified publication manifest has **not** been sealed.

| Blocking metric | Observed median | Absolute limit | Change from approved historical baseline | Relative limit |
| --- | ---: | ---: | ---: | ---: |
| Cold transform | 84.664042 ms | 83.006 ms | +27.4973% | +25% |
| Warm transform | 12.346250 ms | 6.514 ms | +117.9728% | +15% |
| Incremental rebuild | 136.881500 ms | 137.506 ms | +10.4324% | +10% |

Incremental rebuild passes its absolute ceiling but fails its relative ceiling. All **eight editor checks pass**, with zero incomplete blocking rows. Two advisory checks pass; eight advisory failures remain recorded (four runtime initialisation cells and four theme-core/compatibility graph-size cells). No metric is reclassified or threshold changed.

These comparisons use the approved historical baselines, **not a matched comparison against npm 1.1.1**. They do not establish the cause of the consumer's reported 2.5× slowdown. The separate SDK58 Rust measurements remain scoped to their workload and do not waive these failures.

## Compatibility and native scope

The exact final candidate **passes fresh SDK56/57/58 consumers** using the released helpers. Each passes strict npm resolution, verification of all 185 installed package files, consumer types, motion contracts, iOS/Android/web exports and runtime provenance. All receipts identify clean release source `5a13f913` and the same tarball. The released matrix creator and independent verifier both pass: [SDK56 receipt](sdk-56-qualification.json), [SDK57 receipt](sdk-57-qualification.json), [SDK58 receipt](sdk-58-qualification.json), [SDK matrix](sdk-matrix.json). Its SHA-256 is `6d1edeabd8b36bf0a44fe936153e7b6215a3e23baa50e87e30aa0ff07ffbe471`. These successful post-job checks ran locally from the unchanged release checkout after the hosted host gate stopped; they do not change the failed workflow result or authorize publication.

Final-version hosted [CI 39019104094](https://github.com/opsydyn/crumbs-css/actions/runs/39019104094) passed before the release merge. Its tested tree and the released tree are identical (`c28e6332fc68f7543faf9e7dc86a2f179fc20c67`). [M1.10b native evidence](../../2026-10-16-m1-10b-expo58-apps/README.md) covers both apps on owned iOS/Android targets under Babel and Rust. M1.10c changes no library runtime or public API. Physical hardware, spoken readers, iOS27/DeviceHub and release FPS remain deferred.

## Required decision

**No v1.2.0 numerical exception is approved.** The user's approval covered the audited public push and one-job Mac runner; prior v1/v1.1 exceptions remain version/artifact-specific.

The remaining M1.10c publication decision belongs to the existing **M10.5 host gate**: remediate the compiler/incremental failures and requalify changed bytes, or explicitly accept all three numerical failures for only this source, report and tarball. Any release-only exception must pin this candidate and SDK matrix, retain all other verifier requirements and leave future-release policy unchanged. Publication remains blocked until that decision and verified publication complete.

The release-status documentation build passes all 34 pages. This evidence update changes documentation only; the released tag, library bytes, generic budgets and publication workflow stay unchanged.
