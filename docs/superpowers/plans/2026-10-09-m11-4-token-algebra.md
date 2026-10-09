# M11.4 Colour and Typography Token Algebra Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. Preserve the user's already-selected native/inline method: use superpowers:executing-plans after plan review, with one fresh whole-slice reviewer at the end.

**Goal:** Deliver pure composable colour derivation and precisely named typography scales that emit existing native values without changing token or expression protocols.

**Architecture:** One isolated `/tokens/algebra` entry exposes frozen colour/typography data, closed admission and explicit native conversion. Colour and typography computations are eager; the shared reference fixture memoises application derivations against design inputs and leaves accessibility font scaling to React Native Text. Existing entries, contracts, compiler, expression nodes and runtime ownership stay unchanged.

**Tech Stack:** Strict TypeScript/exact optional properties, Bun, fast-check, existing React 19.2.3/React Native 0.85.3/Expo 56 peers, genuine Node 22.0.0/current supported Node and owned iOS Simulator/Android emulator. No product dependency, lock, version or Effect 4 pin upgrade.

**Spec:** [Approved M11.4 design](../specs/2026-10-09-m11-4-token-algebra-design.md), approved as written by the direct user response following `a29867e` on 2026-10-09.

**Status:** Approved by the user following planning commit `72082f2`; completed inline/native as one implementation slice in the commit containing this record. See the [assessment](../../assessments/2026-10-09-m11-4-token-algebra.md) for qualification and deferred limits.

**Delivery:** One complete M11.4 implementation slice and one final implementation commit. Tasks 0–5 are internal testable checkpoints, with no per-task approval or implementation commits. This planning/status documentation commit is separate. Native/inline is already selected; preserve it rather than asking for an execution-method choice again.

## Global Constraints

- Add only `/tokens/algebra`; value exports exactly createColor, mixColor, setColorAlpha, multiplyColorAlpha, toNativeColor, createTypography, scaleTypography, createTypographyScale, toNativeTypography and TokenAlgebraError. Matching public types are exactly those in the spec. Existing values/aliases retain their meanings and do not re-export the new entry.
- Public types exactly AlgebraColor, AlgebraColorInput, ColorInterpolationSpace, ColorMixOptions, Typography, TypographyInput, TypographyScaleOptions, TypographyScale, NativeTypographyStyle and TokenAlgebraErrorCode.
- Independently built ESM/CJS JavaScript with zero runtime externals and no existing-entry imports. No React, React Native JS, Effect, vanilla-extract, compiler, Node or browser code in this graph; shared declaration generation preserves type identity.
- Colour input: exact #RGB/#RGBA/#RRGGBB/#RRGGBBAA ASCII hex (case-insensitive, no whitespace, maximum nine characters), or {space:'srgb',components:[r,g,b],alpha?}. Components/alpha finite fractions in [0,1]; omitted alpha=1. Native strings outside that grammar and token/variable handles are not algebra operands.
- Colour output tag crumbs.css.algebra-color, version1, space:'srgb', three encoded components and alpha. Typography tag crumbs.css.typography, version1, unit:'native', fontSize/lineHeight/letterSpacing. Deeply frozen outputs; do not mutate/freeze caller objects, retain history or use global caches. Canonicalise -0 only inside this new algebra.
- Own enumerable data properties; Object/null prototypes for records; standard exact tuples. Reject getters/setters without invocation, hidden/symbol/extra/inherited fields, decorated/sparse arrays, explicit undefined, cycles and unsupported tags/prototypes. Same-format second-copy descriptors work without object-identity authority. Arbitrary Proxy/cross-realm prototype support is not promised.
- mixColor ratio in [0,1], explicit space srgb|srgb-linear, premultiplied alpha and exact endpoint value preservation. Computed zero-alpha interiors return black. Use the spec's transfer equations and only <=8*Number.EPSILON roundoff correction; no gamut mapping, extrapolation or implicit compositing.
- setColorAlpha replaces; multiplyColorAlpha attenuates by [0,1]; both preserve RGB. toNativeColor emits lowercase #rrggbbaa via Math.round(channel*255), quantising once. Keep binary64 intermediate precision; do not claim bit-identical powers or exact associativity across engines.
- Typography fontSize/lineHeight positive; lineHeight input exactly {ratio:number}|{value:number}; optional finite signed letterSpacing defaults0. Native metric values must remain finite under Math.fround, with positive fontSize/lineHeight remaining positive, but returned precision is not rounded. No physical-pixel or native-font-scale multiplication.
- scaleTypography multiplies all three metrics by a positive finite factor. Scale options exactly ratio/steps; ratio positive finite; 1–32 statically named steps matching [A-Za-z][A-Za-z0-9_-]{0,63}, integer exponents [-16,16]. Compute each from the base, sort names lexically, safely support constructor and reject broad index signatures. Entire scale fails before publication if any step/result fails.
- toNativeTypography emits exactly the three native metric fields. Existing scalar token contracts/property validation remain authoritative; negative spacing uses existing allowNegative permission. Do not add composite token domains, live expression nodes, Hook APIs, subscriptions, font loading or serialization/extension registries.
- Stable errors: algebra.invalid-color, algebra.invalid-typography, algebra.invalid-option, algebra.invalid-descriptor, algebra.out-of-range. TokenAlgebraError extends TypeError with readonly code; diagnostics are bounded and never stringify/execute arbitrary inputs. Synchronous all-or-nothing output publication.
- Genuine installed iOS/Android interactions, native font-size preference observation/restoration and three Expo exports are required. Physical/spoken-reader/live-HMR/release-FPS work remains deferred; interactive browser acceptance is unperformed.
- Preserve M10.5 numerical policy, matching-runner/exact-release prerequisites, warm failure and historical incremental disposition. A new blocking failure needs explicit disposition. No unchanged-input retries to chase a pass, push, tag or publication.

