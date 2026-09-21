# M4.6 runtime emitted-byte budget decision

## Decision

Treat the retained 11,307-byte `effect.runtime.cjs.graph-bytes` value as
historical compatibility-entrypoint lineage, not as a same-functionality
ceiling for the current package. The current runtime has a materially larger
public contract and now exposes three useful graph scopes: `theme-core`,
`tokens` and the full compatibility `theme` entrypoint.

Record the rebuilt graph sizes as candidate split baselines, but do not add
new metrics or change `packages/css/bench/budgets.json` in this slice. The
registry remains fail-closed until a reviewer approves the exact ceilings and
allowed-growth policy for each admitted entrypoint and format.

The machine-readable inventory and decision are in
[decision.json](../evidence/2026-09-21-m4-6-runtime-byte-budget-decision/decision.json).

## Baseline lineage

The approved selector came from the 2026-09-14 audit at source revision
`c6e5635`. That audit measured the old `theme.cjs` graph at 11,307 bytes (and
the ESM graph at 10,908 bytes), with React as its only external. The old
`theme-runtime.ts` was 325 lines. The current source is 1,078 lines and the
runtime/token changes since that revision add 2,531 lines and remove 72 across
the runtime, token domains, token identities, dedicated entrypoints and build
configuration.

The current `theme` graph is therefore an expanded compatibility surface, not
the same workload as the historical graph. Forcing it back to 11,307 bytes
would mean removing supported behaviour or changing the public contract. The
current evidence does not identify a same-functionality reduction target that
would justify doing that.

## Current graph inventory

The post-build graph scan sums every local emitted file reachable from each
entrypoint. It records direct external imports and nonliteral loads separately:

| Entry | ESM graph | CJS graph | External imports |
| --- | ---: | ---: | --- |
| `theme-core` | 17,271 bytes | 17,641 bytes | `react` |
| `tokens` | 56,013 bytes | 63,308 bytes | none |
| compatibility `theme` | 44,017 bytes | 44,764 bytes | `react` |

The `tokens` entry file itself is only 1,029/1,529 bytes; its four local
domain, contract and token chunks are part of the emitted graph and are
included in the 56,013/63,308-byte totals. It remains free of Effect,
vanilla-extract, CSS conversion, native-style and native-capture imports.

The historical CJS comparison is still a real deterministic failure:
44,764 bytes against 11,307 bytes is +33,457 bytes, or +295.90%. It remains
visible as a fail-closed compatibility check rather than being hidden by the
new split candidates.

## Candidate split budget

The candidate packet records current graph sizes without silently turning them
into policy:

| Candidate metric | ESM baseline | CJS baseline | Ceiling/growth |
| --- | ---: | ---: | --- |
| `runtime-theme-core-graph-bytes` | 17,271 | 17,641 | pending reviewer decision |
| `runtime-tokens-graph-bytes` | 56,013 | 63,308 | pending reviewer decision |
| `runtime-theme-compatibility-graph-bytes` | 44,017 | 44,764 | pending reviewer decision |

These are candidate baselines, not performance qualification. A future
admission must decide whether ESM and CJS share a ceiling, approve absolute
limits and growth percentages, retain the exact build and graph protocol, and
add selectors/evidence to the registry only after that decision. The existing
approved metric remains unchanged while that review is pending.

## Qualification and limits

`bun run build` and the direct graph scan pass for all six entrypoint/format
pairs. This establishes reproducible emitted artifacts and hashes. It does
not measure minified or Hermes contribution, module startup, frame time,
allocation or retained memory. Those remain separate budget domains, and the
release-Hermes device gates are still incomplete. Android was not moved from
its parked source-map-only state; physical iOS and Android qualification
remain backlogged.

No dependency, public API, native target, threshold, registry status or
publication state changed.

Next recommended slice: **M4.6 split-budget review and admission** — review
the three candidate scopes, approve concrete ESM/CJS ceilings and growth
rules, then add only the accepted metrics to the fail-closed registry. If the
review rejects the current compatibility size, follow with a same-functionality
`theme` graph reduction slice. Keep physical iOS and Android qualification
backlogged to the final device-enabled move.
