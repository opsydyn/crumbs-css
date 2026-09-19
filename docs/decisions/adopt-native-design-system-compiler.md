---
status: proposed
date: 2026-09-06
decision-makers: Alan P Currie
---

# Adopt a native design-system compiler architecture

## Decision summary

Build Crumbs as a React Native design-system compiler with vanilla-extract-shaped authoring, explicit native semantics, and a small runtime. Preserve styling intent in a typed intermediate representation (IR), then validate, normalize, and emit native artifacts. Use Effect 4 internally for schema and codec boundaries, and use Optic selectively for composable traversal and immutable updates. Establish correctness and runtime isolation before adding atomic utilities and enterprise design-system features.

**North Star:** Crumbs makes design-system decisions typed, composable, inspectable, and safe to evolve, while keeping native rendering costs predictable.

This is a proposed architecture and delivery contract. The user explicitly chose Effect **4** and requested an ADR and roadmap covering the assessment. Exact new API names, the selected Effect 4 release, and calibrated device budgets are outputs of named roadmap tasks, not existing guarantees. This document does not authorize a release or claim implementation is complete.

- Delivery order and completion evidence: [roadmap](../roadmap.md).
- Reproductions, measurements, and evidence limits: [assessment](../assessments/2026-09-06-design-system-assessment.md).

## Context and problem

Crumbs currently evaluates `.css.ts` modules through vanilla-extract, serializes CSS, parses declarations, converts them with `css-to-react-native`, and emits native style modules. Native theme tokens are resolved at runtime through a React provider and hooks. The package also implements native recipes, primitive-specific authoring helpers, strict diagnostics, property tests, packed-consumer tests, and a Bun benchmark harness.

The assessed checkout was `64f9934` with existing uncommitted package/dependency changes. Its declared baseline is Expo SDK 56, React 19.2, and React Native 0.85; its React Native peer range is `>=0.85 <0.86`. These are the initial compatibility targets, not evidence that all target-device behavior has been verified.

The assessment reproduced incorrect composition precedence, rejection of type-accepted structured native properties, corruption of transform values during theme resolution, token validation bypasses, cross-contract identity collisions, and build-time dependencies reachable from a runtime entrypoint. All 117 existing tests and package typechecking passed. Consequently, existing green checks do not establish the intended native contract.

Large design-system teams also need semantic token ownership, component contracts, predictable extension, package distribution, accessible state modeling, change-impact reports, and migrations. Adding more authoring helpers without strengthening the underlying contracts would expand the unsupported surface.

## Decision drivers

1. Native correctness must agree across authoring types, compiler output, and runtime resolution.
2. Teams must be able to evolve tokens and components without relying on undocumented internals.
3. Runtime computation, reference stability, memory growth, bundle size, and editor cost must be measurable.
4. Familiar vanilla-extract concepts should transfer where their native semantics are explicit.
5. Functional abstractions should make data flow and laws inspectable and testable.
6. Effect is an internal implementation choice; ordinary Crumbs usage must remain accessible through TypeScript values and React APIs.
7. Consumers need incremental adoption and interoperable token data rather than an all-at-once migration.

## Decisions

### D1. Preserve native intent in a typed IR

The target pipeline is authoring → validated native IR → normalization and dependency analysis → native artifact emission → runtime selection/resolution.

Use distinct tagged representations for style declarations, ordered compositions, variant maps, recipes, token references, and supported expressions/conditions. Preserve native arrays and objects, including transform order and shadow offsets. The compiler must distinguish style exports from metadata and ordinary values without inferring meaning from arbitrary object shapes or strings.

Validate native authoring before any browser CSS conversion. A compatibility adapter may remain for explicitly supported vanilla-extract inputs, but browser CSS text is not the canonical representation for Crumbs-native helpers. The adapter must produce the same validated IR and reject unsupported shapes deterministically. Do not silently recover partially parsed exports through regex fallback.

Retain source file, export, property path, and origin through compilation for diagnostics and manifests. Generated production artifacts must not need the compiler, schema AST, vanilla-extract authoring machinery, or CSS parser to select styles.

### D2. Specify native semantics before optimizing them

