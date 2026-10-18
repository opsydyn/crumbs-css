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

### Position-edge DimensionValue IR — 2026-09-19

Approved M2.2f migrates exact `top`, `right`, `bottom`, `left`, `start` and `end` declarations through scalar IR across view, text and image. Physical and logical fields remain independent and retain deterministic per-property order; the compiler does not assume layout direction or expand inset aliases in this slice. The shared DimensionValue schema and capture domain reject malformed Crumbs values before CSS fallback. [Implementation evidence](../assessments/2026-09-19-native-ir-position-edges.md) records direct ownership, generated order and consumer qualification.

### Inset-alias IR expansion — 2026-09-19

Approved M2.2g migrates the seven Crumbs inset aliases through scalar IR by expanding them into ordered canonical position-edge declarations at capture. Provenance retains the authored alias alongside each canonical property and an explicit expansion path; Effect Schema rejects alias/property pairs outside the declared expansion table. Expanded aliases and exact longhands use one canonical last-winner normalization law while physical and logical fields remain independent for React Native to resolve by layout direction. [Implementation evidence](../assessments/2026-09-19-native-ir-inset-aliases.md) records the alias matrix, precedence oracle and consumer qualification.

### Gap-family scalar IR — 2026-09-19

Approved M2.2h migrates `gap`, `rowGap` and `columnGap` through production scalar IR across view, text and image. Broad gap expands into canonical row and column declarations using the same provenance-validated alias mechanism as inset; exact axis fields and expanded declarations then share canonical last-winner normalization. Static values are finite point numbers, finite percentages or legacy tokens. [Implementation evidence](../assessments/2026-09-19-native-ir-gap.md) records direct ownership, generated broad/axis order and consumer qualification.

### Physical padding scalar IR — 2026-09-19

Approved M2.2i migrates physical padding longhands plus broad and horizontal/vertical aliases through scalar IR. Alias expansion retains authored provenance and canonical fields; normalization applies one broad/pair/side last-winner law. [Implementation evidence](../assessments/2026-09-19-native-ir-padding.md) records generated precedence and consumer qualification.

### Logical padding scalar IR — 2026-09-19

Approved M2.2j migrates native start/end padding and six inline/block aliases. Canonical expansion preserves authored provenance; logical fields remain independent from physical sides without compiler direction inference. [Implementation evidence](../assessments/2026-09-19-native-ir-logical-padding.md) records generated ordering and qualification.

### Physical margin scalar IR — 2026-09-19

Approved M2.2k migrates physical margin sides and broad/horizontal/vertical aliases through scalar IR, including negative finite DimensionValues. [Implementation evidence](../assessments/2026-09-19-native-ir-margin.md) records generated precedence and qualification.

### Logical margin scalar IR — 2026-09-19

Approved M2.2l migrates native start/end margin and six inline/block aliases while preserving logical fields independently from physical sides. [Implementation evidence](../assessments/2026-09-19-native-ir-logical-margin.md) records generated ordering and qualification.

### Physical border-width scalar IR — 2026-09-19

Approved M2.2m migrates broad and physical side border widths with finite-number/token admission and provenance-validated broad expansion. [Implementation evidence](../assessments/2026-09-19-native-ir-border-width.md) records generated precedence and qualification.

### Logical border-width scalar IR — 2026-09-19

Approved M2.2n migrates exact `borderStartWidth` and `borderEndWidth` fields while keeping physical and logical widths independent. [Implementation evidence](../assessments/2026-09-19-native-ir-logical-border-width.md) records ordering and qualification.

### Physical border-color scalar IR — 2026-09-19

Approved M2.2o introduces a property-specific non-empty string domain for native colors and migrates broad plus physical border colors. Schema semantic checks keep arbitrary strings out of numeric and DimensionValue families. [Implementation evidence](../assessments/2026-09-19-native-ir-border-color.md) records precedence and qualification.

### Logical border-color scalar IR — 2026-09-19

Approved M2.2p migrates exact `borderStartColor` and `borderEndColor` through the color domain while retaining logical/physical independence. [Implementation evidence](../assessments/2026-09-19-native-ir-logical-border-color.md) records ordering and qualification.

### Physical border-radius scalar IR — 2026-09-19

Approved M2.2q migrates broad and four physical corner radii with finite-number/token admission and provenance-validated expansion. [Implementation evidence](../assessments/2026-09-19-native-ir-border-radius.md) records precedence and qualification.

### Logical corner-radius scalar IR — 2026-09-19

Approved M2.2r migrates the four fully logical corner-radius fields as exact scalar declarations across view, text and image. They retain their authored identities independently from physical corners; no alias expansion or layout-direction inference is introduced. [Implementation evidence](../assessments/2026-09-19-native-ir-logical-border-radius.md) records property-based ordering, schema rejection and consumer qualification.

### Semi-logical corner-radius scalar IR — 2026-09-19

