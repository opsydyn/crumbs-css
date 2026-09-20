# M3.3 layered token aliases and origin tracing

Date: 2026-09-20
Status: implemented and locally qualified
Scope: foundation, semantic and component aliases for identified domain contracts.

## Decision exercised

`defineAlias` and `alias` accept an exact dot path or path array. The target
must resolve to a token in the same contract and its domain is inherited by the
alias. A caller may declare a domain explicitly; a mismatch is rejected before
the contract is registered. Aliases may point to other aliases, but the graph
must be acyclic.

Alias leaves are derived. `createTokenTheme` requires every `defineToken` leaf,
allows alias-only subtrees to be omitted, resolves aliases into both
`theme.values` and the flat native token map, and rejects attempts to override a
derived alias. A target that is structurally absent is accepted only when the
alias declares both a domain and a fallback. Fallbacks are domain-checked and
never make a required foundation token optional.

Each alias carries immutable target metadata and an origin chain. The public
`getTokenOrigin` helper exposes the alias path, target path, public IDs and the
complete foundation-to-component chain. Alias targets and fallbacks participate
in the canonical identified-contract shape signature.

## Diagnostics

- `CRUMBS_CSS_TOKEN_ALIAS_MISSING_TARGET` identifies an absent target without an
  explicit fallback contract.
- `CRUMBS_CSS_TOKEN_ALIAS_DOMAIN_MISMATCH` identifies a declared domain that
  differs from the resolved target domain.
- `CRUMBS_CSS_TOKEN_ALIAS_FALLBACK_DOMAIN_MISMATCH` identifies an invalid
  fallback value.
- `CRUMBS_CSS_TOKEN_ALIAS_CYCLE` identifies an alias graph cycle.
- `CRUMBS_CSS_TOKEN_ALIAS_OVERRIDE` prevents direct theme values from hiding
  derived alias semantics.

## Qualification

- `token-contract-aliases.property.test.ts` covers valid foundation-to-component
  chains, fallback values, origin tracing, missing targets, domain errors,
  cycles and deterministic generated paths.
- `token-contract-alias-types.ts` covers required foundation input, omitted
  alias input, inherited alias domains and compile-time alias overrides.
- Existing token-domain, identity, theme-runtime, ownership and public API
  suites remain green. The ordinary `tokens` bundle remains Effect-free.

Scope axes, atomic theme patches, external alias manifests and cross-contract
alias imports remain later M3 work. This slice does not claim native-device
acceptance, publication or push.
