# M10.5 minification qualification

## Decision

Keep `minify: true` out of the default package build. The minified candidate passed package API/type checks, all repository tests, and packed Expo/Metro source-map qualification. The unchanged host budgets still fail for both `theme/core` graphs, both compatibility `theme` graphs, and all four runtime-initialization metrics. Minification remains a diagnostic candidate; M10.5 stays open.

No budget threshold, baseline, workload identity, registry membership, package export, or runtime API was changed.

## Candidate and package checks

The candidate set `minify: true` on the existing theme, theme-core, tool, and devtools JavaScript groups. The declaration-only group and entry maps were unchanged. The exact temporary config diff is in [minified-config.patch](minified-config.patch); its SHA-256 is `9fd468fa208bef15ed48dd4238165a18db5342f29401727592d1e3c7c33aa962`.

The package build and typecheck passed. `bun run test` passed with 1,320 CSS tests and 47,904 assertions, plus 23 Storybook tests and 178 assertions. Public API, ESM/CJS identity, package graph isolation, and contract tests were included. `bun run playground:packed --check` passed its packed Expo/Metro source-map checks for web, iOS, and Android; the retained [packed output](packed-expo.log) reports 565 KB web JavaScript and 1.4 MB iOS and Android Hermes bundles. These are bundle/export checks, not device rendering or runtime-performance acceptance.

After restoring the default configuration, `bun run build`, `bun run typecheck`, and the full `bun run test` passed again on unminified artifacts. `bun run budgets:validate` reported a valid registry with no baseline issues; registry readiness remains false with the existing four pending thresholds, three missing baselines, and one diagnostic baseline. `bun run docs:build` built 28 pages.

The graph audit now follows no-substitution template literals in CJS module calls. The Metro loader exception survives minifier identifier renaming only when TypeScript resolves the call argument to a single local binding initialized from `upstreamTransformerPath`; shadowed, reassigned, or wrong-origin bindings are rejected. After that hardening, a fresh minified candidate build, package typecheck, and packed Expo/Metro check also passed; the committed [packed check output](packed-expo.log) records the three-platform source-map check and bundle sizes.

## Exact host-budget result

The full command was:

```sh
CRUMBS_AUDIT_NODE_FLOOR=/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node \
  bun run measure:host-budgets docs/evidence/2026-10-02-m10-5-minification/host-budgets
```

The run used Node v22.0.0 as the floor and Node v24.15.0 as current on Darwin arm64 (Apple M4 Pro, macOS 25.6.0). The comparison recorded 8 failures, 3 passes, and 10 incomplete comparisons among 21 approved recorded metrics; `performanceQualified` is `false`. Full raw component reports and comparisons are in [host-budgets](host-budgets/).

| Approved metric | Existing maximum | Minified result | Outcome |
| --- | ---: | ---: | --- |
| Node 22 ESM initialization | 7.553 ms | 10.662 ms | Fail |
| Node 22 CJS initialization | 4.083 ms | 7.907 ms | Fail |
| Node 24 ESM initialization | 3.067 ms | 6.878 ms | Fail |
| Node 24 CJS initialization | 2.444 ms | 6.632 ms | Fail |
| `theme/core` ESM graph | 17,271 B | 35,294 B | Fail |
| `theme/core` CJS graph | 17,641 B | 35,515 B | Fail |
| `tokens` ESM graph | 56,013 B | 29,906 B | Pass |
| `tokens` CJS graph | 63,308 B | 33,656 B | Pass |
| Compatibility `theme` ESM graph | 44,017 B | 87,082 B | Fail |
| Compatibility `theme` CJS graph | 44,764 B | 89,799 B | Fail |

The other 10 approved comparisons remain incomplete: one warm-transform protocol/identity mismatch, one Metro environment mismatch, and eight editor workload/source-identity mismatches. The diagnostic-only `runtime-emitted-bytes` metric also failed and is not counted as an approved recorded metric.

The host report identifies source revision `cd08322eb2dee3e520d27abefb4794c2d84095b9` and labels its source state as a working tree based on that revision. The minified package artifacts, graph hashes, Node versions, and floor executable hash are retained in the raw reports. The graph-audit changes present in that working tree were subsequently committed as `c08fd17`.

## Follow-up

Continue M10.5 with source-level optimization focused on the measured `theme/core` and compatibility `theme` graph contributors and module initialization. Preserve the current limits and evidence identities. The incomplete Metro/editor comparisons and native/device, visual, accessibility, and release-device gates remain separate work.