Approved M2.2s migrates the four top/bottom start/end corner-radius fields as exact scalar declarations across view, text and image. Physical, fully logical and semi-logical property identities coexist without compiler remapping. [Implementation evidence](../assessments/2026-09-19-native-ir-semi-logical-border-radius.md) records generated ordering, cross-family independence and consumer qualification.

### Background-colour scalar IR — 2026-09-19

Approved M2.2t migrates `backgroundColor` through the existing property-specific colour domain across view, text and image. The compiler retains exact property provenance, literal/token identity and deterministic last-winner order while leaving other scalar value families closed to arbitrary strings. [Implementation evidence](../assessments/2026-09-19-native-ir-background-color.md) records generated ordering, malformed-value rejection and consumer qualification.

### Text-colour scalar IR — 2026-09-19

Approved M2.2u migrates `color` through the existing colour domain with the installed TextStyle-only primitive contract. Effect Schema decoding now derives primitive validity for every declaration from the same per-property table as capture, replacing the earlier elevation-only decoder exception and rejecting forged cross-primitive artifacts. [Implementation evidence](../assessments/2026-09-19-native-ir-text-color.md) records generated ordering, primitive rejection and consumer qualification.

### Image tint-colour scalar IR — 2026-09-19

Approved M2.2v migrates `tintColor` through the existing colour domain with the installed ImageStyle-only primitive contract. Capture and Effect Schema decoding share the same primitive table, so marked view/text usage and forged cross-primitive artifacts fail deterministically. [Implementation evidence](../assessments/2026-09-19-native-ir-tint-color.md) records generated ordering, primitive rejection and consumer qualification.

### Image overlay-colour scalar IR — 2026-09-19

Approved M2.2w migrates `overlayColor` through the existing colour domain with the installed ImageStyle-only primitive contract. Capture and Effect Schema decoding share the same primitive table, so marked view/text usage and forged cross-primitive artifacts fail deterministically. [Implementation evidence](../assessments/2026-09-19-native-ir-overlay-color.md) records generated ordering, primitive rejection and consumer qualification.

### Shadow-colour scalar IR — 2026-09-19

Approved M2.2x migrates `shadowColor` through the existing colour domain across view, text and image, following the installed ShadowStyleIOS inheritance. Exact provenance, literal/token identity and deterministic last-winner order are retained. [Implementation evidence](../assessments/2026-09-19-native-ir-shadow-color.md) records primitive coverage, generated ordering and consumer qualification.

### Numeric shadow scalar IR — 2026-09-19

Approved M2.2y migrates `shadowOpacity` and `shadowRadius` through the finite numeric/token domain across view, text and image, following the installed ShadowStyleIOS inheritance. The compiler preserves signed finite values without applying platform clamping, and leaves structured `shadowOffset` on its existing structured-value path. [Implementation evidence](../assessments/2026-09-19-native-ir-shadow-numeric.md) records generated ordering, value rejection and consumer qualification.

### Text-shadow scalar IR — 2026-09-19

Approved M2.2z migrates text-only `textShadowColor` and `textShadowRadius` through the existing colour and finite numeric/token domains. Both fields retain exact provenance and independent ordering while structured `textShadowOffset` remains on its existing structured-value path. [Implementation evidence](../assessments/2026-09-19-native-ir-text-shadow.md) records primitive rejection, property-specific admission and consumer qualification.

### Text-decoration colour scalar IR — 2026-09-19

Approved M2.2aa migrates `textDecorationColor` through the existing colour domain with the installed text-only primitive contract. Capture and Effect Schema decoding share the same primitive table, so view/image use and forged cross-primitive artifacts fail deterministically. [Implementation evidence](../assessments/2026-09-19-native-ir-text-decoration-color.md) records generated ordering, primitive rejection and consumer qualification.

### Typography-metric scalar IR — 2026-09-19

Approved M2.2ab migrates text-only `fontSize`, `letterSpacing` and `lineHeight` through the finite numeric/token domain. Exact numeric identity, provenance and independent last-winner order are retained; marked native capture does not parse CSS units or apply native range policy. [Implementation evidence](../assessments/2026-09-19-native-ir-typography-metrics.md) records generated ordering, primitive rejection and consumer qualification.

### Font-family scalar IR — 2026-09-19

Approved M2.2ac migrates text-only `fontFamily` through a dedicated non-empty string/token domain. This domain permits platform font names while keeping arbitrary strings out of numeric scalar properties; shared primitive admission rejects view/image use and forged artifacts deterministically. [Implementation evidence](../assessments/2026-09-19-native-ir-font-family.md) records generated ordering, string-domain isolation and consumer qualification.

### Font-variant scalar IR — 2026-09-19

Approved M2.2ad migrates text-only `fontStyle` and `fontWeight` through property-specific literal/token domains derived from the installed React Native contract. Both string and numeric weight forms retain exact identity, while unsupported literals and forged cross-property values fail consistently at capture and Effect Schema decoding. [Implementation evidence](../assessments/2026-09-19-native-ir-font-variants.md) records exhaustive literal coverage, generated ordering and consumer qualification.

