# M9.3 Development Style Explanations Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add an opt-in, versioned developer API that explains compiled Crumbs style resolution while keeping detailed provenance out of production artifacts by default.

**Architecture:** Emit a separate development metadata sidecar from existing compiler provenance, then provide an on-demand devtools API that combines that sidecar with current resolver plans and explicit current/previous inputs. Keep ordinary authoring and theme entrypoints unchanged; qualify the separate package subpath and its production isolation.

**Tech Stack:** TypeScript, Bun, Effect 4 Schema, fast-check, Metro transformer, tsdown, React Native, packed Expo consumer qualification.

**Spec:** docs/superpowers/specs/2026-09-27-m9-3-style-explanations-design.md

## Global Constraints

- Provide a headless, structured explanation API on the dedicated @opsydyn/crumbs-css/devtools package subpath. Do not add it to ordinary authoring, theme, or root entrypoints.
- Emit detailed compiler provenance in a separate versioned __crumbsDev module sidecar. Emit it by default for development transforms, allow it to be disabled there, and keep it out of production artifacts unless includeStyleExplanations: true is explicitly supplied.
- Use the internal Effect 4 Schema boundary for the versioned report. The returned API remains ordinary typed data; consumers do not need Effect APIs.
- Explain an explicit module export path and explicit current/previous inputs. Do not infer device readings, source usage outside the supplied module, or React render behavior.
- Preserve current resolver, composition, condition, and dependency semantics. Explanation collection is opt-in and does not run during ordinary rendering.
- Android and device acceptance remain parked.
- Keep each implementation task independently tested and committed. After each commit, report evidence and recommend the next M9.3 task.
- Preserve the primary checkout's unrelated release edits. Implement only in the current M9.3 worktree; do not publish.

## Review Focus

- Same-property declarations across composed classes, including alias expansion, must preserve author order and show the actual final winner; pin in Task 2 and Task 3.
- A module without a sidecar must return unavailable coverage, while an invalid export path or malformed sidecar must fail with a stable input error; pin in Task 3.
- Accessors, cycles, functions, symbols, and non-finite values must never be invoked or traversed unsafely; undefined and negative zero retain explicit tags, while opaque values produce stable partial coverage; pin in Tasks 1 and 3.
- Equal-specificity native conditions, rejected component states, and explicit component extension order must match the existing resolvers; pin in Task 4.
- Unrelated token changes, contract changes, and changed selection/condition inputs must have distinct plan-derived transition evidence; pin in Tasks 3 and 4.

## File Map

| Path | Responsibility |
| --- | --- |
| packages/css/src/devtools/style-explanation-model.ts | Version-1 metadata, snapshot, JSON-safe value, report, transition, and coverage types. |
| packages/css/src/devtools/style-explanation-schema.ts | Effect 4 Schema decoders for metadata and reports; fail-closed tags, versions, and recursive values. |
| packages/css/src/compiler/style-explanation-metadata.ts | Capture package-relative export, branch, token, and declaration provenance into the separate metadata descriptor. |
| packages/css/src/compiler/code-emission.ts | Emit the optional reserved __crumbsDev export without changing production __crumbsModule version 2. |
| packages/css/src/compiler/export-ownership.ts | Reserve the generated __crumbsDev name for compiler output. |
| packages/css/src/transformer.ts | Derive the includeStyleExplanations default from Metro dev, pass explicit overrides, and include the setting in transform cache identity. |
| packages/css/src/devtools/explain-style.ts | Resolve an explicit module export and build an immutable report using existing resolution and dependency plans. |
| packages/css/src/devtools/index.ts | Export explainStyle and ordinary TypeScript report/input types for the dedicated subpath. |
| packages/css/src/conditions/index.ts and packages/css/src/expressions/index.ts | Share condition and expression match decisions with the explanation path without changing selection semantics. |
| packages/css/tsdown.config.ts and packages/css/package.json | Build and publish a separate ESM/CommonJS/declaration devtools subpath. |
| packages/css/test/style-explanation-*.test.ts | Schema, compiler, runtime, property, condition, transition, and packed-consumer evidence. |
| scripts/packed-runtime-graph.ts and packages/css/test/packed-runtime-graph.test.ts | Classify the devtools subpath and prove ordinary packed graphs cannot reach its Effect-backed advanced-runtime graph. |
| packages/css/fixtures/m9-3-style-explanations.css.ts | Authored fixture for winning/overridden declarations, aliases, and theme dependencies. |
| packages/css/bench/style-explanations.bench.ts | Diagnostic comparison of explicit explanation work with ordinary resolution. |
| scripts/m9-3-style-explanations-qualification.ts | Produce deterministic report and qualification receipt from checked-in fixtures. |
| docs/evidence/2026-09-27-m9-3-style-explanations/ | Canonical explanation report and qualification receipt without absolute paths. |
| docs/assessments/2026-09-27-m9-3-style-explanations.md | Observed M9.3 evidence, limits, and unrun platform claims. |
| packages/css/README.md and docs/src/content/docs/how-to/explain-native-styles.mdx | API usage, metadata opt-in, report semantics, and analysis boundaries. |
| docs/roadmap.md | Mark M9.3 complete only after its tests, package qualification, documentation, and evidence pass. |

