# M5.3 static and runtime Sprinkles selection assessment

## Decision

Keep `createSprinkles` as the authored static utility path and add a separate
generated lookup-plan path for state-driven selections. A lookup plan stores one
compiled native reference per property and scale; it never enumerates every
combination of scales. Runtime code uses `createSprinklesResolver` to select
those references in authored order.

## Contract

- `createSprinklesLookupPlan(definition, debugId?)` is an authoring/build-time
  API exposed from `/style`. Its tagged, versioned plan retains primitive
  domains, property scales, and ordered shorthand targets.
- `createSprinklesResolver(plan, { cacheSize })` is a runtime API exposed from
  `/theme`. It validates the plan and selection, returns a readonly native
  style array, preserves selection-key and shorthand-target order, and rejects
  unknown names or scales before returning a result.
- Resolver caching is local and bounded to `0..1024` entries, with a default of
  32. `getCacheStats`, `clearCache`, and `dispose` make retention observable and
  lifecycle control explicit.
- `useThemedStyles` resolves tokenized entries inside a lookup plan before a
  resolver is created. This keeps dynamic selection on the same theme-token
  path as static compiled exports.
- `NativeSprinkleStaticResult`, `NativeSprinklesLookupPlan`,
  `NativeSprinklesResolutionPlan`, and `NativeSprinklesResolver` distinguish
  authored style results, generated plans, validated runtime plans, and
  callable runtime selectors in the public type surface.

## Evidence and limits

The focused suite covers transformed plans, primitive-scoped atomic output,
ordered shorthand and longhand selection, invalid names and scales, bounded
cache eviction and disposal, cached versus uncached property-based semantic
equivalence, token resolution, package entrypoints, packed consumer imports,
and the static/runtime type fixture. Package typecheck and the focused
Sprinkles/theme suites pass.

This slice does not choose the final atomic, fused, or hybrid representation;
that comparison belongs to **M5.4** and requires identical fixtures plus byte,
startup, allocation, array-length, and native-frame measurements. Android and
release-device frame/allocation qualification remain backlogged until a device
is available.

Next recommended roadmap item: **M5.4** — compare atomic, fused, and hybrid
output on identical design-system fixtures, choose the default from evidence,
and document the result. Android remains the final device-enabled move.
