# Crumbs design-system architecture roadmap

Date: 2026-09-06\
Status: proposed delivery roadmap; the first bounded M0 implementation slice started on 2026-09-14.\
Architecture: [Adopt a native design-system compiler](decisions/adopt-native-design-system-compiler.md).\
Evidence: [Current assessment and reproducible counterexamples](assessments/2026-09-06-design-system-assessment.md).

## Outcome

Make design-system decisions typed, composable, inspectable, and safe to evolve, while keeping native rendering costs predictable. Deliver this through a small native compiler/runtime core, design-system contract APIs, and optional tooling/adapters.

This roadmap covers the whole assessment session. It is a dependency-ordered delivery ledger, not permission to implement every milestone at once. Each milestone becomes a bounded implementation plan with exact interfaces, failing examples, affected files, and verification commands before execution. Record completion only with evidence; do not infer deployment or device acceptance from source changes or unit checks.

## Constraints and working rules

- Effect **4** is the internal implementation dependency family. M1 selects and verifies an exact published version; no Effect 3 substitution. Consumers retain ordinary typed Crumbs and React APIs.
- Start from the declared Expo SDK 56 / React 19.2 / React Native 0.85 baseline and `>=0.85 <0.86` peer range. Supporting another baseline requires explicit matrix evidence.
- Preserve unrelated working-tree changes. The initial assessment included uncommitted release/package/dependency changes; they are not roadmap work.
- Commit after each completed implementation slice, as requested by the user. Keep publication and deployment as separate authorized actions.
- Correctness and runtime isolation precede new public styling features. Do not solve compilation failures by silently dropping data or weakening types.
- Build-time validation and runtime ingress decoding are separate from render-time selection. No schema traversal or optic construction inside ordinary render/selection loops.
- Each behavioral slice ships matching documentation and migration notes. Proposed APIs stay outside the consumer site's shipped-API reference until implemented.
- Commit, publication, and deployment require explicit authorization. Finishing a milestone does not authorize starting the next one.
- Existing `bun run check` remains a regression gate. Device rendering, accessibility, performance, packaging, and editor evidence are separate named gates.
- On 2026-09-14 the user deferred Android SDK setup, native acceptance and Android-specific measurement until last. Continue the compiler/design-system roadmap meanwhile; Android and cross-platform qualification gates remain open until exercised.

## Delivery map

| Milestone | Outcome | Depends on | Status |
| --- | --- | --- | --- |
| M0 | Repair native semantics and isolate runtime imports | ADR review | In progress; M0.1 and M0.2 closed for documented compiler contracts; native Android acceptance deferred |
| M1 | Select Effect 4 boundary implementation and establish budgets | M0 | In progress; M1.1/M1.2 artifact/API and initial shape contracts complete; native Android remains deferred |
| M2 | Introduce and qualify native IR/compiler artifacts | M1 | Not started |
| M3 | Typed token domains, identity, aliases, scopes, and atomic updates | M2 | Not started |
| M4 | Shared resolution, compiled selection, and bounded caches | M2, M3 | Not started |
| M5 | Native Sprinkles and composition API completeness | M2, M3, M4 | Not started |
| M6 | Native conditions and functional style programs | M3, M4, M5 | Not started |
| M7 | Typed component slots, states, and extension contracts | M5, M6 | Not started |
| M8 | Distributed package/artifact compatibility | M2, M3, M7 | Not started |
| M9 | Manifests, change impact, policy, migrations, and DTCG | M7, M8 | Not started |
| M10 | Qualify a reference design system and enterprise journeys | M8, M9 | Not started |
| M11 | Evaluate optional extensions against concrete consumer needs | M10 | Deferred |

Reference examples should grow with each milestone. M10 qualifies their combined behavior; it is not the first time earlier features receive consumer or device tests. M8 extends the initial packed-consumer/import checks with a complete distribution contract.

## M0 — Establish native correctness and runtime isolation

**Decisions:** D1, D2, D6, D11, D12.\
**Scope:** repair and specify the existing public subset. Do not add Sprinkles, broaden peer ranges, or install Effect in this milestone.

**Affected files:** `packages/css/src/native-style.ts`, `theme-runtime.ts`, `theme-token.ts`, `css-to-rn.ts`, `transformer.ts`, `parse-virtual-css.ts`, `tsdown.config.ts`; matching `test/` files, `fixtures/`, `COMPATIBILITY.md`, and current `apps/storybook/src/components/` fixtures.

- [x] M0.1: Add durable regressions for assessment E1–E7. Each regression fails for the demonstrated behavior before its fix; validate errors and output values, not only generated-code substrings.
- [x] M0.2: Repair native composition typing and conflict order. Cover multiple bases, nested compositions, token/literal conflicts, and shorthand/longhand precedence. Use a separately implemented reference evaluator.
- [x] M0.3: Stop classifying structured styles as variant maps. Preserve transform arrays and scalar siblings through resolution. Preserve primitive-specific result types.
- [x] M0.4: Define the structured-value compatibility boundary. Preserve supported `transform` and `shadowOffset` inputs end to end using explicit metadata/native handling. If a typed property family cannot yet be preserved, narrow its accepted subset and emit a specific diagnostic with migration guidance; never leave accepted-but-dropped behavior.
- [x] M0.5: Apply identical property checks to token and literal declarations, retain declaration order, validate token reference shape, and preserve ordinary non-style exports or reject them explicitly under a documented export contract.
- [x] M0.6: Prevent cross-contract registry corruption. Introduce a documented ownership/identity rule that can migrate to M3; fail on ambiguous legacy collisions rather than silently rebinding a token.
- [x] M0.7: Move runtime tags/data helpers away from authoring/compiler modules and correct build chunking. Check ESM, CommonJS, and a packed Metro consumer. Runtime loading must not reach Node built-ins, esbuild, integration, or CSS conversion code.
- [x] M0.8: Replace stale `apps/native` test/benchmark dependencies with durable current fixtures. Required fixture absence must fail; optional capability absence must be explicitly reported. Update compatibility documentation to match actual coverage.
- [ ] M0.9: Establish early userland feedback using the internal Storybook plus an Expo playground. Workspace mode consumes public `dist` exports with continuous rebuilding; transformer/plugin changes trigger a controlled Metro restart. Add isolated packed-tarball and published-version consumer modes outside workspace resolution, record exact package versions/source mode, and exercise lists, forms, scopes, and portals. Keep this setup minimal and retain the supported SDK baseline.

**Exit:** E1–E7 have verified fixes or explicitly documented, type-aligned hard rejections; package build/typecheck/tests pass; the packed consumer bundles through Metro; runtime graph assertions pass; no new public feature is introduced to mask a defect. Record every intentional alpha behavior change for release review.

## M1 — Establish Effect 4 contracts and honest measurement

**Decisions:** D3, D4, D6, D12.\
**Affected paths:** `packages/css/package.json`, `bun.lock`, new `packages/css/src/contracts/`, `bench/`, consumer fixtures, `test/perf-harness.test.ts`, and `.github/workflows/ci.yml`.

- [x] M1.1: Select one exact published Effect 4 version, verify its Schema/Codec/Optic APIs, and record it with import paths and package metadata. Add it as an internal dependency; do not leak Effect execution requirements through public authoring/hooks.
- [x] M1.2: Define initial schemas for tagged native declarations/references, contract identity, structured diagnostics, and an explicit artifact version. Specify unknown-field and finite-number handling. Add encode/decode tests at these boundaries.
- [ ] M1.3: Audit the dependency graph and initialization footprint for compiler, ordinary runtime, and external-theme decoding entrypoints separately. Test both module formats using the exact installed Effect version.
- [x] M1.3a: Qualify current compiler/ordinary-runtime emitted graphs and host initialization, plus a private bundled initial-contract candidate, on exact Node 22.0.0 and current Node in both formats. Enforce tooling bundling and ordinary-runtime Effect denial.
- [ ] M1.3b: Qualify the actual external-theme decoding entrypoint once it exists, including both formats, oldest supported tooling/runtime caller and its own initialization/bundle budget. No public decoder currently exists; the internal artifact candidate is not equivalent evidence.
- [x] M1.4: Correct benchmark labels: batch-average quantiles are not operation-latency quantiles. Make raw and recipe baselines perform equivalent selection/default/compound work. Separate cold transforms from warm transforms and cached/uncached runtime paths.
- [ ] M1.5: Add baseline workloads for static/themed list mount and scroll, repeated recipe selections, theme and scope changes, orientation/font-scale changes, and retained memory after repeated mount/unmount.
- [x] M1.5a: Add repeatable Expo static/themed list mount/rerender/theme-switch/unmount sequences, with run identity, actual lifecycle counts and style-reference observations. Web functional receipts and JavaScript consumer qualification do not close native/device gates.
- [x] M1.5b: Add repeatable recipe-selection and nested-scope switch workloads with the same explicit run/observation protocol. Scrolling, orientation/font scaling and retained-memory qualification remain further M1.5 work.
- [x] M1.5c: Add repeatable static/themed list scrolling with actual offset/geometry/viewable-row callbacks and terminal completion/cancellation/deadline reports. Development web functional evidence remains separate from native frame/device qualification.
- [x] M1.5d: Add orientation/font-scale context-change workloads with actual React Native dimensions/font-scale observations and hook reference behavior.
- [x] M1.5e: Establish retained-memory measurement protocol/workload with explicit GC/runtime/device provenance and leak-admission rules; balanced lifecycle counts alone are not leak proof.
- [ ] M1.6: Establish a release-mode Hermes measurement run on at least one Android and one iOS device. Record device/OS, Expo/RN/Hermes versions, build mode, thermal conditions, scenario size, warmup, sample count, and artifact identity. Missing device access leaves this gate incomplete.
- [ ] M1.7: Add editor/typechecker fixtures at 100, 1,000, and 10,000 tokens, including slot recipes and conditions. Record checking time, type-instantiation/memory statistics where supported, and completion latency on a reproducible editor/TypeScript setup.
- [x] M1.7a: Add reproducible 100/1,000/10,000-token fixtures for current token/theme/recipe APIs and record fresh-process tsc, tsgo and language-service baselines. Keep conditions and slot recipes explicitly unsupported until those APIs exist.
- [ ] M1.8: Commit a machine-readable budget file and measurement protocol before optimization work. Include absolute ceilings and baseline comparisons for JS/UI frames, allocations, retained memory, runtime bytes/initialization, cold/warm transform cost, incremental rebuild, and editor cost. Choose thresholds from the measured baseline and noise; reviewers approve the recorded values, not an invented universal timing target.
- [x] M1.8a: Define the versioned fail-closed registry, closed evidence selectors, baseline-drift validation, activation-readiness semantics, and reviewer approval protocol. Keep all thresholds pending and performance qualification explicitly not run.
- [x] M1.8b: Adapt recorded host/editor evidence into comparable sample series, current baseline comparisons and a threshold review packet. Enforce environment/scenario compatibility and keep candidates unapproved.
- [x] M1.8c: Split and remeasure runtime initialization, approve the fifteen recorded host/editor thresholds metric by metric, and retain missing or diagnostic domains as explicit blockers.
- [x] M1.8d: Record a reproducible Expo/Metro direct `.css.ts` edit baseline and candidate threshold with exact output/restoration receipts. Retain dependency-only invalidation as a failing diagnostic rather than admitting stale output.
- [x] M1.8e: Record reviewer approval of the direct `.css.ts` Metro threshold and re-evaluate the retained exact-environment comparison without activating the incomplete registry.
- [x] M1.9: Extend the Expo playground with version/source identification and repeatable measurement scenarios. Install SDK-compatible dependencies with a committed lockfile; test the newest SDK in a separate upgrade configuration before broadening support. Published mode resolves npm tags to exact versions, while packed mode qualifies unreleased artifacts without publishing.
- [x] M1.9a: Audit workspace, packed and published isolation against current evidence; lock the supported Expo 56 contract; and add a fail-closed, non-workspace Expo 57 candidate that verifies live registry/template identity and preserves the React Native peer boundary.

**Exit:** Effect 4 boundaries are verified and isolated; budget metrics all name a scenario and execution environment; at least five independent repetitions per device scenario establish a noise envelope; remaining device/editor blockers are reported as incomplete. No performance claim may be based only on the historical Bun numbers.

## M2 — Introduce the native IR and compiler artifact contract

**Decisions:** D1–D3, D8, D11.\
**Affected paths:** new `packages/css/src/compiler/` and artifact contract modules; `native-style.ts`, `transformer.ts`, `css-to-rn.ts`, `parse-virtual-css.ts`, new `test/compiler/` and `test/oracles/` fixtures.

- [x] M2.1: Specify tagged IR nodes and semantic equality for native declarations, ordered composition, style maps, recipes, token references, and export metadata. Define primitive kind and source/property provenance.
- [x] M2.1a: Accept the internal native IR v1 semantic contract and independent executable laws without adding production nodes or treating the M1.2 prototype envelope as the artifact ABI.
- [ ] M2.2: Introduce native capture before CSS serialization. Migrate one exact property family per reviewable slice, with independent differential tests against reference native evaluation. Preserve the qualified legacy subset throughout.
- [x] M2.2a: Introduce immutable production IR admission for `opacity`, retaining primitive domain, package-relative source/property provenance, literal/token identity and authored order through StyleSheet and plain-object emission. Keep unmarked vanilla-extract and every unmigrated property on the legacy path; malformed Crumbs opacity fails without fallback.
- [x] M2.2b: Generalize production numeric blocks and migrate `zIndex`, `elevation`, `flexGrow` and `flexShrink`, preserving the installed React Native primitive domains, finite-number/token values, provenance and authored last-winner order through both emitters.
- [x] M2.2c: Migrate scalar React Native `flex` through production numeric IR without CSS shorthand expansion, retaining independent `flexGrow`, `flexShrink` and legacy `flexBasis` fields.
- [x] M2.2d: Generalize production scalar IR beyond numeric-only values and migrate `flexBasis` with finite point numbers, `auto`, finite percentages and legacy tokens across all FlexStyle primitives.
- [x] M2.2e: Migrate the six width/height/min/max `DimensionValue` properties through production scalar IR with exact static value domains, primitive coverage and per-property last-winner order.
- [x] M2.2f: Migrate exact physical and logical position-edge longhands through production scalar IR, retaining independent field identity before inset-alias expansion.
- [x] M2.2g: Migrate the seven Crumbs inset aliases into canonical position-edge declarations, retaining authored alias provenance and ordered alias/longhand precedence without layout-direction inference.
- [x] M2.2h: Migrate `gap`, `rowGap` and `columnGap` through production scalar IR, expanding broad gap into canonical axes with validated provenance and ordered broad/axis precedence.
- [x] M2.2i: Migrate physical padding longhands plus broad and horizontal/vertical aliases through scalar IR with canonical broad/pair/side precedence.
- [x] M2.2j: Migrate logical padding fields and inline/block aliases through scalar IR while retaining native start/end independently from physical sides.
- [x] M2.2k: Migrate physical margin longhands plus broad and horizontal/vertical aliases through scalar IR with negative DimensionValue support.
- [x] M2.2l: Migrate logical margin fields and inline/block aliases through scalar IR without collapsing native start/end into physical sides.
- [x] M2.2m: Migrate physical border-width longhands and broad `borderWidth` expansion with finite numeric/token admission.
- [x] M2.2n: Migrate exact logical `borderStartWidth` and `borderEndWidth` fields independently from physical sides.
- [x] M2.2o: Introduce a property-specific color scalar domain and migrate broad plus physical border colors.
- [x] M2.2p: Migrate exact logical `borderStartColor` and `borderEndColor` fields independently from physical colors.
- [x] M2.2q: Migrate broad and physical border radii with finite numeric/token admission and canonical corner precedence.
- [x] M2.2r: Migrate the four exact logical corner radii through scalar IR while keeping them independent from physical corners.
- [x] M2.2s: Migrate the four exact semi-logical top/bottom start/end corner radii through scalar IR without collapsing corner naming systems.
- [x] M2.2t: Migrate `backgroundColor` through the colour scalar domain with exact view, text and image primitive coverage.
- [x] M2.2u: Migrate text-only `color` through scalar IR and derive decoded primitive admission from the shared per-property contract.
- [x] M2.2v: Migrate image-only `tintColor` through the colour scalar domain and hardened primitive decoder contract.
- [x] M2.2w: Migrate image-only `overlayColor` through the colour scalar domain and hardened primitive decoder contract.
- [x] M2.2x: Migrate inherited `shadowColor` through the colour scalar domain across view, text and image.
- [x] M2.2y: Migrate inherited `shadowOpacity` and `shadowRadius` through finite numeric/token scalar IR across view, text and image.
- [x] M2.2z: Migrate text-only `textShadowColor` and `textShadowRadius` through property-specific scalar domains while retaining structured offset ownership.
- [ ] M2.3: Route the supported vanilla-extract compatibility adapter into the same IR. Unsupported syntax must fail with context; do not silently recover via regex parsing or partially reconstructed payloads.
- [ ] M2.4: Separate validation, shorthand normalization, dependency analysis, and code emission. Index export/class ownership once for diagnostic lookup. Define deterministic serialization ordering and own-property handling for record keys.
- [ ] M2.5: Version encoded artifacts and test compatible/incompatible readers. Distinguish codecs from lossy lowering/code generation; test codec laws only for their defined domain.
- [ ] M2.6: Emit direct native modules and minimal token/condition metadata. Confirm structured values, ordinary exports, empty styles, and theme descriptors retain their specified meaning.
- [ ] M2.7: Verify real dependency changes rebuild baked importer values. Include nested `.css.ts` imports, plain token modules, monorepo dependencies, target/config changes, and compiler updates before adding persistent caching.

