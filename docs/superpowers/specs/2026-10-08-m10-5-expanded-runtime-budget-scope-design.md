# M10.5 expanded-runtime budget-scope decision proposal

- **Status:** Scope approved on 2026-10-08; implementation awaits written plan review and complete conditional qualification.
- **Date:** 2026-10-08
- **Roadmap:** [M10.5](../../roadmap.md)
- **Reviewed source:** `ecbfc4481bf053bec23fe3f7d3b51daf80c493cc`
- **Shipping identity:** `8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76` (694 files)
- **Deliverable:** A concrete policy proposal, not an implementation or release qualification.

## Intent and recommendation

Preserve the complete synchronous React Native styling API while making its performance contract explicit for large design-system teams. Recommend a versioned admission policy for the **four expanded theme graph metrics only**, preserving zero growth after baseline admission. Keep all other host metrics, the 21-row release gate and the distinction between host and native acceptance.

The [scope review](../../assessments/2026-10-08-m10-5-budget-api-scope.md) reproduces all four M4.6 admitted artifact hashes. Their API preceded conditions, expressions, runtime Sprinkles and component contracts/extensions. Current minification-only graphs still exceed those limits by about half their size. Consolidation and compact-program experiments have not supplied a qualifying route under the original limits. This is evidence for a scope decision, not proof that the original objective is impossible.

The accepted [Expo consumer-evidence ADR](../../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md) requires explicit per-metric review before changing host values or enforcement. Approval of this spec would amend its unchanged-host rule **only for the four rows below**, subject to the admission conditions here. It would not approve mobile targets or accept the broader proposed compiler ADR. The [release-gate design](2026-10-07-m10-5-host-budget-release-gate-design.md) remains governing: every active host comparison must pass on the matched runner.

## Approaches considered

1. **Expanded-feature admission, unchanged API — recommended.** Explicitly reset four byte baselines after independently qualifying a compact complete candidate, retain their original histories, and freeze the new baseline at zero growth. This revises four performance guarantees and must be described as a policy change.
2. **Retain every original limit.** Continue materially different architecture research with the complete API and publication blocked. Valid if the original footprint is an overriding product requirement; no qualifying route is currently evidenced.
3. **Replace host checks with mobile checks or drop synchronous capabilities.** Excluded. Mobile calibration does not support a numerical latency target, and physical-device work is deferred. Narrower inputs, registration requirements or async loading would change supported behaviour.

The recommendation addresses feature scope without presenting a policy revision as an optimisation. Actual code improvement, new baseline admission and the five remaining timing failures require their own evidence within one later complete batch.

## Exact proposed byte policy

Policy identity: **`crumbs-host-budgets-2026-10-08-expanded-runtime-v1`**. Keep existing metric IDs, selectors, formats, units, environment classes and full local graph measurement. Do not add or remove a host row.

| Metric ID | Selector | Existing ceiling | Minification-only reference | Proposed admission cap | Post-admission regression |
| --- | --- | ---: | ---: | ---: | ---: |
| `runtime-theme-core-esm-graph-bytes` | `runtime.theme-core.esm.graph-bytes` | 17,271 B | 35,205 B | **39,000 B** | **0%** |
| `runtime-theme-core-cjs-graph-bytes` | `runtime.theme-core.cjs.graph-bytes` | 17,641 B | 35,426 B | **39,000 B** | **0%** |
| `runtime-theme-compatibility-esm-graph-bytes` | `runtime.theme-compatibility.esm.graph-bytes` | 44,017 B | 86,996 B | **96,000 B** | **0%** |
| `runtime-theme-compatibility-cjs-graph-bytes` | `runtime.theme-compatibility.cjs.graph-bytes` | 44,764 B | 89,711 B | **99,000 B** | **0%** |

Cap derivation: `ceil(referenceBytes × 1.10 / 1000) × 1000`. The 10% allowance is a proposed engineering judgement to accommodate compatibility-preserving output work, including public method shapes and generated binding glue. It is **not** measured noise, a mobile UX tolerance or a user-approved growth allowance. The round-up quantum is 1,000 decimal bytes; ESM/CJS are separate graphs. These caps require about **39.6–42.4%** reduction from today's unminified shipping graphs.

