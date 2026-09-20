# M2.2as scalar transform companion IR

M2.2as closes the remaining direct scalar fields in the installed React Native `TransformsStyle` contract before opening the ordered `transform` structured family. The five fields now enter the existing scalar IR when authored through marked Crumbs helpers; unmarked records remain on the compatibility route.

## Installed boundary

| Field | Installed declaration | Primitive domain | M2.2as admission |
| --- | --- | --- | --- |
| `rotation` | `AnimatableNumericValue` | view, text, image | finite number or `var(--crumbs-*)` token |
| `scaleX` | `AnimatableNumericValue` | view, text, image | finite number or `var(--crumbs-*)` token |
| `scaleY` | `AnimatableNumericValue` | view, text, image | finite number or `var(--crumbs-*)` token |
| `translateX` | `AnimatableNumericValue` | view, text, image | finite number or `var(--crumbs-*)` token |
| `translateY` | `AnimatableNumericValue` | view, text, image | finite number or `var(--crumbs-*)` token |

The percentage forms available inside the ordered `transform` array are a different operation contract and remain owned by `structured-native-values.ts`. This slice does not widen direct companion fields to percentages, angles, CSS strings or animated runtime nodes.

## Implementation

`native-ir.ts` now includes the five exact property names in its TypeScript union, Effect Schema property/provenance schemas, marked capture set and primitive matrix. They use the existing finite-number/token admission path, deterministic exact-field last-winner normalization and frozen lowering. Forged primitive domains, cross-property provenance and non-numeric values fail at the same admission boundary as earlier scalar families.

`css-to-rn.ts` recognises `translateX` and `translateY` in the native property allowlist, completing the installed companion names for the compatibility converter. The ordered `transform` array, `transformOrigin`, `transformMatrix` and structured shadow values remain separate families.

## Qualification

The focused suite covers all five fields across every primitive, token lowering, malformed and dynamic values, forged nodes, property-based last-winner order and unmarked fallback. Full package, consumer, documentation and performance gates are recorded in [qualification evidence](../evidence/2026-09-20-native-ir-transform-companions/qualification.json).

This slice changes no public API or artifact ABI, does not publish or push, and does not establish native-device acceptance. Native performance remains bounded by the existing host smoke and pending budget registry readiness.
