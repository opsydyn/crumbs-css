# M10.5 / M1.10c: approved v1.2.0 baseline and npm publication

Accepted 2026-10-18 by Alan Currie: “We’ve pushed this as hard as we could let’s downgrade the gate to our baseline and ship the next version to npm”. This supersedes the earlier requirement to remediate the three compiler metrics before publication. It authorises adopting the measured v1.2.0 baseline and publishing its exact qualified artifact.

## Policy amendment

| Blocking metric | Previous baseline (ms) | Adopted baseline (ms) | Retained allowance | New absolute maximum (ms) |
| --- | ---: | ---: | ---: | ---: |
| Cold transform | 66.404584 | 84.664042 | 25% | 105.831 |
| Warm transform | 5.664125 | 12.346250 | 15% | 14.199 |
| Incremental rebuild | 123.950500 | 136.881500 | 10% | 150.570 |

Registry values retain the full precision of the recorded medians. Absolute maxima are the baseline plus its existing percentage, rounded upwards to the nearest 0.001 ms; both absolute and relative checks must pass. Only these three rows change. All other metrics, selectors, host/measurement identity checks, diagnostic contracts and the 11 blocking / 10 advisory partition stay unchanged. Future releases use this approved fixed baseline; they cannot automatically replace it with their own measurements.

[Reassessment](reassessment.json) applies the revised registry to the complete original report: all 11 blocking checks pass; 2 advisory checks pass and 8 fail. This is a policy reassessment of retained measurements, **not a new host run or a compiler speedup**. The original report, its old-policy failures and the immutable source release are unchanged. [Previous registry](previous-registry.json) and [previous policy](previous-policy.json) preserve the exact superseded snapshots.

## Exact release

- Package: `@opsydyn/crumbs-css@1.2.0`; Git tag `v1.2.0` remains unchanged.
- Source: `5a13f913b17ae957172968144ec83c391caee337`.
- Tarball SHA-256: `4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e`.
- Report digest: `22a99b9542d94242b46be612044687589e67a58a17bd09bafff112038e340094`.
- Original full hosted measurement: [39020184159](https://github.com/opsydyn/crumbs-css/actions/runs/39020184159), attempt 1. Only the old numerical release-policy check failed.
- [Original candidate, source/artifact receipts and SDK56/57/58 matrix](../2026-10-17-m1-10c-expo58-release/final-release/README.md).

The dedicated manual publication workflow checks the public source release and retained hosted job, loads the SHA-pinned admission verifier from dispatched main, and verifies the exact source/report/tarball and SDK matrix in both qualification and publication jobs. Its admission recognises exactly the three recorded numerical failures and medians; any missing evidence, changed bytes, source drift or additional blocker rejects publication. A sealed receipt binds the approved policy/registry hashes, original manifest and dispatched tooling commit. The tarball is transferred unchanged and published with npm provenance. No rebuild or repack is used to manufacture a different v1.2.0 artifact.

The generic future-release workflow retains fresh hosted measurement. This one release reuses its already completed hosted measurement and compatibility receipts under the explicit amendment above. Runtime authoring isolation and public APIs do not change. Physical-device acceptance remains deferred.

## Verification and publication

- Build and typecheck pass.
- Complete suite: 1,911 package tests pass, one existing Node-floor opt-in test skipped; all 33 Storybook tests pass.
- Budget registry validation passes with no baseline issues. Four physical/native metrics remain explicitly pending; no whole-registry or physical performance qualification is claimed.
- Focused tests cover unchanged unrelated metrics, exact medians, independently rederived policy assessment, missing/duplicate/additional blockers, source pins and receipt tampering.
- Local exact-source sealing/verification rehearsal passes. Actual tampering of the tarball, report log, SDK58 receipt and tooling-bound admission receipt is rejected; restoring each original restores verification.
- Workflow YAML parses and its verifier SHA matches. Independent code review found no actionable findings.

The rehearsal uses a local test tooling identity only. The final bundle must be sealed again against the actual merged workflow commit before upload. [Registry verification is now recorded](publication.json): npm `1.2.0` is `latest`, downloaded bytes match the approved tarball, and a fresh published SDK58 consumer passes strict installation, types and all-platform exports. [Publication run 39120552775](https://github.com/opsydyn/crumbs-css/actions/runs/39120552775) succeeded in both jobs.


## Publication outcome

Published 2026-10-18 with npm provenance, without rebuilding or repacking. PR #12 merged the policy amendment as `53aefa90fd3efb28e18a4a5fd683b026c0e56f0a`; the bundle was resealed with that exact tooling identity before dispatch. npm initially returned processing/404 responses and subsequently exposed the verified package. This is a completed release under an accepted baseline tradeoff; it does not resolve the reported consumer-specific 2.5× slowdown.
