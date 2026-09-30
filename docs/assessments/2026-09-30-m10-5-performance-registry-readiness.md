# M10.5 Performance Registry Readiness Audit

Date: 2026-09-30

Source revision: `2c6b1fe`

## Finding

The budget registry is structurally valid and its retained baseline selectors have no drift, but whole-registry readiness is correctly false. Of 26 entries, 21 have recorded baselines and approved thresholds. Four unresolved active performance gates still need device evidence. A fifth pending threshold belongs to `runtime-emitted-bytes`, which M4.6 already retired as a diagnostic; the current registry model nevertheless counts it as a readiness blocker.

## Current evidence

`bun run budgets:validate` exited 0 with `valid: true`, `registryReady: false`, `performanceQualification: "not-run"`, and no baseline issues. `bun run budgets:readiness` exited 1 as designed and reported five pending thresholds, three missing baselines, and two diagnostic baselines. This is an incomplete qualification state, not a validation failure or a current performance result.

| Registry entry | Baseline / threshold state | What is needed |
| --- | --- | --- |
| `js-frame-time` | Missing / pending | Release-Hermes JS-frame samples. M1.6 calls for both iOS and Android; Android remains parked. |
| `ui-frame-time` | Missing / pending | Release-Hermes UI-frame samples under the same M1.6 device matrix. |
| `allocation-bytes` | Missing / pending | A controlled allocation probe with retained release-Hermes device evidence. |
| `retained-memory-bytes` | Diagnostic, 2 repetitions / pending | Replace the browser/lifecycle-only evidence with at least five controlled, forced-GC release-Hermes device repetitions. |
| `runtime-emitted-bytes` | Diagnostic, 5 repetitions / pending | No new performance threshold is justified: M4.6 explicitly classifies this historical compatibility graph as diagnostic-only. Keep its verified selector and comparison visible. |

The 21 recorded/approved metrics cover runtime initialization, cold and warm transforms, incremental rebuilds, editor/compiler workloads, and the six current ESM/CJS runtime-graph budgets. The two Node v22 initialization baselines are already among these recorded metrics. They do not substitute for M10.5's separate full host-budget suite, which requires the exact Node v22.0.0 executable. The retained M10.5.2 receipt recorded v22.16.0 and v24.15.0 as available and rejected v22.16.0 for that gate; this shell currently reports Node v24.15.0.

## Registry-model discrepancy

M4.6's [historical compatibility disposition](2026-09-21-m4-6-historical-compatibility-budget-disposition.md) says `runtime-emitted-bytes` no longer contributes to active threshold approval or performance qualification. The comparison path does keep diagnostic results separate. However, `assessBudgetRegistry` currently collects every `pending-review` threshold and requires every metric in the registry to have a recorded baseline and approved threshold before readiness; the schema applies the same condition before setting the registry `active`. As a result, this diagnostic-only entry still blocks activation even though it is not an active performance gate.

The next registry change should make active budget membership distinct from verified diagnostic reporting. Preserve the historical selector, source evidence, and diagnostic comparison; exclude it only from active readiness/approval membership. Do not manufacture an approved threshold for an obsolete workload. This audit does not change the registry or its schema.

## Disposition and limits

No new baseline or threshold was created. JS/UI frames, allocations, retained memory, simulator rendering, screenshots, physical-device acceptance, and screen-reader acceptance remain unqualified pending device access. Android stays parked. The exact Node v22.0.0 host-budget suite remains the final M10.5 gate.

Next recommended roadmap slice: **M10.5 registry membership correction** — model diagnostic-only entries separately from active gates, add tests proving they remain verified/reported but do not block readiness, and preserve the four device-gated active budgets as incomplete. Keep the Node v22.0.0 host-budget gate last and Android parked.