For supported native inputs, compilation and resolution must preserve their meaning. Unsupported inputs must be rejected by types where expressible and by a structured diagnostic at the boundary otherwise.

- Native primitive helpers preserve view/text/image distinctions in their outputs and subsequent resolution.
- Ordered native composition applies later entries after earlier entries. Preserve nested native values as values; do not recursively merge transform elements or shadow fields unless an API explicitly defines that operation.
- Shorthands are normalized under a documented native precedence model before comparisons or optimization. Overlapping shorthands and longhands require independent reference cases.
- Recipe ordering remains base, selected variants in definition order, then matching compounds in array order. Component-level consumer overrides follow only the extension points declared by its contract.
- Normalize equivalent variant representations before compound matching and caching; define omission, explicit `undefined`, and invalid selections separately.
- Literal and token-backed declarations pass the same property/domain validation. Their relative order cannot change because they took different compiler branches.
- Missing required tokens, wrong contract identities, and unsupported artifact versions are errors. Fallbacks apply only to explicitly optional values; they cannot conceal malformed payloads.

The compatibility adapter must document any difference from browser cascade semantics. Class-list string order is not a substitute for an explicit composition contract.

### D3. Adopt Effect 4 at internal boundaries

Use the `effect` package's **4.x** API family. M1 must select and record an exact published Effect 4 version in the package and lockfile, including any prerelease suffix, and verify that exact artifact. Do not substitute Effect 3 examples or declare an unbounded version range.

Use Schema for theme domains, contracts, native IR, configuration, and diagnostic payloads. Use codecs where encoded and decoded representations differ, especially external theme data and versioned artifacts. Define exact-field handling and numeric domains deliberately; native numeric values must not accidentally admit non-finite values merely because a general number schema does.

Schema validation occurs at ingress: compile authored modules during the build; decode external themes when loaded; validate externally supplied or incompatible artifacts before admission. Ordinary render, recipe selection, and cached token lookup operate on already-validated values. Do not add per-render schema traversal.

Compilation, normalization, and code generation are not automatically reversible codecs. Codec round-trip laws apply only to specified serialized domains. Canonical byte encoding, ordering, and cache hashing are explicit compiler responsibilities, with independent tests.

Use Effect error handling and resource management in compiler/tooling where they address a concrete need. Keep the runtime dependency graph separate. Runtime theme decoding may live behind a dedicated entrypoint with a measured footprint. Normal consumer APIs must not require Effect environments, services, runners, or Effect-valued return types.

Implementation evidence — 2026-09-14 M1.3a: exact Effect external CommonJS fails on the declared Node 22.0.0 tooling floor. Tooling JavaScript now bundles exact Effect/subpath imports; ordinary runtime remains isolated and its application maps deny Effect. A private initial-contract candidate passes both formats on floor/current Node. [Audit and limits](../assessments/2026-09-14-effect-boundary-audit.md) retain host measurements; the actual external-theme decoder does not exist and M1.3b remains deferred. Repeat qualification at concrete ingress wiring. This bounded implementation does not accept the whole proposed ADR or establish device budgets.

### D4. Use Optic for composable focuses, with one canonical theme value

Use Effect 4 `Optic` for repeated nested access, immutable theme transformations, optional overrides, and tagged IR passes where it improves clarity. Construct reusable optics outside render loops. Direct flat lookup remains the performance baseline for resolved token access.

Optics focus and update data; schemas validate it. A schema-derived optic does not remove the need to validate a domain-changing update. Prefer plain immutable IR/theme data. Any class-backed schema integration must preserve its documented construction and validation behavior.

Theme values are canonical. Flat token maps, dependency indexes, and resolved styles are derived. A Crumbs theme-update operation must validate values and publish all derived state as one immutable snapshot. Updating `theme.values` while leaving `theme.tokens` stale is invalid. Preserve the previous snapshot; do not use in-place mutation with identity-based caches.

### D5. Make token domains, scope, and identity explicit

Provide foundation, semantic, and component token layers with typed aliases and cycle detection. Support value domains such as colour, length, duration, opacity, and property-specific enums. Negative lengths must be allowed only for properties/domains that support them; do not impose one generic non-negative spacing rule everywhere.

