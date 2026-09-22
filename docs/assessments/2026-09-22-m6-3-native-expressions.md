# M6.3 native expression data contract

## Decision

Close M6.3 as the version-1 inspectable expression contract. The new
`expressions` module is pure data and validation: it introduces no evaluator,
React hook, Effect service or opaque callback. The style and package-root
authoring surfaces expose the constructors so a `.css.ts` module can describe
a supported program before M6.4 adds folding and dynamic evaluation.

## Contract

- Domains are explicit and unit-bearing: unitless numbers, `px` lengths with
  an `allowNegative` policy, `ms` durations, fractional opacity, native colour
  strings and finite string enums. Domains reject unknown fields, malformed
  units, duplicate enum members and invalid literal values.
- Nodes cover literals, token and finite-condition references, aliases,
  missing-input fallbacks, ordered composition, typed add/subtract/scale/clamp
  operations and exhaustive finite matching. Scalar operators require domain
  compatibility; opacity excludes add/subtract; match cases are unique and
  canonicalised to the condition axis order.
- Every node carries a frozen, deduplicated dependency set of token names and
  M6.1 condition axes. Programs repeat the root set. Dependency identity is
  independent of composition order while authored child order remains in the
  node. No node contains an executable field.
- A match without a fallback must cover the complete finite axis. A partial
  match therefore has to declare its fallback explicitly. Fallbacks are
  reserved for missing inputs and do not turn validation or domain errors into
  successful values.

The [native expression v1 specification](../specifications/native-expression-v1.md)
records the domains, node semantics and extension rules. M6.4 owns
constant-folding and dynamic evaluation; M6.5 owns laws and precise
dependency-driven invalidation.

## Qualification

Focused tests cover malformed and frozen domains, dependency canonicalisation,
property-based composition-order equivalence, typed operator admission,
fallback/composition invariants, exhaustive-match coverage and finite
condition references. Type fixtures reject cross-domain arithmetic and
out-of-domain enum literals. The full package gate passes with 764 tests,
26,706 assertions and 127 files; package build and typecheck pass, and the
20-page documentation build passes. The performance registry remains
fail-closed with thresholds pending for JS/UI frames, allocations, retained
memory and emitted runtime bytes, as expected for the separate M1.8 gate.

Native device/frame/allocation evidence, container queries and Android remain
outside this slice. Android is still the final device-enabled move.
