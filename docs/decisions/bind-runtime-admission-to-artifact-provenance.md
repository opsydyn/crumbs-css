---
status: proposed
date: 2026-10-17
decision-makers: Alan P Currie
---

# Bind runtime admission to artifact provenance

## Context and drivers

The M10.5 kernel feasibility proof stopped because ordinary token CJS code newly reached a generated interop filename outside the current runtime family allowlist. Its import graph passed and retained membership showed only a 554-byte synthetic CJS helper. This was not the earlier observed authoring dependency leak. However, a passing import graph alone cannot exclude compiler code bundled inside a local file, and a shared helper filename cannot distinguish import-free glue from Node loader glue.

The approved [assessment](../assessments/2026-10-17-m10-5-runtime-provenance-contract.md) recommends a separate correctness contract. The [written design](../superpowers/specs/2026-10-17-m10-5-runtime-provenance-design.md) defines its trust boundary, capture, metadata, migration and failure behavior. This proposed decision changes neither the accepted [consumer-scoped release policy](anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md) nor the disposition of the parked [kernel](stage-a-private-compiler-free-contract-kernel.md).

Drivers: preserve runtime isolation and public compatibility; distinguish source origin from filenames; bind qualification to actual installed bytes; fail closed on unknown/stale evidence; keep compiler and Effect code out of ordinary runtime; separate correctness, performance and release admission.

## Proposed decision and alternatives

Prefer reviewed source/module policy plus a source-bound generated artifact receipt, retaining independent packed-import and consumer-map validation. Generate internal `dist/runtime-provenance.json` during the normal existing build layout. It creates no public export or runtime import. The reviewed policy owns admission; the receipt only records observations. Release qualification supplies an expected receipt digest outside the installed package, bound to exact source and tarball identity.

| Option | Benefit | Cost and disposition |
| --- | --- | --- |
| Retain filename families indefinitely | Simple and conservatively compatible with current shipping outputs | Cannot represent new reviewed layouts accurately. Remains active until a replacement is approved and qualified. |
| Expand or disguise helper names | Minimal mechanical change | Cannot establish provenance or distinguish Node glue; reject as the replacement contract. |
| Source-policy/byte-bound provenance plus existing import and map checks | Explicit code ownership across packaging changes; detects hidden bundled members as well as external edges | Adds build/metadata and policy lifecycle, and requires real map qualification. Preferred direction; not yet accepted or implemented. |

No new library dependency, engine floor, public option, serialized product API or per-render validation is introduced. Keep exact source-based declarations and all runtime bindings/registries. Do not modify the parked kernel, chunk grouping, release thresholds or existing evidence to make the new checker pass.

## Consequences

- Add a reviewed exact runtime-source/helper policy and a deterministic generated sidecar. Helper or toolchain changes may require policy review; unknown helpers fail rather than inheriting a prefix exception.
- Add an owned whole-build capture/finalization barrier. Concurrent, interrupted, partial, stale and skip-clean builds become explicit lifecycle cases; a failed build must invalidate the sidecar.
- Platform qualification must connect map sources/content to verified installed artifact rows. Existing map forms that cannot provide this connection remain unqualified; do not invent a permissive fallback.
- Historical packages remain replayable through exact artifact-pinned legacy profiles. Such a result cannot satisfy the current-release provenance field.
- A self-consistent receipt is not independent execution attestation. Trusted source/build review and the external source/tarball/receipt pin remain necessary. Provenance qualification does not close the warm-transform gap or authorize a release.

## Implementation outline for the later reviewed plan

- **Build paths:** proposed `packages/css/build.mjs`, `build/provenance-capture.mjs`, `build/provenance-finalize.mjs`, `build/runtime-provenance-policy.json`; existing `packages/css/tsdown.config.ts` and build/dev/prepack commands. Use the installed public awaited tsdown API without rearranging its existing JS or DTS graphs. Use a wrapper-only `CRUMBS_INTERNAL_PROVENANCE_SESSION` handoff, owner lock and temporary per-config/format receipts; restore and clean owned state in `finally`. Run the existing TypeScript audit in an awaited repository Bun subprocess rather than importing TypeScript from the Node22.0.0 wrapper.
- **Verifier paths:** proposed `scripts/runtime-artifact-provenance.ts`; existing `scripts/packed-runtime-graph.ts`, `runtime-bundle-contract.ts` and `packed-distribution-contract.ts`. Reuse import auditing and canonical installed/map path resolution. Add strict `verifyProvenancedRuntimeBundles`; keep legacy replay separate, never chosen after failed strict validation.
- **Callers:** migrate current `scripts/playground.ts`, `playground-sdk-candidate.ts`, `qualify-sdk56-tarball.ts`, `expo-app-workers.ts`, and the normal `scripts/release-qualification-artifact.ts` assembly/verification integration, its `packages/css/bench/release-qualification-manifest.ts` schema and `scripts/release-host-budget-report.ts` artifact inventory. Use a required v3 manifest provenance record and rederived qualification result before current-release sealing; retain v2 only for explicit historical replay and preserve all other checks.
- **Tests:** extend `packages/css/test/runtime-bundle-contract.test.ts`, `packed-runtime-graph.test.ts`, `packed-distribution-contract.test.ts` and release-qualification tests; add focused build-capture/finalization and receipt validation tests. Include real bundled-inline contamination, byte/receipt tampering, helper/format negatives and lifecycle failures.
- **Dependencies:** no additions or upgrades. Existing build/qualification-only dependencies remain outside emitted ordinary runtime. Public exports and source-based declaration ownership remain unchanged.
- **Migration:** establish/review initial source/helper membership on the unchanged layout, qualify capture and byte preservation first, then strict packed/platform checks and current-release integration. Stop at the first unsupported capture/admission assumption. Preserve the original legacy guard and archived rejection if the complete contract cannot qualify. A detailed implementation plan is still required after written-design review.

### Verification

- [ ] Every actual emitted JS file has one complete generation/owner/membership record and exact byte/format binding; partial, stale, duplicate and changed-input builds fail without a usable sidecar.
- [ ] Reviewed source/helper policy is separate from generated claims; hidden inline compiler code and external/Node/advanced contamination reject regardless of filenames.
- [ ] Missing/forged/rehash-adjusted receipts fail against external source/tarball/receipt pins; installed path escapes and wrong package instances reject.
- [ ] Exact baseline/capture JS and declaration bytes agree; no public binding, registry, source-based declaration, Node22.0.0 or dependency contract changes.
- [ ] Real SDK56/57/58 packed platform maps and both workspace SDK58 worker contexts satisfy strict artifact/content admission; absent or mismatched content fails without fallback.
- [ ] The historical guard and stopped-kernel verifier reproduce their original results; legacy profiles cannot fill current-release `runtimeProvenanceQualified`.
- [ ] The whole correctness outcome is committed with failed/unrun stages; no kernel retry, host exception or publication is implied.

## Status and revisit conditions

Proposed, awaiting written-design review. The user approved preparation of this design after `d98361e`; this does not approve implementation or accept the ADR. Nothing in this record supersedes an accepted ADR. If capture completeness or real map-to-installed-byte identity cannot be established with the current toolchain and unchanged output, park this replacement and retain the old guard. Revisit helper profiles on toolchain changes. A future compiler performance candidate requires its own credible mechanism, bounded approval and unchanged gates.
