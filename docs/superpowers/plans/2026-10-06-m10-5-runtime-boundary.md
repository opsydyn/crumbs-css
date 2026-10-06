# M10.5 Runtime Boundary Candidate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Test one private static module-boundary candidate that reduces mandatory theme graph and startup cost without changing Crumbs' published contracts, and admit it only when the unchanged M10.5 evidence gates pass.

**Architecture:** Split the shared theme runtime by semantic owner while retaining `theme-runtime.ts` as the compatibility facade and retaining the current six theme build entries. The component-token handler receives the canonical generic resolver synchronously, preserving current recursive dispatch without a module cycle or new registration system. Keep this as one candidate slice, one admission/rejection decision and one commit; if a split alone is neutral, only make characterized source-level changes within these boundaries before final qualification.

**Tech Stack:** TypeScript, Bun, tsdown 0.21.10, React 19.2, Node 22.0.0 floor and the configured current Node runtime. No dependency changes.

**Spec:** `docs/superpowers/specs/2026-10-06-m10-5-runtime-boundary-design.md`

## Global Constraints

- Keep all runtime/type export names, export conditions, synchronous behavior, diagnostics, accepted serialized values and error behaviour.
- Preserve compatibility/focused canonical binding identity; test independently built `theme/core` interoperability without imposing reference equality that the package does not promise.
- Preserve current Symbol keys, weak cache ownership, validation registration and provider/hook behaviour.
- `theme/core` must keep mandatory component/extension descriptor validation and stay one emitted artifact with only React external.
- Keep ESM and CJS supported. Do not add runtime packages, environment switches, a public entrypoint, artifact version or lazy handler registry.
- Do not include unmeasured deferred work in the import-only win. Measure module import and first-use/combined cost.
- Keep the approved registry, baselines and all 21 workload definitions unchanged. Physical-device work is deferred by the user.

## Review Focus

- Unknown and malformed descriptor versions, identity registration, context-specific diagnostics and validation order.
- Nested tagged values in component slots that currently recurse through generic `resolveThemeTokens`.
- Proxy/accessor/symbol/prototype/cycle handling and the current reference/freeze/cache relationships.
- Compatibility/focused import order versus separately built core interoperation under a single React peer.
- Startup cost shifted to first use, unmeasured loader work and static graph contributors still required by the compatibility surface.

---

### Task 1: One statically separated theme runtime candidate

**Files:**
- Create: `packages/css/src/runtime/theme-resolution-cache.ts`
- Create: `packages/css/src/runtime/theme-token-resolution.ts`
- Create: `packages/css/src/runtime/theme-component-tokens.ts`
- Create: `packages/css/src/runtime/theme-style-resolution.ts`
- Create: `packages/css/src/runtime/theme-react.ts`
- Create: `packages/css/src/runtime/token-theme-scopes.ts`
- Create: `packages/css/src/runtime/theme-dependency-resolver.ts`
- Modify: `packages/css/src/theme-runtime.ts`, `packages/css/src/theme-core.ts`
- Test: `packages/css/test/runtime-isolation.test.ts`, `packages/css/test/theme-runtime-resolver-identity.test.ts`, plus a new focused package-shaped characterization test in `packages/css/test/theme-runtime-boundaries.test.ts`
- Evidence: `docs/evidence/2026-10-06-m10-5-runtime-boundary/`
- Documentation: `docs/assessments/2026-10-06-m10-5-runtime-boundary.md`, guarantees/roadmap only if current evidence changes.

**Interfaces:**
- `resolveThemeTokens<TInput>(style: TInput, theme: NativeTheme<Record<string, unknown>>): ResolvedNativeStyleInput<TInput> | undefined` remains the canonical generic synchronous function. Export it from its owning internal module and re-export the same binding from every existing entry.
- Internal `resolveComponentRecipeThemeTokens(recipe, theme, resolveTokens)` accepts the canonical resolver as an argument for nested slot recursion. It is internal, synchronous, and does not wrap or register public functions.
- `resolveThemeStyles` retains its current generic signature and delegates to `resolveThemeTokens` and the existing recipe/Sprinkles implementation.
- Cache kind names, weak ownership, global Symbol keys, validator entrypoints and public error behaviour stay as currently implemented.

