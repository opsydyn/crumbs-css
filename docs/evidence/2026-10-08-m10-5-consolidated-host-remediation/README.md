# M10.5 consolidated remediation rejection packet

Disposition: **rejected at the deterministic runtime graph screen**. The host gate was **not run**. This packet does not qualify a release, current HEAD, Metro, Hermes or any device.

Run from any directory with Python 3, without package dependencies or network access:

```sh
python3 /path/to/2026-10-08-m10-5-consolidated-host-remediation/verify.py
```

`packet.json` binds the four raw files by SHA-256. `raw.json.gz` contains immutable control/candidate package inventories, the candidate's full recorded source identity, registry content, raw graph and comparison reports, both independent differential cohorts, restoration details, commands, build/boundary logs and the qualification harness sources. The full source identity digest is checked internally; archived package source hashes are cross-bound to that identity. The packet does not retain bytes for every unrelated repository file in the full source identity.

`control-package.tar.gz` and `candidate-package.tar.gz` retain every inventoried package source/build file, including declarations. They contain no installed dependency trees. `candidate.patch` retains the tracked production diff and newly created helper/test; it is archived evidence, not a shipping change. The original whole-repository Git archive remains in the owned scratch control directory; its recorded hash is provenance metadata rather than an assertion that its bytes are included here.

The verifier reads archives without extracting or executing their contents. It requires exact membership and hashes, rejects failed/mismatched snapshots, verifies all six graph byte decisions and five identical samples against the retained approved registry, and checks exact restoration. It cannot independently prove that a fabricated report was executed: these are integrity/derivation checks over retained observations. Synthetic fixtures are explicitly labelled. All accepted dispositions are refused; the existing release host-report verifier remains the only route for host admission.

The raw qualification sources are the measurement-time versions. A subsequent review fix uses intrinsic Map/Set iteration in the retained receipt helper; the archived cohorts contain no Map/Set graph nodes. The final source identity is recorded separately in `final-source-identity.json` and does not qualify the rejected candidate or a release.

The ordinary property-test suite runs independent processes against itself to test the harness. Actual qualification supplies a separately archived control:

```sh
bun packages/css/bench/host-remediation/control.ts /private/tmp/crumbs-control-new
CRUMBS_HOST_REMEDIATION_CONTROL=/private/tmp/crumbs-control-new/tree/packages/css \
  bun test packages/css/test/host-remediation-parity.property.test.ts
```

These commands require a complete matching installation. Recorded builds used Bun 1.4.2, tsdown 0.21.10, React 19.2.3, Effect 4.0.0-rc.115, Vanilla Extract CSS 1.20.1 and integration 8.0.10. Temporary dependency links were inventoried and restored. The evidence retains the original real paths; it does not assume those paths remain available on another host.

See the [assessment](../../assessments/2026-10-08-m10-5-consolidated-host-remediation.md) for exact results, unrun gates and the next M10.5 decision.
