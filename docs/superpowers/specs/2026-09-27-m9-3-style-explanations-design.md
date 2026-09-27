# M9.3 Development Style Explanations

**Status:** Conversational design approved; written specification awaiting review
**Date:** 2026-09-27
**Roadmap:** M9.3 in [roadmap.md](../../roadmap.md)
**Governing decisions:** D5, D9, D10, D11, and D12 in the [design-system compiler ADR](../../decisions/adopt-native-design-system-compiler.md)
**Depends on:** Native IR provenance and normalization (M2), theme dependency plans (M4), native conditions and expressions (M6), recipe/component contracts (M7), and package boundary qualification (M8)

## Intent

Give design-system authors and product teams an actionable answer to “why did this style resolve this way?” Explain one concrete exported style under explicit theme, condition, and recipe-selection inputs. Report resolved property values, matching branches, declarations that won or were overridden, token dependencies, and causes implied by comparison with a previous input snapshot.

This is an on-demand development tool. It does not change how styles resolve, automatically log or inspect renders, or make claims about React commits, native layout, paint, accessibility, or device performance.

## Approved understanding

- Provide a headless, structured explanation API on the dedicated **@opsydyn/crumbs-css/devtools** package subpath. Do not add it to ordinary authoring, theme, or root entrypoints.
- Emit detailed compiler provenance in a separate versioned **__crumbsDev** module sidecar. Emit it by default for development transforms, allow it to be disabled there, and keep it out of production artifacts unless **includeStyleExplanations: true** is explicitly supplied.
- Use the internal Effect 4 Schema boundary for the versioned report. The returned API remains ordinary typed data; consumers do not need Effect APIs.
- Explain an explicit module export path and explicit current/previous inputs. Do not infer device readings, source usage outside the supplied module, or React render behavior.
- Preserve current resolver, composition, condition, and dependency semantics. Explanation collection is opt-in and does not run during ordinary rendering.
- Android and device acceptance remain parked.

## Existing baseline and gap

The development transform already receives Metro's **dev** option. The compiler emits production **__crumbsModule** metadata containing final token dependencies by export path. Native IR declarations also retain package-relative source, logical path, authored property, canonical property, alias expansion, and origin while they pass through compiler admission.

These data are split across phases. Current production metadata omits detailed declaration provenance. Scalar normalization removes losing declarations after applying last-winner ordering, so a useful override explanation must capture candidates before that information is discarded. Recipe and component-recipe plans know selected branches and preserve their resolution order; Sprinkles plans know property and shorthand selections. Native condition matching uses greatest specificity, with later declaration order winning ties. Theme dependency resolution can report changed tokens, recomputation counts, and changed output paths, but those metrics are not joined to source-level explanations. There is no user-facing API that combines these facts.

Unmarked vanilla-extract compatibility input and arbitrary runtime values do not carry the same proof as Crumbs-owned IR. Explanations must state this coverage limit instead of manufacturing source or winner details.

## Goals

- Add an on-demand **explainStyle** operation that accepts a transformed module namespace, an explicit export path, a current snapshot, and an optional previous snapshot. A snapshot may provide a theme, recipe or Sprinkles selection, and finite native-condition snapshot.
- Return an immutable, versioned, JSON-compatible report that identifies the module/export, resolved style output, selected and rejected branches, and evidence coverage for each explanation.
- For each resolved property, report its resolved value, active token reference when present, winning declaration, and ordered overridden declarations when the compiler can prove them.
- Explain recipe, component-recipe, extension, and Sprinkles selection using existing defaults, validation, branch order, shorthand expansion, and slot behavior.
- Explain native condition matching with matcher inputs, matched candidates, specificity, declaration order, winner, and the finite condition snapshot. Explain expression match choices where the expression plan exposes them.
- Report declared and active token dependencies separately. Given previous and current snapshots, identify relevant changed tokens, affected paths, and whether the dependency plan implies recomputation or no relevant recomputation.
- Mark incomplete, unavailable, or opaque evidence explicitly. Keep source identities package-relative and report output deterministic for equivalent inputs.
- Keep explanation metadata absent from production transforms by default and keep the developer API out of ordinary package runtime graphs.

## Non-goals

