# M10.5 runtime provenance — stopped at build agreement

**The complete replacement is rejected; no production change is admitted.** The observer preserves all 181 JS/declaration artifacts and records all 20 JavaScript build owners, but its dependency metadata does not agree with the independent audit for seven tooling entry/format rows. The approved first-failed-gate rule stops execution. All 30 ordinary-runtime rows agree; this is not a new compiler/Effect leak or a failure of the existing shipping source-list guard.

The user approved the [written design](../../superpowers/specs/2026-10-17-m10-5-runtime-provenance-design.md) after `10438f5` and [one-slice plan](../../superpowers/plans/2026-10-17-m10-5-runtime-provenance.md) after `178f11f`. Execution base is `178f11fb0b507b29e19a2566fa510e86dec2cdb9`, inline, one candidate and one outcome commit. [summary.json](summary.json) lists every failed and unrun stage. No kernel was rebuilt, no layout/grouping changed and no benchmark ran.

## Observed result

Two original builds at the same worktree path produce identical 181-file inventories. The capture-only bootstrap observation preserves every filename and byte:105 JavaScript artifacts and 76 declarations. All 20 JavaScript owners complete, and the declaration/stub output remains unchanged. The actual packed import auditor passes all 59 rows, including30 ordinary-runtime rows. Their complete reported membership includes62 reviewed original source modules and no ordinary vendor/generated members; the bootstrap policy admits no generated helper. Shared metadata/property validators are distinguished from compiler implementations; compiler-related source imports in those validators are type-only.

The first finalization attempt exposed a harness normalization defect: Rolldown repeats some dependency edges. The corrected candidate retains raw multiplicity while representing receipt imports as sets. A regression fails before the correction and passes afterward. A separate forged-edge regression also fails before adding independent graph agreement. These corrections do not change emitted bytes, classify unknown members or widen admission.

The corrected finalizer stops on actual capture/audit disagreement:

| Entry | Format | Actual external edges omitted by build metadata |
| --- | --- | --- |
| `.` | CJS | `url` |
| `./tooling/manifest` | ESM | `metro-transform-worker` |
| `./tooling/manifest` | CJS | `metro-transform-worker`, `url` |
| `./metro-plugin` | CJS | `url` |
| `./dist/transformer` | ESM | `metro-transform-worker` |
| `./dist/transformer` | CJS | `metro-transform-worker`, `url` |
| `./dist/metro-plugin` | CJS | `url` |

Local reachable files agree for every row. The missing external edges are recognized by the existing AST auditor: the CJS `createRequire` shim uses `require(`url`)`, and transformer loader/resolution code reaches the literal `metro-transform-worker` package. The metadata arrays are not a complete inventory of those emitted loader edges. These are existing permitted tooling imports, not newly introduced dependencies. All ordinary-runtime graph reachability and external sets agree.

The candidate emits no usable final sidecar. We did not scope agreement down to ordinary entries, synthesize missing edges, remove shims, alter loader code or rerun another layout after this real failure. This result rejects this collector's complete-agreement assumption; it does not prove every possible provenance architecture infeasible.

## Evidence and limits

[candidate-files.tar.gz](candidate-files.tar.gz) retains the exact13 changed/new files, including the collector, finalizer, policy, tests, wrapper/config and source-identity correction. [candidate-source-files.json](candidate-source-files.json) hashes them; [candidate.patch.gz](candidate.patch.gz) records the tracked delta. Original product/dist snapshots and both baseline/capture artifact archives retain exact bytes. [raw-evidence.tar.gz](raw-evidence.tar.gz) includes versions/paths, logs, red-green attempts, baseline/capture inventories, the independent59-row audit, source-policy rationale and derived graph differences. [capture-owner-receipts.tar.gz](capture-owner-receipts.tar.gz) contains the complete bootstrap20-owner session.

**Archive boundary:** the failing finalizer's `finally` cleanup removed its temporary owner files before they could be copied. Its raw failure logs and exact source are retained. The bootstrap receipts reproduce the same seven omissions against byte-identical outputs; they are not relabelled as the final failed-run capture. This is a limitation of the stopped evidence, not permission to rebuild after the stop rule. The standalone verifier checks archive consistency and this independent derivation, not execution attestation.

Nineteen focused contract/build/source-fingerprint tests pass with 79 assertions. They cover canonical/duplicate fields, shared/unknown members and helper binding, partial/wrong-generation owners, lock/stale-receipt behavior, changed input/bytes, symlink target preservation, copied native-backed views, edge normalization, forged graph metadata and new build-source fingerprints. They are not exhaustive lifecycle qualification. Actual direct-CLI/interruption controls, clean/repeated/skip-clean final sidecar qualification, real contamination, installed/relocated consumer checks, SDK/platform maps, workspace workers, release-v3 integration, floor/current library probes, full type/library/Storybook suites, performance and publication remain unrun. No passing current-source release manifest exists.

## Restoration and verification

All948 original tracked non-documentation file hashes and all 181 original shipping artifact hashes are restored. The five tracked product edits are restored, eight new task-owned files removed, and the original ignore/source-identity policies retained. Unrelated `.superpowers/`, Storybook iOS/native files, primary checkout, dependency targets and devices are preserved. No public push, runner registration or publication occurred. See [execution-record.md](execution-record.md) and the [fresh review](review.md).

Run from this folder:

```sh
python3 verify.py --repository /absolute/path/to/crumbs-css
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s . -p test_verify.py
```

The verifier checks archive/file hashes,181-file baseline/capture byte agreement,20 owners/105 JS files,62 original runtime source bindings, all 59 graph rows and exactly seven tooling omissions, full unrun-stage declarations and optional live948-file/181-artifact preservation. Its mutation tests reject corrupt archive bytes, altered capture dependencies even after updating the packet digest, and an omitted owner. The older kernel verifier still passes its original rejected outcome with live shipping preservation after restoration. No product build is needed to replay this packet.

## Recommended next numbered slice

**M10.5 — keep the existing provenance guard and return to compiler cost attribution on the existing graph.** Park this metadata replacement as release remediation. A bounded read-only attribution should establish which repeated package-compilation work is avoidable and whether the maximum plausible saving can cover the retained approximately 47.24% warm reduction before funding another implementation. This is a recommendation, not a new prototype or policy change. The existing packaging/provenance checks are not an additional release blocker; the original cold/warm/incremental host failures still block M1.10c. Physical acceptance remains deferred.