The caps are not new baseline values. Let `B` be the actual graph size of the independently qualified candidate and `C` its table cap. Admission requires `B ≤ C`; the recorded baseline is exactly `B`, with `absoluteMax = C` and `maxRegressionPercent = 0`. Later measurements `M` must satisfy **both `M ≤ C` and `M ≤ B`**. If a candidate is admitted at 35,205 B, even 35,206 B fails despite the larger absolute cap. The margin is available only during this initial admission; it does not create future automatic headroom. Intentional later feature growth requires another explicit per-metric decision.

The [machine-readable proposal](../../evidence/2026-10-08-m10-5-budget-scope-proposal/proposal.json) preserves all original row metadata, the four proposed caps and the seventeen unaffected host rows. It is a review artifact and must not be loaded as an active registry or release-policy file.

## Gates that remain unchanged

| Timing metric | Existing baseline | Absolute maximum | Allowed regression |
| --- | ---: | ---: | ---: |
| `runtime-initialization-node22-esm` | 6.293542 ms | 7.553 ms | 20% |
| `runtime-initialization-node22-cjs` | 3.401791 ms | 4.083 ms | 20% |
| `runtime-initialization-current-esm` | 2.555625 ms | 3.067 ms | 20% |
| `runtime-initialization-current-cjs` | 2.036500 ms | 2.444 ms | 20% |
| `warm-transform-ms` | 5.664125 ms | 6.514 ms | 15% |

Displayed timings are rounded for readability. Preserve the registry's exact values, baseline evidence, workload/fixture identities, allowed regressions and comparison rules. These five retained failures do not pass merely because the byte scope changes. The other twelve unaffected host rows, including token ESM/CJS limits, cold transform, matched Metro and editor rows, are equally unchanged. Pending device metrics and the legacy 11,307-byte diagnostic also stay intact.

Host qualification remains on the dedicated Apple M4 Pro ARM64 environment: macOS 26.6.2, Darwin 25.6.0, Bun 1.4.2, npm 11.12.1, real Node 22.0.0 and Node 24.15.0, tsdown 0.21.10, TypeScript 6.0.3 and tsgo 7.0.0-dev.20260519.1. Preserve the Bun compatibility identity and all fields in `approvedReleaseHostEnvironment`. Use the existing approved Expo 56.0.4 / Metro 0.84.4 / React Native 0.85.3 incremental-rebuild scaffold and its fixture/Vanilla Extract resolution checks. No runner substitution or implicit environment equivalence is permitted.

## Deterministic baseline admission

After written-spec and implementation-plan approval, develop one complete candidate in isolation. Runtime group minification is a candidate component, not an already-qualified implementation. Preserve original entry groups, React-only externals, zero nonliteral loads, all descriptor versions, validations, diagnostics, ordering, cache semantics and public declarations. Do not externalise implementation bytes, drop features, require registration or defer supported synchronous calls.

Before provisional baseline construction:

1. Build an immutable shipping control from the reviewed source and preserve its sources, complete outputs and package identity. Differential tests must use that independent control.
2. Qualify candidate values, errors and first-error timing, getter/proxy observations, freezing and aliases, registry timing, provider identity and lazy expressions. Include changing-proxy cases from the rejected consolidation. Check public returned method names, arity, constructibility and property descriptors; namespace names alone do not establish parity. Preserve canonical focused bindings and the current single declaration graph. Test genuine Node 22 ESM/CJS and independent consumer type fixtures.
3. Produce **three clean full package builds in three fresh build processes** at the same owned canonical package path, with fixed inputs/dependencies/configuration. Retain each output before cleaning for the next build. Scan each runtime closure five times with the existing canonical scanner. Require identical reachable runtime paths/hashes/sizes across all three builds, all fifteen scans agreeing, and every proposed graph below its cap. Do not count fifteen scans of one artifact set as three independent builds.
4. Use the first build's normal five-scan `runtime-graph.json` as the baseline reader input, with the current format/environment/protocol unchanged. Retain the other two build inventories and logs as reproducibility evidence. Baseline repetitions remain five under the existing comparator; no new statistical independence claim is made about those deterministic scans.

