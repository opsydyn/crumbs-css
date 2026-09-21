# M4.6 runtime graph split

## Decision

Add `@opsydyn/crumbs-css/theme/core` as an independent lean runtime entrypoint
for provider, hook and token-resolution consumers. Keep
`@opsydyn/crumbs-css/theme` as the compatibility entrypoint for token scopes,
dependency plans and recipe resolver controls. The split is opt-in: existing
imports keep their API and graph.

## Surface

`theme/core` exposes `ThemeProvider`, `useTheme`, `useThemeSelector`,
`useThemedStyle`, `useThemedStyles`, `resolveThemeTokens`,
`resolveThemeStyles`, `createThemeTokenReference`, `isThemeTokenReference` and
the native token-reference type/value markers. It deliberately leaves
`TokenThemeProvider`, token scopes, dependency plans, recipe resolution and
their controls on `theme`.

The two runtime builds are separate tsdown configurations. Putting both entry
points in one multi-entry build would create a shared full-runtime chunk and
would defeat the graph split.

## Evidence

The emitted graph report is in
[graphs.json](../evidence/2026-09-21-m4-6-runtime-graph-split/graphs.json).
Both formats remain React-only externally and have no local compiler/tooling
imports:

| Entry | ESM bytes | CommonJS bytes | gzip ESM | gzip CommonJS |
| --- | ---: | ---: | ---: | ---: |
| `theme` compatibility | 44,017 | 44,764 | 10,558 | 10,667 |
| `theme/core` lean | 17,271 | 17,641 | 4,450 | 4,527 |

The lean graph is 60.8% smaller in ESM and 60.6% smaller in CommonJS. Public
API, packed-consumer and guarded runtime-isolation tests cover both paths.

## Qualification and limits

`bun run build`, the focused public API/runtime/packed-consumer tests and the
full package verification remain required before release. This measurement is
host-side emitted output only. It does not change the existing zero-growth
performance registry, establish Metro/Hermes bundle size, or qualify native
frames, allocations, devices or retained memory. Physical iOS and Android
remain backlogged to the final device-enabled move.

Next recommended slice: **M4.6 import adoption and graph policy** — inventory
internal/example consumers, move common runtime imports to `theme/core`, and
add a regression check that prevents advanced APIs from leaking into the lean
entrypoint before revisiting the runtime-byte threshold. Keep physical iOS and
Android qualification backlogged.
