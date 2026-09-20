# M3.4 independent theme contexts and nested scopes

M3.4 adds explicit brand, colour-mode and density axes to the identified token
theme boundary. The implementation keeps one canonical base theme and derives
each scoped snapshot by applying sparse, domain-checked layers.

## Snapshot contract

`createTokenThemeSnapshot(contract, { base, contexts })` requires a complete
base value object. Context values are sparse `TokenThemeLayer` records and may
override only registered definition leaves. Alias leaves remain derived and
cannot be supplied by a context. The resulting `NativeTheme` contains a
complete nested `values` tree and matching flat `tokens` map; invalid base or
context data throws before the function returns.

The precedence is deterministic:

```text
base < brand < mode < density
```

The order is encoded by `TOKEN_THEME_CONTEXT_PRECEDENCE`, so object insertion
order cannot change a collision winner. `createTokenThemeScopedSnapshot`
extracts the canonical definition values from an existing complete theme and
rebuilds a new complete snapshot with the supplied layers.

## React scope contract

`TokenThemeProvider` remains the root for one identified contract and complete
base theme. `TokenThemeScopeProvider` adds or replaces one axis in the nearest
state for that contract. A nested provider for the same axis replaces that axis
only; other axes remain active. A nested provider's position does not alter the
fixed precedence order. The active `useTokenTheme` result is always the
materialized complete snapshot.

React portals retain the context chain of the React tree that owns the portal.
A portal mounted into an independent root has no implicit Crumbs ownership and
must mount its own complete provider plus any required scope layers. This keeps
contract identity and scope ownership explicit across root boundaries.

## Qualification

- Context property tests cover reverse insertion order, alias derivation,
  complete rebasing, invalid values, no partial publication and 25 generated
  precedence cases.
- Type fixtures preserve domain-specific layer values and reject invalid length
  and enum literals at compile time.
- Existing alias, identity, theme runtime and public API suites remain green.

This slice does not add immutable patch publication, external theme decoding,
Optic updates, selective subscriptions or native-device evidence. Those remain
M3.5, M3.6 and the later runtime/device gates.
