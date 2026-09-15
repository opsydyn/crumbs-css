# M2.1 native IR semantic contract

## Outcome

M2.1 is complete as a specification gate. The accepted [native IR v1 contract](../specifications/native-ir-v1.md) defines immutable tagged module, style, map, recipe, token-contract, ordinary-data and export forms before production compiler nodes exist. It fixes qualified identity, primitive domains, source/property provenance, normalization order, dependency timing, recipe selection, three separate equality relations and a stable fail-closed diagnostic family.

The contract applies functional programming ideas where they make behavior easier to reason about: immutable algebraic data types, total phase functions, non-empty accumulated errors, folds over ordered composition, extensional recipe meaning, and explicit laws. Ordered composition is associative with an empty identity, but remains noncommutative and non-idempotent. Optic transformations must preserve semantic equality; structural sharing remains a separate performance assertion.

## Executable reference

The test-only [reference evaluator](../../packages/css/test/oracles/native-ir-v1.ts) is independent from production compiler code. Its seeded property suite proves regrouping does not change composition meaning, retains a concrete noncommutative counterexample, removes dead declarations before token resolution, compares structured values with ordered-array/unordered-record semantics, distinguishes signed zero, links qualified references, reports cycles and missing targets, accumulates independent failures and evaluates recipes in base/variant/compound order.

The first test run failed because the reference module did not exist. The completed focused run passes 5 tests with 620 assertions. This oracle is deliberately small and readable so later property-family migrations can compare production results against a separately implemented meaning rather than restating compiler logic.

## Boundaries

The M1.2 `NativeArtifact` version-1 schema remains a private prototype declaration envelope. Native IR `irVersion: 1` names this internal semantic model and does not declare a wire format or published ABI. M2.5 must choose external artifact encoding, canonical bytes, compatibility and hashing explicitly.

No production IR nodes, compiler path, runtime dependency, public type, property support, consumer output or performance behavior changes in this slice. Existing `CRUMBS_CSS_*` diagnostics remain public; later IR wiring must map new diagnostic detail without weakening errors or falling back automatically. Device gates and parked Android acceptance are unchanged.

## Next migration boundary

The first production vertical should capture one scalar family, `opacity`, because it exercises literal/token ordering, primitive admission, provenance, dead-write elimination and emission without structured-value lowering. It should compare both emitters against the reference evaluator, retain the qualified legacy path for every unmigrated property, and add no automatic fallback for malformed opacity nodes.
