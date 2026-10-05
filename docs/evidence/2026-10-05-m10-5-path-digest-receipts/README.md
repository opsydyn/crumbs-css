# M10.5 immutable path-digest receipt evidence

[Assessment](../../assessments/2026-10-05-m10-5-path-digest-receipts.md). Private three-control experiment, capacity 8; no production or native/device gate changes.

- `report.json`, `raw/`, `receipts/`: fixed 135-process matrix, code/artifact provenance and complete measured bytes.
- `summary.json`: deterministic paired ratios, warm/cold timings, phase/read accounting and endpoint RSS.
- `code/qualification-probe.cjs`: hash-verified measured probe, including actual child flags.
- `controls.json`, `control-receipts/`: 21 supplementary cases, excluded from timing summaries.
- `logs/`: matrix, separate pilot, focused RED/GREEN and final verification logs.
- `verification.json`: final checks and review disposition.
- `archive-manifest.json`: exact membership and SHA-256 hashes.

Replay: `python3 docs/evidence/2026-10-05-m10-5-path-digest-receipts/verify.py`. `--live` additionally checks original measured artifact/shipping paths. No npm/network is required for offline replay. Absolute receipt paths remain unchanged. Package rename is a worker-restart boundary; its in-process fresh results are not claimed equal to a newly loaded worker.
