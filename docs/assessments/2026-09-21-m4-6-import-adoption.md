# M4.6 import adoption and graph policy

## Decision

Adopt `@opsydyn/crumbs-css/theme/core` for common runtime consumers in the
playground, Storybook and user-facing examples. Keep the compatibility
`@opsydyn/crumbs-css/theme` import only where a consumer uses an advanced API:
token providers/scopes or recipe resolution controls.

## Migration

The migration covers the common provider and themed-style imports in:

- `apps/playground/src` measurement, acceptance and app panels
- `apps/storybook/src/components` showcase and primitive views
- the themed-screen and recipe tutorials
- the compatibility guide recipe example

Mixed imports are split so the common hooks/provider do not pull the advanced
entrypoint into the same module. `resolveRecipeStyle`, `createRecipeResolver`
and `TokenThemeProvider` remain on `theme` by design.

## Regression policy

`packages/css/test/theme-entrypoint-policy.test.ts` scans those app and
documentation sources. It fails if a common API is imported from `theme`, if
an unknown/advanced API is imported from `theme/core`, or if a bare
compatibility import does not name an explicit advanced API. The public API and
runtime graph tests continue to assert that the compiled lean entrypoint does
not expose the advanced surface.

## Qualification

The package build, 725-test suite, package typecheck, playground typecheck,
Storybook typecheck, documentation build, budget validation and diff checks
pass. This validates source-level adoption and package contracts. It does not
yet measure the resulting Metro/Hermes application graph or alter the
fail-closed performance registry. Physical iOS and Android qualification
remain backlogged.

Next recommended slice: **M4.6 application graph verification** — build the
workspace and packed Expo/Storybook bundles after adoption, compare reachable
`theme` and `theme/core` bytes against the retained baseline, and decide
whether any runtime-byte threshold can be reopened. Keep physical iOS and
Android qualification backlogged.
