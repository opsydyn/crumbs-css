# Crumbs design-system architecture roadmap

Date: 2026-09-06\
Status: v1.0.0 published on npm and GitHub; M10.5 authorised release scope closed with explicit v1-only exceptions. Physical acceptance and parked integrations remain separate.\
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
- Android resumed in the consolidated M10.5 qualification on 2026-10-05: packed Android exports and API 36 emulator reference, direction, font scaling, contrast, reduced-motion and CSS refresh receipts are retained. All physical-device work is deferred by explicit user instruction. Spoken TalkBack acceptance and physical/release-Hermes performance remain separate unperformed gates.

## Delivery map

| Milestone | Outcome | Depends on | Status |
| --- | --- | --- | --- |
| M0 | Repair native semantics and isolate runtime imports | ADR review | Complete; M0.1–M0.9 closed, including Android Expo playground journey acceptance |
| M1 | Select Effect 4 boundary implementation and establish budgets | M0 | Software contract/host measurement slices delivered; umbrella measurement and device acceptance items remain open |
| M2 | Introduce and qualify native IR/compiler artifacts | M1 | M2.1 and M2.2a–ao/M2.3–M2.7 delivered; native-capture umbrella M2.2 remains open |
| M3 | Typed token domains, identity, aliases, scopes, and atomic updates | M2 | Complete; M3.1–M3.7 delivered |
| M4 | Shared resolution, compiled selection, and bounded caches | M2, M3 | M4.1–M4.5 delivered; M4.6 measurement/device acceptance remains open |
| M5 | Native Sprinkles and composition API completeness | M2, M3, M4 | Complete; M5.1–M5.5 delivered |
| M6 | Native conditions and functional style programs | M3, M4, M5 | Complete; M6.1–M6.5 delivered |
| M7 | Typed component slots, states, and extension contracts | M5, M6 | Complete; M7.1–M7.5 delivered |
| M8 | Distributed package/artifact compatibility | M2, M3, M7 | Complete; M8.1–M8.6 delivered |
| M9 | Manifests, change impact, policy, migrations, DTCG, and local ownership | M7, M8 | Complete; M9.1–M9.7 complete |
| M10 | Qualify a reference design system and enterprise journeys | M8, M9 | M10.1–M10.4 delivered; M10.5 v1 release scope closed with exact approved exceptions; deferred acceptance remains open |
| M11 | Evaluate optional extensions against concrete consumer needs | M10 | Selected M11.1–M11.5 delivered; M11.6 integrations parked |

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
- [x] M0.9: Establish early userland feedback using the internal Storybook plus an Expo playground. Workspace mode consumes public `dist` exports with continuous rebuilding; transformer/plugin changes trigger a controlled Metro restart. Add isolated packed-tarball and published-version consumer modes outside workspace resolution, record exact package versions/source mode, and exercise lists, forms, scopes, and portals. The two-run Android Maestro list/theme journey and startup-complete negative control are retained in [M0.9 Android acceptance](acceptance/2026-10-01-android/README.md). Keep this setup minimal and retain the supported SDK baseline.

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
- [x] M1.9b: Qualify Expo 57 / React Native 0.86 with strict packed-consumer types, motion contracts and iOS/Android/web exports; retain Expo 56 support; widen only the tested RN peer range and publish 1.1.0 through unchanged future-release gates. Defer the Crumbs consumer agent skill until this release is available.
- [x] M1.9c: Add a portable repository Crumbs consumer agent skill for verified npm 1.1.0, with import/setup/native boundaries, a checked typed ActionCard example, baseline/forward usage exercises and current consumer documentation.
- [x] M1.9d: Publish a documentation-only npm patch carrying the corrected package README and agent-skill links, with unchanged runtime/declarations/exports/dependencies and independently verified registry README/artifact identity. This follow-up requires its own release decision; M1.9c does not publish or extend any prior version-specific budget disposition.
- [x] M1.9e: Dogfood the released consumer skill example against public npm 1.1.1 in a real Expo consumer; retain strict types, all-platform runtime exports and actual iOS/Android button interaction. Record unperformed contexts separately.
- [x] M1.9f: Promote the qualified SDK 57 profile to the playground default, align app peer resolution across shared workspace demos, retain Storybook and explicit SDK 56 packed regression coverage, update consumer instructions, and record fresh verification.
- [x] M1.9g: Upgrade Storybook to the qualified SDK 57 app profile and Expo-matched native animation stack; retain SDK 56 fixture coverage, qualify LiteUI controls/actions on both native simulators, and add reproducible Storybook exports to developer commands and CI.
- [ ] **M1.10 — Expo SDK 58 compatibility:** planned in the [assessment/design](assessments/2026-10-16-m1-10-expo58-assessment.md) and [implementation plan](superpowers/plans/2026-10-16-m1-10-expo58-upgrade.md); M1.10a is complete locally with independent review fixes verified. Preserve SDK 56/57 and qualify RN 0.88 explicitly.
- [x] **M1.10a:** parameterize the pinned SDK runner, qualify strict public types and the actual SDK 58 supervising/custom-worker chain, dependency invalidation and the same packed artifact across SDK 56/57/58. Qualify actual optional Rust-worker interoperability alongside the Babel control, with positive backend events and safe fallbacks. Broaden only the qualified RN intervals; no font-axis expansion or Rust rewrite of Crumbs.
- [x] **M1.10b:** upgrade Playground and Storybook together, align app-owned peers, retain installed 56/57 profiles, and qualify default/Rust platform exports plus owned iOS/Android development-client interactions.
- [ ] **M1.10c:** refresh docs and the consumer skill, obtain exact-source three-SDK CI and unchanged full release-gate evidence, and prepare a concrete release review. Prior numerical exceptions do not authorise a new version; publication requires separate authorisation.

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
- [x] M2.2aa: Migrate text-only `textDecorationColor` through the colour scalar domain and hardened primitive decoder contract.
- [x] M2.2ab: Migrate text-only `fontSize`, `letterSpacing` and `lineHeight` through finite numeric/token scalar IR.
- [x] M2.2ac: Migrate text-only `fontFamily` through a property-specific non-empty string/token scalar domain.
- [x] M2.2ad: Migrate text-only `fontStyle` and `fontWeight` through explicit installed React Native literal/token domains.
- [x] M2.2ae: Migrate text-only `textAlign`, `textAlignVertical` and `verticalAlign` through explicit installed React Native literal/token domains.
- [x] M2.2af: Migrate text-only `textDecorationLine` and `textDecorationStyle` through explicit installed React Native literal/token domains.
- [x] M2.2ag: Migrate text-only `textTransform`, `writingDirection` and `userSelect` through explicit installed React Native literal/token domains.
- [x] M2.2ah: Introduce a property-specific boolean/token domain and migrate text-only Android `includeFontPadding`.
- [x] M2.2ai: Migrate shared `display`, `position` and `direction` layout modes through exact literal/token domains.
- [x] M2.2aj: Introduce primitive-aware literal admission and migrate `overflow` without widening the image domain.
- [x] M2.2ak: Migrate the six shared flex layout controls through exact installed literal/token domains.
- [x] M2.2al: Migrate shared `boxSizing` and audit the remaining installed FlexStyle surface.
- [x] M2.2am: Migrate `aspectRatio` through an isolated mixed scalar domain and complete installed FlexStyle coverage.
- [x] M2.2an: Migrate shared `backfaceVisibility` and `cursor` literal/token domains.
- [x] M2.2ao: Migrate view/text-only `borderCurve` and `pointerEvents` literal/token domains.
- [x] M2.3: Route the supported vanilla-extract compatibility adapter into the same IR. Unsupported syntax must fail with context; do not silently recover via regex parsing or partially reconstructed payloads.
- [x] M2.4: Separate validation, shorthand normalization, dependency analysis, and code emission. Index export/class ownership once for diagnostic lookup. Define deterministic serialization ordering and own-property handling for record keys.
- [x] M2.5: Version encoded artifacts and test compatible/incompatible readers. Distinguish codecs from lossy lowering/code generation; test codec laws only for their defined domain.
- [x] M2.6: Emit direct native modules and minimal token/condition metadata. Confirm structured values, ordinary exports, empty styles, and theme descriptors retain their specified meaning.
- [x] M2.7: Verify real dependency changes rebuild baked importer values. Include nested `.css.ts` imports, plain token modules, monorepo dependencies, target/config changes, and compiler updates before adding persistent caching.

**Exit:** native input no longer depends on the CSS round-trip for supported semantics; independent preservation and ordering properties pass; malformed artifacts fail deterministically; cold/warm compiler and emitted-size budgets pass; actual Metro invalidation is demonstrated.

## M3 — Make tokens and themes domain-safe and scoped

**Decisions:** D3–D5, D8.\
**Affected paths:** new `packages/css/src/tokens/`, `native-style.ts`, `theme-token.ts`, `theme-runtime.ts`, theme contract type/property tests, `examples/theme.ts`, and Storybook theme providers.

- [x] M3.1: Define colour, length, duration, opacity, and property-enum domains; generate or reconcile runtime schemas and static authoring types. Verify both positive native cases and rejected colour-to-spacing/enum mismatches.
- [x] M3.2: Implement stable contract/package identity, a contract-bound provider/hook interface, and deterministic public token IDs. Test duplicate package copies, evaluation order, hot reload, and identical paths across distinct contracts.
- [x] M3.3: Add foundation → semantic → component aliases with missing-target/domain/cycle diagnostics and traceable origin. Required tokens stay required; optional fallbacks are explicit.
- [x] M3.4: Add independent brand/mode/density contexts with documented merge and override precedence. Resolve only complete valid snapshots; define behavior for nested scopes and portal ownership.
- [x] M3.5: Add immutable theme patches and external-theme decoding. Update canonical values and derived token/index data atomically. Invalid patches leave the current snapshot untouched and return structured context.
- [x] M3.6: Use reusable Optic focuses for useful nested transformations. Validate domain-changing results; test semantic lens laws, old-snapshot preservation, and promised structural sharing separately.
- [x] M3.7: Add migration notes for legacy unscoped tokens and the permissive `string | number` contract. Preserve a bounded compatibility path without allowing old tokens to bind silently to unrelated contracts.

**Exit:** cross-contract isolation and domain correctness hold in types and runtime; external data is decoded once at ingress; scope/portal scenarios are tested; values and token maps never diverge; property suites cover valid aliases and adversarial mutations.

## M4 — Optimize resolution and selection under explicit bounds

**Decisions:** D6, D8.\
**Affected paths:** new focused `packages/css/src/runtime/` modules behind `theme-runtime.ts`; theme/recipe/cache tests, benchmark scenarios, runtime guarantees documentation.

- [x] M4.1: Share resolved outputs across consumers of the same immutable module/theme snapshot using weak ownership. Retain the original reference for static styles and structurally share unaffected outputs.
- [x] M4.2: Use compiler-emitted dependency plans for token resolution. Record both recomputation and notification counts; resolving only affected data does not prove unrelated components avoided rendering.
- [x] M4.3: Precompute recipe order/defaults/compound matchers and canonical selection keys. Make cache bounds, eviction, and resolver lifetime explicit; exercise workloads that exceed the bound.
- [x] M4.4: Add selective subscriptions with consistent snapshots and tests for concurrent rendering, provider updates, nested scopes, unmount, and hot reload. No consumer may observe a mixture of old values and new derived tokens.
- [x] M4.5: Compare cached and uncached evaluators on generated inputs. Test identity promises, invalidation completeness, zero eager Cartesian expansion, and no stale results after scope or artifact replacement.
- [ ] M4.6: Run M1 device/bundle/editor budgets and retained-memory scenarios. Record improvements and regressions against equivalent native workloads; do not introduce native engine dependencies without a separate decision.

**Exit:** semantic equivalence, identity, notification, and cache-bound tests pass; release-mode device evidence meets committed budgets; runtime work excludes schema traversal and repeated compilation.

## M5 — Add native Sprinkles and repair API coverage

**Decisions:** D2, D7.\
**Affected paths:** new `packages/css/src/sprinkles/`, public exports/build configuration, `native-style.ts`, utility type/property/compiler tests, examples and API docs.

- [x] M5.1: Define the public native `defineProperties` / `createSprinkles` adaptation with finite values, domain-safe token scales, native primitive kinds, and typed shorthands. Publish precedence examples for overlapping aliases and longhands.
- [x] M5.2: Support utilities in style composition and recipe bases/branches without losing kind or contract information. Add the mapped `styleVariants(values, mapper)` overload.
- [x] M5.3: Support static selections in authored modules and dynamic runtime selection through generated lookup plans; public names/types must accurately distinguish these phases.
- [x] M5.4: Compare atomic, fused, and hybrid output on identical design-system fixtures. Measure bytes, startup, array lengths, selection allocations, and native frames. Choose the default from evidence and document it.
- [x] M5.5: Test deterministic output, token-only policy compatibility, invalid properties/scales, identity on repeated selections, and compiler/runtime equivalence.

**Exit:** utilities compose with styles and recipes under one documented native contract; type fixtures reject cross-domain values; chosen output passes budgets and is supported by a readable comparison report.

## M6 — Add explicit conditions and functional style programs

**Decisions:** D5, D7, D8, D12.\
**Affected paths:** new `packages/css/src/conditions/` and expression modules; compiler/runtime dependency plans, conditional type/property tests, Storybook adaptive scenarios.

- [x] M6.1: Define native platform, dimension-bucket, RTL, font-scale, and accessibility conditions with default/overlap precedence. Register and clean up subscriptions predictably; avoid using unbounded raw dimensions as cache keys.
- [x] M6.2: Add conditional value normalization and mapping helpers, optional responsive tuple syntax if it preserves readable types, and the associated conditional-value types. Ensure equivalent input forms normalize identically.
- [x] M6.3: Define supported expression nodes for aliases, typed scalar operations, optional fallbacks, composition, and exhaustive matching. Specify units/domains, missing inputs, and dependency sets before implementation.
- [x] M6.4: Constant-fold static expressions and recompute dynamic programs only for declared dependency changes. Opaque arbitrary closures are not accepted as portable serialized programs.
- [x] M6.5: Test normalization idempotence, deterministic evaluation, supported algebraic laws, precise invalidation, and resize/font-scale/RTL behavior on native consumers.

**Exit:** conditions and expressions have explicit finite semantics and lifecycle rules; every operator has type, property, and reference-evaluation coverage; runtime and editor budgets pass. Container-measurement and continuous motion work remain M11 items.

## M7 — Define component styling contracts

**Decisions:** D9, D10, D12.\
**Affected paths:** new `packages/css/src/components/` contract modules; recipe schemas/types/compiler emitters; Storybook button/input/dialog examples; extension and migration fixtures.

- [x] M7.1: Add typed slots with one shared variant selection and view/text/image-specific outputs. Preserve existing single-style recipe use through an explicit migration-compatible interface.
- [x] M7.2: Add exhaustive discriminated state recipes and prohibited-combination checking. Normalize defaults consistently; avoid generating all possible state products eagerly. [Assessment](assessments/2026-09-22-m7-2-discriminated-component-states.md)
- [x] M7.3: Declare public/private tokens, slots, variants, and extension points. Specify the complete ordering of inherited defaults, local variants, states, compounds, and permitted consumer overrides before freezing the public API. [Assessment](assessments/2026-09-23-m7-3-public-private-component-contracts.md)
- [x] M7.4: Demonstrate product-team extension without copying component implementation. Verify a private implementation change leaves the public contract intact; a removed public slot/variant is detectable. [Assessment](assessments/2026-09-26-m7-4-product-team-extension.md)
- [x] M7.5: Connect reference component visual and accessibility state to the same owner while keeping behavior-library integration separate from style evaluation. [Assessment](assessments/2026-09-26-m7-5-reference-state-ownership.md)

**Exit:** slot kinds and allowed selections are enforced; extension behavior has executable conflict examples; public/private contracts are serializable into the manifest; the initial reference components use only public APIs.

M7.3's 2026-09-26 final review confirms that private owner values cannot be
replaced or selected through extensions and that inferred extension configs
enforce declared permissions across literal and union shapes. Package,
Storybook type, and documentation gates pass. One Minor remains deferred:
changed themed output can retain mutable compiled contract metadata.

M7.4's 2026-09-26 packed-consumer assessment verifies owner/brand recipe
extension across separate `@acme/ui` and `@acme/brand` modules, private
implementation evolution under a stable public contract, and authoring failures
when declared public slots or variant values disappear. Package and full checks
pass; no device or Android acceptance is claimed.

M7.5's 2026-09-26 assessment connects `ShowcaseCard`'s required action callback,
public disabled recipe state, and native `Pressable` accessibility/interaction
props. Type-level and runtime regressions reject disabled-plus-pressed state;
the Storybook app typechecks and package checks pass. No device, screen-reader,
or Android acceptance is claimed.

M8.1 is complete for the declared Expo 56 / React Native 0.85 / React 19
JavaScript consumer baseline. The packed token and component packages resolve
from an independent app; iOS and web bundle maps contain the installed package
sources and no repository or authored `.css.ts` paths. See the [assessment](assessments/2026-09-26-m8-1-packed-design-system.md) and [qualification evidence](evidence/2026-09-26-m8-1-packed-design-system/qualification.json). Android and device acceptance remain parked.

M8.2 and M8.3 are complete for their exact recorded package and app versions.
M8.3 resolves all 13 packed export paths, audits 25 runtime graphs, and qualifies
the ordinary, focused decoder and positive-control Expo bundles on iOS and web.
The clean [M8.3 qualification receipt](evidence/2026-09-26-m8-3-runtime-resolution/qualification.json)
records Android as `not-run`; Android/device acceptance and publishing remain
deferred.

M8.4 now qualifies warm Metro bundle invalidation for plain, nested and shared
workspace inputs, plus `strictDiagnostics` changes across cache-preserving server
restarts. The [assessment](assessments/2026-09-27-m8-4-hot-reload.md) and
[live receipt](evidence/2026-09-27-m8-4-hot-reload/metro-incremental.json) retain
compiled-value, diagnostic, restoration and fixture-hash evidence. This is
development-bundle evidence on the recorded iOS/macOS baseline, not device or
performance qualification.

M8.5 aligns release automation with the documented manual npm gate and records
the alpha/stable compatibility and deprecation policy. The [assessment](assessments/2026-09-27-m8-5-release-policy.md)
and release-policy tests cover tag/version matching, commit identity, workflow
gates and developer preflight. No package was published and the current release
was not modified.

M8.6 now gates app changes through locked workspace installation, package and
Storybook checks, Storybook typechecking, and packed Expo consumer qualification
for iOS and web. Required compiler fixtures and consumer maps remain fail-closed.
See the [M8.6 CI assessment](assessments/2026-09-27-m8-6-ci-consumer-qualification.md).
Android and device acceptance remain parked.

Next recommended roadmap item: **M9.5** — add replacement metadata and safe
token/recipe-slot codemods. Keep Android/device acceptance parked.

## M8 — Qualify distributed packages and artifact evolution

**Decisions:** D3, D5, D11.\
**Affected paths:** package exports/build settings, `test/pack-consumer-contract.test.ts`, new independent token/component/app fixtures, Metro integration fixtures, CI and release documentation/workflows.

- [x] M8.1: Package tokens and components separately, consume only packed artifacts from an independent Expo application, and verify no unpublished source-tree requirement. iOS/web export and provenance evidence: [assessment](assessments/2026-09-26-m8-1-packed-design-system.md) and [receipt](evidence/2026-09-26-m8-1-packed-design-system/qualification.json).
- [x] M8.2: Publish compiler/artifact/runtime compatibility rules and test supported version combinations, unsupported versions, duplicate package copies, provider identity, and lazy-loaded modules. See the [package compatibility matrix](../packages/css/COMPATIBILITY.md) and [clean-source qualification receipt](evidence/2026-09-26-m8-2-compatibility-matrix/qualification.json).
- [x] M8.3: Audit every packed ESM/CommonJS/types export target and runtime dependency graph; prove ordinary runtime isolation and focused `tokens/schema/value` entry-graph isolation through Expo production exports on iOS/web. See the [M8.3 qualification receipt](evidence/2026-09-26-m8-3-runtime-resolution/qualification.json) and [compatibility matrix](../packages/css/COMPATIBILITY.md). Android/device acceptance and publishing remain parked.
- [x] M8.4: Exercise warm Metro dependency invalidation for shared workspace theme configuration and prove `strictDiagnostics` output changes across cache-preserving restarts using compiled values and a diagnostic response. See the [M8.4 assessment](assessments/2026-09-27-m8-4-hot-reload.md) and [live receipt](evidence/2026-09-27-m8-4-hot-reload/metro-incremental.json). Android/device and performance qualification remain separate.
- [x] M8.5: Reconcile the manual npm publication policy with `.github/workflows/release-please.yml` and `publish.yml`; document alpha breaking-change and migration rules, stable SemVer/deprecation obligations, and a local tag preflight. No publication or existing release mutation. See [assessment](assessments/2026-09-27-m8-5-release-policy.md).
- [x] M8.6: Gate declared Expo/RN versions in CI. Restore full consumer checks for app changes, use reproducible installs, and make missing required platform fixtures visible failures. See [assessment](assessments/2026-09-27-m8-6-ci-consumer-qualification.md); Android/device acceptance remains parked.

**Exit:** three independently packaged layers work in the declared matrix; artifact migrations and mismatch errors are tested; package graphs and invalidation are verified; release automation/docs agree with the explicitly selected policy.

## M9 — Add manifest, policy, impact, and token interoperability tooling

**Decisions:** D5, D9, D10, D11.\
**Affected paths:** new tooling/manifest/policy/adapter modules and entrypoints; diagnostic codes; CLI, manifest-diff, codemod, and DTCG fixtures; team documentation.

- [x] M9.1: Emit deterministic versioned manifests for identities, public contracts, aliases/dependencies, source origins, capabilities, defaults, and deprecation/replacement metadata. Qualified with [receipt](evidence/2026-09-27-m9-1-deterministic-manifest/qualification.json) and [assessment](assessments/2026-09-27-m9-1-deterministic-manifest.md).
- [x] M9.2: Provide local explicit-file checking and manifest comparison. Detect token/slot/variant contract changes, domain changes, changed defaults, and forbidden private dependencies; report affected supplied consumers and analysis limits. See the [qualification receipt](evidence/2026-09-27-m9-2-manifest-compatibility/qualification-v1.json) and [assessment](assessments/2026-09-27-m9-2-manifest-compatibility.md).
- [x] M9.3: Add development-only style explanations for resolved values, matching conditions, override winners, dependencies, and recomputation causes. Exclude detailed provenance from production output unless deliberately requested. Qualified with the [receipt](evidence/2026-09-27-m9-3-style-explanations/qualification.json) and [assessment](assessments/2026-09-27-m9-3-style-explanations.md); Android/device acceptance remains not-run and parked.
- [x] M9.4: Add versioned policy presets and incremental adoption. Cover semantic tokens, literals, private surfaces, capabilities, deprecations, and output budgets. Escape hatches carry a reason and optional expiry and remain visible in reports. Qualified with the [policy report](evidence/2026-09-28-m9-4-design-system-policies/policy-report-v1.json), [receipt](evidence/2026-09-28-m9-4-design-system-policies/qualification.json), and [assessment](assessments/2026-09-28-m9-4-design-system-policies.md); Android/device acceptance remains not-run and parked.
- [x] M9.5: Add replacement metadata and codemods for a token rename and recipe/slot migration. Unsupported or ambiguous edits must be reported without corrupting source; verify dry-run, repeat execution, and changed-file boundaries. See the [qualification receipt](evidence/2026-09-28-m9-5-safe-migrations/qualification.json) and [assessment](assessments/2026-09-28-m9-5-safe-migrations.md).
- [x] M9.6: Implement a DTCG 2025.10 format/resolver adapter with a documented native subset. Validate aliases/cycles/domains/context precedence, preserve supported metadata, and reject unmappable token types with origin context. See the [qualification receipt](evidence/2026-09-28-m9-6-dtcg/qualification.json) and [assessment](assessments/2026-09-28-m9-6-dtcg-adapter.md); input/format nodes, resolver steps, and emitted provenance each have explicit 100,000-unit guards.
- [x] M9.7: Support versioned local ownership metadata across compatibility, policy, migration, style-explanation, and DTCG reports. Exact manifest IDs, explicit input paths, unresolved coverage, and the tooling-only API are documented and fixture-qualified in the [receipt](evidence/2026-09-29-m9-7-ownership/qualification.json) and [assessment](assessments/2026-09-29-m9-7-local-ownership.md); Android/device acceptance remains not-run and parked.

**Exit:** release-impact fixtures identify expected consumers; reports distinguish proven breaks from potential visual impact; migrations preserve valid usage; DTCG support/limitations are explicit; tooling stays outside ordinary runtime bundles.

### 2026-09-27 — M9.1 deterministic design-system manifest

- [x] Added the opt-in `@opsydyn/crumbs-css/tooling/manifest` entrypoint for
  canonical schema-v1 JSON generated from explicit token, component, and
  compiled-style roots. Token/component records derive from their descriptors;
  compiler sidecars report final style dependencies, package-relative origins,
  and compiler-observed capabilities.
- [x] Qualified public/private token visibility, aliases, component defaults
  and state constraints, lifecycle metadata, unresolved legacy references,
  root reordering, and distinct temporary package roots. The packed export and
  ordinary runtime graph checks remain separate from app/device claims.
- [x] Documented the explicit-root workflow and the tooling-only Effect 4
  Schema boundary. The receipt and manifest artifact hash-link fixture inputs
  to the output digest.
- [x] Android remains `not-run` and parked; no device, publication, or release
  acceptance is claimed.

See the [M9.1 qualification receipt](evidence/2026-09-27-m9-1-deterministic-manifest/qualification.json)
and [assessment](assessments/2026-09-27-m9-1-deterministic-manifest.md).

Next recommended roadmap item: **M9.3** — explain resolved styles, matching
conditions, override winners, dependencies, and recomputation causes during
development. Keep Android/device gates parked.

### 2026-09-27 — M9.3 development style explanations

- [x] Added the isolated `@opsydyn/crumbs-css/devtools` API, development-default
  provenance sidecar, explicit production opt-in, and typed reports for resolved
  values, branches, conditions, composition winners, dependencies, and
  plan-derived transitions.
- [x] Qualified deterministic fixture/report hashes, development and production
  package boundaries, packed consumer type checks, and production Expo exports
  on iOS/web. Documentation and the full repository check passed.
- [x] Android and physical-device acceptance remain not-run and parked; the
  report does not claim observed React renders, cache hits, or device state.

See the [M9.3 qualification receipt](evidence/2026-09-27-m9-3-style-explanations/qualification.json)
and [assessment](assessments/2026-09-27-m9-3-style-explanations.md).

Next recommended roadmap item: **M9.4** — add versioned policy presets and
incremental adoption with explicit escape-hatch reasons and optional expiry.

### 2026-09-28 — M9.4 versioned design-system policies

- [x] Added the tooling-only `@opsydyn/crumbs-css/tooling/policy` API, local
  explicit-file CLI, independently versioned migration/enforce presets, and
  canonical schema-v1 reports for all six planned policy rules.
- [x] Qualified deterministic report/fixture digests, exact reasoned
  exceptions, visible unused-exception diagnostics, retained consumer coverage
  limits, packed package exports, runtime isolation, and iOS/web production
  export/tree-shaking checks. The 11,000-byte fixture measurement exercises a
  budget; it is not application bundle evidence.
- [x] Documented adoption, severity migration, explicit evidence, exceptions,
  and report limitations. `bun run check`, the documentation build, the
  qualification script, the distribution gate, focused regressions, and
  `git diff --check` passed.
- [x] Android and physical-device acceptance remain not-run and parked; no
  release or publication acceptance is claimed.

See the [M9.4 qualification receipt](evidence/2026-09-28-m9-4-design-system-policies/qualification.json),
[policy report](evidence/2026-09-28-m9-4-design-system-policies/policy-report-v1.json),
and [assessment](assessments/2026-09-28-m9-4-design-system-policies.md).

Next recommended roadmap item: **M9.5** — add replacement metadata and safe
codemods for token, recipe, and slot migrations. Keep Android/device acceptance
parked.

### 2026-09-28 — M9.5 safe source migrations

- [x] Added versioned replacement maps, manifest validation, pure source
  planning, explicit-file dry-run/write CLI behavior, and an isolated packed
  `tooling/migrations` API for token and recipe/slot migrations.
- [x] Qualified deterministic fixtures for dry-run, successful write, unlisted
  source preservation, repeatability, and whole-invocation blocking. See the
  [receipt](evidence/2026-09-28-m9-5-safe-migrations/qualification.json) and
  [canonical dry-run report](evidence/2026-09-28-m9-5-safe-migrations/dry-run-report-v1.json).
- [x] Documented migration maps, explicit inputs, supported syntax and limits.
  `bun run check`, the documentation build, fixture qualification, the packed
  distribution check, focused regressions, and `git diff --check` passed.
- [x] Expanded the optional TypeScript peer to `>=5.9 <7` after the packed
  Expo consumer exposed npm `ERESOLVE` for TypeScript 6; packed ESM/CommonJS
  planner checks now execute under TypeScript 6.0.3. TypeScript remains outside
  ordinary runtime graphs.
- [x] Android and physical-device acceptance remain not-run and parked; no
  release or package publication acceptance is claimed.

See the [M9.5 assessment](assessments/2026-09-28-m9-5-safe-migrations.md).

Next recommended roadmap item: **M9.6** — implement a DTCG 2025.10
format/resolver adapter with a documented native subset. Keep Android/device
acceptance parked.

### 2026-09-28 — M9.6 DTCG import adapter

- [x] Added the isolated `@opsydyn/crumbs-css/tooling/dtcg` API for an explicit
  DTCG document snapshot and manifest contract identity. Imports preserve
  token/source/group provenance, enforce Resolver context precedence, convert
  the documented native subset, and return stable diagnostics without partial
  payloads. Effect 4 remains bundled inside the tooling boundary; application
  consumers do not add an Effect dependency or runner.
- [x] Qualified the pinned Format/Color/Resolver fixture profile with 10
  accepted and 17 rejected conversion cases, exact document origins and JSON
  pointers, default modifier selection, metadata retention, fixture digests,
  and repeatable canonical evidence. See the [receipt](evidence/2026-09-28-m9-6-dtcg/qualification.json)
  and [assessment](assessments/2026-09-28-m9-6-dtcg-adapter.md).
- [x] Added the DTCG import guide, package-entrypoint and compatibility
  documentation, a separate 1k/10k/50k source benchmark, and a
  `dtcg:qualify` maintainer command. The 1k workload imported; 10k and 50k
  workloads were rejected by the 100,000-node budgets. Those times measure
  time-to-rejection and do not claim large-theme throughput.
- [x] Review follow-up replaced depth-growing Resolver path copies with
  persistent provenance trails and constant-time active-set membership, added
  a 100,000-origin output guard, and made set expansion iterative. A 49,998-link
  selector chain resolves with 99,999 ordered origins; the end-to-end 15,000-
  document benchmark also passes after the 1k/10k/50k token workloads.
- [x] `bun run check`, `bun run docs:build`, fixture qualification, the packed
  M8.3 distribution gate, focused DTCG/packed-consumer/runtime-graph tests,
  and `git diff --check` passed. The distribution run was dirty-source interim
  evidence; no release or publication acceptance is claimed.
- [x] Android/device, visual, native runtime-performance, package publication,
  and release acceptance remain not-run; Android stays parked.

Next recommended roadmap item: **M9.7** — support ownership metadata in local
reports and evaluate optional editor/design-tool adapters. The DTCG node-budget
capacity remains a separate follow-up requiring workload-derived memory and
adversarial-input limits.

### 2026-09-29 — M9.7 local ownership reports

- [x] Added the tooling-only `@opsydyn/crumbs-css/tooling/ownership` API and
  an explicit-file `ownership:annotate` command. The local map stays separate
  from manifest v1, uses exact stable entity IDs, and reports assigned,
  unassigned, and unresolved references at source JSON Pointer locations.
- [x] Qualified compatibility, policy, migration, style-explanation, and both
  DTCG result branches against checked-in ownership and versioned manifests.
  The deterministic receipt records fixture/output digests and all three
  attribution states: [qualification receipt](evidence/2026-09-29-m9-7-ownership/qualification.json).
- [x] Added the [ownership guide](../docs/src/content/docs/how-to/annotate-design-system-ownership.mdx),
  package API reference, and README entry. The adapter contract requires no
  hosted account or telemetry service; Effect 4 Schema remains behind the
  tooling subpath.
- [x] `bun run check`, `bun run docs:build`, repeated `bun run ownership:qualify`,
  the focused ownership/packed-consumer/Metro suite, and the packed M8.3
  distribution gate passed. The distribution evidence was an interim dirty-
  source run at the Task 6 commit; it passed packed exports, runtime graphs,
  consumer typecheck, iOS/web production exports, and paired tree-shaking.
- [x] Package publication, visual acceptance, device behavior, and Android
  acceptance remain not-run. Android stays parked.

Next recommended roadmap item: **M10.1** — complete the packed public-API
reference design-system examples for typography, button, input, selection
controls, card, and dialog integration. Keep Android/device acceptance parked.

### 2026-09-29 — M10.1 public API reference system

- [x] Added independent brand, mode, and density scopes to the Expo reference
  consumer, with a typed axis picker and sparse scope-composition tests.
- [x] Added public-API examples for semantic typography, typed button/input/
  selection recipes, the shared ShowcaseCard, and a typed dialog whose brand
  scope is bridged at the portal boundary. Added component selection/slot type
  fixtures and recipe resolution tests.
- [x] Added the [reference design-system guide](../docs/src/content/docs/how-to/build-a-reference-design-system.mdx)
  and linked it from the documentation sidebar and landing page.
- [x] Storybook tests passed (7 tests, 32 expectations), the app typecheck
  passed, and Expo's offline SDK compatibility checks matched the local Expo
  56 matrix. Expo iOS export passed with 1,711 modules (6.2 MB).