## Review Focus

1. Near-zero alpha or endpoint-complement rounding can change invisible RGB: symmetry tests must compare premultiplied channels/alpha, while selected well-conditioned vectors compare visible RGB (Task1).
2. A valid-looking descriptor can hide an accessor or decorated tuple, including when an endpoint would not be selected: admission must reject it without executing code (Tasks1–2).
3. Predeclared options, branded token strings or a broad step map can bypass naive inference: source and installed types must preserve finite names and reject these inputs (Tasks1–3).
4. A native font preference update can accidentally enter memoised base metrics, or a control can inherit generated opacity: independent rendered controls and unchanged base metrics must distinguish both errors (Task4).
5. A receipt can outlive a changed fixture/generated style or falsely label a process CJS-first: real load traces and late source/map/package checks must invalidate drift (Tasks3–5).

---

## File and interface map

| Unit | Create | Modify | Responsibility |
| --- | --- | --- | --- |
| Pure algebra | `packages/css/src/token-algebra/{model,error,admission,color,typography}.ts`; `packages/css/src/tokens/algebra.ts` | None in existing product implementation | Type-only brands, bounded errors, safe data admission, colour math and typography math; explicit facade. |
| Tests/oracle | `packages/css/test/token-algebra-{color,typography,admission,integration,package}.test.ts`; `token-algebra.property.test.ts`; `token-algebra-types.ts`; `oracles/token-algebra.ts` | Existing package graph/export tests named in Task3 | Independent numeric and boundary proofs, exact keys, integration and isolation. Test paths without a prefix here are relative to packages/css/test. |
| Distribution/host | `scripts/m11-4-qualification.ts`; `packages/css/test/m11-4-qualification.test.ts`; packed app `test/algebra.{integration,node}.mjs`, `test/algebra-control-values.json`, `src/algebra.types.tsx` | `packages/css/{package.json,tsdown.config.ts}`; `scripts/packed-runtime-graph.ts` | Exact installed copies/import orders/types, pure processes and source/artifact-bound host receipt. Packed paths are under packages/css/fixtures/packed-distribution/app. |
| Shared scenario/native | Storybook `src/components/token-algebra/{algebra-model.ts,algebra-panel.css.ts,AlgebraPanel.tsx}`; `TokenAlgebraDogfood.tsx`; `TokenAlgebraDogfood.stories.tsx`; `test/TokenAlgebraDogfood.test.ts`; playground `src/TokenAlgebraPanel.tsx`; packed `app/src/AlgebraApp.tsx`; `scripts/m11-4-native-{qualification,observations}.ts` | Storybook `src/components/ReferenceSystem.tsx`; playground `src/App.tsx` | One public-API scenario copied verbatim into the packed consumer, finite controls and genuine native preference/layout checks. |
| Cost/docs/closure | `packages/css/bench/token-algebra.bench.ts`; `docs/src/content/docs/how-to/use-token-algebra.mdx`; `docs/assessments/2026-10-09-m11-4-token-algebra.md`; `docs/evidence/2026-10-09-m11-4-token-algebra/` | Package README/COMPATIBILITY; docs reference entrypoints/runtime/diagnostics; docs/astro.config.mjs; docs/roadmap.md; this plan/spec status | Honest new-entry costs and qualification limits, final review/restoration and one implementation commit. |