Combine runtime validation with domain-aware authoring types. Branding every token with one common string brand is insufficient to prevent a colour token from reaching a spacing property. Preserve contract identity through authoring, serialization, theme providers, and resolved styles. Caller-supplied generic assertions such as `useTheme<T>()` cannot establish provider compatibility by themselves.

Identity must be stable across compilation and package distribution, independent of evaluation order, and scoped by the owning contract/package. Reusing a path in another contract must not overwrite metadata or resolve against the wrong theme. Contract manifests record public identifiers and compatibility versions.

Model brand, colour mode, density, and supported accessibility contexts as separate declared axes with deterministic precedence. Nested scopes and portal destinations require an explicit ownership contract and tests. Theme patches validate against a specific contract; partial patches produce a complete valid snapshot before publication.

### D6. Treat runtime identity, updates, and memory as contracts

Share resolution for immutable style-module/theme snapshots across consumers using weakly held identities. Static style exports retain identity. Reuse unaffected outputs when only unrelated dependencies change. Generated dependency metadata identifies required tokens and conditions; avoid scanning every export and every recipe branch on each consumer mount or update.

Compile recipe lookup order, defaults, and compound matchers once. Dynamic selection uses small lookup plans. Any selection cache has an explicit finite bound and eviction policy; high-cardinality runtime values cannot accumulate indefinitely. Eager expansion of every possible variant combination is prohibited.

Shared computation and selective React updates are distinct deliverables. Introduce dependency-aware subscriptions only with consistent snapshots under concurrent rendering, nested providers, unmount, and hot reload. Do not claim elimination of React renders from a shared cache alone.

Measure native rendering costs in release-mode Hermes with equivalent plain React Native baselines. `StyleSheet.create` emission is not a performance claim. Keep Bun benchmarks as compiler and algorithm checks and label their batch statistics accurately.

### D7. Add native Sprinkles and explicit conditions

Provide a native adaptation of `defineProperties` / `createSprinkles`: permitted values, token-backed scales, typed shorthands, primitive-specific property sets, deterministic conflict resolution, recipe interoperability, and stable outputs where promised.

Include conditional value normalization and mapping helpers analogous to `createNormalizeValueFn`, `createMapValueFn`, and conditional value types. Add the mapper overload to `styleVariants` and repair composition before relying on it for utilities.

Start with static utility definitions and finite values. Add explicit native conditions for platform, dimension buckets, direction, font scale, and accessibility preferences in a separate slice. Define ordering, overlapping conditions, default branches, subscription lifetime, and resize behavior. Container conditions require measured layout ownership and lifecycle semantics; do not treat CSS container syntax as an existing native implementation.

Use a measured hybrid output strategy: reuse atomic entries where beneficial, fuse static compositions where beneficial, and retain small lookup plans for dynamic choices. Atomic decomposition is not inherently faster on React Native. Report emitted bytes, lookup/array work, initialization, and allocations before changing defaults.

### D8. Support functional token and style programs

Represent supported derivations and conditions as inspectable data with explicit dependencies. Candidate operations include typed scaling, aliases, fallbacks, composition, and exhaustive matching. Fold static expressions during compilation; evaluate dynamic expressions only when their declared dependencies change.

Do not serialize arbitrary user closures as portable style programs. Define supported expression nodes, input/output domains, errors, and laws before adding each operator. A later extension protocol must specify serialization and runtime imports explicitly.

Property-test identity, deterministic evaluation, and normalization idempotence. Test associativity only for the semantic operations that promise it. Composition is order-sensitive and is not commutative. Optic laws concern semantic equality; structural-sharing guarantees require separate identity assertions.

### D9. Introduce component styling contracts and controlled extension

Extend recipes into component contracts with typed slots, shared public variant selection, defaults, meaningful states, and declared extension points. A root view, label text, and image/icon slot retain their respective style domains. Exhaustive state recipes can model a discriminated union and reject prohibited combinations.

Distinguish public tokens/slots/variants from private implementation data. Product teams may extend only declared surfaces under explicit precedence. Shared behavioral and visual state should come from the component's owner; styling APIs do not infer accessibility behavior from colours or opacity.

