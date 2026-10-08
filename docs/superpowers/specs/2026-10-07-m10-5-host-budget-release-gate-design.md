# M10.5 host-budget release-gate design

- **Status:** Approved; implementation completed.
- **Date:** 2026-10-07
- **Roadmap:** M10.5
- **Source reviewed:** `0d510bc` plus the retained current-source host-budget evidence.
- **Decision:** Make a complete, passing host-budget report a prerequisite for `release:check` and npm publication. Run qualification on a matching, dedicated Apple M4 Pro runner; hand the report and the exact qualified package tarball to the existing Ubuntu publish environment.

## Intent and current evidence

The accepted M10.5 runtime-budget policy keeps the existing selectors, comparison rules, limits, and host enforcement unchanged. A separately approved release-policy decision now makes that existing host gate a prerequisite to publishing. It does not approve a new metric, a new threshold, a baseline change, a waiver, or registry-readiness as a substitute.

The current-source comparison contains 21 approved host metrics: 12 pass and nine fail. The matched Expo/Metro incremental-rebuild comparison passes; the nine remaining failures are four runtime-initialisation metrics, warm transform, and four theme graph metrics. With this gate enabled, the current report must fail and npm publication must not run until every approved comparison passes. Physical-device work remains deferred.

`budgets:readiness` is deliberately outside the release gate. It includes future device-facing thresholds and would couple this host publication decision to the separately deferred physical-device work. Registry decoding and retained-baseline integrity remain required inputs to the measurement suite.

## Job boundary

### Host qualification job

Add a `qualify` job before `publish` in `.github/workflows/publish.yml`. It runs on a dedicated self-hosted macOS ARM64 Apple M4 Pro runner with a controlled `crumbs-m4-pro` label. The job records and checks the actual hardware, OS, architecture, and toolchain; a label alone is not proof. It must match the accepted host policy, including macOS 26.6.2, Apple M4 Pro, Bun 1.4.2, npm 11.12.1, exact Node 22.0.0 floor and Node 24.15.0 current runtime, plus the matched Expo 56.0.4 / Metro 0.84.4 / React Native 0.85.3 consumer cohort. The editor-scale row records Bun's Node compatibility identity as v26.3.0; it does not require a separate Node 26 executable. Any mismatch fails closed. There is no fallback to a GitHub-hosted runner or a different Mac model.

The job checks out the requested release tag, verifies dispatch came from `main`, resolves the tag to a commit SHA, and installs the frozen workspace dependencies. It builds the package, prepares the approved locked Metro scaffold from baseline commit `43c5ece39360cf321fdb074d82cee41d5daaba23` with the current package artifacts, Metro config, and five approved fixture files, and verifies the direct `@vanilla-extract/css` edge resolves to the baseline lock's 1.20.1 package. The baseline Playground manifest intentionally lacks that direct edge, so the disposable app mirrors only the current source app's `^1.20.1` resolver edge; the overlaid Crumbs package uses the baseline install's package-local runtime dependencies. The helper verifies Vanilla Extract resolves to 1.20.1 from both app and package contexts. It then runs the full host-budget measurement. `release:check` requires that report and runs the existing package build, typecheck, tests, native-style smoke benchmark, and pack dry-run. Its report validator compares the rebuilt output to the report's artifact identity, so a stale report or a changed build cannot pass.

After `release:check` succeeds, the job creates a package tarball without rerunning the build. A handoff manifest records the release tag and commit SHA, source digest, host identity, report digest, package artifact inventory, package version, and tarball digest. The tarball and complete host report are uploaded together as one workflow artifact. The upload also runs after a failed qualification for diagnosis; a failed job still prevents publication.

The qualification job receives only read access needed to check out source. It receives no `NPM_TOKEN`, npm registry credential, write permission, or OIDC token. The runner is dedicated to this workflow, starts from a clean checkout, and does not reuse credential-bearing user caches. Runner provisioning and registration are an external prerequisite; this repository change does not create or configure the runner.

### Ubuntu publish job

Keep `publish` on `ubuntu-latest` and make it depend on successful `qualify`. It checks out the resolved qualified commit, confirms the release tag still resolves to that same commit, verifies the published GitHub Release, downloads the qualification artifact, and validates its manifest, report, source digest, package metadata, and tarball hash. It rechecks the report's closed metric set and pass statuses before the npm token is made available.

The publish job installs the repository verifier dependencies but does not rebuild the package. It publishes the verified tarball directly and does not repack it after qualification. Scope `id-token: write` to this job for npm provenance. Inject `NPM_TOKEN` only into the final `npm publish` step, after every source, report, and tarball check has passed. If the runner is unavailable, the report is absent, the tag moves, or any identity check fails, publication is skipped.

## Release-check contract

