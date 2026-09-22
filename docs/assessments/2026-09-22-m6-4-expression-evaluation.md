# M6.4 expression evaluation and folding

## Decision

Close M6.4 with a pure evaluator, constant folder and dependency-aware runtime
for the M6.3 expression contract. The portable program remains an immutable
data graph. Runtime evaluation receives a token record and finite M6.1
condition snapshot; no arbitrary callback, Effect environment or opaque code
is serialised.

## Semantics

- Literals, token references and condition references validate values against
  their declared domains. Missing token inputs have a distinct error code;
  only the `fallback` node catches that error. Invalid values and domain
  failures propagate.
- Composition evaluates every child left-to-right and returns its last value.
  Arithmetic validates its result, and finite matching selects the branch for
  the current condition axis. These rules make evaluation deterministic for
  every M6.3 node.
- `foldNativeExpression` folds child nodes and turns any dependency-free graph
  into one validated literal. Dynamic references, condition matches and their
  canonical dependency sets remain inspectable data.
- `createNativeExpressionRuntime` evaluates once, then compares only declared
  token names and condition axes on each immutable state update. Unrelated
  changes are skipped and counted; declared changes evaluate and publish the
  new value atomically. Forged programs whose dependency list disagrees with
  the root are rejected, and disposed runtimes reject updates.

The evaluator and runtime are available from the style/root authoring graphs;
the runtime evaluator is also available from the advanced `theme` entrypoint.
It stays out of the lean `theme/core` graph so ordinary theme consumers do not
pay the evaluator's initialization and bundle cost. The [native expression v1
specification](../specifications/native-expression-v1.md) contains the
complete folding and invalidation contract.

## Qualification

Focused tests cover all node kinds, missing-input versus invalid-input errors,
last-winner composition, condition matching, static folding equivalence,
property-based arithmetic folding, token invalidation, condition invalidation,
unrelated-input skips, forged dependency rejection and runtime disposal. Type
fixtures cover runtime state, evaluator results and runtime handles. Full
package qualification passes with 772 tests, 27,045 assertions and 128 files;
package build, typecheck and the 20-page documentation build pass. The
performance registry validates fail-closed with thresholds still pending for
JS/UI frame time, allocations, retained memory and emitted runtime bytes.

Native device/frame/allocation evidence, container queries and Android remain
outside this slice. Android is still the final device-enabled move.
