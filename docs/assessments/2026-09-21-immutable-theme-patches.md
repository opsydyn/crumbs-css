# M3.5 immutable theme patches and external theme decoding

Date: 2026-09-21
Status: implemented and locally qualified
Scope: atomic updates for complete token themes and a versioned Effect 4
ingress format for persisted or cross-process values.

## Patch contract

`applyTokenThemePatch(contract, current, patch)` accepts a sparse
`TokenThemeLayer`. It first verifies that the current theme belongs to the
identified contract and has the same canonical shape. It then validates every
patch path, rejects unknown or derived alias leaves, checks the token domain,
clones the canonical definition values, merges the patch and calls the existing
theme constructor once. The old snapshot is read only; a failed operation
returns `{ ok: false, error }` before any replacement exists.

Successful results return `{ ok: true, theme, changedPaths }`. `theme.values`
and `theme.tokens` are derived from the same committed canonical values, and
`changedPaths` is frozen for consumers that need selective invalidation later.
Legacy unscoped contracts have no identity metadata, so patching requires the
same contract object. Identified contracts use both the identity key and shape
signature to prevent a snapshot from being applied to an unrelated copy.

## External payload contract

The `@opsydyn/crumbs-css/tokens/schema` subpath now exposes an Effect 4 codec
for this exact versioned shape:

```ts
{
  _tag: "CrumbsTokenTheme",
  version: 1,
  contract: { owner, name, version },
  values: { [stablePublicTokenId]: string | number },
}
```

`decodeExternalTokenTheme` performs plain-data inspection, exact-field
validation and finite-number checks. `encodeExternalTokenTheme` validates and
serialises an already decoded payload. The schema entrypoint returns the
existing structured `ContractResult` issues with boundary and path data;
ordinary token and theme entrypoints do not import Effect.

`createTokenThemeFromExternalPayload` is the Effect-free second step. It binds a
decoded payload to one identified local contract, maps stable public IDs to
definition paths, validates local domains and reconstructs aliases from their
local graph. Unknown or derived IDs, missing definitions, identity mismatches
and domain violations return stable diagnostics without publishing a theme.

## Qualification

- Focused patch properties cover canonical and derived updates, old-snapshot
  preservation, alias/unknown rejection and 25 generated valid patches.
- External ingress tests cover codec round trips, stable-ID mapping, alias
  reconstruction, missing/unknown IDs, contract mismatch, domain mismatch,
  unknown fields, unsupported versions and non-finite numbers.
- Public API tests cover the new ordinary token helpers and the dedicated schema
  entrypoint. Package typechecking passes.
- The ordinary token bundle remains Effect-free; only `tokens/schema` carries
  the schema/data-codec dependency.

This slice does not add Optic-based focus updates, structural sharing of
unaffected subtrees, selective subscriptions, device rendering evidence or
publication. Those remain M3.6 and later runtime/distribution gates.