Create provisional four-row baselines and policy bindings **only in the isolated candidate**. Source identity for the final full-host measurement includes the final proposed build configuration, registry and verifier/policy files. Baseline evidence stays outside shipping source under `docs/evidence/`. Retain failed attempts; do not select a smaller build or faster cohort to obtain admission.

Spec approval accepts the listed caps and this conditional admission rule. It does not assert the future baseline values or qualification results. The actual four `B` values are mechanically recorded from the qualifying candidate and must appear in its final admission assessment; any cap change, weaker parity requirement or nonzero growth requires a new review.

## Versioned enforcement and historical continuity

Keep the registry codec at schema version 2: this proposal changes four metric contracts, not its shape. Introduce an internal active policy record at `packages/css/bench/release-host-budget-policy.json`, decoded by `packages/css/bench/release-host-budget-policy-contract.ts`. Its own format version is 1 and its policy ID is the identity above. After admission it pins the complete **21-row** contract: IDs/selectors, scenario/measure/unit/domain/environment class, exact baseline evidence/value/repetitions and exact threshold metadata. Bind all baseline evidence hashes. Reject registry drift, missing/unapproved rows or edited baseline files against this record. Reuse the existing codec/comparator; do not introduce a second policy arithmetic implementation.

The host comparison report moves to **formatVersion 3** and carries a `hostBudgetPolicy` binding containing policy ID, policy-file SHA-256 and registry-file SHA-256. The before/after input identities and the qualification manifest carry the same binding. The release qualification manifest moves from version 1 to **version 2** for this required field. Verify these bindings against the checked-out policy/registry in both macOS qualification and Ubuntu handoff, alongside current source/artifact/raw-report/tarball checks. Under the new policy, reject absent bindings and historical version-2 comparisons/version-1 manifests; those old records remain readable evidence, never an accepted release input. Keep the tarball-only publication path and the npm credential boundary.

Preserve the original M4.6 admission document/JSON, the pre-change registry snapshot and all failed historical comparisons without editing their values or results. Retain a separate historical comparison sidecar for the new candidate against the old four limits, derived through the existing comparator and original registry snapshot. This sidecar is explicitly historical; it does not replace an active row or change the 21-row set. Do not duplicate active IDs into registry diagnostics. The existing legacy diagnostic stays present.

Amend the accepted consumer-evidence ADR and the release-gate design through dated cross-links after explicit spec acceptance; do not silently rewrite their historical decisions. The original four limits then remain historical/stated stretch objectives, while the separately accepted expanded-scope contract governs new qualification. They do not silently become passes. The wider native-compiler ADR remains proposed.

## One complete batch and activation

All runtime, startup, compiler, policy/registry and verifier changes belong to **one complete production remediation batch and final implementation commit**. Do not first ship a policy-only relaxation or minification-only candidate. Require full public behavioural/property/type checks, repository/package checks, packed ESM/CJS/type and iOS/Android/web export qualification, and existing Storybook/reference journeys on owned isolated software devices. Keep physical-device and spoken-reader acceptance separately deferred.

With the final provisional candidate registry/policy present, run the complete matched 21-row host suite, then the existing `release:check` and artifact identity checks against that candidate. Require **21 passes, zero failures and zero incomplete rows**. Retain import-plus-first-use diagnostics to detect shifted work; they do not replace unchanged startup limits. Registering a dedicated hosted runner remains an infrastructure prerequisite; local qualification is not a hosted workflow success claim. The new source and artifact identities must be stable throughout collection. If a build, baseline, policy, behaviour or timing changes afterwards, invalidate and rerun the affected qualification before admission.