### Text-alignment scalar IR — 2026-09-19

Approved M2.2ae migrates text-only `textAlign`, `textAlignVertical` and `verticalAlign` through property-specific literal/token domains derived from the installed React Native contract. Shared capture and Effect Schema admission preserve exact-field ordering and reject forged primitive domains, provenance and cross-property literals. [Implementation evidence](../assessments/2026-09-19-native-ir-text-alignment.md) records exhaustive literal coverage, generated ordering and consumer qualification.

### Text-decoration literal scalar IR — 2026-09-19

Approved M2.2af migrates text-only `textDecorationLine` and `textDecorationStyle` through property-specific literal/token domains derived from the installed React Native contract. The fields retain independent provenance and last-winner ordering while `textDecorationColor` remains on its separately qualified colour domain. [Implementation evidence](../assessments/2026-09-19-native-ir-text-decoration.md) records exhaustive literal coverage, generated ordering and consumer qualification.

### Text-control scalar IR — 2026-09-19

Approved M2.2ag migrates text-only `textTransform`, `writingDirection` and `userSelect` through property-specific literal/token domains derived from the installed React Native contract. Shared capture and Effect Schema admission retain exact provenance and ordering while rejecting cross-property literals and invalid primitive domains. [Implementation evidence](../assessments/2026-09-19-native-ir-text-controls.md) records exhaustive literal coverage, generated ordering and consumer qualification.

### Boolean scalar IR — 2026-09-19

Approved M2.2ah adds booleans to the internal scalar value carrier and admits them only for text-only Android `includeFontPadding`, alongside token references. Property-specific semantic validation prevents the wider carrier from admitting booleans to numeric, colour, string or literal-valued properties. [Implementation evidence](../assessments/2026-09-19-native-ir-include-font-padding.md) records boolean isolation, generated ordering and consumer qualification.

### Layout-mode scalar IR — 2026-09-19

Approved M2.2ai migrates `display`, `position` and `direction` through property-specific literal/token domains derived from the installed React Native contract. All three fields apply to view, text and image, retain exact provenance and independent last-winner ordering, and fail invalid or cross-property literals consistently at capture and Effect Schema decoding. [Implementation evidence](../assessments/2026-09-19-native-ir-layout-modes.md) records exhaustive literal coverage, generated ordering and consumer qualification.

### Primitive-aware overflow scalar IR — 2026-09-19

Approved M2.2aj introduces primitive-specific literal admission at the declaration-block boundary and migrates `overflow`. The property-wide domain remains `visible`, `hidden` and `scroll`, while image blocks reject `scroll` according to the installed React Native contract; view and text retain the full domain. Token references remain portable across all three primitives because their resolved theme value is a runtime concern. [Implementation evidence](../assessments/2026-09-19-native-ir-overflow.md) records per-primitive admission, forged-node rejection, generated ordering and consumer qualification.

### Flex-layout scalar IR — 2026-09-19

Approved M2.2ak migrates `flexDirection`, `flexWrap`, `alignContent`, `alignItems`, `alignSelf` and `justifyContent` through property-specific literal/token domains derived from the installed React Native contract. All six fields apply to view, text and image, retain exact provenance and independent last-winner ordering, and reject unsupported or cross-property literals consistently at capture and Effect Schema decoding. [Implementation evidence](../assessments/2026-09-19-native-ir-flex-layout.md) records exhaustive literal coverage, generated ordering and consumer qualification.

### Box-sizing scalar IR and FlexStyle audit — 2026-09-19

Approved M2.2al migrates `boxSizing` through its exact `border-box | content-box` literal/token domain across view, text and image. The accompanying installed-type audit establishes `aspectRatio` as the sole remaining FlexStyle field outside scalar IR; it requires an isolated finite-number/non-empty-string/token domain so arbitrary strings do not leak into existing numeric families. [Implementation evidence](../assessments/2026-09-19-native-ir-box-sizing.md) records exact admission, generated ordering, the remaining-surface audit and consumer qualification.

### Aspect-ratio scalar IR and FlexStyle completion — 2026-09-19

Approved M2.2am migrates `aspectRatio` through an isolated finite-number/non-empty-string/token domain across view, text and image. The domain is checked independently at capture and Effect Schema decoding, so its installed string representation does not widen existing numeric property families. This migration completes scalar-IR coverage of the installed React Native FlexStyle surface. [Implementation evidence](../assessments/2026-09-19-native-ir-aspect-ratio.md) records mixed-representation generation, domain isolation and consumer qualification.

### Visibility and cursor scalar IR — 2026-09-19

Approved M2.2an migrates `backfaceVisibility` and `cursor` through their exact installed literal/token domains across view, text and image. Both fields retain exact provenance and independent last-winner ordering, and unsupported or cross-property literals fail consistently at capture and Effect Schema decoding. [Implementation evidence](../assessments/2026-09-19-native-ir-visibility-cursor.md) records exhaustive literal coverage, generated ordering and consumer qualification.

### View-interaction scalar IR — 2026-09-19

