# M4.6 application graph verification

## Decision

Keep the M4.6 runtime-byte threshold fail-closed. The lean
`@opsydyn/crumbs-css/theme/core` entrypoint is present in workspace and packed
playground exports, but the application graphs do not yet justify reopening the
threshold. The playground still exercises advanced recipe APIs, so both
`theme.mjs` and `theme-core.mjs` are reachable. Storybook also reaches the
token-contract authoring graph and consequently bundles native-style and
vanilla-extract modules.

## Evidence

The complete measurements are in
[application graph evidence](../evidence/2026-09-21-m4-6-application-graph/graphs.json).
The checks built fresh Expo web, iOS and Android exports in both workspace and
isolated packed playground modes. All six playground source-map sets passed the
strict runtime contract and each contains 44,017 bytes of `theme.mjs` source
content plus 17,271 bytes of `theme-core.mjs` source content. The module sum is
61,288 bytes; it is a source-map diagnostic, not a minified or Hermes size.

The Storybook workspace and packed exports also completed on all three targets.
Their main maps contain the same theme entries plus these token support modules:

| Module | Source content bytes |
| --- | ---: |
| `tokens.mjs` | 1,029 |
| `domains-*.mjs` | 34,741 |
| `theme-token-*.mjs` | 14,630 |
| `native-style-*.mjs` | 8,674 |
| `native-capture-*.mjs` | 1,880 |
| `theme.mjs` + `theme-core.mjs` | 61,288 |
| **Crumbs total** | **122,242** |

The strict guard rejects Storybook at `tokens.mjs`, and the same maps contain
66,801 bytes of `@vanilla-extract/*` source content on iOS/Android (66,009 on
workspace web). The packed graph has the same Crumbs modules and 69,553 web /
70,345 native vanilla-extract source-content bytes. This is the runtime-boundary
finding: `createTokenContract` currently reaches `createTheme` in
`native-style`, which is an authoring/compiler layer. The exports are useful
functional checks, but they do not qualify an ordinary runtime graph.

The packed Storybook install used npm 11 legacy peer resolution because the
current Storybook range requests Reanimated 4.5.1 while the repository's
declared workspace version is 4.3.1. The disposable install also supplied
Storybook's optional bottom-sheet and SVG peers so the export exercised the same
surface as the workspace app. The packed result therefore provides packaging
coverage, not a byte-for-byte regression comparison with the locked workspace.

## Threshold outcome

The retained package comparison still records a 44,764-byte CommonJS
compatibility theme graph against an 11,307-byte approved baseline, a +295.9%
zero-growth failure. No exact pre-adoption Metro/Hermes application-byte
baseline is retained, and the source-map module measure cannot stand in for
native startup, frame, allocation or retained-memory evidence. The threshold
is therefore unchanged and the performance registry remains fail-closed.

The playground typecheck also excludes `src/incremental*.ts`, which are
benchmark-only Metro fixtures importing repository files absent from an
isolated packed consumer. The production app surface is unchanged.

Next recommended slice: **M4.6 token runtime boundary repair** — split token
contract/theme construction from the `native-style` and vanilla-extract
authoring graph (while retaining the compiler entrypoint), then repeat the
workspace and packed application graph check. Keep physical iOS and Android
qualification backlogged to the final device-enabled move.
