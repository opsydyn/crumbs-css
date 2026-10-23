# M10.5 v1.2 fresh-compiler diagnosis

**Disposition: no production fix admitted.** The user chose remediation before npm publication. The exact v1.2.0 source/tag remains unchanged and npm publication remains blocked by the three failures in the [final release report](../2026-10-17-m1-10c-expo58-release/final-release/README.md). No new exception, threshold change, compiler cache or API change is introduced.

## Current diagnostic and upstream comparison

The retained existing fresh-compile profiler was run against the unchanged v1.2.0 CJS artifacts at source `5a13f913b17ae957172968144ec83c391caee337`. The first invocation could not resolve esbuild directly from the strict package dependency graph. Only the disposable profiler was corrected to resolve it from the integration package that owns the dependency. That setup failure and both profiler versions are retained; shared installations were not edited.

The current diagnostic again identifies fresh compilation as the largest measured boundary. A single CPU-profile run includes startup/module loading and is not a steady-state or exclusive-CPU attribution. In a separate six-sample warm file-read probe, median accumulated synchronous read spans are 0.606 ms (README) and 0.890 ms (consumer). Removing duplicate reads alone cannot establish closure of the observed multi-millisecond full-transform gap. Instrumentation perturbs execution; these spans are diagnostic only.

Primary registry metadata reports integration 8.0.11 and esbuild 0.28.2. [Integration 8.0.11 notes](https://github.com/vanilla-extract-css/vanilla-extract/releases/tag/@vanilla-extract%2Fintegration@8.0.11) describe file-scope escaping and a CSS dependency update, not a performance fix. [esbuild 0.28.0 notes](https://github.com/evanw/esbuild/releases/tag/v0.28.0) describe a newer Go compiler/GC. No documented performance gain was assumed.

A disposable exact esbuild0.28.2 install was selected only in each candidate process's module cache before integration loaded. All other package versions, release artifacts, fixture paths and integration8.0.10 remain the same. The control retains esbuild0.27.7. Five process pairs run serially with alternating pair order. Each process has two setup transforms and six retained full transforms per fixture, including existing stable-resolution confirmation. Raw observations are retained without dropping repetitions.

| Cohort median of per-process nearest-rank p50s | Current 0.27.7 | Candidate 0.28.2 |
| --- | ---: | ---: |
| README full transform | 11.490750 ms | 11.056750 ms |
| README integration compile | 6.577458 ms | 6.602459 ms |
| Consumer full transform | 9.953250 ms | 9.510208 ms |
| Consumer integration compile | 5.801875 ms | 5.579709 ms |
| Per-process worst-fixture selector | 11.490750 ms | 11.056750 ms |

The full-transform difference is about 3.8%, without a claim of a statistically established improvement. Both cohorts remain well above 6.514 ms. This is a compiled-CJS diagnostic with an extra metafile observer, not the official source-import budget protocol; it cannot qualify either a pass or a new numerical exception. All paired final output hashes and complete input inventories agree. A separate untimed selection smoke observes all 18 compile calls entering the selected0.28.2 build function; it is not included in the timing cohorts. Source and all 181 measured dist artifacts still match the final-tag host report.

The experiment does not test integration8.0.11, a fresh full host report, Metro latency, cold budgets, SDK/native parity, source maps under a new backend, or registry publication. No additional native or full release replay was warranted by this non-qualifying candidate. Existing candidate/host failure evidence remains authoritative.

## Reproduce and verify

Run `python3 verify.py` here to check file integrity, sample structure, output/input parity, the exact-source preservation receipt and summary arithmetic. The inventory is an integrity receipt, not an independent execution attestation.

The `repro/` scripts use explicit owned temporary paths. Recreate an owned copy of the released package and its frozen dependency graph, point the root argument and disposable candidate path at those copies, then run `bun repro/esbuild-ab.cjs <package-root> control <output.json> control|esbuild0282`. Install the retained exact esbuild diagnostic manifest/lock in its own directory, never into the library. Alternate control/candidate order across five independent pairs. The existing profiler installs its observer only in memory and awaits esbuild shutdown. `file-read-profile.cjs` and `selection-smoke.cjs` are separate diagnostic instruments; they do not supply timed A/B cohorts.

## Next proposed M10.5 step

A fresh-compilation backend feasibility spike is proposed, **not approved or implemented**. Compare the already installed Rust-based Rolldown toolchain against the current compiler while retaining Vanilla Extract file-scope/debug-ID semantics. Require full-transform timing and output/input/dependency-edit parity before considering an adapter design. Stop after one bounded prototype if it cannot approach the unchanged gate without weakened receipts. No shipping dependency, public API, Node floor, cache, baseline or budget changes belong to that spike.

The installed Rolldown1.0.0-rc.17 requires Node `^20.19.0 || >=22.12.0`, while Crumbs retains Node22.0.0. A future adoption would need a proven compatible fallback/installation design; an engine-floor bump is not authorized. Expo's optional Rust worker interoperability and a new Crumbs compiler backend are separate capabilities. This packet makes no Rust compiler speedup claim.
