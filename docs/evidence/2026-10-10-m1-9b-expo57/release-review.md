# M1.9b — v1.1.0 publication disposition for review

Status: **proposed; awaiting the user's explicit disposition**. No exception has been applied. npm publication was skipped; `latest` remains 1.0.1.

Expo SDK 57 / RN 0.86 compatibility and SDK 56 / RN 0.85 retention are qualified. The immutable v1.1.0 source is `f08a58d022f9237cf3f4aae8bc9bd77d5c75f204`. [Clean CI](https://github.com/opsydyn/crumbs-css/actions/runs/38085552585) passes both SDKs. The [exact candidate receipt](exact-candidate/sdk57-qualification.json) separately records clean source, strict npm resolution, all 185 installed file hashes, consumer types, both motion module orders, peer-free motion and iOS/Android/web exports. This qualification uses Expo 57.0.27, React/DOM/renderer 19.2.8, RN 0.86.3, actual Node 24.15.0 and Bun 1.4.2.

## Fresh generic gate result

[Run 38087033318](https://github.com/opsydyn/crumbs-css/actions/runs/38087033318) uses workflow revision `6f4390b2ee456e569562d6cb7aea2be74cd80155` and the fixed source tag. It completes the unchanged measurement protocol. The normal release checker independently rederives the complete source/artifact/policy/raw-report binding and rejects the warm-transform row: **10 blocking passes, one numerical failure, no incomplete rows**. [Raw report](host-report/comparison.json) and [checker log](release-host-gate.log).

| Measurement | Recorded median | Effective unchanged limit | Result |
| --- | ---: | ---: | --- |
| Cold transform | 75.737167 ms | 83.005730 ms | Pass |
| Warm transform | 9.269750 ms | 6.513744 ms | Fail; +63.657% versus the 5.664125 ms baseline |
| Incremental rebuild | 135.782750 ms | 136.345550 ms | Pass |
| Eight editor rows | See raw report | Existing individual limits | All pass |

The warm result has a min–median–max envelope of 8.688417–9.269750–11.952542 ms and is flagged for noise attention. The failure remains a failure. All ten advisory rows are complete: two pass and eight fail (four runtime initialisation and four emitted-graph rows). They remain visible and do not block under the unchanged consumer release policy. This is host evidence, not physical-device, spoken-reader or release-FPS acceptance.

The first generic attempt failed before measurement on the isolated Bun dependency edge. Its reviewed repair exposes only the already locked Vanilla Extract 1.20.1 package; all eight baseline versions are verified. The second attempt reached measurement but port 8093 belonged to another project; [diagnostic log](release-port-conflict.log). The final attempt used the harness's existing `CRUMBS_METRO_PORT=18093` option, without stopping that project's server or changing source, versions, fixtures or limits. No completed failing measurement was rerun to obtain a pass.

## Recommended disposition

Approve a **v1.1.0-only numerical exception for `warm-transform-ms` in this exact retained report and candidate artifact**. The new compatibility release admits Expo 57 without a compiler/runtime JavaScript change: [all 105 JavaScript files are byte-identical to verified npm 1.0.1](v101-code-comparison.json). The package manifest changes only version and the tested RN peer upper bound. This comparison supports shipping the compatibility update; it does not establish a new performance pass or a statistical improvement.

Bind approval to the [machine-readable review packet](release-review.json):

- Source: `f08a58d022f9237cf3f4aae8bc9bd77d5c75f204`.
- Exact tarball SHA-256: `51b36b137a97364a30e401dc97f017890b6d3e09ad14d2319ad5cd03925baeda` (185 files). All 181 `dist` files match the measured inventory.
- Full retained report SHA-256: `54501f21a83671ec35e45ac35ad6087351cc70f8461ba30e8e873db8203be3b5` (20 files; digest of the packet's sorted path/hash inventory).
- Only the complete recorded numerical warm failure is admitted. Missing, altered or incomplete evidence, another source/artifact/report, any additional blocking failure and changed policy all remain rejected.

After approval, implement a narrowly scoped publisher/verifier for that exact binding, preserve every failed row, independently verify the transferred bundle, publish with npm provenance and verify registry version/latest and exact tarball integrity. The generic policy, baseline limits and future-version gates stay unchanged. Do not retag or rebuild into a different approved artifact. Agent-skill authoring remains deferred until npm publication is verified.

The earlier v1.0.0/v1.0.1 dispositions do not authorise this release. A fresh user disposition is required by the retained version-specific release decision; compatibility approval alone does not waive this gate.
