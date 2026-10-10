# M10.5: revised v1 publication decision for review

Status: approved. The user approved the incremental numerical overrun and explicitly approved the fresh source-built tarball identity in a separate response. npm publication and independent registry acceptance remain pending execution.

The exact immutable `v1.0.0` source remains `382768a45f429f4c039e7584cd7c31e4f8821fc0`. [Run 38059803838](https://github.com/opsydyn/crumbs-css/actions/runs/38059803838) passes source/host setup, 1,829 CSS and 33 Storybook tests, package and app types, real packed Expo iOS/web qualification, and the native-style smoke benchmark. It completes all 21 unchanged measurements. Independent rederivation verifies source, artifact, policy and raw measurement bindings; nine blocking rows pass, two fail, none are incomplete. All ten advisory rows are complete; their two passes and eight failures remain visible.

| Blocking measurement | Recorded median | Effective unchanged cap | Result |
| --- | ---: | ---: | --- |
| Cold transform | 75.752375 ms | 83.00573 ms (+25% baseline) | Pass |
| Warm transform | 9.344542 ms | 6.51374375 ms (+15% baseline; 6.514 ms absolute) | Fail; current v1-only approval covers this row |
| Incremental rebuild | 136.519166 ms | 136.34555 ms (+10% baseline) | Fail; 0.173616 ms / 0.1273% above cap; user-approved v1-only exception |

The fresh frozen source build packs to SHA-256 `0cdbdb65f89c875e8376fb3dfff749fbd7190416170f93e3855b47ac705b2b50`. Its 185 files match the earlier pinned artifact except for three declarations: one `metro-cache` region source-path comment changes a type-only chunk filename and its references. All 105 JavaScript files are byte-identical. An independently retained diagnostic confirms identical type content after only that comment/path-reference normalization, and rejects a semantic type mutation. This diagnostic does not admit the artifact or replace a gate. The complete new report binds the actual fresh build artifacts.

## Recommended explicit disposition

For this exact v1 source only, retain the approved numerical warm-transform exception and additionally admit the complete numerical `incremental-rebuild` failure. Explicitly adopt the fresh source-built tarball SHA-256 above instead of the earlier `89b14b8…` pin. Keep every other blocking metric required, complete advisory evidence and all source/host/policy/report/artifact/tarball checks. Preserve the failed rows, existing limits/baselines, generic workflow and policy. Future versions receive neither exception.

The [fresh-artifact approval](fresh-artifact-approval.json) now authorises the exact tarball pin and its rejection controls. The helper additionally pins the full retained report digest `ee73e90d9a6400eb21827b63bc6c656e6f60ca0d4bf2e4fe70d55eaa9f026101` (20 files). The isolated workflow checks the fixed original run’s successful functional and full measurement steps, repeats the frozen source build and functional checks, and requires its newly packed bytes to equal the approved original fresh tarball. It then rederives and seals the exact retained report; no timing is resampled. Verify the fresh artifact directly against the immutable checkout and full report; build-generated artifacts must not be replaced by retained artifacts or normalized into a pass. Publish only the newly approved, sealed tarball with npm provenance, then independently check registry version/latest, integrity and a real installed consumer. The v1 tag remains unchanged.

## Current boundary

The [incremental approval](incremental-approval.json) records the user's exact response: “requests approval for the 0.174 ms incremental overrun  is approved”. The one-off helper now admits the existing warm failure and this complete incremental failure, with an incremental median ceiling of 136.51916600000004 ms. Missing, nonfinite or larger medians, incomplete evidence, duplicate blockers and every other failure remain rejected. The v2 exception receipt binds these approvals to the manifest and dispatched workflow tooling.

The subsequent separate response “Approved” explicitly adopts the fresh `0cdbdb65…` tarball. The superseded `89b14b8…` artifact and any changed or missing report digest now reject. The historical pipeline rejection and skipped publication are retained; npm still requires execution and independent verification. Automatic approval review rejected restoring retained `dist` files after normalization because that would weaken source-to-tarball integrity beyond the approved scope; the rejected write did not execute. The accepted decision uses the explicitly approved fresh build and exact retained report instead.

Publication now awaits full bundle verification/publishing and independent npm acceptance. No repeated measurement has been selected to erase this result. Physical devices/readers/release FPS and M11.6 remain deferred or parked.