- [x] Expo 56's local compatibility map confirms React and React DOM 19.2.3
  with React Native 0.85.3; the Expo apps and packed-consumer fixture now use
  that matrix, and the lockfile is synchronized. Storybook Metro resolves
  workspace dependencies through the app and monorepo roots consistently.
- [x] Native iOS smoke: Expo Go 56.0.4 on iOS 26.5 loaded the
  `Design System/Reference Patterns / Interactive` Storybook story through the
  opt-in preview route, then loaded the Expo showcase app. The live screen
  verified Foundry/Signal, dark/light, and comfortable/compact axes; valid and
  invalid email states; disabled input; checkbox, radio, and switch changes;
  button actions; and the Signal-scoped ShowcaseCard portal dialog's cancel and
  confirm paths.
- [ ] The Storybook on-device navigator remains unqualified: the reference
  smoke route bypasses its FullUI manager, and the previously observed
  `queueMicrotask` UI-load error remains unresolved. Android remains parked.

The M10.1 public-API examples and direct native interaction smoke are complete.
M10.2 now generates four pairwise theme stories covering every brand/mode,
brand/density, and mode/density value pair, with the four intentionally
unrendered full combinations listed in
[`contract-review-cases.json`](../apps/storybook/test/contract-review-cases.json).
That report also exhaustively enumerates 37 public recipe selections across
five contracts: 31 reachable selections are resolved in tests, and six
unreachable selections carry their state-constraint reasons. Story generation
is deterministic and checked by the Storybook test command. The repository
suite passed (1,267 CSS tests and 12 Storybook tests); app typecheck, docs build,
and Expo 56 iOS export passed (1,712 modules). These checks do not establish
on-device acceptance for the full Storybook navigator; its M10.1 limitation
remains. Android remains parked.

Next recommended roadmap item: **M10.3** — verify font scaling, RTL/logical
layout, reduced motion, and supported contrast contexts on native consumers.

### 2026-09-29 — M10.3 iOS native accessibility-context acceptance

- The reference `AppThemeProvider` owns a bounded native condition store, updates
  dimensions and font scale, listens for reduced-motion and supported contrast
  preferences, and resolves a mode-aware more-contrast token layer.
- The Storybook consumer running in Expo Go on the iOS 26.5 simulator, with
  Dynamic Type at `extra-extra-extra-large`
  reported `fontScale` 1.35 and the Crumbs `extraLarge` bucket. Restoring the
  `large` baseline returned the app to `fontScale` 1.00 and the `normal` bucket.