- Do not add an inspector overlay, Storybook panel, CLI, hosted service, telemetry, automatic console logging, or persistent global trace store.
- Do not change style authoring, resolution, cache, condition, theme, recipe, Sprinkles, or component-recipe semantics.
- Do not claim an inferred transition equals an actual React render, component commit, native layout pass, frame, paint, or accessibility outcome.
- Do not inspect arbitrary consumer source or infer style use from names, imports, or visual similarity.
- Do not claim detailed provenance for unmarked vanilla-extract values, external objects, unsupported dynamic values, or missing sidecars.
- Do not change production **__crumbsModule** schema/version, M9.1 manifests, release policy, or platform acceptance.
- Do not implement M9.4 policy presets, M9.5 codemods, or M10 visual/device journeys.

## Selected architecture

### Development metadata

Add a separate metadata descriptor with type **crumbs.css.style-explanation-metadata** and version **1**, emitted as the reserved **__crumbsDev** export. Keep the production **__crumbsModule** descriptor and its version unchanged. Reserve the new export name against authored exports.

The sidecar records only information needed to explain the compiled module: package-relative module identity; export paths; declaration identities and source/property provenance; relevant condition, recipe, component-recipe, extension, and Sprinkles branch descriptors; and ordered declaration candidates needed to show winners and overridden declarations. It links to the existing token dependency plan rather than redefining its semantics. Author order is retained wherever it affects resolution; identity-keyed collections are canonically ordered.

The transformer option **includeStyleExplanations** controls emission. When omitted, development transforms include the sidecar and production transforms omit it. Explicit **false** disables it in development; explicit **true** allows deliberate production inclusion. A module without the sidecar remains valid and ordinary runtime behavior remains unchanged.

### On-demand API and report

Expose **explainStyle** and the report types from **@opsydyn/crumbs-css/devtools**. The caller supplies:

- the imported transformed module namespace;
- the export path to explain;
- the current theme, selection, and condition snapshot relevant to that export; and
- optionally the equivalent previous snapshot for a transition explanation.

The operation reuses admitted module metadata and current resolution plans. It does not subscribe to React, read native device state, monkey-patch resolvers, write files, or retain inputs after returning. It returns a frozen report with a top-level type tag and integer version. The report contains:

- **target:** package-relative module identity and explicit export path;
- **resolution:** resolved style values and selected recipe/slot/utility branches;
- **conditions:** finite supplied snapshot and branch-match evidence;
- **composition:** per-property winner and ordered overridden candidates where proven;
- **dependencies:** declared token set, active token set for the selected branch, and changed tokens when comparing snapshots;
- **transition:** changed inputs, affected paths, and a decision of not-compared, relevant-input-change, no-effective-change, or unavailable; and
- **coverage:** complete, partial, or unavailable evidence plus stable reason codes.

A report without a previous snapshot has transition status **not-compared** and makes no recomputation claim. It does not infer why an earlier render occurred. Transition results describe what the supplied plans imply for these inputs, not an observed React render or cache event. Missing source detail is a coverage limit rather than a guessed origin.

The report schema uses Effect 4 Schema internally on the devtools graph and encodes ordinary JSON-compatible data. Safe values include finite primitives, arrays, plain data records, and explicit theme-token identities with their resolved values. Values that JSON cannot faithfully preserve, including negative zero and undefined, use explicit tagged nodes. Cycles, accessors, functions, symbols, non-finite values, and other unsupported runtime values are never evaluated or traversed unsafely; the report marks affected evidence partial and uses a stable opaque-value reason. No Effect type or execution requirement appears in the public authoring API.

### Resolution and explanation semantics

- **Flat style composition:** preserve existing left-to-right, later-property-wins behavior. Report the final winner and prior candidates in authored order, including authored aliases and canonical expanded properties when compiler provenance has them.
- **Recipes:** report defaults, supplied selection overrides, selected variants in plan order, and matching compound variants in declaration order.
- **Component recipes:** report slot-specific base styles, valid state/variant selections, matching compounds, and extension slot overrides in the existing order. If a state constraint rejects a selection, report the rejected state and do not invent selected variant styles.
- **Sprinkles:** report selected properties and shorthand targets in authored selection order, with the exact compiled references selected by the existing plan.
- **Conditions:** report each candidate's match result and specificity. Equal-specificity winners follow later declaration order, matching the existing condition resolver. Report only explicit finite snapshots supplied to the API.
- **Theme dependencies:** use the existing dependency plan and actual previous/current theme values. A contract change affects every planned token path. A token value change affects only declared paths. An unrelated token change is reported as irrelevant to the explained export. Selection and condition changes are analyzed through their resolution plans, separately from theme-token dependencies. No dependency edge means no claim of selective recomputation.
- **Legacy and opaque inputs:** show resolved values where safely available, but mark provenance or transition evidence partial/unavailable when it is not compiler-proven.

