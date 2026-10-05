# M10.5 per-pass guard receipts A/B evidence

[Assessment](../../assessments/2026-10-05-m10-5-guard-receipts-ab.md). Repaired private candidate; sharing rejected as a performance improvement. No production/cache/device gate changes.

- `report.json`, `raw/`, `receipts/`: fixed 90-process matrix, candidate provenance and complete measured bytes.
- `summary.json`: reproducible timings, phase/read accounting, paired sharing ratios and endpoint RSS.
- `controls.json` and `control-receipts/`: supplementary controls outside timed measurement; package rename is a restart boundary.
- `excluded-unrepaired-report.json`, `excluded-unrepaired-summary.json`: initial candidate results, superseded after review found sampling fallback error. These are explicitly excluded; their complete raw process files remain at the original retained scratch paths.
- `logs/`: final measurement/checks, RED/GREEN and excluded pilots and copied-fixture setup failures.
- `verification.json`: final checks and review disposition.
- `archive-manifest.json`: exact membership and SHA-256 hashes, checked before replay.

Replay with `python3 docs/evidence/2026-10-05-m10-5-guard-receipts-ab/verify.py`. `--live` additionally checks original measured paths. No network or npm installation is needed for offline archive replay. Measured paths in receipts are not normalised. Runtime-floor, host-budget and native/device acceptance remain separate.
