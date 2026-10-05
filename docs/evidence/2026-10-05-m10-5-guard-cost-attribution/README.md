# M10.5 guard attribution evidence

[Assessment](../../assessments/2026-10-05-m10-5-guard-cost-attribution.md). Diagnostic capacity-8 matrix, not production optimisation/admission.

- `report.json`: frozen 90-process matrix, candidate/fixture provenance, original shipping inventory and raw hashes.
- `raw/` and `receipts/`: complete measured records and deduplicated source/input/native-metadata/full-result bytes. Source dictionary entries contain text despite `.json.gz` suffix.
- `summary.json`: deterministic verifier-derived warm/cold phase medians, paired observer ratios, logical read bytes, hit counts and endpoint service RSS.
- `logs/`: official runs, final checks and explicitly excluded failed/successful pilots.
- `error-repair.json` and `error-repair-probe.cjs.txt`: supplementary immediate-mode syntax-error/repair control, excluded from timing summaries.
- `verification.json`: final checks and review dispositions.
- `archive-manifest.json`: exact archive membership and SHA-256 hashes; replay rejects missing or modified files.

Replay: `python3 docs/evidence/2026-10-05-m10-5-guard-cost-attribution/verify.py`. Optional `--live` needs the original retained measured paths. Measured absolute paths remain unchanged in receipts. Current Node attribution is separate from host-budget/device qualification; Task 5's failed admission gates remain open.