**Exit:** native input no longer depends on the CSS round-trip for supported semantics; independent preservation and ordering properties pass; malformed artifacts fail deterministically; cold/warm compiler and emitted-size budgets pass; actual Metro invalidation is demonstrated.

## M3 — Make tokens and themes domain-safe and scoped

**Decisions:** D3–D5, D8.\
**Affected paths:** new `packages/css/src/tokens/`, `native-style.ts`, `theme-token.ts`, `theme-runtime.ts`, theme contract type/property tests, `examples/theme.ts`, and Storybook theme providers.

- [ ] M3.1: Define colour, length, duration, opacity, and property-enum domains; generate or reconcile runtime schemas and static authoring types. Verify both positive native cases and rejected colour-to-spacing/enum mismatches.
- [ ] M3.2: Implement stable contract/package identity, a contract-bound provider/hook interface, and deterministic public token IDs. Test duplicate package copies, evaluation order, hot reload, and identical paths across distinct contracts.
- [ ] M3.3: Add foundation → semantic → component aliases with missing-target/domain/cycle diagnostics and traceable origin. Required tokens stay required; optional fallbacks are explicit.
- [ ] M3.4: Add independent brand/mode/density contexts with documented merge and override precedence. Resolve only complete valid snapshots; define behavior for nested scopes and portal ownership.
- [ ] M3.5: Add immutable theme patches and external-theme decoding. Update canonical values and derived token/index data atomically. Invalid patches leave the current snapshot untouched and return structured context.
- [ ] M3.6: Use reusable Optic focuses for useful nested transformations. Validate domain-changing results; test semantic lens laws, old-snapshot preservation, and promised structural sharing separately.
- [ ] M3.7: Add migration notes for legacy unscoped tokens and the permissive `string | number` contract. Preserve a bounded compatibility path without allowing old tokens to bind silently to unrelated contracts.

**Exit:** cross-contract isolation and domain correctness hold in types and runtime; external data is decoded once at ingress; scope/portal scenarios are tested; values and token maps never diverge; property suites cover valid aliases and adversarial mutations.

## M4 — Optimize resolution and selection under explicit bounds

**Decisions:** D6, D8.\
**Affected paths:** new focused `packages/css/src/runtime/` modules behind `theme-runtime.ts`; theme/recipe/cache tests, benchmark scenarios, runtime guarantees documentation.

- [ ] M4.1: Share resolved outputs across consumers of the same immutable module/theme snapshot using weak ownership. Retain the original reference for static styles and structurally share unaffected outputs.
- [ ] M4.2: Use compiler-emitted dependency plans for token resolution. Record both recomputation and notification counts; resolving only affected data does not prove unrelated components avoided rendering.
- [ ] M4.3: Precompute recipe order/defaults/compound matchers and canonical selection keys. Make cache bounds, eviction, and resolver lifetime explicit; exercise workloads that exceed the bound.
- [ ] M4.4: Add selective subscriptions with consistent snapshots and tests for concurrent rendering, provider updates, nested scopes, unmount, and hot reload. No consumer may observe a mixture of old values and new derived tokens.
- [ ] M4.5: Compare cached and uncached evaluators on generated inputs. Test identity promises, invalidation completeness, zero eager Cartesian expansion, and no stale results after scope or artifact replacement.
- [ ] M4.6: Run M1 device/bundle/editor budgets and retained-memory scenarios. Record improvements and regressions against equivalent native workloads; do not introduce native engine dependencies without a separate decision.

**Exit:** semantic equivalence, identity, notification, and cache-bound tests pass; release-mode device evidence meets committed budgets; runtime work excludes schema traversal and repeated compilation.

## M5 — Add native Sprinkles and repair API coverage

**Decisions:** D2, D7.\
**Affected paths:** new `packages/css/src/sprinkles/`, public exports/build configuration, `native-style.ts`, utility type/property/compiler tests, examples and API docs.

- [ ] M5.1: Define the public native `defineProperties` / `createSprinkles` adaptation with finite values, domain-safe token scales, native primitive kinds, and typed shorthands. Publish precedence examples for overlapping aliases and longhands.
- [ ] M5.2: Support utilities in style composition and recipe bases/branches without losing kind or contract information. Add the mapped `styleVariants(values, mapper)` overload.
- [ ] M5.3: Support static selections in authored modules and dynamic runtime selection through generated lookup plans; public names/types must accurately distinguish these phases.
- [ ] M5.4: Compare atomic, fused, and hybrid output on identical design-system fixtures. Measure bytes, startup, array lengths, selection allocations, and native frames. Choose the default from evidence and document it.
- [ ] M5.5: Test deterministic output, token-only policy compatibility, invalid properties/scales, identity on repeated selections, and compiler/runtime equivalence.

**Exit:** utilities compose with styles and recipes under one documented native contract; type fixtures reject cross-domain values; chosen output passes budgets and is supported by a readable comparison report.

## M6 — Add explicit conditions and functional style programs

**Decisions:** D5, D7, D8, D12.\
**Affected paths:** new `packages/css/src/conditions/` and expression modules; compiler/runtime dependency plans, conditional type/property tests, Storybook adaptive scenarios.

- [ ] M6.1: Define native platform, dimension-bucket, RTL, font-scale, and accessibility conditions with default/overlap precedence. Register and clean up subscriptions predictably; avoid using unbounded raw dimensions as cache keys.
- [ ] M6.2: Add conditional value normalization and mapping helpers, optional responsive tuple syntax if it preserves readable types, and the associated conditional-value types. Ensure equivalent input forms normalize identically.
- [ ] M6.3: Define supported expression nodes for aliases, typed scalar operations, optional fallbacks, composition, and exhaustive matching. Specify units/domains, missing inputs, and dependency sets before implementation.
- [ ] M6.4: Constant-fold static expressions and recompute dynamic programs only for declared dependency changes. Opaque arbitrary closures are not accepted as portable serialized programs.
- [ ] M6.5: Test normalization idempotence, deterministic evaluation, supported algebraic laws, precise invalidation, and resize/font-scale/RTL behavior on native consumers.

**Exit:** conditions and expressions have explicit finite semantics and lifecycle rules; every operator has type, property, and reference-evaluation coverage; runtime and editor budgets pass. Container-measurement and continuous motion work remain M11 items.

## M7 — Define component styling contracts

**Decisions:** D9, D10, D12.\
**Affected paths:** new `packages/css/src/components/` contract modules; recipe schemas/types/compiler emitters; Storybook button/input/dialog examples; extension and migration fixtures.

- [ ] M7.1: Add typed slots with one shared variant selection and view/text/image-specific outputs. Preserve existing single-style recipe use through an explicit migration-compatible interface.
- [ ] M7.2: Add exhaustive discriminated state recipes and prohibited-combination checking. Normalize defaults consistently; avoid generating all possible state products eagerly.
- [ ] M7.3: Declare public/private tokens, slots, variants, and extension points. Specify the complete ordering of inherited defaults, local variants, states, compounds, and permitted consumer overrides before freezing the public API.
- [ ] M7.4: Demonstrate product-team extension without copying component implementation. Verify a private implementation change leaves the public contract intact; a removed public slot/variant is detectable.
- [ ] M7.5: Connect reference component visual and accessibility state to the same owner while keeping behavior-library integration separate from style evaluation.

**Exit:** slot kinds and allowed selections are enforced; extension behavior has executable conflict examples; public/private contracts are serializable into the manifest; the initial reference components use only public APIs.

## M8 — Qualify distributed packages and artifact evolution

**Decisions:** D3, D5, D11.\
**Affected paths:** package exports/build settings, `test/pack-consumer-contract.test.ts`, new independent token/component/app fixtures, Metro integration fixtures, CI and release documentation/workflows.

- [ ] M8.1: Package tokens and components separately, consume only packed artifacts from an independent Expo application, and verify no unpublished source-tree requirement.
- [ ] M8.2: Publish compiler/artifact/runtime compatibility rules and test supported version combinations, unsupported versions, duplicate package copies, provider identity, and lazy-loaded modules.
- [ ] M8.3: Audit ESM/CommonJS/Metro resolution and tree shaking, including the dedicated decoding entrypoint. No runtime path may accidentally load compiler-only dependencies.
- [ ] M8.4: Exercise actual hot reload and dependency invalidation for shared packages and configuration changes. Cache tests must verify output values after edits, not just dependency-import text.
- [ ] M8.5: Reconcile the documented publication policy with `.github/workflows/release-please.yml` and `publish.yml` under a separately confirmed policy. Record release compatibility and deprecation obligations; do not publish as part of the milestone.
- [ ] M8.6: Gate declared Expo/RN versions in CI. Restore full consumer checks for app changes, use reproducible installs, and make missing required platform fixtures visible failures.

**Exit:** three independently packaged layers work in the declared matrix; artifact migrations and mismatch errors are tested; package graphs and invalidation are verified; release automation/docs agree with the explicitly selected policy.

## M9 — Add manifest, policy, impact, and token interoperability tooling

**Decisions:** D5, D9, D10, D11.\
**Affected paths:** new tooling/manifest/policy/adapter modules and entrypoints; diagnostic codes; CLI, manifest-diff, codemod, and DTCG fixtures; team documentation.

- [ ] M9.1: Emit deterministic versioned manifests for identities, public contracts, aliases/dependencies, source origins, capabilities, defaults, and deprecation/replacement metadata.
- [ ] M9.2: Provide local checking and release-comparison tooling. Detect token/slot/variant removal, domain changes, changed defaults, and forbidden private dependencies; report affected statically known consumers and analysis limits.
- [ ] M9.3: Add development-only style explanations for resolved values, matching conditions, override winners, dependencies, and recomputation causes. Exclude detailed provenance from production output unless deliberately requested.
- [ ] M9.4: Add versioned policy presets and incremental adoption. Cover semantic tokens, literals, private surfaces, capabilities, deprecations, and output budgets. Escape hatches carry a reason and optional expiry and remain visible in reports.
- [ ] M9.5: Add replacement metadata and codemods for a token rename and recipe/slot migration. Unsupported or ambiguous edits must be reported without corrupting source; verify dry-run, repeat execution, and changed-file boundaries.
- [ ] M9.6: Implement a DTCG 2025.10 format/resolver adapter with a documented native subset. Validate aliases/cycles/domains/context precedence, preserve supported metadata, and reject unmappable token types with origin context.
- [ ] M9.7: Support ownership metadata in local reports. Optional editor/design-tool adapters consume manifests and schemas; neither hosted accounts nor external telemetry is required.

**Exit:** release-impact fixtures identify expected consumers; reports distinguish proven breaks from potential visual impact; migrations preserve valid usage; DTCG support/limitations are explicit; tooling stays outside ordinary runtime bundles.

## M10 — Qualify the reference design system and North Star journeys

**Decisions:** D9–D12.\
**Affected paths:** `apps/storybook/`, independent packed-consumer fixtures, consumer documentation, native acceptance/benchmark artifacts, CI checks.

- [ ] M10.1: Complete public-API examples for typography, button, input, selection controls, card, and dialog integration, with brands, modes, density, scopes, states, and typed slots.
- [ ] M10.2: Generate useful contract-driven stories and review cases. Combine representative cross-axis coverage with exhaustive tests for critical states; report unreachable or intentionally untested combinations.
- [ ] M10.3: Verify font scaling, RTL/logical layout, reduced motion, and supported contrast contexts on native consumers. Declared colour-pair analysis reports unknown compositing/background cases; screen-reader and interaction acceptance stays explicit.
- [ ] M10.4: Run the three North Star journeys below from packed public packages and retain results, artifact versions, screenshots/recordings where useful, diagnostics, and performance reports.
- [ ] M10.5: Run the full compatibility, property, type/editor, package, docs, visual, and device budgets. Publish a guarantees matrix that distinguishes supported, measured, and unsupported behavior.

**Journey A — Distribute a component package:** a token package and a component package are packed and consumed by an independent Expo app. Public styles work without source-only dependencies; runtime imports are isolated; supported versions and scopes resolve correctly.

**Journey B — Change a shared token safely:** change a semantic token/alias and separately remove a public token. The first produces an accurate impact report and correct selective updates; the second produces an actionable compatibility diagnostic and verified migration. The previous theme snapshot remains coherent throughout.

**Journey C — Add a second brand:** supply another validated brand contract implementation without copying component implementations. Existing variant/slot types remain valid; scoped/portal behavior, accessible states, and performance budgets continue to pass.

**Exit:** all three journeys have direct evidence on the declared matrix; unresolved checks are shown as incomplete; no "gold standard", zero-runtime, or accessibility-compliance claim exceeds the measured guarantees.

## M11 — Evaluate optional extensions

These ideas remain captured without expanding the initial core. Each requires a specific consumer scenario, a bounded API design, semantic/type tests, and measured cost before adoption.

- [ ] Native equivalents for standalone `createVar`, `fallbackVar`, `assignVars`, and dynamic local assignment, extending M3's explicit scope/domain model. M3 already owns required-token and optional-fallback semantics; this item adds convenience/public surface.
- [ ] Container conditions using explicit layout ownership, measurement timing, subscription cleanup, and resize-loop tests.
- [ ] Motion adapters using a supported native animation system. Continuous updates run through that system rather than React theme resolution; reduced-motion behavior and cancellation are tested.
- [ ] Additional token algebra operators, including typed colour/typography derivations, only with defined native representations and errors.
- [ ] A constrained function-serialization/extension protocol for library authors, with explicit portable arguments and runtime imports. Do not expose arbitrary closure serialization.
- [ ] Design-tool/editor adapters and a distinct web backend if validated consumer demand warrants them. Browser globals, cascade, font-face, layers, and view transitions do not become implicit native-core promises.

## Property-based testing strategy

Use `fast-check` as the existing runner. Schema-derived valid data is useful, but it is only one generator source. Build small domain generators and deliberate invalid mutations, and maintain an independent semantic reference evaluator.

| Family | Required property/counterexample class | First owner |
| --- | --- | --- |
| Native preservation | Arrays/objects/scalars retain meaning; ordered transforms and scalar siblings survive | M0, M2 |
| Composition | Independent native evaluation agrees for conflicts, shorthands, longhands, and token/literal order | M0, M2, M5 |
| Export and payload shape | Styles, recipes, maps, ordinary values, and malformed tags cannot be confused | M0, M2 |
| Contract isolation | Creating/reloading another contract cannot mutate identity/metadata or change resolution | M0, M3 |
| Domains and aliases | Valid aliases resolve; wrong domains, missing targets, cycles, non-finite numbers, and wrong contracts fail predictably | M3 |
| Codec laws | Decode-after-encode preserves the specified IR domain; encode-after-decode yields specified canonical data | M1, M2 |
| Recipes and slots | Defaults, normalized selections, definition order, compounds, states, and extension precedence agree with an independent model | M4, M7 |
| Caching | Cached/uncached results agree; relevant changes invalidate; unrelated changes share outputs; bounds hold under churn | M4 |
| Optic/theme updates | Total-lens laws, invalid update rejection, coherent derived tokens, and old-snapshot preservation | M3 |
| Functional programs | Normalization idempotence, deterministic evaluation, constant-folding equivalence, declared dependency precision | M6 |
| Manifests and migrations | Deterministic impact output, stable identities, valid codec migrations, codemod repeat safety | M8, M9 |

Do not assert commutativity of styles. Define the equality and domain for each law; structural equality and reference identity are separate assertions. Never use the production normalization or cache implementation as the only expected-result oracle.

Use fixed seeds and named regressions for fast PR reproducibility plus varied seeds in an extended CI job. Always retain seed, shrink path, and minimized counterexample on failure. Promote discovered failures into permanent ordinary regression cases. Increase generator diversity before treating a larger iteration count as stronger coverage.

## API coverage ledger

| Surface identified in the assessment | Delivery decision |
| --- | --- |
| `style`, primitive helpers, array composition | Correct existing contracts in M0; migrate to native IR in M2 |
| `styleVariants` mapper overload | M5 |
| Theme contracts and explicit themes | Strengthen identity, domains, scopes, aliases, and updates in M3 |
| `createTheme` convenience overloads | Evaluate during M3 API design; convenience must not weaken explicit contract identity |
| Recipes, inferred props, defaults, compounds | Preserve and normalize in M0/M4; extend with slots/states/public contracts in M7 |
| `defineProperties`, `createSprinkles`, property metadata | M5 |
| Conditional mapping/normalization and conditional types | M6 |
| Standalone vars, fallback/assignment convenience, dynamic overrides | Underlying semantics M3; expanded public surface M11 |
| CSS utility arithmetic | Typed native expression subset in M6; broader operators M11 |
| Function serialization | Constrained library extension protocol M11 |
| Container queries and layers | Explicit native container conditions M11; override precedence belongs to M5/M7, not a CSS cascade |
| Keyframes, font-face, globals, selectors, view transitions | Native-core non-goals; motion/font/behavior integrations use platform APIs |

