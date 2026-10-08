# M10.5 runtime architecture attribution packet

This packet is **diagnostic only**. It attributes exact emitted bytes and checks arithmetic; it certifies no runtime parity, startup, memory, Metro, Hermes, native or release qualification.

From this checkout, run without Node, package dependencies or network access:

```sh
python3 docs/evidence/2026-10-08-m10-5-runtime-architecture-attribution/verify.py
```

Keep the sibling `2026-10-08-m10-5-consolidated-host-remediation` packet available. The verifier checks its archived control/candidate package hashes, so the attribution cannot silently use different production source or artifacts.

- `packet.json` hashes the three raw files and prior inputs.
- `attribution.json.gz` retains every graph, source/declaration allocation, generated literal span, artifact/source-map/source hash, AST declaration-boundary receipt and tool identity.
- `mapped-artifacts.tar.gz` retains 60 diagnostic JavaScript artifacts, their 60 identical reference artifacts and every emitted map. Pure re-export stubs can have no map; every artifact reachable by the 12 analysed graphs has one.
- `summary.json` retains the unchanged registry text/hash and derived gaps/counterfactuals.
- `verification-controls.json` records acceptance of the intact packet and rejection of three altered/missing-evidence controls, including an incorrect allocation with its hash recomputed. `code/negative-controls.py` retains that throwaway check.
- `code/` preserves the exact throwaway probe scripts. They are not production tooling. Their paths identify the measured host; reproducing the builds elsewhere requires matching tool versions and changing the scratch/tool path constants. Choose an unused owned scratch directory: the setup script deliberately refuses an existing output directory. The byte-parity checks must still pass after adapting paths.

The three cohorts are the unchanged production control, minification-only control, and the already-rejected consolidation. Only the existing core/theme build groups are used. Hidden source maps leave emitted JavaScript unchanged. The minification-only cohort has independent no-map and hidden-map builds; the other two additionally match the previous frozen archive artifacts. No shared installed dependencies or live package output was modified.

The verifier independently decodes VLQ mappings, maps generated UTF-8 bytes to retained declaration spans, rederives source/declaration/literal totals, checks complete artifact membership and validates the fixed-limit arithmetic. Declaration boundaries and literal spans are retained TypeScript AST receipts; Python does not independently reparse TypeScript/JavaScript. Rerunning the archived Node probe reproduces those receipts. Neither hashes nor source maps authenticate that a historical execution occurred, and mapped source origins are not removable-byte or CPU estimates.

The canonical package scanner separately cross-checked all 12 graph closures, bytes and hashes during collection. The verifier does not replace that scanner or the release host-report policy. Negative verification controls check changed raw data, missing evidence and a rehashed but incorrect byte allocation.

See the [assessment](../../assessments/2026-10-08-m10-5-runtime-architecture-attribution.md) for the interpretation and proposed next M10.5 experiment.
