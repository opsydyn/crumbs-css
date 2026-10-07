# M10.5 host-budget policy review against current evidence

- Date: 2026-10-07
- Roadmap: M10.5
- Status: accepted policy reaffirmed; release-workflow enforcement is not present
- Product source revision: `dbf491d12c5700f50c77d646873bece3bf341f20`
- Product source identity: `4e519e759379541fbdc557e61e3968e59c94c6f3e617508271f4ace56d6ef70d`

## Decision

Keep the accepted M10.5 runtime-budget policy unchanged. The current nine host-budget failures remain blockers to M10.5 performance qualification. The evidence does not establish that they currently block npm publication: the publish workflow does not run the full host-budget comparison. Do not describe M10.5 as release-qualified, and do not describe the failures as an automated release gate unless that policy is separately decided and implemented.

The accepted [runtime-budget policy ADR](../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md) already requires the existing host/package/compiler/editor gates, selectors, limits, allowed regressions, and enforcement to remain in force. It admits Expo/Hermes results as reference evidence and does not approve a baseline replacement, host-gate retirement, or threshold relaxation. The [current-source candidate review](2026-10-07-m10-5-api-preserving-candidate-selection.md) records 12 passes and nine failures across the 21 approved host comparisons after the matched Expo/Metro requalification. The nine failures remain four runtime-initialisation metrics, warm transform, and four theme graph metrics.

## Qualification and publication are separate

| Concern | Current evidence | Decision |
| --- | --- | --- |
| M10.5 performance qualification | Nine of 21 approved host comparisons fail; the matched Expo/Metro comparison passes. | M10.5 remains unqualified until the failures pass or a separately reviewed per-metric policy changes. |
| Automated npm publication | `.github/workflows/publish.yml` runs release preflight and `release:check`. The latter runs package build, typecheck, tests, the native-style smoke benchmark, and pack dry-run. Neither invokes `measure:host-budgets` or `budgets:readiness`. | The current workflow does not enforce the full host-budget report as a publication gate. This review does not add that enforcement. |
| Registry readiness | `budgets.json` remains `thresholds-pending-review`; the registry includes separate pending device and memory domains. `budgets:validate` checks registry/evidence consistency and reports `performanceQualification: not-run`; readiness is not a current-source benchmark. | Keep registry validity, registry readiness, host qualification, and release publication as distinct claims. |

The publish workflow and scripts were inspected directly. No host-budget command was found in the workflow or `release:check` definition. This is a statement about current automation, not a claim that a release was attempted or that the release checks pass.

The current worktree could not rerun `budgets:validate` or `budgets:readiness`: both commands stopped while resolving `effect/Schema`. The worktree's dependency installation is incomplete. The latest retained current-source host report records successful registry validation during collection; this review makes no new registry-validation claim.

## Architecture and policy implications

No API-preserving remediation candidate has qualified under the current limits. The accepted policy therefore provides no basis to waive the nine failures using the Expo/Hermes reference cohort, and this review does not authorize a compatibility or architecture change. Any future change to a metric's scope, selector, threshold, or enforcement needs a separate per-metric review with matched evidence. Any architecture proposal must preserve the synchronous public API and validation behavior unless a breaking change is explicitly considered and approved.

No production source, public API, package dependency, budget value, baseline, selector, release workflow, or enforcement rule changed. Physical-device work remains deferred. **M10.5 remains open and unqualified.**

**Next recommended numbered slice: M10.5 — make an explicit release-policy decision on whether the full host-budget report should become a prerequisite in `release:check` or remain an M10.5 qualification gate only. Define the exact selectors, environment, and enforcement behavior before changing the publish workflow; keep all metric values unchanged.**
