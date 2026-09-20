# M3.2 stable token identity and provider boundary

Date: 2026-09-20
Status: implemented and locally qualified
Scope: stable domain-token identity, deterministic public IDs and contract-bound theme lookup.

## Decision exercised

Identified domain contracts accept an explicit `{ owner, name, version }`
identity. The identity is validated at contract creation and contributes to a
canonical shape signature containing every token path and domain. Reusing an
identity with a different path or domain shape fails with
`CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION`.

The public token ID format is inspectable and deterministic:

```text
@acme/tokens/foundation@1#5:color/6:accent
```

The generated native variable encodes the package and contract segments in
fixed-width hexadecimal. It therefore stays inside the existing
`--crumbs-[A-Za-z0-9_-]+` grammar without evaluation-order counters, random
suffixes or object-identity dependence. Re-evaluating the same identity and
shape during hot reload produces the same references. Identical paths under
different identities produce different variables and IDs.

`TokenThemeProvider` and `useTokenTheme` use a shared global-symbol React
context keyed by the identity. Provider lookup checks both the identity key and
the canonical shape signature; a generic hook type assertion cannot make an
incompatible theme valid. Contract metadata and the token registry also use
global symbols so duplicate Crumbs package copies in one JavaScript realm can
recognise the same contract metadata.

Unidentified legacy contracts remain on the existing path-scoped
`ThemeProvider`/`useTheme` route. Aliases, independent scope axes, atomic
patches and Optic updates remain later M3 slices.

## Qualification

- `token-contract-identity.property.test.ts` covers reordered evaluation,
  hot-reload re-evaluation, identical paths under distinct identities,
  identity-shape collisions, generated identity pairs and the duplicate-copy
  global metadata symbol.
- `token-contract-identity-types.ts` keeps the identified contract, theme and
  provider/hook relationship in the TypeScript declaration gate.
- `theme-contract-ownership.test.ts`, token-domain tests, theme-runtime tests
  and the public API contract preserve the legacy path registry and M3.1
  domain boundary.
- The ordinary `tokens` bundle remains Effect-free. The existing
  `tokens/schema` entrypoint remains the dedicated Effect 4 ingress boundary.

This slice does not claim a full independently installed duplicate-package
consumer or native-device provider acceptance; those belong to the later
distribution and reference-system gates.
