# M2.2au structured array IR: transform origin, matrix and font variants

M2.2au batches three closed React Native array families behind independent structured native IR contracts. The batch covers `transformOrigin`, `transformMatrix` and text-only `fontVariant`; ordered `transform` remains a separate operation-list contract.

## Installed boundary

The installed React Native declarations expose `transformOrigin` as either a string or an array of two or three numbers/strings, `transformMatrix` as an array of sixteen numbers, and `fontVariant` as an array of public font-variant literals. Crumbs admits the static, finite subset that can be represented without runtime evaluation:

- `transformOrigin`: a dense two- or three-entry array; each entry is a finite number or an exact finite percentage string such as `50%`.
- `transformMatrix`: a dense array of exactly sixteen finite numbers.
- `fontVariant`: a dense array of the installed React Native `FontVariant` literals; the empty array is valid because the public contract is an array.

Arbitrary origin keywords, token references, dynamic or animated values, and other string forms remain outside marked static capture. The ordered `transform` array is intentionally not treated as an unordered generic array: its operation union and authored order require a dedicated slice. Broader unions such as `boxShadow`, `filter` and experimental background arrays remain separate contracts.

## Decision and implementation

`packages/css/src/compiler/structured-ir.ts` now owns all three properties in the structured declaration union. Each property has an independent Effect Schema value contract, provenance check and primitive matrix:

| Property | Static value | Primitive domain |
| --- | --- | --- |
| `transformOrigin` | dense tuple of 2 or 3 finite numbers/percentages | view, text, image |
| `transformMatrix` | dense tuple of 16 finite numbers | view, text, image |
| `fontVariant` | dense array of public font-variant literals | text |

Capture uses one descriptor-safe dense-array admission path. It rejects sparse arrays, accessors, symbol or extra own keys, decorated array instances, wrong lengths, non-finite numbers and unsupported literals before CSS serialisation. Cross-realm plain arrays remain valid, while subclasses and decorated prototypes do not become an escape hatch around the contract. Lowering clones and freezes admitted arrays, and composition keeps the last complete value independently for each property while intersecting primitive domains across declarations.

`transformMatrix` is also present in the native CSS conversion allowlist. Marked Crumbs rules therefore enter the structured compiler before CSS conversion; malformed values retain the established structured-value diagnostic boundary. Unmarked vanilla-extract arrays remain on the existing compatibility path, so this slice does not silently broaden legacy conversion semantics.

## Qualification

The focused suite covers all three value families across supported primitives, malformed and decorated arrays, cross-property/provenance forgery, shared text-domain composition, cross-realm arrays and property-based whole-value ordering. Existing structured offset and compiler coverage remains green. Full package, consumer, documentation and performance gates are recorded in [qualification evidence](../evidence/2026-09-20-native-ir-structured-arrays/qualification.json).

This slice changes no public authoring API or external artifact ABI, does not publish or push, and does not establish native-device acceptance. The native benchmark remains a declared-host smoke measurement; the performance registry remains fail-closed and exact host-floor measurement remains incomplete until the required Node binary is available.
