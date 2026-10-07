# M10.5 current-source theme minification candidate

- Date: 2026-10-07
- Roadmap: M10.5
- Status: candidate screened and rejected under unchanged host budgets
- Constraint: preserve the complete synchronous API and existing thresholds

## Decision

Do not enable minification for the theme or theme/core build groups as a production M10.5 remedy. On the exact current product source, the candidate reduces their emitted graphs by about 45–48%, but every theme graph remains about twice its approved maximum. All four initialization medians improve against the current unminified build yet remain above their approved absolute limits. No full 21-metric candidate run was needed after the deterministic graph gate failed.

## Candidate and source identity

The scratch-only candidate changes two build options: minify the existing theme runtime entry group and theme/core entry group. It changes no runtime source, declarations, dependencies, public exports, or approved budget values. The candidate build started from source revision b7c20705109a1ea6a47a7a1ac95cd7c95de79544. The approved current-source identity is 23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd; the candidate identity is dd75eff46ab294e28c7706978573a111b0cc6f2019a1a59233b3f220113e4c71. The retained patch shows that packages/css/tsdown.config.ts is the only changed tracked file.

## Emitted graph result

Five deterministic scans were taken for each ESM/CJS graph. The baseline column is the unchanged approved maximum.

| Entry | Format | Current default | Minified candidate | Approved maximum | Reduction | Result |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| theme/core | ESM | 64,549 B | 35,205 B | 17,271 B | 45.46% | Fail |
| theme/core | CJS | 65,408 B | 35,426 B | 17,641 B | 45.84% | Fail |
| theme compatibility | ESM | 164,215 B | 86,996 B | 44,017 B | 47.02% | Fail |
| theme compatibility | CJS | 171,842 B | 89,711 B | 44,764 B | 47.80% | Fail |

The two token graphs remain under their existing limits, but they do not resolve the four theme graph failures.

## Runtime initialization

The same probe protocol used one excluded warmup followed by 15 fresh-process samples per runtime and format. All four candidate medians improve on the current unminified medians but miss their existing absolute limits.

| Runtime / format | Current default | Minified candidate | Approved maximum | Change | Result |
| --- | ---: | ---: | ---: | ---: | --- |
| Node 22 ESM | 8.393 ms | 8.128 ms | 7.553 ms | -3.16% | Fail |
| Node 22 CJS | 5.222 ms | 4.734 ms | 4.083 ms | -9.33% | Fail |
| Node 24 ESM | 4.595 ms | 4.198 ms | 3.067 ms | -8.64% | Fail |
| Node 24 CJS | 3.557 ms | 3.296 ms | 2.444 ms | -7.35% | Fail |

The run used exact Node 22.0.0 and Node 24.15.0 on Apple M4 Pro / Darwin arm64. Raw samples, entry hashes, graph artifact hashes, the exact option patch, and a machine-readable decision are retained in the evidence packet.

## Scope and next item

This was a focused early rejection, not a complete candidate qualification. Package tests, packed Expo/Metro checks, and the full host matrix were not run against the minified candidate after its graph measurements failed. The official current-source host gate remains 11 pass, nine fail, and one incomplete; M10.5 remains unqualified. No production source, API, dependency, budget, threshold, or enforcement rule changed. Physical-device acceptance remains deferred.

**Next recommended slice: M10.5 — review the accepted runtime-budget policy against the current exact host gate and already-retained Expo/Hermes consumer evidence. Decide whether to retain these package-host gates as binding or propose a distinct API-preserving architecture path; keep every registry value unchanged until any per-metric change is explicitly approved.**
