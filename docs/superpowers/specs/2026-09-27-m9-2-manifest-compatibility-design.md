# M9.2 Local Manifest Compatibility Checks

**Status:** In-chat design approved; written spec review pending
**Date:** 2026-09-27
**Roadmap:** M9.2 in [roadmap.md](../../roadmap.md)
**Governing decisions:** D5, D9, D10, D11 and D12 in the [design-system ADR](../../decisions/adopt-native-design-system-compiler.md)
**Depends on:** [M9.1 deterministic manifest](2026-09-27-m9-1-deterministic-manifest-design.md)

## Intent

Provide deterministic local checks and release comparisons for M9.1 design-system manifests. Identify structural contract changes, changed public defaults, consumer references to private tokens, statically attributable token consumers, and the limits of the supplied evidence. The report informs release review; it does not make a SemVer decision.

## Approved understanding

- Compare an explicitly supplied previous manifest with an explicitly supplied current manifest. Accept explicitly supplied consumer manifests for dependency and private-surface checks.
- Consumer attribution is limited to dependency edges the supplied M9.1 manifests prove. Do not crawl source files or infer dynamic use.
- Report slot and variant contract changes, but do not claim to know which applications consume a component slot or variant: M9.1 has no such consumer-use edges.
- Keep comparison tooling behind the existing opt-in @opsydyn/crumbs-css/tooling/manifest entrypoint and keep output as ordinary TypeScript records and JSON.
- Preserve manifest schema v1. Do not change the M9.1 manifest model to hold M9.2 reports.
- Keep release automation, publishing, Git/GitHub lookup, device acceptance, and Android outside this milestone.

## Existing baseline and gap

M9.1 emits a versioned, canonical manifest from explicit token-contract, component-recipe, and compiled-style roots. Its records include public/private token visibility and domains, component slots and variants, defaults, stable dependency edges, source origins, unresolved references, and declared coverage roots. Its compiler sidecar reports style-to-token edges but does not crawl consumer projects.

There is no local API or command to compare two manifests, check known consumers against private token visibility, or report release-impact evidence. M9.1 coverage is intentionally explicit, so comparison must preserve that boundary and disclose where consumer relationships are unavailable.

## Goals

- Compare two schema-v1 manifests for the same package identity and report public contract additions, removals, domain changes, component slot/variant changes, and changed defaults.
- Check a current provider manifest against explicitly supplied consumer manifests and report dependencies on tokens that the provider marks private.
- Attribute token changes to consumer packages only when a supplied consumer manifest has a dependency edge to the stable token ID.
- Produce stable, machine-readable JSON and a readable local text report with structured finding codes and evidence origins.
- Provide one repository-local command for local checking and release comparison without contacting a registry, Git remote, or hosted service.
- Keep the comparison API, report schema, and CLI outside ordinary React Native runtime graphs.

## Non-goals

- Do not crawl the workspace, parse TypeScript consumer source, or infer component usage from imports, names, runtime values, or style similarities.
- Do not claim that all consumers are known. An omitted consumer manifest or omitted M9.1 root is outside the analysis.
- Do not assign semantic-versioning impact, assess visual or accessibility consequences, or decide whether a release may proceed.
- Do not compare arbitrary DTCG data, migrate sources, apply codemods, introduce M9.4 configurable policy presets, or change alias resolution behavior.
- Do not change manifest v1 records, production metadata, package publication configuration, release workflows, Android gates, or device claims.

## Selected architecture

Add focused comparison and consumer-check modules under packages/css/src/tooling/manifest/ and export their plain-data APIs from the existing ./tooling/manifest entrypoint. Keep manifest decoding as the input boundary. Add a separately versioned compatibility-report format and Effect 4 Schema decoder/encoder for the report; its public value remains JSON-compatible data and its canonical encoder emits deterministic bytes.

The public operations are conceptually:

- compareManifests({ baseline, current, consumers? }) for release comparison plus optional consumer attribution and private-token checks.
- checkManifestConsumers({ current, consumers }) for a local check without a baseline.

Both operations decode all inputs through the M9.1 v1 manifest schema and return the same report shape. Comparison requires matching package.name and supported schema versions; package versions may differ as expected for a release comparison. Duplicate consumer identities (name plus version) are rejected so results cannot double-count one supplied artifact. Consumers must not be the provider package itself.

Add one repository-local command:

    bun run manifest:check -- --current <manifest.json> \
      [--baseline <release-manifest.json>] \
      [--consumer <consumer-manifest.json> ...] \
      [--format text|json]

--current is required. --baseline is optional: without it, the command checks the current provider and supplied consumers for private-token dependencies; with it, the command also compares public contracts. --consumer is repeatable. The default format is text; JSON output is canonical and suitable for CI artifacts. The command reads only the named files and writes the report to stdout. It does not inspect Git refs, fetch artifacts, write files, or call external services. Release jobs can generate or retrieve the two manifest files under their own established process and pass them explicitly.

## Comparison and check semantics

Compare entities by their M9.1 stable IDs, never by source path or array position.