Support interoperation with existing React Native components and behavior libraries. The reference system demonstrates these contracts without turning Crumbs into a mandatory component/widget framework.

### D10. Make change impact, governance, and interoperability inspectable

Emit a versioned design-system manifest with contract identities, public token aliases, dependency edges, component slots/variants/defaults, target capabilities, deprecations/replacements, and source origins. Keep development provenance separate from minimal production artifacts.

Build local deterministic tooling for contract checking, release comparison, and style explanation. Reports must identify affected consumers where statically known and state analysis limits for dynamic/external usage. Structural break detection informs release review; a tool cannot determine every visual or semantic-versioning consequence automatically.

Provide configurable, versioned policies for semantic token use, literals, private interfaces, platform capabilities, deprecations, and performance/output budgets. Support incremental adoption and an explicit typed escape hatch carrying a reason and optional expiry. Do not implement exceptions as arbitrary casts or silent compiler bypasses.

Add a DTCG 2025.10 adapter with a published support matrix, typed conversion rules, alias-cycle checks, and actionable errors for unsupported native mappings. Preserve supported extension metadata without interpreting it as executable behavior. Design-tool integrations are optional adapters; no particular hosted service is required by the core.

### D11. Define package distribution and release compatibility

Support separately versioned token, component, and application packages, including precompiled component artifacts. Define a compiler/artifact/runtime compatibility matrix, validate unsupported versions, and specify the behavior of duplicate package versions and providers. An application must not need a dependency's unpublished source tree to consume its compiled styles.

Exercise ESM and CommonJS package entries and actual Metro resolution. Runtime artifacts must not load Node built-ins, compiler-only Effect services, vanilla-extract compilation, or esbuild transitively. Check tree shaking and lazy-loading behavior with concrete bundles.

Verify shared-dependency hot reload and cache invalidation using actual edits in a consumer fixture. Side-effect import strings alone do not prove that a baked importer value is rebuilt. Cache identity must account for all semantically relevant source/dependency/configuration/platform/compiler inputs.

Release documentation and automation must agree. Changes to publication policy require a separate explicit decision; implementation agents must not infer publishing permission from this ADR or from a successful verification run.

### D12. Make enterprise evidence executable

Maintain a public-API-only reference design system with typography, button, input, selection control, card, and dialog integration. Exercise brands, modes, density, scopes, portals, states, primitive slots, and package distribution. Generate useful scenario coverage from contracts without blindly rendering every combination.

Accessibility contexts include reduced motion, font scaling, RTL/logical layout, and declared contrast preferences. Static colour-pair checks must report when compositing or runtime content prevents a reliable conclusion. Native screen-reader, interaction, and rendered-layout verification remain separate gates.

Measure TypeScript completion and checking on large token/recipe fixtures, and budget type-instantiation cost alongside runtime performance. Avoid public types that force an unbounded Cartesian union of every token, condition, and variant.

Extend existing `fast-check` coverage with semantic generators, adversarial mutations, independent oracles, reproducible seeds, shrinking, and committed regression examples. Schemas may guide valid fixtures; invalid cases and reference evaluators must not merely repeat compiler logic.

## Considered options

| Option | Advantages | Costs and reason for outcome |
| --- | --- | --- |
| Continue the CSS round-trip and add adapters/helpers | Smallest initial migration; retains existing vanilla-extract integration | Native structures and provenance remain difficult to preserve; every new API expands conversion risks. Retain only as a bounded compatibility path. |
| Adopt a native IR, keep familiar APIs, and use selective runtime resolution | Addresses observed failures; supports typed contracts, static analysis, and explicit runtime costs | Requires compiler ownership, versioned artifacts, migration tests, and sustained compatibility work. Chosen because these are foundations for the North Star. |
| Build a broad runtime cascade/selector engine or native shadow-tree styling engine | Could support richer implicit styling and specialized update behavior | Substantially expands runtime, integration, and native-maintenance scope. Revisit only with measured evidence that the selected architecture cannot meet requirements. |

Within the selected architecture, handwritten validation would reduce dependency exposure but duplicate data contracts and diagnostics. Effect 4 Schema/codecs provide a coherent internal boundary model. Their footprint must still be measured and isolated; adopting Effect does not exempt a runtime entrypoint from budgets.