Approved M2.2ao migrates view/text-only `borderCurve` and `pointerEvents` through exact installed literal/token domains. The shared primitive matrix rejects image use during capture and Effect Schema decoding, while both fields retain exact provenance and independent last-winner ordering. [Implementation evidence](../assessments/2026-09-19-native-ir-view-interaction.md) records exhaustive literal coverage, primitive rejection, generated ordering and consumer qualification.

### Batched literal-surface scalar IR — 2026-09-20

Approved M2.2ap batches view/text-only `borderStyle`, `outlineStyle`, `isolation` and `mixBlendMode` with image-only `resizeMode` and `objectFit`. Each field retains its exact installed literal/token domain and primitive contract; capture and Effect Schema decoding reject unsupported values, forged provenance and cross-property literals. [Implementation evidence](../assessments/2026-09-20-native-ir-literal-surface.md) records exhaustive literal coverage, primitive rejection, generated ordering and consumer qualification.

### Outline and logical border-colour scalar IR — 2026-09-20

Approved M2.2aq migrates view/text-only `outlineColor`, `outlineOffset`, `outlineWidth`, `borderBlockColor`, `borderBlockStartColor` and `borderBlockEndColor`. Colour fields reuse the established non-empty colour/token domain; outline dimensions use finite-number/token admission. Capture and Effect Schema decoding enforce the view/text primitive contract and reject invalid values, forged provenance and cross-property values. [Implementation evidence](../assessments/2026-09-20-native-ir-outline-border-color.md) records generated ordering, primitive rejection and consumer qualification.

### Structured boundary audit and shadow-offset IR — 2026-09-20

Approved M2.2ar keeps structured migration behind explicit value-family contracts. The installed React Native surface separates finite scalar transform companions (`rotation`, `scaleX`, `scaleY`, `translateX`, `translateY`), fixed offset records (`shadowOffset`, `textShadowOffset`), ordered transform arrays (`transform`), exact union/array fields (`transformOrigin`, `transformMatrix`), text-only arrays (`fontVariant`) and broader union arrays (`boxShadow`, `filter`, experimental background properties). Each family therefore gets an independent IR admission and compatibility decision rather than a recursive catch-all object carrier.

This slice migrates only `shadowOffset` across view, text and image. Marked Crumbs rules enter an immutable Effect Schema block with a fixed finite `width`/`height` shape, source/property provenance, primitive-domain intersection and whole-value last-winner composition. Descriptor-safe capture rejects accessors, decorated objects, extra keys, non-finite numbers and token strings before CSS serialization. The transformer converts those admission failures to the established `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE` boundary while unmarked records retain the existing compatibility path. `textShadowOffset` remains text-only and is deliberately deferred so its domain can be qualified separately. [Implementation evidence](../assessments/2026-09-20-native-ir-structured.md) records the audit, ownership boundary and qualification.

### Scalar transform companion IR — 2026-09-20

Approved M2.2as migrates the five deprecated-but-installed `TransformsStyle` companion fields: `rotation`, `scaleX`, `scaleY`, `translateX` and `translateY`. They are independent finite numeric values at the direct React Native style boundary, with legacy `var(--crumbs-*)` references admitted through the existing token carrier. Their primitive domain is view, text and image because all three installed style interfaces inherit `TransformsStyle`; ordered transform arrays remain a separate structured contract and percentage translations remain scoped to transform-array entries.

Capture and Effect Schema decoding share the same exact property union, numeric/token domain, provenance and primitive matrix. The two translate companion names are also present in the native CSS conversion allowlist so the compatibility path recognises the complete family. Animated values, strings such as angles or percentages, and other dynamic forms remain runtime concerns. [Implementation evidence](../assessments/2026-09-20-native-ir-transform-companions.md) records the installed-type boundary and qualification.

### Text-shadow offset structured IR — 2026-09-20

Approved M2.2at extends the fixed structured offset IR to text-only `textShadowOffset`. The value contract is shared with `shadowOffset`: an owned plain object with exactly finite `width` and `height` fields. Property-specific primitive admission keeps `textShadowOffset` on text while `shadowOffset` continues to support view, text and image. A marked text rule may carry both properties because their shared primitive intersection is text; each declaration retains property provenance and whole-value last-winner composition.

Capture remains descriptor-safe and rejects accessors, decorated objects, extra or missing fields, non-finite numbers and token strings before CSS serialisation. Effect Schema validates the property union, provenance and primitive matrix independently of capture. The transformer lowers the structured block after scalar capture, preserving the established `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE` boundary for malformed marked inputs; unmarked records remain on the compatibility path. Ordered `transform`, `transformOrigin`, `transformMatrix`, `fontVariant` and broader structured unions remain separate contracts. [Implementation evidence](../assessments/2026-09-20-native-ir-text-shadow-offset.md) records the installed text-only boundary and qualification.

### Structured array IR — 2026-09-20