## Completion and evidence protocol

For each completed item, append the date, commit/working-tree identity, tested package/dependency versions, commands, result artifacts, and remaining limits. Keep passing unit tests, device acceptance, and publication as distinct statuses.

Current commands, run from the repository root as applicable:

```sh
bun run check
bun run app:typecheck
bun run docs:build
bun run --cwd packages/css bench:native-styles
bun run release:check
```

`release:check` builds, validates, benchmarks, and checks the package; it does not constitute publishing authorization or native acceptance. New milestone-specific commands must be added with their fixtures before their gates can pass. Run focused tests during development, then the relevant full gates once the slice is ready.

## Execution log

### 2026-09-14 — M0 token property validation and declaration order

The user requested moving forward with the upgrade plan. The first bounded slice addresses assessment E5 and part of M0.5; it does not complete M0.1 or M0.5 in full.

- Branch: `codex/m0-token-declarations`; changes based on `64f9934`, preserving earlier unrelated release-version edits. The user subsequently requested a commit after each completed slice.
- Plan: [M0 token declarations](superpowers/plans/2026-09-14-m0-token-declarations.md).
- Baseline: `bun run check` passed with 117 tests and 5,030 assertions.
- Red evidence: the two focused declaration suites failed five new cases for token/literal ordering and unsupported token properties; the reverse ordering case already behaved correctly.
- Green evidence: the same focused suites passed all 28 tests after using a single ordered accumulator and checking token property names against the native support list. Two property suites generated mixed declarations and unknown properties with fixed reproducible seeds.
- Full qualification: `bun run check` passed build/typechecking and 123 tests with 5,238 assertions; `bun run docs:build` built 20 pages; the package benchmark passed its existing local Bun budgets after build completion. An initial benchmark overlapped the clean build and failed on temporarily absent `dist` files; the sequential rerun passed. `git diff --check` passed. These are package/local checks, not device acceptance.
- Remaining limits: token shorthand/longhand normalization, semantic token domains, malformed-reference admission, composition, structured native values, identity, and runtime import isolation are not repaired by this slice. No Expo playground or device acceptance is claimed.

### 2026-09-14 — M0.9 Expo consumer feedback setup

Approved bounded implementation: [Expo playground plan](superpowers/plans/2026-09-14-expo-playground.md). The app complements Storybook with a 1,000-row list, editable form, nested scopes and an explicitly theme-bridged portal. It uses public package exports on the existing Expo 56 baseline.

- Workspace mode builds public `dist`, watches Crumbs source and restarts Metro after output changes. A content-preserving source touch caused rebuilding/restarting; the Metro status endpoint responded; SIGTERM stopped both Metro and the watcher.
- Packed mode installed the working-tree `0.1.2-alpha.2` tarball outside workspace resolution. Published `alpha` resolved to exact `0.1.2-alpha.1` and installed outside the workspace. Both modes verify actual package metadata and canonical entry paths, retain an isolated npm lockfile and record consumer identity. Mode/version/revision are displayed in the app.
- Workspace, packed and published-alpha consumers each passed TypeScript checking and production iOS, Android and web exports. Published `latest` resolved to `0.1.0-alpha.1` and correctly failed npm installation because its React Native peer range is `>=0.83 <0.84`; no override or workspace fallback was applied.
- Package build/typecheck passed; the final full suite passed 127 tests / 5,255 assertions, including staging-isolation, metadata-mismatch and escaped-link checks. Docs built 20 pages and `git diff --check` passed. The completed slice is committed separately from the token fix and shared React dependency baseline.
- Local npm cache permissions and sandbox network restrictions were prerequisite issues, resolved with temporary caches and authorized network execution. Temporary-path aliases on macOS are canonicalized before verifying package isolation.
- Remaining qualification: native/device rendering, keyboard and accessibility behavior, frame/startup/editor budgets and real user feedback. M0.9 remains unchecked until the journeys are exercised on native targets. This setup does not repair other M0 correctness or runtime-import findings, complete M1.9 measurement work, or broaden compatibility support.

The next bounded candidate is native playground journey acceptance, followed by native composition precedence/type repair. M1 and wider API work remain gated on M0.

### 2026-09-14 — Partial iOS simulator acceptance

[Acceptance evidence](acceptance/2026-09-14-ios/README.md) records the workspace `0.1.2-alpha.2` consumer at `732ff76 (working tree)` in official Expo Go 56.0.4 on a dedicated iPhone 17 / iOS 26.5 simulator. Startup identity, light/dark list rendering, form text and switch state across a theme change, software-keyboard visibility, distinct nested scopes and explicitly bridged portal opening/closing passed direct native observation. Seven raw screenshots and a structured result with hashes are retained.

Native list gestures remain unverified: the attempted automation gestures did not change visible rows, and the cause was not established. Android acceptance could not run because the configured Android SDK/emulator tools were absent. M0.9 remains unchecked. Physical-device rendering, release frame/startup performance and screen-reader journeys remain separate gates. The unrelated release-version edits are preserved.

Next recommended slice: establish a reliable native gesture acceptance path for the list and resolve any demonstrated scrolling defect. Android toolchain setup follows as a separate prerequisite for Android acceptance. Wider compiler/API milestones remain gated on M0.

### 2026-09-14 — Native scroll input delivery diagnosis

[Native input evidence](acceptance/2026-09-14-scroll/README.md) records a development-only opt-in FlatList probe. Coordinate taps changed the theme correctly, but two automated drags (including an explicitly raised Simulator window) delivered touch starts/ends without move callbacks, native drag starts, offset changes or visible-row advancement. Reported content height exceeded the viewport height. No layout/compiler defect was demonstrated, so neither was changed.

The probe is off by default and guarded out of production UI. It supplies stable test IDs and an acceptance contract for real swipes, theme position preservation and reverse movement. Native swipe acceptance remains pending the explicit Maestro/XCTest runner choice required by the computer-use tool instructions; M0.9 remains unchecked. No new package dependency was added.

### 2026-09-14 — Maestro native scroll acceptance

The user selected Maestro. The [completed native scroll evidence](acceptance/2026-09-14-maestro/README.md) records Maestro 2.10.0 / Java 17.0.20.1 on the dedicated iPhone 17 / iOS 26.5 simulator in Expo Go 56.0.4. Reusable flows perform actual native swipes and admit probe measurements before asserting scrolling, exact theme position preservation and reverse movement. Maestro remains an external development tool.

- The negative control completed startup with offset 0, row 1 and zero drags, then failed the deliberately unsatisfied scrolling assertion.
- Two fresh-launch positive runs passed. Forward swipes reached row 5 at offsets 259 and 261 respectively; each theme change preserved that exact offset and row. Reverse swipes returned to row 1 at offsets 8 and 14, with a second native drag. Six raw screenshots, JUnit reports and hashed structured measurements are retained.
- No app scrolling defect was demonstrated or repaired. A Maestro initialization hang was traced to Android fallback discovery probing an unrelated local IPv4 service; a process-local Java IPv6 preference avoided the collision without changing that service.
- The decoder's red admission cases failed before implementation; green package qualification passed build/typechecking and 130 tests / 5,263 assertions. `bun run playground:check` passed consumer typechecking and production iOS, Android and web exports; docs built 20 pages. Native tests ran before the clean package build, avoiding Metro/compiler output races. Retained artifact hashes and documentation links were verified.
- M0.9 remains unchecked because Android native acceptance has not run. Probe-enabled development runs do not qualify release performance, standalone apps, physical devices or screen-reader behavior. Pending release-version changes are excluded from this slice.

Next recommended slice: install the Android SDK/emulator prerequisites and qualify the playground's native Android journeys, reusing the Maestro scroll assertions. This would resolve the remaining platform gap in M0.9 before returning to native composition precedence/type repairs. Begin only after user approval.

### 2026-09-14 — Ordered native composition, first M0.2 slice

The user parked Android until last and authorized moving to the next roadmap item. [Implementation plan](superpowers/plans/2026-09-14-native-composition-order.md). Crumbs `style`, primitive helpers and `styleVariants` now accept typed compositions. Inline rules are captured separately and their authored sequence is registered explicitly, preserving nested arrays and repeated bases through the legacy native emitter. This implements ADR D2 without introducing the M2 IR or a runtime composition evaluator.

- Baseline package check passed 130 tests / 5,263 assertions. Four new regression tests failed with wrong color/opacity/token winners and a generated graph mismatch; positive composition type fixtures also failed typechecking before the repair.
- Green package build/typechecking and all 134 tests / 5,378 assertions passed. The independent reference evaluator checks multiple bases, interleaved overrides, nested compositions, repeated bases and literal padding shorthand/longhand order. A shrinking asynchronous property test compiles 100 authored graphs with seed `20260914`. Winning same-property token/literal values resolve correctly; overridden missing tokens are not resolved.
- Primitive inline negative type fixtures remain rejected, including arbitrary browser class strings. The new composition types are exported from the authoring and root entrypoints. Recipe composition and broader API completeness remain later roadmap work.
- The playground heading now composes the body-text base and overrides its font size. `bun run playground:check` passed typechecking and iOS/Android/web production exports; the public CommonJS compiler independently produced heading size 24, body size 16, weight 700 and the shared theme reference. Storybook typechecking and the 20-page docs build passed. Existing local Bun benchmark budgets passed; this is not a new composition/device performance baseline.
- M0.2 remains unchecked: token-backed shorthand/longhand normalization is still incomplete. Direct vanilla-extract compositions retain upstream processing and do not acquire this native authored-order contract. Structured native values, identity and runtime isolation remain separate repairs. No native/device acceptance was rerun for this compiler slice, and Android remains deferred and unqualified.

Next recommended slice: normalize token-backed spacing shorthands alongside literals, with independent same-rule and cross-composition precedence tests, to close the remaining composition conflict gap before M0.3 structured-style resolution. Begin only after user approval.

### 2026-09-14 — Canonical token/literal spacing precedence

Approved bounded continuation: [spacing precedence plan](superpowers/plans/2026-09-14-spacing-precedence.md). Token and literal physical padding/margin, their horizontal/vertical aliases, and gap now expand to the same canonical longhand keys before declaration and composition merging. Normalization occurs in the compiler; no runtime normalization pass or new dependency was added.

- Red evidence: 11 new spacing/integration cases failed while four existing composition tests passed. Token aliases retained shorthand keys, producing incorrect overlaps and resolution of completely overridden missing tokens.
- Green evidence: focused conversion/composition checks passed 39 tests / 381 assertions. Independent semantic cases cover both value representations and both orders, same-rule and nested-composition conflicts, negative margins, multi-value literal margins and partial versus complete token override. Shrinking properties evaluate 100 declaration sequences (seed `20260915`) and 100 compiled native spacing compositions (seed `20260916`).
- Full package build/typechecking and 146 tests / 5,615 assertions passed. Workspace consumer typechecking and production iOS/Android/web exports passed; Storybook typechecking and the 20-page docs build passed. The public CommonJS compiler/runtime resolved the playground root to top padding 60 and three token-backed sides of 16, preserving its existing normalized flex fields. An initial ad hoc probe expected the source `flex` key rather than its existing converted longhands; correcting that expectation passed without changing flex handling. Existing local Bun benchmark budgets passed after consumer builds completed.
- Alpha migration is documented in package compatibility and user-facing docs: compiled padding/margin/axis/gap artifacts expose longhands. Regenerate dependent modules together; mixed older shorthand artifacts and newer longhands are not qualified. Raw runtime styles retain their existing behavior.
- This closes the named physical spacing conflict gap. M0.2 remains unchecked because other shorthand families and logical/RTL semantics remain unqualified; M0.5 still has separate admission/export work. Native structured values, contract identity and runtime isolation remain open. No native/device or release performance acceptance was rerun. Android stays last and unqualified; unrelated release-version edits are excluded.

Next recommended slice: M0.3 structured-style resolution — distinguish transform arrays and other native object values from variant maps, preserve scalar siblings and primitive-specific result types, and add independent regressions. Begin only after user approval.

### 2026-09-14 — Structured runtime resolution and primitive result types

Approved bounded continuation: [structured resolution plan](superpowers/plans/2026-09-14-structured-style-resolution.md). Native structured values now retain their shape and references through runtime resolution, including scalar siblings and ordered whole-value replacement. Compiled Crumbs variant maps carry internal export-kind metadata across serialization; public string keys and variant key types remain unchanged. The enumerable symbol survives object spread and repeated resolution. Legacy maps retain a conservative fallback; ambiguous unmarked native-value shapes prioritize native styles, and JSON does not preserve the marker.

- Red evidence: four of the initial six runtime regressions failed, eight exact primitive result-type fixtures failed, and an additional tokenized-width fixture exposed namespace type erasure. The old resolver treated any object-valued property as a variant-map indicator.
- Green evidence: full package build/typechecking passed 153 tests / 5,933 assertions. Seven new runtime tests cover structured-only styles, scalar siblings, transform order, replacement, opaque animated values, genuine legacy maps and compiled maps with native-property-like variant names. A shrinking property checks 100 structured inputs with seed `20260917`. Nine exact type fixtures, three negative primitive-property fixtures, recursive arrays and tokenized width pass.
- Public ESM and CommonJS runtime probes passed reference preservation, top-level token resolution, spread map identity and repeated resolution. Compiler integration verifies marker serialization and unchanged string keys. Existing generated-code spelling checks were replaced with assertions on variant keys and values. Consumer typechecking and production iOS/Android/web exports, Storybook typechecking, the 20-page docs build and existing local Bun budget checks passed.
- M0.3 is complete. Nested values remain opaque: no nested token evaluation or animated-node execution was added. This does not establish that structured inputs survive CSS conversion; M0.4 remains open. The metadata bridge is not the M2 native IR or a validated ingress boundary. No native/device, editor-performance or release-performance acceptance was rerun, and no dependency was added. Android stays last and unqualified; unrelated release-version edits are excluded.

Next recommended slice: M0.4 structured-value compiler compatibility — preserve supported `transform` and `shadowOffset` inputs end to end with explicit native handling, and give unsupported accepted shapes specific diagnostics or narrower types. Prove the boundary with independent authored-input expectations. Begin only after user approval.

### 2026-09-14 — Static structured compiler compatibility

Approved M0.4 continuation under ADR D1/D2. The existing vanilla-extract adapter now captures supported native structured values before CSS serialization and keeps them in a compilation-local class map. Converted scalar declarations and captured values merge before authored composition resolution. This uses the existing adapter boundary without adding a dependency, runtime pass or M2 IR.

- Red evidence: all five initial authored-input tests failed, including loss of transforms/offsets, composition replacement, recipes, diagnostic admission and a shrinking generated case. A negative animated-transform type fixture also failed because the node was accepted. Positive static structured `style` / `styleVariants` type fixtures initially failed; their rule types now admit the supported native subset. Direct primitive helper inputs exclude animated transform nodes while runtime-native types and composition references retain their broader role; actual values are checked on every authoring path.
- Supported static arrays preserve operation order, empty-array replacement, numeric scales/perspective, numeric or percentage translations, deg/rad rotations/skews and 16-finite-number matrices. Numeric width/height shadow and text-shadow offsets preserve whole-value replacement. Six integration tests cover both emission modes (StyleSheet mocked for code evaluation), imported bases, repeated/nested composition, CSS-string/native-array winners, helpers, variant maps and recipe base/variants/compounds. A shrinking property evaluates 100 independent whole-value compositions with seed `20260918`.
- Unsupported structured families, animated nodes, nested tokens, malformed operations and sparse arrays fail with the stable `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE` code, property/file/class context and runtime-style migration guidance even when strict diagnostics are disabled. No animated method is executed. Existing rule-container and browser-string compatibility checks retain their separate contracts. Alpha migration and the supported matrix are documented.
- Full package build/typechecking passed 159 tests / 6,059 assertions; final focused compiler tests and typechecking passed after tightening test result types. Public ESM/CommonJS compiler/runtime probes passed exact structured output. The playground panel now consumes identity transforms and a numeric offset, independently checked through the public compiler. Consumer typechecking and production iOS/Android/web exports, Storybook typechecking, the 20-page docs build and existing local Bun budgets passed.
- A playground probe also exposed an existing literal `shadowOpacity` unit warning; that additional property was removed from this slice rather than extending numeric conversion scope. Keep native unit normalization on the remaining correctness backlog. No new compiler/runtime performance baseline, standalone/native rendering, device shadow behavior or release acceptance is established. M0.4 is complete for the documented static subset; M0.5 admission/ordinary exports, M0.6 identity and M0.7 runtime isolation remain open. Android stays last and unqualified; unrelated release-version edits are excluded.

Next recommended slice: M0.5 token-reference admission — validate complete reference shapes and names, reject malformed or inherited payloads with stable diagnostics, and prove supported literal/token properties follow the same checks. Ordinary non-style export handling remains a separate bounded M0.5 continuation. Begin only after user approval.

### 2026-09-14 — Exact native token-reference admission

