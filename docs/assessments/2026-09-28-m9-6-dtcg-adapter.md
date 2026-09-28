# M9.6 DTCG import adapter qualification

**Status:** qualified for the documented source/tooling subset. This does not
qualify package publication, application runtime performance, visual acceptance,
or device behavior.

## Result

The opt-in `@opsydyn/crumbs-css/tooling/dtcg` ESM/CommonJS entrypoints expose a
synchronous API that imports explicitly supplied DTCG Format/Resolver
documents into the existing version-1 Crumbs theme payload. The target is one
exact token-contract identity from a caller-supplied manifest. References are
resolved only against the supplied in-memory absolute-URI map; the adapter
performs no filesystem or network access.

The accepted profile is Format 2025.10, Color 2025.10, and the three Resolver
version literals `2025-10-01`, `2025-11-01`, and `2025.10`. The 2025.10 Resolver
final report and published schema use inconsistent version literals; the
supported set and this limitation are recorded in the guide and receipt.
Supported conversions are normalized sRGB, `px`/explicit-base `rem`, `ms`/`s`,
opacity numbers in `[0, 1]`, and exact enum strings for `fontFamily` and
`strokeStyle`. Unsupported token types and invalid domains return stable
diagnostics without a partial payload.

The fixture qualification covers 10 accepted and 17 rejected conversion
scenarios. It checks exact source-document ownership and JSON pointers, the
selected default modifier, token and root/nested group metadata, accepted
profile literals, and SHA-256/byte counts for eight checked-in fixtures. The
canonical receipt is
[`qualification.json`](../evidence/2026-09-28-m9-6-dtcg/qualification.json).

The qualification script imports the exact generated ESM files declared as
public package export targets. The managed worktree's pre-existing
`node_modules` link resolves the package name to the primary checkout, so the
link was preserved. The separate packed-consumer test verifies package-name
resolution against the worktree package.

## Host benchmark

Observed on Bun 1.4.2, Darwin arm64. Manifest and document construction are
outside the measured interval; timings cover `importDtcgTheme` through either a
complete result or a stable resource rejection. The timing output is not part
of the deterministic receipt.

| Tokens | DTCG document bytes | Samples (warmup) | Outcome | Median | Range |
| ---: | ---: | ---: | --- | ---: | ---: |
| 1,000 | 69,914 | 5 (1) | Complete; 1,000 payload values | 13.982 ms | 11.801–14.382 ms |
| 10,000 | 699,068 | 3 (1) | `resource.limit-exceeded` | 7.552 ms | 7.242–8.922 ms |
| 50,000 | 3,495,324 | 1 (0) | `resource.limit-exceeded` | 6.945 ms | 6.945 ms |

The importer has a 100,000-node request snapshot budget and a separate
100,000-node Format traversal budget. Resolver expansion and emitted Resolver
provenance each have a separate 100,000-step/origin budget. Node count is not
token count. The 10,000 and 50,000 measurements are time-to-rejection and do
not establish successful large-theme throughput. Raising the guards needs a
separate workload-derived memory and adversarial-input review.

A targeted Resolver stress case exposed repeated copies of the growing
reference trail and active-set path. On Bun 1.4.2, a 15,000-document acyclic
chain returned its 30,003-origin source chain in 8.113 seconds before the
persistent-trail and constant-time active-set changes. A separate review then
identified recursive set expansion: a 49,998-document selector chain threw
`RangeError` despite remaining under the 100,000-step and 100,000-origin
budgets. Resolver expansion now uses an explicit depth-first frame stack,
retaining declared source order and active-path cycle detection. The selector
regression resolves that chain and verifies 99,999 origins in order.

The end-to-end import benchmark includes a 15,000-document chain (513,961
bytes) and one token, now after the 1k/10k/50k token workloads. Three samples
after one warmup completed with a 38.332 ms median (36.661–39.702 ms). This is
a tooling-host result; it does not establish runtime or device performance.

## Verification

- `bun run check` — passed: build and typecheck; 1,211 package tests across 195
  files with 46,795 assertions; the Storybook test passed with 7 assertions.
- `bun run docs:build` — passed; 25 documentation pages built, including the
  DTCG how-to guide.
- `bun run dtcg:qualify` and `bun scripts/m9-6-dtcg-qualification.ts` — passed;
  the checked-in canonical receipt matches repeat evaluation.
- `bun test packages/css/test/dtcg-*.test.ts` — passed: 88 tests and 1,758
  assertions.
- `bun test packages/css/test/pack-consumer-contract.test.ts
  packages/css/test/packed-runtime-graph.test.ts` — passed: 20 tests and 78
  assertions. The packed consumer resolved ESM, CommonJS, and declarations;
  runtime graphs cannot reach the DTCG tooling graph.
- `bun scripts/playground-distribution.ts --m8-3-check` — passed its packed
  export, runtime graph, consumer typecheck, iOS/web production export, and
  tree-shaking canary checks. It reported dirty M9.6 source and is an interim
  distribution run, not a clean-source release receipt. Android was `not-run`.
- `bun run bench:dtcg-import` — passed as a source/tooling benchmark and recorded
  the capacity boundary above.
- `git diff --check` — passed.

Effect 4 Schema remains an internal bundled tooling implementation. Consumers
do not add Effect as a userland dependency or call an Effect runner. Android
and physical-device acceptance remain not-run and parked. No visual, native
runtime, publication, or release-performance acceptance is claimed.

## Next roadmap item

The next numbered roadmap item is **M9.7**, local ownership metadata for
reports and optional editor/design-tool adapters. The DTCG node-budget result
remains an explicit capacity limitation for a later workload-budget decision.