Approved M2.2au batches three closed array families with independent contracts: view/text/image `transformOrigin` admits dense two- or three-entry tuples of finite numbers or exact percentage strings; view/text/image `transformMatrix` admits a dense sixteen-entry finite-number matrix; and text-only `fontVariant` admits a dense array of the installed React Native font-variant literals. Empty `fontVariant` arrays remain valid under the public array contract. Arbitrary origin strings, token or animated values, and unsupported literals remain outside marked static capture.

The structured compiler uses descriptor-safe dense-array admission plus property-specific Effect Schema and primitive checks. It clones and freezes admitted arrays, retains property provenance, intersects primitive domains for composed blocks and applies whole-value last-winner ordering independently per property. Cross-realm plain arrays are accepted; sparse, accessor-backed, decorated or wrong-length arrays fail before CSS serialisation. `transformMatrix` is included in the native CSS conversion allowlist. Ordered `transform` remains a separate operation-list contract, while `boxShadow`, `filter` and experimental background arrays remain deferred. [Implementation evidence](../assessments/2026-09-20-native-ir-structured-arrays.md) records the static boundary and qualification.

### Ordered transform structured IR — 2026-09-20

Approved M2.2av migrates marked static `transform` arrays as an explicit ordered operation union. The supported forms are finite numeric `perspective`/`scale` operations, finite `deg`/`rad` angle operations, finite numeric or percentage `translateX`/`translateY` operations, and a dense sixteen-number `matrix`. Every entry has exactly one supported key; empty lists are valid, while authored order is retained as part of the value. The view/text/image primitive matrix follows `TransformsStyle` inheritance.

Descriptor-safe capture and Effect Schema decoding validate the outer list, operation records and nested matrices, rejecting accessors, extra keys, sparse or decorated arrays, dynamic values, malformed units and non-finite numeric text. Lowering deep-clones and freezes the operation list. The complete list replaces the previous transform value during composition, and React Native's string transform form plus unmarked arrays remain on the compatibility route. [Implementation evidence](../assessments/2026-09-20-native-ir-ordered-transform.md) records the operation contract and qualification.

### Closed box-shadow structured IR — 2026-09-20

Approved M2.2aw migrates marked static `boxShadow` arrays through a view-only closed item union. Required `offsetX` and `offsetY` values admit finite numbers or finite percentages; optional `color` is a non-empty native colour string, `blurRadius` is non-negative finite, `spreadDistance` is finite, and `inset` is boolean. Empty arrays remain valid whole-value replacements.

Descriptor-safe capture and Effect Schema decoding reject accessors, symbols, decorated or sparse arrays, extra keys, nested tokens, unsupported unit strings and non-finite values. Admitted lists and items are cloned and frozen; composition retains the last complete list as one property. CSS string shadows remain on the compatibility route, while `filter` and experimental background arrays remain deferred as separate contracts. [Implementation evidence](../assessments/2026-09-20-native-ir-box-shadow.md) records the installed boundary and qualification.

### Closed filter structured IR — 2026-09-20

Approved M2.2ax migrates marked static `filter` arrays through a closed function union for view and text primitives. Amount functions (`brightness`, `contrast`, `grayscale`, `invert`, `opacity`, `saturate`, `sepia`) accept non-negative finite numbers or finite bare/percentage/pixel strings; `blur` accepts non-negative finite numbers or bare/pixel strings; `hueRotate` accepts zero or finite `deg`/`rad` strings; and `dropShadow` accepts a closed nested item with finite numeric/zero/pixel offsets, non-negative standard deviation and finite numeric or non-empty colour string. Empty lists replace the complete value.

Descriptor-safe capture and Effect Schema decoding reject accessors, symbols, decorated or sparse arrays, extra keys, nested tokens, animated values, unsupported units and invalid primitive domains. Admitted function lists and nested items are cloned and deeply frozen; composition retains the last complete list as one property. CSS filter strings remain on the compatibility route, while experimental background arrays remain deferred as a separate contract. [Implementation evidence](../assessments/2026-09-20-native-ir-filter.md) records the installed boundary and qualification.

### Experimental background audit — 2026-09-20

Approved M2.2ay audits `experimental_backgroundRepeat`, `experimental_backgroundSize`, `experimental_backgroundPosition` and `experimental_backgroundImage` before opening another structured IR family. All four fields are ViewStyle fields inherited by TextStyle and absent from ImageStyle. Their array processors have different semantics: repeat is a closed two-key literal record, size is a keyword or length record, position is a four-shape positional union, and image is a nested linear/radial gradient union with colour-stop transition hints and parser defaults.

No generic background object carrier is introduced. The staged decision is to qualify repeat first, then size and position, with gradient images last. Size, position and repeat arrays currently pass through React Native's JavaScript processors without validation, while image arrays apply colour-stop and gradient parsing unless native CSS parsing bypasses them. The CSS-to-React-Native allowlist does not include the experimental fields, so compatibility strings remain runtime-only until a marked static contract removes them before CSS conversion. Gradient-image migration requires a native-device acceptance slice because of opaque platform colours, nested defaults, parser-unit differences and experimental support. [Implementation evidence](../assessments/2026-09-20-native-ir-background-audit.md) records the audit and staged order.

