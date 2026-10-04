# M10.5 warm-transform identity qualification

## Result

The approved warm-transform comparison now has exact host and measurement identity under the historical package-root working-directory protocol. Its unchanged threshold still fails: the measured median is **7.846 ms**, versus the **5.664 ms** baseline, a **38.52%** increase. The existing limit is 6.514 ms with a 15% maximum regression. The cold-transform comparison passes at 65.573 ms versus a 66.405 ms baseline (-1.25%). No baseline or threshold changed.

The complete host run records **1 pass, 11 failures, and 9 incomplete results** among 21 approved comparisons. The failures comprise four runtime-initialization metrics, six runtime graph metrics, and warm transform. The incomplete results comprise one Metro environment/workload mismatch and eight editor source/workload-identity mismatches. The separate diagnostic-only `runtime-emitted-bytes` metric also fails. `performanceQualified` remains false; the registry is valid but not ready.

The consumer-fixture cold transform runs from its fixture root while the warm transform runs from the historical package root. These contexts produce different compiler package-owner metadata and output hashes; every raw benchmark retains that parity result. Same-cwd cold/warm calls still must produce equal output. See [cwd-output-probe.json](cwd-output-probe.json).

The machine-readable status and exact median values are in [qualification.json](qualification.json).

## Host command and identity

```sh
CRUMBS_AUDIT_NODE_FLOOR=/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node \
CRUMBS_METRO_PORT=8095 \
  bun run measure:host-budgets docs/evidence/2026-10-04-m10-5-warm-transform-identity/host-budgets
```

Node v22.0.0 was verified at the configured path (SHA-256 `9507031f6769f2381eae353b3614bafa871c957dc6f2ae86a3af948acdf9b178`). The benchmark runtime was Bun 1.4.2 on Darwin 25.6.0, arm64, Apple M4 Pro. Five benchmark repetitions completed sequentially. The reports identify source revision `6318034b004f19fe2ca53726f086abccfae6fd4f` and retain source, fixture, toolchain, runtime, cache, and host evidence. Detailed reports and each comparison are in [host-budgets](host-budgets/).

## Verification

- `bun run check` — fresh package build, typecheck, full CSS package suite, and Storybook suite passed, including the final parity-reporting cases.
- `bun run budgets:validate` — valid registry, no baseline drift; readiness remains false with the existing four pending thresholds, three missing baselines, and one diagnostic baseline.
- `bun run docs:build` — 28 pages built after the assessment, roadmap, and evidence updates.
- Full exact-Node-floor `measure:host-budgets` run — completed; performance qualification remains false as reported above.

This is host evidence only. It does not establish Hermes, React Native device performance, visual rendering, accessibility, or release-device acceptance.

## Next

Continue M10.5 with Metro and editor measurement-identity repair. Preserve the approved limits and baselines, then rerun the host comparison only after those workload identities match. Keep Android and device acceptance as separate gates.
