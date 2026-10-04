# M10.5 exact Node v22.0.0 host-budget gate

- Date: 2026-10-04
- Roadmap: M10.5
- Source revision measured: `1ffc68f581eaae0d4970f7736abc102b5e41c76e`
- Status: complete measurement run; host-budget qualification remains open

## Execution and host identity

The committed source was freshly built, then the full host-budget suite ran with
the exact Node v22.0.0 floor and the current Node v24.15.0 runtime. The Node
v22.0.0 binary SHA-256 is
`9507031f6769f2381eae353b3614bafa871c957dc6f2ae86a3af948acdf9b178`, matching
the previously retained exact-floor binary. Bun 1.4.2 ran on macOS 26.6.2,
Apple M4 Pro arm64. The host suite exited 0 and retained its Effect-boundary,
runtime-initialization, runtime-graph, Metro, five benchmark, editor, comparison,
and threshold-review reports.

The Metro scenario completed five repetitions, exercised strict-diagnostic
configuration changes, and restored every measured fixture to its original
hash. Checked-in reports replace machine-specific checkout, executable, and
temporary-directory prefixes with stable placeholders; report values and
measurement identities were preserved. A private scratch copy retains the
unredacted run. See the [machine-readable qualification](../evidence/2026-10-04-m10-5-node-22-host-budget/qualification.json)
and the [full host reports](../evidence/2026-10-04-m10-5-node-22-host-budget/).

## Comparison result

The completed run evaluated all 21 recorded metrics against the existing
approved limits:

| Result | Count | Metrics |
| --- | ---: | --- |
| Pass | 1 | `cold-transform-ms` |
| Fail | 10 | Four runtime-initialization metrics and six emitted runtime-graph metrics |
| Incomplete | 10 | One warm-transform protocol mismatch, one Metro environment/identity mismatch, and eight editor measurement-identity mismatches |

The exact-floor Node v22 ESM and CJS initialization medians were 7.773 ms and
4.612 ms, above their approved maxima of 7.553 ms and 4.083 ms. Current Node
v24.15 ESM and CJS initialization also exceeded their existing limits at
4.118 ms and 3.213 ms. The six graph metrics retain the approved zero-growth
limits and fail against their recorded baselines. These comparisons establish
measured failures; they do not identify which individual source change caused
them. No budget, threshold, baseline, or registry entry was modified.

The incomplete warm-transform comparison differs at `protocol.ordering`. Metro
no longer matches the admitted Expo environment and source/cache fixture
identity. The eight incomplete editor comparisons carry a different base
revision, package version, supported coverage, and generated fixture identity.
Their lower observed measurements are not passes until matching workloads are
measured.

The runtime-graph report's `node` field is `v26.3.0` because it records
`process.version` from the Bun 1.4.2 scanner process. It is not the current Node
executable used for the explicit runtime scenarios; those reports record Node
v24.15.0. The emitted-graph comparison is keyed to its documented Bun,
build-tool, and host identity.

`budgets:validate` passed with no baseline issues. The registry remains
unready: four device-facing thresholds are pending, three active baselines are
missing, and retained memory remains diagnostic-only. Host evidence does not
qualify Hermes or release-device performance, physical-device rendering,
screen-reader behavior, or Android.

## Recommendation

M10.5 remains open. Next, investigate the two exact-Node-floor initialization
failures and six graph-size failures against their existing baselines, then
reconcile the warm-transform, Metro, and editor measurement identities. Preserve
approved limits and historical results until a concrete evidence-based change
is reviewed. Native/device qualification remains separate; Android remains
last.
