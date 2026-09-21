# M3.7 legacy token migration boundary

Date: 2026-09-21
Status: implemented and locally qualified
Scope: preserve the pre-M3 unscoped theme path while rejecting legacy or foreign
token references at identified domain-contract boundaries.

## Compatibility contract

`createThemeContract` and `createTheme` continue to accept the legacy
`string | number` value shape. This keeps existing native token values usable
while a design system migrates; the legacy path does not infer colour, length,
opacity or enum semantics. Legacy references remain valid through the ordinary
`ThemeProvider`/`useTheme` route and retain the existing exact-raw-path registry
rule.

The legacy reference shape carries a native variable name only. It therefore
cannot authenticate a provider across package copies or deep-cloned contracts.
The migration boundary keeps that limitation explicit rather than treating a
flat token map as evidence of ownership.

## Domain boundary

Domain contracts record token ownership in a contract-local map. `createTheme`
rejects a token leaf that was taken from another domain contract, even when its
raw path happens to look valid. Runtime resolution applies the same check for an
identified theme, returning `CRUMBS_CSS_TOKEN_THEME_TOKEN_CONTRACT_MISMATCH`
before an old `var(--crumbs-…)` reference can read an unrelated flat value.
Legacy themes continue to resolve their own references, so consumers can migrate
contracts incrementally. New distributed systems should use explicit domains,
stable identity, `createTokenTheme`, `TokenThemeProvider` and `useTokenTheme`.

## Qualification

- Focused migration tests cover permissive legacy strings/numbers, legacy
  provider resolution, old-token rejection under an identified theme and
  foreign-leaf rejection during identified theme creation.
- Existing ownership, domain, provider, patch, scope and optic suites retain
  their prior semantics.
- Compatibility guidance and the diagnostic table document the exact migration
  boundary and its limits.

No publication, device evidence or push occurred. Protected release/version
edits remain outside this slice.
