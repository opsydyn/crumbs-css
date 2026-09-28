# M9.6 DTCG 2025.10 Format and Resolver Adapter

Date: 2026-09-28
Status: Approved by user for planning; implementation awaits plan approval.
Roadmap: [M9.6 in roadmap.md](../../roadmap.md)
Architecture: [Adopt a native design-system compiler](../../decisions/adopt-native-design-system-compiler.md)

## Outcome

Add a deterministic, tooling-only adapter from the DTCG 2025.10 Format and Resolver modules to Crumbs' existing version-1 external token-theme payload. The adapter binds DTCG token paths to one identified Crumbs token contract in an M9.1 manifest, selects one Resolver input, resolves the document graph, validates native-domain conversions, and returns either a complete payload with inert metadata/provenance or actionable diagnostics.

The regular React Native styling and theme-selection paths gain no DTCG parsing, filesystem/network lookup, or Effect dependency. No theme payload or runtime ABI changes are required.

## User-approved constraints

- M9.6 is architectural work. The user selected it as the next roadmap item and approved the in-chat design sections covering the tooling boundary, conversion rules, diagnostics, verification, and package surface.
- Effect 4 Schema validates tooling inputs. Schema/AST values remain private to the tooling implementation; app runtime callers keep plain Crumbs types and APIs.
- The adapter uses a selected, identified M9.1 token-contract manifest. Token names are matched by exact DTCG path, never guessed from values or group names.
- Resolver sets, source arrays, and resolution order retain their specified order. An explicit input selects one context per modifier; defaults apply when the input omits a modifier with a default. The adapter never expands all context permutations and never maps DTCG ordering onto Crumbs' fixed `brand` → `mode` → `density` precedence.
- The current version-1 payload constructor requires values for each non-alias token definition and rebuilds Crumbs aliases. Therefore the adapter emits values for every matching definition token in the target manifest, including private definitions. Visibility remains explicit in manifest metadata and the sidecar; it is not represented as value redaction. Crumbs alias IDs are not emitted as values.
- All source documents are explicitly supplied in memory under stable URI keys. A reference can resolve only to a document in that map. The core does not read the filesystem, make network requests, or load a hosted design-tool account.
- Android and native-device acceptance remain parked under the existing roadmap constraint.

## Context and existing boundary

Crumbs token contracts already carry stable IDs, paths, visibility, aliases, and domains. The M9.1 manifest projects those records into versioned plain JSON. The existing `ExternalTokenThemePayload` carries an identified contract and a map of stable token IDs to string or number values. `createTokenThemeFromExternalPayload` checks contract identity, rejects unknown IDs, requires each definition value, validates its domain, and reconstructs aliases.

The native domains available for this adapter are color, length with an `allowNegative` policy, duration, opacity, and finite enumerated strings. Length values are numbers, percentages, or `auto`; duration values are milliseconds. DTCG values that cannot be represented in those domains must fail with their DTCG origin rather than be dropped or guessed.

DTCG 2025.10 describes inherited token types, aliases, group extension, token metadata, color spaces, and ordered theme resolution. The Resolver report's own materials disagree on its document version literal: the body table says `2025-10-01`, the normative prose says `2025-11-01`, and the published JSON Schema says `2025.10`. Crumbs' explicit 2025.10 profile accepts exactly these three published literals and records the supplied literal in its result metadata; all other resolver versions fail. This is a compatibility accommodation for the inconsistency in the pinned final report, not support for later drafts.

## Approaches considered

1. **Manifest-bound tooling adapter — selected.** Validate and resolve explicit DTCG data against one M9.1 contract, emitting the existing payload plus a tooling-only sidecar. This preserves static Crumbs contracts, keeps dynamic import at an explicit trust boundary, and avoids runtime parsing.
2. **Generate typed TypeScript contracts from DTCG.** This could make generated names visible to the typechecker, but adds code generation, naming/collision rules, checked-in generated-source decisions, and a second contract authoring path. Defer unless a concrete consumer needs generated static contracts.
3. **Resolve DTCG inside application runtime.** This would move document parsing, resolver selection, and format dependencies into app graphs and theme operations. It conflicts with the runtime isolation and render-cost constraints in the compiler ADR; reject for M9.6.

## Package and API boundary

Add a dedicated `@opsydyn/crumbs-css/tooling/dtcg` export with ESM, CommonJS, and declaration entries matching the current tooling subpaths. The root, `style`, `theme`, `theme/core`, `tokens`, and token-schema runtime surfaces do not re-export DTCG schemas or resolver implementation details.