| Change | Finding | Level |
| --- | --- | --- |
| Public token removed | token.removed | error |
| Public token domain changed | token.domain-changed | error |
| Public token becomes private | token.visibility-reduced | error |
| Component removed | component.removed | error |
| Public slot removed from a retained component | component.slot-removed | error |
| Variant axis or value removed from a retained component | component.variant-removed | error |
| Public default changed | component.default-changed | warning for review |
| Public token, component, slot, or variant added | corresponding *.added finding | info |
| A supplied consumer dependency targets a current private token | consumer.private-token-dependency | error |

If an entire component is removed, emit the component removal rather than cascading slot, axis, and value removals for the same identity. If a component remains, compare its slots, variant axes and values individually. Compare defaults by JSON value, not object insertion order. M9.2 does not classify token alias target/fallback changes or lifecycle annotation changes; these are outside the roadmap item's declared detection set and require a later compatibility decision.

Consumer matching examines stable to IDs on supplied manifest dependency edges. It supports style-token and token-alias edges. For a matched edge, include consumer package name/version and the edge's compiler origin when available. This identifies direct statically recorded references only; it does not prove runtime reachability. Consumers of a changed component slot or variant cannot be named from manifest v1 and must remain unattributed.

The report always states the provider identity, baseline/current versions when present, supplied consumer identities, and analysis limits. Limits include explicit-root coverage, unresolved references in inputs, missing component-use edges, and the fact that no unsupplied consumer was examined. A clean result means no finding was proven from these inputs, not that the package has no breaking or visual changes.

## Report and process behavior

The report has a distinct format identifier and integer schema version. It contains deterministically sorted findings with a stable rule code, level, affected entity ID, concise message, relevant before/after JSON values, and proven consumer references. It has no timestamp, absolute path, machine identity, or runtime style value. Report ordering uses the documented ordinal comparison already used by manifest v1. Identical manifest data and consumer inputs produce byte-identical JSON regardless of input order or checkout location.

The CLI exits with:

- 0 when there are no error findings; warning and informational findings remain visible.
- 1 when structural break or private-token error findings are present.
- 2 for invalid arguments, unreadable inputs, unsupported manifest/report versions, malformed manifests, or incompatible provider identities.

Input failures are fail-closed and identify the input label/path and schema diagnostic. Text and JSON findings describe the same result. A warning about a changed default does not become an automatic release block, and no output claims a SemVer recommendation.

## Acceptance evidence

1. API tests compare baseline/current fixtures and detect public token removal, domain change, visibility reduction, component removal, slot removal, variant axis/value removal, changed defaults, and additive changes with the specified codes and levels.
2. Tests avoid cascaded component findings when a component itself is removed and compare JSON defaults independent of object key order.
3. Consumer fixtures prove direct attribution for a removed/domain-changed token and a private-token dependency, including compiler origin where present. Token-alias and style-token edges are both covered.
4. Tests show that an unresolved or omitted dependency does not produce a fabricated consumer attribution, and that reports state explicit-root and component-usage limits.
5. Report schema tests reject unsupported versions, invalid finding levels/codes, non-JSON values, and inconsistent references. Canonical report property tests establish stable output under input/finding permutation and different absolute fixture roots.
6. CLI tests invoke the real command against temporary manifest files and cover check mode, compare mode, repeated consumer flags, text/JSON output, exit codes 0/1/2, missing paths, malformed JSON, incompatible package identities, and unsupported schema versions.
7. Packed tooling declarations, ESM/CommonJS consumers, ordinary runtime graphs, and production Expo iOS/web qualification remain valid. No Effect/compiler dependency enters ordinary runtime entrypoints.
8. Documentation explains both command modes, report levels, explicit consumer inputs, the analysis boundary, and that structural findings inform but do not decide release semantics.
9. Qualification evidence records fixture digests, report digest, command mode, findings, and consumer/coverage limits without absolute paths. Android remains not-run and parked.

## Risks and mitigations

- Explicit inputs can be mistaken for full coverage. Include all supplied consumer identities and unresolved/coverage limits in every report; documentation says omitted consumers are unknown.
- A structural error can be mistaken for a SemVer decision. Use finding levels only to describe observed evidence; explicitly state that release classification remains human-owned.
- Private tokens are valid inside their owning package. Apply the private-dependency rule only to supplied external consumer manifests, not the provider's own style modules.
- Component usage is absent from v1 dependency edges. Report slot/variant changes but do not name consumers; a source scanner or explicit component-use contract would be a separate future design.
- Tooling grows ordinary app bundles. Export through the existing tooling-only subpath and retain packed export/runtime graph tests.

## File boundaries

Expected implementation areas are packages/css/src/tooling/manifest/ for comparison, consumer checks, report model/schema/canonical encoding; the existing packages/css/src/tooling/manifest.ts tooling entry; focused API/schema/property/CLI tests; versioned provider and consumer fixtures; a root manifest:check script; developer documentation and qualification evidence; and docs/roadmap.md. Do not change manifest v1, authoring APIs, root/runtime entrypoints, release workflows, or platform gates.
