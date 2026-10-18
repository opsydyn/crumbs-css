# M10.5 exact-artifact release disposition packet

Client date 2026-10-18; review base `9597d79`. **All pins confirmed; publication remains blocked. No exception or new qualification run is approved.** See the [release choices](../../assessments/2026-10-18-m10-5-release-disposition.md).

## Retained material

- `artifact/opsydyn-crumbs-css-1.2.0.tgz`: the original 582,933-byte tarball, copied from an existing control artifact. SHA-256 `4bd7897aa5beb6383b158f4e214436ba5d0d659b6b0fc005142c945a10dda02e`. No build/repack occurred. All 185 files match every original SDK receipt, and all 181 current dist files match the tarball.
- `host-report-download.zip`: actual hosted artifact 12096860569, 225,628 bytes, SHA-256 `c7bff0efbac8201b41f829a9337f027cc249c5aaa2a16b058aea74f2946503fb`. Its 20 report files match the pinned report inventory, digest `22a99b9542d94242b46be612044687589e67a58a17bd09bafff112038e340094`. It contains no sealed manifest or tarball.
- `live/`: public GitHub release/tag/run/jobs/artifact/CI metadata and public npm responses read during this slice. The tag remains`5a13f913`; CI succeeds on the identical release tree; qualification fails and publishing is skipped. npm latest is 1.1.1 and 1.2.0 returns404. These observations are not future guarantees.
- `candidate.json`, `artifact-verification.json`, `download-verification.json`, `bindings-verification.json`, `failures.json`: exact identities, complete tar member inventory, remote archive agreement and rederived numerical failure context. The existing source/report/SDK receipts remain in `../2026-10-17-m1-10c-expo58-release/final-release/` and are not rewritten.

The SDK matrix digest is `6d1edeabd8b36bf0a44fe936153e7b6215a3e23baa50e87e30aa0ff07ffbe471`. The actual `checkSdkReleaseMatrix(...,false)` verifier passes; its six qualification domains are not substituted with a top-level flag. The host helper exactly reproduces the original three numerical failures when given the correct source content.

## Source replay boundary

`host-replay-initial.json` retains the expected source-identity failure from this working branch. Its root README status correction changes the source digest; `source-branch-diff.txt.gz` records the difference. That mismatch is never waived or relabelled numerical.

`source-replay.json` describes an owned **partial source-content mirror**, not a clean qualification checkout:948 source files recovered from the release commit, a temporary Git index using that exact tree, historical baseline evidence and 181 original dist artifacts. `host-replay-partial-inputs.json` retains an initial missing diagnostic-baseline error. After restoring that exact evidence file from the same commit, `host-replay-pinned.json` and `bindings-verification.json` exactly match the original host verification with only the three numerical failures. `setup-issues.json` records these setup issues and the npm collector's string-shaped 404 handling correction. No source, artifact, pin or gate was weakened.

## Reproduction

Run `python3 verify.py --repository <absolute-repository-root>` for offline tar/ZIP/source-tag/evidence/live-observation/policy integrity checks. It makes no network calls and grants no release admission. It requires this containing repository's existing pinned evidence.

For the original helper replay, run:

```sh
bun verify-bindings.ts <containing-repository-root> <this-packet-directory> <exact-release-source-root>
```

The third root must contain the actual source inventory and dist at the release pin, not merely this later branch. Using this branch intentionally rejects its source mismatch. Recreate an owned content mirror by obtaining the 948 paths from the original `host-report/input-identity.json`, recovering their exact Git blobs and modes at `5a13f913`, creating an isolated temporary Git index for that tree, supplying the original dist from this tarball, and the historical baseline/diagnostic evidence. `source-replay.json` lists the evidence paths. Never reset this checkout or edit its README/digest to manufacture parity. The helper loads unchanged repository verifiers and uses the release's actual report and three SDK receipts; no `create`/seal operation is called.

`tooling-inputs.json` pins all inspected verifier/policy/workflow/old-exception implementations. Inventory checks establish retained integrity and derivation, not independent execution attestation. The helper and records do not prove a new host/SDK/native run, sealed publication manifest, approved exception or npm publication. Physical acceptance remains deferred. Local paths remain in evidence; no public push was part of this slice.
