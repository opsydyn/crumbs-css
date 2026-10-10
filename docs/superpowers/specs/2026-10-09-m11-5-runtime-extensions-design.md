# M11.5 — Typed factories with explicit runtime imports

**Status:** Written spec approved by Alan Currie on 2026-10-10 following spec commit `f58f4f1`. Typed Crumbs factories backed by explicit runtime imports remain the selected direction. The [implementation plan](../plans/2026-10-10-m11-5-runtime-extensions.md) was approved as written on 2026-10-10. The single fresh review and Important repair pass are complete; final repaired-source host/types/cost/docs and12 iOS/12 Android phases pass with2,171 verified bindings. Original dependency roots/owned links and native settings/processes are restored and independently checked. The direct subsequent user request to commit, push and prepare v1 closes functional M11.5 while retaining the new cold-transform blocker under M10.5 without a release waiver. Complete in the single implementation commit containing this record, subject to independent commit verification.

**Date:** 2026-10-09.

**Roadmap:** [M11.5](../../roadmap.md#m11--deliver-the-selected-native-extensions).

**Source reviewed:** `6ccc68834a8b8a442a0007c15ba2ece8987557c6`, managed `crumbs-main-merge` checkout, local `main`. At the start of this spec, tracked files were clean; unrelated primary-checkout package/lock changes and existing untracked dependency/native/tool roots remain outside this work.

**Governing decisions:** D1/D2/D3/D6/D8/D11 of the [proposed native compiler architecture](../../decisions/adopt-native-design-system-compiler.md), and the accepted [Expo consumer-budget evidence ADR](../../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md). The rejected [runtime-boundary extraction](../../decisions/separate-mandatory-theme-resolution-from-optional-runtime-state.md) remains rejected. This spec does not accept the entire parent ADR or restructure the existing theme runtime.

## Intent, evidence and delivery

A design-system maintainer wants to package a typed native component factory so application teams can declare a styled component in a stylesheet and import the resulting component directly. The current alternative is exporting style data and assembling a wrapper in an ordinary TypeScript module. `captureNativeExports` currently rejects function values; ordinary build-time helpers already work and do not need this feature.

The chosen acceptance case is a shared `styledView` factory whose runtime component forwards normal View props/children and applies compiled native base styles. A separately named `themedView` factory uses the existing `useThemedStyle` Hook and requires the existing ThemeProvider, including for literal styles; there is no conditional Hook or new theme authority. The benefit sought is less repeated integration wiring and a documented extension boundary for library authors. No customer adoption, maintenance-time saving, FPS improvement or accessibility conformance is established by the current evidence. Keep the current data-plus-wrapper control beside the new example to show the difference honestly.

Deliver one complete additive M11.5 implementation slice, one fresh whole-slice review/repair pass and one final implementation commit. Include strict source/installed declarations, property tests, cost evidence, an internal native Expo example, packed-consumer qualification, docs, iOS Simulator and Android emulator checks. Preserve native/inline execution after written-plan approval. Physical devices, spoken readers, interactive browser acceptance, authored HMR and release-FPS work remain deferred. No push, tag or publication is authorised.

Add no product dependency, version, peer-range, lockfile or Effect 4 pin upgrade. Disposable fixture-package manifests/locks may describe their exact owned installations; they do not replace the product lock. Use the existing qualified dependency installation for execution and restore original roots afterwards; the original primary-linked installation was incomplete at M11.4 closure.

## Chosen approach and alternatives

1. **Type-only module contract plus explicit runtime factory import — selected.** Declare runtime-module types in authoring code; select an actual named factory from that contract. Compilation captures portable data and emits a static named import and call. The runtime implementation is never loaded or executed by the stylesheet evaluator. This keeps native JS out of the build VM and makes consumer parameter/return inference useful.
2. **Value-level factory annotation mirroring vanilla-extract.** Familiar, but the earlier illustrative `factory: createStyledView` value import would load the native implementation into authoring evaluation. React Native runtime code does not belong in that VM. Do not promise a direct `addFunctionSerializer` alias or compatibility with upstream private `__recipe__` metadata in v1.
3. **Data-only descriptors plus a manual runtime wrapper.** Smallest compiler change and the existing alternative remains supported. It leaves application assembly work and does not deliver the selected callable stylesheet export.

The [vanilla-extract function-serializer documentation](https://vanilla-extract.style/documentation/api/add-function-serializer/) establishes the import/name/serializable-arguments reconstruction model. Crumbs adapts that model to native compilation; it does not copy arbitrary function bodies or infer captured closure values.

## Public authoring API

Add the optional `@opsydyn/crumbs-css/extensions` subpath. It exports exactly two values: `defineExtension` and `ExtensionError`. Its public types are `ExtensionConfig`, `ExtensionModule`, `ExtensionFactory` and `ExtensionErrorCode`. Private admission/descriptor/types are not additional public exports.

The proposed library-author setup is:

```ts
// @acme/design-system/authoring.ts
import type * as Runtime from '@acme/design-system/runtime';
import { defineExtension } from '@opsydyn/crumbs-css/extensions';

const native = defineExtension<typeof Runtime>();

export const styledView = native.factory({
  importPath: '@acme/design-system/runtime',
  importName: 'createStyledView',
});

export const themedView = native.factory({
  importPath: '@acme/design-system/runtime',
  importName: 'createThemedView',
});
```

`ExtensionConfig` is exactly `{ readonly importPath: string; readonly importName: string }`. `defineExtension<TModule>()` returns a frozen `ExtensionModule<TModule>` with one method `factory`. `factory(config)` returns an `ExtensionFactory` whose argument tuple and callable return type are taken from the selected runtime export. The two-stage setup fixes the type-only module witness first, then infers the complete config and single import-name literal; it avoids TypeScript partial-generic inference weakening closed-config checks. Declaration machinery preserves fixed monomorphic signatures, including optional argument positions and readonly inputs; it does not promise generic/overloaded signature preservation. Library authors expose a monomorphic facade for those cases.

`factory` requires config.importName to be one statically known string-literal key whose module export is a synchronous callable factory returning a callable function. Reject absent names, default/namespace imports, non-function exports, factories returning numbers/objects/promises, construct-only types, broad string names and union names. Reject `any`/`unknown` or broad-index-signature module contracts, rather than manufacturing apparent export safety. Config keys are closed across every union member. Selecting a factory does not read a runtime namespace object: `TModule` is erased TypeScript information. Invalid module contracts must fail the defineExtension call itself (for example through a never-valued required proof argument), rather than merely returning a never type after an apparently valid call.

The returned authoring factory preserves `Parameters<F>` and `ReturnType<F>` for the supported signature. It accepts the supplied argument values, validates/copies them and creates a callable placeholder carrying the descriptor. It does not invoke `F`. Executing that placeholder in authoring or ordinary uncompiled userland throws `extension.build-only-call`; it is intended to become a runtime function only through `.css.ts` compilation. Calling a factory builder repeatedly creates distinct placeholders; there is no global registry or interning.

Types check factory argument/return contracts. They are not a complete static proof of JavaScript portability: a broad native style type or a library factory accepting `unknown` can describe values rejected at the data boundary. Runtime/compile-time admission remains authoritative. Document this instead of weakening native style types or adding `any` to silence them.

A typed module contract cannot prove that an independently supplied package string denotes the same implementation. Library authors must publish matching types and runtime exports; compiler linkage and installed consumer tests cover the recorded endpoints, without a claim of cryptographic function identity or universal purity.

### Runtime implementation and application use

```tsx
// @acme/design-system/runtime.tsx
import { View, type ViewProps, type ViewStyle } from 'react-native';
import { useThemedStyle } from '@opsydyn/crumbs-css/theme/core';

export function createStyledView(baseStyle: ViewStyle) {
  return function StyledView(props: ViewProps) {
    return <View {...props} style={[baseStyle, props.style]} />;
  };
}

// Mount components from this factory under the existing ThemeProvider.
export function createThemedView(baseStyle: ViewStyle) {
  return function ThemedView(props: ViewProps) {
    const resolved = useThemedStyle(baseStyle);
    return <View {...props} style={[resolved, props.style]} />;
  };
}
```

```ts
// AccountScreen.css.ts
import { viewStyle } from '@opsydyn/crumbs-css/style';
import { styledView } from '@acme/design-system/authoring';

export const AccountCard = styledView(viewStyle({
  padding: 16,
  borderRadius: 12,
  backgroundColor: '#ffffff',
}));
```

```tsx
// AccountScreen.tsx
import { Text } from 'react-native';
import { AccountCard } from './AccountScreen.css';

export function AccountScreen() {
  return <AccountCard accessibilityLabel="Account details">
    <Text>Your account</Text>
  </AccountCard>;
}
```

The literal AccountCard example needs no ThemeProvider. Token-based declarations use themedView and the existing ThemeProvider; useThemedStyle always requires that provider and does not silently fall back to unresolved input. The component retains ViewProps; it does not become an untyped component wrapper. The runtime factory owns prop forwarding, override order, theme reads and React/native behaviour. Crumbs does not synthesise Hooks, behaviours or component governance contracts. The documented sample applies base first and consumer style second; this is the sample's explicit policy, not a change to existing component-recipe extension rules.

The new authoring subpath is independently built ESM/CommonJS with zero runtime externals. It must not import React, React Native JS, Effect, vanilla-extract, Node, compiler or any old runtime entry. Generated consumer modules must not import this authoring entry. Existing exports/subpaths/graphs retain their boundaries; the new entry is not re-exported by existing facades. Canonical declaration generation retains shared type identity.

## Descriptor and argument contract

Each placeholder has an own non-enumerable, non-writable, non-configurable `Symbol.for('crumbs.css.runtime-extension')` data property. Its deeply frozen value has exactly:

```ts
{
  $$type: 'crumbs.css.runtime-extension',
  version: 1,
  importPath: string,
  importName: string,
  args: readonly unknown[],
}
```

The symbol is a cross-copy protocol selector, not a security capability or global registry. Descriptor admission checks the whole shape/version at compiler ingress, independently of helper/package identity. Ordinary tag-shaped records never become executable exports: only a function carrying this valid own protocol descriptor enters the new branch. Upstream `__recipe__` functions and unmarked functions retain the existing unsupported-export error. Extra properties/symbols or accessors added to the placeholder are unsupported; only its standard intrinsic name/length and this protocol property are admitted. Do not read, stringify, execute or serialize the placeholder body.

Arguments admit `null`, `undefined`, booleans, finite binary64 numbers including signed zero, strings, dense standard arrays, and Object/null-prototype records of own enumerable string-keyed data. Preserve explicit undefined fields/array entries, signed zero, null prototypes and safe own prototype-like keys. Reject accessors without invocation, symbols, bigint, functions, promises, class instances, sparse/decorated arrays, hidden fields, custom prototypes and cycles. Shared acyclic input may be copied more than once; alias identity inside ordinary argument data is not promised. Caller objects are neither mutated nor frozen.

Copy ordinary arguments to deeply frozen snapshots before publishing the placeholder. The compiler evaluator's ordinary Object/Array realm is explicitly supported by a private descriptor-safe copying bridge. Arbitrary Proxy traps and unrelated cross-realm prototypes remain outside the contract; do not promise trap-free handling of arbitrary objects.

Recognise actual native class handles only against the compilation-local style-handle inventory, then lower through the existing native IR/composition/property-domain path. Unknown ordinary strings remain strings and ordinary extension/class tag-shaped records remain data. The following existing local-operand placement restriction is an explicit exception: local variable/fallback/assignment/style-plan operands are not supported inside extension arguments in v1 and must fail explicitly, including nested placement; their current standalone APIs remain unchanged. This slice adds no new interpretation of expression, recipe, container, motion or token-algebra descriptors: ordinary admitted data retains its existing meaning, and no executable descriptor dispatch is introduced.

At emitted module construction, native style references must become fresh frozen argument snapshots without mutating/freezing the existing shared style table or existing exports. A small generated private snapshot helper may copy the already-lowered values once; it must preserve the same ordinary-data semantics. No snapshotting, descriptor validation or reconstruction runs per component render. All styles and arguments are admitted before publishing a result; no partial function export is emitted on failure.

### Semantic resource limits

Per factory invocation: at most 16 supplied arguments, 32 nested containers from the args root, 4,096 visited values, 256 entries in any array or record, 128 UTF-16 code units per record key, 16,384 per individual string and 65,536 aggregate string/key code units. Shared values count at each copied occurrence. Count raw and lowered native argument data so a short handle cannot hide unbounded expanded data.

Per generated module: at most 128 unique placeholders and 32 distinct `(importPath, importName)` pairs. These are admission limits, not performance budgets. Empty arrays/records and zero-argument factories are admitted. Fail deterministically with `extension.resource-limit`; never truncate, silently omit values or return partial output.

## Explicit imports, compiler capture and emission

v1 accepts bare package names and package subpaths only. Package segments use lowercase npm-style ASCII names; scoped names have `@scope/name`; package identity is at most 214 code units. Subpath segments use ASCII letters/digits/dot/underscore/hyphen and may not equal `.` or `..`. The complete path is at most 512 code units. Reject relative/absolute paths, aliases, backslashes, URLs, Node built-ins, whitespace, query/fragment text, encoded path escapes and empty segments. A private application's named self-reference may expose its dogfood runtime entry without a new dependency or product-lock change.

Factory names are ASCII binding identifiers, at most 128 code units, and exclude the current compiler's reserved-binding names. Named imports only; no default import, property-expression evaluation, dynamic import or raw source fragments.

The compiler collects runtime endpoints after descriptor capture and verifies static named linkage using existing compilation/resolution tooling, without importing/evaluating the runtime module in the authoring VM. Record the relevant package-export/configuration conditions, manifest bytes and logical/canonical resolution identities. Reject unresolved or statically unverifiable endpoints. Dynamically manufactured CommonJS export names are outside this v1 linkage contract. Do not invent a new resolver that disagrees with the supported consumer conditions; qualification must exercise the actual ESM/CommonJS/Metro paths.

Named runtime imports are sorted/deduplicated by code-unit lexical `(importPath, importName)` order, use collision-free private aliases and quote strings through the existing serializer. A compilation-local function-identity map assigns deterministic IDs on code-unit-sorted named exports, numeric array traversal and preserved authored record-key order. Repeated aliases of the same placeholder reconstruct exactly once and refer to the same result; distinct placeholders with identical arguments remain distinct. Cross-independently-compiled-module singleton identity is not promised.

Each unique placeholder reconstructs once per normal runtime module evaluation after native style creation and argument snapshotting. Call the imported factory with `this=undefined` and the supplied positional arguments, preserving omission versus explicit undefined. Generated private guards check that the imported value and returned value have function shape. Factory-thrown exceptions propagate unchanged; do not catch them into a successful export or retry the factory. Runtime libraries are trusted application code, not sandboxed plugins, and must honour the declared synchronous factory contract.

Generated boundary failures are ordinary TypeErrors with a stable own `code` and bounded logical export path. Authoring failures use `ExtensionError`; consumers should inspect codes instead of relying on instanceof across generated modules or installed copies. No consumer import of the authoring entry is needed to construct an error. No public runtime registry, dispatcher or additional runtime-support subpath is added.

Compiler capture/ownership visitors inspect descriptor args for real style ownership and diagnostics, never import-path/name strings as style references. Keep existing native-module/manifest/artifact versions unchanged. The native module's global token inventory retains tokens in captured argument styles; its executable dependencyPlan must not contain invented object paths beneath opaque returned functions. Runtime factories use existing theme Hooks on captured styles. Existing useThemedStyles does not resolve captured closure state.

Existing tooling reports the callable return as opaque/unresolved through the current unresolved-reference schema, identifying module/export/runtime endpoint. Captured argument origins may inform diagnostics, but they are not proof of the arbitrary factory result's rendered capabilities, dependencies or governance conformance. Style explanations retain this limit. Existing ordinary styles and reports remain unchanged; no new public manifest/codec version is introduced.

Authoring inputs baked into args keep existing dependency/hash invalidation. Runtime implementation bodies are ordinary Metro imports, not eagerly executed/baked compiler inputs. Endpoint resolution/configuration/link changes must invalidate relevant compiler receipts; runtime body edits follow the actual runtime module graph. Side-effect import strings alone do not establish either behaviour. Preserve fresh compilation and existing cache admission/defaults.

## Errors and compatibility

`ExtensionError` extends Error, has name ExtensionError, a readonly `code: ExtensionErrorCode` and readonly bounded logical `path`. Public codes are exactly `extension.invalid-config`, `extension.invalid-argument`, `extension.resource-limit`, `extension.build-only-call`, `extension.unsupported-version`, `extension.unresolved-import`, `extension.invalid-factory` and `extension.invalid-result`. Invalid JavaScript constructor codes normalise to extension.invalid-config without stringifying arbitrary inputs. Paths include safe field/argument locations and are escaped/bounded to 256 code units; messages do not echo arbitrary argument values.

Compiler rejection retains `CRUMBS_CSS_UNSUPPORTED_EXPORT` with source file/export path and the specific extension reason/code. Keep the old diagnostic-code value inventory intact; do not add an unconditional runtime import or fallback emission for unsupported metadata. Static linkage failure and emitted invalid-factory/result guards use the corresponding stable code. Old unmarked function exports remain rejected, and all old entry values/types retain their meanings.

No arbitrary closure capture/serialization, React.memo/forwardRef object exports, async factories, higher-order function arguments, dynamic registries, new theme authority, plugin loading, whole-function static analysis, automatic parameter codecs or changes to existing expression/artifact protocols are included. Factories and their libraries own their runtime dependencies; inspect actual fixture graphs and retain current compiler/Effect/Node denials without claiming complete analysis of arbitrary dynamic user code.

## Qualification, cost evidence and product acceptance

- **Types:** exact module/config keys across unions; known single factory names; no broad/any module witness; matching parameters, optional arguments and callable return/component props. Named compile errors for bad arguments/props, absent/non-factory/default/union names and invalid configs. Broad native data still receives ingress validation. Verify source plus installed Node16/Bundler declarations and unchanged old surfaces; use adapters for generic/overloaded factories.
- **Admission:** descriptor/getter/prototype/key/tuple/cycle/quota mutations with zero getter invocation; every limit boundary and one-over cases, null-prototype/prototype-like keys, undefined/negative-zero preservation, source mutation after capture and unsupported nested local operands. Cross-copy placeholders/descriptors and the known evaluator realm work without a registry.
- **Compiler semantics:** independent reference imports/factory calls over generated plain data; style compositions/primitives/theme operands stay faithful. Repeated alias equality, distinct invocation inequality, nested ordinary exports, decorated/spoofed/tag/upstream metadata rejection, unsupported versions, collision/injection strings, deterministic bytes and no source-body emission. A runtime-module top-level throw/sentinel must prove the authoring VM never loads it.
- **Runtime semantics:** actual compiled module factory counts are one per unique placeholder; omission/undefined, frozen snapshots and original-style-table preservation. Return/factory-shape failures are stable, user exceptions propagate once and no per-render reconstruction occurs. Props/children/style precedence match an independently handwritten native wrapper; theme updates come through useThemedStyle and do not replace component identity. Hooks/refs/event behaviours are only those actually supplied by the runtime implementation.
- **Property tests:** seed 20261009, at least 200 bounded generated cases per law with independent data/factory expectations. Preserve specified data meaning, canonical emission, unchanged old outputs, alias/invocation semantics and unrelated-input independence. Keep minimized counterexamples and named regressions. No claim of serializing arbitrary functions, JSON round trips for undefined/-0, cross-module singleton identity or factory purity.
- **Distribution:** record the unchanged old built value inventory; independently packed library and authoring/runtime fixture package with explicit published runtime exports. A consumer installs the exact tarballs without source-workspace access. Verify actual ESM-first/CJS-first load traces, generated named-import linkage, two physical helper copies, genuine Node 22.0.0/current supported Node pure probes without React/native/Effect peers, installed types/integration and real iOS/Android/web Expo exports. Native factory code is exercised in Expo, not misrepresented as directly executable React Native code in Node.
- **Dependencies:** fresh source/arg changes, package-export retargeting and owned symlink/configuration changes reject stale receipts. A real stock-Metro bundle edit verifies an explicit runtime body dependency, restores source and records the changed bundle identity; this is bundle graph evidence, not authored-HMR or native live-reload acceptance. Existing transformer-cache/default policies and denial gates remain unchanged.
- **Native reference:** one shared public-API-only panel used by Storybook/playground and the packed consumer. Show compiled factory and handwritten View controls side by side; forward props/children, exercise two static foundations, actual theme scope changes, consumer overrides and unrelated state. Check colour/layout agreement, actual native interaction/prop behaviour used by the sample, stable factory/component lifetime, and real font preference/layout increase/restoration. Include owned iOS/Android targets, directly inspected current images, exact installed/native/map/source bindings and complete preference/process/mapping/dependency cleanup. Freeze final artifacts before native checks and refresh affected bindings after a review repair.
- **Internal wiring:** expose the private Storybook runtime endpoint by its own package self-reference, with source-only private export wiring. The packed fixture uses its own independently packed runtime package. Keep the shared runtime/panel semantics identical and record the deliberate import-path differences. Do not add a workspace dependency or edit the product lock to make a hidden local package resolve.
- **Cost:** two fresh consumed samples for compilation of 1/32/128 placeholders (repeated and distinct endpoints within the 32-pair quota), generated raw/gzip bytes, one-time argument snapshot/reconstruction work and import versus first use; compare the handwritten wrapper. Add a bounded type fixture with 100 factory exports and 1,000 invocations without a Cartesian type union. Identify tool/process versions and retained outputs. No new numeric performance limit, render/FPS claim or causal improvement conclusion is inferred.
- **Host budgets:** use the unchanged matched 21-row collector and verified baseline Expo/Metro environment, separate from packed native peers. Retain exact source/artifact/policy/measurement identities and honest failed rows. Existing warm-transform and historical incremental dispositions remain under M10.5. Any new blocking failure needs explicit disposition; no timing chase or implicit waiver.
- **Docs and final record:** runnable library-author/application examples, type-only setup rationale, data/style/snapshot/identity/theme/import limits, supported versus unsupported exports, package matrix and migration-free opt-in. Whole suite/strict checks, final review, one Important repair pass, original roots/settings restoration, explicit authorised-file staging and byte/commit/clean-state checks. Preserve failed/superseded evidence separately from accepted final cohort.

The product success case is an application declaring and importing a typed styled native component without writing a per-component wrapper, while the reference control confirms equivalent behaviour. Record the actual setup/wiring difference; time saved/adopter demand remain unknown. No standalone two-hour spike is mandated by this choice: the direct user chose delivery, and the implementation plan must bound effort around this one workflow rather than add a general plugin platform.

## Expected affected areas and handoff

New authoring/model/admission/error files under `packages/css/src/extensions/`; independent package/tsdown declarations and graph audit. Compiler changes are limited to `export-values.ts`, `transformer.ts`, capture/emission/ownership/dependency/metadata/tooling visitors and private extension linkage/snapshot support. Keep unrelated theme-runtime extraction out of scope.

Tests cover the new source/installed types, portable data/compiler/emission/runtime laws and old ordinary-export/isolation/metadata behaviour. Add a packed extension-library fixture, installed controls, qualification/ownership scripts, the shared internal native example and focused benchmark/type fixtures. Private app export wiring, package README/COMPATIBILITY, docs guides/references/sidebar, assessment/evidence/roadmap complete the slice.

This spec is the concrete written review artifact. After written-spec approval, use writing-plans to prepare a self-contained native/inline plan with testable internal checkpoints and one final implementation commit. Written-plan review precedes execution; do not ask again for the already-selected execution method. After M11.5, recommend **M10.5 release closure**, preserving existing budgets and the separate exact release-artifact/publication gates. M11.6 integrations remain parked.
