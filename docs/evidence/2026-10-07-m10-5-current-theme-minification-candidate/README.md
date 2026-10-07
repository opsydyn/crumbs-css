# M10.5 current-source theme minification candidate

**Outcome: rejected under the existing host budgets.** The candidate cuts the four theme graphs by 45–48%, but each remains about twice its approved maximum. All four Node initialization medians also improve and still fail their existing absolute limits.

## Candidate

The exact patch adds minify: true to the current theme runtime and theme/core build groups. It leaves product source, package exports, declarations, dependencies, and budget registry unchanged. The default current-source identity is 23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd across 670 files; the candidate config identity is dd75eff46ab294e28c7706978573a111b0cc6f2019a1a59233b3f220113e4c71 across the same 670 files. The retained config.patch is the complete candidate change.

The scratch build used Bun 1.4.2, tsdown 0.21.10, Rolldown 1.0.0-rc.17, Node 22.0.0 for the floor cohort, and Node 24.15.0 for the current cohort on Apple M4 Pro / Darwin arm64. The graph probe ran five scans; runtime initialization used one excluded warmup and 15 fresh-process samples in each of four cells.

## Gate result

| Metric group | Result |
| --- | --- |
| theme/core graphs | 35,205 B ESM / 35,426 B CJS against 17,271 / 17,641 B limits: both fail |
| theme compatibility graphs | 86,996 B ESM / 89,711 B CJS against 44,017 / 44,764 B limits: both fail |
| Node 22 initialization | 8.128 ms ESM / 4.734 ms CJS against 7.553 / 4.083 ms limits: both fail |
| Node 24 initialization | 4.198 ms ESM / 3.296 ms CJS against 3.067 / 2.444 ms limits: both fail |
| token graphs | 29,906 B ESM / 33,656 B CJS: both pass their unchanged limits |

The measurements only screened this candidate. No complete 21-metric run, package test suite, or Expo/Metro check was run after the graph gate rejected it. The [assessment](../../assessments/2026-10-07-m10-5-current-theme-minification-candidate.md) explains the decision; raw graph, initialization, and qualification reports are in [host-budgets](host-budgets/).

Reproduction from an isolated checkout: apply config.patch with git apply --unidiff-zero config.patch, run the package build, run scripts/measure-runtime-graph-budgets.ts, then run packages/css/bench/runtime-initialization.ts with the exact Node 22.0.0 floor path and 15 samples. The raw reports retain the source revision, environment, sample values, entry hashes, and emitted artifact hashes.

No production source, API, dependency, approved budget, baseline, or threshold changed. The full current-source host gate remains unqualified, and physical-device work remains deferred.