## Non-goals and deferred decisions

- Browser CSS cascade, globals, pseudo-selector matching, CSS keyframes, font-face registration, or view transitions in the native core.
- A mandatory React component kit, hosted governance service, design editor, telemetry backend, or userland Effect programming model.
- Making every value atomic or precomputing every variant/context combination.
- Claiming accessibility compliance, zero re-renders, zero runtime, or superior native performance from unit tests or compiler output alone.
- Importing arbitrary JavaScript functions as portable expressions, executing external token metadata, or silently accepting unknown artifact versions.
- Immediate expansion beyond the current Expo/RN baseline. Additional versions become supported only after their named compatibility gates pass.

Native container conditions, dynamic local token assignment, motion adapters, richer derivation operators, and third-party function serialization remain roadmap extensions with explicit design/evidence gates. Web output currently supports a native-style consumer path; a separate full web backend needs its own decision.

## Consequences and mitigations

- **Compiler complexity increases:** split validation, IR, normalization, emission, and dependency analysis into focused modules; qualify each migration slice against an independent evaluator.
- **Effect adds version and bundle exposure:** pin the selected 4.x artifact, measure it in M1, and enforce build/runtime import boundaries in both module formats.
- **Stronger domains and identities may break permissive alpha usage:** publish diagnostics, migrations, and compatibility notes; release-review each changed contract.
- **Caching increases state-management complexity:** require immutable snapshots, bounded caches, concurrent update tests, and retained-memory measurements.
- **Enterprise APIs can overwhelm consumers and TypeScript:** keep core authoring small; place policy, manifests, adapters, and explanation tools behind separate entrypoints and budget editor cost.
- **Automated checks can overstate confidence:** label unsupported analysis cases, missing fixtures, benchmark environments, and device acceptance separately.
- **Schema duplication can drift from TypeScript helpers:** derive contracts where practical, and add cross-layer positive/negative type tests and property tests where runtime and static constraints differ.

## Implementation plan

The roadmap is the delivery ledger. Each milestone must produce a bounded implementation plan before feature work; downstream milestone descriptions do not freeze unreviewed public signatures.

| Order | Milestone | Initial affected paths and pattern |
| --- | --- | --- |
| 1 | M0: Native correctness and runtime isolation | `packages/css/src/native-style.ts`, `css-to-rn.ts`, `theme-runtime.ts`, `transformer.ts`, `tsdown.config.ts`; extend matching `test/` suites and current Storybook fixtures. |
| 2 | M1: Effect 4 contracts and measurement baseline | `packages/css/package.json`, `bun.lock`; new focused `src/contracts/` and benchmark/consumer fixtures; audit exports and actual native runtime graph. |
| 3 | M2: Native IR/compiler migration | New `src/compiler/` modules; bridge from `native-style.ts` and `transformer.ts`; versioned artifact/schema tests and independent reference evaluator. |
| 4 | M3: Typed token system and atomic theme snapshots | `native-style.ts`, `theme-token.ts`, `theme-runtime.ts`; new `src/tokens/` modules; contract factories, domain types, aliases, scope and optic-update tests. |
| 5 | M4: Shared runtime resolution | New focused runtime modules behind `theme-runtime.ts`; caches, dependency plans, recipe selectors, concurrency and memory tests. |
| 6 | M5–M6: Utilities and functional/native conditions | New `src/sprinkles/` and `src/conditions/`/expression modules; compatibility docs, property and type fixtures. |
| 7 | M7: Component contracts | New `src/components/` contract modules; slot/state schemas and Storybook examples; extension and API-diff fixtures. |
| 8 | M8: Distribution and release compatibility | `package.json` exports/build entries, `test/pack-consumer-contract.test.ts`, Metro consumer fixtures and `.github/workflows/`; artifact migrations and compatibility matrix. |
| 9 | M9: Manifest and team tooling | New tooling entrypoints/modules, DTCG adapter, migration fixtures and policy diagnostics; keep tooling outside runtime bundles. |
| 10 | M10–M11: Reference system and optional extensions | `apps/storybook/`, consumer documentation and dedicated native benchmark scenarios; qualify reference migrations and optional adapters. |