---

### Task 1: Define the versioned metadata and report contracts

**Files:**
- Create: packages/css/src/devtools/style-explanation-model.ts
- Create: packages/css/src/devtools/style-explanation-schema.ts
- Test: packages/css/test/style-explanation-schema.test.ts
- Test: packages/css/test/style-explanation-schema.property.test.ts

**Interfaces:**
- Metadata tag/version: crumbs.css.style-explanation-metadata / 1.
- Report tag/version: crumbs.css.style-explanation / 1.
- Produces StyleExplanationPathSegment = string | number and StyleExplanationPath = ReadonlyArray<StyleExplanationPathSegment>.
- Produces StyleExplanationMetadata = { $$type, version, moduleId, exports }; each export entry has path, declaration candidates, branch descriptors, token dependencies, and coverage.
- Produces StyleExplanationDeclaration = { id, sourceId, packageOwner, logicalPath, authoredProperty, canonicalProperty, shorthandExpansionPath, primitiveDomain, order, value }.
- Produces StyleExplanationBranchMetadata = { kind, path, identity, order, selector: Readonly<Record<string, StyleExplanationValue>>, sourceId? }, where kind is recipe, component-recipe, extension, sprinkles, condition, or expression.
- Produces a tagged StyleExplanationValue union for JSON-safe primitives/arrays/records, theme-token nodes with resolved values, negative-zero and undefined nodes, and opaque-value nodes with stable reasons.
- Produces StyleExplanationBranchDecision = { kind, path: StyleExplanationPath, identity, order, matched, selected, reason? }.
- Produces StyleExplanationConditionDecision = { path: StyleExplanationPath, identity, matcher: NativeConditionMatcher, matchedAxes: ReadonlyArray<keyof NativeConditionSnapshot>, specificity, declarationOrder, matched, selected } and StyleExplanationExpressionDecision = { path: StyleExplanationPath, condition: NativeConditionKey, value: string, selectedBranch: "case"|"fallback", selectedCaseValue?: string }.
- Produces StyleExplanationCoverageReason = "metadata-missing"|"compatibility-only"|"opaque-value"|"dependency-metadata-missing" and StyleExplanationCoverage = { status: "complete"|"partial"|"unavailable", reasons: ReadonlyArray<StyleExplanationCoverageReason> }.
- Produces StyleExplanationPropertyExplanation = { property: string, value: StyleExplanationValue, winner?: StyleExplanationDeclaration, overridden: ReadonlyArray<StyleExplanationDeclaration>, coverage: StyleExplanationCoverage }.
- Produces StyleExplanationChangedInput = { kind: "theme-token"|"theme-contract"|"selection"|"condition"|"extension", path: StyleExplanationPath, previous?: StyleExplanationValue, current?: StyleExplanationValue }.
- Produces StyleExplanationReport = { $$type, version, target: { moduleId?, exportPath: StyleExplanationPath }, resolution: { value: StyleExplanationValue, branches: ReadonlyArray<StyleExplanationBranchDecision> }, conditions: { snapshot?: NativeConditionSnapshot, decisions: ReadonlyArray<StyleExplanationConditionDecision>, expressionMatches: ReadonlyArray<StyleExplanationExpressionDecision> }, composition: { properties: ReadonlyArray<StyleExplanationPropertyExplanation> }, dependencies: { declaredTokens: ReadonlyArray<string>, activeTokens: ReadonlyArray<string>, changedTokens: ReadonlyArray<string> }, transition: { status, changedInputs: ReadonlyArray<StyleExplanationChangedInput>, affectedPaths: ReadonlyArray<StyleExplanationPath> }, coverage: StyleExplanationCoverage }.
- Transition statuses are "not-compared"|"relevant-input-change"|"no-effective-change"|"unavailable". Changed-input paths use StyleExplanationPathSegment arrays.
- Produces decodeStyleExplanationMetadata(input: unknown): StyleExplanationMetadata and decodeStyleExplanationReport(input: unknown): StyleExplanationReport.