### Experimental background repeat structured IR — 2026-09-20

Approved M2.2az migrates marked static `experimental_backgroundRepeat` arrays as a view/text-only closed list of `{ x, y }` repeat-keyword records. Capture and Effect Schema use the installed `repeat | space | round | no-repeat` domain, reject image primitives and malformed descriptor shapes, clone and freeze admitted values, and retain whole-list last-winner composition. Compatibility strings remain runtime values because the field is outside the CSS-to-React-Native allowlist. Size, position and gradient image backgrounds stay separate contracts; no generic carrier, public API or native ABI is introduced. [Implementation evidence](../assessments/2026-09-20-native-ir-background-repeat.md) records the boundary and qualification.

### Experimental background size structured IR — 2026-09-20

Approved M2.2ba migrates marked static `experimental_backgroundSize` arrays as a view/text-only union of `cover`/`contain` and exact `{ x, y }` size records. Capture and Effect Schema admit only finite non-negative numbers, `auto`, or finite non-negative `px`/percentage dimensions, reject image primitives and malformed descriptor shapes, clone and freeze values, and retain whole-list last-winner composition. Compatibility strings remain runtime values because the field is outside the CSS-to-React-Native allowlist. Position and gradient image backgrounds stay separate contracts; no generic carrier, public API or native ABI is introduced. [Implementation evidence](../assessments/2026-09-20-native-ir-background-size.md) records the boundary and qualification.

### Experimental background position structured IR — 2026-09-20

Approved M2.2bb migrates marked static `experimental_backgroundPosition` arrays as a view/text-only union of the four installed positional record shapes: `{ top, left }`, `{ top, right }`, `{ bottom, left }` and `{ bottom, right }`. Coordinate values admit finite numbers, `"0"`, and finite signed `px` or percentage strings. Capture and Effect Schema enforce the exact shape, descriptor-safe data fields, provenance and primitive matrix; admitted lists and records are cloned and frozen, and whole-list last-winner composition includes empty-list replacement.

Position strings remain on the compatibility route because the experimental field is outside the CSS-to-React-Native allowlist. Image primitives, arbitrary strings, unsupported units, dynamic values and malformed or decorated records remain rejected from marked static IR. Gradient images stay a separate contract requiring native-device acceptance; no generic carrier, public API or native ABI is introduced. [Implementation evidence](../assessments/2026-09-20-native-ir-background-position.md) records the installed boundary and qualification.

### Experimental background image structured IR — 2026-09-20

Approved M2.2bc migrates marked static `experimental_backgroundImage` arrays through an explicit view/text-only linear and radial gradient union. Linear records require an explicit direction keyword or finite `deg`/`grad`/`rad`/`turn` angle. Radial records require explicit shape, size and position; size is an installed extent keyword or a finite non-negative x/y record. Colour stops are dense, contain at least two literal colour stops, and permit only internal one-position transition hints. Opaque platform colour values, CSS variables, implicit parser defaults, unsupported units and dynamic forms remain runtime values.

Capture and Effect Schema share the same descriptor-safe value checks, provenance and primitive matrix. Admitted lists, records and nested stops are cloned and frozen, and whole-list last-winner composition includes empty-list replacement. Compatibility strings remain on the runtime route because the experimental property is outside the CSS-to-React-Native allowlist. The implementation is not considered native-qualified until the dedicated iOS packed-consumer gate records direct screenshots and platform parser differences; Android remains parked. No generic background carrier, public API or native ABI is introduced. [Implementation evidence](../assessments/2026-09-20-native-ir-background-image.md) records the contract and qualification boundary.

### Experimental background image iOS native acceptance — 2026-09-20

Approved M2.2bd exercises the M2.2bc gradient contract in the packed Expo consumer on the dedicated iPhone 17 / iOS 26.5 simulator. Both light and dark themes rendered linear keyword and angle gradients, radial extent and explicit x/y sizes, mixed stops with a transition hint, multiple layers and an empty-list replacement. Direct screenshots and the exact package hash are retained. The explicit radial x/y case remains a confined positioned footprint and transparent stop regions expose the underlying surface; these are recorded observations of the installed native semantics rather than new defaults.

This closes the iOS rendering gate for the canonical subset, but it is partial cross-platform evidence because Android remains deliberately parked. No CSS parsing override, public API, native ABI or native-device performance budget was added. [Acceptance evidence](../acceptance/2026-09-20-background-image/README.md) and the [qualification record](../evidence/2026-09-20-native-ir-background-image/qualification.json) record the device, Expo/RN versions, artifact hash and captures.

### Vanilla-extract compatibility adapter IR — 2026-09-20

Approved M2.3 routes unmarked vanilla-extract rules through the validated native IR whenever the value can be preserved without inference. Static scalar values, Crumbs token references, structured arrays and fixed shadow-offset records receive `vanilla-extract-adapter` provenance and use the same Effect Schema, primitive-domain and lowering contracts as Crumbs-authored rules. Browser-oriented strings and shorthand forms remain on the existing CSS converter route, so the adapter does not partially reconstruct a browser payload.