Do not introduce an automatic legacy/new-compiler fallback. Migrate exact native property families through the IR and keep the existing qualified subset working throughout. Unsupported compatibility shapes produce diagnostics. Update consumer documentation only when the corresponding behavior ships.

Dependencies: Effect 4 is the selected internal dependency family; `fast-check` remains the property-test framework. Keep existing vanilla-extract dependencies during the compatibility transition. No new native animation, design-tool, or hosted-service dependency is authorized by this decision alone. Choose additions in their bounded feature designs.

### Verification

- [ ] All reproduced assessment counterexamples have durable regression tests and correct results or documented hard diagnostics.
- [ ] Native helper types and emitted values agree for the documented supported matrix, including structured values.
- [ ] Runtime ESM/CommonJS/Metro dependency graphs exclude Node and compiler-only modules.
- [ ] Valid artifact codec round trips preserve defined semantics; invalid versions/shapes fail with structured context.
- [ ] Contract identity, domain-safe tokens, aliases, and atomic theme updates pass independent property and type tests.
- [ ] Cached and uncached evaluation agree, static references remain stable, and cache retention obeys declared bounds.
- [ ] Utilities and recipes compose under documented precedence and support typed native primitives.
- [ ] Component package distribution, token-change impact, and second-brand scenarios pass M10 acceptance.
- [ ] Device, editor, compiler, and bundle measurements meet the committed budgets established in M1; required missing fixtures fail or are explicitly reported as incomplete.
- [ ] Release notes, compatibility docs, generated manifests, diagnostics, and publication workflow describe the behavior actually verified.

## Revisit conditions

Revisit the relevant decision if Effect 4's measured runtime footprint defeats the isolated-entrypoint budget; native IR preservation requires an incompatible public authoring model; qualified Hermes workloads cannot meet the baseline-derived budgets; supported React Native changes invalidate artifact semantics; or large-design-system editor tests exceed their budgets. Record the evidence and a superseding/amending ADR rather than silently weakening a guarantee.

## References

