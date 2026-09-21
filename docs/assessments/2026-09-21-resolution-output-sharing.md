# M4.1 resolved output sharing

Date: 2026-09-21
Status: implemented and locally qualified
Scope: weakly held runtime sharing for immutable style/theme snapshots,
original-reference retention for static styles and structural sharing for
unchanged resolved outputs.

## Cache contract

The runtime cache is keyed by the identity of both the input object and the
`NativeTheme` snapshot. It uses a shared-symbol `WeakMap`, so duplicate package
copies in one JavaScript realm can reuse results without creating a strong
global cache. A cache entry does not survive when its input or theme snapshot is
otherwise unreachable.

Static object styles return their original object reference. Tokenized styles,
flattened style arrays and recipes retain their existing semantic output while
repeated calls in one snapshot reuse the resolved result. A style map returns
its original map when every entry is unchanged; otherwise it reuses unchanged
entry references in a new map. A new theme object always has an independent
cache identity.

This slice assumes style exports and themes are immutable snapshots. It does
not infer invalidation from mutation, cache every possible runtime selection or
claim that React renders/native work have been eliminated.

## Qualification

- Focused tests cover static reference retention, same-snapshot token sharing,
  new-theme isolation, array flattening, unchanged map entries, repeated recipe
  outputs and a seeded 100-case property over literal/token styles.
- Existing runtime, structured-value, legacy migration, domain, scope, patch
  and optic suites remain green.
- The runtime and compatibility documentation state the identity and weak
  ownership boundaries separately from React/native performance claims.

No publication, device evidence or push occurred. Protected release/version
edits remain outside this slice.
