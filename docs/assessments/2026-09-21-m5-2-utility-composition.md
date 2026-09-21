# M5.2 utility composition assessment

## Decision

Extend the native authoring contract so finite utility outputs can be used in
ordered style compositions and view recipes, and add the mapped
`styleVariants(values, mapper)` overload from vanilla-extract.

## Contract

- The mapper receives the source value and its variant key and returns a native
  authoring rule. The output map retains each mapped rule's native result type.
- Utility class references are valid composition entries and recipe bases,
  variant branches, and compound styles. Recipe paths preserve authored order
  and native token payloads.
- Existing direct `styleVariants` calls, debug IDs, primitive helpers and
  style-map metadata remain compatible.

## Evidence and limits

The type fixture checks contextual finite scale and key inference, native
composition output, mapped result typing, and utility-backed recipe config.
The transformer fixture evaluates composed output, mapped literal/token values,
recipe branches, and compound styles. Full device rendering and dynamic
conditions remain outside this slice; those are scheduled for M5.3–M5.5 and
the final device-enabled M4.6 move.

Next recommended roadmap item: **M5.3** — support static selections in
authored modules and dynamic runtime selection through generated lookup plans,
with public names and types distinguishing those phases. Android stays
backlogged until the final device-enabled move.
