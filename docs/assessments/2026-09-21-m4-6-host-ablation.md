# M4.6 host ablation: domain-aware type surface

## Decision

Keep the domain-safe token API and route the public `NativeTheme` value shape
through a contract-level type marker. Legacy `createThemeContract` consumers
take a cheap recursive legacy path; identified domain contracts carry their
already-derived resolved value shape. This preserves precise domain and alias
types without asking TypeScript to infer a domain from every legacy token leaf.

## Root cause and ablation

The failing 10,000-token fixture started at 834,137 TypeScript instantiations
and 834,235 tsgo instantiations. The old `ThemeValues<T>` conditional checked
`DomainThemeVar<infer TDomain>` before the legacy token branch, so every legacy
leaf paid for the domain inference. A temporary legacy-only ablation returned
494,020 / 494,118 instantiations, confirming that conditional as the dominant
cost centre, but it would discard domain theme value typing and was not kept.

The repair adds a type-only `nativeThemeValuesBrand` to `TokenContract`. Its
value is the full resolved contract shape, including derived aliases. `ThemeValues<T>`
selects that shape for domain contracts and otherwise uses `LegacyThemeValues<T>`;
the runtime has no new value, dependency or branch.

## Evidence

Five fresh compiler repetitions at each editor scale completed in
[the repaired editor report](../evidence/2026-09-21-m4-6-host-ablation/editor-repaired.json).
At 10,000 tokens the exact medians are:

| Engine | Previous | Repaired | Change |
| --- | ---: | ---: | ---: |
| TypeScript | 834,137 | 113,999 | −86.3% |
| tsgo | 834,235 | 114,097 | −86.3% |

Against the approved zero-growth baseline, the repaired counts are 76.8%
below the recorded TypeScript baseline of 490,410 and 76.7% below the tsgo
baseline of 490,508. The scale report is raw host evidence, not a calibrated
editor budget or UI acceptance result.

## Qualification

`bun run build`, `bun run typecheck` and the full package suite pass with 717
tests and 25,988 assertions. Domain contract type fixtures still reject
cross-domain style tokens, and runtime token/context/alias tests retain their
existing behaviour. The ordinary CJS theme graph remains 44,764 bytes, so the
runtime-footprint regression is still open.

No dependency, Effect boundary, public runtime value, native target, Android
state or performance threshold changed.

Next recommended slice: **M4.6 runtime graph split** — provide an explicitly
lean core theme entrypoint for consumers that do not need dependency plans,
bounded recipe resolvers or token scopes, retain the compatibility entrypoint,
and measure both graphs before deciding whether the zero-growth policy can be
revisited. Keep physical iOS and Android qualification backlogged.
