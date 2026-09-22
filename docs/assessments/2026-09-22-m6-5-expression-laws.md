# M6.5 expression laws and native condition boundaries

## Decision

Close M6.5 with executable laws around the M6 expression contract. Folding is
canonical and idempotent: dependency-free descendants become validated
literals even when their parent remains dynamic, while declared dependencies
remain unchanged. Evaluation remains a pure function of the immutable token
record and finite condition snapshot.

## Laws and invalidation

- Conditional-value normalisation and expression folding are idempotent. A
  second pass preserves the canonical value or expression graph exactly.
- Repeated evaluation is deterministic across token and condition insertion
  order. Supported scalar operators cover addition commutativity and
  associativity, scale identity, clamp idempotence, and ordered composition
  association under last-winner semantics.
- Runtime updates compare only declared token names and condition axes. An
  unrelated token, direction or other axis is published without evaluation;
  a changed declared token evaluates once and updates the value atomically.
- Native consumer boundaries use finite snapshots: resize crosses compact to
  medium at 600 points, font scale crosses normal to large at 1.15, orientation
  changes only when width and height cross, and RTL changes the direction axis.
  Changes inside one bucket are skipped.

The M6.4 evaluator now recursively folds static descendants before the
dependency-aware runtime is created. This keeps dynamic programs small while
preserving the portable, closure-free program representation.

## Qualification

The focused M6.5 suite passes seven tests with property coverage for folding
and conditional-value normalisation, deterministic evaluation, algebraic
laws, declared-token invalidation, and resize/font-scale/orientation/RTL
boundaries. Full package qualification passes with 779 tests, 27,764
assertions and 129 files; package build and typecheck pass. The 20-page
documentation build passes. Budget validation is `valid: true` while the
performance registry remains fail-closed with JS/UI frame, allocation,
retained-memory and emitted-runtime thresholds pending.

Native device/frame/allocation evidence and Android remain outside this slice.
Android is still the final device-enabled move.
