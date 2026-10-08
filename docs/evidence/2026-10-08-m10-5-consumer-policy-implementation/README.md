# M10.5 consumer policy implementation evidence

One complete policy slice, approved and executed inline. [Verification receipt](verification.json), [complete host report](host-report/comparison.json), [actual verifier output](host-report-check.log), [review and repair](whole-candidate-review.md), [assessment](../../assessments/2026-10-08-m10-5-consumer-policy-implementation.md).

The complete real report has 21 matched rows, no incomplete rows, stable source/artifacts/policy and one blocking numerical failure: warm-transform-ms. Ten blocking rows pass. Two advisory token graphs pass; eight advisory startup/theme graphs fail and remain recorded failures. Numerical contracts and approved baselines are unchanged. Full checks: build/typecheck and 1581 package + 23 Storybook tests; focused checks: 70 passing.

The report retains precommit base revision 2391eecf2d8126a3e6344ec96f010c0d70f6558b and final source digest 0e12a12c4b770dae39a542c4d2c59f467a62402148fbd8b5cc26eb3e3d08a9f0. It cannot qualify the later implementation commit or a release tag. No manifest or publication is admitted. Workflow qualification must measure the exact release commit independently.

`aborted-attempt-1/` is explicitly incomplete. Its scaffold was copied while a verification rebuild was in progress; the incomplete copy prevented Metro from resolving metro-plugin.cjs. The owned scaffold was recreated serially after the final build and all 149 file hashes checked before the sole complete run. Partial measurements do not establish performance qualification. No source change or numerical selection occurred between attempts.

Synthetic tests exercise policy and integrity rejection; they are not runtime-performance evidence. The initial synthetic graph samples were corrected to genuine deterministic graph data following review. Evaluator controls cover all ten advisory failures independently; integration controls use eight valid advisory failures plus two passing token graphs. Source/run manifests, raw reports and check logs remain distinct.

Physical-device, Hermes, Android, spoken-reader and mobile threshold acceptance is not claimed. Hosted runner registration, warm-transform remediation and exact release-tag qualification remain open. No push, merge, tag or npm publication.

Captured `.log` output is retained byte-for-byte. Local evidence attributes exclude tool whitespace from diff style checks; authored implementation checks remain unchanged.