Malformed static structured values fail with `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE` and source/class/property context. Compiled export reconstruction now has one VM data path; failures throw `CRUMBS_CSS_UNSUPPORTED_EXPORT` with the file and underlying error. Regex recovery was removed because it could make an unsupported or partially parsed module look valid. [Implementation evidence](../assessments/2026-09-20-native-ir-compatibility-adapter.md) and the [qualification record](../evidence/2026-09-20-native-ir-compatibility-adapter/qualification.json) retain the supported boundary and gate results.

This slice changes no public authoring API, Effect consumer requirement, external artifact ABI or native-device contract. It closes M2.3 only; M2.4 still owns the separation of validation, shorthand normalization, dependency analysis and emission.

### Compiler stage separation and deterministic emission — 2026-09-20

Approved M2.4 separates compiler concerns without changing the authoring surface or native IR schema. Own enumerable data admission is now an explicit validation boundary; compatibility scalar normalisation is isolated from IR capture; esbuild inputs are filtered, deduplicated and sorted once; class/export ownership is indexed once for diagnostic lookup; and final module emission has one deterministic serializer. Plain records use descriptor-safe own-property traversal, preserve `__proto__` as data and reject enumerable accessors before execution. Encoded export records retain their authored semantic order while style, export and dependency containers are canonicalised for stable output.

The stage contracts are independently tested alongside the existing transformer and structured compiler suites. M2.7 still owns actual Metro dependency invalidation, M2.5 owns versioned codecs, and no public API, Effect consumer requirement, external artifact ABI or native-device/Android qualification changed. [Implementation assessment](../assessments/2026-09-20-compiler-stage-separation.md) and the [qualification record](../evidence/2026-09-20-compiler-stage-separation/qualification.json) record the boundary.

### Versioned artifact readers — 2026-09-20

Approved M2.5 keeps the existing version-1 native artifact schema and adds an explicit reader registry around it. A reader probes the plain-data envelope's own `_tag` and positive integer `version`, selects a registered lossless codec, and reports `CRUMBS_CONTRACT_UNSUPPORTED_VERSION` when the reader cannot handle that wire version. Malformed envelopes continue through the canonical payload codec so descriptor-safe admission and structured issue paths remain one authority; version probes never execute accessors.

Codec laws are scoped to the admitted version-1 domain. JSON encode/decode preserves authored declaration order and values, while the reader contains no native lowering or generated-module emission. An empty reader registry provides an explicit incompatible-reader test without changing the artifact codec or public authoring API. [Implementation assessment](../assessments/2026-09-20-versioned-artifact-reader.md) and the [qualification record](../evidence/2026-09-20-versioned-artifact-reader/qualification.json) record the boundary.

### Direct native module emission — 2026-09-20

Approved M2.6 removes the intermediate vanilla-module serialisation and second data-reconstruction evaluation after the required vanilla-extract authoring evaluation. The transformer carries descriptor-safe captured named exports and virtual CSS paths directly into the existing native lowering and deterministic emission stages.

Each generated native module declares a frozen, reserved internal `__crumbsModule` descriptor:

```ts
{
  $$type: "crumbs.css.native-module",
  version: 1,
  tokens: readonly string[],
  conditions: readonly [],
}
```

`tokens` is sorted and deduplicated from theme-token references in the final lowered style table, after composition has removed dead declarations. `conditions` is deliberately empty until M6 defines condition-program semantics. Source export admission and the final emitter both reject the reserved name rather than allowing generated metadata to be overwritten. Structured styles, ordinary data, empty styles and theme descriptors retain their existing emitted meanings.

This descriptor is compiler-internal metadata, not the M2.5 artifact wire envelope or a public consumer API. It carries no source/provenance identity and does not qualify cache invalidation, condition programs, native-device behaviour or Android. [Implementation assessment](../assessments/2026-09-20-direct-native-module-emission.md) and the [qualification record](../evidence/2026-09-20-direct-native-module-emission/qualification.json) record the boundary.

### Dependency-aware Metro invalidation — 2026-09-20

Approved M2.7 records the project-authored inputs that are baked into a generated native module. Nested `*.css.ts` files, plain token modules and workspace package sources are resolved inside the workspace, content-hashed with SHA-256, and combined with platform, development, diagnostics, stylesheet and compiler context into a deterministic private identity. The generated module carries that identity as an internal marker, while the Metro cache-store adapter retains ordinary hits and returns a miss when a recorded dependency is missing or its content hash changes.

The Metro adapter additionally inspects live graph metadata before bundle requests, emits project-root-relative importer changes for stale dependency inputs, and decorates the private bundler transform result key so Metro commits a rebuilt importer whose authored source hash did not change. This is a private Metro 0.84 adapter boundary, not a public API or persistent cache format.

