# M3.6 reusable Optic theme focuses

Date: 2026-09-21  
Status: implemented and locally qualified  
Scope: reusable nested definition-token focuses with plain Crumbs types,
Effect 4 Optic internally, domain-changing validation and path-copy laws.

## API boundary

`@opsydyn/crumbs-css/tokens/optic` exposes `createTokenThemeFocus` and the
plain-data `TokenThemeFocus`/`TokenThemeFocusResult` types. A focus is created
from a registered `DomainThemeVar` definition token. Alias leaves and tokens
from another contract fail with `CRUMBS_CSS_TOKEN_THEME_FOCUS_INVALID` before a
focus can be cached or used.

The entrypoint imports `effect/Optic` internally and bundles it in its own
subpath. The ordinary `tokens` entrypoint remains Effect-free, and generated
public declarations do not import Effect types.

## Update semantics

The pure `getValues`, `replaceValues` and `modifyValues` methods apply a
reusable path focus with structural sharing: only ancestors of the changed
leaf are copied, while unrelated branches retain their identities. Inputs are
never mutated. The semantic lens laws are exercised independently with a
seeded 100-case property suite.

The theme methods verify contract compatibility and pass a one-leaf sparse
update through `applyTokenThemePatch`. The resulting values and native token
map are derived atomically, and a domain-changing result returns the existing
structured validation diagnostic. The previous snapshot remains reference
identical after a failed operation. Identity sharing of the final resolved
`NativeTheme` remains a separate M4 runtime guarantee; this slice makes the
pure canonical-value sharing promise explicit instead of implying that the
derived output graph is already shared.

## Qualification

- Focused tests cover nested reads, alias derivation, invalid domain-changing
  updates, old-snapshot preservation, foreign/alias rejection and contract
  mismatch.
- A seeded property suite covers 100 semantic lens-law cases.
- Pure replacement asserts path-copy structural sharing for unaffected branches.
- Public API, packed consumer ESM/CJS loading, package build and declaration
  checks cover the new subpath. The Effect-free ordinary runtime isolation
  contract remains green.

No publication, device evidence or push occurred. Protected release/version
edits remain outside this slice.