Approved bounded M0.5 continuation under ADR D2. Reference constructors validate native names; the boolean guard validates exact own enumerable data fields and plain/null-prototype DTO shape without evaluating accessors. Runtime candidate detection prevents malformed tagged references from being mistaken for variant maps. Surviving top-level values fail explicitly before lookup; composition overrides and opaque nested values retain their existing semantics. Theme lookup requires an own token property.

- Red evidence: four of five initial admission tests failed, including malformed/inherited shapes, accessor evaluation, constructor names/own lookup and generated invalid names. Six green admission tests cover exact reference shape, missing/wrong names, arrays, inherited fields, extra metadata, accessors, JSON/null-prototype DTOs, overwritten invalid values, opaque transforms and literal/token property admission parity. A shrinking property checks 100 generated names with seed `20260919`.
- Stable `CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE` and `CRUMBS_CSS_MISSING_THEME_TOKEN` codes are available from the existing root diagnostic export. Invalid tagged payloads fail with property context; guards return false. Missing-token messages retain their existing descriptive text with the new code. Alpha migration requires regenerating extended/legacy DTOs into the documented exact shape.
- Full package build/typechecking passed 165 tests / 6,309 assertions. Public ESM/CommonJS probes passed valid resolution, malformed/inherited rejection, accessor avoidance and own lookup. Consumer typechecking and production iOS/Android/web exports, Storybook typechecking, the 20-page docs build and existing local Bun budgets passed. No new dependency, full schema/codec boundary, native performance baseline or native/device acceptance was introduced.
- M0.5 remains unchecked: ordinary non-style export admission/preservation is the next separate continuation. Cross-contract identity and runtime graph isolation remain open. Android stays last and unqualified; unrelated release-version edits are excluded.

Next recommended slice: M0.5 ordinary export contract — define which non-style values survive compilation, preserve supported values independently of style metadata, and explicitly reject unsupported values instead of replacing them with `undefined` or changing their meaning. Begin only after user approval.

### 2026-09-14 — Ordinary named export contract

Approved bounded M0.5 continuation under ADR D1/D2. Export capture now validates data and carries explicit internal envelopes before vanilla-extract serialization. Ordinary tag-shaped records cannot masquerade as compiler map/class metadata. Source-authored recipe class references acquire an internal symbol marker; variant-map metadata remains compatible with string keys and object spread. Composition cleanup applies only to captured style handles. No dependency or runtime serialization pass was added.

- Red evidence: all four initial ordinary-export tests failed: top-level strings became undefined, negative zero/data fields were lost, tag-shaped records were reinterpreted and unsupported values were not rejected with a coded contract. Additional red cases exposed lost own prototype-like keys/null prototypes, invalid metadata markers, custom array instances and reserved export names.
- Six green tests qualify named finite primitives, undefined fields, negative zero, dense nested data, null-prototype records, own `__proto__` keys/bindings, real styles/maps/recipes alongside ordinary tags, safe composition cleanup and explicit rejection. A shrinking asynchronous property compiles 100 ordinary JSON values with seed `20260920`. Unsupported functions/serializers, bigint/symbols, non-finite values, sparse/extended arrays, instances, inherited/accessor/non-enumerable data, cycles and unsupported binding names fail with `CRUMBS_CSS_UNSUPPORTED_EXPORT`, file/path context and migration guidance. Declaration permissiveness cannot suppress that error.
- The data contract preserves values and null prototypes, not shared identity, frozen status or descriptor flags. Compiler-generated module getters are evaluated once; nested data accessors are rejected. Strings equal to registered style handles retain their legacy reference interpretation; fully distinct provenance awaits M2. Internal symbol metadata is reserved rather than an authentication boundary. These limits and alpha regeneration guidance are documented.
- Full package build/typechecking passed 171 tests / 6,449 assertions. Public ESM/CommonJS probes passed ordinary primitives/tag data, real recipe references and coded unsupported-instance rejection. The playground title now comes from an ordinary `.css.ts` constant, separated at module scope from the namespace passed to theme hooks; the public compiler independently preserved its exact text and panel transform. Consumer typechecking and production iOS/Android/web exports, Storybook typechecking, the 20-page docs build and existing local Bun budgets passed.
- M0.5 is complete for its documented property, reference and export contracts. Cross-contract identity, runtime graph isolation and stale fixture cleanup remain open. No native rendering/device, release publication or new performance baseline is claimed. Android stays last and unqualified; unrelated release-version edits are excluded.

Next recommended slice: M0.6 cross-contract token ownership — prevent global registry rebinding, define an explicit ownership/identity rule with migration guidance, and independently test overlapping contracts and reuse. Begin only after user approval.

### 2026-09-14 — Atomic legacy token ownership

Approved bounded M0.6 continuation under ADR D5. The interim legacy owner is the exact raw path of unsanitized key segments. Identical paths may reuse a token identity, while different paths that sanitize to that name fail before any metadata is published. Contract construction stages all tokens, validates against existing owners, then publishes only new immutable metadata. Existing names are unchanged and no evaluation-order counter or random identifier was introduced.

- Red evidence: four of five initial ownership tests failed, demonstrating cross-contract rebinding, partial registration, mutable exposed paths/misplaced leaves and generated collisions. Seven green tests cover those cases, exact-path reuse with independent theme values, imported contracts evaluated together by the compiler and own prototype-like contract keys. A shrinking property rejects 100 generated flat/nested path collisions with seed `20260921` and independently checks the original owner path remains unchanged.
- `CRUMBS_CSS_THEME_TOKEN_COLLISION` identifies a collision; cross-contract messages expose raw segment arrays to distinguish punctuation from nesting. `CRUMBS_CSS_INVALID_THEME_CONTRACT` rejects invalid construction shapes and misplaced, unregistered or invalid leaves during theme creation. Exposed metadata paths are frozen. Failed contracts cannot pollute the registry, and existing owners are never overwritten. Migration guidance recommends package/design-system root namespaces and rebuilding decoded contracts in an owning authoring module when registry metadata is absent.
- Full package build/typechecking passed 178 tests / 6,670 assertions. Public ESM/CommonJS authoring probes passed atomic failure, metadata preservation/immutability, exact reuse and misplaced-leaf rejection. Consumer typechecking and production iOS/Android/web exports, Storybook typechecking, the 20-page docs build and existing local Bun budgets passed. No dependency or runtime resolution pass was added.
- M0.6 is complete for the documented interim rule. The registry is local to an authoring module instance or compiled graph. Same-path reuse intentionally shares legacy identity; independent graphs/package copies and provider compatibility need M3 manifests/identity checks. This does not establish semantic token domains, wrong-provider rejection, full theme schemas or a new native performance baseline. Runtime graph isolation and stale fixtures remain open. Android stays last and unqualified; unrelated release-version edits are excluded.

Next recommended slice: M0.7 runtime isolation — move shared runtime tags out of authoring modules, correct emitted chunks, and prove ESM/CommonJS plus an isolated packed Metro consumer cannot load Node built-ins or compiler dependencies through runtime entrypoints. Begin only after user approval.


### 2026-09-14 — Runtime dependency isolation

Approved M0.7 continuation under ADR D6/D11/D12. Shared recipe tags now live in a pure data module. Runtime and tooling JavaScript build independently, while one declaration graph preserves nominal token compatibility across entrypoints. The public theme subpath and its existing alias remain unchanged; root, style and Metro entrypoints retain their build-time role. No package dependency or public API was added.

- Red evidence: all three emitted-graph/CommonJS denial regressions failed on the old build, revealing theme imports of authoring/compiler chunks and Node dependencies. Independent declaration builds then exposed duplicated nominal brands in package and packed consumer typechecks. A shared ESM declaration-only build with canonical CJS re-export stubs resolves that without allowing the dual-format declaration optimization to overwrite isolated JavaScript.
- Bundle qualification independently rejects authoring/transformer entries and compiler dependencies, handles indexed source maps, fails absent maps, and requires runtime code in each of iOS, Android and web. A red near miss demonstrated that three iOS maps previously satisfied a count-only check. The runner clears stale exports and retains map reports. Its first stricter Metro check exposed the playground's ordinary `theme.ts` runtime authoring import; moving theme construction to `theme.css.ts` compiles exports into data. Package examples and the themed-screen tutorial now teach this boundary.
- Full package build/typechecking passed 183 tests / 6,691 assertions. Workspace consumer typechecking and fresh iOS/Android/web production exports passed source qualification (one Crumbs theme module per platform). Storybook typechecking and the 20-page docs build passed.
- The previously prepared isolated npm consumer was refreshed with the corrected local tarball, preserving its installed Expo dependencies without workspace Crumbs links. Its independent typecheck, fresh all-platform exports and map qualification passed. Installed packed ESM/CommonJS runtime probes resolved tokens with Node/compiler imports denied. [Retained qualification](evidence/2026-09-14-runtime-isolation/qualification.json) records exact installed identity, tarball SHA-256 and both consumers' map reports. The working-tree manifest version includes unrelated pre-existing release edits excluded from this commit; this is a local artifact, not a publication.
- M0.7 is complete for the runtime subpath boundary. Installed compiler dependencies remain necessary for authoring; runtime imports must use `/theme` and theme construction imported by an app must be compiled from `.css.ts`. No native/device performance, new benchmark baseline, release publication or native Android acceptance is claimed. Android remains last and unqualified. Stale fixture/test coverage remains M0.8 work.

Next recommended slice: M0.8 — replace stale `apps/native` test and benchmark dependencies with durable current fixtures, make required fixture absence fail, report optional capability absence explicitly, and align compatibility documentation with actual coverage. Begin only after user approval.


### 2026-09-14 — Durable required compiler fixtures

Approved bounded M0.8 continuation under ADR D11/D12. A package-owned consumer project replaces the removed `apps/native` paths in transformer tests and the compiler benchmark. Tests and benchmarks admit the same four required files; absent projects/files and directory impostors fail with the required fixture path. No runtime/authoring API, dependency or package peer range changed.

- Red evidence: removing the silent returns while retaining the old paths produced five failures and 30 genuine passes. These previously empty scenarios now exercise themed styles, variants, recipes, web object emission, project-relative filenames and local theme imports. Native outputs are evaluated for token names, spacing, heading values, variant state values, recipe defaults and compound styles, replacing stale emitter-spelling assumptions in the repaired cases.
- Two admission tests cover the complete project and every missing-file/directory near miss. A temporary removal of the required button fixture made both the actual transformer test command and benchmark command exit 1 with its path. Restoration was guaranteed by cleanup; focused tests and the full package check then passed. [Retained qualification](evidence/2026-09-14-durable-fixtures/qualification.json) records those controls and the host metrics.
- Full build/typechecking passed 185 tests / 6,738 assertions across 28 files. All seven existing host benchmark budgets passed, including the now-mandatory small consumer button graph; its previously skipped counterpart is not a comparable historical baseline. Benchmark JSON explicitly reports native/device performance as `not-run` with a reason. Runtime quantiles remain batch averages, and compiler measurements remain warm small-graph timings. The docs build passed 20 pages.
- Compatibility guidance now identifies workspace/packed baseline evidence, mandatory compiler coverage, JavaScript bundle qualification and separate native capabilities. Fixture assets remain excluded from the packed tarball, checked by the existing consumer contract tests. No fresh native/Expo/device or new release-performance qualification was necessary or claimed for this test/benchmark infrastructure slice. Android native acceptance remains last and unqualified; unrelated release-version edits are excluded.

Next recommended slice: M0.2 border shorthand/longhand precedence — add independent token/literal and composition-order cases for border widths/colors, then normalize the supported subset or explicitly reject unsupported combinations with type-aligned guidance. This closes another native precedence gap before M0.1 evidence consolidation and the Effect milestone. Begin only after user approval.


### 2026-09-14 — Canonical physical border width/color precedence

Approved bounded M0.2 continuation under ADR D2. Physical `borderWidth` and `borderColor` expand to four side keys before declarations/compositions merge, for token references, literals and width/color output from a literal compound CSS border. Existing multi-value literals preserve their per-side values and global `borderStyle` remains unchanged. This extends the existing compiler normalization map without adding a runtime pass, public API or dependency.

- Red evidence: the original seven tests produced six failures; the final eight-case suite against the old converter produced seven failures and one valid multi-value-literal pass. Failures demonstrated leftover shorthand token keys, wrong broad/side winners, compound-border output conflicts, resolution of completely overridden missing tokens and generated counterexamples. The converter repair makes those properties compete on identical physical keys.
- Nine regressions cover every physical edge, both token/literal directions, declaration order, multi-value literals, compound borders, complete versus partial missing-token override and unchanged strict compound/side-style rejection. Independent evaluators check 100 declaration sequences (seed `20260922`) and 100 compiled nested/repeated-base graphs (seed `20260923`). A tracked, typechecked authoring fixture covers rules, compositions, primitive helpers, variants and recipes in both object and StyleSheet emitters.
- Full package build/typechecking passed 194 tests / 7,006 assertions across 29 files. Public ESM/CommonJS compiler/runtime probes passed physical broad/narrow/compound winners and independently verified the playground input remains width 1 / accent color on all four sides, with no compiled shorthand fields. The playground now composes an earlier side border base with later broad overrides to dogfood that order. Consumer typechecking and iOS/Android/web production exports passed runtime source-map qualification; Storybook typechecking, the 20-page docs build and all seven existing local Bun benchmark budgets passed. [Retained qualification](evidence/2026-09-14-border-precedence/qualification.json).
- Alpha migration guidance requires regenerating dependent artifacts together and passing complete native styles rather than inspecting compiled shorthand fields. Mixed old/new artifacts remain unqualified; raw runtime styles keep native behavior. Corner radii, logical start/end/RTL conflicts, side compound styles and flex families remain separate compatibility work. No semantic token validation, native/device rendering, release publication or new portable performance baseline is established. Android remains last and unqualified; unrelated release-version edits are excluded.
- M0.2 remains unchecked. The tracked fixture additionally exposed an existing type-reference gap: some `ViewStyle` references cannot enter generic variant compositions because their `overflow` union includes `scroll`, while the current generic native style intersection excludes it. Shared generic style references keep this fixture within the existing supported types; no casts or unrelated type widening were introduced. Primitive-reference compatibility needs its own positive/negative type contracts before M0.1 evidence consolidation.

Next recommended slice: M0.2 primitive-reference compatibility — allow appropriately typed view/text/image references through generic compositions and variant maps while preserving primitive result types and rejecting incompatible inline properties. Add positive/negative type fixtures and compiler regressions without casts. Begin only after user approval.


### 2026-09-14 — Primitive-reference compatibility and anchored inline checks

Approved bounded M0.2 continuation under ADR D2. Generic authoring now accepts complete view/text/image references directly and in nested/repeated compositions. The default composition reference type is the primitive union; variant results infer per entry. Literal-only/widened legacy rules retain `NativeStyle`, single-primitive references retain their native type, and mixed references return a conservative union. No public entrypoint, runtime/phantom brand, recipe API, dependency or Effect execution requirement was added.

- Red evidence: positive type fixtures failed on valid view/text `overflow: "scroll"` references and exact result types. Four subsequent unused negative directives demonstrated incompatible inline properties being accepted by the initial widening. Reference-anchored property/value checks repair that without dropping those negatives. Both compiler emitter regressions failed because direct references became character-key declarations (`0: p`); direct strings now route through the existing authored composition path.
- Fifteen exact type checks and 16 negative fixtures cover primitive results, direct/nested/repeated references, independently typed map entries, mixed unions, recursive composition aliases, resolution/hooks, invalid values, class strings, incompatible target/generic inline fields and direct/nested animated declarations. Packed consumer tests reuse those fixtures with public imports under TypeScript Node16 and Bundler resolution. Widened `NativeStyleRule` inputs retain the legacy contract; unconstrained generic forwarders explicitly select it with the documented type arguments. No consumer casts were added.
- Full build/typechecking passed 196 tests / 7,024 assertions across 30 files. Native and web compiler fixtures preserve winner values and variant symbol identity. Public ESM/CommonJS compiler probes passed both emitters. The playground input now uses generic `style` with its text reference; consumer typechecking and production iOS/Android/web exports passed runtime map qualification. Storybook typechecking, the 20-page docs build and all seven existing local Bun benchmark budgets passed. [Retained qualification](evidence/2026-09-14-primitive-references/qualification.json).
- Alpha migration documents new inference and deliberate type erasure: keep primitive annotations for target results, use the second composition type parameter for target-specific aliases, and explicitly select the legacy contract in generic forwarding functions when appropriate. Complete-interface detection is structural, not a provenance/identity guarantee; compiler admission of actual data remains independent. No native/device or new editor/performance baseline, release publication or native Android acceptance is claimed. Unrelated release-version edits are excluded.
- The previously recorded primitive-reference gap is repaired. M0.2 remains unchecked because corner radius, logical/RTL and flex conflict semantics remain unqualified; M0.1 evidence consolidation is still separate. Android remains last and unqualified.

Next recommended slice: M0.2 physical border-radius precedence — normalize token-backed radii to the same four physical corners as literals, independently test broad/corner ordering and compositions, and document alpha artifact migration. Logical radii remain a separate boundary. Begin only after user approval.


### 2026-09-14 — Canonical physical border-radius precedence