- [x] **Step 1: Capture the current public and runtime contracts.** Add tests that resolve package-shaped ESM/CJS exports, declarations, canonical compatibility/focused resolver references, `theme/core` plus `theme` mixed provider/hook order, and mandatory compiler/import denial. Assert the existing graphs and externals before extraction.

Run: `bun test packages/css/test/theme-runtime-boundaries.test.ts packages/css/test/theme-runtime-resolver-identity.test.ts packages/css/test/runtime-isolation.test.ts`
Expected: pass against the current implementation. Record the current commit, source digest, exports, emitted graph receipts and current 12/8/1 host result from `docs/evidence/2026-10-05-m10-5-remediation/` in the new archive README.

- [x] **Step 2: Add failing differential descriptor/style cases.** Cover component recipe versions 1, 2 and 3; extension version 1; unsupported versions; malformed contracts; duplicate/cross-owner identities; nested tagged slot values; token ownership and missing values; ordered recipe/sprinkles resolution; arrays, marked style maps, transforms, colour and shadow offsets; unchanged-reference reuse, frozen outputs, cache repeat and previous-snapshot retention. Compare returned values, error class and existing diagnostic code/message/order where observable. Add bounded seeded property cases only for deterministic resolution, specified snapshot immutability and specified idempotence. Do not claim composition is associative or commutative.

Run: `bun test packages/css/test/theme-runtime-boundaries.test.ts`
Expected: new missing characterization cases fail for the intended assertions; current implementation passes the established control cases. Retain failing seeds and exact fixtures.

- [x] **Step 3: Extract cache and token resolution without changing algorithms.** Move cache state/access, flattening, plain style traversal and token lookup into their designated owners. Keep one canonical resolver function and call count/order. Do not simplify descriptor checks or normalize structured values differently.

Run: `bun test packages/css/test/theme-runtime-boundaries.test.ts packages/css/test/runtime-isolation.test.ts`
Expected: all plain token/style and runtime denial assertions pass; no new import cycle.

- [x] **Step 4: Extract component token handlers.** Move component and extension descriptor token resolution, slot record guards, freeze/clone helpers and discriminant handling together. Pass the original generic resolver into nested slot traversal. Keep both existing validators and global identity registration intact.

Run: `bun test packages/css/test/theme-runtime-boundaries.test.ts packages/css/test/component-recipe-extension.test.ts packages/css/test/component-contract-array-validation.test.ts packages/css/test/component-extension-validation-performance.test.ts`
Expected: supported descriptors resolve identically; malformed/future descriptors reject with recorded errors; proxies/accessors/cycles retain their existing admitted/rejected behaviour.

- [x] **Step 5: Extract style resolution, React runtime and token scopes.** Move recipes/Sprinkles/theme-map resolution as one owner; common React provider/store/selectors and hooks as one owner; token scope context/layer materialisation as a separate owner. Preserve the existing Symbol keys. `theme/core` import must not evaluate the token-scope owner; compatibility theme imports it before exposing scope APIs. Do not defer mandatory validation or cache work beyond first use.

Run: `bun test packages/css/test/theme-runtime-boundaries.test.ts packages/css/test/theme-store.test.ts packages/css/test/token-theme-contexts.property.test.ts packages/css/test/theme-runtime-resolver-identity.test.ts`
Expected: existing provider, nested scope, update, focus and binding contracts pass in both entry orders. If a named test path has moved, use the current `rg --files packages/css/test` result and retain the exact discovered command in evidence.

- [x] **Step 6: Restore the compatibility facades and verify static graphs.** `theme-runtime.ts` re-exports the exact current values and types from owners and focused entries. `theme-core.ts` re-exports its existing surface from canonical owners, with no compatibility-facade import. Leave `tsdown.config.ts`, `build-policy.ts`, package exports, declaration strategy and dependency list unchanged unless a separately evidenced build defect requires a design update.

Run: `bun run build && bun test packages/css/test/runtime-isolation.test.ts packages/css/test/theme-runtime-resolver-identity.test.ts`
Expected: ESM/CJS build succeeds; all public names/declarations remain; core emits one artifact, externalizes only React, and excludes compiler, Effect, devtools, scopes and optional resolver plans. Compatibility/focused binding equality passes. Any core interoperability difference is covered by the mixed-provider/hook tests, not reference equality.

