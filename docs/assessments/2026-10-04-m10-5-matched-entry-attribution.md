# M10.5 matched runtime-entry initialization and graph attribution

- Date: 2026-10-04
- Roadmap: M10.5
- Measured source revisions: `374e4c4`, `91892df`, `4f7ab9d`, `48e8608`, `1ffc68f`
- Status: diagnostic comparison; no runtime, public API, limit, baseline, or production source change
- Evidence: [qualification matrix](../evidence/2026-10-04-m10-5-matched-entry-attribution/qualification.json)

## Matched initialization

Each revision was rebuilt with Bun 1.4.2, tsdown 0.21.10 and Rolldown 1.0.0-rc.17. The exact Node 22.0.0 executable was hashed and held fixed; the current runtime was Node 24.15.0. Each cell used one excluded warm-up and 15 retained fresh processes. The measured entry is compatibility `theme`, which is the entry in the existing initialization budget.

| Source | Node 22 ESM | Node 22 CJS | Node 24 ESM | Node 24 CJS |
| --- | ---: | ---: | ---: | ---: |
| `374e4c4` | 6.296 ms | 3.881 ms | 3.249 ms | 2.786 ms |
| `91892df` | 6.303 ms | 3.799 ms | 3.248 ms | 2.749 ms |
| `4f7ab9d` | 8.019 ms | 4.818 ms | 4.749 ms | 3.667 ms |
| `48e8608` | 8.159 ms | 4.840 ms | 4.440 ms | 3.682 ms |
| `1ffc68f`, first cohort | 7.534 ms | 4.546 ms | 4.229 ms | 3.522 ms |

The unchanged Node 22 maxima are 7.553 ms ESM and 4.083 ms CJS; Node 24 maxima are 3.067 ms and 2.444 ms. The first revision boundary with a clear Node 22 jump is `4f7ab9d`: the resolver extraction at `91892df` remains near baseline, then both module formats rise by about 27%. `48e8608` does not change graph totals materially. The `1ffc68f` first-cohort medians are lower than those at `48e8608`, but the current Node 22 CJS and both Node 24 cells remain over their existing limits.

The first current Node 22 ESM cohort landed 0.019 ms below its limit. To avoid treating that near-threshold result as stable, three further 15-process cohorts were run at `1ffc68f`. The four cohort medians were 7.534, 7.719, 7.840 and 7.999 ms for Node 22 ESM; their pooled 60-sample median is 7.760 ms. The existing full host run reported 7.773 ms. Treat the Node 22 ESM result as still failing; do not credit the single narrow pass. Node 22 CJS cohort medians were 4.546–4.717 ms and the pooled median was 4.632 ms, also failing. The added repeatability data is diagnostic and does not replace or change the approved comparison protocol.

## Emitted-graph attribution

| Source | `theme/core` ESM / CJS | `tokens` ESM / CJS | compatibility `theme` ESM / CJS |
| --- | ---: | ---: | ---: |
| `374e4c4` | 64,700 / 65,559 B | 60,959 / 68,485 B | 157,973 / 159,563 B |
| `91892df` | 64,700 / 65,559 B | 60,959 / 68,485 B | 158,097 / 159,687 B |
| `4f7ab9d` | 131,195 / 138,669 B | 60,959 / 68,485 B | 165,318 / 174,607 B |
| `48e8608` | 131,195 / 138,669 B | 60,968 / 68,590 B | 165,318 / 174,607 B |
| `1ffc68f` | 64,549 / 65,408 B | 60,968 / 68,590 B | 164,215 / 171,842 B |

The admitted zero-growth references remain 17,271/17,641 B for `theme/core`, 56,013/63,308 B for `tokens`, and 44,017/44,764 B for `theme`, in ESM/CJS order. The graph sizes therefore remain over budget; no limit or reference changed.

The artifact listing pinpoints a packaging boundary, not a single slow function. Before `4f7ab9d`, `theme` is emitted as one artifact and `theme/core` is a separate 64.7/65.6 kB artifact. `4f7ab9d` grouped `theme`, `theme-core` and the new focused theme entries into one tsdown build configuration. Its `theme/core` graph then included the 66 kB recipe resolver, 44 kB theme runtime, conditions and plan chunks, growing to 131/139 kB; compatibility `theme` also moved to a multi-chunk graph and grew by 7.3/15.0 kB. The later `1669743` configuration split restored a standalone, one-file `theme/core` graph at `1ffc68f`, while compatibility `theme` remains multi-chunk and 6.2/12.3 kB larger than `374e4c4`.

## Profile and identity findings

Source-map-backed Node inspector profiles were collected for compatibility `theme` under both Node runtimes and module formats. They used a temporary map-enabled build of the same production entry configuration, one warm-up and five retained processes per cell. Mapped Crumbs source frames account for only 0.2–1.8% of sampled CPU time. Most samples belong to the Node loader or un-attributed external/runtime frames, and no repeated Crumbs function hotspot emerged. These profiles are diagnostic only; they cannot justify a function-level optimization A/B. The artifact-level graph evidence is the reliable attribution from this slice. The retained summary records profile-manifest digests; raw multi-megabyte CPU profiles were not kept because source coverage was too low to support causal claims.

The compiled ESM/CJS identity probe found 22 overlapping value exports between `theme/core` and compatibility `theme`. At `374e4c4` and current `1ffc68f`, 21 of 22 bindings are distinct references, including `ThemeProvider` and `useTheme`. At `4f7ab9d`, all 22 were the same references because the entry graphs shared chunks; that is also the revision where `theme/core` grew to 131/139 kB. The grouped build shared references alongside a much larger core graph; subsequent core isolation restored the smaller graph and separate references. Existing documentation recommends `theme/core` for common providers/hooks and `theme` for advanced runtime APIs, but does not state a cross-entry singleton guarantee. This is an interoperability question, not proof that mixed-entry usage fails: this slice compared compiled references and did not run a mixed-provider/hook tree.

The current package build and `bun test packages/css/test/runtime-isolation.test.ts packages/css/test/theme-runtime-resolver-identity.test.ts` passed (50 tests, 180 expectations). The identity probe is additional evidence; the existing test suite does not assert `theme/core`/`theme` reference equality.

## Decision and next experiment

The first observed initialization regression coincides with focused-entry build grouping. CPU sampling cannot narrow this to a function. No production change, identity promise, limit, or baseline is authorised by this diagnostic result.

Next bounded slice: **M10.5 entrypoint package-group A/B** — test build-group layouts that keep `theme/core` lean while giving `ThemeProvider` and its common hooks one intentional context identity when consumers combine supported entrypoints. Retain named exports; verify compiled ESM/CJS identity and runtime provider/hook behavior, then rerun the fixed initialization and graph protocols. If cross-entry singleton identity is intentionally unsupported, make the supported provider/hook pairing explicit in docs and tests. Keep native/device qualification separate and Android last.
