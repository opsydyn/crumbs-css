# M10.5 exact-artifact release disposition

Date: 2026-10-18. Review base: `9597d79`. **Outcome: pins confirmed and original bytes retained; npm publication stays blocked pending an explicit release choice.** This slice changes documentation/evidence only. It grants no numerical exception, changes no generic budget and starts no publication or new qualification run.

## Confirmed identities

| Binding | Verified pin |
| --- | --- |
| Source/tag | `v1.2.0` → `5a13f913b17ae957172968144ec83c391caee337` locally and on GitHub |
| Release/CI tree | `c28e6332fc68f7543faf9e7dc86a2f179fc20c67`; final-version CI 39019104094 remains successful on the same tree |
| Exact npm tarball SHA-256 | `4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e` |
| Host report inventory digest | `22a99b9542d94242b46be612044687589e67a58a17bd09bafff112038e340094` |
| SDK 56/57/58 matrix SHA-256 | `6d1edeabd8b36bf0a44fe936153e7b6215a3e23baa50e87e30aa0ff07ffbe471` |
| Measured source digest | `daf68a184c239e288c8ef743dfbf5e5213be0629562fd49a5d4c2e5261b31d5d` |
| Policy / registry SHA-256 | `cd3f8408c8381591d16525c2cd8e66e1e45e28582c8c96a47ac84d05ef1edc07` / `0f5752c430db6ced1f8d8a5c94c7de865a3ba9daadaa9a60584148eeb0a4687b` |

The original release scratch directory is gone, but an already-retained control tarball is byte-identical to the candidate. Its 582,933 bytes and SHA-512 integrity match the original pin. All 185 tar members match each SDK's installed-file inventory; all 181 current dist files match those tar members. The exact tarball is now [retained in this committed packet](../evidence/2026-10-18-m10-5-release-disposition/artifact/opsydyn-crumbs-css-1.2.0.tgz). It was copied, not rebuilt or repacked. Preliminary1.1.1 artifacts are not substitutes.

The live hosted artifact 12096860569 was downloaded, not merely located. Its ZIP SHA-256 `c7bff0efbac8201b41f829a9337f027cc249c5aaa2a16b058aea74f2946503fb` matches GitHub metadata; all 20 report-file hashes match the original pinned report inventory. The ZIP is retained too, removing dependence on its 2026-10-31 expiry. It contains the report only: no sealed manifest or tarball. Run 39020184159 remains failed at the policy check, with publish skipped. Its pack, SDK and seal steps were skipped; the passing exact-artifact SDK receipts were collected locally afterward, as the original release packet states. They must not be represented as successful hosted steps.

Live npm reads confirm `latest: 1.1.1`, `alpha: 0.1.2-alpha.1`, and a 404 for version 1.2.0. GitHub source-release publication is distinct from npm publication. Raw [observations, replay and artifact checks](../evidence/2026-10-18-m10-5-release-disposition/README.md) support these statements; this is an observation on 2026-10-18, not a monitor.

## What remains failed

The released host verifier and SDK matrix verifier were replayed without changing their gates. Against the pinned source content, the host result exactly matches the original: eight blocking passes, three numerical blocking failures, no incomplete rows or additional identity errors. The SDK matrix verifies all three original cohorts and their exact file/integrity bindings. This is offline evidence verification, not a fresh SDK/native/host measurement.

| Blocking metric | Recorded median | Absolute ceiling | Recorded regression / permitted | Effective ceiling |
| --- | ---: | ---: | ---: | ---: |
| Cold transform |84.664042 ms|83.006 ms|+27.4973% / +25%|83.005730 ms|
| Warm transform |12.346250 ms|6.514 ms|+117.9728% / +15%|6.513743750000014 ms|
| Incremental rebuild |136.881500 ms|137.506 ms|+10.4324% / +10%|136.345550 ms|