- [x] **Step 7: Compare control and candidate artifacts and first-use cost.** Use fresh package-shaped processes, exact Node 22.0.0 and the configured current Node; pair and alternate control/candidate order with 15 retained startup samples per entry/format/runtime. Hash every entry and graph. Also measure plain token, component/extension first use, scope setup, and import-plus-first-use; preserve the official import-only workload. Keep raw samples and collection scripts.

Run: `CRUMBS_AUDIT_NODE_FLOOR=<verified Node 22.0.0 executable> bun scripts/measure-current-host-budgets.ts docs/evidence/2026-10-06-m10-5-runtime-boundary/host-budgets`
Expected: raw identities bind control and candidate to exact source/artifacts; comparison uses the unchanged 21-metric registry. A candidate fails this design's admission gate if any of the four theme graph or four startup metrics exceed their approved comparator result, warm full-transform remains outside its existing gate for overall M10.5 closure, or its paired first-use diagnostic exceeds the control median by more than the control max-minus-min spread. This diagnostic screen does not create a new budget. If module extraction is too small, make only independently characterized optimisations within this same slice; never weaken validators, move cost outside timing, or relax limits.

- [ ] **Step 8: Run complete regression and consumer qualification on the final candidate.** _Partial; candidate-specific native/Metro qualification stopped after the official host gate rejected the candidate._ Run package and Storybook suites, both workspace typechecks and production build. Run shipping watched/cache-enabled Metro, packed iOS/Android/web consumers, and the bounded native Simulator/emulator theme/style/control flows in serial evidence windows. Recollect source and runtime graph identities after all candidate edits. Do not run physical-device acceptance. Preserve spoken-reader and exhaustive-variant status accurately.

Run: `bun run test && bun run typecheck && bun run app:typecheck && bun run build`
Expected: zero failures; packed and Metro outputs match current fresh references; native scenarios exercise current candidate artifacts; each evidence window has matching independent before/after source and artifact identities. Run the archive verifier and semantic negative controls.

Candidate build, package/Storybook tests, both typechecks and packed export ran. The candidate packed output was not retained. After restoring control sources, build, full tests, both typechecks and packed iOS/Android/web export/source maps passed with retained evidence. No candidate Metro refresh or native Simulator/emulator flow ran; physical-device acceptance remains deferred.

- [x] **Step 9: Make one admission decision and commit the slice.** Pass only with unchanged APIs/semantics/identities, all reviewed graph/startup/warm gates within existing thresholds, no environment mismatch counted as a pass, and successful required current software qualification. If no compatible implementation can meet the retained ceilings, record a source-evidenced rejection and keep M10.5 open; do not claim roadmap completion, alter baselines, or drop required APIs. Update matrix, generated reference, ADR/spec disposition and roadmap to match the measured outcome. Obtain read-only review and commit this candidate/evidence disposition as one slice commit.

Run: `bun run guarantees:render && bun run guarantees:check && bun run docs:build && bun docs/evidence/2026-10-06-m10-5-runtime-boundary/verify.ts freeze && bun docs/evidence/2026-10-06-m10-5-runtime-boundary/verify.ts`
Expected: generated reference is current; docs build passes; verifier binds all archived outputs to the committed source; final status reports every pass, fail, incomparable and deferred gate. Re-check after commit that source identity is still the measured identity and unrelated files are untouched.


### Recorded outcome

The static extraction was rejected. The unchanged host protocol reports 11/21 pass, 9 fail and 1 Expo mismatch; the candidate grows all four measured theme/core graphs and fails all four startup gates. All 16 paired combined first-use cohorts (240 alternating pairs) stay within control spread. Candidate source is archived and production sources were restored. Step 8 is partial because native/Metro candidate evidence was not collected after rejection and the candidate packed artifacts were not retained. The restored-control packed export/source-map check passed. The guarantees matrix preserves historical evidence but marks 15 measurements stale because their content digest predates the current source; the generated reference and docs build pass. See the [assessment](../../assessments/2026-10-06-m10-5-runtime-boundary.md) and [evidence](../../evidence/2026-10-06-m10-5-runtime-boundary/README.md).
