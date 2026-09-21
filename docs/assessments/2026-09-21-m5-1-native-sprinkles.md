# M5.1 native Sprinkles assessment

## Decision

Admit a finite native adaptation of vanilla-extract's
`defineProperties` / `createSprinkles` API through
`@opsydyn/crumbs-css/style` and the package root. A property set declares its
React Native primitive domain, names finite scale values, and may declare
typed shorthand targets. Static selections emit the existing Crumbs native
style class contract, so they are transformed by the same scalar and
structured IR gates as hand-authored styles.

## Contract

- `primitives` accepts `view`, `text`, and `image` kinds; omitted primitives
  mean the shared all-kind domain.
- Scale values use the native property type. Branded colour, length, opacity,
  and enum tokens are admitted only for compatible properties.
- Numbers must be finite. Empty values, cycles, accessors, and unsupported
  scale records fail while the property set is defined.
- Shorthands target declared properties. Selection keys are processed in
  authored order, shorthand targets expand in declaration order, and a later
  longhand or alias is the winner for the overlapping native property.

## Evidence and limits

The type fixture rejects text-only properties in a view set, cross-domain
branded tokens, missing shorthand targets, and unknown scale names. The
transformer fixture proves a view-scoped class retains token payloads and
applies the longhand-over-shorthand precedence rule. Runtime tests cover
non-finite scale rejection and invalid shorthand targets.

This slice does not yet compose utility outputs into recipes or style arrays,
generate dynamic lookup plans, compare atomic/fused/hybrid emission, or run
device budgets. Those belong to M5.2–M5.5 and the final device-enabled M4.6
move; Android remains backlogged.

Next recommended roadmap item: **M5.2** — support utility outputs in style
composition and recipe bases/branches, then add the mapped `styleVariants`
overload.