Do not extract or rewrite historical M11 qualifiers merely to rename them. Reuse independent generic packed/export/native utilities where safe; the M11.4 runners own their scenario, acceptance format and ownership records. Keep evidence proportional: exact tarball, inventories, consumed maps/images/commands and failed/accepted attempts; do not copy an entire dependency installation into committed evidence.

## Task 0: Record baseline and recover the owned environment

**Files:** Read the reviewed plan/spec, manifests, bun.lock, generic packed/native helpers and `.superpowers/tools/m11-3-native/ownership.json`. Write only this plan's execution ledger and owned preflight/baseline receipts.

**Interfaces:** Produce `preflight.json` recording planning HEAD, source/lock/control digests, tool versions/realpaths, original five dependency roots, owned installation/consumer/output roots, selected/protected devices and original settings. `control-values.json` captures every old entry's value export names/alias targets from the baseline build and manifest. Use built-JavaScript export analysis for the React Native entry rather than trying to load Flow-native source in pure Node; preserve existing peer-aware semantic controls separately.

- [x] Record managed branch/HEAD/status, free space, `bun --version`, genuine Node-floor/current `--version` and original root/css/playground/Storybook/docs dependency realpaths/link kinds. Expected: reviewed planning commit on authorised local main; floor exactly v22.0.0; current supported Node reverified rather than inferred from Bun's compatibility version.
- [x] Revalidate an owned frozen installation from bun.lock using `bun install --frozen-lockfile`; attach only scoped owned links if necessary. Reuse the previous owned installation only after its lock/manifest/dependency hashes are rechecked. Expected: unchanged lock and dependency versions, every original directory/link preserved for restoration; a user's existing node_modules is not clean-install proof.
- [x] Run `bun run build`, `bun run --cwd packages/css typecheck` and `bun run test`; capture old exports from that build. Expected: baseline GREEN (currently1,732 CSS/28 Storybook tests, with the separately recorded existing optional exact-floor skip), no new algebra export yet. Any environmental baseline failure is investigated before feature code.
- [x] Revalidate cached Xcode/SDK/adb/emulator/Maestro/idb/JDK17 and pinned Expo Go assets from the previous ownership receipt, recording current identities. Prefer idle proved-owned targets; create fresh owned ones if those targets are now busy/foreign. Never reset all Simulators or touch protected UUID `1F706822-9584-4340-B426-EECF36F9D8EA`, unrelated emulator5562 or primary dependency roots. Expected: a new M11.4 ownership ledger, no native acceptance inferred.
- [x] Record the actual native font-setting query/restore capability. Installed `xcrun simctl help ui` confirms `content_size` read/set; Android uses the selected serial's `settings get system font_scale`. Unknown/unsupported preference state is a prerequisite failure, never replaced by fixture props. Expected: reproducible owned commands and original-value restoration path, with no setting changed during this preflight.

**Checkpoint:** Frozen baseline/control and owned execution prerequisites are recorded; feature and native acceptance remain pending.

## Task 1: Closed colour data, errors and independent colour algebra

**Files:** Create model/error/admission/color modules, colour/admission/property tests and the colour part of `test/oracles/token-algebra.ts` from the map.