Both absolute and relative limits apply; the effective ceiling is the lower. Incremental passes the absolute limit but exceeds the relative limit by 0.535950 ms. The warm result is about 2.18× its historical baseline; it is not a matched comparison with npm 1.1.1 or proof of the consumer's reported 2.5× slowdown. These are compiler/editor workflow costs, not native frame-time measurements. Eight advisory failures remain recorded; their data and validation requirements are not discarded.

The working branch cannot stand in for the release source: its only tracked non-`docs/` difference from `v1.2.0` is a root README status correction, and that file participates in source identity. Direct host replay here correctly adds a source-identity blocker. An owned partial mirror of the 948 pinned source files and original artifacts reproduces the exact original verification after including its historical baseline evidence. The initial partial-mirror missing-baseline failure is retained. No README, digest, source guard or verifier was patched to force a pass. This replay is not a clean-source qualification checkout. Any publication preparation must use the exact original source/artifact context and must reject identity drift; an exception cannot cover this branch's mismatch.

## Release choices

| Choice | What it means | Consequence |
| --- | --- | --- |
| **A — Keep blocked** (current/default) | Retain the user's remediation-before-publication decision. Park this release until a materially different justified remedy is funded and changed bytes pass the existing checks. | No npm 1.2.0 release now. No further speculative packaging/context prototype is scheduled. A future source-changing remedy has a new identity and normal release/version qualification; the existing tag stays immutable. |
| **B — Approve one exact v1.2.0 numerical exception** (not approved) | Explicitly accept only `cold-transform-ms`, `warm-transform-ms` and `incremental-rebuild` for the source, tarball, report and SDK matrix above. Keep all identity, artifact, compatibility, provenance, other report checks and future-release budgets mandatory. | Enables designing a narrowly pinned exception path; it does not make the normal workflow pass or publish anything immediately. The accepted failures remain visible and must not be relabelled as a normal pass. |

The existing v1.0/v1.1 exception helpers name different releases, artifacts, reports and metrics. They cannot authorize v1.2.0. The current normal workflow and manifest creator correctly reject this report, and no applicable v1.2.0 exception route or sealed publication manifest exists. Choosing B therefore needs a reviewed, verified exception-path change and bundle before publication; directly rerunning the tag's normal workflow would fail again. No generic rebaseline, metric reclassification, approval of changed bytes or reuse of an older exception is offered.

**Recommendation under the current instruction: retain A.** The warm failure is material against the agreed host baseline and no qualifying remedy remains selected. If delivering SDK 58 support now outweighs that known developer-workflow cost, B is a viable explicit product trade-off using already-verified bytes. That trade-off belongs to the user, and is not inferred from approval to prepare this packet. Compatibility evidence supports making the choice; it does not choose the risk tolerance.

## Proposed scope if B is explicitly selected

Use the complete pins above, the original run 39020184159/attempt1, package `@opsydyn/crumbs-css@1.2.0` and exactly the three listed metric IDs. Accept only the original complete numerical failures, not missing evidence, source/artifact mismatch, receipt drift, invalid maps/import graphs, schema/policy errors, failed compatibility or any other blocker. Retain the report and advisory rows unchanged. Pin tooling and any new exception receipt separately; do not claim the original release source or generic policy was changed. Approval must not follow a different source, report, tarball or SDK matrix automatically.

A separately reviewed design must specify exact-source checkout verification, sealed-bundle identity, verifier negative controls, public evidence audit and the publication mechanism. A copied tarball and a successful replay are not themselves publication authorization. No new runner, workflow dispatch, tag mutation, merge, npm publish or dist-tag edit ran here. Original physical-device/spoken-reader/iOS27/DeviceHub/release-FPS deferrals remain.

## Next numbered slice

**M10.5 — explicit release choice.** No further engineering work is justified until A or B is selected. If A remains selected, keep the release parked rather than inventing another optimization task. If B is explicitly selected, the next engineering slice is **M10.5 — v1.2.0-only exception-path design and review**, retaining native/inline execution preference for any later approved implementation. Publication remains a later verified action. An unqualified “approved” must not silently become approval of B's three numerical exceptions.
