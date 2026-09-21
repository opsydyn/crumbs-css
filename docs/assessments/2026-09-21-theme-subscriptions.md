# M4.4 selective theme subscriptions

## Decision

Crumbs now exposes `useThemeSelector` and routes theme consumers through
selector-backed external stores. Providers publish immutable snapshots through
React's `useSyncExternalStore` contract. A selector consumer is notified only
when its selected reference changes; token theme scopes use separate stores so
updates remain local to their scope.

## Rationale

Context-only theme reads make every consumer observe every theme object change,
even when its resolved value is unchanged. A store per provider gives React a
consistent snapshot boundary and lets a component subscribe to the narrow
value it uses. Publishing one snapshot at the layout commit prevents a render
from combining values from different theme revisions. Selector stores attach
to their parent only while subscribed, which keeps unmounted consumers out of
the notification path.

The store and context identities are registered under `Symbol.for` keys. A
duplicate or hot-reloaded package copy therefore finds the same provider
context in a JavaScript realm instead of silently creating an isolated tree.

## Contract

- Theme snapshots and resolved style inputs are immutable. Mutating either
  after publication is outside the invalidation contract.
- Selectors are compared with `Object.is`; return primitives or memoized
  references when unchanged input should not invalidate a consumer.
- `ThemeProvider`, `TokenThemeProvider` and `TokenThemeScopeProvider` each own
  a store. Parent and nested scope updates do not share notification state.
- `useThemedStyle` and `useThemedStyles` select through the existing weak
  resolution cache, preserving stable output references for unchanged inputs.
- Selector consumers unsubscribe on unmount. Explicit store disposal rejects
  later writes and clears listeners; provider lifetime remains owned by React.

## Evidence

`packages/css/test/theme-store.test.ts` covers atomic publication to multiple
listeners, no-op identity updates, selected-reference invalidation, unmount
cleanup, independent nested stores, disposal and shared hot-reload context
identity. The runtime bundle remains React-only and the package typecheck and
build pass. Public API tests cover the new `useThemeSelector` export.

## Limits and follow-up

These tests qualify the store and hook contract; they do not measure React
render counts, Hermes/native frame time, device memory, or Android behaviour.
M4.5 will compare cached and uncached evaluators on generated inputs and check
that scope or artifact replacement cannot return stale cached results.