- [ ] Step 1: Write failing schema and fast-check tests for valid metadata/report v1 values, exact tags/versions, every coverage/transition status, nested branch/declaration data, special value nodes, recursive JSON-safe values, and object-key permutations. Assert tagged negative zero and undefined preserve identity.
- [ ] Step 2: Run bun test packages/css/test/style-explanation-schema.test.ts packages/css/test/style-explanation-schema.property.test.ts. Expected: FAIL because the models and decoders do not exist.
- [ ] Step 3: Implement the recursive plain-data model and Effect 4 Schema decoders. Reject unsupported tags/versions, malformed paths, invalid reason codes, non-finite numbers, and unexpected fields.
- [ ] Step 4: Rerun both schema test files. Expected: valid generated report values round-trip and malformed shapes fail closed.
- [ ] Step 5: Run git diff --check. Stage the four Task 1 files and commit as feat: define style explanation report contracts.

### Task 2: Capture provenance and emit the development sidecar

**Files:**
- Create: packages/css/src/compiler/style-explanation-metadata.ts
- Create: packages/css/fixtures/m9-3-style-explanations.css.ts
- Create: packages/css/test/style-explanation-metadata.test.ts
- Modify: packages/css/src/compiler/code-emission.ts
- Modify: packages/css/src/compiler/export-ownership.ts
- Modify: packages/css/src/transformer.ts
- Modify: packages/css/test/m2-6-native-module-emission.test.ts
- Modify: packages/css/test/transformer.test.ts

**Interfaces:**
- Produces createNativeStyleExplanationMetadata(input: { moduleId: string; exportMap: ReadonlyMap<string, unknown>; classStyles: ReadonlyMap<string, Record<string, unknown>>; classCandidates: ReadonlyMap<string, ReadonlyArray<StyleExplanationDeclaration>>; dependencyPlan: ThemeDependencyPlan }): StyleExplanationMetadata.
- Produces emitNativeStyleExplanationMetadata(metadata: StyleExplanationMetadata): string.
- BuildStyleSheetCodeOptions accepts includeStyleExplanations?: boolean and styleExplanationMetadata?: StyleExplanationMetadata.
- TransformCssTsOptions accepts includeStyleExplanations?: boolean. If omitted, the transformer uses its resolved dev flag; explicit false disables the sidecar and explicit true enables it.
- The generated __crumbsDev export is reserved and versioned. The existing __crumbsModule descriptor stays version 2.

- [ ] Step 1: Write failing compiler tests for a composed base/override fixture. Assert source-ordered winner and overridden opacity candidates, package-relative source IDs, authored alias/canonical-property provenance, active token dependencies, and no absolute paths.
- [ ] Step 2: Write failing emission tests proving explicit metadata creates a frozen __crumbsDev export, ordinary emission creates none, and authored __crumbsDev is rejected.
- [ ] Step 3: Run bun test packages/css/test/style-explanation-metadata.test.ts packages/css/test/m2-6-native-module-emission.test.ts. Expected: FAIL because sidecar capture and emission do not exist.
- [ ] Step 4: Implement metadata capture from raw scalar/structured IR candidates before composite class merging removes losing properties. Mark compatibility-only declarations partial instead of fabricating provenance.
- [ ] Step 5: Implement deterministic export/class traversal, preserve authored order for candidates, and reuse the existing dependency plan for token edges.
- [ ] Step 6: Add includeStyleExplanations to TransformCssTsOptions and Metro config.nativeStyles. Resolve an explicit nativeStyles value before defaulting to Metro options.dev; direct transform calls use options.dev or NODE_ENV. Honor explicit true/false, include the effective value in transform cache identity, and pass metadata to code emission only when enabled.
- [ ] Step 7: Run bun test packages/css/test/style-explanation-metadata.test.ts packages/css/test/m2-6-native-module-emission.test.ts packages/css/test/transformer.test.ts. Expected: development default emits metadata, development false omits it, production default omits it, and production true emits it without changing __crumbsModule v2.
- [ ] Step 8: Run git diff --check. Stage the eight Task 2 files listed above and commit as feat: emit development style provenance.