The cache metadata is compiler-internal and is not a native ABI or runtime Effect dependency. Focused analysis, emission, cache-store and transform tests, package typecheck and build pass. The cleared Expo/Metro gate passes on the recorded iOS development bundle with plain-token, nested `.css.ts`, workspace-source and five retained direct-edit receipts proving new baked values and absence of old values. The workspace control used a canonical disposable package copy to avoid symlinked watcher topology. [Implementation assessment](../assessments/2026-09-20-dependency-invalidation.md) and the [qualification records](../evidence/2026-09-20-dependency-invalidation/qualification.json) record the boundary and receipts. M3.1 now owns domain-safe token contracts.

### Proposed compiler context retention contract — 2026-10-05

M10.5's [cache admission/lifecycle written spec](../superpowers/specs/2026-10-05-m10-5-cache-admission-lifecycle-design.md) proposes opt-in worker-local esbuild contexts with finite ownership, current-build dependency receipts, configuration replacement, bounded admission and idle disposal. It preserves the existing transformer integration and ordinary TypeScript/React APIs; it does not adopt the experimental private Metro worker bootstrap or stop a shared esbuild service. Direct tooling sessions must await close; Metro process exit remains process-resource cleanup with no promised async disposal callback.

The [full-transform A/B](../assessments/2026-10-05-m10-5-full-transform-cache-metro-lifecycle.md) measured a 7.8% complete-transform improvement at capacity 8, higher service RSS, churn at capacity 4 and a stale-capture negative-control failure. These results justify a qualification design, not a universal bound or production cache. The written spec was approved on 2026-10-05; the [qualification plan](../superpowers/plans/2026-10-05-m10-5-cache-qualification.md) awaits review, and real incremental graph/lifecycle qualification and production admission remain separate steps. This amendment does not accept the parent ADR or change approved budgets. Android remains last.


### Compiler retention qualification findings — 2026-10-05

Approved M10.5 qualification Tasks 1–5 have now executed in private benchmark tooling and owned disposable artifacts. [Task 5 assessment](../assessments/2026-10-05-m10-5-cache-qualification.md) records 105 isolated processes / 7,805 exact full-transform pairs, exact Node v22.0.0 behaviour, unchanged-importer plain/nested/workspace edits, real idle cleanup and stock Metro restart/second-project disposal in the same main process. However, every retained configuration is about 3.5–4.1× slower than fresh, actual alias/symlink changes are stale, and package-import/restored-entry receipt comparisons differ. Two-worker shutdown fails its bounded observation and later exits naturally; development HMR fails separately. Installed-package replacement and host/device budgets remain not-run.

Do not adopt this candidate or select production bounds/defaults. Preserve fresh shipping compilation and the proposed ADR status. Attribute private guard costs next under M10.5, then separately remediate configuration/graph invalidation before admission review. The original throughput collection was invalidated due to concurrent owner-retry work; all excluded runs and all 105 isolated replacements remain archived. No production compiler/API/dependency, default, approved threshold or native guarantee changes. Android remains last.


### Compiler-reuse decision — 2026-10-18

The user authorized one bounded M10.5 architecture decision after the repeated-package attribution. **Outcome: retain shipping fresh compilation and park compiler reuse as release remediation; no implementation candidate is selected.** The [decision assessment](../assessments/2026-10-18-m10-5-compiler-reuse-decision.md) compares retained contexts, cached package text, an externally linked package capsule and evaluated-result caching. Repeated package inputs are confirmed, but their removable exclusive cost is unknown. Text reuse leaves parser/linker work; removing those bodies from the build requires a new linking/evaluation/freshness contract whose net benefit is unproven.

Historical context requalification retains slower full transforms. The later fail-closed source guard corrected a recorded restore case, so that particular historical defect is not carried forward as unresolved. Its archive verifier rejects the changed current source; read-only replay with all14 pinned historical source blobs passes. Neither replay qualifies the SDK58 compiler or supplies a new performance result. [Evidence and limits](../evidence/2026-10-18-m10-5-compiler-reuse-decision/README.md) retain both the mismatch and historical pass.

Reopening reuse requires a materially different mechanism, complete input eligibility/invalidation, request-owned authoring evaluation, canonical bindings/runtime isolation, finite ownership/concurrency and a credible complete-transform saving hypothesis before a separately approved prototype. Existing resolution hints and upstream package-info caches remain; this decision does not promise reloading already imported host JavaScript or atomic filesystem snapshots. No cache, public flag, dependency/backend, policy, source guard, accepted parent ADR or release exception is introduced. Earlier retention/code and kernel/provenance proposals remain historical or parked.

**Next M10.5: exact-artifact release disposition using the existing pinned release evidence.** Continued blocking is the default under the user's remediation-before-publication decision. Confirm exact source/tarball/report/SDK evidence availability before any actionable release review; a version-specific exception requires separate explicit authorization. This amendment is a bounded outcome record, not acceptance of the parent ADR or permission to publish. No new compiler prototype, benchmark, build, native run or registry/hosted check ran in this slice.
