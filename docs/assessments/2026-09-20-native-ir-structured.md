# M2.2ar structured boundary audit and shadow-offset IR

M2.2ar audits the installed React Native style declarations before opening a structured native IR family. The compiler now migrates only the fixed `shadowOffset` record, preserving the existing compatibility behaviour for unmarked records and the established unsupported-structured diagnostic for malformed marked values.

## Installed surface audit

| Family | Installed fields | Current ownership before this slice | M2.2ar decision |
| --- | --- | --- | --- |
| Scalar transform companions | `rotation`, `scaleX`, `scaleY`, `translateX`, `translateY` | CSS/native compatibility | Follow-up scalar batch; finite-number/token admission is independent of ordered transform arrays. |
| Fixed shadow offset | `shadowOffset` | Whole-value structured compatibility | Migrate now as a fixed `{ width, height }` structured declaration across view, text and image. |
| Fixed text shadow offset | `textShadowOffset` | Whole-value structured compatibility | Defer; keep text-only primitive coverage explicit in the next structured offset slice. |
| Ordered transform | `transform` | Whole-value structured compatibility | Defer; preserve authored operation order and define an operation union before migration. |
| Transform unions | `transformOrigin`, `transformMatrix` | Whole-value structured compatibility | Defer; qualify exact tuple/array and numeric domains separately. |
| Text variants | `fontVariant` | CSS/native compatibility | Defer; introduce a finite text-only array contract. |
| Broad union arrays | `boxShadow`, `filter`, experimental background fields | CSS/native compatibility | Defer as separate contracts; no generic recursive object admission. |

The installed public React Native declaration models `shadowOffset` as `Readonly<{ width: number; height: number }>`; the generated internal declaration permits optional members. Crumbs keeps the authored native boundary stricter and requires both finite fields so incomplete output cannot enter the static IR. React Native's runtime still owns animated and dynamic values.

## Decision and implementation

`packages/css/src/compiler/structured-ir.ts` defines a tagged `StructuredDeclarationBlock` with Effect Schema validation, source/property provenance and a `shadowOffset` declaration. Admission is descriptor-safe: accessors, class instances, arrays, extra keys, missing keys, non-finite numbers and token strings are rejected. Cross-realm plain objects created by the compiler VM are accepted without opening class-instance prototypes. Composition intersects primitive domains and retains the last complete whole value; lowering returns a frozen `{ shadowOffset: { width, height } }` object.

The transformer captures structured values before legacy structured splitting, chains the native-capture metadata into scalar capture, and lowers the structured block after CSS conversion. Invalid marked values are translated back to `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE` so existing consumers receive the same compatibility boundary. Unmarked records never enter this IR.

## Qualification

The focused structured suite covers complete capture/lowering, malformed values, forged Effect nodes, property-based whole-value composition and the unmarked compatibility path. The existing structured compiler suite covers imported bases, recipes, both emission modes, malformed diagnostics and generated compositions. Full and consumer gates are recorded in [qualification evidence](../evidence/2026-09-20-native-ir-structured/qualification.json).

This slice changes no public API or artifact ABI, does not publish or push, and does not establish native-device acceptance. The native benchmark remains a declared-host smoke measurement; exact host-floor measurement remains incomplete until the required Node binary is available.
