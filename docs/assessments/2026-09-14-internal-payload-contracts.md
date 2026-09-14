# Initial internal payload contracts — 2026-09-14

Implements approved M1.2 under ADR [D1–D3](../decisions/adopt-native-design-system-compiler.md), based on `1ce7bac` and its exact `effect@4.0.0-rc.115` dependency. [Implementation plan](../superpowers/plans/2026-09-14-internal-payload-contracts.md); [qualification](../evidence/2026-09-14-internal-payload-contracts/qualification.json).

## Boundary and shape authority

`packages/css/src/contracts/payloads.ts` defines Effect schemas and derives internal TypeScript types from them. `data-codec.ts` admits descriptor-safe data, performs strict Effect decoding/encoding and returns ordinary `{ ok: true, value }` or `{ ok: false, issues }` results. Issues carry a boundary, code, message and string/index path; callers do not handle Effect environments or Schema issue trees. `encode` requires the schema-derived payload type; `encodeUnknown` is explicit for untyped boundary inputs and applies the same validation. JSON syntax failures use `CRUMBS_CONTRACT_INVALID_JSON`; invalid data uses `CRUMBS_CONTRACT_INVALID_PAYLOAD`. These are internal result codes, not additions to the existing public diagnostic enum.

| Contract | Initial exact fields and constraints |
| --- | --- |
| Contract identity | `owner`, `name`, `version`; npm-shaped owner, declared identifier name, positive safe-integer version. Identity equality uses the complete tuple, not token name or evaluation order. Data validation does not authenticate package/provider ownership. |
| Legacy reference | Existing own `$$type: "crumbs.css.theme-token"` and valid `varName`; distinct from the qualified reference, without automatic fallback or migration. |
| Qualified reference | `_tag: "ThemeTokenReference"`, contract identity, `varName` matching `--crumbs-[A-Za-z0-9_-]+`. |
| Source | Nonempty `file`, `exportName`, ordered `path` string/index segments; optional one-based safe-integer `line`/`column`. Exact optional fields are absent or valid, never explicit undefined. No filesystem reads are performed. |
| Native declaration | `_tag: "NativeDeclaration"`, property, value, source. Generic scalar values are string/boolean/finite numbers or a qualified reference. Explicit transform/shadowOffset branches retain their native structure and prevent structured properties from entering the scalar branch. |
| Static transforms | Ordered arrays with exactly one supported operation per entry. Numeric perspective/scale/translation, finite decimal deg/rad angles, finite decimal percentage translations and 16-number matrices. No animated nodes, arbitrary object operators or multi-operation entries. |
| Shadow offset | Exact finite numeric width/height. Negative and fractional values remain permitted. |
| Diagnostic | `_tag: "Diagnostic"`, one existing diagnostic code, error/warning severity, nonempty message and optional source. |
| Artifact envelope | `_tag: "NativeArtifact"`, literal `version: 1`, contract identity and ordered declarations. Qualified references must match the enclosing identity tuple; mismatch paths point to declarations/index/value/contract. |

Version 1 names this **initial internal prototype data envelope**. It is not a published compiler/artifact ABI or a new executable runtime module format. Unsupported versions fail without fallback. M2 owns actual IR emission/migration and artifact/runtime compatibility. M3 owns domain-safe token identities, aliases and provider association.

## Exact fields and plain-data admission

Both data and JSON APIs reject unknown fields, including nested fields, instead of stripping them. Before Effect traversal, data admission copies same-realm plain records (Object.prototype or null prototype) and arrays using own enumerable data descriptors. It rejects accessors, symbol/nonenumerable fields, functions/toJSON hooks, inherited/custom/class prototypes, sparse/decorated arrays and cycles. Getters and toJSON are not called. Cross-realm/class/Proxy integration is not provided; Proxy inspection traps cannot be made inert by descriptor inspection.

Admission allows at most 64 nested containers. This is a documented data-contract bound, not a measured performance budget. Shared acyclic input objects may be copied/serialized more than once; identity, descriptors and structural sharing are not serialized semantics. Valid frozen/null-prototype data remains accepted; inputs are never mutated. JSON parsing precedes descriptor admission and schema checks; this slice does not establish streaming, byte-size or heap budgets for untrusted JSON text.

## Numeric and round-trip domains

All numeric fields are finite JavaScript numbers. Version/source indexes are safe integers with explicit positive/nonnegative rules. Numeric text in angles/percentages must also parse to a finite number. Generic scalar strings are not coerced into numbers or interpreted as CSS.

The initial JSON numeric domain **rejects signed zero**, rather than silently turning `-0` into `0`. It also rejects undefined, bigint and unsupported JS values. Existing compiler/runtime support for negative zero and ordinary exports remains unchanged because this envelope is not wired into production. M2 must specify migration or an explicit signed-zero representation before admitting old values to this boundary.

For admitted payloads, encode → JSON parse/decode preserves defined data values, tags, ordered declarations, transforms, paths and identity tuples. JSON whitespace/key ordering and object reference identity are not round-trip promises. Encoding is not a canonical byte/hash format. The codec helper is restricted to service-free schemas with matching encoded/decoded types; distinct-representation codecs need their own explicit adapter.

## Native semantics and delivery limits

These are **shape contracts**, not a replacement for native property/value admission. Generic property names have identifier syntax; a scalar `opacity: 2`, unknown identifier property or token attached to the wrong domain requires property-specific checks outside these schemas. Primitive capability/property pairing, semantic token domains and validated alias/provider relationships remain the existing compiler and M2/M3 responsibilities. Do not expose these shape codecs as a native-style admission API.

No public schema/decoder entrypoint, authoring/compiler/provider call path or hook changes. Contract modules are typechecked and tested internally but are absent from the existing emitted public graphs. Public declarations stay Effect-free and ordinary `/theme` runtime graphs stay React-only. Workspace and packed Expo JavaScript qualification is distinct from actually integrating these contracts and from native/device performance.

M1.2 completes the initial schemas and encode/decode tests. M1.3 must qualify actual emitted contract/compiler/decoder graphs in both module formats, the oldest supported tooling runtime and initialization footprints before connecting Effect boundaries. No native/device run, release publication or performance improvement is claimed. Android remains deferred until last.
