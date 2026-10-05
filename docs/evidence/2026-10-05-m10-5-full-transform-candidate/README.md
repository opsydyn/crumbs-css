# M10.5 Task 4 evidence

See the [assessment](../../assessments/2026-10-05-m10-5-full-transform-candidate.md) and [qualification receipt](qualification.json). `collection.json` pins one owned artifact, original/copied inventories, tooling/runtime hashes and 16 gzip reports. Reports contain complete source/receipts/results rather than source-only hashes. The copied transformer and private adapter are archived as text.

From the repository root, run `node docs/evidence/2026-10-05-m10-5-full-transform-candidate/verify.cjs` to replay archived parity, explicit outcomes and negative controls. It uses the already-installed TypeScript compiler to interpret emitted semantic goldens. Add `--live` while the recorded temporary package exists to check current restoration inventories and tooling hashes. An expired temporary copy prevents live verification; archived verification remains available.

To recollect intentionally, set `CRUMBS_AUDIT_NODE_FLOOR` to an exact Node v22.0.0 executable, then run `bun docs/evidence/2026-10-05-m10-5-full-transform-candidate/collect.ts`. It creates an owned disposable package, uses the same artifact/path across variants and overwrites the reports/collection receipt. Re-run the verifier afterward; qualification counts describe this collection rather than authorising a new performance claim.

This is controlled upstream full-transform qualification. Actual incremental Expo/Metro, host budgets, production admission and device evidence remain separate. Next: **M10.5 Task 5**. Android remains last.