The proposed pure entrypoint accepts:

- the Resolver document and its stable URI;
- a map of explicitly supplied DTCG documents keyed by absolute URI;
- one decoded M9.1 manifest and a selector for exactly one token-contract identity;
- an optional map of modifier selections;
- an optional positive finite `remBasePx`, required only if a mapped dimension resolves to `rem`.

The public request and result types contain plain data only. Effect Schema decoders, schemas, and ASTs are implementation details. Input validation and resolution are synchronous and deterministic; unexpected programming errors are not converted into user diagnostics.

A successful result is a versioned `CrumbsDtcgThemeImport` containing the unchanged `ExternalTokenThemePayload` version 1 and a versioned tooling sidecar. The payload contains values for every target-contract definition token and no alias token. The sidecar records the selected contract, DTCG Format/Resolver profile and supplied resolver literal, modifier input, conversion options, token visibility, supported token/group metadata, and document/JSON-Pointer origins. It is inert data and does not enter the ordinary theme runtime.

This milestone provides an import API and documentation example; it does not add a filesystem CLI. A CLI can wrap this pure API later with explicit path permissions and output behavior if a consumer requires it.

## Resolution and path semantics

1. Decode the selected contract identity and manifest. Require one unambiguous matching token contract and validate the manifest before processing token values.
2. Validate the Resolver root, including the accepted version profile, set/modifier definitions, and resolution order. Resolve URI references only against the explicit document map. Relative URIs are resolved against the URI of the containing document; missing entries produce diagnostics and never trigger implicit I/O.
3. Load inline and referenced token sources in declared array order. Apply selected Resolver entries in `resolutionOrder`; later definitions of the same token path win. Use the selected modifier context, or its declared default when omitted. Reject unknown selections and a required modifier with no input/default.
4. Apply Format group `$extends` deep-merge semantics and local overrides. Detect extension cycles and preserve source origins through inheritance.
5. Determine token type only from an explicit token `$type`, the nearest effective parent-group `$type`, or a resolved alias target's type. Never infer type from a value or a naming convention. Resolve aliases after resolver ordering is flattened. Detect unresolved references and report the full reference chain for cycles or type mismatch.
6. Treat DTCG path segments as exact, case-sensitive strings. DTCG token/group names prohibit `.` so a path can be matched to the manifest's path array without ambiguous splitting. A DTCG `$root` token maps to its containing group path, per the Format module. JSON Pointer segments use RFC 6901 escaping.
7. Map target manifest definition tokens, including private definitions, by exact path. Require each to have a selected resolved DTCG token value. Emit values by the manifest's stable token IDs. DTCG tokens not needed for the target contract may participate as alias dependencies; other unmatched tokens are listed in sidecar diagnostics at informational severity rather than silently omitted.
8. A manifest alias is derived by Crumbs and is omitted from payload values. If the selected DTCG set also declares a token at that alias path, it must be a reference to the manifest alias's declared target path; a literal or conflicting reference is an error. A DTCG alias at a manifest definition path is resolved and converted as the definition value.

Each conversion stage consumes validated plain data and produces either a new immutable value or a diagnostic. No partial payload is returned when any error exists. Stable iteration and canonical output ordering must not depend on JavaScript object insertion order except where DTCG explicitly assigns meaning to arrays.

## Native conversion matrix

| Crumbs manifest domain | Accepted DTCG mapping | Conversion and rejection rules |
| --- | --- | --- |
| `color` | `color` with `colorSpace: "srgb"` and three finite normalized numeric components | Convert each component to a 0–255 channel and serialize with React Native-supported `rgb()` or `rgba()` syntax. Missing alpha means 1; alpha must be finite in `[0, 1]`. Reject other color spaces, `none`, invalid component count/range, and malformed optional fallback data. Do not substitute `$value.hex` for components; preserve that fallback in source metadata when supplied. |
| `length` | `dimension` with `px` or `rem` | `px` maps directly to a numeric Crumbs length. `rem` requires explicit positive finite `remBasePx` and maps to `value * remBasePx`; no 16px default. Reject non-finite conversion and negative values when `allowNegative` is false. |
| `duration` | `duration` with `ms` or `s` | Convert seconds to milliseconds and preserve millisecond values. Reject negative, non-finite, or overflowing results. |
| `opacity` | DTCG `number` | Accept only when the selected manifest domain is `opacity` and the value is finite in `[0, 1]`. Never infer opacity from a token name or value alone. |
| `enum` | Single-string `fontFamily` or string-form `strokeStyle` | Accept only an exact member of the manifest enum values. Reject font-family arrays and object-form stroke styles. |

