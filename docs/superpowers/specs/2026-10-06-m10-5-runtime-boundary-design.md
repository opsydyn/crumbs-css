# M10.5 compatibility-preserving runtime-boundary design

- **Status:** Proposed; design slice authorised, implementation not authorised by this document.
- **Date:** 2026-10-06
- **Roadmap:** M10.5
- **Source inspected:** `d637fa7`
- **Decision:** [Separate mandatory theme resolution from optional runtime state](../../decisions/separate-mandatory-theme-resolution-from-optional-runtime-state.md)
- **Extends:** [Runtime footprint design](2026-10-01-m10-5-runtime-footprint-design.md) and [profile-first design](2026-10-02-m10-5-profile-first-runtime-design.md).

## Intent and success

Reduce avoidable theme graph and module-initialisation cost without requiring consumer migrations. Preserve every published runtime/type export, synchronous behaviour, serialized descriptor admission, diagnostics, reference stability and existing provider/hook interoperability. The user approved this design slice after the consolidated remediation; detailed implementation remains a subsequent review stage.

The [source-current remediation comparison](../../evidence/2026-10-05-m10-5-remediation/host-budgets/comparison.json) reports 12 passes, eight failures and one Expo environment mismatch. Four theme graphs fail; Node 22 CJS and Node 24 ESM/CJS startup fail; warm transform fails. Node 22 ESM startup passes this cohort. A design document, smaller source files, or a scratch timing improvement does not close any of these gates.

| Gate | Current median | Existing ceiling |
| --- | ---: | ---: |
| theme/core ESM graph | 64,549 B | 17,271 B |
| theme/core CJS graph | 65,408 B | 17,641 B |
| compatibility theme ESM graph | 164,215 B | 44,017 B |
| compatibility theme CJS graph | 171,842 B | 44,764 B |
| Node 22 ESM startup | 7.468 ms | 7.553 ms |
| Node 22 CJS startup | 4.494 ms | 4.083 ms |
| Node 24 ESM startup | 4.118 ms | 3.067 ms |
| Node 24 CJS startup | 3.267 ms | 2.444 ms |
| warm full transform | 9.163 ms | 6.514 ms |

The budget registry and comparator remain authoritative, including percentage rules and workload/environment equality. The table rounds timing values; it does not replace their protocols. Metro remains incomparable (Expo 56.0.4 baseline versus 56.0.23 current). All physical work remains deferred. Spoken readers, exhaustive native variants and animated Storybook FullUI remain outside this design's qualification.

## Findings that constrain the boundary

`theme-core.ts` re-exports from `theme-runtime.ts`. That shared source includes generic token/style dispatch, React providers/hooks, token scopes, dependency planning and feature re-exports. Its top-level registry calls create both theme and token-scope contexts and a resolution cache. A source re-export can retain module evaluation even when some value exports are unused.

The generic `resolveThemeTokens` is already a descriptor ingress. It accepts component recipe versions 1/2/3 and extension version 1, resolves their tokens and rejects unsupported versions/malformed contracts. `runtime-isolation.test.ts` requires this behaviour through both theme and theme/core under compiler/Node import denial. Component and extension validators are mandatory dependencies of this API, not optional authoring code. Their global identity registration and error ordering are observable and must survive.

The compatibility entry and focused conditions/expressions/recipes/sprinkles entries currently share canonical bindings. Theme/core is built independently: its matching functions are not required to be reference-equal to compatibility functions. Existing interoperability uses shared Symbol-keyed registries. Preserve this distinction; do not accidentally strengthen the contract to equality across every entry, nor break the existing focused-entry equality.

The [single-entry layout](../../assessments/2026-10-03-m10-5-identity-preserving-chunk-layout-ab.md) broke focused identity; focused facades then loaded the whole compatibility graph. The [all-entry grouping](../../assessments/2026-10-04-m10-5-package-group-ab.md) preserved references but made core import optional feature chunks. Neither is an admissible shortcut. Historical measurements explain rejected options; current qualification must be recollected.

## Options and recommendation

| Option | Benefit | Cost / disposition |
| --- | --- | --- |
| Static semantic modules with the existing build groups | Separates scope/provider initialisation and reusable descriptor traversal; keeps synchronous ingress and import-order independence | Recommended candidate. Mandatory validators remain reachable; no guarantee that graph ceilings are attainable. Requires emitted-graph evidence. |
| Trusted compiler-only resolver with a separate legacy fallback | Could make a new trusted path small | Adds a new consumer/artifact contract; existing generic APIs still need the fallback graph. Do not select for this compatibility-preserving slice. |
| Registered or dynamically loaded feature handlers | Could defer feature loading | Requires installation/load order, introduces missing-handler behaviour or asynchronous loading, and complicates Fast Refresh. Reject under current synchronous serialized-input contract. |

Keep the existing build grouping and export map for the first candidate. Establish semantic boundaries before considering any independently reviewed build-layout proposal. No new runtime dependency, public subpath, artifact version, global handler registry or dependency-injection API is proposed.

