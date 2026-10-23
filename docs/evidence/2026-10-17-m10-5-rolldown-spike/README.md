# M10.5 bounded Rolldown spike — rejected

**Decision: stop after the single prototype; retain the existing production compiler.** The user approved one throwaway feasibility spike, with no production adoption, dependency/Node-floor change or release-gate change. The complete native transform misses the unchanged 6.514 ms target and the prototype does not preserve full-output/cache identity. No additional backend tuning was attempted.

## What ran

The already installed Rolldown1.0.0-rc.17 Rust binding was substituted only in an owned probe process's esbuild module cache. Production integration8.0.10 and its actual Vanilla Extract file-scope/debug-ID plugin remained active. The temporary bridge adapts the fixed current build options and forwards real input/import receipts to the existing Crumbs capture callbacks. It creates, generates and closes a fresh bundle for every compile call. No compilation, evaluation or result is memoized.

Both variants use the unchanged v1.2.0 package at `5a13f913b17ae957172968144ec83c391caee337`, its frozen installation, exact fixtures and compiled CJS transformer. Both load the installed Rolldown module before timing. Each has two setup transforms and six retained complete transforms per fixture. The first setup performs two compiles for existing stable-resolution discovery; each later transform compiles once. These are **one-process diagnostic pilots**, not five independent cohorts or the official source-import host protocol. All samples and setup outputs remain retained. No speedup or cold/Metro/device qualification is claimed.

| Nearest-rank median | Existing esbuild | Rolldown prototype |
| --- | ---: | ---: |
| README complete transform | 12.459208 ms | 12.200959 ms |
| README integration compilation | 7.343000 ms | 6.621000 ms |
| Consumer complete transform | 11.021833 ms | 10.407375 ms |
| Consumer integration compilation | 6.543333 ms | 5.842000 ms |

Both complete-transform results exceed 6.514 ms. The Rust bundler phase alone cannot establish an end-to-end budget pass. The agreed stop condition was reached; no larger timing cohort, complete host run, SDK/native replay or production design was started.

## Parity findings

Every candidate sample includes the same ten on-disk input paths, content hashes and byte counts as its paired control fixture. The generated native module body agrees byte-for-byte **only after excluding the first cache-marker line**. File scopes, debug identifiers and emitted style/module metadata agree in that limited comparison. This normalization is diagnostic and does not count as passing full-output parity.

The bridge's metadata differs: external import receipts carry an additional `original` field, and its input/import insertion order follows concurrent plugin callbacks. Crumbs hashes the full `capturedInputs` JSON into its native cache identity, so these differences change the marker. All six unchanged warm samples produce distinct full-output hashes for each Rolldown fixture; the control has one stable hash per fixture. The order/shape compatibility gap belongs to this prototype adapter; this is not a demonstrated Rolldown upstream defect. No old compiler receipts were copied into candidate results to fabricate compatibility.

## Entry and dependency edits

The edit journey uses owned fixture copies only. An imported `minimumHeight` constant makes dependency edits observable in actual native values, rather than just in hashes. Both compilers emit baseline48, entry-edit49 and dependency-edit50. The control restores the original complete output after each edit. The prototype's native body matches the control throughout, but both restoration checks fail because its cache marker changes despite restored bytes. The first harness stopped after the entry-restore failure. Its receipt is retained. A second harness collected all assertions so the independent dependency check could also run; the bridge was unchanged. It reports **Entry restoration differs; Dependency restoration differs**.

All 28 created Rolldown bundle handles across the timing pilot, initial edit journey and completed journey have awaited matching `close()` calls. Owned probe processes exit after teardown; the original esbuild service is stopped by each harness. The released source digest and all181 host-measured dist artifacts still match the final-tag report: [preservation receipt](preservation.json). Shared source, dependency installations and release artifacts were not edited. The copied fixture files were restored in `finally` blocks.

## Verification and scope

Run `python3 verify.py` here. It checks the packet inventory, all24 timed code hashes, real file-input parity, timing arithmetic, cache-marker failures, native-body comparisons, compiled edit values, exact restoration outcomes and bundle closure counts. The inventory is an integrity receipt, not external execution attestation. [Summary](summary.json), [throwaway sources](repro/) and compressed [raw evidence](raw/) preserve failures as well as successful partial checks.

For reproduction, reconstruct an owned copy of the tagged package and its frozen dependencies. Run `bun repro/probe.cjs <package-root> control|rolldown <output.json>`. The edit drivers require a separate owned package copy using `repro/owned-fixtures/`; link only its `dist` and `node_modules` to the unchanged package, then run `bun repro/edits-complete.cjs <owned-root> control|rolldown <output.json>`. The Rolldown mismatch is an expected nonzero exit, not a passing qualification. Do not run edit drivers against the release checkout. The first shell attempt used a not-yet-created working directory and did not start; it produced no measurement. The directory was created before the retained runs.

No public/compiler API, shipping dependency, baseline, numerical limit, policy role, immutable tag or npm package changed. The installed Rolldown engine requirement remains incompatible with a mandatory Node22.0.0 path; a compatible fallback/installation design was not attempted. Physical hardware, spoken readers and release FPS remain deferred. [The final release report](../2026-10-17-m1-10c-expo58-release/final-release/README.md) remains authoritative for publication, which is blocked with no new numerical exception.

**Next recommended roadmap item: M10.5 — an end-to-end compiler remediation design**, covering fresh compilation, validation/lowering cost and canonical dependency/cache receipts together. This spike does not justify a backend swap on its own. Further implementation needs a concrete design; the single-prototype authorization is complete.