**Interfaces:** Define all spec public model types, with type-only brands and exact descriptor fields. `AlgebraColorInput` uses the existing type-only `UnbrandedThemeLiteral` or the closed structured sRGB input so known legacy/domain token brands are not accepted as colour strings. Private checked-input types infer raw arguments first, then inspect their keys through NoInfer; no runtime import of theme-token. Produce:

```ts
createColor<const T extends AlgebraColorInput>(input: T & CheckedColorInput<NoInfer<T>>): AlgebraColor;
mixColor<const T extends ColorMixOptions>(left: AlgebraColor, right: AlgebraColor, options: T & CheckedMixOptions<NoInfer<T>>): AlgebraColor;
setColorAlpha(value: AlgebraColor, alpha: number): AlgebraColor;
multiplyColorAlpha(value: AlgebraColor, factor: number): AlgebraColor;
toNativeColor(value: AlgebraColor): string;
// Private shared helpers admit own data descriptors, finite fields,
// exact tuple/record keys and spec-versioned colour/typography operands.
```

- [x] Write named tests `encoded_and_linear_midpoints_have_distinct_native_bytes`, `alpha_replacement_and_attenuation_preserve_rgb`, `unused_endpoint_accessors_never_execute` and `native_quantisation_is_a_single_boundary`. Assertions:

```ts
const black = createColor('#000'), white = createColor('#fff');
expect(toNativeColor(mixColor(black, white, {ratio: .5, space: 'srgb'}))).toBe('#808080ff');
expect(toNativeColor(mixColor(black, white, {ratio: .5, space: 'srgb-linear'}))).toBe('#bcbcbcff');
const blue = createColor('#0000ff40');
expect(toNativeColor(setColorAlpha(blue, .5))).toBe('#0000ff80');
expect(toNativeColor(multiplyColorAlpha(blue, .5))).toBe('#0000ff20');
// A forged right operand with an alpha getter must throw at ratio0,
// getter execution count remains0, and the left operand is unchanged.
```

- [x] Run `bun test packages/css/test/token-algebra-color.test.ts packages/css/test/token-algebra-admission.test.ts`. Expected: RED because the new API/admission behaviour is absent. Record actual failing assertions, not an unrelated dependency failure; verify each additional boundary test RED before its implementation.
- [x] Implement the Task1 signatures in the named modules using descriptor-first reads and the spec's premultiplied/transfer equations. Add bounded TokenAlgebraError codes and deeply frozen copied output; endpoint values are copied after both operands/options admit. Expected: ten promised error/API names remain scoped to the later facade, no registry or new old-entry import.
- [x] Add hex-width/alpha-order/endpoints/unequal-alpha/zero-alpha/rounding/error vectors and getter/symbol/hidden/prototype/cycle/sparse/decorated/non-finite/refusal controls. Pin representative error codes: invalid hex→invalid-color, forged operand→invalid-descriptor, unsupported space→invalid-option, finite alpha1.1→out-of-range. Run the Task1 command again plus `bun run --cwd packages/css typecheck`. Expected: GREEN, zero accessor executions and source input immutability.
- [x] Add `premultiplied_symmetry_includes_subnormal_alpha` and independent-oracle property laws, seed20261009 with200 runs: bounds, exact endpoint values, swapped1-t premultiplied channels/alpha within1e-12, separately well-conditioned RGB vectors, and emit/parse/emit byte stability with1/510+8EPS quantisation bound. Test alpha0, Number.MIN_VALUE, representable near-endpoints and -0 explicitly. Run `bun test packages/css/test/token-algebra.property.test.ts`. Expected: GREEN; oracle never imports product math, no false universal hidden-RGB or associativity law.

**Checkpoint:** Independently tested immutable colour derivation and common safe ingress; no public package entry has been enabled yet.

## Task 2: Typography construction, design scaling and exact named scales

**Files:** Create typography implementation/tests; extend shared admission, model private checked types, admission/property tests and independent typography oracle.

**Interfaces:** Consume Task1's safe ingress/errors and model descriptors. Define `TypographyInput` with fontSize, exact ratio|value lineHeight and optional letterSpacing; `TypographyScaleOptions<TSteps>` exactly ratio/steps; `TypographyScale<TSteps>` is a readonly mapped type over precisely keyof TSteps. Produce:

