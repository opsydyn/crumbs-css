# Effect 4 artifact and API selection — 2026-09-14

Implements approved M1.1 under ADR [D3/D4](../decisions/adopt-native-design-system-compiler.md#d3-adopt-effect-4-at-internal-boundaries). Base source revision: `6e37cef`. The user explicitly approved continuing to M1.1 while native Android acceptance remains deferred until last.

## Selection

Pin **`effect@4.0.0-rc.115`** in `packages/css/package.json` dependencies and `bun.lock`. It is an internal package dependency, with no Effect peer dependency or requirement for applications to install it directly, supply services or call runners. This slice verifies upstream capabilities; production Crumbs validation/decoding has not migrated to Effect yet. No public entrypoint or return type changes.

The live [npm registry artifact](https://registry.npmjs.org/effect/4.0.0-rc.115) was published September 11, 2026. On September 14, `rc` resolves to this version, `beta` to `4.0.0-beta.107`, and `latest` to Effect 3.22.2. Choose the published 4.x release candidate over the older beta or a snapshot; do not substitute Effect 3 or a mutable tag/range. The pin requires deliberate upgrade review. It is a prerelease, not a stable Effect 4 release.

The package is MIT, ESM (`type: module`), with no declared dependencies, peer dependencies or engines. Its upstream unpacked distribution is 48,755,241 bytes; that is installed distribution size, not application bundle size. Registry integrity matches the lockfile resolution. [Retained package metadata](../evidence/2026-09-14-effect4-selection/package-metadata.json) includes exports, integrity, publication time and installed source/declaration SHA-256 hashes. Upstream live documentation is context; the installed release is the API authority.

## Verified API surface

Use namespace subpath imports (`import * as Schema from "effect/Schema"`, `import * as Optic from "effect/Optic"`) at internal boundaries. Avoid the root barrel for focused imports. This is an import convention, not a measured tree-shaking claim.

| Need | Exact artifact API verified | Implication for Crumbs |
| --- | --- | --- |
| Validation | `Schema.Struct`, `Schema.Finite`, `decodeUnknownSync`, `decodeUnknownResult` | Specify finite domains and `onExcessProperty: "error"` explicitly, including nested fields. `Schema.Number` accepts nonfinite numbers; default struct decoding strips unknown keys. Probe tests demonstrate these defaults. |
| Typed bidirectional representation | `Schema.Codec<Type, Encoded, DecodingServices, EncodingServices>`, `FiniteFromString`, `revealCodec`, `encodeSync` | Codec is a type view within Schema, not a standalone `effect/Codec` module. Service-free boundaries can return ordinary values. Encode consumes the decoded type. String-to-number encoding canonicalizes input; it does not preserve original bytes. |
| JSON-compatible encoding | `Schema.toCodecJson`, `Schema.Option`, `effect/Option` | Derive a JSON-compatible representation for runtime data types. This does not make arbitrary compilation reversible or specify canonical bytes/cache hashes. |
| Immutable nested focus | `Optic.id<T>().key(...)`, `.get`, `.replace`, `Schema.toIso` | Nested keys and replacement types remain checked. Independent seeded properties check get/put, put/get and put/put semantic laws and input immutability. These do not prove Crumbs cache sharing or theme snapshot consistency. |
| Potentially missing record focus | `.at`, `.getResult`, `.replaceResult`, `effect/Result` | `.at` requires an own key and fails on inherited/missing keys. `.replace` returns the old source on focus failure. Use `.replaceResult` and handle failure explicitly at admission/update boundaries. Missing tokens must not become silent no-op updates. |
| Validation after edits | Schema decoding after an optic replacement | A typed number focus accepts `Infinity`; optics do not validate numeric domains. Validate a completed future theme update before publishing values and derived token state atomically. |

Executable evidence: [API contract tests](../../packages/css/test/effect4-api-contract.test.ts), [positive/negative type contracts](../../packages/css/test/effect4-api-types.ts), and [qualification](../evidence/2026-09-14-effect4-selection/qualification.json). Codec properties cover bounded integers without signed zero; they do not promise all-number or byte round trips. Lens properties cover plain immutable records, not class-backed schemas or arbitrary optional optics.

## Module and runtime boundary

The exact subpath implementations execute from both Node ESM and CommonJS callers on **Node 24.15.0**. CommonJS uses Node's synchronous ESM interoperability; Effect does not supply a distinct CJS artifact. This does not qualify Effect imports at the package's entire Node `>=22.0.0` range. M1.3 must qualify the oldest supported tooling runtime and choose explicit bundling/loading rules before adding Effect to emitted compiler or decoder entrypoints. Do not silently raise engines or broaden peers here.

Ordinary `/theme` runtime graphs remain React-only in both emitted formats. Emitted public declarations contain no Effect import. Workspace and isolated packed Expo consumer checks verify ordinary TypeScript/React usage and iOS/Android/web JavaScript runtime graphs. Merely installing the dependency adds no schema traversal or optic construction to render/selection paths. Once real Effect boundaries are connected, M1.3 must repeat graph audits and measure compiler/ordinary runtime/external decoder initialization separately.

## Delivery and limits

M1.1 is complete. M1 remains in progress. No Crumbs payload schema, artifact version, external theme decoder, optic theme-update API, measured Effect initialization budget or native performance improvement is delivered by this dependency-selection slice. No native/device run, push, publication or release-version edit is included. Existing working-tree version edits are preserved and excluded from this commit.

Next bounded slice: **M1.2**, define internal schemas for tagged declarations/references, contract identity, structured diagnostics and an explicit artifact version. Specify exact fields, finite domains, codec round-trip domains and invalid-input diagnostics before wiring them into compiler/runtime paths. Start only after user approval.


## Follow-up evidence — M1.3a

The [emitted boundary audit](2026-09-14-effect-boundary-audit.md) now demonstrates external CommonJS failure on exact Node 22.0.0 and qualifies tooling-only Effect bundling with a private emitted initial-contract candidate in both formats. Current transformer/theme initialization is measured separately. Ordinary runtime maps deny Effect. The real external-theme decoder remains absent/unqualified under M1.3b; repeat this audit when concrete ingress is wired. The M1.1 evidence above remains the historical dependency/API selection, not a claim that external Effect CommonJS works across the declared Node range.