Approved bounded M0.2 continuation under ADR D2. Token-backed `borderRadius` now expands to the same four physical corner keys as literals before declaration/composition merging. Later broad/corner declarations therefore compete on identical properties. No runtime normalization, public API or dependency was added.

- Red evidence: seven regressions produced six failures and one unchanged-boundary pass before the repair. Independent shrinking exposed a token broad radius retaining a shorthand key beside previously authored literal corners. After the compiler map repair, all seven pass.
- Regressions cover every physical corner, both token/literal directions, declaration order, multi-value literals, percentages, zero, complete versus partial missing-token override and unchanged strict rejection of elliptical CSS/embedded multi-value token expressions. Independent properties run 100 declaration sequences (seed `20260924`) and 100 compiled nested/repeated-base graphs (seed `20260925`). The tracked typechecked fixture covers rules, primitive helpers, variants and recipes in both native StyleSheet and web object emitters.
- Full package build/typechecking passed 203 tests / 7,269 assertions across 31 files, including packed-consumer and runtime-isolation qualification. Public Node ESM/CommonJS compiler/runtime probes passed both emitters and independently verified playground panel corners remain 12 with no compiled `borderRadius` field. The panel now dogfoods an earlier corner declaration overridden by a later theme radius token. Storybook typing, consumer typing, iOS/Android/web production exports and all three runtime source-map checks passed. All seven existing local Bun benchmark budgets passed; the docs build produced 20 pages. [Retained qualification](evidence/2026-09-14-radius-precedence/qualification.json).
- Alpha migration guidance requires regenerating dependent artifacts together and passing complete styles to React Native. Mixed old/new compiled radius artifacts remain unqualified; raw runtime styles retain native semantics. Logical/RTL corners and flex conflict semantics remain separate work. M0.2 remains unchecked and M0.1 evidence consolidation is still pending. Native/device acceptance was not rerun; Android remains last and unqualified. No publication or unrelated release-version edits are included.

Next recommended slice: M0.2 flex-family contract audit and repair — specify numeric React Native `flex` semantics versus CSS shorthand conversion, cover token/literal conflicts with `flexGrow`/`flexShrink`/`flexBasis` using independent regressions, and reject unsupported combinations with type-aligned guidance. Preserve native behavior rather than assuming browser shorthand semantics. Begin only after user approval.


### 2026-09-14 — Native numeric flex semantics and precedence