```ts
createTypography<const T extends TypographyInput>(input: T & CheckedTypographyInput<NoInfer<T>>): Typography;
scaleTypography(value: Typography, factor: number): Typography;
createTypographyScale<const T extends TypographyScaleOptions>(base: Typography, options: T & CheckedScaleOptions<NoInfer<T>>): TypographyScale<T['steps']>;
toNativeTypography(value: Typography): NativeTypographyStyle;
```

- [x] Write `named_steps_are_computed_directly_from_base`, `metric_emission_contains_only_native_fields`, `invalid_late_step_cannot_publish_partial_scale` and `foreign_typography_accessors_never_execute`.

```ts
const base = createTypography({fontSize:16,lineHeight:{ratio:1.5},letterSpacing:-.25});
const scale = createTypographyScale(base,{ratio:1.25,steps:{title:2,body:0,caption:-1}});
expect(Object.keys(scale)).toEqual(['body','caption','title']);
expect(toNativeTypography(scale.title)).toEqual({fontSize:25,lineHeight:37.5,letterSpacing:-.390625});
expect(toNativeTypography(scale.body)).toEqual({fontSize:16,lineHeight:24,letterSpacing:-.25});
// ratio1e30 with steps{body:0,title:16} throws out-of-range;
// no output/caller mutation is observable. Own constructor:0 is safe.
```

- [x] Run `bun test packages/css/test/token-algebra-typography.test.ts`. Expected: RED on absent behaviour; admission/refusal regressions must fail on their actual assertion before repair.
- [x] Implement the Task2 signatures, checking input/output numeric bounds before publishing frozen values. Build a scale with safe own properties after validating every name/exponent/result; use direct base*ratio**step, not chained steps. Expected: 1–32 names, exponents[-16,16], signed spacing, -0 canonicalisation, no font preference or integer rounding.
- [x] Add ratio/value/default-spacing vectors, ratio/factor errors, exact lower/upper name/count/step boundaries, constructor name, inherited/extra fields, positive float32 underflow and overflow controls. Run the typography/admission suites and package typecheck. Expected: GREEN with all-or-nothing construction, unchanged input and exact native-only output keys.
- [x] Extend oracle/property tests for key-order independence, repeated numeric steps, composition/direct-from-base within relative1e-12 (absolute1e-12 near zero), and deep immutability; generate only cases whose intermediate/final values admit, plus explicit rejected cases. Run `bun test packages/css/test/token-algebra.property.test.ts`. Expected: GREEN; native metric identity/scaling follows the spec rather than a composite domain.

**Checkpoint:** Colour and typography are separate tested pure units, sharing only admission/type/error infrastructure.

## Task 3: Public facade, existing integration and packed host qualification

**Files:** Create the facade, package/integration/type tests and packed host/type probes; modify package.json, tsdown config, `scripts/packed-runtime-graph.ts`, and existing `packed-runtime-graph.test.ts`, `pack-consumer-contract.test.ts`, `packed-export-contract.test.ts` where the new entry affects explicit inventories. Create `scripts/m11-4-qualification.ts` and its guard tests.

**Interfaces:** Consume Task1–2 signatures. The facade exports exactly the spec's ten values/ten types. The host CLI is `bun scripts/m11-4-qualification.ts --consumer-root <owned-root> --output <receipt-root>` with optional `--prepare-only`; preparation is not acceptance. Produce `host/qualification.json` with format/version, host status, source before/after file hashes, artifact/tarball identity, installed root/copy identities, frozen lock/peer/tool versions, all consumed/generated input hashes, actual import-order traces, command/results and Expo maps. Guards fail on foreign roots, path escapes or late source/artifact/install/input drift.

