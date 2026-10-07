# M10.5 fail-closed compiler-input and Metro restore evidence

This packet records the correctness-only follow-up to the rejected retained esbuild-session candidate. Its source guard now drains contexts when allowed source bytes change. Expo/Metro edit, import-removal and restore responses match independent fresh transforms across entry, source, resolved inputs, native metadata and final result.

`qualification.json` contains the four-stage control summary. `metro-observations.json` retains the selected transform and fresh-reference receipts; `transform-trace.jsonl` preserves the worker records used to distinguish a newly executed transform from an exact prior Metro cache hit. `restoration.json` records restored file and symlink hashes. `source-manifest.json` pins the changed harness and regression-test source, and `environment.json` records the runtime identities. The archive manifest pins these evidence files.

The restored entry is served from Metro's earlier exact transform cache entry. The selected trace has the original entry hash and the same source, resolved-input, metadata and result hashes as a fresh reference. Entry edits and import removal each exercise the candidate's `source-changed` fresh fallback. The owned Metro process exits successfully, no descendants survive, and every fixture file and link is restored.

The candidate artifact itself was built in the disposable qualification root and is not included in this packet. Its SHA-256 and source inventory digest are retained in `qualification.json`; the repository source and dependency lock are pinned by `source-manifest.json`.

This packet proves invalidation and Metro output parity only. It contains no new performance measurements, host-budget result, simulator/emulator acceptance, or physical-device evidence. The prior context-reuse performance rejection remains in force.

## Verification

From the repository root, run:

```sh
bun docs/evidence/2026-10-07-m10-5-fail-closed-metro-parity/verify.cjs
```

The verifier checks archive hashes, source hashes, every transform identity against its fresh reference, the prior-cache-hit classification on restore, fixture restoration, and clean Metro shutdown.

The full CSS suite currently has one separate development-metadata identity mismatch in `benchmark-workloads.test.ts`; see the [assessment](../../assessments/2026-10-07-m10-5-fail-closed-metro-parity.md). The production-mode control passes. That issue was not changed as part of this M10.5 slice.
