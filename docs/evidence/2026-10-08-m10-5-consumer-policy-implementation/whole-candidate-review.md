# Whole-candidate review

Fresh read-only review by `m105_consumer_policy_review_fallback` using GPT-6.1-sol high. The frontier-model attempt failed before reviewing because of a model usage limit. This is the only completed review. Base/HEAD: `2391eecf2d8126a3e6344ec96f010c0d70f6558b`; actual tracked candidate diff, including intent-to-add files, was reviewed.

## Assessment: with fixes

One Important finding; no Critical or Minor findings. Closed partition, policy bindings, independently rederived summaries, tarball authority, credential/tag/host/source checks and release documentation were judged sound. Steps 9–10 were intentionally pending.

## Important finding and verified repair

At `scripts/release-host-budget-report.ts`, numerical rederivation consumed only selected raw fields. A read-only probe admitted missing graph byte/artifact fields and negative import timings. Further probes admitted inconsistent graph samples, negative fractional bytes, duplicate graph artifacts, changed startup entry hashes, failed receipts and wrong per-sample Node identities. Missing scenarios and duplicate startup cells already rejected. The initial synthetic fixture's graph samples also disagreed with retained graph totals/artifacts.

The reviewer required boundary validation of graph/runtime cells, graph artifact provenance and deterministic bytes, startup hash/Node/receipt/nonnegative timing identity and retained summaries, preserving legitimate signed memory deltas and all comparator maths. Regression `rejects rederived and resealed malformed runtime evidence` failed before the fix and passed after it at both report/publisher boundaries. The publisher validates graph evidence against the unpacked transferred tarball, preserving no-local-dist and different-local-dist acceptance. Integration fixtures retain genuine graph values with eight failing advisories and two passing token graphs; unit policy tests retain the all-ten-failures admission case. Focused repaired suite: 70 passing, zero failing. No second review requested.

## Behaviours declined to judge

1. Fresh full-host qualification and final dated assessment/evidence/roadmap/commit: Steps 9–10 intentionally follow review.
2. Actual host performance or warm-transform success: synthetic controls cannot establish timing qualification.
3. Physical-device, Hermes, Android, screen-reader and mobile threshold acceptance: explicitly deferred.
4. Hosted runner registration/publication: separate prerequisites, no publication authorised.
5. Runtime optimisation or replacement thresholds: approved scope preserves contracts.
6. Stronger validation of excluded Effect diagnostic summaries: unchanged diagnostic behaviour does not determine the 21-row partition.
7. Pre-existing hostile symlink archive extraction: mechanics unchanged; existing tarball protections reviewed for preservation.
8. Earlier build/typecheck/full-suite results: ledger evidence inspected, not rerun by read-only reviewer.

Executor rulings on every item are retained in the execution ledger. No deferred Minor findings.