All output is deterministic for equivalent module metadata and explicit inputs. Semantically meaningful authored order is preserved; other record keys and diagnostic reason codes use canonical order. Reports contain no timestamp, absolute path, machine identity, or telemetry.

## Package and performance boundaries

Add a separate devtools ESM/CommonJS/declaration build entry and package export. Keep its schema and trace implementation out of ordinary root, style, theme, token, and tooling/manifest graphs. The devtools graph may depend on the existing internal Effect 4 package, but ordinary React Native use does not import it through this subpath.

A disabled explanation build emits no **__crumbsDev** export and does not add explanation work to ordinary resolver calls. Calling **explainStyle** is explicit, synchronous work intended for development diagnosis. No process-wide listener, unbounded cache, or trace history is introduced. The production-disabled transform remains free of detailed provenance; explicit production opt-in is deliberate and documented.

## Acceptance evidence

1. Compiler tests prove the sidecar includes exact package-relative origins and pre-normalization overridden candidates for Crumbs-owned IR, and that authored alias/canonical-property relationships remain accurate.
2. Runtime tests compare explanations with actual resolver outputs for flat composition, recipes, component recipes/extensions, Sprinkles shorthands, native conditions, and theme-token resolution.
3. Condition tests cover no match, multiple matching candidates, greater specificity, equal-specificity later-winner behavior, and expression match selection.
4. Transition tests cover the absence of a previous snapshot, relevant token change, unrelated token change, contract change, condition change, selection change, and missing dependency metadata. Token-affected paths match the dependency plan; selection and condition effects match their resolution plans.
5. Property-based tests generate ordered declarations and selections and compare winners, selected branches, and dependency impacts with independent small evaluators. Seeded failures remain reproducible.
6. Schema tests round-trip supported report values, reject malformed tags/versions and inconsistent paths, preserve negative-zero identity, and mark accessors, cycles, or opaque runtime values without invoking unsafe accessors.
7. Transform tests prove default development emission, explicit development disablement, default production omission, and explicit production opt-in. Production **__crumbsModule** remains unchanged when explanation output is disabled.
8. Packed ESM, CommonJS, and TypeScript consumers qualify the devtools subpath. Runtime-graph tests prove ordinary package entries do not pull the devtools schema or explanation implementation.
9. A direct benchmark compares explicit explanation calls with ordinary resolution and records trace cost as diagnostic data. It does not establish device, frame, or production performance qualification. Existing ordinary-runtime benchmarks show no additional work on the disabled path.
10. Documentation explains API use, development/production emission, transition limits, provenance coverage, and the distinction between inferred resolver causes and observed React/native behavior. Roadmap and qualification evidence retain Android as not-run and parked.

## Risks and mitigations

- **Explanation logic can drift from real resolution.** Reuse resolution plans and decision helpers where possible; property-based and differential tests compare the report against independent and production resolver results.
- **Capturing discarded declarations can increase development output.** Keep the sidecar separate, enable it only for development by default, permit disabling it, and make production inclusion explicit.
- **Legacy input may not have provenance.** Report partial coverage and never infer source origins or overridden candidates from a final object alone.
- **Transition reports can be mistaken for render telemetry.** Require explicit previous/current snapshots and label the result as plan-derived; document that React and native lifecycle events are not observed.
- **Style values may not be safe JSON data.** Traverse only validated own data properties, avoid invoking accessors, reject cycles from detailed serialization, and return stable opaque coverage reasons.
- **A new export can enlarge ordinary bundles.** Build it as a separate subpath and retain packed export and runtime-graph qualification.

## File boundaries

Expected implementation areas are the compiler metadata/emission and transformer option paths; a versioned explanation metadata module; pure runtime explanation and report-schema modules; a dedicated devtools entry and package export; focused compiler/runtime/schema/property/packed-consumer tests; developer documentation; and the M9.3 roadmap assessment/evidence. Do not change ordinary root/theme exports, production metadata schema, package release workflows, Android status, or device claims.
