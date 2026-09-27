# M9.1 Deterministic Design-System Manifest

**Status:** Architecture and written spec approved

**Date:** 2026-09-27

**Roadmap:** M9.1 in [roadmap.md](../../roadmap.md)

**Governing decisions:** D5, D9, D10, D11 and D12 in the [design-system ADR](../../decisions/adopt-native-design-system-compiler.md)

## Intent

Emit one deterministic, versioned, machine-readable manifest for a package's declared Crumbs design-system surface. Later M9 work will use this artifact for compatibility checks, policy, migrations, interoperability and local reports. The manifest describes contracts and compiler-observed style dependencies; it is not a theme-value dump or a production runtime module.

## Existing baseline and gap

Token contracts already have package-scoped identities, public/private visibility, typed domains, stable token IDs and resolved alias metadata. Component recipes carry contract identities, public slots and variants, extension points, defaults and state constraints. Native compilation retains package-relative source IDs and export/property provenance in its IR, and it derives final style dependencies after composition.

Those facts do not yet form one package-level artifact. The generated `__crumbsModule` record is intentionally small runtime metadata for token resolution. It does not carry contract visibility, alias origins, component defaults, source provenance or lifecycle metadata. M9.1 must not turn that production record into a design-system manifest.

## Goals

- Emit a schema-versioned JSON manifest from explicitly selected token contracts, component recipes and compiled style modules.
- Preserve stable identities, public/private visibility, domains, alias links, public component surfaces, defaults, compiler-observed dependencies and source origins.
- Record native compiler capabilities separately from device/runtime qualification.
- Carry optional deprecation and replacement annotations so M9.2 and M9.5 can consume them without inventing a second identity system.
- Make equivalent input produce byte-identical output across declaration order, module evaluation order and machine checkout path.
- Keep the manifest builder and Effect Schema validation behind a dedicated tooling entrypoint. Ordinary React Native runtime entrypoints must not acquire a tooling dependency edge.

## Non-goals

M9.1 does not compare two manifests, decide semantic-version impact, enforce policy, explain resolved runtime styles, apply codemods, import DTCG, or crawl every project file. Those are later M9 slices. It does not include concrete theme values, secrets, generated class names, absolute checkout paths or detailed development provenance in `__crumbsModule`. A capability recorded from compiler IR is not evidence of device behavior, Android support or accessibility acceptance.

## Selected architecture

Use an explicit build-time manifest assembly API in a new tooling-only `./tooling/manifest` entrypoint. A package declares the roots it owns: token contracts, component recipes, and the `.css.ts` modules to include. The tool converts those inputs to plain manifest records and combines them. It does not discover roots by crawling arbitrary source trees or by statically guessing which TypeScript expressions are declarations.

The token collector reads normalized metadata owned by each supplied token contract. It records each token's stable ID, path, visibility, domain and definition/alias kind. Alias records include a stable target ID where one is known, the target path, and an authored fallback when present. Private tokens remain classified as private so later tooling can identify a style dependency on a private surface; the manifest contains no resolved theme values.

The component collector reads supplied recipe descriptors. It records the identity, declared public slots and variants, extension points, public state constraints where declared, and defaults for public variant axes. It omits undeclared implementation details. Defaults remain explicit values; absence of a default is not rewritten as a value inferred by the runtime.

For each selected style module, a compiler pass produces a tooling sidecar from the same final composition and IR used to emit native styles. The record contains the normalized source ID, exported logical paths, source/property origins, final token dependency edges and the primitive/property capabilities admitted by the compiler. Dependencies refer to stable token IDs when the owning contract is present. References outside the declared manifest roots retain their stable external identity when available; unresolved or legacy references are marked as unresolved and must not be presented as stable contract identities. The sidecar is returned to tooling or written as a build artifact; it is not added to the emitted runtime module.

Package roots supply package-relative source paths and export paths for token and component declarations whose source locations are not available from the style compiler record. Paths use forward slashes and must remain within the owning package root. The tool rejects absolute paths and paths that escape the declared root. This is explicit provenance input, not a static TypeScript source analyzer.

Optional lifecycle annotations are supplied to the assembly API and keyed by stable entity ID. A deprecation record may contain the release where deprecation begins, a human-readable reason, and a replacement entity ID. Replacement targets must resolve to a declared entity or an explicitly identified external contract. This adds no lifecycle property to production token or recipe objects in M9.1. M9.5 may consume the same manifest fields for migration tooling.

The tooling boundary uses Effect 4 Schema to validate normalized inputs and decode/encode the versioned manifest. Public manifest types and output remain ordinary TypeScript and JSON data; consumers do not need to import Effect, run an Effect program, or load schema ASTs. The module is opt-in and excluded from ordinary theme/token runtime graphs. Do not export the manifest schema through the root or ordinary runtime entrypoints.