Approved bounded M0.2 continuation under ADR D1/D2. Literal finite numeric `flex` now remains an independent native Yoga field, matching token-backed flex. Negative values, zero, fractions and exponent notation survive; no CSS grow/shrink/basis defaults are introduced. Explicit native siblings survive in either authored order; only same-field declarations override each other. The installed React Native 0.85.3 Yoga `Node.cpp` methods `processFlexBasis`, `resolveFlexGrow` and `resolveFlexShrink` ground this contract, alongside the [official single-number flex reference](https://reactnative.dev/docs/flexbox). This specifies compiler preservation, not measured native layout or cross-platform visual parity.

- Red evidence: the first seven regressions all failed before repair, including independently shrunk single `flex: 0` and compiled token/literal examples. Three negative generic type fixtures also failed as unused `@ts-expect-error` directives. Generic flat authoring now narrows `flex` to numeric or branded Crumbs token values, matching primitive helpers.
- Eight regressions cover numeric edge cases, explicit sibling order, token/literal same-field overrides, surviving versus completely overridden missing tokens, strict/permissive rejection and direct compilation of unsupported JavaScript forms. Independent reference properties run 100 declaration sequences (seed `20260926`) and 100 compiled nested/repeated-base graphs (seed `20260927`). A tracked typechecked fixture covers compositions, primitive helpers, variants and recipes through both emitters. Packed Node16/Bundler fixtures cover positive numeric/token generic rules and negative CSS flex forms.
- Full package build/typechecking passed 211 tests / 7,534 assertions across 32 files, including packed-consumer typing and runtime isolation. One older test expected CSS expansion and was migrated to assert native `flex: 1`. Public ESM/CommonJS probes passed native flex values/sibling preservation in both emitters and independently verified the playground root retains `flex: 1` without introduced CSS defaults. The root now dogfoods an earlier zero flex overridden by a theme token. Storybook typing, consumer typing and iOS/Android/web exports passed; all three runtime source-map checks passed. All seven existing local Bun benchmark budgets passed, and the docs build produced 20 pages. [Retained qualification](evidence/2026-09-14-flex-semantics/qualification.json).
- Alpha migration: regenerate dependent compiled artifacts together; mixed old CSS-expanded/new native flex artifacts are unqualified. CSS flex keywords, multi-part strings, lengths, percentages and nonfinite literals now fail strict compilation with migration guidance; permissive conversion drops them. Use explicit native grow/shrink/basis properties to express migrated intent. Token value-domain validation remains future work. Raw runtime styles retain native semantics. No runtime pass, new public API, dependency or Effect was added. M0.2 remains unchecked pending remaining logical/physical conflict contracts; M0.1 evidence consolidation remains separate. Native/device acceptance was not rerun, Android remains last, and no publication or original release-version edits are included.

Next recommended slice: M0.2 logical/physical overlap contract — audit supported spacing and border aliases against the installed React Native/Yoga precedence rules, add independent overlap regressions, and preserve direction-dependent fields or reject unsupported combinations explicitly. Do not assume browser order or add runtime RTL mapping. Begin only after user approval.


### 2026-09-14 — Spacing aliases and logical/physical overlap contract

Approved bounded M0.2 continuation under ADR D2. Twelve existing spacing Inline/Block aliases now normalize before ordered merging: Inline/Block expand to physical pairs, BlockStart/End map to top/bottom, and InlineStart/End map to native Start/End. Tokens and literals therefore compete on identical canonical fields. Direction-dependent spacing and border fields remain distinct from physical fields; there is no runtime RTL mapping or universal later logical/physical winner.

- Red evidence: the initial nine regressions produced eight failures and one native-field preservation pass. Independent shrinking exposed `paddingBlock` token output retaining its alias and a compiled broad-zero/base plus BlockStart-token conflict. Two negative generic type fixtures failed as unused `@ts-expect-error` directives. A later camelCase declaration guard regression also failed before its targeted repair.
- Ten regressions cover all twelve alias mappings, both token/literal representations and authored orders, broad/pair/side overlap, percentages, zero, auto, missing-token survival, strict/permissive multi-value rejection, preservation of logical spacing/border fields and selected source-grounded LTR/RTL precedence cases. Independent properties run 100 declaration sequences (seed `20260928`) and 100 compiled nested/repeated-base graphs (seed `20260929`). A tracked typechecked fixture covers primitive helpers, variants and recipes through both emitters. Four existing typed logical corner radii now pass compiler admission for tokens and literals. Packed Node16/Bundler fixtures cover numeric/percentage/token alias positives and multi-value negatives.
- Source audit: installed React Native 0.85.3 `YogaLayoutableShadowNode.cpp::applyAliasedProps` distinguishes aliases with precedence from fallback aliases; Yoga `Style.h::computeLeftEdge/computeRightEdge` prefers mapped logical spacing/border widths. Fabric `primitives.h::CascadedRectangleEdges/CascadedRectangleCorners` prefers explicit physical border colors/radii and retains its logical corner-name priority. Crumbs ordered alias normalization is an explicit compile-time contract, distinct from raw native alias priority/fallback behavior. Broad compiled border color/radius fills physical fields, so logical fields do not override those physical outputs. These tests are compiler/source-contract evidence, not native rendering or device RTL acceptance.
- Full package build/typechecking passed 221 tests / 7,834 assertions across 33 files, including packed-consumer typing and runtime isolation. Public ESM/CommonJS probes passed both emitters and verified the dogfood root still exposes physical spacing top 60 / right 16 / bottom 16 / left 16 with no alias fields. The root now composes an earlier zero broad spacing value with later token Inline/Block aliases and BlockStart 60. Consumer typing and iOS/Android/web exports, all three runtime source-map checks, Storybook typing, the 20-page docs build and all seven local Bun benchmark budgets passed. [Retained qualification](evidence/2026-09-14-logical-precedence/qualification.json).
- Alpha migration guidance requires regenerating dependent artifacts together and passing complete styles to React Native. Mixed old alias/new canonical artifacts remain unqualified. Generic inline types and strict conversion reject unsupported multi-value spacing aliases; permissive conversion drops them. All surviving tokens still require theme values even when native precedence masks a field. Raw runtime styles retain native alias rules. Inset aliases and side compound border forms remain separate work; M0.2 stays unchecked and M0.1 evidence consolidation remains pending. No new public API, dependency, runtime pass or Effect was added. Native/device acceptance was not rerun, Android remains last, and no publication or unrelated release-version edits are included.

Next recommended slice: M0.2 inset-alias contract — cover token/literal broad/side/start/end conflicts, normalize the supported position aliases under explicit ordered authoring semantics, and reject unsupported CSS forms with type-aligned migration guidance. Preserve native direction-dependent fields. Begin only after user approval.


### 2026-09-14 — Canonical inset-alias contract

Approved bounded M0.2 continuation under ADR D2. All seven existing inset aliases now normalize before ordered merging: inset expands to four physical sides, Inline/Block to physical pairs, BlockStart/End to top/bottom, and InlineStart/End to native start/end. Tokens and literals compete on identical canonical fields. Direction-dependent fields stay distinct, with native Yoga selecting their mapped edge. No runtime direction mapping was added.

- Red evidence: after correcting a test-file syntax error, all nine regressions failed against the old converter; failures included independently shrunk `inset: 0` and a compiled broad-zero/token composition. Two negative generic type fixtures also failed as unused `@ts-expect-error` directives. Generic inline types now match primitive helpers for single native dimensions or branded Crumbs tokens.
- Nine regressions cover every alias and overlapping side, both token/literal representations and orders, broad/pair/side replacement, negative offsets, zero, percentages, auto, complete versus partial missing-token survival, preserved start/end fields, selected source-grounded LTR/RTL selection, and strict/permissive rejection of unsupported multi-value/expression/unit/nonfinite forms through both kebab and camel declaration names. JavaScript compilation regressions retain strict diagnostics even when typechecking is bypassed. Independent reference properties run 100 declaration sequences (seed `20260930`) and 100 compiled nested/repeated-base graphs (seed `20260931`). A tracked typed fixture covers primitive helpers, variants and recipes in both emitters, with packed Node16/Bundler positive/negative type contracts.
- Full package build/typechecking passed 230 tests / 8,276 assertions across 34 files, including packed-consumer typing and runtime isolation. Public ESM/CommonJS compiler/runtime probes passed both emitters and independently verified the dogfood overlay remains top 100 / left 16 / right 16 without inset alias or bottom fields. The overlay composes an earlier zero Inline position with a later Inline token and BlockStart 100. Consumer typing, iOS/Android/web production exports, all three runtime source-map checks, Storybook typing, the 20-page docs build and all seven local Bun benchmark budgets passed. [Retained qualification](evidence/2026-09-14-inset-precedence/qualification.json).
- Alpha migration guidance requires regenerating dependent compiled artifacts together and passing complete styles to React Native. Mixed old/new inset artifacts remain unqualified; unsupported CSS forms require explicit side properties. Only completely overridden same-field tokens stop requiring theme values; surviving logical fields remain resolved. Token value-domain validation stays future work. Installed React Native 0.85.3 `applyAliasedProps`/Yoga edge selection and the [official New Architecture inset reference](https://github.com/react/react-native-website/blob/main/docs/layout-props.md) ground the contract. Crumbs ordered authoring is distinct from raw native alias priority/fallback rules. These tests do not qualify native layout, device RTL settings or native/web visual parity. Side-specific compound borders remain separate work; M0.2 stays unchecked and M0.1 evidence consolidation remains pending. No public API, dependency, runtime pass or Effect was added. Android remains last; no publication or unrelated release-version edits are included.

Next recommended slice: M0.2 side-specific compound border admission — align generic authoring types with the existing strict native rejection of unsupported side border-style output, retain literal broad-border support, and add positive/negative compiler/type regressions plus migration guidance. Begin only after user approval.


### 2026-09-14 — Side-specific compound/style border admission

Approved bounded M0.2 continuation under ADR D2. Generic inline/native input types now reject physical and Inline/Block side compound borders and their side-style fields. The compiler rejects those known unsupported fields before token/converter dispatch with actionable side width/color and global borderStyle migration guidance. Strict diagnostics carry the existing `CRUMBS_CSS_DROPPED_DECLARATION` code and source/export context. Permissive conversion retains whole-declaration dropping and valid siblings.

- Red evidence: the initial five-case suite produced one migration-diagnostic failure and four valid existing-behavior passes. Contrary to the initial hypothesis, permissive conversion already dropped entire unsupported declarations; no partial-output repair was needed. Typechecking reported 21 unused `@ts-expect-error` directives for accepted unsupported inline/nested fields. A fixture-only ImageStyle/global borderStyle mismatch was corrected without broadening image authoring; image helpers retain their native property set.
- Five regressions cover twenty unsupported compound/style field names in kebab and camel form, literals/tokens, strict contextual migration guidance, retained permissive atomic drops with supported siblings, literal broad borders and explicit side width/color/global style, JavaScript compiler rejection and a supported typed fixture through both emitters. Exhaustive finite-domain cases suffice here; the existing shrinking border precedence properties remain in the full suite. Packed Node16/Bundler types cover all twenty forbidden names, nested variant rejection and supported broad/native-side positives.
- Full package build/typechecking passed 235 tests / 8,573 assertions across 35 files, including packed-consumer typing and runtime isolation. Public ESM/CommonJS compiler/runtime probes passed the supported migration fixture through both emitters. Consumer typing, iOS/Android/web production exports, all three runtime source-map checks, Storybook typing, the 20-page docs build and all seven local Bun benchmark budgets passed. [Retained qualification](evidence/2026-09-14-side-border-admission/qualification.json).
- Migration: replace unsupported side compounds/style fields with side width/color and global borderStyle where the primitive supports it (View/Text); ImageStyle remains narrower. Literal broad border retains existing canonical output. Upstream vanilla-extract types remain upstream, while native compilation enforces the rejection boundary. Supported compiled shapes, runtime behavior and permissive whole-declaration dropping remain unchanged. No per-side style feature, public API, dependency or Effect was added. M0.1/M0.2 remain unchecked pending evidence consolidation and a source-grounded closure audit. Native/device acceptance was not rerun, Android remains last, and no publication or unrelated release-version changes are included.

Next recommended slice: M0.1/M0.2 evidence consolidation and closure audit — map assessment E1–E7 to durable regressions, verified repairs or explicit type-aligned rejections; audit remaining composition/admission gaps and close only gates supported by retained evidence. This establishes readiness for M1 Effect contracts without starting that milestone automatically. Begin only after user approval.


### 2026-09-14 — M0.1 regression promotion and M0.2 closure audit

Approved evidence consolidation at source revision `b23ee66`. [Closure audit](assessments/2026-09-14-m0-closure-audit.md) maps every original E1–E7 counterexample to durable value/error and positive type regressions, its repair revision, historical before-fix execution evidence and current qualification limits. M0.1 is complete for this regression task; it does not close M0.2 or M0 overall.

- Current build/typechecking passed 235 tests / 8,573 assertions across 35 files, including mandatory consumer fixtures, packed Node16/Bundler authoring contracts, emitted runtime graph checks and CommonJS import denial. Workspace consumer typing and fresh iOS/Android/web production exports/runtime maps passed. Storybook typing and the 20-page docs build passed.
- The current local tarball was installed into the retained isolated npm Expo consumer and its source refreshed from the current playground. Existing Expo dependencies were reused, not freshly bootstrapped. Independent consumer typing, fresh iOS/Android/web exports and runtime map qualification passed. Retained artifact hash, installed identity and maps are in the [qualification record](evidence/2026-09-14-m0-closure-audit/qualification.json). A temporary npm cache avoided host cache write permissions; offline metadata resolution failed before the ordinary npm install succeeded, without force or legacy peer bypass.
- M0.2 remains open: a cast-free public [type reproducer](evidence/2026-09-14-m0-closure-audit/direct-native-reference.css.ts) exits 2 with two errors for `style(generic)` and a direct variant entry when `generic` has the legacy `NativeStyle` return type. Array-wrapped equivalents pass. This reveals a missing positive direct generic-reference contract despite the green suite. Compatibility and user-facing docs now state the workaround without suppressing the reproducer or claiming a repair.
- Original counterexamples are repaired within their documented subsets. Token domains/provider association, independent graph/package identities, immutable artifact metadata, editor/device budgets, broader distribution and CI/release policy remain later tasks. Historical red records and iOS Maestro evidence were reviewed, not rerun. No native/device acceptance, Effect dependency, runtime change, release/publish action or unrelated release-version change is included. Android remains last and M0.9 stays open.

Next recommended slice: repair direct generic NativeStyle reference typing for `style(base)` and `styleVariants({ state: base })`, with positive package/packed Node16/Bundler fixtures and both-emitter output regressions, while preserving primitive inference and inline negatives. Then re-audit M0.2 closure before proposing M1 Effect contracts. Begin only after user approval.


### 2026-09-14 — Direct generic references and M0.2 closure

Approved bounded continuation under ADR D1/D2. Complete native reference detection now runs before generic inline admission, so `style(base)` and direct `styleVariants` entries accept a generic `NativeStyle` result without revalidating it as a fresh declaration. Recursive generic composition checks keep inline entries within static authoring rules while preserving supported CSS border shorthand. This also repairs the newly demonstrated animated inline transform admission gap beside generic references. No runtime/emitter implementation, public API or dependency changed.

- Before repair, eight new positive direct-reference contracts failed typechecking and one animated-transform negative was unused. [Retained diagnostics and qualification](evidence/2026-09-14-direct-generic-references/qualification.json) distinguish the demonstrated failures from the subsequent nested-variant negative.
- Fresh `bun run check` passes 235 tests / 8,591 assertions across 35 files. Package and packed Node16/Bundler contracts cover direct/repeated generic references, per-entry primitive inference, nested compositions, CSS shorthand and existing widened/recursive forwarding forms; unsupported inline values remain rejected. Both emitters preserve exact values and tagged variant-map identity. The original unsuppressed closure-audit reproducer now passes in workspace and isolated packed consumers.
- Workspace and refreshed local-tarball Expo typechecking/JavaScript exports pass, with all three runtime maps qualified separately in each consumer. The retained isolated npm consumer reuses its Expo dependency installation. Storybook typechecking and the 20-page docs build pass. Preexisting release manifest/version/lockfile edits remain excluded.
- Re-audit closes M0.2 for the documented compiler composition/order subset, using the existing independent shorthand-family suites plus these direct-reference contracts. [Historical closure audit](assessments/2026-09-14-m0-closure-audit.md) retains its original result and records this subsequent promotion. M0 remains in progress with native Android acceptance deferred until last. These gates do not qualify arbitrary animated native authoring, all native properties, device RTL/layout, token domains or release performance. No new benchmark or native/device measurements, publication or push occurred.

Next recommended slice: M1.1 — verify one exact published Effect 4 version and its Schema/Codec/Optic APIs, record the chosen imports and package metadata, then pin it as an internal dependency while preserving ordinary consumer APIs. Begin only after user approval.


### 2026-09-14 — M1.1 exact Effect 4 dependency and API selection

Approved continuation under ADR D3/D4, with native Android acceptance deferred until last. Pin `effect@4.0.0-rc.115` as a package dependency and in the workspace lockfile. Live registry metadata records publication on September 11, 2026, MIT licensing, ESM exports and no declared dependencies/peers/engines. The registry stable tag remains Effect 3; the selected 4.x artifact is an exact release candidate, not a floating tag/range or snapshot. [Selection and import conventions](assessments/2026-09-14-effect4-api-selection.md) and [metadata/qualification](evidence/2026-09-14-effect4-selection/qualification.json) retain the exact artifact and installed source hashes.

- Nine executable upstream capability tests verify explicit finite/excess-field policies, typed service-free Codec views within Schema, distinct encode/decode representations, JSON codec derivation, nested immutable optics, schema-derived focuses, own-key optional lookup and explicit update failure handling. Independent seeded properties cover 100 codec and 100 lens-law cases; type contracts reject bad encoding types, nested keys and replacements. These probes do not define or migrate production Crumbs payloads.
- Fresh `bun run check` passes 244 tests / 9,239 assertions across 36 files, including public packed Node16/Bundler contracts and React-only runtime graph/denial checks. Frozen installation passes without changes. Public declarations import no Effect, and ordinary consumers require no Effect peer dependency, services or runners.
- Exact Effect subpaths execute from ESM and CommonJS callers on Node 24.15.0. CommonJS uses synchronous ESM interoperability; the selected artifact has no distinct CJS export. Qualification of the oldest supported tooling Node and emitted compiler/decoder loading rules remains M1.3; engines/peer ranges are unchanged.
- Workspace and refreshed isolated npm tarball consumers pass types, all three Expo JavaScript exports and runtime map checks. A separate source-map inspection finds zero Effect sources in each of the six application maps. Storybook typechecking and the 20-page docs build pass. The isolated consumer reuses its existing Expo dependency installation. No initialization/device benchmark or native acceptance is inferred from package installation or graph isolation.
- M1.1 closes; M1 remains in progress. Production schema/codec ingress, atomic optic updates, initialization footprints and calibrated budgets remain later tasks. No public API, production runtime/compiler code, push or publication changed. Preexisting release manifest and package/lockfile version edits remain excluded from this commit; only Effect dependency additions are staged from those two files.

Next recommended slice: M1.2 — define internal schemas for tagged native declarations/references, contract identity, structured diagnostics and an explicit artifact version, with deliberate finite/exact-field policies and valid/invalid codec contracts. Specify boundaries before wiring validation into compiler or runtime paths. Begin only after user approval.


### 2026-09-14 — M1.2 initial internal payload schemas and data codecs

Approved continuation under ADR D1–D3 on `effect@4.0.0-rc.115`. [Plan](superpowers/plans/2026-09-14-internal-payload-contracts.md) and [initial contract policies](assessments/2026-09-14-internal-payload-contracts.md) define schema-derived contract identity, distinct legacy/qualified token references, source paths, tagged native declaration shapes, structured diagnostics and a literal version-1 internal artifact envelope. Qualified references must match the enclosing identity tuple. New modules remain outside existing public emitted graphs; no authoring/compiler/provider call path changes.

- Test-first qualification initially failed because the new payload module was absent; [retained red and qualification](evidence/2026-09-14-internal-payload-contracts/qualification.json) identify that specific result without overstating historical behavior coverage. Ten new boundary tests exercise exact fields, versions/tags, finite/safe-integer numbers, structured error paths, static transforms/matrices/shadow offsets, complete identity mismatches, malformed JSON, getter/toJSON non-execution, sparse/decorated arrays, cycles, frozen/null-prototype inputs and input immutability.
- Independent shrinking properties run 150 ordered literal artifact cases, 100 different-owner reference cases and 100 mixed token/structured artifact cases under seeds 4121–4123. JSON parse/decode values are compared with independently constructed models; unknown-field and identity mutations fail. Every supported static transform operation has a positive control.
- Typed `encode` and explicit `encodeUnknown` share validated serialization. Internal positive/negative type contracts retain schema-derived readonly shapes and reject unsupported typed artifact versions, missing qualified identity, bad diagnostic codes/positions, identity mutation and using a distinct-representation schema with the shape codec helper.
- Deliberate policies: exact unknown fields; same-realm plain descriptor data; 64-container depth limit; finite numeric domains and finite angle/percentage text; safe integer metadata; signed-zero rejection at this initial JSON boundary. Existing public compiler/runtime negative-zero support is unchanged. Generic property syntax/shape validation does not replace native primitive/property or token-domain checks. Version 1 is a prototype data envelope, not a published compiler/runtime ABI. Canonical bytes, provider/package authentication, streaming/heap budgets and class/Proxy integration are not claimed.
- Fresh package qualification passes 254 tests / 11,221 assertions across 37 files. Workspace and refreshed isolated tarball Expo consumer types/JavaScript exports and all three runtime source maps pass separately in each consumer. Storybook typechecking and the 20-page docs build pass. Public declarations remain Effect-free, ordinary theme graphs remain React-only and packed Node16/Bundler public contracts pass; private source codec tests do not claim emitted CJS/oldest-Node qualification.
- M1.2 closes as the initial internal foundation. M1.3 retains actual emitted Effect loading, graph and initialization qualification before connecting boundaries; M2/M3 retain native ABI/property/domain/provider migration. M1 remains in progress, Android remains last, and no device/native performance, publication or push occurs. Preexisting release manifest/package/lockfile version edits are excluded.

Next recommended slice: M1.3 — qualify emitted Effect contract loading and dependency/initialization footprints separately from ordinary runtime graphs, including ESM/CommonJS and the oldest supported tooling Node. Identify absent external-theme entrypoint evidence explicitly before wiring or making performance claims. Begin only after user approval.


### 2026-09-14 — M1.3a Effect loading and host initialization audit

Approved continuation under ADR D3/D6. [Boundary assessment](assessments/2026-09-14-effect-boundary-audit.md) and [raw audit](evidence/2026-09-14-effect-boundary-audit/audit.json) retain exact Node 22.0.0 / 24.15.0 callers, `effect@4.0.0-rc.115`, source/emitted hashes, all public-entry direct graphs and 60 fresh-process module-load samples.

- External Effect CommonJS fails at the declared Node 22.0.0 floor with `ERR_REQUIRE_ESM`; external floor ESM and newer Node callers pass. The tooling JavaScript graph now bundles exact Effect/subpath imports. A private initial-contract candidate built with the same policy loads and passes codec receipts in both formats on both Node versions. No public export or validation wiring is added, and engines/peers remain unchanged.
- Ordinary runtime retains its separate React-only emitted graph. Expo map guards reject any Effect source with npm/Bun/Windows regression cases. The candidate is about 299 KB unminified local JS; ordinary `/theme` is about 11 KB. Host module-load/GC memory samples are not release Hermes/device budgets or production incremental compiler-overhead claims.
- Fresh package qualification passes 260 tests / 11,244 assertions across 38 files. Workspace and refreshed isolated packed Expo consumer types/exports and all six runtime maps pass; Storybook typechecking and the 20-page docs build pass. [Qualification receipts](evidence/2026-09-14-effect-boundary-audit/qualification.json) retain identities and gate results.
- M1.3a closes. Parent M1.3 remains open solely for M1.3b: no actual external-theme decoder exists to qualify. Repeat emitted graph/loading/initialization checks when real ingress is connected. M1 remains in progress; Android stays last. Unrelated release manifest/package/lockfile version edits remain excluded; no push/publication occurs.

Next recommended slice: **M1.4** — correct batch-average quantile labels and make raw/recipe baselines perform equivalent selection/default/compound work, separating cold/warm transforms and cached/uncached runtime paths. Retain M1.3b before admitting a future dedicated decoder. Begin only after user approval.


### 2026-09-14 — M1.4 honest host benchmark labels and equivalent workloads

Approved continuation under ADR D6/D12, based on `9285261`. [Workload assessment](assessments/2026-09-14-benchmark-workloads.md) and [five-run evidence](evidence/2026-09-14-benchmark-repair/summary.json) retain source/fixture hashes, raw batches, environment and separate first/warm transform output receipts.

- Metrics/console labels now identify batch means; raw durations and iterations per sample are retained. The internal JSON format is version 2. Rename `maxP95Ms` to `maxBatchMeanP95Ms` without changing existing seven host smoke ceilings or declaring M1.8 budgets calibrated.
- The handwritten raw selector now performs defaults, ordered variants, compounds and gap filtering. Output/reference parity is tested over 52 valid inputs, and each measured implementation starts the same independent cycle. Explicit undefined is a JS-only regression, not a public type widening.
- Separate uncached recipe/closure selection, setup-pre-resolved theme selection, per-call theme resolution plus selection, 240-export recomputation, fresh-process first transforms and warmed full transforms. Recipe result caching is not implemented; React memo hits/invalidation are explicitly unmeasured and remain lifecycle workloads for M1.5/M4. First-transform timing excludes process startup/imports, includes lazy compiler initialization, and is not cold process startup qualification.
- Five sequential retained host runs pass all existing smoke ceilings and all 60 first-transform output receipts. Three new ingress/cold scenarios remain unbudgeted. Historic raw/recipe ratios are not equivalent-work comparisons; no native/device improvement is inferred.
- Fresh `bun run check` passes 265 tests / 11,526 assertions across 39 files, package build/typechecking and packed public type/bundle isolation regressions. The 20-page docs build passes. [Qualification](evidence/2026-09-14-benchmark-repair/qualification.json) retains gate results; consumer apps are not rerun by this benchmark-only slice.
- M1.4 closes for the host repair. M1 remains in progress; M1.3b actual external-theme decoder is still absent/unqualified. Native Android remains last. Unrelated release manifest/package/lockfile version edits remain excluded; no push/publication occurs.

Next recommended slice: **M1.5a** — add repeatable static/themed list mount/unmount and theme-switch workloads to the Expo playground, with scenario size and run identity, to expose React lifecycle/memo behavior before calibrating release-device budgets. Begin only after user approval.


### 2026-09-14 — M1.5a Expo list lifecycle and theme-reference workloads

Approved continuation under ADR D6/D12, based on `7e0e879`. The public-API Expo playground now has a **Measure** journey with static/themed list scenarios, 25/100/1,000 requested rows and five fixed mount/rerender/theme-switch/unmount cycles. [Workload protocol and evidence](assessments/2026-09-14-expo-list-workloads.md) separate functional receipts from performance qualification.

- Themed lists use one stable-module `useThemedStyles` call per list; static lists use a hoisted StyleSheet. Each report includes source/version/mode/run identity, platform/dev/profiler availability, fixed FlatList configuration, ordered step observations, effect lifecycle counts and optional raw React render durations.
- Unit regressions validate plan order/configuration, absent/duplicate observations, impossible lifecycle counts and static/themed reference expectations. Live web runs verify same-theme memo reuse, theme-change replacement, stable static references and balanced list/row effects. A live web metadata failure was repaired by reporting native platform version unavailable where React Native Web omits it.
- Requested rows are not mounted/visible rows. Request-to-layout-effect timings are JS scheduling/commit delay; optional Profiler timings are render work, not frame or unmount timing. Balanced effect counts are not leak qualification. Instrumentation, development mode, virtualized batch scheduling and uncontrolled host conditions prevent calibrated release-device comparisons.
- Fresh package checks pass 269 tests / 11,556 assertions across 40 files. Workspace and refreshed isolated packed consumers pass types, all three production JavaScript exports and each set of runtime map guards; all six maps have zero Effect sources. Storybook types and the 20-page docs build pass. Six actual web cases verify 30 cycles / 120 observations, and leaving an unfinished run resets the panel. [Qualification](evidence/2026-09-14-expo-list-workloads/qualification.json) retains source/artifact identities and results.
- M1.5a closes as a repeatable functional workload foundation. Parent M1.5 remains open for recipe/scope/scroll/orientation/font-scale/memory workloads; M1.6/M1.8 retain release Hermes/device/budget qualification. M1.3b remains absent/unqualified. Native Android stays last. Unrelated release manifest/package/lockfile version edits are excluded; no push/publication occurs.

Next recommended slice: **M1.5b** — repeatable recipe-selection and nested-scope switch workloads in Expo, recording selection order and observed style/reference changes under the same run protocol. Begin only after user approval.

### 2026-09-14 — M1.5b Expo recipe and nested scope workloads

- Added five-cycle recipe defaults/explicit selections/compound overrides and independent parent/nested theme switches to Measure, retaining literal style oracles, actual hook identities, uncached recipe array observations, lifecycle counts and raw Profiler/commit receipts.
- Two final-source web runs verify ten cycles/seventy ordered steps. Package, workspace/packed Expo types and three JavaScript maps each, Storybook types and documentation build pass. Evidence and diagnostic observer repairs are retained in [the assessment](assessments/2026-09-14-expo-recipe-scope-workloads.md).
- Parent M1.5 remains open for scrolling, orientation/font scale and retained memory. Development web receipts do not qualify native frames, release Hermes/device performance or memory. Android native remains last; M1.3b remains absent/unqualified. No push/publication and unrelated release edits are excluded.

Next recommended slice: **M1.5c** — repeatable list scrolling with observed offset/visible-row receipts and explicit completion/cancellation. Begin only after approval.

### 2026-09-14 — M1.5c Expo scrolling callback workloads

- Added five middle/end/top scroll cycles for static/themed lists at 25/100/1,000 rows. Independent fixed-geometry targets require fresh scroll and viewability callbacks, matching offsets/content/viewport/visible rows and a settling interval; commands do not count as observations.
- Terminal completion, user/navigation cancellation and deadline reports retain raw observations, callback history, identity and Profiler data. Negative tests prevent stale, partial or late receipts from closing the run.
- Final development web evidence covers six cases/thirty cycles/ninety destinations plus user/navigation cancellation. Package checks, workspace/packed Expo types and three maps each, Storybook types and docs pass; see [assessment and evidence](assessments/2026-09-14-expo-scroll-workloads.md).
- Programmatic callback receipts do not qualify native touch/fling, painted visibility, frame/retained-memory budgets or release Hermes devices. Parent M1.5 and M1.3b remain open; Android native remains last. No push/publication or unrelated release version edits.

Next recommended slice: **M1.5d** — orientation/font-scale context-change workloads, recording actual React Native context and hook reference behavior. Browser dimension evidence must remain distinct from native font-scale/device acceptance. Begin only after approval.

### 2026-09-14 — M1.5d actual RN context observation workloads

- Added five-cycle orientation/font-scale baseline/rerender/change/restore workloads using actual useWindowDimensions values and a constant-theme stable-module hook. Ordered context completion and hook identity acceptance are separate, with deadline/user/navigation terminal reports.
- Two opposite-baseline web orientation runs verify forty steps. A web font-scale run observes real resizes but constant fontScale=1 and times out incomplete; synthetic unit-test fontScale transitions are not native receipts. See [assessment/evidence](assessments/2026-09-14-expo-context-workloads.md).
- Package, workspace/packed Expo types and three runtime maps each, Storybook and docs pass. No library API/dependency changes, push/publication or staging of preexisting release version edits.
- Native rotation, OS font-scale/text appearance and release/device/frame/retained-memory gates remain open. The themed hook depends on module/theme identity; this workload does not implement responsive conditions. Native Android stays last; M1.3b remains absent/unqualified.

Next recommended slice: **M1.5e** — retained-memory protocol and repeatable mount/unmount workload with explicit GC/runtime/device provenance and independent leak-admission rules. Balanced lifecycle counts remain distinct from leak proof. Begin only after approval.

### 2026-09-15 — M1.5e retained-memory workload and fail-closed admission

- Added 25-cycle public-themed tree mount/unmount workloads at 100/1,000 rows with six post-unmount memory checkpoints, exact lifecycle counts, memory source/GC provenance, cancellation-safe async sampling and raw Profiler/observation receipts.
- Admission separates protocol/lifecycle/readings/GC/source/budget. Metrics are retained bytes, least-squares growth per cycle and p95 positive delta. No M1.8 budget is applied, so diagnostic browser readings cannot qualify memory. Property and negative tests fail closed.
- Final web evidence covers fifty container and 27,500 row mount/cleanup pairs plus user/navigation cancellation. Package, workspace/packed Expo types and three maps each, Storybook and docs pass; see [assessment/evidence](assessments/2026-09-15-expo-memory-workloads.md).
- Controlled forced-GC, native Hermes/device/build provenance, approved budgets and repeated release samples remain required. Balanced cleanup is not leak proof. Native Android stays last; M1.3b remains absent/unqualified. No push/publication or unrelated release edits.

Next recommended slice: **M1.7a** — reproducible editor/typechecker scale fixtures for current token/theme/recipe APIs at 100, 1,000 and 10,000 tokens, with slot/condition coverage explicitly deferred until those APIs exist. Begin only after approval.

### 2026-09-15 — M1.7a reproducible editor and typechecker scale baseline

- Added deterministic public-API projects at exactly 100, 1,000 and 10,000 token leaves, each with a complete contract/theme, representative style variants and a two-axis recipe. Hashes and explicit unsupported condition/slot-recipe coverage make drift and omissions visible.
- Five fresh processes per compiler/scale record wall/check time, memory, types and instantiations for TypeScript 6.0.3 and tsgo 7.0.0-dev.20260519.1. Five fresh language-service processes per scale record semantic analysis plus first/warm member completion; every run returns the exact token count. See [assessment and raw evidence](assessments/2026-09-15-editor-scale.md).
- Package build, typecheck and all 292 tests pass. Dedicated scale fixtures are excluded from routine package typechecking. No dependency, runtime or public API change, push/publication or staging of unrelated release edits occurs.
- This uncontrolled-host baseline has no approved budget and does not qualify editor UI, incremental edits, native/device performance, conditions or slot recipes. Parent M1.7 remains open. Native Android stays last.

Next recommended slice: **M1.8a** — define a versioned machine-readable budget schema and measurement protocol around the recorded M1 baselines, while leaving threshold values pending explicit reviewer approval. Begin only after approval.

### 2026-09-15 — M1.8a fail-closed performance budget contract

- Added a versioned Effect Schema registry spanning all nine required performance domains and 17 named metrics. Missing device/rebuild/allocation work, diagnostic retained-memory evidence and recorded host/editor baselines remain distinct states.
- Closed evidence selectors re-derive all twelve recorded values from retained JSON. Unknown fields/versions, duplicate IDs, absent domains, insufficient repetitions, baseline drift and invalid active/approved states fail closed.
- `budgets:validate` confirms registry/evidence integrity without claiming a performance run. `budgets:readiness` fails until all baselines and explicit threshold approvals are present. Both keep current-checkout performance qualification separate; see [assessment and protocol](assessments/2026-09-15-performance-budget-contract.md).
- Every threshold remains pending. Existing local smoke ceilings are not promoted. No dependency, runtime/public API change, push/publication or staging of unrelated release edits occurs. Native Android stays last and parent M1.8 remains open.

Next recommended slice: **M1.8b** — add current-measurement adapters and comparison reports for recorded host/editor domains, then prepare a threshold review packet from retained noise envelopes without activating the registry. Begin only after approval.

### 2026-09-15 — M1.8b current host comparison and threshold review packet

- Added sequential current-host measurement across the exact Node 22/current Node boundary matrix, five native-style benchmark processes and five editor processes at each scale. Raw reports, adapted sample series and comparison output are retained.
- Environment and scenario fingerprints cover Effect/build/runtime identities, benchmark protocol/fixtures/sampling shape and the editor fixture manifest. Mismatches, insufficient repetitions and pending thresholds remain incomplete; approved gates require both absolute and relative limits.
- All twelve recorded metrics compared under exact environments. Current medians were unchanged or lower, but uncontrolled host observations are not performance claims. Runtime initialization and current tsc memory show high noise; see [assessment and evidence](assessments/2026-09-15-performance-budget-comparison.md).
- Mechanical threshold candidates remain unapproved. Runtime initialization needs isolation or remeasurement; deterministic byte/type counters need an explicit growth policy. Missing device/allocation/incremental and diagnostic memory gates keep registry readiness and performance qualification false.

Next recommended slice: **M1.8c** — review the twelve host/editor candidates metric by metric, remeasure or redesign the noisy runtime-initialization gate, and commit only explicitly accepted thresholds. Keep the registry pending for missing device, allocation, retained-memory and incremental-rebuild evidence. Begin only after approval.

### 2026-09-15 — M1.8c approved host/editor thresholds

- Replaced the combined runtime-initialization maximum with four runtime/format gates. Each excludes one warmup process, retains 15 fresh-process samples and compares the median; individual min/max values and the noisy Node 22 CJS outlier remain visible.
- Recorded explicit absolute and relative limits for all fifteen reproducible host/editor metrics. Runtime bytes and compiler instantiation counts permit zero growth; timing and process-memory margins reflect the retained noise envelopes and intended sensitivity. See [decision record and evidence](assessments/2026-09-15-performance-threshold-decisions.md).
- Review output now separates approved decisions from future mechanical candidates. Exact environment/scenario matching, minimum repetitions and both-limit evaluation continue to fail closed.
- Four baselines remain missing and retained memory remains diagnostic, so registry readiness and whole-registry performance qualification remain false. Parent M1.8 stays open. Native Android stays last; no dependency, runtime/public API, push/publication or unrelated release edit is included.

Next recommended slice: **M1.8d** — add a reproducible actual-edit Metro incremental-rebuild baseline and propose its threshold from retained host/Expo evidence. Keep device frames, allocation and controlled retained-memory work pending, with Android last. Begin only after approval.

### 2026-09-15 — M1.8d Expo/Metro actual-edit baseline

- Added a dedicated Expo playground entry and a fail-closed runner for direct `.css.ts` edits through Metro's iOS development bundle. One warmup edit is excluded; five retained edits include file-write, a fixed 75 ms watcher-settle interval and receipt of a full bundle containing all four new padding longhands and none of the prior values.
- The retained baseline median is 125.005 ms with a 124.895–125.535 ms envelope (0.424% maximum deviation). Its mechanical review candidate is 137.506 ms absolute and 10% relative; it remains unapproved pending explicit review. See [assessment and evidence](assessments/2026-09-15-metro-incremental.md).
- The dependency-only control processed the changed module but preserved the importing cached StyleSheet value. This is explicit failing evidence for M2.7; it is excluded from the direct-edit baseline, corrects the former transformer comment, and requires a Metro restart in the playground until the artifact architecture supplies complete invalidation.
- Exact Expo 56, Metro 0.84, React Native 0.85, host, protocol and fixture identities guard comparison. Three device baselines remain missing and retained memory remains diagnostic, so registry readiness and whole-registry performance qualification stay false. Native Android remains last.

Next recommended slice: **M1.8e** — review the stable direct-edit candidate (137.506 ms absolute and 10% relative) and, if accepted, record its approval without activating the registry. Then close the already-built M1.9 playground capabilities before starting M2 native IR specification work. Begin only after approval.

### 2026-09-15 — M1.8e approved Metro direct-edit threshold

- Recorded explicit reviewer approval of 137.506 ms absolute and 10% relative limits for the Expo/Metro direct `.css.ts` edit metric. The approval preserves the M1.8d baseline, protocol and dependency-only failing control.
- Re-evaluated the retained exact-environment run under the approved policy. The 126.227 ms current median is 0.978% above baseline and passes both limits; all sixteen recorded host/editor metrics now pass and the review packet has no remaining candidates. See [approval record and evidence](assessments/2026-09-15-metro-incremental-threshold-approval.md).
- Three device/allocation baselines remain missing and retained memory remains diagnostic, so registry status stays `thresholds-pending-review`, readiness remains false and whole-registry performance qualification cannot pass. Parent M1.8 remains open. No workload was remeasured to manufacture the policy outcome.
- Dependency-only edits still leave the parent StyleSheet transform stale and remain a red M2.7 requirement. Native Android stays last; no dependency, public API, push or publication is included.

Next recommended slice: **M1.9a** — audit the already-built playground workspace, packed and published modes plus source/version receipts against M1.9, close the satisfied contract, and isolate any newest-SDK upgrade work as a separate configuration. Begin only after approval.

### 2026-09-15 — M1.9a Expo playground closure

- Closed M1.9 after auditing the public-API playground's workspace, packed and published paths, exact source/version receipts, committed Expo 56 resolutions and repeatable workload coverage. Contract tests now keep the playground aligned with the internal Storybook and require the exact supported lockfile resolutions. See the [assessment and retained evidence](assessments/2026-09-15-playground-closure.md).
- Workspace and packed Expo 56 consumers passed typechecking, iOS/Android/web production export and three runtime source-map checks. The packed artifact was installed outside workspace resolution and retained with its SHA-256. The live `alpha` tag resolved exactly to `0.1.2-alpha.1`, installed outside the workspace and then failed current playground typing because the app dogfoods composition behavior added after that artifact. This is retained distribution-drift evidence; no publication or peer override was used.
- Added a nested exact Expo 57.0.22 / React Native 0.86.3 candidate and repeatable runner. It refreshes npm `latest` plus official blank-template metadata, rejects stale configuration, packs the current library and requires the expected npm `ERESOLVE` at Crumbs' `>=0.85 <0.86` peer boundary. The isolation contract passed; Expo 57 remains unsupported and support documentation was not broadened.
- M0.9 remains open solely on the parked Android native acceptance. Device performance, missing budget domains, future slot/condition editor fixtures and the eventual published-artifact refresh remain separate gates. No dependency, public runtime API, push, publication or unrelated release-version edit is included.

Next recommended slice: **M2.1a** — write the native IR semantic contract for ordered declarations/composition, style maps, primitive provenance, token references and export metadata, including equality and diagnostic rules, before introducing implementation nodes. Begin only after approval.

### 2026-09-15 — M2.1a native IR semantic contract

- Accepted the internal [native IR v1 semantic contract](specifications/native-ir-v1.md), separating it from both the M1.2 prototype envelope and the future external artifact ABI. It defines immutable tagged modules/definitions/exports, qualified ownership, primitive domains, native values/token references, ordered normalization, style maps, recipes, provenance, equality and deterministic diagnostics.
- Added an independent test-only evaluator and seeded property laws. Composition is associative with an empty identity, explicitly noncommutative, last-winner and dead-dependency aware. Semantic equality ignores provenance/grouping/record key order while preserving primitive domains, array order and signed zero. Reference failures accumulate, and recipes retain base/variant-definition/compound-array order.
- M2.1 is complete as a specification gate. No production node, compiler route, public API, runtime dependency, artifact encoding, performance claim, push/publication or unrelated release-version edit is included. Android remains parked until last. See the [assessment and evidence](assessments/2026-09-15-native-ir-semantics.md).

Next recommended slice: **M2.2a** — introduce the production IR types/schema and route the scalar `opacity` family through native capture, normalization and both emitters, with literal/token/order/provenance diagnostics checked against the independent oracle. Preserve the legacy path for every unmigrated property and reject malformed opacity IR without fallback. Begin only after approval.

### 2026-09-19 — M2.2a production opacity IR vertical

- Added an internal Crumbs authoring marker and an Effect Schema production boundary for immutable opacity declaration blocks. The block keeps canonical primitive domains, package-relative POSIX source IDs, class/property paths, authored and canonical property names, finite literals including signed zero, and an explicitly legacy unqualified token node pending M3 identity work.
- Crumbs `style`, primitive helpers, style variants and recipes capture opacity before browser CSS serialization. Ordered normalization intersects primitive domains and selects the last declaration. Both StyleSheet and plain-object emitters preserve signed zero and legacy token references. Unmarked vanilla-extract opacity and every unmigrated property continue through the qualified legacy converter.
- Invalid marked opacity, accessors, non-finite values, object payloads and malformed token strings fail with `CRUMBS_IR_INVALID_VALUE` before CSS conversion, including permissive diagnostic mode. There is no new-to-legacy fallback. Seeded generated literal/token compositions agree with the independent M2.1 oracle; exact-field schema mutations and both emitters have direct tests.
- Full qualification passed 326 tests with 12,957 assertions, package/Storybook typechecking, workspace Expo web/iOS/Android exports and all three runtime source-map checks. Host smoke benchmark ceilings passed. The performance registry remains intentionally unready because device frame/allocation baselines are missing and retained memory is diagnostic. No public API, external artifact ABI, qualified M3 token identity, caching, push, publication or Android native acceptance is included. See the [assessment and evidence](assessments/2026-09-19-native-ir-opacity.md).

Next recommended slice: **M2.2b** — migrate the unitless numeric layout family (`zIndex`, `elevation`, `flexGrow` and `flexShrink`) through the same production IR, adding explicit per-property primitive-domain and finite-range admission plus independent order/token differential tests. Keep length, colour, structured values and vanilla-extract adapter migration on their existing paths. Begin only after approval.

### 2026-09-19 — M2.2b unitless numeric layout IR

- Generalized the first production declaration block from a single opacity tuple to a non-empty ordered numeric declaration family. Exact Effect Schema admission now verifies property/provenance agreement and rejects primitive domains that are incompatible with the declarations, independently of capture.
- Migrated `zIndex`, `flexGrow` and `flexShrink` with their installed React Native `FlexStyle` domain (`view`, `text`, `image`). Migrated `elevation` for `view` and `text`; React Native 0.85 exposes it on `ViewStyle`, inherited by `TextStyle`, but not `ImageStyle`. All four accept finite numbers, including negative and signed-zero values allowed by the public number types, or legacy symbolic tokens. Crumbs image elevation fails with `CRUMBS_IR_INVALID_PROPERTY` before CSS serialization.
- Ordered normalization intersects primitive domains and retains the last declaration for each property, including mixed-property blocks. Seeded generated compositions agree with the independent M2.1 evaluator. Direct cases cover exact-node mutations, forged provenance/domain combinations, accessors, non-finite values, malformed tokens, every helper family, both emitters and the unmarked vanilla-extract legacy route.
- Full package qualification passed 334 tests with 13,219 assertions. This slice does not migrate `flex`, lengths, colours, structured values or the vanilla-extract adapter, and it does not add qualified token identity, a public API or an external artifact ABI. See the [assessment and evidence](assessments/2026-09-19-native-ir-unitless-numeric.md).

Next recommended slice: **M2.2c** — migrate native numeric `flex` as its own IR family, preserving React Native's scalar meaning rather than browser shorthand semantics and proving its ordering against `flexGrow`, `flexShrink` and `flexBasis`. Keep `flexBasis`, length values and the compatibility adapter on their current paths. Begin only after approval.

### 2026-09-19 — M2.2c scalar native flex IR

- Added scalar `flex` to production native IR admission for view, text and image styles. Finite literals and legacy Crumbs token references retain their authored identity and provenance; CSS keywords, multipart shorthand strings, nonfinite values, objects, arrays and accessors fail at the IR boundary without legacy fallback.
- Preserved React Native semantics: `flex` remains one independent Yoga field and does not expand into browser grow/shrink/basis defaults. `flexGrow` and `flexShrink` travel through the same numeric IR block, while unmigrated `flexBasis` stays on the qualified legacy route. Only later declarations of the same field replace earlier values.
- Dedicated direct, schema, seeded 100-case ordering and end-to-end tests cover every primitive, both emitters, generic and primitive helpers, variants, recipes, tokens and explicit siblings. Existing flex compatibility tests now expect IR-owned diagnostics for malformed Crumbs authoring.
- Full package qualification passed 340 tests with 13,550 assertions. No public API, external artifact ABI, qualified token identity, flex-basis migration, push, publication or native-device acceptance is included. See the [assessment and evidence](assessments/2026-09-19-native-ir-flex.md).

Next recommended slice: **M2.2d** — migrate `flexBasis` as the first scalar length-or-auto IR property, defining literal unit normalization and token-domain admission without changing scalar `flex` semantics. Keep the broader spacing/size length family and vanilla-extract adapter separate. Begin only after approval.

### 2026-09-19 — M2.2d flex-basis scalar IR

- Renamed the production declaration path from numeric to scalar before admitting nonnumeric values. Its Effect Schema now assigns property-specific value domains: numeric properties still admit only finite numbers or legacy tokens, while `flexBasis` admits finite point numbers, exact `auto`, finite percentage strings and legacy tokens.
- Migrated `flexBasis` for view, text and image helpers before CSS serialization. Numeric values retain React Native point semantics rather than acquiring a `px` string; percentages retain their exact string representation. CSS `px` strings, bare numeric strings, other keywords, malformed/nonfinite percentages, animated objects, arrays and null fail without fallback.
- Fixed scalar freezing and lowering to distinguish immutable token records from string literals. Normalization remains last-winner per property, so `flexBasis`, `flex`, `flexGrow` and `flexShrink` survive independently through both emitters.
- Dedicated schema, seeded 100-case ordering, helper/composition and compatibility tests join the established flex and earlier IR suites. Full package qualification passed 347 tests with 13,808 assertions. See the [assessment and evidence](assessments/2026-09-19-native-ir-flex-basis.md).

Next recommended slice: **M2.2e** — migrate the `width`, `height`, `minWidth`, `minHeight`, `maxWidth` and `maxHeight` DimensionValue family through scalar IR, reusing the qualified points/auto/percentage domain while proving min/max and composition order independently. Keep spacing, inset aliases and the vanilla-extract adapter separate. Begin only after approval.

### 2026-09-19 — M2.2e size DimensionValue IR

- Migrated `width`, `height`, `minWidth`, `minHeight`, `maxWidth` and `maxHeight` before CSS serialization for view, text and image helpers. Each property uses the M2.2d static DimensionValue domain: finite point numbers, exact `auto`, finite percentages or legacy token references.
- Centralized DimensionValue property classification so Effect Schema and capture apply the same domain while numeric-only scalar properties remain closed to strings. Invalid Crumbs values fail with `CRUMBS_IR_INVALID_VALUE`; unmarked vanilla-extract sizes stay on the compatibility route.
- Direct tests prove capture ownership rather than relying on unchanged end output. A seeded 100-case independent last-winner evaluator covers mixed size properties, while both emitters cover generic and primitive helpers, composition, variants, recipes and tokens. Earlier flex-basis and unitless tests now record that width travels through IR.
- Full package qualification passed 355 tests with 14,025 assertions. No animated-node/null admission, shorthand/inset migration, qualified token identity, public API or external artifact ABI is included. See the [assessment and evidence](assessments/2026-09-19-native-ir-dimensions.md).

Next recommended slice: **M2.2f** — migrate the exact position-edge longhands (`top`, `right`, `bottom`, `left`, `start`, `end`) through scalar IR, preserving independent physical/logical fields before tackling Crumbs inset aliases and their canonical expansion. Begin only after approval.

### 2026-09-19 — M2.2f position-edge DimensionValue IR

- Migrated `top`, `right`, `bottom`, `left`, `start` and `end` before CSS serialization for view, text and image helpers. Each uses the qualified static DimensionValue domain: finite point numbers, exact `auto`, finite percentages or legacy tokens.
- Physical and logical declarations retain independent property identity and last-winner order. This slice does not infer direction, collapse `start` into `left`, or expand Crumbs inset aliases. Signed zero now survives direct IR capture instead of legacy CSS string conversion.
- Direct ownership, schema mutation, rejected-value, all-property/all-primitive and seeded 100-case independent order tests cover the family. Both emitters cover generic and primitive helpers, composition, variants, recipes and tokens; the established inset oracle remains green.
- Full package qualification passed 363 tests with 14,234 assertions. No alias expansion, direction-aware conflict policy, qualified token identity, public API or external artifact ABI is included. See the [assessment and evidence](assessments/2026-09-19-native-ir-position-edges.md).

Next recommended slice: **M2.2g** — migrate the seven Crumbs inset aliases (`inset`, inline/block pairs and inline/block start/end) into canonical edge declarations in IR, proving alias/longhand precedence without resolving physical/logical fields against layout direction. Begin only after approval.

### 2026-09-19 — M2.2g inset-alias IR expansion

- Migrated all seven Crumbs inset aliases before CSS serialization. `inset` expands to physical edges; inline/block pairs expand to their documented canonical fields; inline start/end remain native `start`/`end`; block start/end become `top`/`bottom`.
- Each canonical declaration retains both the authored alias and canonical property in immutable provenance. Effect Schema accepts only declared alias-to-canonical expansion pairs, so forged paths fail at the IR boundary. Exact longhands and expanded aliases then share canonical last-winner normalization.
- Focused tests cover every expansion, mixed alias/longhand ordering, invalid provenance and the unmarked vanilla-extract route. The established generated inset oracle and both emitter fixtures remain green. Full package qualification passed 367 tests across 56 files with 14,288 assertions.
- This slice adds no layout-direction inference, Animated/null admission, qualified token identity, public API or external artifact ABI. React Native retains responsibility for resolving physical and logical fields. See the [assessment and evidence](assessments/2026-09-19-native-ir-inset-aliases.md).

Next recommended slice: **M2.2h** — migrate the native `gap`, `rowGap` and `columnGap` family through scalar IR, expanding broad `gap` into canonical row/column declarations and proving broad/axis precedence against the existing independent spacing oracle. Keep padding/margin aliases and layout-direction behavior separate. Begin only after approval.

### 2026-09-19 — M2.2h gap-family scalar IR

- Migrated `gap`, `rowGap` and `columnGap` before CSS serialization for view, text and image helpers. Static admission accepts finite point numbers, finite percentages and legacy token references; `auto`, CSS unit strings, arbitrary strings, nonfinite values and structured values fail without fallback.
- Generalized the provenance-validated alias expansion table shared with inset. Broad `gap` emits ordered `rowGap` and `columnGap` declarations, while exact axis fields retain empty expansion paths. Schema decoding rejects undeclared property pairs and forged expansion paths.
- A seeded 100-case independent evaluator proves broad/axis last-winner order. Direct ownership, primitive-domain, rejected-value, schema mutation, helper/composition, variant, recipe, token and compatibility cases cover both emitters; the established spacing oracle remains green.
- Full package qualification passed 375 tests across 57 files with 14,450 assertions. No padding/margin migration, qualified token identity, public API or external artifact ABI is included. See the [assessment and evidence](assessments/2026-09-19-native-ir-gap.md).

Next recommended slice: **M2.2i** — migrate physical padding longhands plus `padding`, `paddingHorizontal` and `paddingVertical` into canonical scalar IR declarations, proving broad/pair/side order against the spacing oracle. Keep logical padding aliases and margin migration separate. Begin only after approval.

### 2026-09-19 — M2.2i physical padding scalar IR

- Migrated four physical padding longhands plus `padding`, `paddingHorizontal` and `paddingVertical` for view, text and image. Finite points, `auto`, percentages and legacy tokens retain native DimensionValue semantics.
- Broad and pair aliases expand with schema-validated provenance before canonical last-winner normalization. A seeded 100-case evaluator covers broad/pair/side order; the established spacing oracle remains green.
- Full qualification passed 380 tests across 58 files with 14,631 assertions. Logical padding, margin, qualified tokens and the public artifact ABI remain separate. See [evidence](assessments/2026-09-19-native-ir-padding.md).

Next recommended slice: **M2.2j** — migrate logical padding fields and aliases while retaining native `paddingStart`/`paddingEnd` independently from physical sides. Begin only after approval.

### 2026-09-19 — M2.2j logical padding scalar IR

- Migrated `paddingStart`, `paddingEnd` and six inline/block aliases with schema-validated expansion provenance. Logical start/end remain independent from physical sides; no direction inference was added.
- Focused qualification passed 20 tests with 598 assertions; full qualification passed 385 tests across 59 files with 14,748 assertions. See [evidence](assessments/2026-09-19-native-ir-logical-padding.md).

Next recommended slice: **M2.2k** — migrate physical margin longhands plus broad and horizontal/vertical aliases, retaining negative DimensionValue support. Begin only after approval.

### 2026-09-19 — M2.2k physical margin scalar IR

- Migrated physical margin sides plus `margin`, `marginHorizontal` and `marginVertical`, retaining signed finite points, percentages, `auto` and tokens. Alias provenance is schema validated before canonical last-winner normalization.
- Focused qualification passed 20 tests with 493 assertions; full qualification passed 390 tests across 60 files with 14,929 assertions. See [evidence](assessments/2026-09-19-native-ir-margin.md).

Next recommended slice: **M2.2l** — migrate logical margin fields and inline/block aliases without collapsing native start/end into physical sides. Begin only after approval.

### 2026-09-19 — M2.2l logical margin scalar IR

- Migrated `marginStart`, `marginEnd` and six inline/block aliases with validated provenance and no layout-direction inference.
- Focused qualification passed 20 tests with 598 assertions; full qualification passed 395 tests across 61 files with 15,046 assertions. See [evidence](assessments/2026-09-19-native-ir-logical-margin.md).

Next recommended slice: **M2.2m** — migrate physical border-width longhands and broad `borderWidth` expansion with finite numeric/token admission. Begin only after approval.

### 2026-09-19 — M2.2m physical border-width scalar IR

- Migrated `borderWidth` and four physical side widths across every primitive. Broad width expands with validated provenance; static admission is finite numbers or legacy tokens only.
- Focused qualification passed 19 tests with 549 assertions; full qualification passed 400 tests across 62 files with 15,210 assertions. See [evidence](assessments/2026-09-19-native-ir-border-width.md).

Next recommended slice: **M2.2n** — migrate logical `borderStartWidth` and `borderEndWidth` as independent exact fields before considering logical width aliases. Begin only after approval.

### 2026-09-19 — M2.2n logical border-width scalar IR

- Migrated exact `borderStartWidth` and `borderEndWidth` with finite-number/token admission and no direction inference or alias expansion.
- Focused qualification passed 20 tests with 590 assertions; full qualification passed 405 tests across 63 files with 15,336 assertions. See [evidence](assessments/2026-09-19-native-ir-logical-border-width.md).

Next recommended slice: **M2.2o** — migrate physical border colors plus broad `borderColor`, introducing the first color-valued scalar IR domain. Begin only after approval.

### 2026-09-19 — M2.2o physical border-color scalar IR

- Introduced property-specific non-empty native color strings and migrated `borderColor` plus four physical sides. Tokens remain distinct nodes; other scalar families remain closed to arbitrary strings.
- Focused qualification passed 19 tests with 583 assertions; full qualification passed 410 tests across 64 files with 15,487 assertions. See [evidence](assessments/2026-09-19-native-ir-border-color.md).

Next recommended slice: **M2.2p** — migrate exact logical border color fields (`borderStartColor`, `borderEndColor`) independently from physical sides. Begin only after approval.

### 2026-09-19 — M2.2p logical border-color scalar IR

- Migrated exact `borderStartColor` and `borderEndColor` through the hardened color domain without aliases or direction inference.
- Focused qualification passed 20 tests with 573 assertions; full qualification passed 415 tests across 65 files with 15,609 assertions. See [evidence](assessments/2026-09-19-native-ir-logical-border-color.md).

Next recommended slice: **M2.2q** — migrate physical border radii plus broad `borderRadius`, preserving finite numeric/token admission and canonical corner precedence. Begin only after approval.

### 2026-09-19 — M2.2q physical border-radius scalar IR

- Migrated `borderRadius` and four physical corners across every primitive. Broad radius expands with validated provenance; finite numbers and legacy tokens are admitted.
- Focused qualification passed 17 tests with 573 assertions; full qualification passed 420 tests across 66 files with 15,773 assertions. See [evidence](assessments/2026-09-19-native-ir-border-radius.md).

Next recommended slice: **M2.2r** — migrate the four exact logical corner-radius fields while keeping them independent from physical corners. Begin only after approval.

### 2026-09-19 — M2.2r logical corner-radius scalar IR

- Migrated `borderStartStartRadius`, `borderStartEndRadius`, `borderEndStartRadius` and `borderEndEndRadius` across every primitive with finite-number/token admission. Exact logical fields remain independent from physical corners, with no aliases or direction inference.
- Focused qualification passed 20 tests with 612 assertions; full qualification passed 425 tests across 67 files with 15,921 assertions. See [evidence](assessments/2026-09-19-native-ir-logical-border-radius.md).

Next recommended slice: **M2.2s** — migrate the four semi-logical corner-radius fields (`borderTopStartRadius`, `borderTopEndRadius`, `borderBottomStartRadius`, `borderBottomEndRadius`) as independent exact fields. Begin only after approval.

### 2026-09-19 — M2.2s semi-logical corner-radius scalar IR

- Migrated `borderTopStartRadius`, `borderTopEndRadius`, `borderBottomStartRadius` and `borderBottomEndRadius` across every primitive with finite-number/token admission. Physical, fully logical and semi-logical corner identities remain independent.
- Focused qualification passed 25 tests with 760 assertions; full qualification passed 430 tests across 68 files with 16,069 assertions. See [evidence](assessments/2026-09-19-native-ir-semi-logical-border-radius.md).

Next recommended slice: **M2.2t** — migrate `backgroundColor` through the established color scalar domain, with its exact primitive coverage and no widening of numeric families. Begin only after approval.

### 2026-09-19 — M2.2t background-colour scalar IR

- Migrated `backgroundColor` across view, text and image through the existing non-empty colour string/token domain. Exact provenance and deterministic last-winner ordering are retained without widening numeric or DimensionValue declarations.
- Focused qualification passed 38 tests with 416 assertions; full qualification passed 435 tests across 69 files with 16,183 assertions. See [evidence](assessments/2026-09-19-native-ir-background-color.md).

Next recommended slice: **M2.2u** — migrate text `color` through the established colour scalar domain with a text-only primitive contract. Begin only after approval.

### 2026-09-19 — M2.2u text-colour scalar IR

- Migrated `color` through the non-empty colour string/token domain with a text-only primitive contract. Effect Schema decoding now validates every declaration against the shared per-property primitive table instead of a property-specific exception.
- Focused qualification passed 51 tests with 794 assertions; full qualification passed 440 tests across 70 files with 16,298 assertions. See [evidence](assessments/2026-09-19-native-ir-text-color.md).

Next recommended slice: **M2.2v** — migrate image-only `tintColor` through the established colour scalar domain and reuse the hardened primitive decoder contract. Begin only after approval.

### 2026-09-19 — M2.2v image tint-colour scalar IR

- Migrated `tintColor` through the non-empty colour string/token domain with an image-only primitive contract. Capture and Effect Schema decoding reject view/text use and forged primitive domains consistently.
- Focused qualification passed 56 tests with 909 assertions; full qualification passed 445 tests across 71 files with 16,413 assertions. See [evidence](assessments/2026-09-19-native-ir-tint-color.md).

Next recommended slice: **M2.2w** — migrate image-only `overlayColor` through the established colour and primitive-domain contracts. Begin only after approval.

### 2026-09-19 — M2.2w image overlay-colour scalar IR

- Migrated `overlayColor` through the non-empty colour string/token domain with an image-only primitive contract. Capture and Effect Schema decoding reject view/text use and forged primitive domains consistently.
- Focused qualification passed 61 tests with 1,024 assertions; full qualification passed 450 tests across 72 files with 16,528 assertions. See [evidence](assessments/2026-09-19-native-ir-overlay-color.md).

Next recommended slice: **M2.2x** — migrate `shadowColor` through the established colour domain with the exact installed primitive coverage inherited from React Native ShadowStyleIOS. Begin only after approval.

### 2026-09-19 — M2.2x shadow-colour scalar IR

- Migrated `shadowColor` through the non-empty colour string/token domain across view, text and image, matching ShadowStyleIOS inheritance in the installed React Native types.
- Focused qualification passed 66 tests with 1,138 assertions; full qualification passed 455 tests across 73 files with 16,642 assertions. See [evidence](assessments/2026-09-19-native-ir-shadow-color.md).

Next recommended slice: **M2.2y** — migrate finite numeric/token `shadowOpacity` and `shadowRadius` through scalar IR with their inherited view, text and image primitive coverage. Begin only after approval.

### 2026-09-19 — M2.2y numeric shadow scalar IR

- Migrated `shadowOpacity` and `shadowRadius` as independent finite-number/token declarations across view, text and image. Values retain exact identity and are not compiler-clamped; structured `shadowOffset` remains owned by the structured-value pipeline.
- Focused qualification passed 31 tests with 944 assertions; full qualification passed 460 tests across 74 files with 16,768 assertions. See [evidence](assessments/2026-09-19-native-ir-shadow-numeric.md).

Next recommended slice: **M2.2z** — migrate text-only `textShadowColor` and `textShadowRadius` through their established colour and finite numeric/token domains while retaining structured `textShadowOffset` independently. Begin only after approval.

### 2026-09-19 — M2.2z text-shadow scalar IR

- Migrated text-only `textShadowColor` and `textShadowRadius` through the colour and finite numeric/token domains respectively. Structured `textShadowOffset` remains independently owned by the structured-value pipeline.
- Focused qualification passed 28 tests with 805 assertions; full qualification passed 465 tests across 75 files with 16,892 assertions. See [evidence](assessments/2026-09-19-native-ir-text-shadow.md).

Next recommended slice: **M2.2aa** — migrate text-only `textDecorationColor` through the established colour and primitive-domain contracts. Begin only after approval.