## Proposed static modules

These paths are proposed internal ownership, not shipped files or public imports. Names can be adjusted by the implementation plan only if the responsibilities and dependency directions remain exact.

| Internal owner | Responsibility and permitted dependencies |
| --- | --- |
| `runtime/theme-resolution-cache.ts` | Existing cache-kind state and Symbol-keyed registry helper. Preserve keys, weak ownership and cacheability rules. No React/descriptor/planning dependency. |
| `runtime/theme-token-resolution.ts` | Public generic `resolveThemeTokens`, plain style flattening and token lookup. Imports token metadata, diagnostics, cache and mandatory component token handler. No React, optional selection plans, scopes, expressions or compiler. |
| `runtime/theme-component-tokens.ts` | Current component/extension token resolution, version/contract checks, slot traversal and snapshot/freezing. Imports existing validators and cache; receives the generic resolver as an internal synchronous argument for nested slot values. No import back to the token-resolution module. |
| `runtime/theme-style-resolution.ts` | Public `resolveThemeStyles`, map detection, recipe/sprinkles token traversal. Calls the generic token resolver. Receives no registration or user callback. |
| `runtime/theme-react.ts` | ThemeProvider, theme store context, selectors and common themed-style hooks. Imports stores and token/style resolution. No token-scope context or scope materialisation. |
| `runtime/token-theme-scopes.ts` | TokenThemeProvider/useTokenTheme/TokenThemeScopeProvider, token-scope context, compatibility checks and layer materialisation. Uses the same private React store helpers/context keys. Core must not reach this module. |
| `runtime/theme-dependency-resolver.ts` | Existing dependency plan/resolver API and selective path update helpers, importing style resolution and current dependency-plan code. Core must not reach this module. |
| `theme-runtime.ts` | Compatibility facade re-exporting all existing bindings/types from their owners and current focused features. No duplicated function bodies or new module-level construction. |
| `theme-core.ts` | Re-export its existing names/types directly from their actual owners. Core retains every mandatory descriptor validator; no facade import from compatibility. |

The component handler receives the actual generic resolver function, not a reduced plain-only substitute. Current slot traversal calls generic resolution; narrowing that recursion would change accepted nested inputs. The handler may call it synchronously with the original theme and slot value. This internal dependency inversion breaks a module cycle without a public extension system, registry lookup, captured user closure or per-call function construction.

Keep cache kinds and cache lookup/write points unchanged on extraction. Keep the original symbols for theme context, token-scope context, resolution cache and component-contract identity. Do not move registrations between validation and resolution phases. Removing unnecessary *reachability* of scope state from core is the candidate benefit; removing mandatory state or validation is prohibited. Core-only import would no longer create the private token-scope context; compatibility import still evaluates the scope owner before exposing those APIs. Preserve provider/hook interoperability when either entry is imported first. The timing contract preserved above concerns validation/identity registration and cache admission, not an unconditional requirement to create unused private scope state from core.

Do not add lazy initialisation merely to move work beyond the timed import window. Compatibility must still expose and evaluate its required dependencies. Any later state-lifetime proposal must measure first use as well as import and preserve failure/registration timing; it is not silently included here.

## Functional structure and optimisation eligibility

Keep pure traversal separate from state ownership. Generic resolution remains a fold over supported data, with branch-specific validation and shallow native value semantics. Do not replace it with a generic recursive object mapper: transforms, shadow offsets, platform colours, animated values, class references and marked style maps have distinct handling.

The first candidate is extraction with no algorithm changes. It establishes whether removing optional module evaluation from core produces a measurable benefit. Do not claim compatibility bytes decrease just because the facade is smaller: every reachable artifact counts.

After extraction, a compact shared data-record/array guard may be considered only if independent characterization proves identical prototype, own-key, enumerable/accessor, symbol, sparse-array, cycle, identity-registration and error behaviour at each caller. `components/contracts.ts` and `components/extension-contract.ts` currently use context-specific validators and normalization; sharing them without this proof is not part of the initial candidate. No schema validation is removed or moved to a trust assumption. No Effect/Optic import enters the ordinary runtime.

## Compatibility and characterization gates

Before touching production code, the implementation plan must name a candidate artifact root and retain the current build as its control. Differential cases must run in separate fresh processes to avoid cache or global identity registries contaminating each other.