- The standalone Expo SDK 56 app declares English and Arabic as supported iOS
  locales with RTL enabled. A cold launch with Arabic primary reported native
  direction `RTL` and rendered the showcase in RTL. Restoring the English-only
  system language and relaunching reported `LTR`. Expo Go is unsuitable for this
  RTL check on SDK versions before 58 because it disables RTL
  ([Expo localization guidance](https://docs.expo.dev/guides/localization/#rtl-support)).
- In the standalone app, enabling iOS Increase Contrast changed the live native
  condition from `normal` to `more` and displayed the declared black/white/yellow
  palette and light system-bar glyphs against its black canvas. Enabling Reduce
  Motion changed `full` to `reduced`; the LTR motion sample completes at its
  endpoint in both LTR and RTL app launches. Both preferences were restored.
- The deterministic declared-colour review covers Foundry/Signal, light/dark,
  and normal/more-contrast palettes, including the active theme-picker trigger
  and aspect-ratio preview text on accent-muted. Foundry light's accent on
  canvas now measures 4.674:1. Those surfaces expose six normal-contrast
  failures: Foundry light copy, muted, and accent on accent-muted at 1.100:1,
  2.211:1, and 2.760:1; Signal dark copy, muted, and accent on accent-muted at
  1.014:1, 1.873:1, and 2.556:1. The more-contrast palette meets the 7:1 review
  target for known opaque pairs. Disabled and pressed opacity cases remain
  `unknown` because their painted backgrounds require compositing. This source
  review is not WCAG conformance evidence.

M10.3 is complete for these iOS simulator contexts. Screen-reader semantics and
broader interaction acceptance remain separate checks; the regular Storybook
navigator is still unqualified, and Android remains parked.

Next recommended roadmap item: **M10.4** - run the three North Star journeys
from packed public packages and retain the result artifacts.

## M10 — Qualify the reference design system and North Star journeys

**Decisions:** D9–D12.\
**Affected paths:** `apps/storybook/`, independent packed-consumer fixtures, consumer documentation, native acceptance/benchmark artifacts, CI checks.

- [x] M10.1: Complete public-API examples for typography, button, input, selection controls, card, and dialog integration, with brands, modes, density, scopes, states, and typed slots; complete direct iOS interaction smoke. The normal on-device Storybook navigator remains unqualified as recorded above.
- [x] M10.2: Generate useful contract-driven stories and review cases. Use pairwise theme-axis stories plus exhaustive reachable recipe-state tests; report unreachable recipe selections and intentionally unrendered full theme combinations. See `apps/storybook/scripts/generate-contract-stories.ts` and `apps/storybook/test/contract-review-cases.json`.
- [x] M10.3: Verify font scaling, RTL/logical layout, reduced motion, and supported contrast contexts on native iOS consumers. The declared-pair review originally exposed known colour failures; the six opaque normal-contrast `accentMuted` failures identified there were repaired in the M10.5 palette follow-up below. Opacity/compositing cases remain unknown, and the review is not WCAG conformance evidence. Screen-reader and interaction acceptance stays explicit. Android-specific M10.3 contexts remain unqualified.
- [x] M10.4: Run the three North Star journeys from packed public packages and retain versioned evidence. The exact Expo 56 / React Native 0.85.3 matrix passed on iOS/web bundle exports and host interaction; Android, device rendering/performance, screen-reader acceptance, and publishing remain not-run. See `docs/assessments/2026-09-30-m10-4-north-star-journeys.md` and `docs/evidence/2026-09-30-m10-4-north-star/`.
- [ ] M10.5 umbrella: **authorised v1 engineering/publication scope closed**; physical-device, spoken-reader, release-Hermes/FPS and other explicitly unperformed acceptance contexts remain deferred. The successful [v1 publication packet](evidence/2026-10-10-v1-publication/README.md) binds immutable source, reproduced tarball, exact complete host report, provenance, registry integrity and installed iOS/Android/web Expo exports. The warm-transform and capped 0.174 ms incremental failures have explicit v1-only approval; eight advisory failures remain visible, and generic future-release policy remains unchanged. Historical qualification and investigations below retain their exact source/artifact scope.

**Journey A — Distribute a component package:** a token package and a component package are packed and consumed by an independent Expo app. Public styles work without source-only dependencies; runtime imports are isolated; supported versions and scopes resolve correctly.

**Journey B — Change a shared token safely:** change a semantic token/alias and separately remove a public token. The first produces an accurate impact report and correct selective updates; the second produces an actionable compatibility diagnostic and verified migration. The previous theme snapshot remains coherent throughout.

**Journey C — Add a second brand:** supply another validated brand contract implementation without copying component implementations. Existing variant/slot types remain valid; scoped/portal behavior, accessible states, and performance budgets continue to pass.

**Exit:** all three journeys have direct evidence on the declared matrix; unresolved checks are shown as incomplete; no "gold standard", zero-runtime, or accessibility-compliance claim exceeds the measured guarantees.

### 2026-09-30 — M10.4 packed North Star journeys

The independent Expo consumer passed all three journeys from locally packed artifacts. The compatibility report now emits a versioned `token.alias-changed` finding; the packed migration is explicit-file-only and idempotent; the same component resolves two brands and a portal-scoped Signal theme. iOS/web source-map provenance and host smoke ceilings passed on the declared matrix.

M10.4 does not establish native rendering or device performance. Android remains parked; physical-device and screen-reader acceptance, screenshots/recordings, and publishing were not run. The compatibility report wire format is v2 (manifest and migration wire formats remain v1); saved v1 compatibility reports are rejected by the strict current decoder and must be regenerated.

Next recommended roadmap item: **M10.5** — run the full compatibility, property, type/editor, package, documentation, visual, and device budgets and publish the guarantees matrix.

### 2026-09-30 — M10.5 guarantees matrix qualification

The v1 guarantees matrix and generated reference are published. M10.5.2 package, property, type/editor, compatibility-fixture, documentation, and M10.5.3 structural contract/accessibility results are retained at their original source revision and marked stale after the registry-membership source update; rerun them during final M10.5 qualification. The single simulator probe could not connect to CoreSimulatorService, so simulator rendering was not run. Screenshot/image-diff, physical-device, screen-reader, and device performance acceptance remain not-run. Android remains parked.

### 2026-09-30 — M10.5 `accentMuted` contrast palette follow-up

The Foundry light and Signal dark mode layers now author `accentMuted` surfaces that preserve their existing brand accents while passing all six previously failing normal-contrast pairs. The deterministic sRGB review reports ratios from 5.038:1 to 15.294:1 for those pairs; the full known-pair review has no failures, and the six target combinations remain covered by tests. Alpha/compositing cases remain unknown. This is a palette/source review only: it does not establish rendered colour, WCAG conformance, screen-reader acceptance, or device performance. See the [assessment](assessments/2026-09-30-m10-5-accent-muted-contrast.md).

### 2026-09-30 — M10.5 performance-registry readiness audit

`budgets:validate` passes with no retained-baseline drift; `budgets:readiness` exits nonzero as designed. The 26-entry registry has 21 recorded/approved metrics, four active performance gates that require release-device evidence, and one historical diagnostic threshold still counted as pending. M4.6 classifies `runtime-emitted-bytes` as diagnostic-only, but the registry readiness logic requires every listed metric to have an approved threshold and recorded baseline. No baseline, threshold, or registry status was changed. The Node v22.0.0 full host-budget suite remains a separate final M10.5 gate; Android remains parked. See the [readiness assessment](assessments/2026-09-30-m10-5-performance-registry-readiness.md).

M10.5 remains open. The exact Node v22.0.0 host-budget suite could not run, and active device baselines remain incomplete. Simulator/device/screen-reader gates still need direct evidence. The Node-floor host-budget gate is deliberately deferred to the final M10.5 qualification pass; Android remains last and parked. M11 demand assessment may proceed before M10.5 closes, without treating M10 as complete.

Next recommended roadmap slice: **M10.5 registry membership correction** — keep verified historical diagnostics visible while excluding them from active readiness membership; add contract tests, and preserve the four device-gated active metrics as incomplete. Keep the exact Node v22.0.0 host-budget gate last and Android parked.

### 2026-09-30 — M10.5 performance registry membership correction

The performance registry is now version 2 with 25 active budget metrics and a separate diagnostic-only collection. The historical `runtime-emitted-bytes` baseline remains evidence-verified and appears in diagnostic comparisons, but it has no active threshold and cannot block registry readiness or threshold review. Contract tests cover cross-collection identity uniqueness, version rejection, diagnostic verification/reporting, and active readiness semantics. Validation remains clean; readiness correctly remains incomplete for the four active JS-frame, UI-frame, allocation, and retained-memory gates. This does not qualify current device performance. See the [membership correction assessment](assessments/2026-09-30-m10-5-performance-registry-membership.md).

M10.5 remains open. The registry membership mismatch is corrected; the simulator render and interaction result is recorded below. Physical-device/screen-reader acceptance and release-device performance remain incomplete. The Node v22.0.0 full host-budget suite remains the final M10.5 host gate; Android stays parked. The prior readiness audit records the as-found v1 behavior; its coupling finding is superseded by the membership correction.

### 2026-09-30 — M10.5 native iOS simulator render and interaction

The current source revision 65c3e916990c50042e712eb2194bed077c746eb1 built successfully and loaded through Expo Go 56.0.0 with Expo 56.0.4 and React Native 0.85.3 on an iPhone 17 running iOS 26.5. The interactive Storybook reference rendered in light and dark modes, and pressing “Save changes” visibly updated the action status. Full-resolution screenshots and the run receipt are retained in [native-simulator-acceptance.json](evidence/2026-09-30-m10-5-guarantees/native-simulator-acceptance.json). The CUA accessibility snapshot exposed only the story container and is not a VoiceOver result. Automated image diff, VoiceOver, physical-device acceptance, release-Hermes frame/allocation/retained-memory budgets, and Android remain not-run; alpha/compositing coverage remains unknown.

At the time, the next recommended slice was M10.5.3 Android Storybook acceptance; its result is recorded in the 2026-10-01 follow-up below. The exact Node v22.0.0 host-budget gate remains last, with physical-device, screen-reader, and release-device budgets separate and incomplete.

### 2026-10-01 — M10.5.3 Android Storybook render and interaction

The `Design System/Reference Patterns / Interactive` story rendered on an Android 16 / API 36 emulator running Expo Go 56.0.4. Maestro 2.11.0 passed the final light/dark/theme-action flow in 20.215 seconds; a selector-adjusted run passed once before the final no-op startup-tap cleanup. The four 1080 × 2400 screenshots show both themes and the “Primary action selected.” state in each. Maestro resolved the tested controls and status through text selectors. The Expo Go developer launcher bubble overlaps part of the Light control, so the flow taps the unobstructed left edge. An optional standalone `uiautomator dump` process exited 137; TalkBack traversal, roles, focus order, and announcements remain unqualified. See the [acceptance receipt and captures](evidence/2026-10-01-m10-5-3-android/README.md).

### 2026-10-01 — M10.5 final qualification refresh

The final source-current refresh passed `bun run check` (1,287 CSS tests and 23 Storybook tests), the 87-test property suite, focused theme-store tests, Expo Storybook typecheck, release dry-run pack, editor-scale fixtures, the compatibility detector fixture, and structural Storybook contract/accessibility checks. The fixture's exit 1 is expected and emitted one alias-change warning plus one removed-token error. The exact Node v22.0.0 host-budget command completed and retained its reports. Its original format-v1 comparison passed the two Node v22 initialization metrics, failed the two current-Node initialization and six emitted-graph metrics, and labelled eleven other metrics as environment mismatches. The M10.5 host-budget triage reclassified those same reports with format v2: three of 21 recorded metrics pass (including cold transforms), eight fail approved limits, ten remain incomplete (one warm-transform protocol mismatch, one Metro host/workload mismatch, and eight editor workload/source-identity mismatches). No workloads were rerun, and no thresholds or baselines changed. `budgets:validate` passed with a valid but unready 25-metric registry; readiness remains nonzero with four pending thresholds, three missing active baselines and one diagnostic baseline.

The current matrix marks the prior iOS simulator and Android Storybook receipts stale under its source-revision rule; the Android receipt still records its tested app revision and observed interactions. Automated screenshot diff, physical-device rendering, TalkBack/VoiceOver, and release-device performance are not-run. M10.5 remains unchecked.

Next recommended roadmap slice: **M10.5 runtime-footprint remediation** — reduce the current-Node initialization and six emitted-graph regressions by reviewing the expanded shared theme-runtime surface and its entrypoint boundaries; preserve approved thresholds and baseline evidence. Keep comparable warm-transform, Metro/editor measurements, native screenshot, screen-reader, physical-device, and release-device budget evidence as separate open gates.

### 2026-10-02 — M10.5 runtime budget failure triage

The source-current M10.5 graph report still fails all six approved graph comparisons. Source-map attribution locates the largest emitted code in the shared theme runtime, component contracts/extension validation, expression evaluator, and token domains. A controlled single-entry diagnostic associates the current focused-entry chunking with higher import time, but it does not preserve or test compatibility-to-focused function identity and is not a valid replacement build. A separate scratch `minify: true` build preserves checked ESM/CJS exports and shared feature identity, cuts the three graph families by roughly 45–51%, and brings tokens below their unchanged graph ceilings. The theme/core and compatibility theme graphs and all four matched import medians still exceed their existing limits. The current graph scanner also needs to recognize static no-substitution template-literal CJS specifiers before minified output can be qualified. No implementation, threshold, baseline, or workload changed; the full host suite must be refreshed on the measured source revision. See the [M10.5 budget failure triage](assessments/2026-10-02-m10-5-budget-failure-triage.md).

Next recommended roadmap slice: **M10.5** — qualify minification on the actual package entry groups, update the static CJS graph scanner, then run the unchanged API, identity, packed Expo/Metro, and exact Node host gates. Keep any remaining theme/core and compatibility-theme failures open for separate source-level optimization; do not change the approved limits.

### 2026-10-02 — M10.5 minification qualification

The minified candidate passed package build, typecheck, all 1,340 CSS tests and 23 Storybook tests, plus packed Expo/Metro source-map qualification for web, iOS and Android. The scanner follows static no-substitution template-literal CJS paths. The Metro dynamic-loader exception now ties the call to the lexical binding exported publicly as `transform`, including renamed ESM/CJS chunks, and verifies its `upstreamTransformerPath` origin, first config parameter, and absence of parameter/binding writes or shadowing. Static literal loader calls must resolve to the unshadowed Node `require` or a verified `createRequire`; CJS export tracing rejects reassigned and duplicate module aliases without conflating loop scopes. Helper functions and ambiguous CJS getters remain rejected. The packed minified ESM `createRequire` call and CJS `require` call are both retained in the graph audit evidence. Minification stays out of the default build because the exact unchanged host comparison reports 8 approved failures, 3 passes and 10 incomplete results. The token ESM/CJS graph ceilings pass; `theme/core`, compatibility `theme`, and all four runtime-initialization ceilings fail. After restoring the unminified config, package build, typecheck, full tests, budget-registry validation and 28-page docs build passed. Registry validation found no baseline issues; readiness remains false under its existing pending threshold and baseline requirements. No threshold, baseline, workload identity, registry membership or export changed. M10.5 remains open; device, visual, accessibility and release-device gates remain separate. See the [minification qualification evidence](evidence/2026-10-02-m10-5-minification/qualification.md).

Next recommended roadmap slice: **M10.5 source-level runtime optimization** — reduce the measured `theme/core` and compatibility `theme` graph contributors and runtime initialization while preserving the approved public APIs and performance limits. Keep incomplete Metro/editor comparisons and native/device acceptance as separate gates.

### 2026-10-02 — M10.5 source-profile runtime diagnosis

The committed profile harness measured the unchanged CSS source and build configuration across eight Node/format/entry cells with 128 fresh-process profiles, one excluded warmup and fifteen retained samples per cell. All behavior receipts passed and all 28 default/diagnostic emitted artifacts matched after source-map-comment normalization. The 120 retained profiles contained 512 CPU samples; six samples mapped in six separate processes. Four mapped to `conditions/index.ts:202` in ESM `theme-core`/`theme` profiles on both Node 22 and Node 24; two more were singletons at `theme-runtime.ts:203` and `theme-token.ts:279` in Node 24 ESM `theme-core`. A scratch candidate replacing the default snapshot helper call passed its focused tests and typecheck, but grew each of the four ESM/CJS graphs by 167 bytes and did not improve the four initialization medians; it was discarded. Raw profiles and diagnostic maps remain in `/private/tmp`; the [profile summary](evidence/2026-10-02-m10-5-source-profile/profile-summary.json) retains all eight matrix cells, hashes, and attribution limits.

The unchanged uninstrumented exact-Node-floor host suite remains measured at source revision `78d9fd0`; the corrected profile harness is at `22d9677`, with the measured CSS source and build configuration unchanged between them. Its 21 recorded comparisons comprise one pass, ten approved-limit failures (all four runtime-initialization metrics and all six emitted-graph metrics), and ten incomplete results (warm-transform ordering, Metro environment/workload identity, and eight editor identity mismatches). The [assessment](assessments/2026-10-02-m10-5-source-profile.md) and [host comparison report](evidence/2026-10-02-m10-5-source-profile/host-budgets/comparison.json) separate those results from CPU-profile diagnostics. The registry remains unready with four device-facing thresholds pending. No budgets, thresholds, baselines, source runtime, or Android/device dispositions changed; M10.5 remains open.

Next recommended roadmap slice: **M10.5 runtime-budget failure triage** — trace the four initialization and six graph-size failures to narrower source contributors before selecting another A/B, while preserving public exports and cross-entry function identity. Keep incomplete Metro/editor comparisons and visual, screen-reader, physical-device, release-device, and Android-specific gates separate.

### 2026-10-03 — M10.5 runtime-budget failure triage

The four exact initialization failures load the compatibility `theme` entry, not `theme/core`. The corrected source profile did not show a repeated Crumbs function hotspot in those four compatibility cells; the one condition-snapshot scratch candidate was rejected because it increased graph size and worsened initialization medians. Current source-map attribution locates the large graph payload in the shared theme resolver, component contracts and extension validation, conditions, recipes, sprinkles, expressions, and token-domain modules. These are current module-size estimates, not exact byte deltas from the M4.6 baselines. A prior single-entry diagnostic improved compatibility import times and reduced graph bytes, but did not verify the required focused-entry function identity. No production change or budget adjustment is justified yet. See the [runtime-budget failure triage assessment](assessments/2026-10-03-m10-5-runtime-budget-failure-triage.md).

Next recommended roadmap slice: **M10.5 identity-preserving compatibility-entry chunk-layout A/B** — test whether a smaller/faster `theme` load can retain all current exports and compatibility-to-focused function identity. Keep the four initialization and two compatibility-graph limits unchanged; retain separate follow-up for `theme/core` and token graphs. Android remains parked for last.

### 2026-10-03 — M10.5 compatibility-entry chunk-layout A/B

A paired scratch build compared the current multi-entry theme output with a one-file compatibility `theme` candidate. The single file reduced its ESM/CJS graph by 6,195/12,301 bytes and improved all four import medians, but it did not meet the package contract: keeping focused entries separate broke strict identity for all 23 shared values in both formats, while recipe/sprinkles facades made those focused graphs 115–1,173% larger. Conditions and expressions also expose focused exports absent from the compatibility entry. The candidate remained above both Node 24 initialization limits. It was rejected; no runtime, export map, build configuration, budget, or threshold changed. The [assessment](assessments/2026-10-03-m10-5-identity-preserving-chunk-layout-ab.md) and [machine-readable A/B evidence](evidence/2026-10-03-m10-5-identity-chunk-ab/qualification.json) retain export, identity, graph, and 128-process timing receipts. M10.5 remains open.

Next recommended roadmap slice: **M10.5 source-level runtime optimization** — reduce measured resolver and component-contract costs while preserving focused and compatibility API/identity contracts and the existing budgets. Keep `theme/core`, token graphs, and native/device acceptance as separate gates; Android remains last.

### 2026-10-03 — M10.5 extension descriptor validation scan reduction

The extension descriptor validator no longer performs a symbol-only own-key scan immediately before `Reflect.ownKeys`; symbol rejection, array diagnostics, and accessor safety remain covered. Package typecheck and build pass. A paired descriptor-normalization microbenchmark was neutral within run-to-run spread, so this is retained as a small validation-path cleanup and is not counted as a runtime-performance pass. With reduced test concurrency, 1,349 package tests passed and one migration-export graph test exceeded its 5-second suite-load timeout; that file passed all four tests when isolated. See the [assessment](assessments/2026-10-03-m10-5-extension-validation-scan.md). M10.5 remains open; the existing device and compatibility budgets are unchanged.

Next recommended roadmap slice: **M10.5 targeted resolver CPU attribution** — profile component-recipe and extension validation separately with representative descriptors, then select a candidate with a measurable impact. Keep runtime graph budgets, native/device evidence, and Android as separate gates.

### 2026-10-03 — M10.5 targeted resolver CPU attribution

Seven source-mapped Node profiles per workload attributed 44.18% of component-contract samples to `readArray` and 89.64% of extension-descriptor samples to `normalizeClassReference`. A scratch A/B that removed the duplicate top-level class-reference probe lowered the representative extension-validation median from 549.233 µs to 308.123 µs per descriptor across 13 fresh processes per variant (43.90%); the sampled ranges did not overlap. Plain-style freezing, class-reference marker normalization, and accessor rejection receipts matched. This is Node v24.15.0 macOS host evidence only; no production source, API, runtime budget, or release gate changed. See the [assessment](assessments/2026-10-03-m10-5-targeted-resolver-profile.md) and [machine-readable profile and A/B evidence](evidence/2026-10-03-m10-5-targeted-resolver-profile/qualification.json). M10.5 remains open; Android remains last.

Next recommended roadmap slice: **M10.5 extension descriptor normalization fast path** — remove the duplicate top-level class-reference probe with adversarial contract coverage, then repeat the paired benchmark against the production implementation. Keep component-contract `readArray` profiling, runtime graph budgets, native/device evidence, and Android as separate gates.

### 2026-10-03 — M10.5 extension descriptor normalization fast path

The descriptor style normalizer no longer probes a root value as a class reference before passing it to the recursive clone, which already performs that validation. Tagged and untagged references still normalize to frozen, marked values; accessors, symbol keys, custom prototypes, and cycles remain rejected. The proxy regression observed three own-key scans before and is now capped at two. The production-source A/B lowered the representative extension-validation median from 512.156 µs to 286.358 µs per descriptor (44.09%) across 13 fresh processes per variant, with non-overlapping ranges. This is Node v24.15.0 macOS host evidence only; package behavior and budgets were not widened. The full package run had one 5-second timeout in the generated native-composition test; all 1,352 other tests passed and the timed-out file passed in isolation. See the [assessment](assessments/2026-10-03-m10-5-extension-descriptor-normalization-fast-path.md) and [A/B evidence](evidence/2026-10-03-m10-5-extension-normalization-fast-path/qualification.json). M10.5 remains open; Android remains last.

Next recommended roadmap slice: **M10.5 component-contract array-validation A/B** — isolate the measured `readArray` cost and test one bounded candidate before changing that validator. Keep the exact Node v22.0.0 host-budget gate as the final M10.5 step; native/device evidence and Android remain separate gates.


### 2026-10-04 — M10.5 component-contract array-validation A/B

The unchanged `contracts.ts` source remains the `readArray` hotspot identified by the prior M10.5 profile. A 13-process paired A/B found a descriptor-snapshot scratch candidate 12.98% faster at the median with non-overlapping ranges. It preserves descriptor reads for array `length`, but reuses the validated key snapshot, reducing proxy `ownKeys` trap calls from three to two. A faster per-index candidate skips the `length` descriptor and changes a throwing proxy trap from rejection to acceptance. No production change was made because proxy trap behavior needs an explicit compatibility decision. See the [assessment](assessments/2026-10-04-m10-5-component-array-validation-ab.md) and [machine-readable evidence](evidence/2026-10-04-m10-5-array-validation-ab/qualification.json).

Next recommended roadmap slice: **M10.5 component-contract descriptor-snapshot implementation gate** — define the compatibility expectation for side-effectful and stateful array proxies; if one fewer `ownKeys` trap call is acceptable, add adversarial regression coverage, implement the descriptor-snapshot candidate, and repeat the production-source A/B. Keep the exact Node v22.0.0 host-budget gate as the final M10.5 step; Android remains last.


### 2026-10-04 — M10.5 component-contract descriptor-snapshot implementation

`readArray` now reuses its validated own-key snapshot for descriptor reads,
retaining the `length` descriptor check and existing validation diagnostics.
The compatibility decision records exact Proxy trap counts as an implementation
detail: the stable-proxy regression observes `ownKeys` fall from three calls to
two, and stateful or side-effectful traps are outside the API guarantee. The
production-source A/B lowered the repeated contract-validation median by
12.75% (21.024 µs to 18.343 µs) across 13 fresh processes per variant, with
non-overlapping ranges. Seven deterministic cases, 300 generated array shapes,
the full 1,357-test CSS suite, build, and typecheck passed. This is Node v24.15
host evidence, not React Native, Hermes, device, or release-budget evidence.
See the [assessment](assessments/2026-10-04-m10-5-component-array-descriptor-snapshot.md)
and [machine-readable evidence](evidence/2026-10-04-m10-5-array-descriptor-snapshot/qualification.json).
M10.5 remains open; Android remains last.

Next recommended roadmap slice: **M10.5 exact Node v22.0.0 host-budget gate** —
run the approved host-budget suite on its required Node version without changing
thresholds, then record each pass, failure, or incomplete domain. Keep native
and device acceptance as separate gates; Android remains last.


### 2026-10-04 — M10.5 exact Node v22.0.0 host-budget gate

The committed source at `1ffc68f` was freshly built and the exact Node v22.0.0
host-budget suite completed. The comparison records one pass, ten failures
against approved limits, and ten incomplete comparisons due to warm-transform
ordering, Metro environment/fixture identity, and editor workload identity. The
exact-floor Node v22 ESM/CJS initialization medians and all six graph metrics
fail their existing limits. The Metro run completed five repetitions and
restored all fixtures. `budgets:validate` passes, while the registry remains
unready with device-facing work pending. No thresholds, baselines, or registry
members changed. This is host evidence, not Hermes/device or release
qualification. See the [assessment](assessments/2026-10-04-m10-5-node-22-host-budget.md)
and [machine-readable qualification](evidence/2026-10-04-m10-5-node-22-host-budget/qualification.json).
M10.5 remains open; Android remains last.

Next recommended roadmap slice: **M10.5 host-budget result triage** — explain
the exact-Node initialization and graph-size failures against current source,
then repair measurement identity for warm transform, Metro, and editor runs.
Keep existing approved thresholds and baselines unchanged until reviewed
evidence supports a specific update; native/device acceptance remains
separate and Android remains last.

### 2026-10-04 — M10.5 exact Node 22 host-budget result triage

The exact-floor host suite completed at source revision `1ffc68f` with one pass, ten approved-limit failures, and ten incomplete comparisons. Initialization medians for Node 22 are now 7.773 ms ESM and 4.612 ms CJS, above the unchanged 7.553/4.083 ms limits. They passed at source `374e4c4` and first failed at `78d9fd0`, after resolver extraction and focused-entry changes; existing CPU profiles are too sparse to attribute that regression to one function. Recent validator optimizations improved all four initialization medians by 2–6% from the intermediate run, while graph totals barely changed. The `theme/core` graph remains far above its historical limit, while `theme/core` and token totals are close to their October 1 sizes; compatibility `theme` has grown by 6,242 B ESM and 12,279 B CJS since then. Warm transform, Metro and eight editor metrics remain incomplete due to cwd/protocol, Expo/fixture/cache, and source/package/workload-identity differences. No threshold, baseline, runtime or API changed. See the [host-budget result triage](assessments/2026-10-04-m10-5-host-budget-result-triage.md).

### 2026-10-04 — M10.5 matched runtime-entry initialization and graph attribution

The fixed five-revision matrix first shows a clear initialization and graph jump at `4f7ab9d`, which grouped `theme`, `theme-core` and focused theme entries in one tsdown configuration. At that revision, ESM/CJS `theme/core` grows to 131/139 kB; the later core isolation returns it to 64.5/65.4 kB, while compatibility `theme` remains 6.2/12.3 kB above `374e4c4`. Four Node 22 current-source cohorts confirm the initialization failures; source-mapped CPU profiles cover too few Crumbs frames to select a function-level optimization. Compiled identity probes also find 21 of 22 shared value exports distinct between current `theme/core` and `theme`, while the grouped `4f7ab9d` build shared all 22 alongside its larger graph. The reference-identity contract for mixed entrypoint use remains unstated and needs an explicit decision. No production code, public contract, threshold or baseline changed. See the [matched-entry attribution assessment](assessments/2026-10-04-m10-5-matched-entry-attribution.md) and [qualification evidence](evidence/2026-10-04-m10-5-matched-entry-attribution/qualification.json).

### 2026-10-04 — M10.5 entrypoint package-group A/B

Three tsdown layouts were built and compared from source revision 0611321: the current split, a theme + theme/core pair, and all six theme entries grouped together. Both grouping candidates restore all 21 shared reference exports between theme and theme/core, but increase the theme/core graph by 94.9/99.1 kB and 66.5/73.1 kB respectively and fail its existing ESM/CJS optional-feature-isolation assertions. The current split preserves focused-entry references and remains the smallest theme/core graph of the tested layouts. In package-shaped Node consumers, six mixed provider/hook combinations pass on Node 22 and 24 for every layout, despite distinct exported function references in the split build. This is Node SSR evidence only; the one-cohort initialization timings do not qualify any layout. No production source, public API, threshold, or baseline changed. See the [assessment](assessments/2026-10-04-m10-5-package-group-ab.md) and [machine-readable evidence](evidence/2026-10-04-m10-5-package-group-ab/qualification.json).

### 2026-10-04 — M10.5 Expo/Metro mixed-entry interoperability qualification

Fresh Expo exports of the default Storybook app for web and iOS both resolve theme.mjs and theme-core.mjs from the package export map, with one React package root in each source map. The iOS result is Metro bundle evidence only. An isolated probe using the same Expo/Metro configuration rendered both ThemeProvider/useTheme entry directions and the Storybook TokenThemeProvider/theme-core hook combination in the web host, even though the two ThemeProvider exports remain distinct references. No package or runtime source changed. The default app's web bundle compiled but browser rendering stopped in AppThemeProvider with an isRTL boolean error; this is recorded separately from the successful mixed-entry probe. See the [assessment](assessments/2026-10-04-m10-5-expo-metro-interoperability.md) and [qualification evidence](evidence/2026-10-04-m10-5-expo-metro/qualification.json).

The **M10.5 Metro and editor measurement-identity repair** is complete; see the [assessment](assessments/2026-10-04-m10-5-metro-editor-identity.md), [qualification evidence](evidence/2026-10-04-m10-5-metro-editor-identity/qualification.json), and [full host reports](evidence/2026-10-04-m10-5-metro-editor-identity/host-budgets/). All 21 recorded comparisons now have exact environment/workload identities: ten pass and eleven fail their unchanged approved limits, with no incomplete comparisons. Metro and all eight editor metrics pass; the warm-transform budget and ten runtime-initialization/graph budgets remain failed. The diagnostic-only emitted-byte comparison remains separately visible. The registry and overall host gate remain unready; no thresholds or baselines changed. **Next recommended roadmap slice: M10.5 warm-transform cost remediation** — profile the exact historical package-root workload and test a bounded optimization against its existing output-parity assertion and approved limit. Keep runtime-footprint and device gates separate; Android remains last.

## M11 — Deliver the selected native extensions

On 2026-10-08 the user selected M11.1–M11.5 as the final feature scope before aiming to ship and approved the conversational design direction for M11.1. Deliver these as five additive implementation slices, preserving existing public APIs. Each slice requires a reviewed concrete design/plan, semantic and type checks, relevant property tests and cost evidence, an internal native Expo example, packed-consumer qualification, documentation and a commit. The 2026-09-30 assessments below remain historical evidence; the new scope activates delivery without claiming they demonstrated adopter demand.

- [x] **M11.1 — Standalone variables and local assignment:** complete on 2026-10-09. Typed `createVar`/`fallbackVar`, immutable per-instance `assignVars`, pure resolution and a Hook through `/theme/vars`; frozen local-plan v1 compiler output, native type/domain guards, dependency metadata and cache reuse. The reviewed build passes 1,631 CSS and 24 Storybook tests, packed Node/React/type/Expo controls, and final-artifact iOS Simulator/Android emulator transitions. See the [assessment](assessments/2026-10-08-m11-1-local-vars.md), [implementation plan](superpowers/plans/2026-10-08-m11-1-local-vars.md) and [evidence packet](evidence/2026-10-08-m11-1-local-vars/README.md). The unchanged matched host collector retains only the existing blocking warm-transform failure; M10.5 and publication remain open. Physical-device/screen-reader work remains deferred. Next: **M11.2 — container conditions**.
- [x] **M11.2 — Container conditions:** complete on 2026-10-09. Named headless width/height owners, explicit unmeasured/nearest-owner semantics, finite buckets, selection-aware subscriptions, cleanup and resize-feedback checks through the optional `/theme/containers` entry. The reviewed build qualifies 1,674 CSS and 25 Storybook tests, 89 installed host commands, 14 iOS and 14 Android phases, 30 inspected captures and exact-artifact audit; Important Suspense/context/native-integrity findings are repaired. The user explicitly approved deferring the incremental-rebuild budget failure to **M10.5 release closure** (final repeat 136.354667 ms against the unchanged 136.34555 ms cap), alongside the existing warm blocker. Both failed reports and the active release gate remain unchanged. See the [design](superpowers/specs/2026-10-09-m11-2-container-conditions-design.md), [plan](superpowers/plans/2026-10-09-m11-2-container-conditions.md), [assessment](assessments/2026-10-09-m11-2-container-conditions.md) and [evidence](evidence/2026-10-09-m11-2-container-conditions/README.md). Physical/screen-reader work remains deferred. Next: **M11.3 — native motion adapter**.
- [x] **M11.3 — Native motion adapter:** complete in the implementation commit containing this record. Additive pure defineMotion and optional public-Animated Hook, exact inferred targets, reduced motion, interruption/cancellation and finite lifetime/failure ownership. One fresh review's two Important findings are repaired in one RED/GREEN pass. Final build/strict types,1,732 CSS/28 Storybook tests, actual ESM/CJS-first installed orders, genuine pure Node22/current/two-copy probes, three Expo exports and28 iOS/27 Android rendered/native-preference phases pass;839 bindings and five dependency restorations are audited. The unchanged matched report passes10 blocking metrics; warm-transform9.219709ms remains failed under M10.5. Current cold/editor pass; superseded failed reports remain retained, without a waiver or causal improvement claim. See the [design](superpowers/specs/2026-10-09-m11-3-native-motion-design.md), [plan](superpowers/plans/2026-10-09-m11-3-native-motion.md), [assessment](assessments/2026-10-09-m11-3-native-motion.md) and [evidence](evidence/2026-10-09-m11-3-native-motion/README.md). Physical/reader/liveHMR/release-FPS work remains unqualified. Next: **M11.4 — richer token algebra**.
- [x] **M11.4 — Richer token algebra:** complete in the implementation commit containing this record. Optional pure `/tokens/algebra` provides explicit encoded/linear sRGB premultiplied mixing, alpha operations and immutable finite typography scales with unscaled native units. The Important union-input type gap is repaired in one RED/GREEN pass; strict source/installed declarations,1,768 CSS/29 Storybook tests, three packed Expo exports,12 iOS/12 Android phases and1,688 binding checks pass. Original dependency roots, native preferences and owned processes are restored. The unchanged matched collector passes10 blocking metrics; warm-transform9.110458ms remains failed under **M10.5**, with no new blocker or release waiver. See the [design](superpowers/specs/2026-10-09-m11-4-token-algebra-design.md), [plan](superpowers/plans/2026-10-09-m11-4-token-algebra.md), [assessment](assessments/2026-10-09-m11-4-token-algebra.md) and [evidence](evidence/2026-10-09-m11-4-token-algebra/README.md). Bounded diagnostic paths are deferred; physical/reader/browser/liveHMR/release-FPS checks remain unqualified. Next: **M11.5 — constrained serialization and extension protocol**.
- [x] **M11.5 — Constrained serialization and extension protocol:** typed Crumbs factories backed by explicit runtime imports selected by the user on 2026-10-09. The [written spec](superpowers/specs/2026-10-09-m11-5-runtime-extensions-design.md), approved on 2026-10-10, uses a type-only runtime-module contract, named factory selection, bounded versioned arguments, native style lowering and callable stylesheet exports. The reference case compares a shared styled native component factory with today’s data-plus-wrapper approach; no arbitrary closure or registry is introduced. The [native/inline implementation plan](superpowers/plans/2026-10-10-m11-5-runtime-extensions.md) was approved as written on 2026-10-10. The single fresh review and three Important repairs are complete. Final repaired-source strict source/installed types, 1,828 CSS/33 Storybook tests, three packed Expo exports, cost and docs pass. Current repaired-source12 iOS/12 Android phases and18 direct visual checks pass, with2,171 verified source/artifact/native/evidence bindings. Original dependency roots/owned links and native settings/processes are restored and independently checked. The direct subsequent user request to commit, push and prepare v1 closes functional M11.5, retaining the new cold-transform failure under M10.5 without changing the release gate. Complete in the single implementation commit containing this record, subject to independent commit verification. See the [assessment](assessments/2026-10-10-m11-5-runtime-extensions.md) and [evidence](evidence/2026-10-10-m11-5-runtime-extensions/README.md). One complete implementation slice and one final implementation commit are retained.
- [ ] **M11.6 — Parked optional integrations:** design-tool/editor adapters and a distinct web backend remain subject to demonstrated consumer demand and a separate decision. They are excluded from the selected pre-release feature scope. Browser globals, cascade, font-face, layers and view transitions do not become implicit native-core promises.

**Delivery order:** M11.1 → M11.2 → M11.3 → M11.4 → M11.5 → M10.5 release closure. This direction does not waive the remaining host gate, change numerical limits, qualify an exact release artifact or authorise publication. The active [consumer-scope host-policy evidence](assessments/2026-10-08-m10-5-consumer-policy-implementation.md) retains the warm-transform failure. The [M11.2 matched reports](assessments/2026-10-09-m11-2-container-conditions.md) additionally retain an incremental-rebuild failure, explicitly deferred into M10.5 release closure on 2026-10-09. Neither failure is waived by the active release gate. Matching-runner and exact release-artifact qualification remain separate prerequisites. Android emulator acceptance is included where relevant; all physical-device work remains deferred by user instruction.

### 2026-09-30 — M11 container-condition dogfood assessment

The internal Expo reference app currently uses a screen-level width condition and fluid wrapping/flex layouts. No same-component, independently constrained parent-width case was demonstrated. Container conditions stay parked until an actual reference/adopter scenario shows that existing composition and intrinsic layout are insufficient. This source review is not native-device acceptance. M11 consumer-need assessment may proceed while the final M10.5 host/device gates remain open; the Node v22.0.0 host-budget gate is explicitly last. See [assessment](assessments/2026-09-30-m11-container-conditions.md).

At the time of this assessment, the next recommended M11 check was to evaluate standalone token-variable assignment convenience against a concrete per-instance override in the reference app. Existing M3 contracts, scopes, and fallbacks must be shown insufficient before adding a public API.

### 2026-09-30 — M11 standalone token-assignment dogfood assessment

The reference Expo app uses typed M3 token contracts for a complete base theme and semantically named brand, mode, and density scopes. Its partner-brand example reuses the same card and dialog under nested scopes; finite pressed, disabled, focused, invalid, and selected states use component recipes. No `createVar`, `fallbackVar`, or `assignVars` equivalent is used in `apps/storybook/src`. This source review found no demonstrated demand for arbitrary local assignment. It also confirms that M3's fixed context axes do not model arbitrary instance-owned values; reusing `brand` for such values would weaken the scope semantics. This is not runtime or device-performance evidence. See [assessment](assessments/2026-09-30-m11-standalone-token-assignment.md).

Keep the public API extension parked until a real component needs an instance-owned, domain-checked token value that existing semantic scopes or finite variants cannot represent cleanly. At the time of this assessment, the next recommended roadmap slice was to assess the M11 motion-adapter item against a concrete reference interaction. The Node v22.0.0 host-budget gate remains the final M10.5 gate; Android remains parked.

### 2026-09-30 — M11 motion-adapter dogfood assessment

The reference app has one explicit reduced-motion animation: it resolves a zero or 550 ms duration from the M6 condition snapshot, then runs `Animated.timing` with React Native's native driver on native platforms. If the system preference changes to reduced while the sample is active, it stops the animation and moves to the endpoint. M10.3 records iOS observation of the preference change and endpoint. The motion values are owned by React Native `Animated`; Crumbs styles the static track and marker and does not resolve theme styles on each frame. The app declares Reanimated, but this sample imports `Animated` from `react-native`. No second Crumbs animation consumer or adapter-specific pain was demonstrated, so keep M11 adapter implementation parked. A focused test for the sample's interruption/cancellation path is absent and device performance is unmeasured; this review does not claim general animation acceptance. See [assessment](assessments/2026-09-30-m11-motion-adapter.md).

At the time of this assessment, the next recommended M11 assessment was to evaluate the token-algebra item against the reference theme's explicitly authored brand/mode accent and contrast layers. If optional extensions show no concrete consumer need, return to the final M10.5 qualification gates; the Node v22.0.0 host-budget gate remains last and Android remains parked.

### 2026-09-30 — M11 token-algebra dogfood assessment

The reference theme explicitly authors a small fixed palette for two brands and two modes, plus one shared more-contrast palette. Tests assert those selected values. The current expression algebra supports numeric add/subtract/scale/clamp and finite condition matches; color values can be selected as branches but have no arithmetic operators, and typography is not an expression domain. No expression API use was found in the Storybook consumer. Its deterministic contrast review records six known normal-contrast failures on `accentMuted`; adding generic color arithmetic would not itself define or guarantee readable foreground/background pairs. Park new color/typography derivation operators pending a repeated consumer need and a precise semantic contract. Treat the known palette failures as a separate M10.5 visual/accessibility follow-up. See [assessment](assessments/2026-09-30-m11-token-algebra.md).

The M10.5 visual/accessibility follow-up for the six reported normal-contrast pairs is complete; the next overall M10.5 gate is the exact Node v22.0.0 host-budget measurement. Android remains parked.

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

### 2026-10-01 — M0.9 Android native journey acceptance

The Expo Go workspace consumer passed two fresh-state positive Maestro runs on an Android 16 / API 36 `medium_phone` emulator, plus the expected negative control. Both positives verified a fresh list at row 1, native forward scroll to row 6, theme change without moving the list, and reverse scroll to row 1. The negative control passed launch and initial-probe checks, then failed only its deliberately unsatisfied no-scroll assertion. Measurements, six screenshots, Maestro command records, environment details and the bundle digest are retained in [M0.9 Android acceptance](acceptance/2026-10-01-android/README.md). The probe's touch-end counter stayed at zero in both positive runs despite native drag starts/moves and visible scroll changes, so end-event telemetry is not qualified.

Expo Go 56.0.4 / SDK 56.0.0 ran Expo 56.0.23, React Native 0.85.3, React 19.2.3 and `@expo/metro-runtime` 56.0.21. A Metro bundle guard verified four React module files from one physical React package root. The workspace resolver now normalizes linked-worktree React paths, and the Maestro Android launcher clears app state before opening the emulator host URL. The probe is development-only: this does not qualify release Hermes performance, M1.6 device budgets, Android Storybook rendering/accessibility, physical devices or screen readers. A host-specific ADB port-range workaround is documented with the evidence and is not a project setting.

M0.9 is complete, including its Android Expo playground journey. The next item at that point was M10.5.3 Android Storybook acceptance; that slice is now complete as recorded above. **Next recommended roadmap item: M10.5 final qualification refresh** — refresh stale source-level checks, then run the exact Node v22.0.0 host-budget gate last.

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

### 2026-09-19 — M2.2aa text-decoration colour scalar IR

- Migrated text-only `textDecorationColor` through the non-empty colour string/token domain. Capture and Effect Schema decoding reject view/image use and forged primitive domains consistently.
- Focused qualification passed 38 tests with 383 assertions; full qualification passed 470 tests across 76 files with 17,007 assertions. See [evidence](assessments/2026-09-19-native-ir-text-decoration-color.md).

Next recommended slice: **M2.2ab** — migrate text-only typography metrics (`fontSize`, `letterSpacing`, `lineHeight`) through the finite numeric/token domain. Begin only after approval.

### 2026-09-19 — M2.2ab typography-metric scalar IR

- Migrated text-only `fontSize`, `letterSpacing` and `lineHeight` as independent finite-number/token declarations. Signed finite values retain exact identity; CSS unit parsing and native range policy remain outside marked native capture.
- Focused qualification passed 43 tests with 521 assertions; full qualification passed 475 tests across 77 files with 17,145 assertions. See [evidence](assessments/2026-09-19-native-ir-typography-metrics.md).

Next recommended slice: **M2.2ac** — introduce a property-specific non-empty string/token domain for text-only `fontFamily`, without admitting arbitrary strings to numeric scalar families. Begin only after approval.

### 2026-09-19 — M2.2ac font-family scalar IR

- Migrated text-only `fontFamily` through a dedicated non-empty string/token domain. Capture and Effect Schema decoding reject empty values, non-string literals, view/image use and forged string values on numeric properties.
- Focused qualification passed 29 tests with 478 assertions; full qualification passed 480 tests across 78 files with 17,261 assertions. See [evidence](assessments/2026-09-19-native-ir-font-family.md).

Next recommended slice: **M2.2ad** — migrate text-only `fontStyle` and `fontWeight` through explicit literal/token domains matching the installed React Native contracts, without widening unrestricted string admission. Begin only after approval.

### 2026-09-19 — M2.2ad font-variant scalar IR

- Migrated text-only `fontStyle` and `fontWeight` through a shared property-specific literal/token table. All installed React Native string and numeric weight forms retain exact identity; unsupported literals and forged cross-property values fail at capture and Effect Schema decoding.
- Focused qualification passed 34 tests with 636 assertions; full qualification passed 485 tests across 79 files with 17,419 assertions. See [evidence](assessments/2026-09-19-native-ir-font-variants.md).

Next recommended slice: **M2.2ae** — migrate text alignment fields (`textAlign`, `textAlignVertical`, `verticalAlign`) through explicit property-specific literal/token domains matching the installed React Native contracts. Begin only after approval.

### 2026-09-19 — M2.2ae text-alignment scalar IR

- Migrated text-only `textAlign`, `textAlignVertical` and `verticalAlign` through property-specific literal/token domains. Capture and Effect Schema decoding share exact installed React Native value sets and reject cross-property literals even where domains overlap.
- Focused qualification passed 29 tests with 528 assertions; full qualification passed 490 tests across 80 files with 17,565 assertions. See [evidence](assessments/2026-09-19-native-ir-text-alignment.md).

Next recommended slice: **M2.2af** — migrate text-only `textDecorationLine` and `textDecorationStyle` through explicit property-specific literal/token domains, retaining `textDecorationColor` as its independently qualified colour field. Begin only after approval.

### 2026-09-19 — M2.2af text-decoration literal scalar IR

- Migrated text-only `textDecorationLine` and `textDecorationStyle` through exact property-specific literal/token domains. The fields retain independent ordering and remain separate from the qualified `textDecorationColor` colour domain.
- Focused qualification passed 29 tests with 471 assertions; full qualification passed 495 tests across 81 files with 17,697 assertions. See [evidence](assessments/2026-09-19-native-ir-text-decoration.md).

Next recommended slice: **M2.2ag** — migrate text-only `textTransform`, `writingDirection` and `userSelect` through exact installed React Native literal/token domains. Begin only after approval.

### 2026-09-19 — M2.2ag text-control scalar IR

- Migrated text-only `textTransform`, `writingDirection` and `userSelect` through exact property-specific literal/token domains. Capture and Effect Schema decoding reject cross-property literals, invalid primitives and forged provenance consistently.
- Focused qualification passed 29 tests with 515 assertions; full qualification passed 500 tests across 82 files with 17,842 assertions. See [evidence](assessments/2026-09-19-native-ir-text-controls.md).

Next recommended slice: **M2.2ah** — introduce a property-specific boolean/token domain and migrate text-only Android `includeFontPadding`, without admitting booleans to numeric or string scalar families. Begin only after approval.

### 2026-09-19 — M2.2ah boolean scalar IR

- Added boolean values to the IR carrier and admitted them only for text-only Android `includeFontPadding`, alongside token references. Effect Schema decoding rejects forged boolean values on every numeric and string scalar family.
- Focused qualification passed 29 tests with 487 assertions; full qualification passed 505 tests across 83 files with 17,960 assertions. See [evidence](assessments/2026-09-19-native-ir-include-font-padding.md).

Next recommended slice: **M2.2ai** — migrate shared layout mode fields (`display`, `position`, `direction`) through exact installed React Native literal/token domains across their supported primitives. Begin only after approval.

### 2026-09-19 — M2.2ai layout-mode scalar IR

- Migrated `display`, `position` and `direction` across view, text and image through exact installed React Native literal/token domains. Capture and Effect Schema decoding share the same property-specific value sets, provenance rules and primitive matrix.
- Focused qualification passed 29 tests with 500 assertions; full qualification passed 510 tests across 84 files with 18,118 assertions. See [evidence](assessments/2026-09-19-native-ir-layout-modes.md).

Next recommended slice: **M2.2aj** — migrate `overflow` with primitive-aware literal admission so `scroll` remains valid for view/text while image retains its narrower installed domain. Begin only after approval.

### 2026-09-19 — M2.2aj primitive-aware overflow scalar IR

- Added a reusable primitive-specific literal-domain table and migrated `overflow`. View/text admit `visible`, `hidden` and `scroll`; image admits only `visible` and `hidden`; token references remain valid across all supported primitives.
- Focused qualification passed 29 tests with 704 assertions; full qualification passed 515 tests across 85 files with 18,440 assertions. See [evidence](assessments/2026-09-19-native-ir-overflow.md).

Next recommended slice: **M2.2ak** — migrate the shared flex layout controls (`flexDirection`, `flexWrap`, `alignContent`, `alignItems`, `alignSelf`, `justifyContent`) through exact installed literal/token domains. Begin only after approval.

### 2026-09-19 — M2.2ak flex-layout scalar IR

- Migrated `flexDirection`, `flexWrap`, `alignContent`, `alignItems`, `alignSelf` and `justifyContent` across view, text and image through exact installed React Native literal/token domains.
- Focused qualification passed 29 tests with 791 assertions; full qualification passed 520 tests across 86 files with 18,685 assertions. See [evidence](assessments/2026-09-19-native-ir-flex-layout.md).

Next recommended slice: **M2.2al** — migrate shared `boxSizing` through its exact literal/token domain, then use that small boundary to audit the remaining FlexStyle fields before opening a new value carrier. Begin only after approval.

### 2026-09-19 — M2.2al box-sizing scalar IR and FlexStyle audit

- Migrated `boxSizing` across view, text and image through the installed `border-box | content-box` literal/token domain.
- Audited the installed React Native FlexStyle contract against scalar IR. `aspectRatio` is the sole remaining field and needs a property-specific finite-number/non-empty-string/token domain; every other FlexStyle field is represented.
- Focused qualification passed 29 tests with 587 assertions; full qualification passed 525 tests across 87 files with 18,803 assertions. See [evidence](assessments/2026-09-19-native-ir-box-sizing.md).

Next recommended slice: **M2.2am** — migrate `aspectRatio` through an isolated finite-number/non-empty-string/token domain, completing the installed FlexStyle surface without widening arbitrary strings into other numeric properties. Begin only after approval.

### 2026-09-19 — M2.2am aspect-ratio scalar IR

- Migrated `aspectRatio` across view, text and image through an isolated finite-number/non-empty-string/token domain. Arbitrary strings remain rejected by every existing numeric property.
- Completed scalar-IR coverage of the installed React Native FlexStyle surface.
- Focused qualification passed 30 tests with 476 assertions; full qualification passed 531 tests across 88 files with 18,937 assertions. See [evidence](assessments/2026-09-19-native-ir-aspect-ratio.md).

Next recommended slice: **M2.2an** — begin the shared ViewStyle/ImageStyle literal surface with `backfaceVisibility` and `cursor`, using their exact installed domains across supported primitives. Begin only after approval.

### 2026-09-19 — M2.2an visibility and cursor scalar IR

- Migrated `backfaceVisibility` and `cursor` across view, text and image through exact installed React Native literal/token domains.
- Focused qualification passed 30 tests with 491 assertions; full qualification passed 536 tests across 89 files with 19,070 assertions. See [evidence](assessments/2026-09-19-native-ir-visibility-cursor.md).

Next recommended slice: **M2.2ao** — migrate view/text-only `borderCurve` and `pointerEvents` through exact literal/token domains, preserving their narrower primitive contracts. Begin only after approval.

### 2026-09-19 — M2.2ao view-interaction scalar IR

- Migrated view/text-only `borderCurve` and `pointerEvents` through exact installed React Native literal/token domains. Capture and Effect Schema decoding reject image use consistently.
- Focused qualification passed 29 tests with 493 assertions; full qualification passed 541 tests across 90 files with 19,206 assertions. See [evidence](assessments/2026-09-19-native-ir-view-interaction.md).

Next recommended slice: **M2.2ap** — batch the remaining exact literal surface: view/text-only `borderStyle`, `outlineStyle`, `isolation` and `mixBlendMode`, plus image-only `resizeMode` and `objectFit`. Begin only after approval.

### 2026-09-20 — M2.2ap batched literal surface scalar IR

- Migrated view/text-only `borderStyle`, `outlineStyle`, `isolation` and `mixBlendMode`, plus image-only `resizeMode` and `objectFit`, through exact installed React Native literal/token domains.
- Focused qualification passed 6 tests with 319 assertions; full qualification and consumer evidence are recorded in the matching evidence file.

Next recommended slice: **M2.2aq** — batch the remaining outline and logical border-colour scalars: `outlineColor`, `outlineOffset`, `outlineWidth`, `borderBlockColor`, `borderBlockStartColor` and `borderBlockEndColor`. Begin only after approval.

### 2026-09-20 — M2.2aq outline and logical border-colour scalar IR

- Migrated view/text-only `outlineColor`, `outlineOffset`, `outlineWidth`, `borderBlockColor`, `borderBlockStartColor` and `borderBlockEndColor` through the established colour and finite-number/token domains.
- Focused qualification passed 5 tests with 190 assertions; full qualification and consumer evidence are recorded in the matching evidence file.

### 2026-09-20 — M2.2ar structured boundary audit and shadow-offset IR

- Audited the installed React Native style surface against the native compiler: scalar transform companions remain a finite-number follow-up; `shadowOffset` and `textShadowOffset` are fixed objects; `transform` is an ordered array; `transformOrigin` and `transformMatrix` are exact unions/arrays; `fontVariant` is a text-only array; and `boxShadow`, `filter` and experimental background fields require separate union contracts.
- Migrated view/text/image `shadowOffset` through a strict Effect Schema structured IR with descriptor-safe admission, fixed finite `width`/`height`, provenance, primitive-domain composition and whole-value last-winner lowering. Malformed marked values retain the established compatibility diagnostic at the transformer boundary; unmarked records remain on the compatibility route.
- Focused structured qualification passed 12 tests with 244 assertions; full qualification, consumer, documentation and performance gates are recorded in the matching evidence file.

### 2026-09-20 — M2.2as scalar transform companion IR

- Migrated `rotation`, `scaleX`, `scaleY`, `translateX` and `translateY` through the finite-number/token scalar domain across view, text and image, matching the installed `TransformsStyle` inheritance. The direct fields remain independent from the ordered `transform` array contract.
- Added the two missing translate companion names to the CSS-to-React-Native native property allowlist so compatibility conversion recognises the complete installed companion family.
- Focused qualification passed 5 tests with 200 assertions; full qualification, consumer, documentation and performance gates are recorded in the matching evidence file.

Next recommended slice: **M2.2at** — migrate text-only `textShadowOffset` through the fixed finite `{ width, height }` structured contract, reusing the `shadowOffset` boundary while preserving its narrower primitive domain. Begin only after approval.

### 2026-09-20 — M2.2at text-shadow offset structured IR

- Migrated text-only `textShadowOffset` through the shared fixed finite `{ width, height }` structured IR. Property-specific primitive admission keeps the declaration text-only, while `shadowOffset` retains its view/text/image contract.
- A marked text rule may carry both offset properties when their shared domain is text; each property keeps its own provenance and whole-value last-winner ordering. Malformed, decorated and forged values fail at the Effect Schema boundary; unmarked records remain on the compatibility route.
- Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file.

The approved M2.2au batch below closes the static `transformOrigin`, `transformMatrix` and `fontVariant` families. The ordered `transform` array remains the next structured-array contract and is now tracked as M2.2av.

### 2026-09-20 — M2.2au batched structured array IR

- Migrated `transformOrigin` as a dense two- or three-entry finite-number/percentage tuple, `transformMatrix` as a dense sixteen-entry finite-number matrix, and text-only `fontVariant` as a dense array of installed React Native literals.
- Shared descriptor-safe array admission rejects sparse, accessor-backed, decorated, wrong-length, non-finite and unsupported values. Effect Schema, provenance and primitive matrices remain property-specific; whole-value last-winner composition is independent per property.
- Added `transformMatrix` to the native CSS conversion allowlist. Ordered `transform` and broad structured unions remain separate contracts; unmarked arrays remain on the compatibility route.
- Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file.

Next recommended slice: **M2.2av** — migrate the ordered `transform` array through an explicit operation union that preserves authored order, separates percentage translations from direct scalar companions and rejects unsupported dynamic entries. Begin only after approval.

### 2026-09-20 — M2.2av ordered transform structured IR

- Migrated marked static `transform` arrays through an explicit thirteen-form operation union: finite numeric operations, finite `deg`/`rad` angles, finite numeric/percentage translations and an exact sixteen-number matrix.
- Descriptor-safe capture validates one operation key per entry, preserves authored order, deep-freezes nested matrix values and rejects dynamic, accessor-backed, sparse, decorated, malformed or non-finite inputs. String transforms and unmarked arrays remain on the compatibility route.
- Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file.

Next recommended slice: **M2.2aw** — migrate the closed `boxShadow` item union as its own structured contract, separating finite/percentage offsets, optional blur/spread and colour admission from the ordered transform family. Keep `filter` and experimental background arrays deferred until their item semantics are independently specified. Begin only after approval.

### 2026-09-20 — M2.2aw closed box-shadow structured IR

- Migrated marked static view-only `boxShadow` arrays through a closed item union with required finite-number/percentage offsets, optional non-empty colour, non-negative finite blur, finite spread and boolean inset.
- Descriptor-safe dense-array and item admission rejects accessors, symbols, sparse/decorated arrays, extra keys, nested tokens, unsupported unit strings and non-finite values. Effect Schema, provenance and primitive matrices remain property-specific; whole-list last-winner composition is independent of ordered transform composition.
- CSS string shadows remain on the compatibility route. `filter` and experimental background arrays remain deferred as separate contracts.
- Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file.

Next recommended slice: **M2.2ax** — audit and migrate the remaining `filter` function union with property-specific numeric/string domains and the `dropShadow` nested item contract; keep experimental background arrays deferred until their gradient and position semantics are separately qualified. Begin only after approval.

### 2026-09-20 — M2.2ax closed filter structured IR

- Migrated marked static view/text `filter` arrays through a closed function union: property-specific non-negative amount, blur and hue-angle domains plus a nested `dropShadow` item contract with finite numeric/zero/pixel lengths and validated colour payloads.
- Descriptor-safe dense-array, function and nested-item admission rejects accessors, symbols, sparse/decorated arrays, extra keys, nested tokens, animated values, unsupported units and image primitive use. Effect Schema, provenance and primitive matrices remain property-specific; whole-list last-winner composition is independent of the other structured families.
- CSS filter strings remain on the compatibility route. Experimental background arrays remain deferred as a separate contract.
- Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file.

Next recommended slice: **M2.2ay** — audit the experimental background family (`experimental_backgroundImage`, `experimental_backgroundSize`, `experimental_backgroundPosition` and `experimental_backgroundRepeat`) as independent gradient, size, position and repeat contracts before choosing any static IR migration. Begin only after approval.

### 2026-09-20 — M2.2ay experimental background audit

- Audited the installed ViewStyle/TextStyle experimental background surface and its separate React Native processors: closed repeat records, size records with keyword/length semantics, four-shape position unions and nested linear/radial gradient images.
- Confirmed that size, position and repeat arrays pass through the JavaScript processors without validation, while image arrays apply colour-stop validation, parser defaults and gradient-unit handling unless native CSS parsing bypasses them. The CSS-to-React-Native allowlist currently excludes all four experimental fields, so compatibility strings remain runtime-only.
- Chose a staged migration order of repeat → size → position → image. Gradient-image work remains behind a native-device gate because of opaque platform colours, transition hints, parser defaults, native CSS parsing and experimental platform support.
- Audit evidence is recorded in the matching assessment and qualification file; no public API, structured IR or native ABI changed.

Next recommended slice: **M2.2az** — migrate `experimental_backgroundRepeat` as a view/text-only closed `{ x, y }` literal record, preserving compatibility strings and whole-value composition. Begin only after approval.

### 2026-09-20 — M2.2az experimental background repeat structured IR

- Migrated marked static `experimental_backgroundRepeat` arrays through a view/text-only closed `{ x, y }` record with the installed `repeat`, `space`, `round` and `no-repeat` keyword domain.
- Descriptor-safe dense-array and record admission rejects accessors, symbols, sparse/decorated or subclassed arrays, extra keys, dynamic values and image primitive use. Effect Schema, provenance and primitive matrices remain property-specific; whole-list last-winner composition is preserved, including empty-list replacement.
- Repeat strings remain on the compatibility route and the experimental field remains outside the CSS-to-React-Native allowlist. No public API, native ABI or native-device acceptance claim changed.
- Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file.

Next recommended slice: **M2.2ba** — migrate `experimental_backgroundSize` as a separate view/text-only keyword or `{ x, y }` length record, with an explicit finite non-negative length-percentage domain. Begin only after approval.

### 2026-09-20 — M2.2ba experimental background size structured IR

- Migrated marked static `experimental_backgroundSize` arrays through a view/text-only union of `cover`/`contain` and exact `{ x, y }` records.
- The static length domain admits finite non-negative numbers, `auto`, and finite non-negative `px` or percentage strings. Descriptor-safe dense-array and record admission rejects accessors, symbols, sparse/decorated or subclassed arrays, extra keys, unsupported units, negative values and image primitive use.
- Effect Schema, provenance and primitive matrices remain property-specific; whole-list last-winner composition is preserved, including empty-list replacement. Broad size strings remain on the compatibility route and the experimental field remains outside the CSS-to-React-Native allowlist.
- No public API, native ABI or native-device acceptance claim changed. Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file.

Next recommended slice: **M2.2bb** — migrate `experimental_backgroundPosition` as its own canonical four-shape view/text-only positional union with finite zero/`px`/`%` values. Begin only after approval.

### 2026-09-20 — M2.2bb experimental background position structured IR

- Migrated marked static `experimental_backgroundPosition` arrays through a view/text-only union of the four installed positional record shapes: `{ top, left }`, `{ top, right }`, `{ bottom, left }` and `{ bottom, right }`.
- The static coordinate domain admits finite numbers, `"0"`, and finite signed `px` or percentage strings. Descriptor-safe dense-array and record admission rejects accessors, symbols, sparse/decorated or subclassed arrays, extra keys, unsupported units, dynamic values and image primitive use.
- Effect Schema, provenance and primitive matrices remain property-specific; whole-list last-winner composition is preserved, including empty-list replacement. Broad position strings remain on the compatibility route and the experimental field remains outside the CSS-to-React-Native allowlist.
- No public API, native ABI or native-device acceptance claim changed. Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file.

Next recommended slice: **M2.2bc** — migrate `experimental_backgroundImage` only behind an explicit native-device acceptance gate for linear/radial gradient parsing, colour-stop semantics, defaults and platform support. Begin only after approval.

### 2026-09-20 — M2.2bc experimental background image structured IR

- Migrated marked static `experimental_backgroundImage` arrays through a view/text-only linear/radial gradient union with explicit direction, shape, size and position fields.
- Added descriptor-safe dense-list and nested-stop admission. Static stops require literal colour strings, at least two colour stops, finite number/percentage positions and internal one-position transition hints; opaque colours, variables, implicit defaults and unsupported units remain on the runtime route.
- Effect Schema, provenance and primitive checks share the capture contract. Admitted values are cloned and frozen, and whole-list last-winner composition includes empty-list replacement. Compatibility strings remain outside the CSS-to-React-Native allowlist.
- Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file. Native rendering remains pending the dedicated packed iOS simulator gate; Android stays parked.

### 2026-09-20 — M2.2bd packed iOS background image acceptance

- Added a durable Expo playground gradient matrix covering linear direction keywords and angles, radial extent and explicit x/y sizes, mixed positions and transition hints, transparent/opaque colours, multiple layers and empty-list replacement.
- Ran the packed `@opsydyn/crumbs-css@0.1.2-alpha.2` consumer on the dedicated Crumbs Acceptance iPhone 17 / iOS 26.5 simulator with Expo Go 56.0.4 and React Native 0.85.3. Direct light/dark screenshots show the canonical gradients render without runtime errors; the explicit radial footprint and transparent regions match the installed semantics, and an empty list clears the layered value.
- Retained the exact tarball hash, source/runtime/device identity and screenshot hashes in the matching acceptance and qualification records. Android remains parked and no native frame/memory budget is claimed.

Next recommended slice: **M2.3** — route the supported vanilla-extract compatibility adapter into the same native IR, preserving the now-qualified structured property boundary and failing unsupported syntax with source/property context. Begin only after approval.

### 2026-09-20 — M2.3 vanilla-extract compatibility adapter IR

- Routed unmarked vanilla-extract rules through the same scalar and structured native IR used by Crumbs-authored rules. Lossless static scalars, Crumbs token references, static structured arrays and fixed shadow-offset records retain `vanilla-extract-adapter` provenance through schema validation, normalization and lowering.
- Browser-only strings and shorthand values remain on the established CSS converter path; the adapter does not guess at partial payloads. Malformed static structured values fail with `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE` and file/class/property context.
- Removed regex reconstruction of compiled export maps. VM reconstruction now fails with `CRUMBS_CSS_UNSUPPORTED_EXPORT`, the source file and the underlying error, so unsupported generated modules cannot appear valid through partial parsing.
- Focused adapter/structured/transformer tests, the full package check, Storybook typechecking, workspace Expo checks, documentation build and host smoke budgets passed. The isolated packed Expo install remains incomplete because the npm registry timed out; no peer override or legacy install mode was used. The performance registry remains fail-closed; exact floor-host measurement, native-device acceptance and Android remain incomplete. [Qualification evidence](evidence/2026-09-20-native-ir-compatibility-adapter/qualification.json).
- No public authoring API, Effect consumer requirement, external artifact ABI, publication or push changed.

Next recommended slice: **M2.4** — separate validation, shorthand normalization, dependency analysis and code emission, then index export/class ownership for deterministic diagnostics and serialization. Begin only after approval.

### 2026-09-20 — M2.4 compiler stage separation and deterministic emission

- Separated own-data validation, compatibility shorthand normalisation, dependency analysis, export/class ownership indexing and final code emission into explicit compiler modules. Enumerable accessors fail before execution; inherited keys are ignored; own `__proto__` keys remain data.
- Dependency inputs are filtered to project-authored files, deduplicated and sorted once. Export/class ownership is indexed once with deterministic lexical tie-breaking, so CSS conversion diagnostics do not rescan the export graph for every class.
- Style tables, named exports, dependency imports and plain record keys now serialise deterministically. Encoded export records keep their authored semantic order, while equivalent map insertion orders produce byte-identical modules.
- Stage-contract tests, the transformer/structured/adapter suites, full package check and package typecheck pass. Final Storybook, Expo workspace, documentation, benchmark and budget gates are recorded in the qualification file; packed Expo remains registry-blocked, performance readiness remains fail-closed, and Android/native-device acceptance stays incomplete.
- No public API, Effect consumer requirement, external artifact ABI, publication or push changed. M2.7 still owns actual Metro dependency invalidation.

Next recommended slice: **M2.5** — version encoded artifacts and test compatible/incompatible readers, keeping codec laws separate from lossy lowering and code generation. Begin only after approval.

### 2026-09-20 — M2.5 versioned artifact readers

- Added an explicit versioned native artifact reader registry around the existing version-1 payload codec. Compatible readers dispatch by the positive integer wire version; incompatible readers return the stable `CRUMBS_CONTRACT_UNSUPPORTED_VERSION` contract issue before schema admission.
- Malformed envelopes still use the descriptor-safe payload codec, while version probing reads own data descriptors without executing accessors. JSON syntax failures stay at the reader boundary.
- Property-based codec laws are limited to admitted version-1 artifacts and preserve authored declaration order and values. Reader code has no native lowering or generated-module emission dependency.
- Focused, full package, consumer, documentation and performance gates are recorded in the matching evidence file. No public authoring API, external artifact publication, native-device acceptance or Android qualification changed.

Next recommended slice: **M2.6** — emit direct native modules and minimal token/condition metadata. Confirm structured values, ordinary exports, empty styles and theme descriptors retain their specified meaning. Begin only after approval.

### 2026-09-20 — M2.6 direct native module emission

- The transformer now carries captured named exports and virtual CSS paths directly from the required vanilla-extract authoring evaluation into native lowering. It no longer serialises a vanilla module and re-evaluates that generated text merely to recover the same data.
- M2.6 emitted a frozen internal `__crumbsModule` descriptor with the `crumbs.css.native-module` tag, version `1`, sorted unique token variable names from surviving final styles, and a frozen empty `conditions` list. M4.2 extends that descriptor to version `2` with the frozen dependency plan described below. Source export admission and the final emitter both reserve that name, preventing user data from shadowing generated metadata.
- The direct path retains structured style values, ordinary tag-shaped data, empty styles and theme descriptors. It does not introduce condition programs, a public metadata API, an external artifact ABI, publication, native-device acceptance or Android qualification.
- Focused and full compiler checks are recorded with the consumer, documentation and host qualification results in the matching evidence file.

Next recommended slice: **M2.7** — demonstrate that real dependency changes invalidate baked importer values across nested CSS modules, plain token modules, monorepo dependencies, compiler versions, targets and configuration before persistent caching is added. Begin only after approval.

### 2026-09-20 — M2.7 dependency-aware Metro invalidation

- Added deterministic dependency-input analysis for plain modules, nested `.css.ts` imports and workspace sources. Project-authored source hashes feed a private compiler/platform/configuration identity and are emitted as non-public transform metadata.
- Wrapped Metro cache stores so unchanged Crumbs transform results remain hits while changed or missing dependency files return misses. The Metro adapter now scans live graph metadata, emits stale importer changes under the project root and decorates the private transform result key so Metro commits dependency-only rebuilds. Direct compiler, cache-store and evidence-admission tests cover plain edits, nested/workspace discovery, context changes and fail-closed receipts.
- The cleared Expo/Metro measurement passed with Expo 56.0.4, Metro 0.84.4 and React Native 0.85.3. Plain-token, nested `.css.ts` and workspace-source controls plus five retained direct edits all prove new baked values and absence of old values; fixture hashes were restored. The workspace run used a canonical disposable package copy to avoid symlinked watcher topology. No persistent cache, public API or userland Effect requirement was added. [Assessment](assessments/2026-09-20-dependency-invalidation.md) and [qualification evidence](evidence/2026-09-20-m2-7-dependency-invalidation/qualification.json) record the receipts.

Next recommended slice: **M3.1** — define domain-safe colour, length, duration, opacity and property-enum token contracts with generated or reconciled runtime schemas and static authoring types. Begin only after approval.

### 2026-09-20 — M3.1 domain-safe token contracts

- Added immutable `defineToken`/`token.*` definitions and `createTokenContract`/`createTokenTheme` for colour, length, duration, opacity and closed property-enum domains. Domain references retain the existing native variable spelling while carrying a static domain brand.
- Native style authoring narrows length and property-enum token positions, so colour tokens cannot be used for spacing or enum properties. Legacy unscoped tokens retain the documented migration path.
- Runtime theme construction rejects invalid domain values before token maps are published. A dedicated `tokens/schema` entrypoint uses Effect 4 Schema for external ingress; the ordinary token entrypoint contains no Effect import.
- Focused property tests pass generated valid values, adversarial cross-domain/range values, schema/predicate agreement and static `@ts-expect-error` mismatch fixtures. Public API tests qualify both token entrypoints. No identity, alias, scope, provider, patch or optic behavior is claimed.
- [Assessment](assessments/2026-09-20-domain-safe-token-contracts.md) records the domain boundary and remaining M3 work. No publication or push occurred; protected release/version edits remain outside the slice.

Next recommended slice: **M3.2** — add stable contract/package identity, a contract-bound provider/hook interface and deterministic public token IDs, with duplicate-copy, evaluation-order and hot-reload qualification. Begin only after approval.

### 2026-09-20 — M3.2 stable token identity and provider boundary

- Added explicit `{ owner, name, version }` identities for distributed domain token contracts. Canonical path/domain signatures reject identity reuse with a changed shape; stable public IDs and package-scoped native variables do not depend on evaluation order, counters or random values.
- Added `getTokenId`, contract identity/key introspection and a contract-bound `TokenThemeProvider`/`useTokenTheme` pair. Provider lookup checks both identity and shape signature, while unidentified legacy contracts retain the ordinary `ThemeProvider`/`useTheme` migration route.
- Shared registry and context metadata use global symbols so duplicate Crumbs package copies in one JavaScript realm can recognise the same identity during hot reload or re-evaluation. Distinct identities with identical paths remain isolated.
- Focused identity, type, domain, ownership, runtime and public API tests pass. The ordinary token bundle remains Effect-free; `tokens/schema` remains the dedicated Effect 4 ingress boundary. Full duplicate-package distribution and native-device provider acceptance remain later gates.
- [Assessment](assessments/2026-09-20-stable-token-identity.md) records the identity format, provider boundary and qualification limits. No publication or push occurred; protected release/version edits remain outside the slice.

### 2026-09-20 — M3.3 layered token aliases and origin tracing

- Added `defineAlias`/`alias` to connect foundation, semantic and component token layers by exact path. Alias leaves are derived and omitted from theme input; every `defineToken` leaf remains required.
- Added explicit fallback handling for structurally missing targets. Missing targets, declared/target domain mismatches, invalid fallback values, cycles and alias overrides return stable diagnostics before a contract or theme snapshot is published.
- Alias references retain immutable target metadata and a complete origin chain. `getTokenOrigin` exposes the public ID, target and foundation-to-component path for diagnostics and future impact tooling.
- Identity shape signatures include alias targets and fallbacks, so duplicate copies and hot reload cannot silently reuse a changed alias graph. Focused alias, identity, domain, ownership, runtime and public API tests pass.
- [Assessment](assessments/2026-09-20-layered-token-aliases.md) records the semantics and limits. Atomic patches and external alias manifests remain later M3 work; no publication or push occurred.

### 2026-09-20 — M3.4 independent theme contexts and nested scopes

- Added sparse `brand`, `mode` and `density` context layers with a fixed `brand → mode → density` precedence. `createTokenThemeSnapshot` validates the complete base and every context layer before publishing one coherent values/token map; `createTokenThemeScopedSnapshot` rebases layers on an existing complete theme.
- Added `TokenThemeScopeProvider`. Nested providers replace only the nearest layer for the same context, preserve other axes and use fixed precedence regardless of nesting order. React portals retain the provider chain of their owning tree; independent roots require an explicit complete provider chain.
- Alias leaves remain derived and cannot be overridden by a context. Malformed or domain-invalid layers fail with structured scope diagnostics before a partial snapshot can escape.
- Focused context properties, type fixtures, alias regression coverage, package typechecking and public API tests pass. The ordinary runtime remains Effect-free; external decoding and atomic patches remain later M3 work. No publication or push occurred; protected release/version edits remain outside the slice.
- [Assessment](assessments/2026-09-20-independent-theme-contexts.md) records the precedence, nested-scope and portal ownership contract.

### 2026-09-21 — M3.5 immutable theme patches and external theme decoding

- Added `applyTokenThemePatch` for sparse, domain-checked updates against a complete theme. Contract identity and shape are checked before cloning canonical definition values; a successful result publishes one new `NativeTheme` with matching nested values and flat native tokens plus frozen changed paths. Invalid patches return structured diagnostics and leave the previous snapshot untouched. Legacy unscoped contracts require the same contract object because they have no identity metadata.
- Added a version-1 `CrumbsTokenTheme` Effect 4 Schema codec at `tokens/schema`. The external payload carries an identified contract and stable public token IDs; the decoder rejects unknown fields, unsupported versions and non-finite numbers. `createTokenThemeFromExternalPayload` remains Effect-free and validates identity, required definition IDs and local token domains before reconstructing aliases.
- Focused patch properties, external codec/ingress tests, public API expectations and package typechecking pass. The ordinary token bundle remains Effect-free; no Optic updates, structural sharing, device evidence, publication or push occurred. Protected release/version edits remain outside the slice.
- [Assessment](assessments/2026-09-21-immutable-theme-patches.md) records the atomic update and ingress contract.

### 2026-09-21 — M3.6 reusable Optic theme focuses

- Added the dedicated `tokens/optic` entrypoint with `createTokenThemeFocus`. It accepts only registered definition tokens and rejects aliases or foreign contract tokens with a stable focus diagnostic. The ordinary `tokens` entrypoint remains Effect-free; Effect 4 Optic is bundled only in the dedicated subpath and no public declaration imports Effect types.
- Added pure `getValues`, `replaceValues` and `modifyValues` operations with own-key-safe path-copy updates. Unaffected nested branches retain their references, inputs remain unchanged, and a seeded 100-case property suite checks get-put, put-get and put-put lens laws.
- Added validated theme `get`, `replace` and `modify` operations. Domain-changing results and contract mismatches return structured diagnostics through the existing atomic patch boundary; failed updates preserve the old values/token snapshot and successful updates derive aliases and flat tokens together.
- Updated compatibility guidance, diagnostic codes, packed consumer checks and the M3.6 assessment. Final resolved-theme identity sharing remains a separate M4 runtime promise; no publication or push occurred and protected release/version edits remain outside the slice.

Next recommended slice: **M3.7** — write the legacy unscoped-token migration notes and bound the permissive `string | number` compatibility path without allowing old tokens to bind silently to unrelated contracts. Begin only after approval.

### 2026-09-21 — M3.7 legacy token migration boundary

- Kept `createThemeContract`/`createTheme` and the legacy `string | number` value shape as an explicitly bounded compatibility path. Legacy references remain on `ThemeProvider`/`useTheme`; their path-scoped registry is not treated as cross-package provider authentication.
- Recorded domain-contract token ownership and rejected foreign token leaves during theme construction. Identified runtime themes reject old or unrelated native token references with `CRUMBS_CSS_TOKEN_THEME_TOKEN_CONTRACT_MISMATCH` before flat lookup can bind them to an unrelated contract.
- Added the migration assessment and compatibility guidance. Focused and full package verification remain required for the commit; no publication, push or native evidence occurred, and protected release/version edits remain outside the slice.

Next recommended slice: **M4.1** — share resolved outputs for the same immutable module/theme snapshot with weak ownership and structural sharing, while retaining the original reference for static styles. Begin only after approval.

### 2026-09-21 — M4.1 resolved output sharing

- Added a shared-symbol weak cache keyed by immutable input object and `NativeTheme` snapshot. Static object styles retain their original reference; tokenized styles, flattened arrays and recipes reuse repeated results within one snapshot.
- Style maps return the original map when all entries are unchanged and otherwise preserve unchanged entry references. New theme objects have independent cache identities; mutation is outside the snapshot contract and does not act as invalidation.
- Added runtime/compatibility guidance and a seeded 100-case identity property suite. Full package and documentation verification remain required for the commit; no publication, push or device evidence occurred, and protected release/version edits remain outside the slice.

Next recommended slice: **M4.2** — use compiler-emitted dependency plans for token resolution and record recomputation and notification counts without treating selective recomputation as proof of render isolation. Begin only after approval.

### 2026-09-21 — M4.2 compiler dependency plans

- Added a version-1 frozen dependency plan to the generated version-2 `__crumbsModule` descriptor. Each canonical path entry records the surviving token variables for a style leaf after composition and lowering; recipe branches and style-variant leaves are represented independently.
- Added `createThemeDependencyResolver`, which consumes the emitted plan and immutable themes. It compares only declared token values, recomputes affected paths, preserves unaffected output references and returns per-transition `recomputations`, `notifications` and `changedTokens` receipts. Plan shape mismatches and unsupported versions fail closed.
- Added compiler-emission, runtime transition, integration and canonicalisation tests, plus compatibility/runtime documentation. Notifications are output invalidation receipts, not React render or native-frame evidence; no subscription layer, device qualification, publication or push occurred, and protected release/version edits remain outside the slice.

Next recommended slice: **M4.3** — precompute recipe order/defaults/compound matchers and canonical selection keys, with explicit finite cache bounds and eviction. Begin only after approval.

### 2026-09-21 — M4.3 bounded recipe selection plans

- Added an immutable per-resolver recipe plan for authored variant order,
  defaults, compound requirements and canonical selection-key dimensions. The
  evaluator remains demand-driven and never materializes the variant Cartesian
  product.
- Added resolver-local LRU selection caching with a default capacity of 32, an
  explicit `0..1024` bound, hit/miss/eviction/capacity receipts, `clearCache`
  and terminal `dispose` lifetime controls. Equivalent selections reuse frozen
  style-array outputs; uncached and over-bound workloads are covered.
- Preserved legacy variant string lookup and diagnostics, while making
  canonical keys type-sensitive for compound matching. Added focused tests,
  compatibility/runtime guidance and the M4.3 assessment. No subscriptions,
  device evidence, publication, push or protected release/version edits were
  included.

Next recommended slice: **M4.4** — add selective subscriptions with consistent snapshots across concurrent rendering, provider updates, nested scopes, unmount and hot reload. Begin only after approval.

### 2026-09-21 — M4.4 selective theme subscriptions

- Added a shared-symbol immutable theme store and selector stores behind the
  React runtime providers. `useThemeSelector` and the themed style hooks use
  `useSyncExternalStore`, publish one complete provider snapshot per layout
  commit, and notify only when a selected reference changes.
- Gave token providers and nested scopes independent stores with explicit
  unsubscribe/disposal behaviour. Shared context identity remains stable across
  duplicate or hot-reloaded package copies.
- Added atomic publication, selective invalidation, unmount cleanup, nested
  store, disposal and shared-identity tests; updated public API, compatibility
  and runtime guarantees documentation. Focused package tests, typecheck and
  runtime build pass. These are store/React contract checks, not device frame,
  native rendering or retained-memory qualification; Android remains deferred.

Next recommended slice: **M4.5** — compare cached and uncached evaluators on generated inputs, including identity, invalidation, zero eager Cartesian expansion and stale-result checks after scope or artifact replacement. Begin only after approval.

### 2026-09-21 — M4.5 cached and uncached evaluator equivalence

- Added seeded generated comparisons between cached theme resolution and an
  independent uncached flatten/token oracle. Same-snapshot calls retain their
  documented references; replacement themes and style artifacts receive new
  identities and cannot return stale values.
- Added generated dependency-plan transitions that verify only declared paths
  are recomputed and notified while unrelated and static outputs retain their
  references. Recipe properties compare bounded, zero-capacity and direct
  uncached resolution and prove plans stay linear without eager Cartesian
  expansion.
- Updated compatibility/runtime guidance and the M4.5 assessment. Focused
  package tests pass; no production dependency/API, device, Android, publication
  or protected release/version change was included.

Next recommended slice: **M4.6** — run the committed M1 device, bundle, editor and retained-memory budgets and record improvements or regressions against equivalent native workloads. Begin only after approval.

### 2026-09-21 — M4.6 budget qualification (host/editor complete; native gate open)

- Ran the exact Node-floor Effect/runtime matrix, five native-style host
  benchmark processes, five direct Expo/Metro edit repetitions with three
  dependency controls, and the 100/1,000/10,000-token editor matrix. Raw
  reports and the derived comparison are retained in the M4.6 evidence
  directory.
- Runtime initialisation, transforms, editor wall/memory and completion remain
  within their approved host limits. The comparison exposes a runtime graph
  byte regression (+295.9%) and 10,000-token TypeScript/tsgo instantiation
  regressions (+70.1%); these remain review items. Metro receipts are complete
  but comparison admission is incomplete because the current fixture identity
  differs from the retained baseline.
- Re-ran the retained-memory admission/property suite. Existing live memory
  receipts remain development-web diagnostics without forced-GC provenance or
  an approved budget. Release Hermes/device, frame, allocation and native
  retained-memory gates remain unavailable; Android stays parked. M4.6 remains
  unchecked and the performance registry remains fail-closed.

See [M4.6 assessment](assessments/2026-09-21-m4-6-budget-qualification.md).

Next recommended slice: **M4.6 native qualification follow-up** — capture the
release-mode Hermes iOS run with controlled retained-memory evidence, then
repeat for Android only when the parked prerequisite is authorised. Review the
runtime-byte and editor-instantiation regressions before activating budgets.

### 2026-09-21 — M4.6 iOS release Hermes follow-up (simulator evidence; gate open)

- Built and launched the playground in a disposable Expo 56 iOS project with
  Xcode 26.5, React Native 0.85.3 and Hermes Release configuration on the
  dedicated iOS 26.5 `Crumbs Acceptance` simulator. The final app embedded the
  Hermes framework and ran the Memory route at revision `81e6cc8`.
- Completed the retained-memory protocol at 100 and 1,000 rows: 25 cycles,
  six post-unmount checkpoints, balanced container/row cleanup and completed
  `globalThis.gc`-backed `performance.memory` readings. The receipts retain the
  metrics, GC method, source, run identity and simulator/toolchain provenance.
- The runs remain diagnostic: no M1.8 retained-memory budget was applied, the
  target is a simulator rather than a physical release device, and JS/UI frame
  plus native allocation probes were not run. The performance registry remains
  fail-closed; Android was not touched.
- The only React/Metro changes were disposable harness corrections after the
  first temporary bundle exposed duplicate React resolution and a workspace
  fallback gap. No repository runtime, API, dependency or protected release
  edit changed.

See [M4.6 iOS release assessment](assessments/2026-09-21-m4-6-ios-release.md)
and [iOS release evidence](evidence/2026-09-21-m4-6-ios-release/).

Next recommended slice: **M4.6 native budget decision and physical-device
qualification** — review the runtime-byte and editor-instantiation regressions,
settle a native probe and approved retained-memory budget, then collect physical
iOS frame/allocation/retained-memory evidence. Keep Android parked until the
final platform move is explicitly authorised.

### 2026-09-21 — M4.6 native budget decision (physical target unavailable)

- The connected-target inventory contains the Mac mini and the dedicated iOS
  simulator only; no physical iPhone or iPad is connected. M1.6 and M4.6
  therefore remain open. Android was not inspected.
- Reviewed the exact runtime/editor comparison. The CJS theme graph remains a
  deterministic +295.9% zero-growth failure, while tsc and tsgo each retain a
  +70.1% 10,000-token instantiation failure. The runtime graph growth is in
  Crumbs' expanded theme entrypoint; Effect remains externalised from ordinary
  runtime. A disposable TypeScript trace points to the domain-aware conditional
  style/token types as the likely editor cost centre; no public type or threshold
  change is admitted without ablation.
- Proposed the physical-device probe contract: five independent Release Hermes
  repetitions against a plain React Native comparison, one excluded cold launch,
  recorded thermal/toolchain identity, exportable `Animation Hitches` and
  `Allocations` traces, and six GC-backed retained-memory checkpoints. Simulator
  traces remain diagnostic and no threshold is approved from them.
- No dependency, native package, runtime policy, budget threshold or Android
  state changed. The performance registry remains fail-closed.

See [native budget decision](assessments/2026-09-21-m4-6-native-budget-decision.md)
and [native budget evidence](evidence/2026-09-21-m4-6-native-budget/).

Next recommended slice: **M4.6 host ablation and runtime/type-surface repair** —
isolate the theme graph and domain-aware type-instantiation costs before
re-running the physical iOS contract when a device is connected. Keep Android
parked until the final platform move.

### 2026-09-21 — M4.6 physical native qualification backlogged

- Physical iOS release qualification is now explicitly backlogged to the final
  device-enabled platform move because no iPhone/iPad is available. The iOS
  simulator evidence remains diagnostic and does not become a budget baseline.
- Android remains parked for the same final move. No device tooling, native
  target or Android state was changed in this slice.
- Host-side remediation remains active: first run the runtime-graph and
  domain-aware type-instantiation ablations, then revisit the existing probe
  contract when a physical device is available. The performance registry stays
  fail-closed and no threshold is changed.

Next recommended slice: **M4.6 host ablation and runtime/type-surface repair** —
isolate and reduce the two deterministic host regressions without waiting for
device access. Keep physical iOS and Android qualification backlogged to the
final platform move.

### 2026-09-21 — M4.6 host ablation and type-surface repair

- Reproduced the editor regression and isolated `ThemeValues<T>` domain
  inference as the dominant cost: a legacy-only temporary ablation reduced the
  10,000-token result to 494,020 / 494,118 instantiations, but it would remove
  domain value typing and was discarded.
- Added a type-only contract marker carrying the full resolved domain theme
  value shape, including aliases. Legacy contracts now use a cheap recursive
  value mapper, while domain contracts retain their precise values without
  per-leaf `DomainThemeVar<infer ...>` work.
- Five fresh repetitions produce 113,999 TypeScript and 114,097 tsgo
  instantiations at 10,000 tokens, a 76.8% / 76.7% reduction below the
  approved baselines. Build, typecheck and the full 717-test package suite
  pass. The runtime CJS theme graph remains 44,764 bytes and stays open.
- No dependency, Effect boundary, runtime policy, native target, Android state
  or performance threshold changed.

See [host ablation assessment](assessments/2026-09-21-m4-6-host-ablation.md)
and [repaired editor evidence](evidence/2026-09-21-m4-6-host-ablation/editor-repaired.json).

Next recommended slice: **M4.6 runtime graph split** — add a lean core theme
entrypoint for common consumers, retain the compatibility entrypoint, and
measure both graphs before any threshold review. Keep physical iOS and Android
qualification backlogged to the final platform move.

### 2026-09-21 — M4.6 runtime graph split

- Added the opt-in `@opsydyn/crumbs-css/theme/core` entrypoint for
  `ThemeProvider`, theme hooks and pure token/style resolution. The existing
  `@opsydyn/crumbs-css/theme` surface remains the compatibility entrypoint for
  token scopes, dependency plans and recipe resolver controls.
- Built the two runtime entries as separate tsdown graphs. The lean graph is
  17,271 ESM bytes / 17,641 CommonJS bytes versus 44,017 / 44,764 for the
  compatibility graph, a 60.8% / 60.6% reduction. Both remain React-only
  externally and guarded graph tests reject compiler imports.
- Added package export, declaration, packed-consumer and public API contracts,
  plus runtime guidance and the [graph evidence](evidence/2026-09-21-m4-6-runtime-graph-split/graphs.json).
  This is emitted host evidence only; no Metro/Hermes, native, device or
  threshold qualification changed.

See [M4.6 runtime graph assessment](assessments/2026-09-21-m4-6-runtime-graph-split.md).

Next recommended slice: **M4.6 import adoption and graph policy** — inventory
internal/example consumers, move common runtime imports to `theme/core`, and
add a regression check that prevents advanced APIs from leaking into the lean
entrypoint before revisiting the runtime-byte threshold. Keep physical iOS and
Android qualification backlogged.

### 2026-09-21 — M4.6 import adoption and graph policy

- Migrated common provider and themed-style imports in the playground,
  Storybook, themed-screen/recipe tutorials and the compatibility recipe guide
  to `@opsydyn/crumbs-css/theme/core`. Mixed modules now split imports so
  `resolveRecipeStyle`, `createRecipeResolver` and `TokenThemeProvider` remain
  explicit compatibility-entrypoint consumers.
- Added the source policy test at
  `packages/css/test/theme-entrypoint-policy.test.ts`. It rejects common APIs
  imported from `theme`, advanced/unknown APIs imported from `theme/core`, and
  bare compatibility imports without an explicit advanced API.
- Package build, app typechecks, the 725-test package suite, docs build and
  budget validation pass. This proves source adoption and API boundaries; it
  does not yet qualify Metro/Hermes application bytes or change the
  fail-closed registry.

See [M4.6 import adoption assessment](assessments/2026-09-21-m4-6-import-adoption.md).

Next recommended slice: **M4.6 application graph verification** — build the
workspace and packed Expo/Storybook bundles after adoption, compare reachable
`theme` and `theme/core` bytes against the retained baseline, and decide
whether any runtime-byte threshold can be reopened. Keep physical iOS and
Android qualification backlogged.

### 2026-09-21 — M4.6 application graph verification

- Built fresh workspace and isolated packed Expo playground exports for web,
  iOS and Android. All six source-map sets passed the strict runtime contract;
  each reaches `theme.mjs` (44,017 source-content bytes) and `theme-core.mjs`
  (17,271 bytes), for a 61,288-byte diagnostic module sum. The app exercises
  advanced recipe APIs as well as common hooks, so both entrypoints are present.
- Built workspace and packed Storybook exports for all three targets. The
  exports complete, but the strict guard remains fail-closed: Storybook's token
  contract and `TokenThemeProvider` path reaches `tokens`, `domains`,
  `native-style`, `native-capture` and `@vanilla-extract/*` modules. The Crumbs
  source-content sum is 122,242 bytes before the vanilla-extract modules.
- No exact pre-adoption application-byte baseline is retained, source-map
  module bytes are not native performance, and the retained package runtime
  threshold remains the +295.9% failure. The performance registry stays
  fail-closed. Android was inspected only through exported JavaScript/source
  maps and remains parked for device qualification.

See [M4.6 application graph assessment](assessments/2026-09-21-m4-6-application-graph.md)
and [application graph evidence](evidence/2026-09-21-m4-6-application-graph/graphs.json).

Next recommended slice: **M4.6 token runtime boundary repair** — split token
contract/theme construction from the `native-style` and vanilla-extract
authoring graph, then repeat workspace and packed application graph checks.
Keep physical iOS and Android qualification backlogged to the final
device-enabled move.

### 2026-09-21 — M4.6 token runtime boundary repair

- Extracted legacy theme contract construction and token-path helpers into the
  dedicated `theme-contract.ts` runtime module. `native-style.ts` retains its
  authoring compatibility surface through re-exports, while `tokens/domains`
  now imports the runtime contract directly.
- Added ESM/CommonJS token graph tests and widened the source contract for the
  safe `tokens` entrypoint plus its hashed `domains`, `theme-contract` and
  `theme-token` chunks. Both formats have no Node built-ins, vanilla-extract,
  CSS conversion, Effect, native-style or native-capture imports.
- Fresh workspace and packed Storybook web/iOS/Android source maps pass the
  strict runtime guard. The main maps reach six Crumbs modules totalling
  117,301 source-content bytes, with zero vanilla-extract or Effect sources;
  the previous 122,242-byte graph included native-style and native-capture.
- Package tests (727), typecheck, docs, app typecheck, playground workspace
  qualification and budget validation pass. The package runtime-byte threshold
  remains fail-closed at +295.9%; no application baseline, device evidence or
  performance threshold was changed. Android remains source-map-only and
  physical iOS/Android stay backlogged.

See [M4.6 token runtime boundary assessment](assessments/2026-09-21-m4-6-token-runtime-boundary.md)
and [token runtime graph evidence](evidence/2026-09-21-m4-6-token-runtime-boundary/graphs.json).

Next recommended slice: **M4.6 application-byte threshold re-evaluation** —
rebase the runtime comparison on the repaired token boundary, decide whether an
exact Metro/Hermes application baseline can be admitted, and keep the registry
fail-closed until the baseline and remaining device/editor gates are explicit.
Keep physical iOS and Android qualification backlogged to the final
device-enabled move.

### 2026-09-21 — M4.6 application-byte threshold re-evaluation

- Rebased the retained Storybook application comparison on the repaired token
  boundary. Crumbs source-content modules fell from 122,242 to 117,301 bytes
  (−4.04%); workspace and packed web/iOS/Android bundles fell by approximately
  2.0–2.3%, and every current map set passes the strict runtime guard.
- Kept the comparison explicitly diagnostic: the prior maps came from a
  different revision and a graph that failed the runtime contract, while
  application bundle/source-map bytes are not native startup, frame,
  allocation or retained-memory measurements. The comparison is a repair delta
  rather than an approved application baseline.
- Kept the approved package runtime-byte metric unchanged at 44,764 bytes
  against its 11,307-byte zero-growth baseline (+295.9% failure). The budget
  registry remains fail-closed; no threshold, dependency, native target or
  Android state changed.

See [M4.6 application-byte threshold assessment](assessments/2026-09-21-m4-6-application-byte-threshold.md)
and [application-byte review evidence](evidence/2026-09-21-m4-6-application-byte-threshold/review.json).

Next recommended slice: **M4.6 runtime emitted-byte budget decision** — either
reduce the compatibility graph against a same-functionality baseline or record
an explicitly approved split budget for `theme/core`, `tokens` and the
compatibility entrypoint. Keep the registry fail-closed and physical iOS and
Android qualification backlogged.

### 2026-09-21 — M4.6 runtime emitted-byte budget decision

- Traced the retained `effect.runtime.cjs.graph-bytes` selector to the old
  compatibility `theme.cjs` graph at 11,307 bytes. The historical source
  runtime was 325 lines; the current runtime is 1,078 lines and the intervening
  runtime/token work adds 2,531 lines across the public entrypoint and token
  surfaces. The old value is therefore historical lineage rather than a
  same-functionality ceiling for the current API.
- Rebuilt and scanned the current entrypoint graphs: `theme-core` is 17,271 /
  17,641 bytes, `tokens` is 56,013 / 63,308 bytes across its local chunks, and
  compatibility `theme` is 44,017 / 44,764 bytes (ESM/CJS). Each graph has
  zero nonliteral loads; only `theme` and `theme-core` retain React as a direct
  external. The token graph remains free of Effect and authoring dependencies.
- Recorded those three scopes as candidate split baselines in the
  [runtime-byte decision evidence](evidence/2026-09-21-m4-6-runtime-byte-budget-decision/decision.json),
  while leaving ceilings, growth rules and registry selectors pending explicit
  review. The existing 44,764-byte compatibility result remains a +295.9%
  fail-closed comparison against 11,307 bytes; no threshold, dependency,
  native target or Android state changed.

See [M4.6 runtime-byte budget assessment](assessments/2026-09-21-m4-6-runtime-byte-budget-decision.md)
and [runtime-byte decision evidence](evidence/2026-09-21-m4-6-runtime-byte-budget-decision/decision.json).

Next recommended slice: **M4.6 split-budget review and admission** — review
the `theme-core`, `tokens` and compatibility `theme` scopes, approve concrete
ESM/CJS ceilings and growth rules, then add only accepted metrics to the
fail-closed registry. If the compatibility size is rejected, follow with a
same-functionality `theme` graph reduction slice. Keep physical iOS and
Android qualification backlogged to the final device-enabled move.

### 2026-09-21 — M4.6 split-budget review and admission

- Admitted six format-specific deterministic graph metrics for the current
  runtime contract: ESM/CJS `theme-core` at 17,271/17,641 bytes, `tokens` at
  56,013/63,308 bytes including local chunks, and compatibility `theme` at
  44,017/44,764 bytes. Each retains five sequential scans, exact artifact
  hashes and a zero-growth absolute ceiling.
- Extended the Effect Schema-backed budget registry with closed selectors for
  those six graphs. The historical `effect.runtime.cjs.graph-bytes` metric
  remains unchanged, so its +295.9% comparison against the old 11,307-byte
  baseline stays visible and fail-closed.
- The registry now has 26 metrics: 22 recorded and approved, with frame,
  allocation and retained-memory gates still pending or diagnostic. Focused
  budget tests, baseline re-derivation and CLI validation pass; whole-registry
  readiness and performance qualification remain false. No dependency, public
  API, native target or Android state changed.

See [M4.6 split-budget admission assessment](assessments/2026-09-21-m4-6-runtime-byte-budget-admission.md)
and [split-budget admission evidence](evidence/2026-09-21-m4-6-runtime-byte-budget-admission/admission.json).

Next recommended slice: **M4.6 current split-budget comparison run** — add a
current-checkout adapter that scans all six admitted entrypoints, compares
format-specific graphs against their baselines and reports the split results
alongside the retained historical compatibility failure. Keep the whole
registry fail-closed until release-device frame, allocation and retained-memory
evidence is available.

### 2026-09-21 — M4.6 current split-budget comparison run

- Added a shared current-checkout graph adapter and a focused
  `measure:runtime-graph-budgets` command. After a completed package build it
  scans ESM/CJS `theme-core`, `tokens`, and compatibility `theme` five times,
  checks deterministic artifact hashes, and writes a retained comparison
  report.
- All six admitted split budgets pass at their zero-growth baselines. The
  historical `runtime-emitted-bytes` comparison remains visible at 44,764
  bytes versus 11,307 bytes (+295.9%) and remains fail-closed by policy.
- The full `measure:host-budgets` adapter now records the same runtime graph
  evidence, so a future host matrix cannot silently omit the six admitted
  selectors. The current graph fingerprint records Node for traceability but
  uses explicit Bun/build-tool/host equivalence for this deterministic emitted
  byte scan.
- Build, focused budget tests, and registry validation pass. The registry is
  still not ready because release-device frame, allocation, and retained-memory
  evidence remains pending or diagnostic. Physical iOS and Android stay
  backlogged.

See [M4.6 current split-budget comparison assessment](assessments/2026-09-21-m4-6-runtime-byte-budget-comparison.md)
and [current split-budget comparison evidence](evidence/2026-09-21-m4-6-runtime-byte-comparison/comparison.json).

Next recommended slice: **M4.6 full host comparison rerun** — run the updated
`measure:host-budgets` adapter so the Effect boundary, runtime initialization,
benchmark, Metro, editor, and split graph reports are compared together. Keep
the historical compatibility failure visible and the whole registry fail-closed.

### 2026-09-21 — M4.6 full host comparison rerun

- Restored the exact Node v22.0.0 floor in the temporary measurement cache and
  completed the updated full host matrix, including Effect boundary,
  initialization, Metro incremental, benchmarks, editor scale, and all six
  split runtime graph selectors.
- The combined report has 22 recorded comparisons: 20 pass, the retained
  historical `runtime-emitted-bytes` comparison remains a +295.9% fail-closed
  result, and `incremental-rebuild` is incomplete because its current
  dependency-control/expanded-fixture protocol differs from the retained
  baseline.
- The incremental mismatch is recorded as a protocol boundary, not treated as
  a performance regression. The split runtime graph metrics remain exact and
  pass at zero growth. Whole-registry performance qualification remains
  `not-run`; release-device frame, allocation, and retained-memory work is
  still pending or diagnostic.

See [M4.6 full host comparison assessment](assessments/2026-09-21-m4-6-full-host-comparison.md)
and [full host comparison evidence](evidence/2026-09-21-m4-6-full-host-comparison/comparison.json).

Next recommended slice: **M4.6 incremental baseline protocol reconciliation**
— decide whether the dependency-control and expanded-fixture contract is the
new admitted scenario, then retain a new five-repetition baseline and update
the registry only through a reviewed evidence decision.

### 2026-09-21 — M4.6 incremental baseline protocol reconciliation

- Admitted the expanded M2.7-aware Metro contract: plain-token, nested
  `.css.ts`, and workspace-source invalidation receipts precede one excluded
  warmup and five retained direct edits. The controls prove parent rebuilds and
  remain separate correctness evidence rather than entering the direct-edit
  median.
- Replaced the incremental registry baseline with the current five-sample
  median of 123.9505 ms and retained the previously approved 137.506 ms /
  10% ceiling through an explicit session decision. The old 125.005 ms evidence
  remains immutable historical evidence.
- Focused reconciliation passes with exact protocol identity and zero delta;
  registry validation and budget-contract tests pass. Whole-registry readiness
  remains false for the missing or diagnostic native/device domains, and
  physical iOS and Android stay backlogged.

See [M4.6 incremental baseline reconciliation assessment](assessments/2026-09-21-m4-6-incremental-baseline-protocol-reconciliation.md),
[baseline decision evidence](evidence/2026-09-21-m4-6-incremental-baseline/decision.json),
and [reconciliation evidence](evidence/2026-09-21-m4-6-incremental-baseline/reconciliation.json).

Next recommended slice: **M4.6 historical compatibility budget disposition** —
decide whether the old 11,307-byte compatibility metric remains a legacy
diagnostic, is retired in favour of the admitted split graphs, or requires a
same-functionality `theme` graph reduction plan. Keep the current split gates
and whole-registry fail-closed boundaries intact.

### 2026-09-21 — M4.6 historical compatibility budget disposition

- Retired the historical `runtime-emitted-bytes` selector from active budget
  gates and classified it as a verified diagnostic. Its original selector,
  11,307-byte value, reason and audit evidence remain machine-checked; the
  current 44,764-byte comparison remains visible as a diagnostic-only
  +295.9% result.
- Kept the six admitted ESM/CJS split graph metrics as the active current
  functionality gates. Their approved zero-growth ceilings and evidence are
  unchanged. A same-functionality compatibility graph reduction is not
  planned because the retained source and graph evidence describe materially
  expanded public behaviour rather than an equivalent old workload.
- Added diagnostic baseline verification and separate diagnostic reporting to
  the budget contract and host adapters. The active recorded comparison now
  contains 21 approved metrics; diagnostic results never set
  `performanceQualified`. The registry remains fail-closed for release-device
  frame, allocation and retained-memory work, and Android remains backlogged.

See [M4.6 historical compatibility disposition assessment](assessments/2026-09-21-m4-6-historical-compatibility-budget-disposition.md)
and [disposition evidence](evidence/2026-09-21-m4-6-historical-compatibility-disposition/decision.json).

Next recommended roadmap item: **M5.1** — define the public native
`defineProperties` / `createSprinkles` adaptation with finite values,
domain-safe token scales, native primitive kinds and typed shorthands. Keep
M4.6 release-device gates and Android qualification explicitly backlogged to
the final device-enabled move.

### 2026-09-21 — M5.1 native Sprinkles contract

- Added the public `defineProperties` / `createSprinkles` adaptation to the
  `/style` and package-root authoring surfaces. Definitions carry an explicit
  `view`, `text`, or `image` primitive domain (all three remain the default
  shared domain), finite named scales, and typed shorthand targets.
- Added compile-time domain checks for branded colour, length, opacity, and
  enum tokens; definition-time checks reject non-finite, empty, cyclic, or
  accessor-backed scale data. The native compiler remains the final structured
  and scalar admission boundary.
- Selection resolution is deterministic: authored keys are processed in
  order, shorthand targets expand in declaration order, and a later winner is
  moved to its final native IR position. The precedence example is covered in
  the reference and typed-helper docs.
- Added type fixtures, a transformer fixture, public API coverage and runtime
  validation for the new contract. M4.6 device gates and Android remain
  explicitly backlogged.

See [M5.1 native Sprinkles assessment](assessments/2026-09-21-m5-1-native-sprinkles.md).

Next recommended roadmap item: **M5.2** — support utility outputs in style
composition and recipe bases/branches without losing primitive kind or token
contract information, then add the mapped `styleVariants(values, mapper)`
overload. Keep M4.6 release-device gates and Android qualification backlogged.

### 2026-09-21 — M5.2 utility composition and mapped variants

- Added the vanilla-extract-shaped `styleVariants(values, mapper, debugId?)`
  overload. The mapper receives the finite value and variant key; result maps
  retain the native style result type and existing style-map metadata.
- Utility classes now compose through native helper arrays and are accepted as
  recipe bases, variant branches, and compound styles. Recipe authoring uses
  the same ordered native path, including compiled utility class references.
- Added package type fixtures and a transformer/evaluation fixture covering
  utility composition, mapped token-backed values, recipe branches and
  compounds. M4.6 device gates and Android remain explicitly backlogged.

See [M5.2 utility composition assessment](assessments/2026-09-21-m5-2-utility-composition.md).

Next recommended roadmap item: **M5.3** — support static selections in
authored modules and dynamic runtime selection through generated lookup plans,
with public names and types distinguishing those phases. Keep M4.6
release-device gates and Android qualification backlogged.

### 2026-09-21 — M5.3 static and runtime Sprinkles selection

- Added `createSprinklesLookupPlan` to the `/style` authoring surface. It
  emits one primitive-scoped compiled reference per property and scale, with
  shorthand targets retained as ordered metadata; it does not expand the
  Cartesian product of possible selections.
- Added `createSprinklesResolver` to `/theme`. The bounded resolver validates
  generated plans and runtime selections, preserves authored key and shorthand
  target order, returns readonly native style arrays, and exposes the same
  bounded cache and lifecycle controls as recipe resolvers.
- Added `NativeSprinkleStaticResult`, `NativeSprinklesLookupPlan`,
  `NativeSprinklesResolutionPlan`, and `NativeSprinklesResolver` types so
  authored static outputs and runtime lookup phases remain distinct. Theme
  style resolution now resolves tokenized lookup entries before selection.
- Added transformer, public API, package consumer, cache lifecycle,
  property-based equivalence, theme-token, and type-fixture coverage. Android,
  device frame/allocation budgets, and native visual acceptance remain
  explicitly backlogged.

See [M5.3 static and runtime Sprinkles assessment](assessments/2026-09-21-m5-3-sprinkles-runtime-selection.md).

Next recommended roadmap item: **M5.4** — compare atomic, fused, and hybrid
output on identical design-system fixtures; measure bytes, startup, array
lengths, selection allocations, and native frames, then choose and document
the default. Keep Android and release-device gates backlogged until a device is
available.

### 2026-09-22 — M5.4 Sprinkles output strategy comparison

- Added one reproducible bounded-card design-system fixture with five finite
  property axes, one overlapping `px` shorthand, 4,096 finite selections, 12
  hot selections, and a 72-selection mixed hot/cold workload.
- Added the atomic, fused, and hybrid strategy builders. All strategies are
  checked for equivalent flattened style semantics across the complete finite
  selection space before measurement. Fused output expands every selection;
  hybrid fuses only the hot set and retains the atomic fallback.
- Recorded canonical artifact bytes, setup timing, selection timing, returned
  array lengths, and an explicit allocation model. The host evidence chooses
  hybrid for compiler output: it avoids the fused Cartesian artifact while
  reducing returned array length and modelled selection allocations relative to
  atomic output. The existing bounded runtime resolver remains the atomic
  lookup path until native evidence supports a runtime change.
- Native frames and native heap allocations remain `not-run`: the Bun host
  harness cannot qualify release Hermes or device rendering. Android remains
  the final device-enabled move.

See [M5.4 Sprinkles output comparison assessment](assessments/2026-09-22-m5-4-sprinkles-output-comparison.md)
and [M5.4 comparison evidence](evidence/2026-09-22-m5-4-sprinkles-output/comparison.json).

Next recommended roadmap item: **M5.5** — test deterministic output,
token-only policy compatibility, invalid properties/scales, repeated-selection
identity, and compiler/runtime equivalence. Keep native frame/allocation
qualification and Android backlogged until the Expo/device harness is
available.

### 2026-09-22 — M5.5 Sprinkles contract qualification

- Added deterministic compiler-output coverage: transforming the same native
  Sprinkles module twice produces identical bytes.
- Added token-only compatibility coverage. Token-backed scales remain symbolic
  in the generated lookup plan and resolve only through the normal theme path;
  the source plan remains unchanged.
- Added fail-closed runtime coverage for unknown properties, non-string scales,
  missing scales, and malformed generated style entries.
- Added repeated-selection identity coverage and compiler/runtime equivalence
  for overlapping shorthand/longhand precedence and token-only selections.

See [M5.5 Sprinkles contract assessment](assessments/2026-09-22-m5-5-sprinkles-contract.md).

Next recommended roadmap item: **M6.1** — define native platform,
dimension-bucket, RTL, font-scale, and accessibility conditions with explicit
precedence and subscription lifecycle. Keep device frame/allocation gates and
Android backlogged until the Expo/device harness is available.

### 2026-09-22 — M6.1 native condition snapshots and lifecycle

- Added a finite native condition snapshot with platform, compact/medium/
  expanded width buckets, short/regular/tall height buckets, orientation,
  direction, font-scale, motion and contrast preferences. Raw dimensions are
  used only to derive buckets and never enter snapshot identity or cache keys.
- Added explicit resolver precedence: the branch matching the most axes wins,
  later declarations win equal-specificity ties, an empty matcher is the
  documented default branch and a caller fallback handles an unmatched
  snapshot.
- Added a source-backed immutable snapshot store. Sources activate with the
  first subscriber, deactivate after the last unsubscribe, re-read on
  reactivation and clean up in reverse order on disposal. Same-bucket resize
  updates retain snapshot identity and do not notify consumers.
- Exported the condition model, resolver, store and React
  `useNativeConditionSnapshot` hook from both `theme` and the lean `theme/core`
  runtime surfaces. Focused tests cover boundaries, malformed input,
  precedence, identity and subscription cleanup.

See [M6.1 native condition assessment](assessments/2026-09-22-m6-1-native-conditions.md).

Next recommended roadmap item: **M6.2** — add conditional value
normalisation and mapping helpers, including any responsive tuple syntax only
where it preserves readable types and equivalent finite semantics. Keep device
frame/allocation gates and Android backlogged until the Expo/device harness is
available.

### 2026-09-22 — M6.2 conditional value normalisation and mapping

- Added typed `NativeConditionalValue` records and bounded responsive tuples.
  `createNativeNormalizeValueFn` emits one frozen map in configured condition
  order; scalar, record and tuple forms therefore have the same canonical
  representation, and nullish entries are omitted.
- Added `createNativeMapValueFn` for deterministic value mapping and
  `mapNativeConditionValueToBranches` to attach the M6.1 matchers without
  evaluating arbitrary runtime programs. The built-in responsive names cover
  `default`, `compact`, `medium` and `expanded` width buckets.
- Added type fixtures, malformed-input checks, a generated tuple/record
  equivalence property and resolver integration coverage. The public helpers
  are available from `theme` and the lean `theme/core` entrypoint.

See [M6.2 conditional value assessment](assessments/2026-09-22-m6-2-condition-values.md).

Next recommended roadmap item: **M6.3** — define supported expression nodes
  for aliases, typed scalar operations, fallbacks, composition and exhaustive
  matching before adding functional style programs. Keep device
  frame/allocation gates and Android backlogged until the Expo/device harness
  is available.

### 2026-09-22 — M6.3 native expression data contract

- Added a versioned, frozen expression AST with explicit number, length,
  duration, opacity, colour and finite-enum domains. Token and condition
  references, aliases, missing-input fallbacks, ordered composition, typed
  scalar operators and exhaustive finite matching all validate their domains
  before a future evaluator is introduced.
- Added canonical dependency sets and versioned program wrappers. Dependencies
  are sorted and deduplicated from token names and M6.1 condition axes;
  arbitrary callbacks and runtime services are not representable. A property
  test verifies that composition order does not alter dependency identity.
- Exported the pure constructors and guards from the `style` and package-root
  authoring surfaces, with type fixtures for cross-domain and invalid-enum
  rejection. The detailed contract is in the [M6.3 native expression
  assessment](assessments/2026-09-22-m6-3-native-expressions.md) and [native
  expression v1 specification](specifications/native-expression-v1.md).

Next recommended roadmap item: **M6.4** — constant-fold static expressions and
recompute dynamic programs only for declared dependency changes. Keep device
frame/allocation gates and Android backlogged until the Expo/device harness is
available.

### 2026-09-22 — M6.4 expression evaluation, folding and selective runtime

- Added deterministic evaluation for every M6.3 node. Token and condition
  values are validated against their declared domains; missing tokens are
  distinct from invalid values, and fallbacks catch only missing inputs.
  Ordered composition uses left-to-right last-winner semantics.
- Added `foldNativeExpression` for dependency-free constant folding and
  `createNativeExpressionRuntime` for immutable updates that compare only
  declared token names and condition axes. Unrelated updates skip evaluation;
  forged dependency lists and disposed runtimes fail closed.
- Exported evaluator/runtime APIs from the authoring root and style surface,
  plus the advanced `theme` runtime entrypoint. The lean `theme/core` graph
  remains free of evaluator code. Property-based folding, token/condition
  invalidation, runtime lifecycle, public API and type fixtures cover the
  contract.

See the [M6.4 expression evaluation assessment](assessments/2026-09-22-m6-4-expression-evaluation.md)
and the [native expression v1 specification](specifications/native-expression-v1.md).

Next recommended roadmap item: **M6.5** — test normalization idempotence,
deterministic evaluation, supported algebraic laws, precise invalidation and
resize/font-scale/RTL behaviour on native consumers. Keep device
frame/allocation gates and Android backlogged until the Expo/device harness is
available.

### 2026-09-22 — M6.5 expression laws and native condition boundaries

- Added property coverage for idempotent conditional-value normalisation and
  expression folding, deterministic evaluation independent of insertion order,
  scalar algebraic laws and ordered composition semantics.
- Qualified selective invalidation across generated declared-token changes and
  verified that unrelated updates skip evaluation while preserving the latest
  input snapshot.
- Fed runtime programs from finite native condition snapshots to cover width
  resize, font-scale, orientation and RTL boundaries. Static descendants are
  folded before dynamic evaluation, keeping dependency sets intact.

See the [M6.5 expression laws assessment](assessments/2026-09-22-m6-5-expression-laws.md)
and the [native expression v1 specification](specifications/native-expression-v1.md).

Next recommended roadmap item: **M7.1** — add typed component slots with one
shared variant selection and view/text/image-specific outputs, preserving the
existing single-style recipe interface. Keep performance registry activation,
device frame/allocation gates and Android backlogged until their required
harnesses are available.

### 2026-09-22 — M7.1 typed component slots

- Added the versioned `componentRecipe` descriptor with named `view`, `text`,
  and `image` slots, one inferred variant selection and slot-specific style
  outputs. `componentRecipeFromRecipe` is the explicit view-only migration path
  for existing single-style recipes.
- Added a shared component resolver plan and bounded cache. It preserves
  authored base/variant/compound order, returns frozen arrays for every slot,
  and does not expand variant products. Runtime selection values outside the
  string/boolean contract are reported and skipped.
- Theme resolution walks tokens in every component branch. Generic compiler
  capture and emission preserve the descriptor tag and nested class
  references; primitive diagnostics include the authored `button.label` path.
- Qualification covers seeded independent evaluation and plan-size laws,
  compiler emission, packed ESM/CommonJS consumers, and runtime isolation.
  Effect 4 remains an internal package dependency for compiler/schema
  boundaries; the `theme` and `theme/core` runtime graphs stay React-only.
- Device frame/allocation/retained-memory evidence, visual Storybook acceptance,
  performance registry activation and Android remain incomplete.
- `bun run check` passed with 798 tests and 29,108 assertions across 135 files;
  `bun run docs:build` built 20 pages. Budget validation is structurally valid,
  with performance qualification still `not-run` and thresholds pending review.

See the [M7.1 component slots assessment](assessments/2026-09-22-m7-1-component-slots.md).

Next recommended roadmap item: **M7.2** — add exhaustive discriminated state
recipes and prohibited-combination checking without generating state products
eagerly. Keep performance registry activation, device frame/allocation gates
and Android backlogged until their required harnesses are available.

### 2026-10-04 — M10.5 warm-transform cost candidate review

The exact package-root workload remains over its unchanged warm-transform ceiling: the current report records 8.033 ms for the README fixture and 7.372 ms for the package-owned consumer, against a 6.514 ms ceiling and 5.664 ms baseline. A 100-transform CPU profile identified source-identity lookup, schema validation, and VM evaluation as candidate costs. Three scratch A/B candidates did not establish a repeatable improvement across both fixtures; no production change, threshold, or baseline was retained. The full Node 22 suite was not rerun. See the [assessment](assessments/2026-10-04-m10-5-warm-transform-cost.md) and [qualification evidence](evidence/2026-10-04-m10-5-warm-transform-cost/qualification.json).

M10.5 remains open; Android remains last.

Next recommended roadmap slice: **M10.5 exact-workload phase attribution inside Vanilla Extract integration compilation and generated-module evaluation** — separate these costs under the package-root workload, then A/B one bounded candidate before any full host-budget rerun. Keep the output-parity assertion and approved 6.514 ms gate unchanged.

### 2026-10-04 — M10.5 exact-workload compilation and evaluation attribution

Vanilla Extract integration compilation accounts for about 71–72% of the instrumented package-root transform time across the README and package-owned consumer fixtures. Generated-module evaluation is about 1.2 ms; `vm.Script` construction is negligible. A scratch candidate forcing short identifiers improved timing but changed both generated development module bodies and removed readable debug IDs, so it was rejected. Scratch-default output bodies matched the uninstrumented transformer; absolute instrumented timings remain diagnostic, and the existing uninstrumented host comparison still exceeds the unchanged 6.514 ms ceiling. No production change, baseline, or threshold was retained. The full Node 22 host suite was not rerun. See the [assessment](assessments/2026-10-04-m10-5-phase-attribution.md) and [machine-readable evidence](evidence/2026-10-04-m10-5-phase-attribution/qualification.json).

M10.5 remains open; Android remains last.

Next recommended roadmap slice: **M10.5 integration-compilation subphase attribution and parity-preserving candidate search** — separate esbuild and Vanilla Extract debug-id costs inside the integration boundary, then test one bounded candidate that retains development identifiers and exact output parity before any full host-budget rerun. Keep the approved 6.514 ms ceiling unchanged.

### 2026-10-04 — M10.5 Vanilla Extract compile subphase attribution and A/B

The exact package-root instrumentation attributes about 5.75–5.82 ms to esbuild build, with debug-ID Babel transformation at 1.03–1.53 ms and package lookup, source reads and metafile capture much smaller. A scratch candidate switched the plugin to Vanilla Extract's `transformSync`; generated module bodies matched exactly, but end-to-end process medians overlapped and the consumer median was slightly slower. The candidate would also require carrying custom upstream compile-plugin behavior, so no production change was retained. Instrumented timings are diagnostic only; the existing uninstrumented host comparison and 6.514 ms ceiling remain unchanged. The full Node 22 suite was not rerun. See the [assessment](assessments/2026-10-04-m10-5-compile-subphase-ab.md) and [machine-readable evidence](evidence/2026-10-04-m10-5-compile-subphase-ab/qualification.json).

M10.5 remains open; Android remains last.

Next recommended roadmap slice: **M10.5 esbuild context-reuse feasibility and invalidation A/B** — test whether reusing an esbuild context reduces the measured build overhead while retaining exact output and reliable invalidation for entry files, dependencies and compiler configuration. Run the full Node 22 host gate only if this candidate is repeatably faster and parity-safe.


### 2026-10-05 — M10.5 bounded context-cache cardinality and lifecycle A/B

A scratch LRU capacity sweep measured 1, 8, and 32 cloned recipe entries at capacities 1, 4, 8, 16, and 32, with three fresh Node 24 processes per matrix cell. All 654 distinct output/input comparisons matched fresh integration compiles, and all 891 created contexts were disposed. Capacity 4 retained the tested four-entry hot set; capacity 1 churned and drove service RSS substantially higher. Context disposal cleared the cache but did not lower service-process RSS snapshots; stopping the shared esbuild service removed its process in all 27 runs. RSS is a high-water observation, not per-context live-byte evidence. No production cache or performance threshold changed. See the [assessment](assessments/2026-10-05-m10-5-context-cache-cardinality-lifecycle.md) and [qualification evidence](evidence/2026-10-05-m10-5-context-cache-ab/qualification.json).

M10.5 remains open; Android remains last.

Next recommended roadmap slice: **M10.5 full-transform cache integration and Metro worker-lifecycle A/B** — replay a captured Expo Storybook transform trace through the complete transformer, verify exact output and dependency receipts, then measure cache disposal and service RSS over realistic edits and worker shutdown. Treat capacity 4 as a candidate to test, not a selected production bound. Keep the Node 22 host-budget and device gates separate; Android remains last.

### 2026-10-05 — M10.5 full-transform cache and Metro worker lifecycle A/B

A captured seven-entry Expo Storybook iOS development CSS trace was replayed through the complete native compiler and Expo/Babel transformer in nine fresh parent processes using real Metro workers. All 567 results and compile receipts matched fresh output; the seven cold results matched the capture. Capacity 4 had no hits in this serial seven-entry replay. Capacity 8 preserved the working set, reducing median complete-transform time from 41.088 ms to 37.902 ms (-7.8%), with higher sampled service RSS. The adapter awaited all 210 context disposals; normal worker exit removed observed processes but recorded no explicit disposal. The stale-callback control caught 56 incorrect cache-hit results. Final capture serialization failed on a full-source-map polyfill; this is transform-trace evidence, not a bundled or native acceptance claim. No production source, cache bound or approved threshold changed. See the [assessment](assessments/2026-10-05-m10-5-full-transform-cache-metro-lifecycle.md) and [qualification](evidence/2026-10-05-m10-5-full-transform-ab/qualification.json).

Next recommended roadmap slice: **M10.5 cache admission and lifecycle design** — define supported worker disposal, cache identity/config replacement, concurrency, error recovery and admission policy, then qualify actual incremental Metro invalidation. The serializer issue is separate; exact Node 22 and device gates remain separate. Android remains last.

### 2026-10-05 — M10.5 cache admission and lifecycle design

The proposed [written spec](superpowers/specs/2026-10-05-m10-5-cache-admission-lifecycle-design.md) defines one finite worker-local owner, current-build receipts, resolution-configuration identity, immediate and bounded repeat admission, serial native capture, idle disposal, error recovery and exactly-once direct-session close. It uses Metro's existing transformer boundary and treats worker exit as process-resource cleanup, not awaited context disposal. Private worker replacement and shared-service stop are excluded. Trial bounds and idle settings remain experiments; no production default or approved budget changes. The spec records filesystem snapshot limits, single-worker main-process ownership, property/model tests, concurrent-load and actual incremental graph gates. No package source or dependencies changed.

Next recommended roadmap slice: **M10.5 cache qualification implementation plan**, after written-spec review. Then implement a private qualification prototype and run actual incremental Expo/Metro invalidation and lifecycle A/B before deciding on production admission. Android remains last.

### 2026-10-05 — M10.5 cache qualification implementation plan

The user approved the written cache spec. The [native execution plan](superpowers/plans/2026-10-05-m10-5-cache-qualification.md) now sequences five independently committed tasks: pure admission policy, configuration identity, resource session, disposable full-transform integration, and actual incremental Expo/Metro qualification. Shipping source/artifacts, package dependencies, approved budgets and defaults stay outside this qualification plan. A cached package-name boundary discovered in the installed integration requires module/worker restart, not simply context recreation. The plan maps all spec requirements to named tests and separates candidate-artifact parity from production identity. Implementation has not started.

Next recommended roadmap slice: **M10.5 Task 1 — pure admission-policy prototype**, after plan review, using native execution. Later tasks qualify resource cleanup, dependency capture, configuration changes and real incremental bundles before any production-admission review. Android remains last.


### 2026-10-05 — M10.5 Task 1: bounded admission policy

Implemented the private benchmark admission policy without shipping-source, export, dependency or artifact changes. Success plans preserve previous frozen snapshots; repeat admission remembers only bounded probation, so pruned and evicted keys restart at first access. Invalid capacities, modes and keys are rejected. Seven unit tests and 500 generated model traces pass, using an independent timestamp-map oracle. RED was observed against a stub; fast-check shrank its failure to capacity 1, immediate admission, one successful A request (seed 10505, path `0:0:0:0:0:0`). Verification passed: 1,378 package tests across 214 files, package typecheck, documentation build (28 pages) and the existing full-transform evidence verifier (161 artifact/input files unchanged). Fresh read-only review found no actionable issues.

Next recommended roadmap slice: **M10.5 Task 2 — configuration identity and eligibility**, using native execution. This slice does not qualify resource cleanup or select production cache settings. Android remains last.


### 2026-10-05 — M10.5 Task 2: configuration identity and eligibility

Implemented private configuration receipts and context keys, preserving logical/canonical paths and excluding stylesheet bytes from the reuse key. Byte edits invalidate configuration even with preserved mtimes. The installed integration dispatcher and implementations are hashed; package-name/cache changes and loaded-artifact edits require restart. Unknown options/plugins, incomplete inventories, unqualified JSONC/package-based extends and buffer conflicts select fresh compilation. Build-input verification must run after every build; this establishes no atomic filesystem snapshot. See [the identity assessment](assessments/2026-10-05-m10-5-configuration-identity.md) for the admitted fixture domain and observed compiler checks.

Next recommended roadmap slice: **M10.5 Task 3 — resource-owning compile session**, using native execution. Production cache admission and compiler/resource/Metro performance remain separate. Android remains last.


### 2026-10-05 — M10.5 Task 3: resource-owning compile session

Implemented the private session and real esbuild adapter without shipping-source, export, dependency or artifact changes. Creation, disposal and quarantine stay within the owned-context budget; eviction awaits cleanup before replacement. Failed cleanup disables retention and preserves unresolved ownership and original build/native diagnostics. Queue admission copies request data; current rebuild slots route receipt callbacks and detach in finally. Direct close drains admitted work and retains one completion outcome. Controlled 1/30/120-second idle tests cover three reopen cycles and stale callbacks; real idle and stable fresh/retained receipt checks pass. See [the session assessment](assessments/2026-10-05-m10-5-context-session-lifecycle.md).

Verification: 22 focused tests including 500 traces (seed 10506, maximum 200 events), all 1,420 package tests across 217 files, package typecheck, documentation build and the unchanged 161-file full-transform evidence inventory pass. Two review findings received failing regressions and fixes. No production cache/default or performance threshold is selected.

Next recommended roadmap slice: **M10.5 Task 4 — complete-transform candidate**, using native execution and an owned disposable transformer copy. Actual Metro, Node 22 host-budget and device evidence remain separate. Android remains last.


### 2026-10-05 — M10.5 Task 4: complete-transform receipt candidate

Task 4 is complete in private benchmark tooling and an owned disposable package copy. One AST-checked artifact passes fresh/immediate/repeat parity on exact Node v22.0.0 and current Node v24.15.0. Explicit outcome goldens cover dependency edits, concurrent requests and failure/repair; the stale-input control changes native metadata/results despite identical rebuilt source. All native entry points use the receipt gate, all candidate processes await owned close, and original shipping inventories/copy authoring artifacts remain unchanged. See the [assessment](assessments/2026-10-05-m10-5-full-transform-candidate.md) and [raw evidence receipt](evidence/2026-10-05-m10-5-full-transform-candidate/collection.json).

Final verification passes nine focused checks, 1,429 package tests, typecheck, documentation build and archived/live hash verifiers. This is controlled complete-transform evidence; no actual Metro, host-budget, production-admission or device gate is closed.

Next recommended roadmap slice: **M10.5 Task 5 — incremental Metro qualification**, using native execution. Qualify actual Expo/Metro graph invalidation, idle/reopen, restart/project transitions and resource/performance trade-offs before production admission. Android remains last.


### 2026-10-05 — M10.5 Task 5: incremental Metro qualification

Private tooling and disposable artifacts qualify three unchanged-importer dependency families, direct entry/import removal, syntax repair, real three-cycle idle at 1/30/120 seconds, exact Node v22.0.0 behavioural parity, and stock Metro same-main-process restart/second-project cleanup. The frozen 105-process matrix passes 7,805 complete source/input/metadata/result pairs but every retained variant regresses 3.5–4.1×. Alias/symlink retarget and some fresh receipt comparisons fail; two worker processes fail the bounded two-second shutdown gate and later exit naturally. Development HMR, actual installation replacement, host and device limits remain explicit. All failed attempts and the 105 invalidated original timings are retained. [Assessment and evidence](assessments/2026-10-05-m10-5-cache-qualification.md).

No production cache/default/API/dependency or approved budget changed. M10.5 remains open; Android remains last.

Next recommended roadmap slice: **M10.5 — attribute retained-candidate guard cost**, using native execution. Separate configuration hashing and source/input guards from rebuild/native work under the fixed workloads before attempting a faster parity-safe candidate; graph-invalidation remediation remains a separate admission blocker.


### 2026-10-05 — M10.5: retained-candidate guard cost attribution

The approved private attribution slice measures fresh/immediate/repeat at capacity 8 under the same three workloads, with five profiling-on/off process pairs: 90 processes / 6,690 transforms. Complete source/input/native-metadata/result parity, exclusive span conservation, logical bytes, bounds and owned cleanup pass. Retained guards cost roughly 24.4–25.7 ms; reads about 11.3–11.9 ms and hashes 8.8–9.1 ms dominate. Each retained transform captures configuration three times and scans declared roots twice, including full candidate dist. Observer ratios remain host-variable diagnostics, not a new performance budget. [Assessment/evidence](assessments/2026-10-05-m10-5-guard-cost-attribution.md).

No guard, shipping compiler/API/dependency/default or approved threshold is changed. Task 5's production-admission failures and all host/device gates remain open. Android remains last.

Next recommended roadmap slice: **M10.5 — A/B deduplicated guard receipts per transform**, retaining coherent before/after validation, loaded-artifact/package restart rules, unknown-domain fallback and source/buffer conflict controls; compare complete fresh results before any admission review.


### 2026-10-05 — M10.5: per-pass guard receipts A/B

The repaired private candidate completes a new fixed 90-process / 6,690-transform matrix with exact source/input/native-metadata/result parity and bounded owned cleanup. Sharing byte receipts reduces logical artifact bytes but increases retained warm transform time by roughly 14–25% in paired process medians; fresh controls remain near parity. The candidate is rejected as a performance improvement. Sampling, canonicalisation and defensive buffer handling add work; their individual costs are not isolated. A review-found unstable-read fallback was reproduced with real before/after sampling edits and repaired before repeating the measurement. Fourteen supplementary controls preserve fresh parity except the documented package-name worker-restart boundary. [Assessment/evidence](assessments/2026-10-05-m10-5-guard-receipts-ab.md).

No production cache/API/dependency/default, performance threshold or admission gate changes. Existing graph/configuration, HMR, receipt and multi-worker shutdown blockers remain open. Android remains last.

Next recommended roadmap slice: **M10.5 — A/B immutable path-digest receipts**, avoiding buffer exposure/copies for digest-only consumers while preserving independent sampling, restart, instability and buffer-conflict checks; compare complete transforms before admission.


### 2026-10-05 — M10.5: immutable path-digest receipts A/B

One private artifact compares original-guard, shared-buffer and immutable path-digest variants with five processes per mode/workload: 135 processes / 10,035 transforms. All source/input/native-metadata/full-result pairs, independent sampling, logical read/clock conservation, bounds and owned cleanup pass. Path primitives avoid exporting/copying sampler buffers for file hashing and entry matching. Retained warm medians improve roughly 6–10% relative to buffer receipts but remain roughly 6–17% slower than the same-artifact guard baseline. The candidate is rejected as an overall performance improvement; smaller fresh-control deltas remain host-variable diagnostics. [Assessment/evidence](assessments/2026-10-05-m10-5-path-digest-receipts.md).

No shipping API/cache/dependency/default, approved threshold, host/native/device guarantee or production-admission gate changes. Existing graph/configuration, native receipt, HMR and worker-shutdown blockers remain open. Android remains last.

Next recommended roadmap slice: **M10.5 — configuration/graph invalidation gate diagnosis**, reproducing alias-retarget, workspace-package-import and symlink-retarget failures against independent fresh Metro receipts before deciding remediation.

### 2026-10-05 — M10.5: configuration/graph invalidation diagnosis

The [diagnosis](assessments/2026-10-05-m10-5-graph-invalidation-diagnosis.md) localises the alias and symlink failures before the compiler session. A corrected 24-stage isolated stock Metro trial binds current entry bytes and preserves exact fresh receipts except two stale alias edits; twelve owners close and six fixture states restore. Four original-sequence Expo trials preserve 64 observations: watch events reach Metro, alias edits still do not recompile the importer, and disabling only the owned disk transform cache repairs the observed symlink/stored-entry receipt failures. Workspace-import and restored-entry mismatches also expose the legacy collector's stale-trace race; historical failed gates are retained rather than silently promoted. The chained installation marker is outside the configured installation domain, so that row qualifies only dependency editing. Failed readiness/port attempts are excluded and preserved. Shipping APIs, dependencies, defaults, thresholds and production cache admission remain unchanged.

Next recommended roadmap slice: **M10.5 — configuration-aware Metro invalidation design**, covering configuration and authored resolution/package/link identity before cache lookup, plus explicit safe refresh versus restart boundaries. Qualify a private candidate against these exact controls only after design review. Android remains last.

### 2026-10-05 — M10.5 consolidated completion slice

The user approved one engineering and qualification slice with one commit, Android included and all physical-device work deferred. Shipping resolution/configuration receipt checks cover logical/canonical paths, package configuration extends and alias/symlink retargeting. The cache-enabled watched Expo chain records 16 fresh-reference matching bundles and one expected syntax-error control. Independent packed journeys export iOS, Android and web. Direct iOS simulator and Android emulator reference, context, CSS refresh and unchanged-frame comparisons are source/artifact pinned. iOS local animation state reset during refresh; the failed edit/restore comparison remains visible.

The package regression passes 1,484 tests and Storybook passes 23. Typechecks and production build pass. Full source-content continuity is checked across each serial collection window; native runtime graphs are checked against their original collection inventory. The matrix separates current successes, failed approved host limits, environment-incompatible comparisons, unperformed software contexts and deferred physical gates. No threshold, baseline, public API or package dependency changed to manufacture qualification.

M10.5 is not performance-qualified. Next recommended roadmap work: **M10.5 — resolve the remaining host performance and software-context gates as one consolidated follow-up**, preserving approved ceilings and comparing identical workloads. Physical-device gates remain deferred.


### 2026-10-05 — M10.5 consolidated follow-up: token budgets and native contexts

Per-invocation resolution receipts deduplicate file/link IO while independent before/after/final guards still resample. Only the token/tooling JavaScript build group is minified: tokens fall to 29,906 bytes ESM / 33,656 bytes CJS and both approved graph limits now pass. Theme groups, declarations, public APIs, dependencies and approved budgets/baselines remain unchanged. Package tests pass 1,485; Storybook passes 23; workspace types and production build pass. Watched/cache-enabled shipping Metro preserves sixteen fresh-reference bundles plus its syntax-error control; independently installed packed iOS/Android/web consumers pass.

Current native iOS/Android references, selected action, font/contrast/direction contexts and native motion switching/restoration pass. Authored style Fast Refresh edit/restore and both unchanged-frame pairs pass; complete source/artifact identities remain unchanged. Owned processes are stopped and preferences restored. Spoken readers and exhaustive variants remain unperformed. Full Storybook controls expose an Expo Go `queueMicrotask` error and are not qualified. See the [assessment](assessments/2026-10-05-m10-5-followup.md) and [source-pinned evidence](evidence/2026-10-05-m10-5-followup/README.md); the preceding completion archive is historical after these source changes.

**M10.5 remains open:** 11/21 host metrics pass, nine fail (four theme initialisation, four theme graph sizes, warm full-transform latency), and Metro latency has an Expo environment mismatch. All five legacy smoke repetitions pass. Next recommended work: **M10.5 — remaining host-limit remediation and software acceptance**, kept as one consolidated item; preserve ceilings, repair/qualify full Storybook controls and spoken-reader/variant coverage separately from host performance. All physical-device work stays deferred.


### 2026-10-05 — M10.5 consolidated remediation and software acceptance

Absent resolution candidates now avoid exception-driven reads/canonicalisation while preserving explicit missing receipts, independently resampled guards and newly created configuration detection. No negative cache, public API change, threshold relaxation or baseline replacement is introduced. The default native Storybook browser uses supported LiteUI with exact harness dependencies; both platforms passed Controls edit/restore, action-event visibility and selected Dark/Light/Disabled visits. Animated FullUI remains unqualified. Package tests (1,485), Storybook tests (23), production build and workspace typechecks passed. Shipping watched/cache-enabled Metro preserves sixteen fresh-reference bundles plus the syntax negative control, and packed iOS/Android/web journeys passed.

The current serial host run reports **12 passes, eight failures and one Expo environment mismatch**. Warm full-transform latency is 9.163 ms; three theme initialisation cells and all four theme graph cells fail approved limits. Node 22 ESM startup passes this run; unchanged theme source does not establish a causal improvement. All five legacy smoke repetitions pass. Native references, preference switching/restoration, style Fast Refresh and exact unchanged frames pass on both platforms. Owned devices/workers were cleaned up. Spoken readers, exhaustive variant review and all physical acceptance remain unperformed. See [assessment](assessments/2026-10-05-m10-5-remediation.md) and [current evidence](evidence/2026-10-05-m10-5-remediation/README.md). Earlier archives remain historical.

**M10.5 remains open.** Next recommended numbered work: **M10.5 — compatibility-preserving runtime-boundary design**, covering the four theme graph limits and three remaining startup failures together, with full-transform latency and Metro environment comparability retained as admission gates. Draft the architecture and parity/identity acceptance criteria before another implementation experiment. This is a consolidated design recommendation, not a further partial implementation. Spoken-reader/exhaustive-variant acceptance remains separate; physical work stays deferred.


### 2026-10-06 — M10.5 compatibility-preserving runtime-boundary design

The approved design slice records a [proposed ADR](decisions/separate-mandatory-theme-resolution-from-optional-runtime-state.md) and [written specification](superpowers/specs/2026-10-06-m10-5-runtime-boundary-design.md). The proposed static modules separate generic descriptor resolution, React integration, optional token scopes and dependency planning while preserving mandatory validation, recursive dispatch, existing build groups, public APIs and compatibility/focused binding identity. Core remains independently built; cross-entry behaviour and function equality are distinct contracts. No product code, dependency, budget, baseline or guarantee changes in this slice.

The design requires a private candidate, independent characterization, graph inspection and paired import/first-use evidence before admission. It makes no claim that separation alone clears the four theme graph limits or three failing startup cells. Warm-transform and Metro comparability gates remain open. The existing 12/8/1 host result remains the source-current measured status; physical acceptance stays deferred.

Next recommended numbered slice: **M10.5 — static runtime-boundary candidate implementation plan**, after written-design review. Plan characterization, extraction, paired measurement and one admission/rejection decision as a consolidated item. Production implementation and new qualification remain subsequent work.


### 2026-10-06 — M10.5 runtime-boundary candidate implementation plan

The consolidated [implementation plan](superpowers/plans/2026-10-06-m10-5-runtime-boundary.md) sequences characterization, static extraction, paired import/first-use measurement, unchanged full host budgets, and current packed/Metro/native qualification as one candidate slice and one admission decision. The execution method is native. The plan retains all existing failures and leaves production admission conditional on measured results; it does not alter APIs, budgets, baselines or the explicit physical-device deferral.

Next recommended slice: **M10.5 — non-breaking startup and emitted-graph attribution and feasibility design**. Attribute mandatory public semantics and avoidable initialization cost before proposing another implementation. Preserve all APIs and current performance gates.


### 2026-10-06 — M10.5 static runtime-boundary candidate rejected

The consolidated [candidate plan](superpowers/plans/2026-10-06-m10-5-runtime-boundary.md) completed with a measured rejection. Package-shaped ESM/CJS contracts, focused binding identity, mixed provider/hook operation, recursive component slots and runtime isolation passed for the candidate. However, the unchanged 21-metric host protocol reports **11 pass, 9 fail and 1 Expo environment mismatch**. All four startup metrics, warm full-transform and all four theme graph-size gates fail. Compared with the frozen package control, candidate theme/core graphs grew by 515/295 bytes and 350/339 bytes respectively. Across 240 adjacent first-use pairs in 16 runtime/format/scenario cohorts, all combined-cost medians stayed within control spread; no qualifying improvement was shown. Five legacy smoke runs passed. The separate diagnostic-only emitted-byte metric failed and is excluded from the 21-metric count.

Production extraction was removed after preserving the exact changed candidate source and its measurements. No API, package dependency, threshold, baseline or design-system guarantee changed. The candidate's packed Expo result was observed but not retained; candidate Metro refresh and native flows were not run after the decisive host rejection. The restored-control packed iOS/Android/web export and three source maps passed. Fifteen previous matrix measurements were marked stale because their source digest predates the current source; their evidence hashes and outcomes remain intact. No Simulator was operated, and physical-device work remains deferred. See the [assessment](assessments/2026-10-06-m10-5-runtime-boundary.md), [evidence archive](evidence/2026-10-06-m10-5-runtime-boundary/README.md) and [rejected proposal](decisions/separate-mandatory-theme-resolution-from-optional-runtime-state.md).

**M10.5 remains open.** Next recommended slice: **M10.5 — non-breaking startup and emitted-graph attribution and feasibility design**. Attribute mandatory public semantics and avoidable initialization cost, then specify one evidence-backed implementation candidate against the current ceilings. Preserve all APIs and gates; keep warm-transform and Expo-version comparability explicit. Physical-device acceptance remains deferred.

### 2026-10-06 — M10.5 startup and emitted-graph feasibility

The [feasibility assessment](assessments/2026-10-06-m10-5-startup-graph-feasibility.md) finds no measured non-breaking candidate that can meet the current theme graph and startup limits. Static extraction slightly increased every theme graph and produced no paired first-use improvement; the tested minified output still leaves theme graphs roughly twice their limits and does not pass startup. The current synchronous resolver contract requires descriptor validation and recursive dispatch, while the compatibility `theme` entry exposes its feature implementations synchronously. No API, threshold, baseline, or runtime changed. Host imports remain Node evidence, not Expo/Hermes acceptance.

**M10.5 remains open.** Next recommended slice: **M10.5 — runtime-budget and public-API policy ADR**. Decide whether the existing limits remain binding for the expanded synchronous API, whether a separately measured additive entry has a demonstrated consumer, or whether replacement targets should follow representative Expo/Hermes measurements. Preserve current limits until an explicit decision; breaking descriptor/API changes remain out of scope. Confirm the ADR intent summary before drafting. Physical-device acceptance remains deferred.

### 2026-10-06 — M10.5 runtime-budget and public-API policy

The [proposed ADR](decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md) keeps the synchronous public APIs and every current package-host limit unchanged. It requires a packed Expo/Hermes consumer study with plain React Native controls before a later review can propose a mobile runtime target or change an existing budget. The planned study records per-platform Metro and Hermes artifact contributions plus JavaScript-entry-to-first-themed-layout samples, with exact package, source, app, and runtime identities. iOS Simulator and Android Emulator results remain software-context evidence; no physical-device claim or acceptance is made. No runtime code, dependency, export, baseline, or threshold changed in this ADR slice.

**M10.5 remains open.** Next recommended roadmap slice: **M10.5 — collect the packed Expo/Hermes consumer evidence matrix**, including Android Emulator, using the exact packed package and a matched plain React Native control. Retain at least five independent cold-launch samples per cell and source-map-attributed bundle receipts. Submit any target proposal separately after reviewing the evidence. Physical-device work remains deferred.

### 2026-10-06 — M10.5 packed Expo/Hermes measurement specification

The [proposed consumer measurement specification](superpowers/specs/2026-10-06-m10-5-expo-hermes-runtime-design.md) defines one consolidated study: plain React Native, theme/core and compatibility-theme variants on iOS Simulator and Android Emulator, with five cold-process launches per cell, production-packed package identity and release Hermes binary verification. Its timing boundary is JavaScript entry to the first positive-size root layout; it excludes native process startup and frame presentation. JavaScript source maps provide mapping-based byte attribution; Hermes size uses whole-bundle deltas against the matched control. The protected Simulator is excluded, software devices require explicit ownership, and all physical-device work remains deferred.

No harness, runtime API, dependency, budget or acceptance status changed in this documentation slice. **M10.5 remains open.** Next recommended roadmap slice: **M10.5 — packed Expo/Hermes consumer matrix implementation plan**, after written-specification review. Plan the entire matrix and evidence decision together; any target proposal remains a separate review after measurement.

### 2026-10-06 — M10.5 consolidated Expo/Hermes implementation plan

Following written-specification approval, the [implementation plan](superpowers/plans/2026-10-06-m10-5-expo-hermes-runtime.md) covers equivalent packed fixtures, receipt validation, conservative JavaScript/Hermes accounting, owned release software-device builds, all six runtime cells and one final evidence decision as a single implementation slice. Native execution remains selected. The plan rejects unmatched executable/export artifacts, stale receipts, physical targets and the protected Simulator; all physical-device work remains deferred.

This is planning evidence only: no harness, native check, API, dependency, budget or qualification status changed. **M10.5 remains open.** Next recommended roadmap slice: **M10.5 — execute the consolidated packed Expo/Hermes consumer study**, after written-plan review. A complete matrix precedes any separately approved target-policy decision.

### 2026-10-06 — M10.5 packed Expo/Hermes consumer matrix

The consolidated [consumer study](assessments/2026-10-06-m10-5-expo-hermes-runtime.md) is structurally complete: six production release binary/Hermes matches, six paired JavaScript/Hermes exports, 30 valid retained cold-process layout intervals and six excluded warm-ups across plain React Native, packed theme/core and compatibility theme on iOS Simulator and Android Emulator. Standalone report validation and independent review verified source/package/lock identities, shared resolved dependency graphs, complete raw receipt and cold-launch command proof, byte attribution, installed-binary matching, unchanged environment fingerprints and successful cleanup. [Evidence and reproduction instructions](evidence/2026-10-06-m10-5-expo-hermes/README.md) identify the retained local binaries/maps and committed receipts.

The interval is JavaScript entry to first positive-size root layout, excluding native startup, bundle prelude, paint/frame presentation and transport. iOS medians were 22.684/22.795/23.112 ms for plain/core/compatibility; Android medians were 54.442/49.425/47.866 ms. Five samples per cell are descriptive, not tail guarantees or a causal speed claim. Mapped Crumbs JavaScript contributed 33,860 bytes for core and 92,687 bytes for compatibility; Hermes whole-bundle deltas against plain were about 50/127 kB, with exact per-platform byte counts retained. No per-source Hermes cost is inferred.

Seven incomplete preceding cohorts remain explicit, including ENOSPC and an iOS URL-confirmation warm-up timeout; diagnostic consent/transport runs were excluded before fresh collection. Disk admission now checks operational capacity. The protected Simulator was not operated, and all physical-device work remains deferred. No production runtime/API/package dependency, approved budget, baseline or ADR acceptance changed. Existing host failures and the Expo baseline mismatch remain unchanged.

**M10.5 remains open.** Next recommended numbered slice: **M10.5 — consumer-evidence review and explicit performance-target policy decision**. Review this software-context matrix before proposing mobile targets or changing existing host ceilings; keep the policy ADR proposed until that separate decision.


### 2026-10-06 — M10.5 consumer-evidence and target-policy decision

The [consumer-evidence review](assessments/2026-10-06-m10-5-target-policy.md) and explicit session approval accept the [runtime-budget policy ADR](decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md). All existing host/package/compiler/editor gates, baseline selectors, maxima, allowed regressions and enforcement remain binding. The complete Expo/Hermes software-context cohort is reference evidence; no numerical mobile target, threshold relaxation or host-gate retirement is approved. The retained rejected-candidate comparison still reports 11 passes, nine failures and one Expo mismatch; it is not a fresh current-checkout qualification.

The review keeps package graph bytes, mapped consumer JavaScript contribution, whole-bundle Hermes deltas and entry-to-root-layout timing distinct. Future target proposals require independently retained repeat cohorts, exact metric/environment/workload identity, a product reason for tolerated regression and explicit per-metric approval. Direct executable Node/npm capture is required before the next study; H's retrospective npm observation is not rewritten into contemporaneous evidence.

Only policy documentation and its review receipt change. Runtime APIs, package dependencies, budget registry and enforcement are unchanged. The broader native-compiler ADR remains proposed. **M10.5 remains open**, and physical-device work stays deferred.

Next recommended numbered slice: **M10.5 — mobile-target calibration and repeatability plan**. Plan version capture, artifact reproducibility, independent timing cohorts, sample/schedule admission and reject/inconclusive criteria together before collecting another study. Keep the nine retained host failures and matched Expo comparison unresolved until their separate qualification or explicit future policy decision.


### 2026-10-06 — M10.5 mobile-target calibration implementation plan

The [calibration plan](superpowers/plans/2026-10-06-m10-5-mobile-target-calibration.md) operationalises the accepted target policy: capture executable Node/npm identity directly, retain Bun compatibility metadata separately, and admit three fresh comparable packed Expo/Hermes cohorts with cohort-level variability visible. Calibration may recommend a numerical target for later review but cannot approve it or modify existing host gates. The completed H cohort remains historical reference evidence.

This is planning evidence only. No harness, native run, public API, dependency, baseline or threshold changed. **M10.5 remains open.** Next recommended numbered slice: **M10.5 — implement the calibrated cohort protocol, collect three fresh software-device cohorts and publish the explicit target review.** Physical-device work remains deferred.

### 2026-10-07 — M10.5 mobile-target calibration and repeatability

The [calibration assessment](assessments/2026-10-06-m10-5-mobile-target-calibration.md) and revision-3 [machine-readable report](evidence/2026-10-06-m10-5-mobile-target-calibration/calibration-report-revision-3.json) admit three comparable fresh software-device cohorts B/C/D: 90 valid retained cold launches across six cells, with one excluded warm-up per cell and no exclusions among the three active cohorts. JavaScript, source-map and Hermes outputs match byte-for-byte across cohorts; native build hashes vary. The cohort-median ranges and per-launch values remain separate.

The packet is eligible for explicit policy review, but no numerical mobile target is recommended or approved: variant deltas change direction, Android run/cohort variation is material, and no product-backed tolerated regression was supplied. Failed calibration cohort A remains preserved and excluded after the Android/core 3 GiB build gate found 2.6 GiB free. Historical H remains complete but legacy-unverified and reference-only. All three successful cohort cache-pruning receipts preserve proof and stored-summary hashes.

The earlier host comparison still records 11 passes, nine failures and one Expo environment mismatch against its recorded candidate revision; it was not a current-checkout qualification. The mobile evidence did not alter budgets, baselines, public APIs or dependencies. Physical-device, startup, frames, allocation and memory acceptance remain deferred or open.

### 2026-10-07 — M10.5 current-host budget requalification

The [current-host assessment](assessments/2026-10-07-m10-5-current-host-budget-requalification.md) and [retained report](evidence/2026-10-07-m10-5-current-host-budget-requalification/) now bind a fresh clean-install run to the final tracked source and lock state. Its source SHA-256 matches the managed `main` worktree, and the measured source plus 145 freshly built artifacts remained stable during collection. The full check passed with 1,499 CSS tests, one expected Node-floor-only skip and all 23 Storybook tests.

The 21 host metrics report 11 passes, nine failures and one incomplete Metro comparison. The failures are four runtime initialization modes, warm transform and four theme graph sizes. Incremental rebuild measured 130.399458 ms (+5.20%) but remains incomplete because current Expo 56.0.23 / Metro 0.84.5 differs from the approved Expo 56.0.4 / Metro 0.84.4 baseline. All approved limits, baseline selectors and enforcement remain unchanged; M10.5 remains open. No safe, evidence-backed production optimization was identified in this slice. The clean-install fixes declare the existing tool and adapter dependencies and make the package-boundary test independent of workspace hoisting; no public API or production runtime dependency changed. Physical-device work remains deferred.

Next recommended roadmap item: **M10.5 — attribute runtime initialization and warm-transform cost by entry and feature boundary, then test an API-preserving graph reduction against the unchanged host budgets**. Handle the Expo/Metro mismatch as a separate matched-environment qualification or explicit baseline-policy review.

### 2026-10-07 — M10.5 runtime attribution and API-preserving graph feasibility

The [attribution and feasibility assessment](assessments/2026-10-07-m10-5-runtime-attribution-and-reduction-feasibility.md) reconciles the current-host failures with the retained startup profiles, warm-transform phase studies, and rejected static-extraction/minification candidates. The diagnostic source-map replay records 64,549 bytes for the default theme/core ESM graph, normalized output parity, and the largest source contributors; its summary includes source and artifact hashes and marks the raw map/artifacts as unretained. Existing startup profiles remain too sparse to assign the timing delta to an individual function. No API-preserving reduction candidate meets the unchanged host gates.

No runtime source, public API, dependency, baseline, threshold or enforcement rule changed. **M10.5 remains open**, and physical-device work remains deferred.

Next recommended numbered slice: **M10.5 — matched Expo/Metro incremental rebuild requalification**. Repeat the current workload under the approved Expo 56.0.4 / Metro 0.84.4 / React Native 0.85.3 identities, with source-pinned artifacts and the existing 10% ceiling. If that pair cannot be reproduced, take a separate baseline-policy review; keep the current environment-mismatched observation incomplete.

### 2026-10-07 — M10.5 matched Expo/Metro incremental rebuild requalification

The [assessment](assessments/2026-10-07-m10-5-matched-metro-requalification.md) and [retained evidence](evidence/2026-10-07-m10-5-matched-metro-requalification/) close the previously incomplete incremental-rebuild comparison. Under the approved Expo 56.0.4 / Metro 0.84.4 / React Native 0.85.3 pair and the baseline's identical workload, the five-sample median is 129.318750 ms (+4.33% from 123.950500 ms). It passes both the unchanged 10% relative cap and 137.506 ms absolute maximum. Dependency invalidation, strict-diagnostics restart and fixture restoration controls passed.

The raw report identifies the disposable baseline lock scaffold; the separate qualification record pins current compiler source and runtime artifacts. The temporary Vanilla Extract app-resolution overlay matches the current Playground dependency and does not alter the approved Expo/Metro/React/React Native versions. No public API, production runtime, package dependency, baseline or threshold changed. **M10.5 remains open** for the four runtime-initialization failures, warm-transform failure and four theme graph-size failures. Physical-device work remains deferred.

Next recommended numbered slice: **M10.5 — reattribute the current warm-transform workload inside Vanilla Extract integration compilation and generated-module evaluation, then test one output-parity-preserving candidate**. Earlier phase attribution covers slower 8.0–8.3 ms observations and does not explain the current 9.754 ms median against the 6.514 ms ceiling. Keep development identifiers and exact generated-module parity; stop without a production change if no candidate meets the unchanged budget.


### 2026-10-07 — M10.5 current warm-transform attribution and context-reuse candidate

The [current-source phase attribution and candidate assessment](assessments/2026-10-07-m10-5-current-warm-transform-attribution.md) records five instrumented phase runs and a five-process unprofiled A/B. A bounded esbuild context improved the matched scratch gate statistic from 10.186 ms to 7.984 ms (−21.6%), with exact generated-output hash parity and successful entry plus imported `.css.ts` invalidation. It still misses the unchanged 6.514 ms ceiling by 1.470 ms (22.6%). The process required explicit context disposal; Metro lifecycle ownership was not proven. The candidate is rejected for production, and the authoritative current-host result remains unchanged at 9.754042 ms against its 5.664125 ms baseline. [Raw reports, source overlays and reproduction notes](evidence/2026-10-07-m10-5-current-warm-transform-attribution/README.md).

No production source, API, dependency, baseline, threshold or enforcement rule changed. **M10.5 remains open** for four runtime-initialisation failures, the warm-transform failure and four theme graph-size failures. Physical-device work remains deferred.

Next recommended roadmap slice: **M10.5 — design and test the bounded compiler-session lifecycle and residual warm-transform reductions**, keeping development identifiers, exact output parity, dependency invalidation and the existing 6.514 ms ceiling fixed. Require an explicit Metro disposal owner and a full-transform pass before production admission.

### 2026-10-07 — M10.5 current-source compiler-session requalification

The [assessment](assessments/2026-10-07-m10-5-compiler-session-requalification.md) and [raw qualification packet](evidence/2026-10-07-m10-5-compiler-session-requalification/README.md) requalify the retained esbuild-session candidate against current source. Its fixed 105-process matrix preserves exact output/receipt hashes for 6,690 paired rows, and the owned-context idle cycles pass at 1, 30 and 120 seconds. Actual Metro nevertheless returns the prior import-removal result after the entry is restored; non-threaded shutdown also leaves four worker/service processes at the two-second gate check.

Every retained timing variant is slower than its matched fresh control: the fastest medians are 32.00/32.23/35.09 ms versus 10.64/10.65/10.79 ms for the seven-entry, hot-scan and 32-entry workloads. This is not an official host-budget comparison. The current-host warm-transform failure remains at 9.754042 ms against the unchanged 6.514 ms maximum. The candidate is rejected; no runtime, API, dependency, baseline or threshold changed, and no device test was run.

Next recommended slice: **M10.5 — make retained-context identity fail closed across changed and restored compiler inputs, then pass exact Metro source/input/metadata/result parity before another performance comparison.**

### 2026-10-07 — M10.5 fail-closed compiler-input identity and Metro restore parity

The retained compiler-session candidate now snapshots the allowed source inventory after a successful compile. A later byte change drains retained contexts and falls back to a fresh compile with `source-changed`; inventory errors also fail closed. Real esbuild regressions cover same-length source edits, import removal, exact restoration and unchanged timestamps. Stable inputs still reuse a context.

The isolated Expo/Metro edit, import-removal and restore control passes against an independent fresh compile. Entry, source, resolved-input, native-metadata and result hashes match at all four stages. Metro serves the restored entry from its earlier exact transform cache; the trace selector now identifies that cache hit by full identity instead of choosing the latest unrelated trace. The fixture was restored, Metro exited cleanly and no child process survived. This was a correctness-only control; no new performance matrix ran and no production candidate was admitted.

Focused context-reuse tests pass (93, with one Node-floor-only skip) and package typecheck passes. The full CSS suite reports 1,501 passes, one skip and one unrelated repeatable failure: the fresh-process benchmark compares different development metadata package identities between its worker and parent. Its production-mode control passes. This failure is retained as an open qualification issue rather than hidden or changed as part of the compiler-session slice. See the [assessment](assessments/2026-10-07-m10-5-fail-closed-metro-parity.md) and [source-pinned Metro evidence](evidence/2026-10-07-m10-5-fail-closed-metro-parity/README.md).

**M10.5 remains open.** Next recommended item: **M10.5 — align development metadata identity between fresh-process and in-process transforms, restore a green full package suite, then select a new warm-transform optimization from current evidence.** The rejected esbuild-context candidate remains rejected; do not repeat its performance matrix without a materially different candidate. Physical-device work remains deferred.

### 2026-10-07 — M10.5 development metadata identity parity

The [assessment](assessments/2026-10-07-m10-5-development-identity-parity.md) resolves Vanilla Extract's relative file-scope path against the explicit project root. A deterministic regression runs fresh and in-process transforms from different working directories and verifies identical package ownership and complete generated output. The fix restores the full CSS package suite: 1,502 tests pass, one exact-Node-floor test is skipped, and none fail. Package build and typecheck pass.

No public API, dependency, performance candidate, budget, baseline or threshold changed. The existing host-budget results remain in force, the retained esbuild-context candidate remains rejected, **M10.5 remains open**, and physical-device work remains deferred.

Next recommended numbered slice: **M10.5 — select and validate a distinct API-preserving warm-transform optimization against current source, exact generated-output parity and the unchanged 6.514 ms ceiling**. Do not repeat the rejected esbuild-context comparison without a materially different candidate.

### 2026-10-07 — M10.5 debug-ID intermediate-cache candidate

The [candidate assessment](assessments/2026-10-07-m10-5-debug-id-cache-candidate.md) and [retained evidence](evidence/2026-10-07-m10-5-debug-id-cache-candidate/README.md) record a five-process exact-checkout warm cohort and five matched process pairs for a scratch-only bounded cache around Vanilla Extract's Babel debug-ID intermediate transform. The live focused cohort selects 9.456 ms, 2.942 ms over the unchanged 6.514 ms maximum. Source and fixture hashes match the pinned checkout, and every scratch pair preserves its output hashes. The cache A/B improves its gate statistic from 9.141 ms to 8.355 ms, but this remains 1.841 ms over the maximum. Because the disposable package root changes the generated cache marker and the candidate's configuration invalidation is unqualified, the result is diagnostic only and the candidate is rejected.

No production source, API, dependency, baseline, threshold, or enforcement rule changed. **M10.5 remains open** for the four runtime-initialisation failures, the warm-transform failure, and four theme graph-size failures. Physical-device work remains deferred.

Next recommended numbered slice: **M10.5 — assess a non-caching compiler-adapter path that removes redundant work within one Vanilla Extract compilation.** First establish a cost model and show that a candidate could recover at least the live 2.942 ms gap to the unchanged 6.514 ms ceiling; then require exact output parity, dependency-edit correctness, and Metro restore evidence before implementation. Keep current host limits and selectors fixed.

### 2026-10-07 — M10.5 non-caching compiler-adapter feasibility

The [assessment](assessments/2026-10-07-m10-5-noncaching-adapter-feasibility.md) and [five-run evidence packet](evidence/2026-10-07-m10-5-noncaching-adapter-feasibility/README.md) find no qualifying non-caching adapter candidate. Instrumented median Vanilla Extract build costs are 6.252 ms for the README fixture and 5.633 ms for the consumer fixture; the duplicate metafile receipt callback is too small to plausibly recover the 2.942 ms focused-gate gap, while the official Vite/Vite-Node compiler retains module and CSS caches. The profiles are diagnostic scratch evidence, not a host-budget pass.

No production source, API, dependency, budget, baseline, or enforcement rule changed. **M10.5 remains open** for four runtime-initialisation failures, the warm-transform failure, and four theme graph-size failures. Physical-device work remains deferred.

Next recommended numbered slice: **M10.5 — run the final host-budget gate** against current tracked source with approved selectors and limits fixed. Record each metric as pass, fail, or incomplete; preserve physical-device acceptance as deferred.

### 2026-10-07 — M10.5 final current-source host-budget gate

The [assessment](assessments/2026-10-07-m10-5-final-host-budget-gate.md) and [retained report](evidence/2026-10-07-m10-5-final-host-budget-gate/README.md) complete all 21 approved host comparisons against current source revision `b7c2070` and content digest `23b89158a7642af4a4f7c8693cd79b2a21a34b74bdf52be967c2efd1049bfebd`. The prior report digest was stale: 12 source paths changed or were added, so this run is the current gate. Source identity and all 145 built artifact hashes were stable during collection. The exact Node 22.0.0 floor and Node 24.15.0 current-runtime cohorts, clean frozen install, full package check and budget registry validation are retained.

The result is **11 pass, nine fail and one incomplete**. Four runtime-initialisation budgets, warm transform, and four theme/core or compatibility-theme graph budgets fail unchanged limits. Incremental rebuild remains incomplete because Expo 56.0.23 / Metro 0.84.5 differs from the approved Expo 56.0.4 / Metro 0.84.4 baseline; React Native 0.85.3 matches. No API, dependency, baseline, threshold or enforcement rule changed. Physical-device work remains deferred, and **M10.5 remains unqualified**.

Next recommended numbered slice: **M10.5 — select one API-preserving remediation candidate for the runtime-initialisation and theme graph failures using the current source and graph evidence.** Preserve the full API and all budgets; do not repeat rejected cache or static-extraction candidates.

### 2026-10-07 — M10.5 current-source theme-minification candidate

The [assessment](assessments/2026-10-07-m10-5-current-theme-minification-candidate.md) and [retained reports](evidence/2026-10-07-m10-5-current-theme-minification-candidate/README.md) screen minification on current product source b7c2070. The scratch candidate changes only the theme and theme/core build minify options; it reduces the four graphs by 45–48%, but all remain about twice their unchanged approved maxima. All four 15-sample Node initialization medians improve modestly and still exceed their limits. The token graphs pass. No full candidate suite was run after the graph gate failed.

No production source, API, dependency, budget, baseline, threshold, or enforcement rule changed. The current-source full host result remains 11 pass, nine fail, and one incomplete; **M10.5 remains unqualified**. Physical-device acceptance remains deferred.

Next recommended slice: **M10.5 — review the accepted runtime-budget policy against the current exact host gate and already-retained Expo/Hermes consumer evidence. Decide whether to retain these package-host gates as binding or propose a distinct API-preserving architecture path; keep every registry value unchanged until any per-metric change is explicitly approved.**

### 2026-10-07 — M10.5 focused ThemeProvider and hook entrypoint candidate

The [assessment](assessments/2026-10-07-m10-5-theme-react-entrypoint.md) and [evidence packet](evidence/2026-10-07-m10-5-theme-react-entrypoint/README.md) screen an additive `theme/react` subpath exporting `ThemeProvider` and common theme hooks. It reduces the focused ESM/CJS graphs by 21.9%/22.6%, but the candidate remains 2.92×/2.87× the unchanged `theme/core` limits. Both existing `theme/core` and compatibility `theme` output graphs match the approved host report byte-for-byte, so their budget results are unchanged. Import-only initialization medians improve by 3.5–7.4%, with overlapping ranges; the official initialization entrypoint is unaffected.

The package/declaration build, focused consumer type-check, pack dry-run, and bidirectional cross-entrypoint React render pass. No production API, implementation, dependency, baseline, threshold, or enforcement rule changed. Full package tests and Metro/device qualification were not repeated after the graph screen failed. **M10.5 remains unqualified**, and physical-device work remains deferred.

Next recommended slice: **M10.5 — assess whether a separately typed token-only React runtime can omit recipe, component-contract, and extension-validation code without weakening existing `theme/core` semantics.** Keep the existing entrypoints and budgets binding; stop at a design/cost screen if a specialized additive API cannot plausibly meet the current graph ceiling.

### 2026-10-07 — M10.5 token-only React runtime feasibility screen

The [assessment](assessments/2026-10-07-m10-5-theme-token-only-runtime.md) and [five-build evidence packet](evidence/2026-10-07-m10-5-theme-token-only/README.md) screen a disposable `./theme/token` API that resolves flat primitive styles and direct token references. Its ESM/CJS graphs are 13,176/13,366 bytes, below the existing comparison ceilings of 17,271/17,641; all five builds are byte-identical. ESM/CJS package graph scans find one local artifact and React as the only external. The existing `theme/core` outputs remain exactly 64,549/65,408 bytes and hash-match the official host artifacts.

The candidate build, typecheck, packed declaration/export checks, cross-entry provider interoperability, and full package suite pass (1,514 passed, one Node-22-only skip, zero failed). The screen also identifies a public API blocker: `themeToken<TValue>(varName)` lets a caller assert a value type independent of the referenced contract token. Therefore the candidate is not adopted. The new-entry comparison ceilings are not approved budgets, and no startup or Expo/Hermes performance claim was measured.

No product source, export, dependency, approved budget, baseline, or enforcement rule changed. The official M10.5 host result remains 11 pass, nine fail, and one incomplete; its existing initialization, warm-transform, and theme graph failures remain open. Candidate Metro/Expo qualification was not run, and physical-device work remains deferred.

Next recommended numbered slice: **M10.5 — design and type-test contract-derived token references for the token-only runtime, then dogfood the consumer API in Expo/Storybook before adding a public package subpath.** Keep current APIs and budgets binding; require the referenced token’s contract-derived value type to fit the selected native style property without a caller-supplied type assertion.

### 2026-10-07 — M10.5 contract-derived token references and Expo/Storybook dogfood

The [assessment](assessments/2026-10-07-m10-5-theme-token-contract-derived.md) and [evidence packet](evidence/2026-10-07-m10-5-theme-token-contract-derived/README.md) replace the token-only prototype's caller-selected value generic with contract-derived token domains and React Native property compatibility checks. The type fixtures accept color, length, opacity, and finite-enum tokens where compatible, and reject seven unsafe or unsupported cases. Five candidate builds are byte-identical at 13,631 bytes ESM and 13,821 bytes CJS; each format has one local artifact and React as its only external. Existing `theme/core` hashes match the official host evidence.

Package build/typecheck/full tests pass (1,515 passed, one Node-22-only skip, none failed); Storybook typecheck and its 23 tests pass. Expo 56 web export bundles the temporary consumer component through Metro across 914 modules. This is web compilation evidence only. The candidate patch remains encoded in the evidence packet; no product source, package export, dependency, budget, baseline, or enforcement rule changed. **M10.5 remains open** at the unchanged 11-pass, nine-fail, one-incomplete official host gate. Native rendering, physical-device acceptance, and performance claims are not added.

Next recommended roadmap item: **M10.5 — review public-surface admission for the contract-derived token-only API against the unchanged host gate.** Keep every limit fixed; decide whether `theme/token` belongs as an additive opt-in subpath or remains a parked candidate. Comparison ceilings are not approved budgets.

### 2026-10-07 — M10.5 contract-derived `theme/token` public-surface review

The [admission review](assessments/2026-10-07-m10-5-theme-token-public-surface.md) recommends `theme/token` as an additive, opt-in alpha subpath. It carries domain and value types from `createTokenContract` into native style-property checks, adding a distinct type-safety capability for simple tokenized styles. The candidate ESM/CJS graphs are 13,631/13,821 bytes, but comparison ceilings are not approved budgets and no performance guarantee is admitted.

The review relies on package/type tests and internal Storybook plus Expo web-bundle dogfood; candidate-specific native rendering and Hermes results remain unverified. The existing M10.5 host gate remains 11 pass, nine fail, and one incomplete, with every selector and threshold unchanged. No package export, shipped API reference, dependency, release, or budget changed in this review. M10.5 remains open; physical-device work remains deferred.

Next recommended numbered slice: **M10.5 — implement the reviewed `theme/token` subpath** with package export/declaration wiring, provider and runtime tests, negative/positive type fixtures, and focused consumer documentation; then verify a packed Expo consumer on the available iOS Simulator and Android Emulator. Keep the current host gate fixed and graph comparisons diagnostic until a separate budget review.

### 2026-10-07 — M10.5 reviewed `theme/token` admission and packed consumer verification

The [implementation assessment](assessments/2026-10-07-m10-5-theme-token-admission-implementation.md) admits the reviewed additive `@opsydyn/crumbs-css/theme/token` API with ESM/CommonJS exports and declarations. Contract-derived type checks, runtime/provider interoperability, public API tests, and the source-map contract cover the new subpath. No existing entrypoint, dependency, package version, approved host limit, baseline, selector, or enforcement rule changed.

Build, package and app typechecks, docs build, 1,515 package tests (one exact-Node-22-only skip), and 23 Storybook tests pass. The packed Expo consumer exports validated iOS, Android, and web bundles/maps. On the already-booted iOS 26.5 `Crumbs M105 Expo Consumer` Simulator, the packed “Token styles” journey rendered and switched between light and dark token themes. Native Android execution remains unverified because this environment has no available Android SDK or `adb`; physical-device work remains deferred. The protected Simulator was not touched.

The previous 21-metric host report remains 11 pass, nine fail, and one incomplete, but its source digest predates this implementation. It is not current-source qualification. The token-entry graph sizes are diagnostic and are not approved budgets. **M10.5 remains open.**

Next recommended numbered slice: **M10.5 — set up or locate an Android SDK/emulator and complete the packed consumer's native Android token-style journey.** Then rerun the final current-source host-budget gate with all approved selectors and limits unchanged; preserve physical-device work as deferred.

### 2026-10-07 — M10.5 Android packed Expo token-style journey

The [Android evidence packet](evidence/2026-10-07-m10-5-android-packed-consumer/README.md) records a successful native light → dark → light journey for the packed `@opsydyn/crumbs-css@0.1.1-alpha.1` consumer on the dedicated Android 16/API 36 emulator. The token panel rendered with the expected accessibility identity and theme text in all three states; screenshots and UI hierarchies are retained. Maestro 2.11.0 could not discover the online ADB serial, so the focused journey used direct serial-scoped ADB checks. The app source tree matches the current worktree, and the packed `theme.cjs` entry hash matches; its identity marker predates commit `26ee91a`, and a fresh whole-package build was unavailable because of the pre-existing stale `tsdown` link. This run is therefore not represented as an exact-HEAD repack.

This is native emulator rendering evidence only. It adds no performance or host-budget result, does not qualify a standalone app or physical device, and leaves the earlier host report stale for the current source. The protected iOS Simulator was untouched, physical-device work remains deferred, and **M10.5 remains open**. No API, dependency, baseline, selector, or threshold changed.

Next recommended roadmap item: **M10.5 — rerun the final current-source host-budget gate** against the latest tracked source with all approved selectors and thresholds unchanged; record each metric as pass, fail, or incomplete. Keep physical-device acceptance deferred.

### 2026-10-07 — M10.5 final current-source host-budget gate rerun

The [assessment](assessments/2026-10-07-m10-5-final-host-budget-gate-rerun.md) and [host evidence](evidence/2026-10-07-m10-5-final-host-budget-gate-rerun/README.md) refresh the 21 approved host comparisons against commit `dbf491d12c5700f50c77d646873bece3bf341f20` after the additive `theme/token` implementation changed the source identity. The run records **11 pass, nine fail, and one incomplete**. The four runtime-initialization rows, warm transform, and four `theme/core` or compatibility-theme graph rows exceed their unchanged budgets. Incremental rebuild remains incomplete because measured Expo 56.0.23 / Metro 0.84.5 differs from the approved Expo 56.0.4 / Metro 0.84.4; React Native 0.85.3 matches.

The source digest and all 149 built artifact hashes remained stable during collection. Frozen install, repository checks, and budget-registry validation passed; the registry still has future/device-facing thresholds pending. No API, dependency, baseline, threshold, selector, or enforcement rule changed in the gate. Host results do not establish Hermes or physical-device performance, and physical-device work remains deferred. **M10.5 remains unqualified.**

Next recommended numbered slice: **M10.5 — select one API-preserving remediation candidate for the runtime-initialisation, warm-transform, and theme graph failures using current source and graph evidence.** Preserve the full API and approved budgets; avoid rejected cache or static-extraction candidates.

### 2026-10-07 — M10.5 API-preserving remediation candidate selection

The [candidate assessment](assessments/2026-10-07-m10-5-api-preserving-candidate-selection.md) screens the remaining runtime-initialisation, warm-transform, and theme-graph failures against the current source. No production candidate satisfies both the complete public API and unchanged host budgets. Minification, static-boundary extraction, a focused React entrypoint, cache work, and a non-caching compiler-adapter path either fail the relevant gate or leave its selector unchanged; the token-only surface is separately type-safe but does not reduce existing theme entrypoints.

The matched Expo/Metro comparison now passes, leaving **12 host passes and nine failures with no incomplete comparison**. No production source, public export, dependency, baseline, selector, threshold, or enforcement rule changed. **M10.5 remains open and unqualified** for the nine host failures; physical-device work remains deferred.

Next recommended numbered slice: **M10.5 — review the binding host-budget policy against the completed current-source evidence. Record whether the nine package-host limits remain release blockers or whether a separately authorised compatibility/architecture change is needed. Keep the existing budget registry and API unchanged until that decision is explicit.**

### 2026-10-07 — M10.5 host-budget policy review against current evidence

The [policy review](assessments/2026-10-07-m10-5-host-budget-policy-review.md) reaffirms the accepted [runtime-budget policy](decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md): the nine current host failures remain M10.5 qualification blockers, and the Expo/Hermes cohort remains reference evidence. The current publish workflow runs release preflight and `release:check`, but that check does not invoke the full host-budget comparison or registry-readiness command. The retained evidence therefore does not show the nine failures as automated npm publication blockers. No threshold, API, or workflow change is approved by this review.

The live budget CLIs could not be rerun in the attached worktree because `effect/Schema` does not resolve there; the latest retained host report records registry validation during collection. **M10.5 remains open and unqualified** at 12 host passes and nine failures, with physical-device work deferred.

Next recommended numbered slice: **M10.5 — make an explicit release-policy decision on whether the full host-budget report should become a prerequisite in `release:check` or remain an M10.5 qualification gate only. Define the exact selectors, environment, and enforcement behavior before changing the publish workflow; keep all metric values unchanged.**


### 2026-10-07 — M10.5 host-budget release gate

The [approved implementation plan](superpowers/plans/2026-10-07-m10-5-host-budget-release-gate.md) binds npm publication to a closed set of 21 approved host comparisons. The M4 Pro qualification job validates the current source and package artifacts, uses the locked Expo 56.0.4 / Metro 0.84.4 cohort, and stages the report with the exact tarball. An Ubuntu publisher rechecks the tag SHA and release, verifies the hashed bundle, and publishes that tarball only after qualification. Registry-wide readiness remains a separate report; deferred device thresholds do not gate this host-only policy. The qualification job has no npm token or OIDC write permission, and the token is scoped to the final publish step.

The retained current-source matched comparison has 12 passes and nine failures against unchanged limits. Those nine failures remain release blockers, so this implementation does not qualify a release or enable publication. The dedicated GitHub runner registration remains a separate end-to-end prerequisite. Android emulator acceptance is complete; physical-device work remains deferred. No API, dependency, baseline, selector, or threshold changed.

Next recommended numbered slice: **M10.5 — remediate the nine binding host-budget failures through a separately evidenced, API-preserving implementation; retain all approved limits and the release gate, and rerun the current-source matched M4 Pro measurement after each remediation batch.**

### 2026-10-07 — M10.5 host-budget release-gate implementation

The committed implementation makes all 21 approved host-budget rows a prerequisite to `release:check` and npm publication. Local verification ran on macOS 26.6.2 / Apple M4 Pro with the pinned Expo 56.0.4 / Metro 0.84.4 / React Native 0.85.3 scaffold. The measurement recorded **12 pass, nine fail and zero incomplete**; `incremental-rebuild` passed at a 130.878 ms median. The full release check completed build, typecheck, package tests, native-style benchmark and pack dry-run, then rejected exactly the nine runtime-initialisation, warm-transform and theme-graph failures. Publication remains blocked, as intended.

The scaffold overlays only the current app's direct Vanilla Extract resolver edge because the approved baseline Playground manifest omits it, and keeps the overlaid Crumbs package connected to the baseline frozen package-local dependencies. Both contexts resolve `@vanilla-extract/css` 1.20.1. The dedicated GitHub runner registration could not be verified from this host, so end-to-end Actions qualification remains unverified. Registry readiness remains separate, and physical-device work remains deferred.

Next recommended roadmap item: **M10.5 — remediate the nine binding host-budget failures through one API-preserving batch, preserving all 21 selectors and approved limits. Start with runtime initialisation and theme graph attribution, then run the matched M4 Pro gate before considering broader changes.**

### 2026-10-08 — M10.5 consolidated remediation design

The [proposed consolidated design](superpowers/specs/2026-10-08-m10-5-consolidated-host-remediation-design.md) keeps all nine host failures in one implementation batch. It combines a semantics-preserving reduction of repeated runtime validation/traversal with bounded compiled-text reuse that repeats authoring evaluation and native emission on every call. Reuse requires a separate complete-resolution admission proof; the current authored-only receipts are insufficient. Neither candidate is yet demonstrated to meet the fixed ceilings.

The latest matched retained report remains **12 pass, nine fail, zero incomplete**, measured before the amended release-gate commit; it does not qualify current HEAD. All APIs, 21 host selectors, limits and release enforcement remain unchanged. There is no production implementation in this planning checkpoint. Physical-device work remains deferred.

Next recommended roadmap item: **M10.5 — review the consolidated architecture design, then prepare one inline implementation plan and execute the complete remediation batch. Admit production changes only after all 21 host rows and behavioural checks pass; otherwise retain one evidence-only result and roll back the complete candidate.**

### 2026-10-08 — M10.5 consolidated remediation plan

The consolidated design is approved. The [implementation plan](superpowers/plans/2026-10-08-m10-5-consolidated-host-remediation.md) preserves inline execution and one final implementation commit. It fixes a conservative compiler reuse grammar, requires complete bundled-input and resolution witnesses, preserves proxy/error semantics, and screens runtime graph sizes before further compiler/native qualification. Unsupported resolver forms retain fresh compilation; no fixture-specific admission is permitted.

The plan was approved for inline execution. Its result is recorded below. The nine host failures remain unresolved and publication remains blocked. Physical-device and spoken-reader work remain deferred.

Next recommended roadmap item: **M10.5 — review the consolidated plan, then execute its complete inline remediation batch. Admit only a fully passing candidate, or retain one evidence-only rejection and restore shipping source.**

### 2026-10-08 — M10.5 consolidated runtime candidate rejected

The [approved batch assessment](assessments/2026-10-08-m10-5-consolidated-host-remediation.md) records an early rejection: shared admission/arithmetic mechanics and runtime minification retained bounded source parity, but all four theme graphs remained roughly twice the unchanged ceilings. Core ESM/CJS measured **35,074/35,287 B**, compatibility **86,568/89,286 B**. Both token graph limits passed; all five scans were identical. Built boundary checks passed after isolating incomplete peer dependencies.

The complete attempted production candidate was archived and removed. Shipping source and final artifact inventories exactly match the independently built control. Private qualification tooling and a Python-only [rejection packet](evidence/2026-10-08-m10-5-consolidated-host-remediation/README.md) are retained. Compiler memo, complete timing/Metro/host qualification and native checks were not run after graph rejection. This is no new release qualification: **M10.5 remains open, and publication remains blocked**. Physical-device and spoken-reader work stays deferred.

Next recommended roadmap item: **M10.5 — reassess runtime graph architecture against the remaining 49–51% byte reduction; establish a credible API-preserving route from module-level attribution before another complete implementation batch. Preserve all existing limits and release enforcement.**

### 2026-10-08 — M10.5 remaining runtime architecture attribution

The [attribution assessment](assessments/2026-10-08-m10-5-runtime-architecture-attribution.md) retains exact hidden-map builds of the frozen production control, minification-only control and rejected consolidation. All **60 runtime artifacts** match their references byte-for-byte; the canonical scanner checks **12 graphs**, and an independent Python decoder rederives the retained allocations. This extends the earlier unminified summary with reproducible minified source/declaration attribution.

Consolidation saved only **131–139 B in core and 425–428 B in compatibility** beyond minification. The remaining **17.6–17.8 KB / 42.6–44.5 KB** gaps span several required runtime families. Even the explicitly unrealistic zero-literal and zero-selected-component-span counterfactuals exceed all four ceilings with other output held fixed. No production route is demonstrated; no API, dependency, source, limit or enforcement changes. **M10.5 remains open and publication blocked.** Host, Metro and native qualification was not run. Physical-device and spoken-reader work remains deferred.

Next recommended roadmap item: **M10.5 — a non-shipping compact-runtime feasibility spike, using a shared typed instruction engine and ordered immutable policy tables. Require all four actual fixed graph ceilings and independent behavioural parity before proposing an architecture design or another complete production batch.**

### 2026-10-08 — M10.5 compact-runtime feasibility spike rejected

The [throwaway interpreter assessment](assessments/2026-10-08-m10-5-compact-runtime-feasibility.md) tests ordered admission programs, exact boundary message policies and arithmetic operand/evaluation programs against the unchanged frozen source. All 20 minified control runtime artifacts match the preceding attribution packet. After dead-table elimination, the prototype saves **390–400 B in core / 352 B in compatibility ESM**, but **adds 389 B in compatibility CJS**. All four actual graphs fail: **34,815 / 35,026 / 86,644 / 90,100 B** against **17,271 / 17,641 / 44,017 / 44,764 B**.

Focused checks match control on **1,454 cases each under Node and Bun**, including successful seeded expression evaluations, lazy branches and proxy traces; a deliberately wrong enumeration policy is rejected. This is not full API/type/host/Metro/native qualification, and the private interpreter's strict typecheck does not replace consumer declarations. The representative mechanics-level representation is rejected; complete high-level descriptor/recursive-resolution programs were not implemented or ruled out. Shipping source, dependencies, limits and enforcement remain unchanged. **M10.5 remains open and publication blocked.** Physical-device and spoken-reader work remains deferred.

Next recommended roadmap item: **M10.5 — one complete non-shipping high-level descriptor/recursive-resolution program prototype. Check all four unchanged graph ceilings before expanding parity qualification; require independent full behavioural parity before an architecture specification or another complete production batch. Avoid further isolated helper-interpreter slices.**

### 2026-10-08 — M10.5 complete selected-body program prototype rejected

The [complete-body feasibility assessment](assessments/2026-10-08-m10-5-descriptor-program-feasibility.md) lowers **98 complete function bodies** across contracts, extensions, component planning and theme resolution into frozen instruction data. Every original function signature is retained; no selected original body remains as a fallback. This generic source-to-program encoding grows all four actual graphs to **87,848 / 88,062 / 186,341 / 189,279 B**, against unchanged **17,271 / 17,641 / 44,017 / 44,764 B** ceilings. All 20 rebuilt control artifacts match the preceding minification-only references byte-for-byte.

A public resolver method's name, arity and constructibility differ in both ESM/CJS, independently refuting API parity. Basic import/resolution smoke receipts and limited private evaluator typechecking do not qualify public behaviour or declarations. The prototype is rejected, with complete source/output/evidence retained; no full parity, floor/host/Metro/native qualification follows from it. Shipping source, dependencies, limits and release enforcement remain unchanged. **There is no evidenced qualifying API-preserving route under the current constraints; M10.5 remains open and publication blocked.** Physical-device and spoken-reader work remains deferred.

Next recommended roadmap item: **M10.5 — review the fixed budget's admitted feature scope against today's full synchronous API and document feasible architecture constraints. Keep all current thresholds/selectors/APIs/enforcement intact during that review; present any proposed scope change as a separate decision before further remediation.**


### 2026-10-08 — M10.5 budget/API feature scope reviewed

The [scope review](assessments/2026-10-08-m10-5-budget-api-scope.md) freshly reproduces all four M4.6 admitted theme artifact hashes. Baseline/admission source and runtime build configuration are identical. Conditions, expressions, runtime Sprinkles, component slots/states/contracts and extensions were introduced afterwards; runtime namespace counts grew **10 → 22 core and 18 → 39 compatibility**, with no removed names. Generic core resolution also acquired component/extension admission without component-named exports. This presence/source review does not establish behavioural or type parity.

On the same minified basis, historical graphs are **9,138 / 9,282 / 21,775 / 22,082 B**, versus current minification-only **35,205 / 35,426 / 86,996 / 89,711 B**. The complete current API still requires another **49.4–50.9%** reduction to meet the unchanged ceilings. Current source-origin allocations explain reachability, not exact per-feature marginal/removable bytes. The [diagnostic packet](evidence/2026-10-08-m10-5-budget-api-scope/README.md) binds source histories, archives, twelve graph totals, namespace observations and prior minification attribution; offline checks reject corrupted artifacts and a rehashed incorrect gap.

No shipping source, API, dependency, threshold, selector or release policy changed. A narrowed entry cannot qualify the existing full-graph selectors, and a byte-policy decision would leave four startup and warm-transform failures independently unresolved. No new full host, Metro or native qualification was run. **M10.5 remains open and publication blocked.** Physical-device and spoken-reader work remains deferred.

Next recommended roadmap item: **M10.5 — prepare a concrete budget-scope decision proposal for the expanded API. Preserve the full API and historical evidence; specify the exact graphs/selectors, limits, regression/headroom rules, qualification environment and release enforcement for either continued original-limit remediation or separately approved versioned full-feature budgets. Keep startup and warm-transform gates binding. Require a separate explicit policy decision before any change or another complete production batch.**


### 2026-10-08 — M10.5 expanded-runtime budget policy proposed

The [written budget-scope spec](superpowers/specs/2026-10-08-m10-5-expanded-runtime-budget-scope-design.md) proposes **39,000 B core ESM/CJS, 96,000 B compatibility ESM and 99,000 B compatibility CJS** admission caps for the expanded full synchronous API. These are engineering policy proposals, not approved limits or mobile-performance guarantees. The actual qualifying candidate size would become each new baseline, with **zero post-admission growth** even below the cap. A three-clean-build/five-scans-per-build reproducibility condition and full independent API/type parity precede conditional baseline admission.

The [proposal snapshot](evidence/2026-10-08-m10-5-budget-scope-proposal/README.md) retains all four original metric contracts and all **17 unaffected host rows**. Startup and warm-transform limits stay independently binding. Proposed report/manifest policy IDs and hashes prevent replay across scope revisions; immutable historical baselines and failures remain visible. The active registry keeps the same 21 host IDs/selectors. The accepted Expo evidence ADR would receive a dated four-metric amendment only after explicit written review; no numerical mobile target is proposed.

Activation belongs to one complete runtime/compiler/policy remediation batch: all **21 host rows pass, none incomplete**, and all public/non-physical acceptance passes. No policy-only or minification-only production slice is admitted; failure restores the entire candidate, registry and gate. This drafting slice changes documentation/evidence only. **M10.5 remains open and publication blocked under the current limits.** Physical-device and spoken-reader work stays deferred.

Next recommended roadmap item: **M10.5 — review the four caps, zero-growth and conditional baseline rules in the written spec, then prepare one inline implementation plan for the complete remediation/policy batch. Spec approval permits planning, not immediate activation or implementation; the implementation plan still needs review.**


### 2026-10-08 — M10.5 budget scope approved; complete inline plan prepared

Alan P Currie approved the [expanded-runtime scope](superpowers/specs/2026-10-08-m10-5-expanded-runtime-budget-scope-design.md): four initial byte caps **39,000/39,000/96,000/99,000 B**, actual qualified baselines with zero future growth, seventeen unchanged host contracts, and conditional versioned fail-closed activation. Dated amendments preserve the governing ADR/release-gate history. The [approval packet](evidence/2026-10-08-m10-5-expanded-runtime-plan/README.md) freezes the exact proposal/spec/reference identities; it is planning evidence, not product qualification.

The [single complete inline implementation plan](superpowers/plans/2026-10-08-m10-5-expanded-runtime-remediation.md) tests name-preserving minification/shared-helper chunk layout, then the previously unimplemented compiled-text proof/memo, three-build baseline reproducibility and policy/report/manifest enforcement. It requires all 21 host comparisons plus complete software/public API qualification before one production commit. Any failed candidate is removed in full. No shipping source, registry, limit or active release gate changes in this documentation slice; current failures remain unresolved.

**Next: M10.5 — review this plan, then execute the whole batch inline.** Runtime startup and warm-transform benefit are unproven until measured. Physical-device/spoken-reader work stays deferred; dedicated hosted-runner registration remains a separate prerequisite. No push/publication.


### 2026-10-08 — M10.5 expanded-runtime candidate rejected and removed

The approved single inline batch reached its runtime gate. The [assessment](assessments/2026-10-08-m10-5-expanded-runtime-remediation.md) records matching bounded built API parity fixtures, four graph failures (41,088/41,751/102,689/106,307 B against approved initial caps 39,000/39,000/96,000/99,000 B), and three unchanged startup failures. Node 22 ESM alone passes this cohort; it is not a complete host qualification. The [retained packet](evidence/2026-10-08-m10-5-expanded-runtime-remediation/README.md) contains full candidate/control sources and artifacts, raw samples, original-comparator rederivation and exact restoration receipts.

The whole production candidate, including private authored checks, is removed. All 694 shipping files and 149 frozen control artifacts are restored. No baseline, policy, limit, dependency or release gate was admitted; original registry/enforcement remain active. The early rejection leaves compiler/memo, policy formats, deterministic baseline admission, native/export application checks and the full 21-row host suite unrun. M10.5 remains open; physical/spoken-reader work deferred and hosted-runner registration still separate.

**Next: M10.5 — assess selective public-function/method name preservation and its startup cost before another complete remediation attempt.** Carry the documented missing parity controls into that assessment. Keep current approved caps and APIs. No push/publication.

### 2026-10-08 — M10.5 consumer decision: park speculative runtime rewrites

The approved one-day diagnostic completed with 15 retained release-Hermes launches and three excluded warm-ups on the owned iOS Simulator. The [assessment](assessments/2026-10-08-m10-5-consumer-decision.md) records small positive startup deltas in this cohort (+0.465 ms core / +0.813 ms compatibility), first styling calls around 0.03 ms, and theme-change styling totals around 0.05 ms. Correct final colours, stable rerender references and balanced row lifecycles were verified. Two themed commits per theme change provide a future profiling hypothesis, not evidence of a missed frame or visible defect. Android was offline; no physical-device qualification was attempted.

**Decision: park speculative runtime rewrites and withdraw the selective name-preservation spike proposed above.** Current APIs, dependencies, shipping artifacts, budget registry and release gate remain unchanged. The small [retained packet](evidence/2026-10-08-m10-5-consumer-decision/README.md) supports an investment decision, not performance admission. M10.5 remains open with existing host failures; physical/spoken-reader work stays deferred.

**Next: M10.5 — explicitly review whether current host import budgets should remain release-blocking for this mobile library.** Any proposed change needs a consumer rationale and separate approval; this diagnostic establishes no replacement limits and authorises no policy changes. Resume optimisation only for a reproducible consumer problem with a concrete improvement mechanism.

### 2026-10-08 — M10.5 host policy reviewed; enforcement amendment proposed

The approved [policy review](assessments/2026-10-08-m10-5-host-policy-review.md) recommends retaining all 21 measurements and numerical contracts, while making ten runtime proxies advisory and keeping eleven compiler/Metro/editor comparisons blocking. This includes both passing token graph rows and failing runtime rows; classification follows scope. Complete matched evidence, exact host/source/artifact/policy identities and tarball-only publication remain required. The weaker automatic runtime protection is an explicit trade-off; no mobile target or performance pass is inferred.

The [machine-readable partition](evidence/2026-10-08-m10-5-host-policy-review/proposal.json) preserves the exact registry snapshot. Fresh synthetic controls verify the current gate still rejects each of 21 individual failures. No runtime suite, threshold, baseline, production policy or release workflow was changed. The proposed amendment is linked from the accepted ADR/index but remains unaccepted. M10.5 stays open; the known warm-transform gap, matching-runner prerequisite and deferred physical/spoken-reader acceptance remain distinct.

**Next: M10.5 — review the concrete 11-blocking/10-advisory enforcement proposal; if approved, implement it in one complete policy slice.** Keep the current all-21-pass gate active until that implementation. Approval of this review was not approval of the proposed release-policy reduction; no push/publication is authorised.

### 2026-10-08 — M10.5 consumer-scoped release policy accepted; inline plan prepared

Alan P Currie approved the exact 11-blocking/10-advisory proposal at `60499bf`. The [dated ADR amendment](decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md#2026-10-08--accepted-consumer-scoped-release-enforcement) and [approval receipt](evidence/2026-10-08-m10-5-consumer-policy-plan/approval.json) record acceptance, preserving all numerical contracts and explicit weaker runtime enforcement. It replaces the unactivated conditional byte-admission path as the selected future policy; old caps/results remain historical.

The [implementation plan](superpowers/plans/2026-10-08-m10-5-consumer-scoped-host-policy.md) is one complete inline task covering policy, comparison 3, identity bindings, manifest 2, report/publisher verification, CLI diagnostics and one fresh host result. **Next: M10.5 — review this written plan, then execute the whole policy slice inline.** Current all-21-pass enforcement remains active until implementation. Physical-device/spoken-reader work stays deferred; runner registration and any retained blocking failures remain prerequisites. No optimisation, baseline change, push or publication is included.

### 2026-10-08 — M10.5 consumer-scoped release policy implemented

The approved [single implementation slice](assessments/2026-10-08-m10-5-consumer-policy-implementation.md) activates the private 11-blocking/10-advisory policy, comparison 3, before/after bindings and manifest 2 together. All numerical contracts and five approved baseline evidence files remain unchanged. Report/publisher verification independently rejects malformed runtime records, forged roles/summaries, stale formats, baseline edits and policy drift. Ubuntu validates runtime graphs against the transferred tarball, even with absent/different checkout dist. Full build/typecheck and **1,581 package + 23 Storybook tests** pass; focused controls **70/70**. One fresh review finding was fixed; no deferred minors.

The [complete matched host report](evidence/2026-10-08-m10-5-consumer-policy-implementation/README.md) retains **10 blocking passes, one blocking failure, two advisory passes, eight advisory failures, zero incomplete rows**, with stable final source/artifacts/policy. Warm transform is the sole release-policy blocker: **10.1715 ms** median versus unchanged **6.514 ms / 15%** limits. No numerical failure is converted into a pass. The precommit report retains base `2391eec` and final source digest; it cannot qualify the later commit or release tag. An initial incomplete scaffold-copy attempt is preserved separately; the final complete run used an exact 149-artifact scaffold.

**M10.5 remains open; publication remains blocked. Next: M10.5 — one complete warm-transform remediation slice, preserve the numerical/API contracts and obtain fresh complete host evidence.** Dedicated hosted runner registration and exact release-tag qualification remain separate prerequisites. Physical-device/spoken-reader work remains deferred; no push, merge or publication is part of this slice.


### 2026-10-08 — M10.5 compiled-text proof feasibility and identity decision

The [diagnostic](assessments/2026-10-08-m10-5-warm-proof-feasibility.md) retains five-process cohorts and all 300 timed output hashes. Unverified text replay reduces the diagnostic selector from 9.420250 to 3.728541 ms. Two partial witness scans including installed compiler files raise it to 10.129084 ms; a grouped data-only variant reaches 5.800000 ms while deliberately omitting compiler-file revalidation. These compiled-CJS probes lack complete resolver/memo/Metro/evaluation-fence proof and cannot qualify a performance pass or prove all possible representations infeasible.

Shipping source, all 149 artifacts, the numerical registry and enforcement are unchanged. The previous complete host report remains authoritative: ten blocking passes and one warm failure at 10.1715 ms. No fresh complete host/native qualification or production cache was admitted.

**Next: M10.5 — review the [compiler-identity revision](superpowers/specs/2026-10-08-m10-5-compiled-text-identity-design.md), then execute one complete bounded memo/proof/Metro/host slice if its identity premise is established.** The proposed process-scoped identity must prove every omitted disk check redundant for the actual loaded compiler; otherwise retain fresh compilation. M10.5 remains open and publication blocked. Runner registration stays separate; physical-device/spoken-reader work remains deferred.


### 2026-10-08 — M10.5 compiler-identity prerequisite not established

The approved [identity investigation](assessments/2026-10-08-m10-5-compiler-identity-prerequisite.md) retains the same owned counterexample under genuine Node 22, Node 24 and Bun. An existing esbuild service can compile through the original executable after its disk image changes. After public `stop()`, namespace/function/environment/entry/executable-hash predicates remain unchanged, but fresh compilation fails. Restoration recovers source and inputs. This disproves those predicates as sufficient origin/lifetime proof; it does not prove every identity design impossible. No complete guard was established, so the approved prerequisite prevents memo integration and its conditional implementation plan.

All 696 shipping files, 149 artifacts, numerical contracts, enforcement and shared compiler files remain unchanged. Fresh verification confirms restoration and preservation of the primary checkout. No production memo, new performance result or release qualification was admitted. M10.5 remains open with the historical 10.1715 ms warm failure against 6.514 ms / 15%; publication remains blocked.

**Next: M10.5 — assess fresh-compilation cost in the fixed vanilla-extract integration before proposing an upstream remediation.** Stop investing in namespace/post-load hash shortcuts without a complete guard. Dedicated runner registration stays separate; physical-device/spoken-reader work remains deferred. No push/publication.


### 2026-10-08 — M10.5 fresh compiler profiled; upstream handoff prepared

The approved [fresh-compilation profile](assessments/2026-10-08-m10-5-fresh-compile-native-profile.md) retains five alternating control/profile Bun pairs, 120 timed transforms and 90 native timer blocks. All 60 timed output pairs, compiled text and full inputs match. Native scan prints a 4 ms cohort median; compile/link prints 0 ms at coarse resolution, with JavaScript debug-ID waits nested in scan. Instrumented CJS timings are diagnostic only. No qualifying stateless fix was identified; a single scheduling pilot was slower.

A compact stock-integration graph reproduces compiled text and all nine inputs under Bun and genuine Node 22/24. Shipping source, 149 artifacts, budgets/policy, shared compiler files and primary changes remain intact. No production optimisation or full host qualification was admitted; the historical 10.1715 ms warm failure still leaves M10.5 open and publication blocked.

**Next: M10.5 — review the [local upstream investigation draft](evidence/2026-10-08-m10-5-fresh-compile-native-profile/upstream-investigation-draft.md) before deciding whether to seek maintainer input.** It is not a posted issue or a proven upstream regression. Dedicated runner registration stays separate; physical-device/spoken-reader work remains deferred.

### 2026-10-10 — M10.5 v1 publication: complete report and explicit final decision

The v1.0.0 source/GitHub release is immutable at `382768a45f429f4c039e7584cd7c31e4f8821fc0`. The dedicated ephemeral M4 Pro qualifier now runs through fresh frozen source/baseline installation, strict package/app types, 1,829 CSS/33 Storybook tests, genuine packed iOS/web consumer checks and all 21 unchanged host measurements. The isolated baseline resolver-edge setup is repaired with real RED/GREEN proof. Each one-job runner automatically unregistered.

The [complete retained report](evidence/2026-10-10-v1-publication/run-38059803838-bundle/host-report/comparison.json) and [independent rederivation](evidence/2026-10-10-v1-publication/full-report-verification.json) establish nine blocking passes, warm/incremental failures, and no incomplete rows. Cold passes at 75.752375 ms; warm fails at 9.344542 ms; incremental 136.519166 ms exceeds its 136.34555 ms cap by 0.173616 ms. The warm-only approval does not cover this result. The fresh frozen build preserves all 105 JavaScript files but three declaration path/comment references change the tarball hash, so the previous exact artifact pin also rejects it. All original controls remain binding; npm publication was skipped and independently returns E404.

**Next: M10.5 — review the [concrete revised v1 disposition](evidence/2026-10-10-v1-publication/revised-release-decision.md): add only the complete incremental numerical exception and explicitly adopt the fresh source-built tarball, retaining all other checks and failed raw rows.** No restoration/normalization of built artifacts was admitted. The automatic review rejection and safer fresh-artifact proposal are recorded. Generic policy, limits, baselines and v1 tag remain unchanged. No repeated measurement was selected to erase failures. Physical devices/readers/release FPS remain deferred; M11.6 is parked.


## 2026-10-10 — M10.5 approved incremental publication exception

The user explicitly approved the **0.174 ms incremental overrun** in the complete retained v1 report. The [approval amendment](evidence/2026-10-10-v1-publication/incremental-approval.json) preserves the original warm-transform approval and artifact pin. The one-off publication helper admits only complete numerical warm/incremental failures, and caps incremental admission at the recorded **136.51916600000004 ms** median. Missing or larger medians, incomplete evidence, duplicate blockers, unrelated failures, changed source/tag/package/artifact identities and mismatched approval/manifest/tooling receipts remain rejected. Failed raw rows, budgets, baselines, generic release policy and the immutable v1 tag are unchanged.

**Next: M10.5 — explicitly approve the fresh source-built tarball identity in the [revised disposition](evidence/2026-10-10-v1-publication/revised-release-decision.md), then complete full bundle verification and authorised npm publication.** This incremental approval does not repin the tarball or admit artifact restoration. Physical devices/readers/release FPS remain deferred; M11.6 is parked.


## 2026-10-10 — M10.5 approved exact fresh artifact and retained report

The user separately approved the [fresh-artifact decision](evidence/2026-10-10-v1-publication/fresh-artifact-approval.json): exact tarball `0cdbdb65…`, immutable v1 source, and the complete run **38059803838** report. The one-off helper pins the report’s 20-file digest, rejecting any changed/missing report identity and the superseded artifact. All numerical, source/host/policy/integrity and future-release controls remain unchanged.

Ruling: reuse the exact approved completed report, with independent raw rederivation against a frozen source rebuild that must reproduce the approved tarball byte-for-byte. The original run’s successful functional/measurement steps are verified and functional checks run again. This implements the approved artifact/report disposition without timing resampling; it admits no artifact normalization or restoration. The cost if incorrect would be publishing against a report whose source/artifacts no longer match, which the exact inventory/hash and unchanged generic verifier must reject.

**Next: M10.5 — execute the isolated guarded publication, independently verify npm version/latest, integrity/provenance and a real installed consumer, then update current onboarding and close the authorised release scope.** Physical devices/readers/release FPS remain deferred; M11.6 is parked.


## 2026-10-10 — M10.5 v1 publication and consumer closure

[Run 38066766715](https://github.com/opsydyn/crumbs-css/actions/runs/38066766715), dispatched from `ffe58690ccb4aab37c9baf929e34e05194e0c661`, repeats the frozen source build and functional checks, reproduces approved tarball `0cdbdb65…`, and verifies the exact retained report before publication. The independent Ubuntu verifier and actual npm upload both succeed. Public registry `1.0.0`/`latest`, SHA-256/SHA-512 integrity, provenance and a fresh registry-installed Expo consumer are independently verified; current onboarding now starts with the stable install. The immutable v1 tag remains at `382768a45f429f4c039e7584cd7c31e4f8821fc0`.

**M10.5 authorised release scope is closed.** Failed raw numerical rows and future-release gates remain unchanged. Physical devices/readers/release FPS remain deferred; live authored HMR and other unperformed contexts are not inferred from exports. **Next optional roadmap item: M11.6** integrations, currently parked; no further feature work is required by the approved v1 shipping scope.


## 2026-10-10 — M10.5 packaged documentation correction

The authorised `1.0.1` documentation patch corrects stale prepublication wording in the npm README and compatibility notes. Its one-off publisher requires the verified public v1.0.0 base SHA-256 and exact product-source identity, permits only checked-in documentation and the version bump, and independently verifies the sealed tarball before upload. Every runtime JavaScript and declaration file, export, dependency and peer range must remain unchanged. This is inherited v1 code qualification, not a new performance pass or extension of the v1-only numerical exception. Normal future-release gates remain unchanged. Publication/registry acceptance is recorded in [1.0.1 release status](releases/1.0.1.md). M11.6 remains parked.

The `1.0.1` [documentation correction is published and independently verified](evidence/2026-10-10-v1-docs-patch/README.md): npm version/latest, exact tarball integrity, cryptographic provenance and npm-displayed README all pass. All 185 installed package files match the registry tarball; the retained owned Expo consumer passes strict types, iOS/Android/web exports and runtime source-map checks. Exactly 182 other files, including all 105 JavaScript and 76 declarations, remain unchanged from verified v1.0.0. **M10.5 documentation correction is closed. Next optional roadmap item: M11.6 integrations, still parked.** Physical acceptance remains deferred.

## 2026-10-10 — M1.9b Expo 57 source compatibility

PR [#7](https://github.com/opsydyn/crumbs-css/pull/7) merges SDK 57/RN0.86 admission while retaining SDK 56/RN0.85. Clean CI and both SDK packed checks pass; the 1.1.0 source tag matches the tested tree. npm remains pending the unchanged generic host-budget gate. The first release run stops before measurement at an isolated-Bun dependency-edge prerequisite; a reviewed workflow repair preserves the locked baseline versions and fixed release source. [Current release status](releases/1.1.0.md). Agent-skill authoring stays deferred until publication.

## 2026-10-10 — M1.9b fresh gate disposition pending

The repaired generic workflow completes all unchanged host measurements on a free isolated Metro port. Ten blocking rows pass, one warm-transform numerical row fails, none are incomplete. The exact measured 1.1.0 artifact also passes the SDK 57 consumer; all 105 JavaScript files match public 1.0.1. [Review the proposed v1.1.0-only release disposition](evidence/2026-10-10-m1-9b-expo57/release-review.md). No exception is applied; npm/latest remains 1.0.1. M1.9b publication stays open and the consumer agent skill stays deferred until publication is verified.

M1.9b disposition is explicitly approved for the exact retained source, report and artifact. The scoped publisher requires independent hosted verification before npm publication. Generic gates and failed measurements stay unchanged; M1.9b remains open until registry acceptance.

## 2026-10-10 — M1.9b publication complete

[The approved 1.1.0 compatibility release](releases/1.1.0.md) is public on npm and GitHub and selected as latest on both. Independent integrity, cryptographic provenance, npm README, fresh SDK 56/57 consumers and 33-page documentation build pass. The exact retained warm failure is admitted only by the user-approved 1.1.0 disposition; generic future gates are unchanged. **M1.9b is closed. Next recommended bounded slice: M1.9c consumer agent skill for the verified latest release.** Physical acceptance remains deferred; M11.6 remains parked.

## 2026-10-10 — M1.9c consumer agent skill complete

The portable [Crumbs consumer skill](../.agents/skills/crumbs-css/SKILL.md) targets published `1.1.0` and has a complete checked typed ActionCard example. The [usage guide](src/content/docs/how-to/use-agent-skill.mdx) covers copying the whole folder into an app. Baseline and forward agent exercises, exact-registry-artifact strict types/compiler/host assertions, portability/metadata validation, independent review and a 34-page docs build pass; see [qualification](evidence/2026-10-10-m1-9c-agent-skill/README.md). Current package/site guides now describe the published APIs consistently. No API, dependency, lockfile or release gate changes. **M1.9c is closed. Recommended next slice: M1.9d, a documentation-only npm patch to refresh the registry's packaged README.** That publication is not performed here. Physical acceptance remains deferred; M11.6 remains parked.


## 2026-10-10 — M1.9d approved documentation publication

The user approves the recommended 1.1.1 docs-only npm patch. [The narrow decision](evidence/2026-10-10-m1-9d-docs-patch/release-decision.md) pins verified public 1.1.0 and requires unchanged source/build configuration, JavaScript, declarations, exports, dependencies and inventory. A dedicated sealed publisher admits only exact source docs and the version field. Local preflight changes three package files and retains 182, both publisher control suites pass (22 tests), and docs build 34 pages. [Release status](releases/1.1.1.md) remains prepared until source/GitHub/npm publication and independent verification complete. M1.9d stays open; the 1.1.0 numerical failure remains visible and generic future-release gates stay unchanged.


## 2026-10-10 — M1.9d documentation release complete

[Version 1.1.1](releases/1.1.1.md) is published and independently selected as latest on npm and GitHub. The exact public tarball matches the sealed source-bound artifact, all 185 installed hashes match, all 105 JavaScript and 76 declaration files are unchanged from public 1.1.0, and the npm README matches the corrected source with consumer-skill links. Cryptographic provenance and tampering rejection, exact-source CI including SDK 56/57 platform exports, strict skill-example types and published compiler/host assertions pass. [The evidence packet](evidence/2026-10-10-m1-9d-docs-patch/README.md) retains the initial registry propagation observations and distinguishes inherited byte qualification from new native/performance acceptance. **M1.9d is closed.** M11.6 remains parked and physical/device/reader/release-FPS contexts remain deferred; no further feature slice is required for this release.

## 2026-10-11 — M1.9e released skill dogfood

The [released skill example](../.agents/skills/crumbs-css/references/design-system.md) runs unchanged against the exact public 1.1.1 artifact in an isolated Expo SDK 56 consumer. Strict types, iOS/Android/web exports and all three runtime-source checks pass. Actual iOS simulator and Android emulator taps on both cards advance the native callback counter from 0 to 1 to 2; hierarchies and screenshots are retained in [the dogfood packet](evidence/2026-10-11-m1-9e-skill-dogfood/README.md). No skill or library corrections were needed. The failed Maestro setup attempt is retained separately from the passing idb/ADB native checks; the temporary simulator was removed to reclaim storage and the owned read-only Android session was stopped. **M1.9e is closed for this consumer exercise.** SDK 57 native interaction, spoken readers, physical acceptance, live HMR and release performance are not inferred. Next: collect feedback from real consuming apps before choosing an optional **M11.6** integration; M11.6 remains parked.


## 2026-10-11 — M1.9f SDK 57 playground default

The playground now defaults to the already-qualified Expo 57.0.27 / RN 0.86.3 / React 19.2.8 profile. Shared workspace demos resolve app-owned native types and React/native/web renderer peers. Storybook retains SDK 56, with an explicit SDK 56 packed playground regression alongside SDK 57 workspace and packed CI. Locked install, library/Storybook types and tests, standalone installs with explicit strict lock validation, all three platform exports and runtime-source checks pass; SDK 57 standalone Doctor passes all 21 checks. The mixed-SDK workspace Doctor warning remains visible. Actual iOS/Android Expo Go taps verify callbacks, factory/theme state and 11 journey navigation switches; the stale iOS AX reader attempt and passing live-backend rerun are retained in [the qualification packet](evidence/2026-10-11-m1-9f-playground57/README.md). Docs build 34 pages. Owned temporary native sessions and installs are cleaned up; unrelated primary work is preserved. **M1.9f is closed for this playground upgrade.** No library publication or release-budget change; custom native development builds, physical/reader/HMR/release-performance contexts remain unqualified and M11.6 remains parked.


## 2026-10-11 — M1.9g SDK 57 Storybook qualification complete

Storybook uses Expo 57.0.27 / RN 0.86.3 / React 19.2.8 and the matched animation stack, with app-owned renderer peers/types. `app:check` and CI perform clean three-platform exports and require LiteUI, Controls and Actions in each platform's source maps, rejecting a cached showcase entry. Frozen install, types, focused checks, isolated library/Storybook suites and the 34-page docs build pass. Actual iOS and Android LiteUI Controls edit/restore, Actions callback and Light/Disabled/Dark visits pass; Android confirms its disabled button is not enabled. Doctor retains two visible development-peer/generated-native-config warnings. [The qualification packet](evidence/2026-10-11-m1-9g-storybook57/README.md) preserves failed attempts and later passing evidence.

**M1.9g is closed for this app upgrade scope.** SDK 56 library development peers, independent fixture/CI and public library APIs remain unchanged. Owned native sessions and Metro are cleaned up; user-authorised shutdown-device cache cleanup preserves simulator app data and the other active device. No library release, budget waiver, push or custom native-build acceptance is claimed. **Next: M1.9g hosted CI verification after pushing the accumulated local app/skill commits.** Physical/reader/HMR/release-performance contexts remain unqualified; M11.6 remains parked.

### 2026-10-12 — M10.5 consumer compiler slowdown reproduction

The [reproduction assessment](assessments/2026-10-12-m10-5-consumer-compiler-reproduction.md) records five fresh source-benchmark processes: warm **9.562208 ms / +68.821%** and cold **93.114542 ms / +40.223%** against the unchanged recorded baselines. Both scoped compiler budget rows fail with exact recorded environment and measurement identity. A separate retained npm **1.1.1** consumer records Node 24 warm recipe/button medians of **9.161750 / 8.806041 ms**, with matching outputs across 240 Node/Bun cold/warm samples. Diagnostic profiles corroborate fresh Vanilla Extract compilation as the largest measured boundary. [Raw evidence and reproduction](evidence/2026-10-12-m10-5-consumer-compiler-reproduction/README.md).

The known compiler slowdown reproduces; the consumer's **2.5×** ratio remains unverified without their comparator, versions and app. No product/API/dependency/baseline/budget/release-policy or publication changes; this is neither a complete host gate nor Metro/native performance qualification.

**Next recommended slice: M10.5 — obtain the consumer app and comparator, reproduce the ratio under matched dependencies and Node/Expo/Metro, then profile cold, warm and dependency-edit paths before selecting one API-preserving remediation.** Include attribution of the newly observed cold source-budget failure.

### 2026-10-16 — M1.10 Expo SDK 58 impact assessment and upgrade plan

The [assessment](assessments/2026-10-16-m1-10-expo58-assessment.md) verifies public Expo 58.0.11 / React 19.3.0 / RN 0.88.0 metadata, the Metro 0.84.5-to-0.87.1 transition and SDK 58 supervising custom-worker behavior. Current Crumbs 1.1.1 excludes RN 0.88; the runner is SDK 57-specific and its Node predicate needs a profile-specific update. Existing contract checks pass (16 tests, 89 assertions); no SDK 58 functional qualification was run. [Receipts](evidence/2026-10-16-m1-10-expo58-assessment/README.md).

The [three-slice native/inline plan](superpowers/plans/2026-10-16-m1-10-expo58-upgrade.md) preserves SDK 56/57, qualifies the packed library first (**M1.10a**), promotes both apps with native checks (**M1.10b**), then updates docs/skill and prepares release evidence (**M1.10c**). No app, dependency, compiler, peer, budget, release policy or publication changes in this planning slice. The user subsequently added Rust-transformer interoperability to **M1.10a–c**, with positive eligible-file Rust evidence required; a Rust rewrite/deeper compiler optimisation remains a separate **M10.5** decision. New variable-font authoring and optional **M11.6** integrations remain outside this batch.

**Next recommended slice: M1.10a — approve the written upgrade plan, then execute isolated SDK 58 library qualification.** Native/inline execution preference is retained. Publication remains a later, concrete decision; physical hardware/readers/release-FPS acceptance remains deferred.

### 2026-10-16 — M1.10 Rust-transformer interoperability target

The user wants compatibility with Expo's experimental Rust transformer. The [revised assessment](assessments/2026-10-16-m1-10-expo58-assessment.md) and [plan](superpowers/plans/2026-10-16-m1-10-expo58-upgrade.md) include it within **M1.10a** worker composition, **M1.10b** real-app/native checks and **M1.10c** documented capability/performance evidence. Preserve Crumbs compilation for authored `.css.ts` and route generated/ordinary JavaScript through Expo's worker. Require positive Rust-complete events for eligible app and dependency modules, explicit per-file fallback reasons, semantic/source-map parity and cache invalidation across backend switches. Flag-on or all-Babel success is insufficient. Existing custom Babel settings are eligibility risks to reproduce, not permission to bypass upstream checks.

No direct Rust binary dependency, compiler rewrite, implementation or performance claim is introduced. The default Babel path remains a regression control. Any upstream interoperability blocker must be retained and discussed before marking the Rust target complete. **Next: M1.10a — execute the revised library/default-and-Rust qualification after plan approval**, retaining the user's native/inline preference.


### 2026-10-16 — M1.10a local SDK 58 library qualification

The [exact-artifact packet](evidence/2026-10-16-m1-10a-expo58/README.md) records strict packed-consumer checks across SDK 56/57/58, actual Metro 0.87.1 and genuine Rust/default routing. Both worker modes pass eight live mutations and all-platform production exports. The candidate repairs RN88 public types and authored source locations in legacy and encoded Metro maps. Existing APIs are preserved; checked-in apps stay on SDK57.

The same candidate tarball passes all three SDKs. Rust records 875 development and 1,263 production completions, with explicit Worklets/codegen fallbacks. These counts establish backend execution, not speed. Full strict declaration checking still reports three RN88 failures reproduced without Crumbs; normal strict consumer/API checks pass. Source mapping is export-level, with file-start anchors for synthetic helpers. Independent review found and repaired parser syntax compatibility and a confounded environment-cache probe. Both backends now pass environment-only changes and restoration with unchanged source/configuration bytes. Build/types and 1,885 library plus 33 Storybook tests pass (one existing skip). Destructured-export declaration anchors remain a documented Minor.

**Next recommended slice: M1.10b — upgrade Playground and Storybook together and verify actual iOS/Android interactions in default/Rust profiles.** M1.10c docs/skill/release preparation and the unchanged M10.5 performance gate remain later work. Physical items remain deferred.


### M1.10b — SDK58 apps local qualification (2026-10-17)

Playground and Storybook now use the pinned Expo58/React19.3/RN0.88 app cohort. Babel remains the default; actual Rust execution and expected native-codegen/Worklets/legacy-Flow fallback routes pass under the opt-in profile. Both apps pass all-platform exports and real owned iOS26.5/Android16 development-client journeys under both workers. SDK56/57 installed profiles and their prior Node range remain retained. RN88 native-event and Metro optional-name compatibility repairs are covered by focused regressions.

The [source/tarball/native evidence packet](evidence/2026-10-16-m1-10b-expo58-apps/README.md) records1899 library and33Storybook passes, exact package bytes, binary identities, native interactions and the resolved independent-review finding. **M1.10b remains open for clean hosted frozen-install/three-SDK CI.** Physical/spoken-reader/iOS27/DeviceHub/release-FPS contexts stay deferred. No performance or release gate changed.

**Next: finish M1.10b hosted CI closure, then M1.10c documentation, consumer skill and release preparation.** M1.10c has not started.


### M1.10b hosted closure and M1.10c preparation (2026-10-17)

Hosted CI39013112767 passes frozen installation, library checks, all three SDK consumer lines and actual Babel/Rust app cohorts on `441bd2e`. PR #8 is explicitly approved and merged as `e333250`; M1.10b is complete. M1.10c updates current docs/portable skill, dogfoods the unchanged example on SDK 58 and captures five independent matched SDK 57/58 worker measurements. [Current release preparation](evidence/2026-10-17-m1-10c-expo58-release/README.md) distinguishes preliminary development artifact bytes from final 1.2.0 qualification. Release-please PR #9 proposes 1.2.0; npm latest remains 1.1.1. The normal host gate and required unregistered Mac runner remain prerequisites, with no inherited numerical waiver.

M1.10c full local host result: 10 blocking passes, one warm-transform failure (9.869417 ms versus 6.514 ms limit), zero incomplete; eight advisory failures remain recorded. The initial scaffold setup failed before comparison and was repaired by supplying new compiler dependencies while preserving the approved consumer baseline. Source/artifact/policy identities stay stable during the complete run. **Next action: integrate reviewed preparation, then final 1.2.0-tag qualification with the required trusted Mac runner; publication remains blocked pending remediation or a new final-artifact-specific numerical disposition.** No exception is inherited and the current development artifact is not published 1.2.0.


### M1.10c final-tag publication gate (2026-10-17)

Preparation PR #10 and release-please PR #9 are merged. The GitHub v1.2.0 source release exists at `5a13f913b17ae957172968144ec83c391caee337`; final-version CI passed with the same tree. The explicitly approved ephemeral Mac completed normal publish run39020184159 and deregistered after one job. [Final release evidence](evidence/2026-10-17-m1-10c-expo58-release/final-release/README.md) records eight blocking passes, three failures (cold 84.664042 ms, warm 12.346250 ms, incremental 136.881500 ms) and zero incomplete; eight advisory failures remain visible. The independent verifier reports only these numerical blockers. Post-job fresh SDK56/57/58 consumers pass on the exact final tarball and the released three-SDK matrix verifies. npm publication was skipped and latest remains 1.1.1. No v1.2 numerical exception has been approved.

**Next: M10.5 disposition for the M1.10c v1.2.0 release** — remediate these compiler/incremental failures or explicitly accept them for the pinned final source/report/tarball, preserving every other release check and the generic future-release budgets. M1.10c publication remains open until registry/provenance/fresh-consumer verification. Physical items remain deferred.


### M10.5 v1.2 compiler remediation investigation (2026-10-17)

The user explicitly selected **remediate before publication**, retaining all three final-tag numerical blockers and authorizing the audited evidence push (PR #11). A [bounded current-artifact diagnosis](evidence/2026-10-17-m10-5-v12-fresh-compiler-diagnosis/README.md) confirms fresh compilation remains the largest measured boundary. Five alternating control/esbuild0.28.2 diagnostic pairs retain output/input parity but record full-transform selectors11.490750/11.056750 ms, both above6.514 ms. No production upgrade or qualifying fix is admitted. Source/artifacts, public APIs and all generic budgets remain unchanged; npm publication stays blocked.

**Next proposed M10.5 step: one bounded fresh-compilation backend feasibility spike**, with complete output/input/edit parity and no Node-floor increase, before considering a production adapter. The installed Rust/Rolldown toolchain is only a possible diagnostic backend; it is not the existing Expo Rust worker and is not approved for shipping. Physical items remain deferred.


### M10.5 approved bounded Rolldown spike completed (2026-10-17)

The user approved one throwaway fresh-compilation backend comparison, retaining the6.514 ms warm target, Node22.0.0 support and all release gates. [The single prototype is rejected](evidence/2026-10-17-m10-5-rolldown-spike/README.md): complete-transform pilot medians are12.200959/10.407375 ms for the README/consumer fixtures, and full-output/cache identity does not match. The same ten on-disk inputs and native module bodies agree only after excluding the cache marker; that partial comparison is not parity acceptance. The bridge's raw receipt shape/order changes cache markers even for unchanged input and restored edits. Actual entry/dependency values update correctly, but both full restoration checks fail. All28 bundle handles were closed; released source and181 measured artifacts remain unchanged. No shipping adapter, dependency change, broader timing run, host/native qualification or numerical exception was admitted. The one-prototype stop rule is complete.

PR #11 for the earlier explicitly approved final-release evidence has green CI/docs build; it remains open. The new diagnosis/spike evidence is committed locally. **Next recommended M10.5 step: an end-to-end compiler remediation design**, addressing fresh compilation, validation/lowering and canonical cache receipts together. Backend substitution alone has not established a qualifying fix. npm publication and all three final-tag blocking metrics remain unresolved; physical items remain deferred.

### M10.5 complete fresh-pipeline design prepared (2026-10-17)

The user approved preparing a complete compiler remediation design after rejecting the single Rolldown prototype. The [proposed written spec](superpowers/specs/2026-10-17-m10-5-fresh-pipeline-remediation-design.md) retains fresh esbuild/Vanilla Extract compilation and combines canonical authoring build grouping, compilation-local validated IR ownership, shared source-map anchor analysis and deterministic private input fingerprints. It does not revive the failed compiler lifetime/memo premise or adopt a production Rust backend. Savings remain unproven. All public/Node 22.0.0/SDK contracts and the existing 11-blocking/10-advisory policy remain unchanged.

One complete candidate must pass behavioral and package-identity proofs, then the unchanged complete warm selector before expensive host/native requalification. Any blocking failure rejects the whole shipping candidate. Private marker changes require an independent derivation, not blanket output normalization. New source needs a new release identity; the existing v1.2.0 tag stays immutable. **Next M10.5 step: review the written spec, then prepare one complete inline implementation plan.** No implementation or further prototype was started in this design slice; npm publication remains blocked.

### M10.5 complete fresh-pipeline implementation plan prepared (2026-10-17)

The user approved the written design at `69152cd`. The [complete inline implementation plan](superpowers/plans/2026-10-17-m10-5-fresh-pipeline-remediation.md) covers one four-part candidate, independent control/parity tests, the unchanged five-process warm selector, complete packed/SDK/native checks and all 21 host rows with existing 11-blocking/10-advisory enforcement. One admitted production commit or fully restored rejection evidence is the outcome; task boundaries are not partial shipping slices.

The original pinned v1.2.0 control tarball is absent from its recorded temporary path. Recovery and exact hash verification are required before product edits; rebuilt bytes cannot silently replace it. This is a prerequisite identified during planning, not a newly measured performance result. **Next M10.5 step: review the complete plan, then execute inline after approval and verified control recovery.** npm publication remains blocked; numerical limits and deferred physical items are unchanged.

### M10.5 complete fresh-pipeline candidate rejected and restored (2026-10-17)

The user approved plan `af4b490`. The exact pinned v1.2.0 archive was recovered from npm's content-addressed cache, hash-verified and retained as control; a dedicated immutable-tag checkout supplied independent source runs. The four-part candidate reduced observed library input files from eight to two, passed focused/type checks and 17 recorded differential cases, but its full suite recorded **1,896 passes, 22 failures and one skip**. The canonical authoring group makes ordinary `tokens` import Vanilla Extract authoring modules, breaking real lean/packed runtime consumers. Source-seam tests also fail; every failed test is retained. This is an API/runtime isolation rejection, not a numerical performance result.

The approved whole-candidate stop rule was followed: no warm timing cohort, SDK/native replay, full host report or publication was attempted. All source changes and eight added modules/harnesses were removed after archiving; **181 original artifacts** and the original tracked tree were byte-verified. The restored library suite passes **1,907 tests, zero failures, one existing optional skip**. [The packet](evidence/2026-10-17-m10-5-fresh-pipeline-remediation/README.md) retains source/artifact archives, complete failure names, raw receipts/logs, restoration proof and an independent verifier. No partial optimization was admitted.

**Next M10.5 decision: reassess the compiler architecture while preserving the pure token/runtime boundary.** This candidate is closed; a different design needs its own decision. More timing runs of this rejected layout are unwarranted. M1.10c npm release closure remains blocked by the original three host failures; budgets, Node support, immutable v1.2.0 identity and deferred physical items remain unchanged.


### M10.5 compiler architecture reassessed (2026-10-17)

The [architecture assessment](assessments/2026-10-17-m10-5-compiler-architecture-reassessment.md) records a fresh audit of all 59 restored export targets (30 ordinary-runtime rows). Both token formats retain zero externals; four pure chunks are shared with authoring. The rejected recursive group crossed this real shared boundary. Separating token build configurations alone could also change bindings and identity contracts.

The installed library build tool exposes entry-aware grouping. **Next recommended M10.5 step: review one bounded throwaway entry-aware packaging proof**, checking actual emitted runtime reachability and canonical bindings before five unchanged complete warm-transform runs. This is a hypothesis, not an accepted architecture or measured speedup. Stop after one layout if parity/isolation or warm feasibility fails; no replay of the rejected batch or automatic retained compiler service. Production adoption still needs a written design and complete plan.

Live checks still show GitHub v1.2.0, npm latest 1.1.1 and release run 39020184159 with qualification failed/publication skipped. M1.10c remains blocked by the same three host failures. No production source/dependency, budget, tag or publication changed. Physical-device/spoken-reader work remains deferred.
