# M10.5 fresh-compilation native scan profile

Disposition: **diagnostic only; no qualifying fix identified**. Stock fresh compilation remains active. No production source, dependency, public API, baseline, limit or host-policy change is admitted.

Five alternating control/profile process pairs use Bun 1.4.2 and copied CJS artifacts at the same owned package root. Each fixture has two setup transforms, then six retained full transforms. The first setup invokes compilation twice for existing stable-resolution confirmation; subsequent calls compile once. Thus there are 120 timed transforms (60 pairs), 40 setup transforms and 180 compilation calls. All generated output hashes, compiled source, complete compiler inputs and watches agree. No samples were discarded from the final cohorts.

The profile variant adds CSS-read/debug-ID timers in an owned Vanilla Extract integration copy and starts an owned native executable through a shell wrapper with esbuild's `--timing` diagnostic flag. It changes owned logging to `info` so timers print. Control uses the original integration implementation through the same owned selection shim. Both variants wrap `compile` for observation and add a metafile recorder; neither is an uninstrumented official workload. Every call uses normal `integration.compile`/`esbuild.build`, with the SDK's normal service lifecycle; there is no Crumbs text replay or esbuild context reuse. Services are stopped at process completion.

| Cohort median of process p50s | README | Consumer |
| --- | ---: | ---: |
| Control full transform | 8.793750 ms | 7.668083 ms |
| Control integration compile | 5.937292 ms | 5.045958 ms |
| Profile full transform | 8.597333 ms | 7.592250 ms |
| Profile integration compile | 5.873708 ms | 5.021500 ms |
| Profile CSS-read spans | 0.046291 ms | 0.078291 ms |
| Profile debug-ID spans | 0.762917 ms | 1.039250 ms |
| Native printed scan phase | 4 ms | 4 ms |
| Native printed entry points | 1 ms | 1 ms |
| Native printed dependency scan | 2 ms | 2 ms |
| Native printed compile/link/on-end | 0 ms | 0 ms |

Native printed values have coarse integer-millisecond resolution. `0 ms` does not establish zero cost. Native scan includes resolution/loading/parser work and waits on JavaScript plugin callbacks. Nested and parallel timings must not be added or subtracted to claim exclusive CPU costs. Instrumentation/logging perturb execution; the control/profile difference is not an optimisation benefit. Both graph receipts contain nine bundled inputs; metafile byte counts are 69,076/69,202, including transformed CSS input rather than necessarily original disk byte lengths. Complete hashes are retained.

The source for [esbuild 0.27.7's diagnostic flag](https://github.com/evanw/esbuild/blob/v0.27.7/cmd/esbuild/main.go#L178-L186) explicitly treats timing output as undocumented and unstable. Its [API implementation](https://github.com/evanw/esbuild/blob/v0.27.7/pkg/api/api_impl.go#L1400-L1417) times scan/compile, then logs the timer after on-end callbacks. These references explain the selected diagnostic; they do not establish a new supported SDK option or production fix.

A single exploratory `GOMAXPROCS=1` control process measured 12.107667/11.540959 ms full-transform p50s. It is retained as a scheduling pilot, not a five-process candidate or general claim about thread tuning. It provides no reason to pursue that setting. Three earlier setup pilots are retained separately: an initial preparation assertion failed on quote style and the attempted probe lacked its wrapper; the next pilot lacked timing output at default log level; a verbose pilot emitted excessive resolution logging. Their results are not included in final cohort summaries. `setup-issues.json` records that sequence. This is setup repair, not discarded final repetitions.

## Verification

```sh
python3 verify.py --self-test
```

This independently rederives the nearest-rank sample p50s, per-process worst-fixture selector, five-process medians/ranges, native phase alignment and full output/input parity. It verifies packet membership/hashes, the prior 149-artifact receipt, retained bundled source files and stock integration smoke results under Bun and genuine Node 22/24. Six semantic negative controls reject changed output, missing inputs/timings, a forged summary, preservation drift and false qualification. The inventory is an integrity receipt, not an independent execution attestation. Run within this repository so the referenced prior artifact receipt is available. No cache-admission/invalidation/ambient-effect or native-device qualification is implied.

Fresh before/after capture scripts confirm unchanged 696 shipping files, 149 artifacts, numerical registry/policy, all 18 shared compiler-package files, dependency links and primary dirty files/status. Only owned copies in `/private/tmp/crumbs-m105-fresh-profile` were instrumented. No package/site build, full host suite, Expo/Metro export or physical/spoken-reader check was repeated. The historical complete report remains ten blocking passes/one warm failure at 10.1715 ms against 6.514 ms / 15%, with zero incomplete rows; it does not qualify this commit.

## Reproduction and upstream handoff

`prepare.py` copies the managed package and the retained healthy installation at `/private/tmp/crumbs-css-m105-clean`, requiring the exact current artifacts and integration 8.0.10/esbuild 0.27.7. Its target package must not already exist. `preparation.json` and `integration-instrumentation.patch` record the measured copy. `profile.cjs <owned-package-root> control|profile <owned-report.json>` runs the final protocol. Capture stderr separately for native timing; run pairs serially and alternate their order. `derive.py <report-directory>` rederives the summary. The shell wrapper's absolute executable path is intentional local reproduction context. Inherited environment values were not exhaustively captured per process; no exact host-environment qualification is claimed.

`graph/` retains only the eleven bundled sources plus original package/configuration files. For a compact stock-integration reproduction, run:

```sh
bun minimal-compile.cjs <absolute-graph-directory> <absolute-dependency-project-root>
```

The dependency project must resolve integration 8.0.10 and esbuild 0.27.7 with its required dependencies. It may be the prepared owned package; the script does not install anything. Genuine Node can run the same `.cjs` command. It performs one stock fresh compilation per fixture without Crumbs evaluation, callbacks or timers. Its six smoke outputs under Bun/Node 22/24 exactly match the paired cohort's compiled source and all nine inputs. The subset graph changes directory/package context and is not a timed full-transform workload or portable release qualification.

`upstream-investigation-draft.md` is a local draft, not a posted issue or a proven upstream regression. It requests a bounded investigation of fresh-build scan and plugin/IPC overhead, carrying the fixture and evidence limitations. **Next: M10.5 — review this concrete upstream investigation draft before deciding whether to seek maintainer input.**