### Task 3: Explain flat styles, values, and theme transitions

**Files:**
- Create: packages/css/src/devtools/explain-style.ts
- Create: packages/css/test/style-explanation-runtime.test.ts
- Create: packages/css/test/style-explanation-runtime.property.test.ts
- Modify: packages/css/src/devtools/style-explanation-model.ts
- Modify: packages/css/src/devtools/style-explanation-schema.ts

**Interfaces:**
- Produces StyleExplanationSnapshot = { theme?: NativeTheme<Record<string, unknown>>; selection?: Readonly<Record<string, unknown>>; conditions?: NativeConditionSnapshot; extensions?: ReadonlyArray<NativeComponentRecipeExtensionDescriptor> }.
- Produces ExplainStyleInput = { module: Readonly<Record<string, unknown>>; exportPath: ReadonlyArray<StyleExplanationPathSegment>; current: StyleExplanationSnapshot; previous?: StyleExplanationSnapshot }.
- Produces explainStyle(input: ExplainStyleInput): StyleExplanationReport.
- Produces StyleExplanationInputError extends TypeError with code CRUMBS_EXPLANATION_INVALID_METADATA or CRUMBS_EXPLANATION_EXPORT_PATH_INVALID.
- A missing __crumbsDev sidecar returns unavailable coverage with reason metadata-missing. Malformed/unsupported metadata and a missing exportPath throw StyleExplanationInputError with their stable codes.
- If there is no previous snapshot, transition status is not-compared. The function does not claim an observed cache hit or React render.

- [ ] Step 1: Write failing runtime and fast-check tests for nested export paths, flat style values, token references, last-winner composition, aliases, source origins, relevant/unrelated token changes, contract changes, not-compared status, missing dependency metadata, unavailable sidecar coverage, invalid paths/metadata, and accessors/cycles that must not be invoked.
- [ ] Step 2: Run bun test packages/css/test/style-explanation-runtime.test.ts packages/css/test/style-explanation-runtime.property.test.ts. Expected: FAIL because explainStyle is not implemented.
- [ ] Step 3: Implement safe module/path admission, metadata/report decoding, and flat-style explanation using existing resolveThemeTokens behavior. Encode negative zero and undefined as the tagged nodes defined in Task 1; do not invoke accessors or traverse cycles.
- [ ] Step 4: Implement current/previous theme comparison. Report relevant tokens and affected paths from createThemeDependencyResolver; report unrelated token and contract changes distinctly; do not infer cache hits or React renders.
- [ ] Step 5: Complete the generated ordered-write properties and assert each winner, overridden sequence, and resolved value matches an independent last-winner evaluator.
- [ ] Step 6: Run bun test packages/css/test/style-explanation-runtime.test.ts packages/css/test/style-explanation-runtime.property.test.ts packages/css/test/theme-dependency-plan.test.ts packages/css/test/theme-runtime.property.test.ts. Expected: explanation and existing resolver outputs agree, and unrelated token changes claim no affected paths.
- [ ] Step 7: Run git diff --check. Stage the five Task 3 files listed above and commit as feat: explain resolved style values and token impacts.

### Task 4: Explain recipes, conditions, Sprinkles, and extensions

**Files:**
- Create: packages/css/test/style-explanation-branches.test.ts
- Create: packages/css/test/style-explanation-branches.property.test.ts
- Modify: packages/css/src/devtools/explain-style.ts
- Modify: packages/css/src/conditions/index.ts
- Modify: packages/css/src/expressions/index.ts
- Reuse: packages/css/src/runtime/recipe-resolution-plan.ts
- Reuse: packages/css/src/runtime/component-recipe-resolution-plan.ts
- Reuse: packages/css/src/runtime/sprinkles-resolution-plan.ts