- [x] Write `algebra_entry_has_ten_values_and_zero_externals`, `existing_entry_values_and_aliases_match_control`, `algebra_values_use_existing_scalar_contracts` and installed/source type cases. Reject predeclared extra options, known branded colour tokens, wrong operands/units, extra lineHeight keys, broad string/number/symbol step maps and unknown scale names; accept negative spacing only under existing token permissions. Test emitted textStyle metrics and colour strings through the actual compiler/contract path; descriptors are not passed as style records.
- [x] Run `bun test packages/css/test/token-algebra-package.test.ts packages/css/test/token-algebra-integration.test.ts` and package typecheck. Expected: RED on the missing public entry or actual integration/type assertions; no existing control is relaxed.
- [x] Add the independently built tokens-algebra JS entry and canonical declarations/stubs; classify only ./tokens/algebra as ordinary-runtime with no allowed external specifiers. Scope reachability checks to that new entry while preserving motion/core and every prior denial. Run `bun run build`, the Task3 tests and package typecheck. Expected: GREEN; every old entry/alias matches the actual Task0 control inventory, with only the new subpath added; no stale hardcoded export count.
- [x] Write `actual_cjs_first_loading_is_observed`, `second_copy_descriptors_work_without_runtime_peers` and `late_fixture_input_drift_invalidates_acceptance`; implement the host runner using generic packed-export/runtime/distribution verification, copying Task0 control bytes into algebra-control-values.json. Pin the existing qualified packed cohort React/RTR19.2.3, RN0.85.3, Expo56.0.4 and its Metro0.87.1 lock resolution; revalidate/reproduce the previous packed lock instead of allowing registry drift. Task0's workspace and Task5's matched-budget overlay remain separate environments. Choose require() before any new-entry import in CJS-first child processes; record actual order. Pure probes consume two physical copies with genuine Node floor/current in each format, with React/RN/Effect resolution absent. Expected: selected vectors/descriptor/error checks pass through installed bytes, not source aliases.
- [x] Run `bun test packages/css/test/m11-4-qualification.test.ts`, then a disposable `--prepare-only` probe to exercise frozen artifact/install/type/import setup. Expected: refusal tests GREEN and correctly owned install, but host/native acceptance remains not-run until the final full cohort. Do not run definitive Expo/native collection before fixture, benchmark and package/docs inputs are final.

**Checkpoint:** Public API and integration are exercised through source and installed declarations/bytes; final host/native acceptance is still pending.

## Task 4: One shared native reference and source-bound native qualifier

**Files:** Create the shared model/panel/style, Storybook wrappers/story/test, playground/packed adapters and new native observation/CLI modules; modify only the existing app selection/reference integration points from the map.

**Interfaces:** `AlgebraInputs` is exactly foundation blue|red, space srgb|srgb-linear, ratio1.25|1.5 and step caption|body|title. `buildAlgebraScenario(input)` returns generated/independently authored control colours and native metrics plus unchanged base metrics. `AlgebraPanel` receives observed nativeFontScale separately; it is not a derivation operand. Panel controls use stable algebra-* test IDs; current telemetry format M114 identifies selection/base/output/native scale/current text layouts. No frame history or per-render proof counters.

The native CLI is `bun scripts/m11-4-native-qualification.ts --consumer-root <host-root> --host-receipt <host/qualification.json> --ownership <Task0-ledger> --port <unused-owned-port> --output <native-root>`. It requires passed host evidence, exact source/tarball/install/copy/fixture/generated-style/map hashes and verified owned target identities before actions. Both platform statuses become failed on any late integrity or cleanup failure.

