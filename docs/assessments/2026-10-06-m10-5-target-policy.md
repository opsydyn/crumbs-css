# M10.5 consumer-evidence and target-policy review

Date: 2026-10-06. Reference implementation: `56719d348dcbdacaadef792ab16b6469f166de54`. Scope: review existing evidence and target policy; no new native runs or performance qualification.

## Evidence finding

The [packed Expo/Hermes study](2026-10-06-m10-5-expo-hermes-runtime.md) establishes a complete controlled software-device cohort: six release artifact matches, 30 retained cold-process samples and six excluded warm-ups. A fresh standalone report validated the retained source, input and proof inventories with no failures. The reference is one ten-card workload, one software-device configuration per platform and one cohort. Its values are observations, not approved baseline selectors or limits.

Core adds 33,860 mapped JavaScript bytes; compatibility adds 92,687. Whole Hermes bundle deltas are 50,072/50,328 bytes for core and 127,388/127,400 bytes for compatibility on iOS/Android. These are three distinct size measures: package emitted graph, mapped application JavaScript contribution, and whole-bundle Hermes delta. None is a conversion or replacement for another.

The iOS median entry-to-layout deltas are +0.111 ms (core) and +0.428 ms (compatibility). Android deltas are -5.017/-6.576 ms with broad within-cell variation. Neither platform supplies a general speed claim or a portable latency ceiling. These samples do not measure native startup, presentation, frames, allocation or retained memory. Physical-device acceptance remains deferred.

## Existing gates

The registry has 25 metrics. Validation reports a valid registry, but readiness remains false: JS/UI frame time, allocation and retained-memory thresholds remain pending; three baselines are missing and retained memory is diagnostic. Validation is structural, not execution of performance qualification.

The retained [rejected-candidate comparison](../evidence/2026-10-06-m10-5-runtime-boundary/host-budgets/comparison.json) reports 11 passes, nine failures and one Expo environment mismatch. It identifies candidate revision `7eb51d89225802f57f51cb16259d8c96c61c1bfe` plus its recorded working-tree state; these values are not a newly executed current-checkout comparison. The unresolved metric map below preserves its results and the current approved limits. Both absolute limits and allowed regressions continue to apply under the existing comparator.

| Existing metric | Approved maximum | Allowed regression | Retained candidate median | Retained result |
| --- | ---: | ---: | ---: | --- |
| `runtime-initialization-node22-esm` | 7.553 ms | 20% | 8.599 ms | fail |
| `runtime-initialization-node22-cjs` | 4.083 ms | 20% | 5.209 ms | fail |
| `runtime-initialization-current-esm` | 3.067 ms | 20% | 4.732 ms | fail |
| `runtime-initialization-current-cjs` | 2.444 ms | 20% | 3.646 ms | fail |
| `warm-transform-ms` | 6.514 ms | 15% | 9.681 ms | fail |
| `incremental-rebuild` | 137.506 ms | 10% | 131.558 ms | incomplete-environment-mismatch |
| `runtime-theme-core-esm-graph-bytes` | 17271 B | 0% | 64899.000 B | fail |
| `runtime-theme-core-cjs-graph-bytes` | 17641 B | 0% | 65747.000 B | fail |
| `runtime-theme-compatibility-esm-graph-bytes` | 44017 B | 0% | 164730.000 B | fail |
| `runtime-theme-compatibility-cjs-graph-bytes` | 44764 B | 0% | 172137.000 B | fail |

No existing metric is passed, reclassified, replaced or waived by the consumer study. Warm full-transform and matched Expo incremental rebuild remain compiler/tooling concerns; changing runtime targets cannot resolve them.

## Policy alternatives

| Option | Benefit | Cost and evidence limit |
| --- | --- | --- |
| Retain existing gates; admit the study as reference evidence | Preserves approved contracts and makes the software-context result usable without invented limits | Existing host failures remain; M10.5 cannot close on this study |
| Replace selected host gates with consumer targets | Could align enforcement more closely with the React Native product | Requires explicit per-metric retirement, calibrated replacement limits and enforcement; the present cohort supplies none of those approvals |
| Add mobile limits while retaining host gates | Adds consumer coverage without discarding host history | Numeric limits still require repeatability and regression-policy decisions; mobile passes would leave host failures unresolved |

Accepted policy (explicit session approval, 2026-10-06): retain existing gates and accept the consumer cohort as reference evidence. Do not round today's measurements into ceilings or infer permissible growth from them. Before a numerical target proposal, capture executable Node/npm versions directly, repeat the matched software-context measurements in independent cohorts, and state each target's environment, workload, absolute limit, allowed regression and comparison rule. Retain every cohort separately, including failures; do not pool incompatible platforms or select the best run. A deterministic artifact-byte target and a noisy entry-to-layout target may need different repeatability/enforcement criteria.

A repeatability requirement is an evidence-admission condition, not a promise that any fixed sample count establishes a tail guarantee. A proposed target must explain why its measured workload and tolerated regression serve the product, not merely why its current values fit below the limit.

## Delivery boundary

The stakeholder approved the recommendation after this concrete review. [The existing policy ADR](../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md) and its index record acceptance. This accepts the evidence policy, not numerical mobile limits or M10.5 closure. The broader native-compiler ADR remains proposed. Next numbered slice: **M10.5 — mobile-target calibration and repeatability plan**, including direct executable-version capture before repeat cohorts. Budget/API/dependency files remain unchanged.

The [machine-readable review snapshot](../evidence/2026-10-06-m10-5-target-policy/review.json) identifies the registry digest, consumer study and retained-candidate provenance. It is a review receipt, not a new measurement baseline.
