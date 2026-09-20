# Native IR assessment: experimental background image

**Slice:** M2.2bc
**Date:** 2026-09-20
**Status:** implementation complete; native rendering gate pending

## Decision

M2.2bc opens a separate structured IR contract for React Native 0.85.3's `experimental_backgroundImage` value. The property is admitted only for `view` and `text`, and only as a dense list of canonical linear or radial gradient records. The value is kept separate from repeat, size and position so gradient semantics cannot widen the other experimental background families.

The static subset is intentionally explicit:

- linear gradients require a direction keyword or finite `deg`, `grad`, `rad` or `turn` angle;
- radial gradients require `circle` or `ellipse`, an extent or finite non-negative x/y size, and one of the existing four position records;
- colour stops are dense, contain at least two literal colour stops, and may contain internal `null` transition hints with exactly one finite number or percentage position;
- colour payloads are non-empty strings, excluding CSS variable references and opaque platform colour symbols;
- stop positions are finite numbers or percentages, with no parser-default inference.

Capture performs descriptor-safe admission, clones nested records and arrays, and freezes the admitted value. Effect Schema validates the same value family, provenance and primitive matrix at the decode boundary. Whole-list last-winner composition, including an empty-list replacement, is preserved. Authored strings, implicit parser defaults, token references, animated values, unsupported units and other dynamic forms remain on the runtime compatibility route.

## Native boundary

The installed React Native processor accepts additional forms and can apply defaults or platform colour conversion. Native CSS parsing may bypass that JavaScript processor. Consequently, the compiler contract is not treated as cross-platform qualified until the packed consumer is exercised on a dedicated iOS simulator. The gate must cover linear keyword and angle directions, radial circle/ellipse and extent/x-y sizes, mixed stops and transition hints, multiple layers, empty replacement, and transparent/opaque literals under light and dark themes. Android remains parked under the roadmap policy.

The CSS-to-React-Native allowlist remains unchanged, so the experimental property has no new compatibility conversion or public API/ABI surface. This slice proves the immutable compiler boundary and host/consumer behaviour; it does not claim native rendering parity or native-device performance.

## Evidence

- [qualification record](../evidence/2026-09-20-native-ir-background-image/qualification.json)
- [native acceptance gate](../acceptance/2026-09-20-background-image/README.md)