- [x] Write `scenario_controls_are_independent_of_native_font_scale_and_unrelated_state` in Storybook tests. Initial blue/srgb/1.25/title expects tint#8080ffff, replacement#0000ff80, attenuation#0000ff20 and25/37.5/-.390625 metrics; srgb-linear expects#bcbcffff; red equivalents#ff8080ff/#ffbcbcff. Ratio1.5 title expects36/54/-.5625, body remains16/24/-.25. Authored controls use literal/rational expected values rather than product helpers. Expected RED before scenario implementation.
- [x] Implement model/panel and thin adapters. Use opaque base blue/red for tint; alpha sources#0000ff40/#ff000040 for distinct replacement/attenuation. Generated swatches and literal controls share a known opaque white backdrop; container opacity stays1 and labels remain opaque. Memoise against foundation/space/ratio/step only. Render generated/control texts with allowFontScaling=true and record current onLayout/native font scale without modifying helper input. Run `bun test apps/storybook/test/TokenAlgebraDogfood.test.ts` and strict app types after build. Expected GREEN; only the new scenario changes.
- [x] Add `foreign_device_or_bundle_is_refused`, `capture_pixel_and_layout_controls_detect_wrong_output`, `font_preference_phase_requires_real_native_change_and_restoration` and `late_cleanup_or_input_drift_dominates_prior_passes` to qualifier tests. Implement guards and fixture observation using actual hierarchy bounds, real PNG pixels and rendered layouts; labels/telemetry alone cannot pass. Run qualifier tests and strict script checks. Expected GREEN; synthetic pixels test the analyser, never count as native acceptance.
- [x] Implement finite native phases for initial, red foundation, linear space, alpha outputs, each named text step, ratio1.5, unrelated control, font baseline, increased native preference and restored preference. Compare generated/control swatch interior pixels within2/255 per captured channel and text width/height within one native layout unit in the same frame. Require changed outputs/layouts for applicable controls, stable unrelated/base values, enabled observed bounds and visible text. Static waits may help readiness but never manufacture success.
- [x] For iOS, query and preserve `xcrun simctl ui UUID content_size`; set large, then extra-extra-extra-large, observing nativeFontScale and text layout changes, then restore the exact original category. For Android, preserve `settings get system font_scale`; set1.0 then1.3 and require actual native scale/layout changes, then restore the original value (delete only if originally absent). Refuse unknown state, wrong target, fixture-only scaling, missing changes or failed restoration. Scope device/Metro/mapping/input cleanup to the new ownership ledger. Expected: ready executable protocol; Task5 supplies definitive accepted native evidence.

**Checkpoint:** A shared independently tested scenario and bounded host/native qualification protocol; no motion timing/read-cohort requirements are carried into this static feature.

## Task 5: Final cost/docs/cohort, whole-slice review and one commit

**Files:** Cost/docs/assessment/evidence paths from the map; approved source/package/app/qualifier paths only for the single review repair pass.

**Interfaces:** Final evidence index/assessment separates functional/slice acceptance from M10.5 release acceptance; names current host/native receipts, source/artifact/map/image/cost identities, original dependency/settings restoration and review outcomes. Source identity includes every new authored fixture/app/test path and package/docs inputs; the unchanged host collector's identity is captured separately.

