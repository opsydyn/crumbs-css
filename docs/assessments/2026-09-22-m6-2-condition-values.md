# M6.2 conditional value assessment

## Decision

Close M6.2 as the conditional-value normalisation and mapping contract. The
API mirrors the useful part of vanilla-extract's conditional helpers while
keeping Crumbs' finite native condition model explicit: callers configure an
ordered name list beginning with `default`, values normalise to a frozen map,
and branch mapping attaches the M6.1 matchers before resolution.

## Canonical value forms

`NativeConditionalValue<TValue, TConditions>` accepts:

- a scalar, which becomes the `default` entry;
- a condition-keyed record, whose keys must belong to the configured finite
  name list; or
- a bounded responsive tuple whose positions follow that list.

`createNativeNormalizeValueFn` emits keys in configuration order and omits
`null` and `undefined` entries. A tuple longer than the configured condition
list fails at runtime. The built-in responsive configuration is ordered as
`default`, `compact`, `medium`, `expanded`, with matchers for the M6.1 width
buckets. Object-valued style data should use the explicit `default` record
form so it cannot be confused with the conditional record shape.

`createNativeMapValueFn` normalises first, then maps only present values while
passing the condition name to the mapper. `mapNativeConditionValueToBranches`
converts the canonical map into M6.1 branches, preserving deterministic order
and leaving absent conditions available for resolver fallback behaviour.

## Qualification

The focused suite covers scalar/record/tuple equivalence, canonical key order,
nullish omission, finite-name and tuple bounds, mapping callbacks, matcher
attachment and resolver results. A fast-check property exercises generated
four-entry tuple/record pairs. Public API and entrypoint policy tests cover both
runtime surfaces; package typechecking covers the conditional-value fixtures.

This slice does not add expression nodes, static folding, dependency-aware
evaluation, container measurement or native device/frame evidence. Those
remain M6.3–M6.5 and M11 work. Android remains the final device-enabled move.
