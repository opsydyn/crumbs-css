# M5.5 Sprinkles contract qualification assessment

## Decision

Close M5.5 as a contract and regression-coverage slice. The existing native
Sprinkles compiler and bounded runtime resolver satisfy the requested
determinism, token-only, validation, identity, and equivalence boundaries; no
production implementation change was needed.

## Coverage

`packages/css/test/sprinkles-contract.test.ts` adds five focused checks:

- Transforming the same fixture twice produces byte-for-byte identical output.
- Token-only `backgroundColor` and spacing scales remain explicit theme-token
  references in the generated lookup plan. `resolveThemeStyles` resolves them
  at the theme boundary, and the original plan is not rewritten.
- Unknown properties, non-string scales, missing scales, and malformed
  generated style references fail before a runtime result is returned.
- Repeating the same selection returns the cached array reference while
  preserving authored shorthand/longhand precedence.
- Compiled static `card` and `styleVariants` outputs flatten to the same values
  as their equivalent runtime lookup selections, including token-only output.

The existing property-based cached/uncached equivalence suite continues to
exercise the finite selection space. Together, these checks keep compiler
output, generated lookup plans, and runtime selection semantics aligned without
introducing schema traversal into render-time selection.

## Qualification limits

This is host/compiler/runtime contract evidence. It does not qualify release
Hermes startup, native frame time, native heap allocations, retained memory,
or visual parity. Android remains the final device-enabled move. M6.1 owns
conditions and subscription lifecycle; its native behaviour must retain the
same explicit validation and identity boundaries.