**Interfaces:**
- The explanation engine consumes current selection, conditions, and ordered component extension descriptors from StyleExplanationSnapshot.
- Branch decisions report kind, path, identity, order, matched/selected state, and rejection reason where applicable.
- Condition decisions report the explicit snapshot, matcher, matched axes, specificity, declaration order, and winning candidate.
- Add an internal trace helper that shares branch matching with createNativeConditionResolver; ordinary resolver calls do not allocate explanation records.
- Expression match evidence records the evaluated condition value and selected case/default while preserving evaluateNativeExpression output.

- [ ] Step 1: Write failing branch and property tests for recipe defaults/overrides, compound order, component slot base/variant/compound/state resolution, explicit extension-chain order, Sprinkles shorthand order, and selection-change transition evidence.
- [ ] Step 2: Write failing condition tests for no match, multiple matches, greatest specificity, equal-specificity later-wins, condition-change transition evidence, expression match case, and expression fallback.
- [ ] Step 3: Run bun test packages/css/test/style-explanation-branches.test.ts packages/css/test/style-explanation-branches.property.test.ts. Expected: FAIL because branch traces do not exist.
- [ ] Step 4: Implement trace collection by reusing recipe, component-recipe, extension, and Sprinkles resolution plans. Compare each report result with resolveRecipeStyle, resolveComponentRecipeStyles, and createSprinklesResolver for the same explicit inputs. The ordered extension descriptors are supplied in each snapshot because the existing component resolver requires them explicitly.
- [ ] Step 5: Factor finite condition candidate matching into a shared internal helper used by both createNativeConditionResolver and the explanation path. Keep ordinary resolver output and ordering unchanged; expose winner evidence only to the devtools engine.
- [ ] Step 6: Add expression match tracing through the existing expression evaluator so selected cases and condition values cannot drift from evaluateNativeExpression.
- [ ] Step 7: Run bun test packages/css/test/style-explanation-branches.test.ts packages/css/test/style-explanation-branches.property.test.ts packages/css/test/conditions.test.ts packages/css/test/condition-values.test.ts packages/css/test/expressions.test.ts packages/css/test/expressions-evaluation.test.ts packages/css/test/component-recipe-runtime.property.test.ts packages/css/test/sprinkles-contract.test.ts. Expected: all explanation decisions agree with existing runtime outputs, including rejected state and extension order.
- [ ] Step 8: Run git diff --check. Stage the five Task 4 files listed above and commit as feat: explain conditional and recipe style resolution.

### Task 5: Publish and qualify the isolated devtools subpath

**Files:**
- Create: packages/css/src/devtools/index.ts
- Create: packages/css/test/style-explanation-export.test.ts
- Create: packages/css/bench/style-explanations.bench.ts
- Modify: packages/css/tsdown.config.ts
- Modify: packages/css/package.json
- Modify: packages/css/test/packed-export-contract.test.ts
- Modify: packages/css/test/pack-consumer-contract.test.ts
- Modify: packages/css/test/runtime-isolation.test.ts
- Modify: scripts/packed-runtime-graph.ts
- Modify: packages/css/test/packed-runtime-graph.test.ts

**Interfaces:**
- The devtools subpath exports explainStyle and the typed input, snapshot, metadata, report, value, branch, coverage, and transition types.
- Build the devtools entry as a separate ESM/CommonJS/declaration graph using runtimeDependencies, not compilerDependencies.
- Package export ./devtools resolves to matching dist/devtools ESM, CommonJS, and declaration targets.
- Ordinary root, style, theme, tokens, and tooling/manifest package graphs do not include devtools implementation or its Effect Schema graph.