Other DTCG scalar and composite types—including generic `number` for non-opacity domains, `fontWeight`, `cubicBezier`, `border`, `transition`, `shadow`, `gradient`, and `typography`—are not converted by M9.6. If a target contract path maps to one of them, return an `unsupported-type` diagnostic with document URI, JSON Pointer, DTCG path/type, Crumbs token ID, and manifest domain. Unmapped unrelated tokens do not block an import unless they are needed to resolve a target token.

## Metadata and diagnostics

Preserve `$description`, `$deprecated`, and `$extensions` attached to matched tokens, plus the same supported metadata for groups on matched token paths. Preserve unknown extension values as finite JSON data, with no evaluation or interpretation. When resolver sources override a token path, the winning source supplies token metadata while provenance retains the ordered source/reference chain. Group extension inheritance follows DTCG's merge rules.

Diagnostics are plain, versioned data with a stable code, severity, message, document URI, JSON Pointer, optional DTCG token path, optional Crumbs token ID, and optional reference chain. Errors prevent payload creation. Informational diagnostics include unmatched tokens and can coexist with success. Sort results deterministically by document URI, pointer, code, and token ID. Malformed user input is reported through diagnostics; internal defects should still surface as defects.

The initial code families cover malformed resolver/format structure, unsupported resolver version, missing document, invalid modifier/context, invalid token/group path, unresolved alias, alias or group-extension cycle, incompatible alias/domain, missing definition token, unmapped token, invalid conversion option, unsupported type, and converted-domain mismatch. Exact names and messages are finalized in the implementation plan and tested as API contracts.

## Performance and safety

Resolve only the selected context and target contract. Use path/reference indexes and memoized graph traversal so repeated references do not repeat parsing, type inheritance, or alias work. Do not enumerate Cartesian modifier permutations, traverse schema ASTs in application code, retain input objects, use accessor properties from caller-created objects, or construct runtime optics.

The implementation must avoid unbounded recursion failure on adversarial group/alias graphs. Any configurable node/depth budget must fail with an explicit diagnostic and be covered by evidence; it must never silently truncate output. Benchmark representative generated contracts and document counts as tooling workloads, but make no runtime, device, or universal performance claim from those measurements.

## Verification and documentation

- Use version-pinned examples from the final DTCG 2025.10 Format, Color, and Resolver reports, supplemented by Crumbs fixtures for every native conversion and documented rejection.
- Test inherited types, `$root` paths, group extension and local override, both alias syntaxes, chained aliases, type compatibility, cycle detection, ordered sources, later-wins resolution, modifier defaults/selections, all three published Resolver version literals, missing supplied references, exact manifest identity/path matching, complete definitions including private ones, derived aliases, metadata preservation, and unsupported native types.
- Use `fast-check` for bounded generated token graphs, conversion-domain boundaries, source-order winner laws, cycle rejection, and deterministic output under semantically irrelevant object-key permutations. Keep explicit regression fixtures for version/schema edge cases and error origins.
- Validate the DTCG API's public types in consumer fixtures. Build and test ESM and CommonJS packed consumers importing only `tooling/dtcg`; verify the ordinary root/style/theme runtime graph has no new DTCG adapter dependency. Preserve the existing Effect boundary and package budget gates.
- Update the package tooling reference, support matrix, import example, compatibility limits, and roadmap evidence when the implementation qualifies. Do not mark Android/device acceptance complete, publish a package, or alter release automation in M9.6.

## Not in scope

- DTCG parsing/resolution in React Native app runtime or inside render/theme selection.
- Generated TypeScript token contracts or a DTCG-to-`.css.ts` code generator.
- Composite token conversion, wide-gamut color conversion, arbitrary `rem` defaults, or generic numeric domains.
- Implicit filesystem/network access, hosted design-tool adapters, analytics, or full DTCG document editing/round-trip export.
- Android/device qualification, release publication, deployment, or expanding supported React Native baselines.

## References

- [DTCG Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/)
- [DTCG Color Module 2025.10](https://www.designtokens.org/TR/2025.10/color/)
- [DTCG Resolver Module 2025.10 final report](https://www.w3.org/community/reports/design-tokens/CG-FINAL-resolver-20251028/)
- [Published DTCG Resolver 2025.10 JSON Schema](https://www.designtokens.org/schemas/2025.10/resolver.json)
- [React Native 0.85 Color Reference](https://reactnative.dev/docs/0.85/colors)
