# M4.3 recipe resolution plans

## Decision

Recipe selection now has an explicit plan and bounded resolver lifetime. A
resolver precomputes authored variant order, default values, compound
requirements and the selection-key dimensions once for an immutable recipe
snapshot. It evaluates only the requested selection, so variant values are not
expanded into an eager Cartesian product.

`createRecipeResolver` accepts a finite `cacheSize` option. The default is 32,
zero disables retention and the maximum is 1024. Each resolver owns a local
least-recently-used cache and exposes hit, miss, eviction, capacity, size and
disposal receipts. `clearCache` releases current entries; `dispose` releases
the cache permanently and rejects later calls. No process-global strong
selection cache was introduced.

Canonical keys merge defaults with the supplied selection in the same order as
the existing resolver. Variant lookup retains the existing string coercion,
while key encoding remains type-sensitive so boolean compound requirements do
not become equivalent to string values. Equivalent selections with different
object property order share the same frozen output array.

## Evidence

- The focused plan suite verifies frozen plan data, authored ordering, default
  selection, compound requirements, canonical key reuse, type-sensitive
  compound matching, LRU eviction, an uncached resolver and disposal.
- Existing recipe semantics and diagnostics remain covered by the benchmark
  parity suite, the seeded property suite and theme-runtime tests.
- The package build and typecheck pass. Full package and docs qualification are
  required before commit; no native/device, React-render or retained-memory
  performance claim is made by this slice.

## Boundaries

The plan assumes recipe and style inputs are immutable snapshots. It does not
add subscriptions, React concurrent-render coordination, schema traversal,
native engine dependencies or eager variant products. M4.5 will compare cached
and uncached evaluators and test invalidation completeness; M4.6 owns device,
bundle, editor and retained-memory budgets.
