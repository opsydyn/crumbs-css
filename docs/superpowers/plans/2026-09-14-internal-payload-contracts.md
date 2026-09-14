# Internal payload contracts implementation plan

Approved M1.2 continuation under ADR D1–D3. Execute locally, test first, on the existing isolated branch. Commit this slice and recommend the next slice; do not start it without approval.

**Goal:** Define initial internal Effect 4 schemas and strict data/JSON codecs for declarations/references, contract identity, diagnostics and a versioned artifact envelope, without connecting them to existing authoring/render paths.

**Design:** Use focused `src/contracts/payloads.ts` and `data-codec.ts` modules. Schema-derived types retain one payload shape authority. Typed encode and explicit encodeUnknown apply the same validation. Codecs return ordinary discriminated results and structured issue paths. Descriptor-based admission copies plain data before Effect sees it, rejects accessors/nonenumerable/symbol fields, inherited/class records, sparse/decorated arrays, cycles and excessive nesting, and never invokes getters or `toJSON`. Proxy trap behavior is outside this plain-data contract. Serialized data round trips preserve values and order, not object identity or original JSON bytes.

Initial shape contracts:

- Identity: exact `{ owner, name, version }`; owner is an npm-shaped package identifier, name a declared identifier, version a positive safe integer. This supplies identity data, not a package/provider trust proof or registry.
- Legacy token reference: existing exact `$$type`/`varName` payload, kept distinct from a new internal `_tag: "ThemeTokenReference"` with contract identity and varName. No automatic migration or fallback.
- Source: file/export name/path and optional one-based safe-integer line/column. Paths contain strings or nonnegative safe integer indexes.
- Declaration: `_tag: "NativeDeclaration"`, property, value, source. Scalars are string/boolean/finite numbers or qualified token references; explicit transform/shadowOffset branches retain structured values, with one supported transform operation per entry and 16-element matrices. Generic scalar property syntax is validated here; actual native primitive/property and token-domain admission remain existing compiler checks and M2/M3. Structured properties cannot enter the scalar branch.
- Diagnostic: exact tag, known existing diagnostic code, warning/error severity, nonempty message and optional source. Codec failures are separate ordinary structured results, not new public diagnostic codes.
- Artifact: `_tag: "NativeArtifact"`, `version: 1`, identity and ordered declarations. Qualified references must match the enclosing identity tuple. Version 1 names this internal prototype envelope, not a published compiler/artifact ABI. Other versions fail without fallback.
- Numeric policy: finite numbers and safe integer indexes/versions; negative/fractional native scalars allowed. Signed zero is rejected at this initial JSON boundary because JSON cannot preserve it. Current compiler/runtime support for negative zero remains unchanged. No silent coercion/normalization, undefined values, or byte-canonicalization claim.
- Admission depth limit: 64 nested containers, a documented data-contract limit rather than a performance budget. Shared acyclic objects may duplicate in serialization; cycles fail.

Verification:

- [x] Write schema/data/JSON tests first and retain the missing-module red result.
- [x] Implement the smallest schema-derived codecs satisfying exact fields, numeric policies and structured failure paths.
- [x] Test tag/version near misses, identity mismatches, invalid transform shapes, getters/toJSON non-execution, cycles/holes, immutability and unknown nested fields.
- [x] Use independent seeded generators for identity/reference/artifact round trips and invalid mutations; assert order and semantic values without relying on codec output as the only oracle.
- [x] Add positive/negative internal TypeScript contracts; verify public declarations and ordinary runtime stay Effect-free.
- [x] Run package qualification, sequential Storybook/Expo builds and isolated packed consumer checks; document native/measurement limits.
- [x] Record M1.2 delivery/evidence, commit only owned files and recommend M1.3.