- [ ] Step 1: Add a packed consumer test importing explainStyle and StyleExplanationReport from the package artifact in ESM, CommonJS, and a TypeScript fixture. Assert the report tag/version and a resolved token value.
- [ ] Step 2: Extend runtime-isolation tests to assert ordinary entries do not import devtools modules or Effect; allow only the devtools graph's declared runtime dependencies and deny Node/compiler/vanilla-extract imports there. Classify ./devtools as advanced-runtime in the packed graph audit and assert ordinary entries cannot reach it.
- [ ] Step 3: Run bun test packages/css/test/style-explanation-export.test.ts packages/css/test/packed-export-contract.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts packages/css/test/packed-runtime-graph.test.ts. Expected: FAIL because the devtools package target is not built/exported.
- [ ] Step 4: Add a separate runtime build and declaration entry in tsdown.config.ts using runtimeDependencies, map ./devtools in package.json, and re-export only the approved API/types.
- [ ] Step 5: Run bun run build and the focused packed tests. Expected: ESM, CommonJS, declarations, packed path resolution, and ordinary runtime isolation pass.
- [ ] Step 6: Add and run packages/css/bench/style-explanations.bench.ts; record explicit explanation cost next to ordinary resolution as diagnostic measurements without introducing a device or production performance threshold.
- [ ] Step 7: Run git diff --check. Stage the ten Task 5 files listed above and commit as feat: package the style explanation devtools API.

### Task 6: Document, qualify, close, and merge M9.3 locally

**Files:**
- Create: scripts/m9-3-style-explanations-qualification.ts
- Create: docs/evidence/2026-09-27-m9-3-style-explanations/qualification.json
- Create: docs/evidence/2026-09-27-m9-3-style-explanations/style-explanation-report-v1.json
- Create: docs/assessments/2026-09-27-m9-3-style-explanations.md
- Create: docs/src/content/docs/how-to/explain-native-styles.mdx
- Modify: packages/css/README.md
- Modify: docs/roadmap.md
- Reuse: packages/css/fixtures/m9-3-style-explanations.css.ts

**Interfaces:**
- Qualification script builds the fixture report from explicit inputs and records report/fixture SHA-256 values and coverage reasons without absolute paths or timestamps. The checked-in receipt records the final verification commands and results.
- Assessment distinguishes qualified compiler/runtime/package behavior from inferred transitions, unsupported provenance, and unrun device acceptance.
- Roadmap marks M9.3 complete and recommends M9.4 only if every listed gate passes. Android remains not-run and parked.

- [ ] Step 1: Add failing qualification tests for deterministic fixture output, hashes, report tag/version, winner/overridden values, dependency paths, source-relative identities, and absence of absolute paths, timestamps, and device claims.
- [ ] Step 2: Implement the local qualification script and check in its canonical report and receipt under docs/evidence/2026-09-27-m9-3-style-explanations/.
- [ ] Step 3: Document explainStyle usage, includeStyleExplanations development/production defaults, component extension input, special-value encoding, coverage limits, and plan-derived transition semantics in README and the docs guide.
- [ ] Step 4: Create the M9.3 assessment and update docs/roadmap.md only after fixture, test, packed export, and runtime graph evidence passes. State Android as not-run and no device acceptance.
- [ ] Step 5: Run bun run check. Expected: package build, TypeScript, all CSS tests, and Storybook tests pass.
- [ ] Step 6: Run bun run docs:build, bun scripts/m9-3-style-explanations-qualification.ts, and bun run playground:distribution --m8-3-check. Expected: documentation and deterministic report pass, packed production iOS/web consumers remain qualified, and Android remains explicitly not-run.
- [ ] Step 7: Run bun test packages/css/test/style-explanation-*.test.ts packages/css/test/packed-export-contract.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts; run git diff --check; inspect the receipt for absolute paths; verify the primary checkout still has only its three pre-existing release edits.
- [ ] Step 8: Stage the Task 6 script, evidence, assessment, guide, README, and roadmap files listed above and commit as docs: qualify M9.3 style explanations.
- [ ] Step 9: Fast-forward local main to codex/m9-3-style-explanations after all tests and evidence pass; do not push or publish. Verify main and the feature branch resolve to the final M9.3 commit, and return to the feature branch for the next roadmap slice.

## Completion and handoff

After each task commit, report the exact commit, focused verification, and the next numbered M9.3 task. At milestone close, report full-gate results and remaining limits. The next roadmap item after completed M9.3 is M9.4, versioned policy presets and incremental adoption; it remains unstarted until M9.3 is closed.
