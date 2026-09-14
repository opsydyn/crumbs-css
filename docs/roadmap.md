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

## Delivery map

| Milestone | Outcome | Depends on | Status |
| --- | --- | --- | --- |
| M0 | Repair native semantics and isolate runtime imports | ADR review | In progress; token property validation/order slice |
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
- [ ] M0.3: Stop classifying structured styles as variant maps. Preserve transform arrays and scalar siblings through resolution. Preserve primitive-specific result types.
- [ ] M0.4: Define the structured-value compatibility boundary. Preserve supported `transform` and `shadowOffset` inputs end to end using explicit metadata/native handling. If a typed property family cannot yet be preserved, narrow its accepted subset and emit a specific diagnostic with migration guidance; never leave accepted-but-dropped behavior.
- [ ] M0.5: Apply identical property checks to token and literal declarations, retain declaration order, validate token reference shape, and preserve ordinary non-style exports or reject them explicitly under a documented export contract.
- [ ] M0.6: Prevent cross-contract registry corruption. Introduce a documented ownership/identity rule that can migrate to M3; fail on ambiguous legacy collisions rather than silently rebinding a token.
- [ ] M0.7: Move runtime tags/data helpers away from authoring/compiler modules and correct build chunking. Check ESM, CommonJS, and a packed Metro consumer. Runtime loading must not reach Node built-ins, esbuild, integration, or CSS conversion code.
- [ ] M0.8: Replace stale `apps/native` test/benchmark dependencies with durable current fixtures. Required fixture absence must fail; optional capability absence must be explicitly reported. Update compatibility documentation to match actual coverage.
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