## Manifest v1 shape

The top-level record identifies the format and integer schema version separately from the package version, token/component contract versions, and compiler/artifact compatibility versions. Its stable collections are:

| Collection | Contents |
| --- | --- |
| `tokens` | Stable token ID, owning contract identity, path, visibility, domain, definition/alias data, source origin and optional lifecycle metadata. |
| `components` | Stable component identity, public slots/variants/extension points, public state constraints, public defaults, source origin and optional lifecycle metadata. |
| `modules` | Selected compiled style modules and their source IDs and exported logical paths. |
| `dependencies` | Typed edges for token aliases and compiled style exports, including stable endpoints where known and explicit unresolved/external status otherwise. |
| `capabilities` | Compiler-observed native primitive/property support attributed to the module or exported logical path that uses it. |
| `coverage` | The explicitly supplied roots and any unresolved references, so the manifest cannot imply a whole-package scan that did not happen. |

The schema does not include concrete theme values. Alias fallbacks are retained because they are part of the declared alias contract. It includes only compiler-admitted capabilities and does not claim platform/device verification. Extension data, if accepted, must be JSON-compatible, namespaced and inert; the manifest reader never evaluates it.

## Determinism and validation

Before encoding, normalize all identities, source paths and entity references. Sort token, component and module records by stable identity; sort set-valued paths, variants, capabilities and dependency edges by a documented ordinal comparison. Preserve order only where order is semantic. Encode object keys in a fixed order, emit compact UTF-8 JSON with one trailing newline, and do not include timestamps or host-specific values.

Reject duplicate IDs with conflicting records, malformed identities, invalid source paths, invalid domains, dangling references that claim to be internal, cycles in alias metadata, non-JSON values, non-finite numbers, unsupported manifest versions and a supplied compiler record that does not match the selected package/artifact identity. A dependency that cannot be resolved is retained as an explicit unresolved record with its origin; it is not silently dropped or given a fabricated ID. An authored alias fallback remains valid when its target is outside the supplied roots, and the manifest marks that target external or unresolved rather than treating it as a broken internal link.

The manifest schema version is independent of the owner-assigned contract compatibility versions. Readers fail clearly on an unsupported major manifest version. Adding or changing a field requires a compatibility decision for the manifest schema rather than silently changing the meaning of an existing field.

## Acceptance evidence

M9.1 is complete when:

1. The tooling entrypoint builds a manifest from a fixture containing public and private tokens, aliases, a component contract with defaults/state constraints, and a compiled style that consumes both public and private tokens.
2. The emitted JSON decodes through the v1 schema and preserves stable IDs, alias and style dependency edges, source origins, visibility, capabilities, defaults, lifecycle annotations and coverage.
3. Reordered contract properties, roots and module inputs produce byte-identical JSON. Repeating the build from a different absolute checkout root produces the same artifact.
4. Invalid identities, paths, references, cycles, data values and schema versions fail with actionable diagnostics. Unknown references remain explicitly unresolved.
5. The packed tooling entry resolves in the declared module formats, while ordinary runtime graph and Metro checks continue to exclude tooling-only modules and Effect from ordinary app imports.
6. The production `__crumbsModule` shape and ordinary runtime behavior remain unchanged.

The qualification receipt records the exact package/compiler/artifact identity, manifest schema version, fixture inputs and output digest. Android, device rendering, publication and release policy are not part of this milestone.

## Risks and mitigations

- **Explicit roots can be incomplete.** Record supplied roots and unresolved edges in `coverage`; M9.2 must state these analysis limits in reports.
- **Compiler facts can be mistaken for runtime support.** Label capabilities as compiler-observed and keep device acceptance separate.
- **A second manifest representation can drift from contracts.** Derive token and component fields from their normalized descriptors, and test the manifest against those sources instead of duplicating their schemas.
- **Lifecycle metadata is not yet present on authoring APIs.** Keep it as an explicit, typed manifest annotation in M9.1; defer authoring ergonomics and migration semantics to later M9 work.
- **Tooling could leak into app bundles.** Add only the tooling subpath and qualify packed module graphs and ordinary Metro bundles.

## M9.1 file boundaries

Expected implementation areas are the manifest schema/model and canonical encoder under `packages/css/src/tooling/`, token/component descriptor adapters, a compiler sidecar adapter, the tooling entrypoint/build entry, focused fixtures and tests, and an M9.1 qualification receipt. Update compatibility and developer documentation only to describe behavior proven by the qualification. Do not change publication configuration or Android/device gates.
