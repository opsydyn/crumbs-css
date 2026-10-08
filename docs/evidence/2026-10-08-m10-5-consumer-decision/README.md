# M10.5 bounded consumer diagnostic

Read the [decision and measurement limits](../../assessments/2026-10-08-m10-5-consumer-decision.md) before using these numbers. This is a non-shipping investment assessment, not release or device qualification.

- `receipts.json.gz`: all 18 successful corrected-fixture receipts, including three excluded warm-ups.
- `summary.json`: launch-level summaries and paired within-round deltas; no acceptance thresholds.
- `verify.py`: validates receipt identity, runtime, sequence, final colours, references and balanced lifecycles, and independently rederives the stored summary.
- `study.json`, `source-check.json`, `inventory.json`, `artifacts.json`: source, copied built package, mapped module, React-root, fixture, Hermes and identical native-executable identities. Source maps were checked against exact current built contents during collection. Original full maps/bundles/native copies remain in the local scratch directory, not this Git packet.
- `fixtures/`: exact measured inputs/configuration and successful Expo export logs. Dependencies were symlinked to the retained healthy pinned install, and current Crumbs artifacts were copied directly; this was not an npm clean-install test. The fixture manifest's Crumbs range is an unused staging placeholder; `inventory.json` identifies the artifacts actually resolved.
- `collect.mjs`, `prepare-shell.py`, `prepare-fixtures.py`: diagnostic-only collection and preparation sources. Preparation uses fixed local scratch/retained-shell paths; the corrected generator records the current package version rather than the unused original staging placeholder. These are not production CLI additions.
- `commands.json`, `collection.log`, `cleanup.json`: exact Simulator operations, receipt summaries and cleanup checks.
- `rejected-fixture.json`: invalid scratch-token failure excluded before the corrected measurement set.

Recheck the retained packet without starting any native work:

```sh
python3 docs/evidence/2026-10-08-m10-5-consumer-decision/verify.py
cd docs/evidence/2026-10-08-m10-5-consumer-decision
shasum -a 256 -c SHA256SUMS.txt
```

Fresh collection requires preparing a new scratch directory, configuring the pinned dependency locations and localhost port, exporting iOS bundles, and embedding them into copies of the retained unsigned release shell. Use only the explicitly owned Simulator and unique temporary app IDs. Do not blindly run the retained local scripts against existing directories or treat reconstructed binaries as distribution qualification.
