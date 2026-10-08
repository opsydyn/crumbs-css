# M10.5 host release-policy review

Date: 2026-10-08. Status: **proposed; not approved or active**. Reviewed checkout: `c7ebab1`, shipping digest `8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76` (694 files).

## Recommendation

Keep every measurement and numerical contract, but make the ten runtime proxy metrics advisory for release admission. Keep the eleven compiler, Metro and editor comparisons blocking. Require complete, valid, matched evidence for all 21 rows regardless of classification. A malformed or incomplete advisory measurement still blocks release; a valid advisory threshold failure remains a reported failure, without vetoing publication.

This is an explicit reduction in release enforcement, **not an optimisation, a passed budget, or a mobile performance guarantee**. No replacement consumer threshold is justified by the current studies. Approval must accept the temporary absence of an automatic runtime-size/import-time veto. The active 21-pass gate stays unchanged until this precise proposal is approved and implemented.

## What the current gate measures

`packages/css/bench/runtime-initialization.ts` imports compatibility `dist/theme.mjs` or `dist/theme.cjs` in fresh Node 22.0.0 / Node 24.15.0 processes. It does not time theme/core, an Expo bundle, first styling use or a native frame. The six graph rows sum reachable emitted local files for theme/core, tokens and compatibility theme. Their bytes are useful packaging indicators, but differ from Metro's mapped contribution and Hermes's whole-bundle contribution.

Cold/warm transform, matched Metro invalidation and editor-scale work measure developer workflows. Keep their existing absolute-and-relative comparisons: these remain relevant to the design-system developer experience. Their host/environment sensitivity still requires the existing exact matching protocol.

The [consumer diagnostic](2026-10-08-m10-5-consumer-decision.md) found small styling costs and positive startup deltas in one current-source iOS cohort, and an extra commit per theme change. It does not establish a mobile budget or prove that the runtime metrics are harmless. The earlier [three-cohort mobile study](2026-10-06-m10-5-mobile-target-calibration.md) covered iOS and Android on a different frozen source and produced sign-changing launch deltas. Neither is grounds to relabel a failed host measurement as passing.

The prior [matched Metro assessment](2026-10-07-m10-5-current-source-matched-metro.md) records 12 passes / nine failures on its then-current source. Eight failures are runtime proxies; the ninth is warm transform. This is historical context, not a fresh full-host qualification of `c7ebab1`. No new timing suite was run in this policy review.

## Options

| Option | Release enforcement | Benefit | Cost |
| --- | --- | --- | --- |
| Retain the current policy | All 21 rows must pass | Strong existing import/size vetoes; no migration | Parked runtime rewrites leave known failures unresolved; the consumer relevance of their limits remains unestablished |
| Make only Node timings advisory | 17 blocking / 4 advisory | Removes the CPU/runtime proxy while keeping deterministic size protection | Four theme graphs still fail their active limits; their conditional replacement caps remain unadmitted, so this still requires byte remediation or another policy decision |
| **Recommended: classify all runtime proxies as advisory** | **11 blocking / 10 advisory** | Keeps honest diagnostics and directs blocking performance work at developer workflows | Loses automatic runtime-size/import-time rejection until a separately approved consumer contract exists |

The recommendation includes both passing token graphs and failing theme graphs. Classification follows metric scope, not current result. Do not demote warm transform simply because it is the remaining known failure. Do not remove the dedicated matching runner or source/artifact/credential protections to make publication easier.

## Exact proposed partition

Policy ID for later implementation: `crumbs-host-budgets-2026-10-08-consumer-scope-v1`. The [machine-readable proposal](../evidence/2026-10-08-m10-5-host-policy-review/proposal.json) enumerates all 21 IDs/selectors and preserves their exact baseline/threshold objects. Registry SHA-256: `0f5752c430db6ced1f8d8a5c94c7de865a3ba9daadaa9a60584148eeb0a4687b`.

| Metric IDs | Proposed enforcement |
| --- | --- |
| `runtime-initialization-node22-esm`, `runtime-initialization-node22-cjs` | Advisory |
| `runtime-initialization-current-esm`, `runtime-initialization-current-cjs` | Advisory |
| `runtime-theme-core-esm-graph-bytes`, `runtime-theme-core-cjs-graph-bytes` | Advisory |
| `runtime-tokens-esm-graph-bytes`, `runtime-tokens-cjs-graph-bytes` | Advisory |
| `runtime-theme-compatibility-esm-graph-bytes`, `runtime-theme-compatibility-cjs-graph-bytes` | Advisory |
| `cold-transform-ms`, `warm-transform-ms`, `incremental-rebuild` | Blocking |
| `editor-tsc-wall-10000`, `editor-tsgo-wall-10000` | Blocking |
| `editor-tsc-memory-10000`, `editor-tsgo-memory-10000` | Blocking |
| `editor-tsc-instantiations-10000`, `editor-tsgo-instantiations-10000` | Blocking |
| `editor-first-completion-10000`, `editor-warm-completion-10000` | Blocking |