- [x] Write token-algebra.bench.ts before final qualification: consumed workloads10,000 colour construction/mix/replacement/attenuation/emission operations,10,000 typography construction/scale/emission operations, and1,000 constructions at3/32 steps. Run two fresh processes after the final build; assert counts, bounds and consumed outputs and record raw samples, entry raw/gzip graphs and genuine cold pure imports. Expected: repeatable bounded diagnostics, not new blocking thresholds or native performance claims.
- [x] Write the guide/sidebar/reference entries and README/COMPATIBILITY. Explain admitted syntax, explicit space, interpolation versus compositing, alpha distinction, one-time quantisation, native units, signed spacing, finite scale keys, memoisation and native font ownership. Record actual qualified/unqualified peers/platforms; existing semantic palette and expression APIs stay unchanged. Expected: docs describe only this approved API and retain release/physical/browser limits.
- [x] Run `bun run build`, `bun run --cwd packages/css typecheck`, `bun run test`, `bun run --cwd apps/playground typecheck` and `bun run --cwd apps/storybook typecheck`. Storybook's typecheck rebuilds CSS: finish it before freezing artifact bytes. Run `bun run docs:build`; if the known external-symlink Astro issue persists, retain its failure and build byte-identical docs source/config in the existing frozen owned installation. Expected: product/type/suite checks GREEN and truthful docs outcome; no product-source workaround for an environment issue.
- [x] Freeze source/build/package/docs inputs; the runner packs with `npm pack --ignore-scripts --json --pack-destination <owned-artifacts>` to avoid prepack rebuilding them. Then run the full Task3 CLI into `docs/evidence/2026-10-09-m11-4-token-algebra/host`. Expected: fresh stable frozen install, exact tarball retained, complete inventory, installed types/real load orders/four genuine Node format-version probes/two copies and real iOS/Android/web exports passed. No rebuild beneath this cohort.
- [x] Run the Task4 native CLI using that host receipt and current owned tools. Directly inspect final actual images for colour/alpha/type controls and native font baseline/increase/restoration. Expected: all finite phases on both platforms pass, actual native preference/layout change is observed, all consumed bytes/maps remain bound and cleanup/restoration succeeds. Failed/superseded attempts remain distinguished from acceptance.
- [x] Before the collector, register only explicit new source paths with intent-to-add if needed by `captureGuaranteesSourceIdentity`; audit that inventory. Run once: `CRUMBS_AUDIT_NODE_FLOOR=<verified-node22> CRUMBS_METRO_PORT=<unused-owned-port> bun scripts/measure-current-host-budgets.ts docs/evidence/2026-10-09-m11-4-token-algebra/host-budgets`. Revalidate matching Expo/Metro baseline dependencies separately from packed-native peers, using only an owned temporary read-only overlay if required. Expected: complete21-row stable source/artifact/policy comparison, honest failures and restored links; do not alter limits or infer a release pass. Record/dispose any new blocker explicitly.
- [x] Populate assessment/roadmap/evidence from these receipts without changing qualified package/doc inputs. Prepare an explicit complete proposed-file manifest, including untracked authored files and required raw evidence. Dispatch one fresh most-capable whole-slice reviewer with approved spec/plan, exact identities, Review Focus and ledgered rulings. Re-grade findings; repair Critical/Important once with reproduced RED→GREEN and full appropriate suite. Refresh exact host/native/cost/budget bindings only when repair bytes changed; no re-review or timing pass chase. Deferred Minor findings go to the ledger/final report.
- [x] Restore and independently verify the original five dependency roots and native settings, owned process/device/mapping cleanup, lock/policy identity and all source/package/receipt/image hashes. Preserve the review report and rulings. Run authored working/staged `git diff --check`; raw generated receipts remain lossless with explicit byte equality, retaining any unscoped whitespace refusal. Stage only the authorised manifest (force-add only individually authorised ignored evidence if necessary) and audit each staged byte against working/qualified bytes. Expected: spec acceptance met, no undisposed new blocker and no unrelated staged files.
- [x] Make the one implementation commit `feat(m11.4): add pure colour and typography token algebra`. Independently verify parent, changed paths, commit/working hashes, tracked clean state and current source/collector identities. Retain needed final audits, delete only this plan's owned SDD scratch and preserve tools/managed checkout/unrelated roots. Report commit, qualification/limits, exhaustive required rulings and deferred minors. Recommend **M11.5 — constrained serialization and extension protocol**; do not start it or publish.

**Checkpoint:** One complete reviewed M11.4 slice committed; M10.5 exact release closure and deferred physical acceptance remain separate.

## Planning self-review and handoff

- Spec colour/error/admission sections map to Task1; typography/units to Task2; facade/types/old compatibility to Task3; native/reference/ownership to Task4; costs/docs/final evidence/review/commit to Task5. Task0 establishes actual prerequisites without inferring them from historical receipts.
- Every Review Focus item has a named owning regression test; rare alpha laws are premultiplied rather than false hidden-RGB equalities, and native font preference is observed rather than injected. Source and installed type checks preserve exact keys and existing token brands.
- Commands reference existing package scripts or explicitly defined new CLIs. Task interfaces agree on names, tags, options and finite bounds. Plan steps are internal checkpoints under the user's one-slice commitment, with one final fresh review/repair pass.
- The plan contains decisions, signatures and test assertions, not a transcript of implementation. All feature/benchmark/package docs precede the definitive cohort; assessment/status edits that do not change qualified inputs require an unchanged-byte audit rather than another native run.
- This plan has been checked inline against the approved spec for coverage, type consistency, clear steps, Review Focus and proportion. Written-plan review was approved before implementation; final host/native and review-repair evidence is retained.

Next: **M11.5 — constrained serialization and extension protocol**. Its design and implementation await separate authority.
