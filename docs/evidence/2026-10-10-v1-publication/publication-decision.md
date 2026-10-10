# M10.5: v1 npm publication decision

The published tag `v1.0.0` is immutable at `382768a45f429f4c039e7584cd7c31e4f8821fc0`.
Its retained npm tarball is SHA-256 `89b14b8fb70f8c07931c180b81b3a45cc4e8452d31ea43a768c041c7fe297baf`.
All 185 shipped files match the current release checkout and retained tarball.

A new five-repetition check at that commit uses the unchanged comparator and required host/protocol. Cold transform passes at 75.434208 ms (+13.5979%). Warm transform fails at 9.229708 ms (+62.9503%) against the existing 6.514 ms / +15% limits. This bounded check is not a complete release qualification report.

Proposed approval: accept only `warm-transform-ms` as a documented exception for this exact v1.0.0 tag and source revision. Keep its measured failure visible. Do not change numerical budgets or baselines, move the tag, or carry the exception into future releases. Run complete source-matched host qualification and require all other ten blocking metrics, complete advisory evidence, host/source/policy/report/tarball integrity, and existing functional/consumer checks. Publish only the resulting verified tarball through a scoped, auditable GitHub workflow with npm provenance. Register a dedicated ephemeral matching M4 Pro runner with isolated working directories and caches. Record the exception and publication verification in the release notes/evidence.

Alternative: retain the current gate, remediate warm-transform performance, and qualify a new patch release; do not replace the already published v1.0.0 source tag.

The existing approved M10.5 policy and the explicit no-waiver M11.5 disposition prevent treating the instruction to publish as an unspoken performance exception. No exception, runner registration, or npm upload has been performed.
