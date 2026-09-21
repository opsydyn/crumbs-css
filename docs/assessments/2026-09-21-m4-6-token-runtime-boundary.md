# M4.6 token runtime boundary repair

## Decision

Move legacy theme contract construction out of `native-style.ts` into the
dedicated `theme-contract.ts` runtime module, then make the domain token
implementation depend on that module directly. Keep `native-style.ts` as the
authoring/compiler compatibility surface by re-exporting the contract helpers.
This lets `@opsydyn/crumbs-css/tokens` serve ordinary application token
contracts and themes without pulling the vanilla-extract authoring graph into
Metro.

Effect remains behind the explicit `/tokens/schema` and `/tokens/optic`
entrypoints. This slice does not turn Effect into a userland dependency or
change the public dependency policy.

## Implementation

- Added `packages/css/src/theme-contract.ts` for `createThemeContract`,
  `createTheme`, legacy theme types and token-path helpers.
- Redirected `tokens/domains.ts` and `tokens/optic.ts`'s contract imports to
  the new module. The latter remains an advanced Effect boundary because it
  imports `effect/Optic` by design.
- Expanded the runtime source contract to accept `tokens` and its hashed
  `domains`, `theme-contract` and `theme-token` chunks while continuing to
  reject authoring, compiler, native-capture, schema and optic modules.
- Added ESM/CommonJS graph tests that fail if token runtime construction gains
  Node built-ins, vanilla-extract, CSS conversion or Effect imports.
- Documented `/tokens` as the ordinary runtime-safe domain-token entrypoint and
  retained explicit guidance for the Effect Schema/Optic entrypoints.

## Evidence

The machine-readable measurements are in
[token runtime graph evidence](../evidence/2026-09-21-m4-6-token-runtime-boundary/graphs.json).
The direct emitted graphs are compiler-free:

| Entry | Reachable files | External imports | ESM/CJS entry bytes |
| --- | ---: | --- | ---: |
| `tokens.mjs` | `tokens`, `domains`, `theme-contract`, `theme-token` | none | 1,029 |
| `tokens.cjs` | `tokens`, `domains`, `theme-contract`, `theme-token` | none | 1,529 |

Fresh workspace and isolated packed Storybook exports completed for web, iOS
and Android. All four source-map sets per consumer pass the strict runtime
guard; secondary web maps contain no Crumbs sources. Main maps reach six
Crumbs modules totalling 117,301 bytes of `sourcesContent`:

| Module | Source-content bytes |
| --- | ---: |
| `theme-core.mjs` | 17,271 |
| `tokens.mjs` | 1,029 |
| `domains-*.mjs` | 34,743 |
| `theme-token-*.mjs` | 14,630 |
| `theme-contract-*.mjs` | 5,611 |
| `theme.mjs` | 44,017 |
| **Total** | **117,301** |

The previous Storybook graph reached `native-style` and `native-capture` and
totalled 122,242 bytes. The repaired maps contain zero `@vanilla-extract/*`
and zero Effect source entries. This is source-map graph evidence, not a
native startup, frame-time, allocation or retained-memory measurement.

The packed Storybook install used npm 11 legacy peer resolution. Its declared
Storybook range resolved 10.6.0 while the workspace lockfile retains 10.4.4;
optional bottom-sheet and SVG peers were installed so the export exercised the
same Storybook surface. That is packaging coverage, not an absolute byte
comparison against the locked workspace.

## Qualification and limits

`bun test` passes 727 tests and 26,013 assertions. Package typecheck, package
build, Storybook workspace and packed exports, both runtime guards, playground
workspace qualification, app typecheck, documentation build and budget
validation pass. The budget registry remains valid but fail-closed because its
JS/UI frame, allocation and retained-memory baselines are still pending or
diagnostic. The retained package runtime-byte comparison remains the
deterministic +295.9% zero-growth failure.

Android was inspected only through exported JavaScript/source maps. Physical
iOS and Android qualification remains backlogged to the final device-enabled
move.

Next recommended slice: **M4.6 application-byte threshold re-evaluation** —
rebase the runtime graph comparison on the repaired six-module boundary,
decide whether an exact Metro/Hermes application baseline can be admitted, and
keep the registry fail-closed until the baseline and remaining device/editor
gates are explicit. Keep physical iOS and Android qualification backlogged.