- [ ] Record export names, declaration compatibility and focused-binding equality for ESM/CJS; preserve current consumer subpaths and format conditions.
- [ ] Preserve strict equality for compatibility/focused overlaps. Compare theme/core interoperability separately through a single React peer and both provider/hook import orders; do not introduce a new equality requirement.
- [ ] Characterize legacy styles/arrays/false/null, token ownership/missing values, recipe defaults and ordering, sprinkles, marked maps and structured native values.
- [ ] Characterize component v1/v2/v3, extension v1, future-version rejection, malformed public/state/extension contracts and identity collisions; compare error class, diagnostic code and existing message/order where promised.
- [ ] Compare value equality, unchanged-input reference reuse, frozen snapshots, cache hits, previous-theme retention and opaque class/animated values. Do not compare cross-process pointer addresses; compare the promised identity relations within each process.
- [ ] Preserve callback recursion through generic dispatch. Include nested tagged slot inputs in characterization even where types discourage them; retain existing rejection/handling rather than guessing a new rule.
- [ ] Use bounded property generators with recorded seeds for supported descriptor/style combinations and malformed boundary values. Check deterministic resolution, snapshot immutability and idempotence only where specified. Traversal is not commutative; arbitrary composition reassociation is not a promised law.

## Artifact and performance gates

- [ ] Existing runtime denial tests remain intact, including the current single-artifact core graph assertion and React-only externals. No Effect, compiler, vanilla-extract, devtools, scopes or dependency-resolver module may enter core's graph.
- [ ] Inspect static graph/source attribution from the candidate; source separation alone is not proof. Avoid renaming optional chunks to evade isolation tests.
- [ ] Use the same package-shaped ESM/CJS outputs and declared React peer, exact Node 22.0.0 floor and recorded current Node for paired control/candidate cohorts. Alternate cohort order and keep source/artifact hashes.
- [ ] Preserve the official startup workload. Additionally record first-use and import-plus-first-use for plain tokens, component/extension resolution and scoped-provider setup on both formats/runtimes. These are paired diagnostics, not replacements or new approved ceilings. Retain total cost so import-only deferral cannot count as an optimisation.
- [ ] Admit extraction only if all semantic/identity/isolation gates pass, core emitted bytes decrease, no approved passing metric becomes failing, and paired first-use totals show no regression beyond control spread in any tested case. For this diagnostic gate, flag a regression when the candidate median exceeds the control median plus the control max-minus-min retained-sample range; report all raw pairs and spread. This conservative screen is not a new performance budget or proof of speedup. If spread overlaps an apparent improvement, call that improvement inconclusive. A lower import median alone is insufficient.
- [ ] Final production qualification uses the unchanged 21-metric host protocol and five legacy smoke repetitions with independent source/artifact identities before/after. Failed ceilings stay failed; the extraction can be structurally qualified without full M10.5 acceptance.
- [ ] Warm full-transform latency and Metro environment mismatch remain named open gates. This runtime extraction is not expected to repair compiler or Expo baseline differences. Do not enable a production retained-context cache or rewrite historical baselines.
- [ ] Recollect packed iOS/Android/web consumers, shipping watched/cache-enabled Metro, actual bounded native scenarios and source/artifact continuity after any admitted runtime change. Existing native receipts are historical for changed code. Physical devices, spoken readers and exhaustive variants remain separate requirements.

## Rejection, rollback and next handoff

Reject the candidate if validation, output/reference relations, focused identity, runtime isolation or mixed-entry behaviour differ. Reject a size/performance claim if only source boundaries changed, optional costs moved into first use, or results require another baseline/threshold. If static extraction has no useful measurable effect, retain the diagnostic result and do not commit production restructuring solely for its proposed performance benefit.

The initial measurement cannot guarantee an 80% reduction in mandatory core semantics or a 73% reduction in compatibility bytes. If the remaining graph is required by legacy APIs and no admissible compact implementation clears the ceilings, record that incompatibility for a separate explicit policy/product decision. This design does not approve dropping APIs or altering budgets.

## Candidate execution disposition — 2026-10-06

The consolidated implementation plan executed one private static-boundary candidate and one admission/rejection decision. The candidate preserved the tested export, declaration, focused-binding, mixed-provider, nested-slot, cache-identity and runtime-isolation contracts. Its source is archived under `docs/evidence/2026-10-06-m10-5-runtime-boundary/`.

The unchanged 21-metric host comparison reported 11 passes, 9 failures and 1 Expo environment mismatch. All four startup metrics, warm full-transform and all four theme graph-size gates failed. Theme/core and compatibility graphs grew slightly relative to the package control. A 240-pair first-use diagnostic across 16 runtime/format/scenario cohorts remained within control spread and showed no qualifying improvement. The candidate therefore fails this design's admission rule and the production extraction was removed. No API, dependency, approved threshold or baseline changed.

The candidate packed Expo result was not retained as an artifact; Metro refresh and native flows were not run after the decisive host failure. The restored-control packed iOS/Android/web exports and three source maps passed and are recorded separately. Physical-device acceptance remains deferred. M10.5 remains open.

Next M10.5 handoff: **non-breaking startup and emitted-graph attribution and feasibility design**. Attribute mandatory public semantics and avoidable initialization cost before proposing another implementation. Preserve current APIs and approved limits; retain warm-transform and Expo-version comparability as open gates. Do not repeat static extraction without a specific, measurable path that can meet the current criteria.
