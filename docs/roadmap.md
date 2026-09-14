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
| M0 | Repair native semantics and isolate runtime imports | ADR review | In progress; token validation/order, consumer setup, iOS scroll and native composition slices |
| M1 | Select Effect 4 boundary implementation and establish budgets | M0 | Not started |
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

- [ ] M0.1: Add durable regressions for assessment E1–E7. Each regression fails for the demonstrated behavior before its fix; validate errors and output values, not only generated-code substrings.
- [ ] M0.2: Repair native composition typing and conflict order. Cover multiple bases, nested compositions, token/literal conflicts, and shorthand/longhand precedence. Use a separately implemented reference evaluator.
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

- [ ] M1.1: Select one exact published Effect 4 version, verify its Schema/Codec/Optic APIs, and record it with import paths and package metadata. Add it as an internal dependency; do not leak Effect execution requirements through public authoring/hooks.
- [ ] M1.2: Define initial schemas for tagged native declarations/references, contract identity, structured diagnostics, and an explicit artifact version. Specify unknown-field and finite-number handling. Add encode/decode tests at these boundaries.
- [ ] M1.3: Audit the dependency graph and initialization footprint for compiler, ordinary runtime, and external-theme decoding entrypoints separately. Test both module formats using the exact installed Effect version.
- [ ] M1.4: Correct benchmark labels: batch-average quantiles are not operation-latency quantiles. Make raw and recipe baselines perform equivalent selection/default/compound work. Separate cold transforms from warm transforms and cached/uncached runtime paths.
- [ ] M1.5: Add baseline workloads for static/themed list mount and scroll, repeated recipe selections, theme and scope changes, orientation/font-scale changes, and retained memory after repeated mount/unmount.
- [ ] M1.6: Establish a release-mode Hermes measurement run on at least one Android and one iOS device. Record device/OS, Expo/RN/Hermes versions, build mode, thermal conditions, scenario size, warmup, sample count, and artifact identity. Missing device access leaves this gate incomplete.
- [ ] M1.7: Add editor/typechecker fixtures at 100, 1,000, and 10,000 tokens, including slot recipes and conditions. Record checking time, type-instantiation/memory statistics where supported, and completion latency on a reproducible editor/TypeScript setup.
- [ ] M1.8: Commit a machine-readable budget file and measurement protocol before optimization work. Include absolute ceilings and baseline comparisons for JS/UI frames, allocations, retained memory, runtime bytes/initialization, cold/warm transform cost, incremental rebuild, and editor cost. Choose thresholds from the measured baseline and noise; reviewers approve the recorded values, not an invented universal timing target.
- [ ] M1.9: Extend the Expo playground with version/source identification and repeatable measurement scenarios. Install SDK-compatible dependencies with a committed lockfile; test the newest SDK in a separate upgrade configuration before broadening support. Published mode resolves npm tags to exact versions, while packed mode qualifies unreleased artifacts without publishing.

**Exit:** Effect 4 boundaries are verified and isolated; budget metrics all name a scenario and execution environment; at least five independent repetitions per device scenario establish a noise envelope; remaining device/editor blockers are reported as incomplete. No performance claim may be based only on the historical Bun numbers.

## M2 — Introduce the native IR and compiler artifact contract

**Decisions:** D1–D3, D8, D11.\
**Affected paths:** new `packages/css/src/compiler/` and artifact contract modules; `native-style.ts`, `transformer.ts`, `css-to-rn.ts`, `parse-virtual-css.ts`, new `test/compiler/` and `test/oracles/` fixtures.

- [ ] M2.1: Specify tagged IR nodes and semantic equality for native declarations, ordered composition, style maps, recipes, token references, and export metadata. Define primitive kind and source/property provenance.
- [ ] M2.2: Introduce native capture before CSS serialization. Migrate one exact property family per reviewable slice, with independent differential tests against reference native evaluation. Preserve the qualified legacy subset throughout.
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
