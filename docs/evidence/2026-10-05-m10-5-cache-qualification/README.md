# M10.5 Task 5 evidence

See [assessment](../../assessments/2026-10-05-m10-5-cache-qualification.md). The candidate is **not admitted**: performance and resolution/parity gates fail.

- `report.json`: measured environment, frozen matrix, gate statuses, shipping inventory and raw hash pointers.
- `raw/`: 126 compressed observations, including the failed original owner, successful SDK retry and additional entry controls.
- `receipts/`: 97 deduplicated full source/input/native-metadata/Metro-result byte receipts. Source files contain plain text despite the `.json.gz` suffix.
- `summary.json`: verifier-derived five-block timings, paired ratios, cold/load/queue and endpoint RSS statistics.
- `invalidated-throughput/` and its manifest: all 105 excluded original runs; never used for performance conclusions.
- `logs/`: actual CLI/probe/owner logs, including failures.
- `executed-*.ts.txt`: actual host recovery scripts with measured paths; provenance, not portable executable commands.
- Restoration, fixture and response files retain actual measured paths and bytes.

Offline replay: `python3 docs/evidence/2026-10-05-m10-5-cache-qualification/verify.py`. Optional `--live` checks the retained measured workspace. The verification script generates `summary.json` deterministically. Host-budget, installation-replacement and device gates remain unperformed.