- [Current Crumbs compatibility contract](../../packages/css/COMPATIBILITY.md).
- [Vanilla-extract Sprinkles](https://vanilla-extract.style/documentation/packages/sprinkles/), [Recipes](https://vanilla-extract.style/documentation/packages/recipes/), [composition](https://vanilla-extract.style/documentation/style-composition/), and [function serialization](https://vanilla-extract.style/documentation/api/add-function-serializer/).
- [Effect 4 Schema migration guide](https://github.com/Effect-TS/effect/blob/main/migration/schema.md) and [Optic guide](https://github.com/Effect-TS/effect/blob/main/packages/effect/OPTIC.md). These track upstream development; implementation must verify the selected release.
- [DTCG stable technical reports](https://www.designtokens.org/technical-reports/), including the [2025.10 format](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/) and [resolver](https://www.w3.org/community/reports/design-tokens/CG-FINAL-resolver-20251028/).
- [React Native StyleSheet](https://reactnative.dev/docs/stylesheet.html), [accessibility](https://reactnative.dev/docs/accessibility.html), and [Text](https://reactnative.dev/docs/text).


## Implementation evidence — 2026-09-14

Approved M1.1 selects and pins `effect@4.0.0-rc.115` internally. [Exact artifact/API selection](../assessments/2026-09-14-effect4-api-selection.md) records registry metadata, installed source hashes, Schema/Codec/Optic probes, plain consumer boundaries and ESM/CommonJS caller qualification on Node 24.15.0. This is a release candidate; Codec is a Schema type view and optional optic updates require explicit failure handling. No production Crumbs schema migration or Effect runtime budget is claimed. M1.2 and M1.3 retain those separate tasks. The broader ADR status and unchecked verification criteria remain unchanged.


### Initial schema boundary evidence — 2026-09-14

Approved M1.2 defines internal schema-derived identity/reference/declaration/diagnostic types and a version-1 prototype artifact envelope, with strict data/JSON codecs. [Contract policies and qualification](../assessments/2026-09-14-internal-payload-contracts.md) specify finite/safe-integer fields, signed-zero rejection at the new JSON boundary, descriptor-safe admission, structured issue paths and independent shrinking round trips. These shape contracts do not replace property/token-domain admission or migrate existing compiler/provider behavior. Actual emitted Effect boundary loading and initialization remain M1.3; compiler/ABI migration remains M2. Broader verification criteria are not promoted by this slice.

### Native IR semantic contract — 2026-09-15

Approved M2.1 specifies the internal [native IR v1 semantic contract](../specifications/native-ir-v1.md): immutable tagged module/style/map/recipe/export forms, qualified identities, primitive domains, ordered composition and normalization laws, token/reference semantics, source/property provenance, three separate equality relations and fail-closed diagnostics. A test-only independent evaluator fixes the core composition, equality, dependency, reference and recipe laws with seeded property tests. No production IR node, compiler route, artifact ABI or public API is introduced by this specification slice; those remain incremental M2 delivery work. The broader ADR remains proposed.

### First production IR vertical — 2026-09-19

Approved M2.2a routes Crumbs-authored `opacity` through an immutable Effect Schema declaration block before CSS serialization. Internal authoring metadata distinguishes Crumbs helpers from the vanilla-extract compatibility path; finite literals, signed zero, primitive domains, package-relative provenance and legacy token references survive normalization and both emitters. Invalid marked values produce `CRUMBS_IR_INVALID_VALUE` without falling back, while unmarked vanilla-extract and unmigrated properties retain the qualified legacy path. [Implementation evidence](../assessments/2026-09-19-native-ir-opacity.md) records independent seeded differential tests, exact schema mutations, runtime isolation and consumer qualification. This is one production property vertical, not completion of M2.2, the external artifact ABI, qualified token identity or the ADR verification checklist.

### Unitless numeric IR family — 2026-09-19

Approved M2.2b generalizes production numeric blocks to a non-empty ordered declaration family and migrates `zIndex`, `elevation`, `flexGrow` and `flexShrink`. Admission follows the installed React Native 0.85 types: the FlexStyle properties admit view, text and image, while elevation admits view and text. Schema decoding independently verifies property provenance and primitive compatibility; capture accepts only finite numbers or legacy symbolic tokens and fails malformed Crumbs values without fallback. [Implementation evidence](../assessments/2026-09-19-native-ir-unitless-numeric.md) records oracle comparison and compatibility qualification. Lengths, colours, structured properties, native `flex`, qualified token identity and the vanilla-extract adapter remain separate migrations.

### Scalar native flex IR — 2026-09-19

Approved M2.2c migrates finite numeric and token-backed `flex` through production IR for view, text and image. The declaration remains an independent React Native Yoga scalar: it does not synthesize browser shorthand defaults, and explicit `flexGrow`, `flexShrink` and legacy-routed `flexBasis` survive independently. Invalid Crumbs-authored flex now fails at IR admission with `CRUMBS_IR_INVALID_VALUE`; unmarked vanilla-extract remains on the compatibility route. [Implementation evidence](../assessments/2026-09-19-native-ir-flex.md) records the schema, generated ordering and consumer qualification.

### Flex-basis scalar IR — 2026-09-19

Approved M2.2d generalizes the production declaration block from numeric-only to property-specific scalar values and migrates `flexBasis`. Static admission follows React Native's `DimensionValue` subset: finite point numbers, exact `auto`, finite percentages and legacy tokens across view, text and image. Animated nodes and null remain runtime concerns; CSS `px` strings and malformed values fail before serialization. Scalar freezing and lowering distinguish token records from strings, while per-property last-winner order keeps every flex field independent. [Implementation evidence](../assessments/2026-09-19-native-ir-flex-basis.md) records generated ordering and consumer qualification.

### Size DimensionValue IR — 2026-09-19

Approved M2.2e migrates `width`, `height`, `minWidth`, `minHeight`, `maxWidth` and `maxHeight` through production scalar IR for view, text and image. A shared property classification makes schema decoding and capture enforce the same static DimensionValue subset without widening numeric-only declarations. The properties normalize independently with deterministic last-winner order; unmarked vanilla-extract continues through the compatibility adapter. [Implementation evidence](../assessments/2026-09-19-native-ir-dimensions.md) records direct ownership, generated order and consumer qualification.