`release:check` requires an explicit path to the report directory produced by `measure:host-budgets`; omission is an error with instructions for producing a report on the approved runner. It must not discover or accept a prior evidence directory implicitly. The check runs after the package build and validates the report against the current source and rebuilt package artifacts.

The validator accepts only the current comparison format and the exact closed set of 21 approved host metric IDs. Every ID must appear once, with no missing or extra row, and every row must have result `pass` under its approved workload, environment, selector, and unchanged threshold. The closed set is pinned to the approved selectors and tested against the registry; adding, removing, or reclassifying a row requires a separate policy review. The verifier re-derives the comparison from the retained raw reports and current approved registry using the existing comparator. Missing raw data, duplicate rows, failed or incomplete results, environment mismatch, invalid registry/baseline evidence, source revision or digest mismatch, unstable before/after identity, and package artifact mismatch all fail the check.

Do not use the comparator's `performanceQualified` field as the release result: it also requires whole-registry readiness, which remains false while deferred device thresholds are pending. Derive the host release result from the exact 21 recorded, approved host rows. Continue to require successful registry decoding and recorded/diagnostic baseline integrity checks, but do not require `assessBudgetRegistry(...).ready`.

The release job uses the same validator on the downloaded report and additionally verifies the manifest and tarball digests. The host report must identify the same source commit as the release tag and the same built package artifacts contained in the tarball. The Ubuntu job publishes only those verified bytes.

## Compatibility and scope

- Keep all 21 approved host selectors, baselines, limits, relative-regression rules, and environment comparisons unchanged.
- Do not gate publication on the full registry readiness result or on device-only metrics.
- Do not introduce a package runtime dependency or alter any public API.
- Do not let Expo/Hermes reference evidence waive a host failure.
- Keep physical-device, screen-reader, and other separately deferred acceptance out of this workflow slice.
- Keep the existing manual release-tag workflow and Ubuntu publication destination. The host job is qualification and artifact production; only the dependent Ubuntu job publishes.

## Implementation acceptance evidence

The implementation should include focused validator cases proving rejection of an absent or malformed report, missing/duplicate/extra metric IDs, any failed or incomplete row, environment mismatch, report/source mismatch, before/after drift, and artifact or tarball hash mismatch. A synthetic report with exactly the 21 approved rows passing must be accepted even while the registry-wide `performanceQualified` field is false because device thresholds remain deferred. The current 12-pass / nine-fail report must be rejected with the nine failing metric IDs visible in diagnostics.

Workflow validation must show that the qualification job has no npm secret or OIDC write permission, the publish job cannot run after failed qualification, and the Ubuntu job publishes the transferred tarball without rebuilding it. End-to-end qualification on the registered matching runner must retain the raw report and identity manifest. No npm publication is part of this implementation slice.

## Remaining prerequisite and next handoff

The workflow requires a registered, dedicated M4 Pro runner that satisfies the exact host policy. Until it is available, the new gate should remain visibly queued or fail with a clear missing-runner condition; it must never silently substitute a different environment. The current nine approved failures will also block any release until remediated under the unchanged limits.

After review and approval of this design, the next slice is **M10.5 — implement the fail-closed release-check validator and M4 Pro-to-Ubuntu qualification artifact workflow**. Keep runner registration as an explicit infrastructure prerequisite and keep physical-device work deferred.


## 2026-10-08 — accepted conditional byte-policy amendment

Explicit approval of the [expanded-runtime scope spec](2026-10-08-m10-5-expanded-runtime-budget-scope-design.md) conditionally revises four byte contracts only: core ESM/CJS initial caps 39,000/39,000 B, compatibility ESM/CJS 96,000/99,000 B. Actual fully qualified baseline bytes govern zero future growth; the caps do not create post-admission headroom. Seventeen other contracts, every timing ceiling, exact matched runner and the closed 21-row pass gate remain unchanged. Original text above records the earlier release-gate decision and continues governing until complete activation.

The [single inline implementation plan](../plans/2026-10-08-m10-5-expanded-runtime-remediation.md) adds policy format 1, comparison format 3, manifest format 2, and the same required policy-ID/policy-SHA/registry-SHA binding to reports, before/after input identities and handoff manifests. Both macOS and Ubuntu verify it alongside current raw/source/artifact/tarball checks. Old comparison/manifest formats remain historical evidence and cannot qualify the new policy. Tarball-only publication and the credential boundary remain unchanged.

Approval admits no production candidate or new baseline. Written plan review and complete API/type/property/packed/software/host qualification precede one final implementation commit. A failed candidate restores all old enforcement and registry files. The [approval receipt](../../evidence/2026-10-08-m10-5-expanded-runtime-plan/approval.json) binds the original decision snapshot; M10.5 remains open and no hosted success, physical acceptance, push or publication is claimed.