Keep selectors, workloads, environments, baseline evidence/values, absolute maxima, relative regression rules, repetition counts and comparator results unchanged. Keep the four pending physical/device domains out of release admission, as already decided. No new public API, runtime dependency, package baseline or threshold is proposed.

The accepted four-cap expanded-runtime amendment was conditional and never activated. This proposal, **if later accepted**, replaces its required byte-admission path and the original all-21-pass release prerequisite; the caps and failed candidate remain historical decisions/evidence, not admitted baselines. Until then the accepted ADR and current all-pass enforcement govern.

## Proposed admission behaviour

1. Collect and rederive the exact closed set of 21 rows under existing approved environments. Every row must appear exactly once. Unknown, missing, duplicate or `incomplete` rows block, including advisory rows. Invalid/unapproved thresholds, invalid baseline evidence, raw-data disagreement and workload/environment mismatch block.
2. All eleven blocking rows must have comparator result `pass`. Advisory rows may be `pass` or `fail`; retain each result, measurements, deltas and violated limits visibly. Keep the comparator's whole-registry `performanceQualified` result unchanged; it is not the release-policy result.
3. Name the new outcome `releasePolicyQualified`, alongside separate blocking/advisory summaries. A release admitted under this policy must not say all budgets passed or claim native/device performance qualification.
4. Bind the active policy ID, policy-file SHA-256 and registry SHA-256 into comparison format 3, both before/after input identities, and qualification-manifest format 2. Verify those bindings against the checked-out active policy/registry in the macOS qualification and Ubuntu publication jobs. Reject historical formats for admission under the new policy; retain them as readable evidence.
5. Preserve current source revision/digest, before/after stability, raw-report, package-artifact, tarball, release-tag and exact host checks. Keep the dedicated matching runner, tarball-only publication and npm credential boundary. No environment variable may bypass classification or choose a different policy.

Changing enforcement is not enough to release. A fresh report must still pass all eleven blocking comparisons and every integrity check. The known warm-transform failure may remain; previously passing rows may also change. Dedicated runner registration/qualification is still a separate prerequisite. No push or publication is authorised here.

## Implementation outline after approval

One complete **M10.5 policy implementation slice**, without combining another runtime optimisation:

- Add a private, checked-in `scripts/release-host-budget-policy.json` containing the approved partition and original registry digest; decode its fixed schema using the existing tooling dependency. `scripts/release-host-budget-policy.ts` must validate the closed set, exact selectors/contract snapshot and pinned partition rather than trust row-supplied classifications.
- Update `scripts/measure-current-host-budgets.ts`, `scripts/release-host-budget-report.ts`, `scripts/check-release-host-budgets.ts`, `packages/css/bench/release-qualification-manifest.ts` and `scripts/release-qualification-artifact.ts` together for the new formats, policy binding, release result and advisory diagnostics. Preserve `packages/css/bench/budgets.json` and the comparator's numerical decisions byte-for-byte.
- Update `.github/workflows/publish.yml` only where needed to surface/preserve the new summaries and bindings. Preserve job dependencies, exact host, transferred tarball and credentials. Update the release-gate spec, accepted ADR/index and roadmap with activation evidence; do not rewrite historical decisions.
- Extend `packages/css/test/release-host-budget-policy.test.ts`, `release-host-budget-report.test.ts`, `release-qualification-artifact.test.ts`, `release-policy.test.ts` and manifest/contract fixtures. Verify valid advisory failures can coexist with release-policy qualification; each blocking failure rejects; every missing/duplicate/unknown/incomplete row rejects; stale formats and tampered classifications/policy/registry digests reject in both jobs. Preserve existing source/artifact/tarball rejection controls.
- Run focused policy/report/manifest/workflow checks and the existing package checks. Collect one fresh complete host report against the final source/artifacts; record the real result even if warm transform blocks. Commit the complete policy implementation once its own tests pass. Do not label M10.5 complete or publish without a qualifying fresh report and hosted prerequisites.

### Review verification

- [x] Current source and exact registry were inspected; no budget or enforcement was changed.
- [x] All 21 IDs/selectors are explicitly assigned once: 11 blocking and 10 advisory.
- [x] All baseline and threshold objects are retained unchanged in the proposal.
- [x] Synthetic controls executed the existing evaluator: all-pass input accepted; each of 21 individually failed rows rejected. These prove current enforcement, not native performance or the proposed implementation.
- [x] Alternatives, weaker-protection risk, conditional amendment interaction and remaining release blockers are explicit.
- [ ] Alan P Currie accepts this exact enforcement reduction and partition.
- [ ] Later implementation and fresh qualification prove the approved policy; no activation is claimed now.