If any acceptance condition fails, remove the entire candidate, including provisional baselines and policy changes, and leave the old registry/release gate in force. Retain one evidence-only rejection. If every condition passes, commit the complete batch and its admitted evidence. A documentation-only follow-up may bind report provenance to the resulting Git commit; any changed shipping bytes require new qualification. A later release still needs a fresh tag/revision-bound report on the approved runner. No push or npm publication is part of this proposal or batch.

## Affected areas for the implementation plan

- `packages/css/tsdown.config.ts`, relevant internal runtime/compiler files: implement only a complete measured candidate; no new public API or dependency.
- `packages/css/bench/budgets.json`, new internal policy record/codec, `scripts/release-host-budget-policy.ts`: four conditional baseline/cap changes and pinned 21-row policy validation.
- `scripts/measure-current-host-budgets.ts`, `scripts/release-host-budget-report.ts`, `scripts/release-qualification-artifact.ts`, `packages/css/bench/release-qualification-manifest.ts`: policy bindings, versioned reports/handoff and fail-closed replay checks.
- Existing budget, report, policy, artifact, environment and packed-runtime tests under `packages/css/test/`: extend the established suites. Use existing Effect Schema only in tooling; add no dependency.
- Dated `docs/evidence/`, assessments, the two governing policy documents and roadmap: admission/rejection receipts and immutable historical continuity. Keep draft policy out of shipped consumer reference pages.

## Required verification cases

- [ ] Candidate graph exactly at the cap is eligible; cap plus one byte rejects initial admission. A post-admission graph at `B + 1` fails even below the cap; a graph no larger than `B` passes the byte arithmetic.
- [ ] Different hashes/sizes between clean builds, absent raw data, mutated/duplicate graph records or unexpected external/nonliteral loads reject baseline admission.
- [ ] One startup or warm-transform failure blocks release even if all four new byte rows pass. An incomplete/missing/duplicate/extra row also blocks it.
- [ ] Registry/threshold/baseline edits, missing or wrong policy ID/digest, mixed old/new reports/manifests, source drift and transferred artifact/tarball changes reject qualification.
- [ ] An unchanged exact 21-row synthetic report passes validator arithmetic while pending device metrics remain pending; label this a tooling test, never product qualification.
- [ ] Full built API/method-shape, consumer types, descriptor/proxy/lazy-evaluation/property and provider/focused-binding checks pass against the independent shipping control.
- [ ] The original registry, M4.6 evidence and historical failures remain immutable and visible; the active registry still has the same 21 host IDs/selectors and seventeen unaffected rows.
- [ ] Only a complete passing candidate activates the policy. Any failed candidate leaves shipping source, registry and release enforcement restored to the control.

## Written review and next numbered roadmap item

Review this spec's **four caps, zero-growth rule, conditional baseline admission and versioned fail-closed activation**. Approval of this written proposal changes no active file by itself. It permits preparing one inline implementation plan; implementation still requires that plan's review. Until the complete batch qualifies, the current limits remain binding and publication blocked.

**Next: M10.5 — review this budget-scope spec, then prepare the single complete remediation and policy implementation plan.** Keep the five timing failures and all non-physical qualification in that batch; do not treat policy approval as M10.5 completion.

## 2026-10-08 — accepted scope; implementation plan awaiting review

Alan P Currie explicitly approved the committed proposal in this session. Acceptance covers the four caps (39,000/39,000/96,000/99,000 B), zero post-admission growth, deterministic actual-baseline admission, seventeen unchanged host contracts and versioned fail-closed enforcement. It authorises preparing the [single inline implementation plan](../plans/2026-10-08-m10-5-expanded-runtime-remediation.md); it does not admit a baseline or qualify production code. Existing registry/limits remain active until the whole candidate passes.

The [approval receipt](../../evidence/2026-10-08-m10-5-expanded-runtime-plan/approval.json) binds the exact reviewed proposal/spec and preserves their original reference files. Proposed wording above records the original decision request; this dated acceptance records its outcome. The accepted Expo ADR and release-gate design receive dated conditional amendments; the wider compiler ADR stays proposed.

**Next: M10.5 — review the complete implementation plan, then execute inline as one production batch.** Physical-device and spoken-reader work remain deferred; no push/publication.
