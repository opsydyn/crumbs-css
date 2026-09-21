# @opsydyn/crumbs-css native compatibility matrix

`@opsydyn/crumbs-css` intentionally implements a React Native subset of
vanilla-extract authoring. It is not a browser CSS runtime.

## Validated native baseline

The current workspace/packed consumer baseline is:

- Expo SDK 56
- React 19.2
- React Native 0.85

When the Storybook consumer app is installed with Bun, `expo-doctor` may still
report duplicate Expo packages from Bun's `.bun/` symlink layout even when the
duplicate versions are identical. Treat that remaining warning as advisory until
Expo Doctor and Bun converge on the same install model.

The package currently declares `react-native` peer compatibility as
`>=0.85 <0.86`. Earlier React Native baselines should not be assumed supported
unless they are exercised explicitly in a future compatibility pass.

## Coverage and qualification

| Check | Coverage | Absence / limitation |
| --- | --- | --- |
| Required package-owned consumer fixtures | Themed styles, variant maps, recipes, web object emission, project-relative filenames and local theme imports; emitted native values are evaluated in the transformer tests. | Missing fixture projects/files or directory impostors fail with the required fixture path. These checks never depend on an optional application checkout. |
| Host Bun benchmarks | Six runtime scenarios and first/warm transforms for two required fixtures; five retained host runs. | Explicit batch-mean quantiles/raw samples; seven retained host smoke ceilings, three new unbudgeted scenarios. Pre-resolved theme selection is not a recipe cache hit; React memo reuse/lifecycle and device tails remain unmeasured. See [measurement repair](../../docs/assessments/2026-09-14-benchmark-workloads.md). |
| Production Expo bundle qualification | Workspace and isolated packed consumers retain iOS, Android and web source maps and reject compiler code and Effect sources in ordinary runtime bundles. | This is JavaScript bundle/type qualification, separate from native startup and device rendering. See the M0.7 retained evidence in the repository roadmap. |
| iOS native functional acceptance | Retained playground/Maestro reports cover the documented simulator journeys. | Not rerun by package tests or host benchmarks; no physical-device or release-performance claim. |
| Android native acceptance | Not run; user deferred it until last. | Android production JavaScript exports do not qualify native Android behavior. |
| Expo list lifecycle/memo workloads | Five-cycle static/themed mount/rerender/local-theme-switch/unmount probes at 25/100/1,000 rows; actual web receipts. | Instrumented effect/reference checks and optional React Profiler work; not scroll, native rendering, frame, leak or release-budget qualification. [Protocol](../../docs/assessments/2026-09-14-expo-list-workloads.md). |
| Native/device performance | Not run by this harness; reported explicitly as `not-run` with a reason in benchmark JSON. | Hermes, rendering/frame time, memory and device measurements require separate qualification. |
| Effect emitted loading and host initialization | Current transformer/theme and a private bundled initial-contract candidate load from ESM/CommonJS on exact Node 22.0.0 and Node 24.15.0; 60 fresh-process samples and direct graphs retained. | External Effect CommonJS fails on Node 22.0.0, so tooling bundles Effect. No public external-theme decoder exists; its footprint remains unqualified. Host timings are not device budgets. |

Compiler fixtures live under `packages/css/fixtures/consumer`, with a shared required-file admission check used by tests and benchmarks. They are test assets and are excluded from the published tarball. Removing an application directory cannot turn these scenarios into silent passes. Optional native capabilities remain visibly unqualified; they are not substitutes for mandatory compiler coverage.

## Internal Effect dependency

The package pins `effect@4.0.0-rc.115` as its own implementation dependency; consumers do not add an Effect peer dependency or use services/runners. This is an ESM prerelease. Its APIs and initial internal shape/data codecs are qualified without migrating production Crumbs validation or changing public entrypoints/types. [Initial contract policies](../../docs/assessments/2026-09-14-internal-payload-contracts.md) distinguish shape validation from native property/token-domain admission and published artifact compatibility. Ordinary runtime artifacts remain React-only. [Exact selection and limits](../../docs/assessments/2026-09-14-effect4-api-selection.md) distinguish installed dependency size, current Node interoperability, and the [emitted boundary audit](../../docs/assessments/2026-09-14-effect-boundary-audit.md) and remaining decoder/device measurements.

## Runtime dependency boundary

Import application runtime APIs from `@opsydyn/crumbs-css/theme` (or its existing `dist/theme` alias). Both ESM and CommonJS runtime artifacts depend externally only on React; their emitted graph contains no Node built-ins, authoring entrypoints, esbuild, vanilla-extract integration or CSS conversion code. Shared tags are pure data. One declaration graph preserves nominal token types across authoring and runtime entries.

The package root, `/style`, Metro plugin and transformer are build-time entrypoints and can require Node/compiler dependencies. Runtime isolation does not remove those installed package dependencies or make authoring modules safe to import into application bundles. Regenerate compiled styles and use the theme subpath in runtime code. Production Expo checks inspect retained iOS, Android and web source maps; native/device performance remains separate qualification.

## Supported

| Feature | Status | Native behavior |
| --- | --- | --- |
| `style({...})` | Supported subset | Compiles flat declarations and the static native structured subset below to `StyleSheet.create`. |
| Crumbs `style([base, extra])` composition | Supported subset | Later authored entries win for the same canonical native property; multiple/repeated bases and nested arrays preserve order. Primitive helpers and `styleVariants` accept compositions. Physical padding/margin, gap and border width/color/radius normalize identically for tokens and literals. Other shorthand families remain unqualified. |
| `styleVariants({...})` | Supported | Exports a nested map of explicit native state styles. |
| `recipe({...})` | Supported | Exports native-first base, variants, defaults, and compound variants for explicit runtime selection. |
| `createRecipeResolver(recipe)` | Supported | Creates a typed component-facing selector that delegates to `resolveRecipeStyle` so ordering, fallback behavior, and diagnostics stay centralized. |
| React Native view/text/image style props | Supported | Converted through `css-to-react-native` where needed. |
| numeric values | Supported | Preserved as native numbers. |
| `@opsydyn/crumbs-css/style` typed helpers | Supported | `viewStyle`, `textStyle`, and `imageStyle` accept token-aware React Native style inputs and avoid userland `as unknown as TextStyle` casts. |
| `createThemeContract` / `createTheme` | Supported | Produces exact typed theme contracts and token maps. |
| `var(--crumbs-...)` native theme tokens | Supported | Serialized as `crumbs.css.theme-token` references. |
| `ThemeProvider` / `useThemedStyles` | Supported | Resolves token references against the active native theme. |
| `createThemeDependencyPlan` / `createThemeDependencyResolver` | Supported | Consumes compiler-emitted path/token metadata and reports selective pure-resolution work; React subscriptions and native render claims remain separate. |
| Structured values in runtime styles | Supported at resolution | Transform arrays/order, shadow offsets, font variants, filters, shadows, background arrays and opaque native values retain their shape/reference and scalar siblings. Static marked subsets have separate `.css.ts` compiler contracts. |
| Static native structured authoring | Supported subset | `transform` arrays and numeric `shadowOffset` / `textShadowOffset` bypass CSS serialization. Order and whole-value composition replacement survive both object and StyleSheet emission, imported bases, helpers, variant maps and recipes. |
| Metro dependency imports | Supported | Side-effect imports keep hot reload aware of dependent `.css.ts` files. |
| Ordinary named `.css.ts` exports | Supported data subset | Strings, finite numbers (including negative zero), booleans, null, undefined, dense arrays and plain/null-prototype records preserve their data values. Unsupported values fail explicitly. |

Crumbs composition is ordered native authoring, not a browser cascade. It captures inline declarations separately and retains repeated bases: `style([a, b, a])` applies `a` again after `b`. Physical padding/margin, their horizontal/vertical aliases, gap, physical border widths/colors and corner radii normalize before merging, so later token or literal declarations replace overlapping longhands. Direct `@vanilla-extract/css` compositions retain upstream class-list processing and do not carry the same authored-order guarantee. Use Crumbs helpers for ordered native composition.

**Alpha artifact migration:** compiled spacing styles now expose canonical physical sides (`paddingTop`/`Right`/`Bottom`/`Left`, and margin equivalents); horizontal/vertical aliases expand to two sides, and `gap` expands to `rowGap`/`columnGap`. This also applies to token-backed values. Pass the complete style to React Native rather than inspecting a shorthand field on the compiled artifact. Regenerate dependent compiled modules together; composing older shorthand artifacts with newer longhands is not qualified. Raw runtime styles are not normalized by the theme resolver. Multi-value literal CSS padding/margin remains supported. Side compound forms and mixed multi-value token expressions remain outside this spacing normalization contract.

**Alpha border migration:** compiled `borderWidth` and `borderColor` now always expose four physical side properties, including token references and the outputs of a literal CSS `border` shorthand. Literal multi-value width/color shorthands keep their per-side values; later broad or side declarations win before composition merging. A literal `border: "2px solid red"` retains its existing global `borderStyle` field while its width/color expand to sides. Completely overridden missing width/color tokens are not resolved; partially surviving tokens still require theme values. Regenerate dependent artifacts together; mixed old shorthand and new longhand artifacts are not qualified. Pass the complete style to React Native instead of inspecting `borderWidth`/`borderColor` on compiled output. Raw runtime styles keep native behavior and are not canonicalized by the resolver.

This width/color contract covers physical sides only. Start/end fields retain the distinct native precedence described below; side-specific compound borders are rejected under the admission rule below. Existing strict diagnostics still reject unsupported side border-style output or token expressions embedded in compound CSS values; no runtime direction mapping, side-style support or semantic token-domain validation was added.

**Alpha radius migration:** compiled `borderRadius` expands to `borderTopLeftRadius`, `borderTopRightRadius`, `borderBottomRightRadius` and `borderBottomLeftRadius` for both tokens and literals. Later broad/corner declarations win before merging. Multi-value literals, percentages and zero retain their values; only surviving tokens are resolved. Regenerate dependent artifacts together and pass complete styles to React Native rather than inspecting a compiled `borderRadius` field. Mixed old shorthand/new corner artifacts remain unqualified; raw runtime styles retain native behavior. Logical corner fields retain the distinct native precedence described below. Elliptical CSS radii and embedded multi-value token expressions retain existing strict rejection.

**Alpha flex migration:** compiled numeric `flex` is now preserved as a native field, including negative values and zero, identically to a Crumbs token. It no longer creates CSS `flexGrow`/`flexShrink`/`flexBasis` defaults. Explicit sibling fields survive in either authored order; later declarations replace only the same native field. Yoga determines their combined layout semantics. Completely overridden same-field tokens are not resolved, but a surviving `flex` token still requires its value even if explicit siblings exist. Token value-domain validation remains future work.

Generic inline authoring now requires numeric `flex` or a branded Crumbs token, matching primitive helpers. CSS keywords (`auto`, `none`, `initial`), multi-part strings, lengths, percentages and nonfinite literal flex values are rejected by strict compilation with `CRUMBS_CSS_DROPPED_DECLARATION`; permissive conversion drops them. Migrate CSS shorthand intent to explicit native grow/shrink/basis properties. Regenerate dependent compiled artifacts together: mixing old CSS-expanded numeric flex artifacts with new native fields is unqualified. Runtime resolution does not rewrite raw styles. Native layout and web layout retain their platform semantics; compiler parity does not establish cross-platform visual parity. See [React Native flexbox](https://reactnative.dev/docs/flexbox).

**Alpha spacing-alias migration:** Crumbs normalizes `paddingInline`/`marginInline` to physical left/right and `paddingBlock`/`marginBlock` to top/bottom before merging. `BlockStart`/`BlockEnd` normalize to top/bottom; `InlineStart`/`InlineEnd` normalize to native `Start`/`End` fields. Later declarations win for the same canonical field across aliases, rules and compositions. This is Crumbs ordered authoring: raw React Native aliases have fixed native precedence/fallback rules, so these two authoring modes do not promise identical alias winners. Single finite dimensions, percentages, `auto` and branded tokens retain the existing native-value subset; multi-value CSS aliases are rejected by generic inline types and strict compilation, or dropped by permissive conversion. Use separate side properties for multiple values.

Logical `Start`/`End` spacing, border widths/colors and all eight native logical corner radius names stay distinct from physical fields. Crumbs does not map direction or make later physical/logical fields override each other. In the installed React Native 0.85.3 Fabric/Yoga source, logical spacing and border widths take precedence on their mapped horizontal edge; rendered border colors/radii prefer explicit physical fields, and top/bottom start/end radius names precede start/start etc. Broad border color/radius normalization fills physical fields, so surviving logical colors/radii do not override those corners/edges. Source-grounded tests specify preservation and selected precedence cases; native appearance, RTL settings and web visual parity remain separate qualification. All surviving tokens still require values, including fields masked by native precedence.

Four already-typed `borderStartStartRadius`, `borderStartEndRadius`, `borderEndStartRadius` and `borderEndEndRadius` declarations now pass compiler admission for literals and tokens. Regenerate dependent compiled artifacts together; mixed old alias/new canonical artifacts remain unqualified. Pass complete styles to React Native. Raw runtime styles and their native alias rules are unchanged. No runtime RTL mapping or browser writing-mode support was added. Side compound borders are rejected under the admission rule below. See [React Native layout aliases](https://github.com/react/react-native-website/blob/main/docs/layout-props.md).

**Alpha inset migration:** compiled `inset` expands to physical top/right/bottom/left, `insetInline` to left/right, and `insetBlock` to top/bottom. BlockStart/End normalize to top/bottom; InlineStart/End normalize to native `start`/`end`. Tokens and literals normalize before merging, so later broad/pair/side declarations replace the same canonical field across rules, nested/repeated compositions, primitive helpers, variants and recipes. Negative/zero offsets, percentages and `auto` remain single native values. Logical start/end fields stay distinct from physical sides; native Yoga handles their direction-dependent precedence.

Generic inline authoring now matches primitive helpers for all seven inset aliases: one native dimension or branded Crumbs token. Multi-value CSS strings, expressions, unsupported units and nonfinite literals fail strict compilation with `CRUMBS_CSS_DROPPED_DECLARATION`; permissive conversion drops them. Use explicit native sides for multiple values. Completely overridden same-field tokens are not resolved; partially surviving tokens and distinct surviving logical fields still require theme values. Token value-domain validation remains future work.

Regenerate dependent compiled artifacts together and pass complete styles to React Native. Mixed old inset alias/new canonical artifacts remain unqualified. This is Crumbs ordered authoring; raw React Native aliases retain their native priority/fallback rules and can produce different winners. Runtime styles remain unchanged. Inset aliases target the supported React Native New Architecture baseline; no browser writing-mode or runtime RTL mapping was added. Source-grounded compiler tests do not qualify native layout, device RTL settings or native/web visual parity. See [React Native inset reference](https://github.com/react/react-native-website/blob/main/docs/layout-props.md).

**Side-border admission:** generic inline rules and nested compositions now reject physical and Inline/Block side compound borders and their side-style fields. Strict compilation emits `CRUMBS_CSS_DROPPED_DECLARATION` with migration guidance and source/export context. Permissive conversion retains its existing behavior: the whole unsupported declaration is dropped while valid siblings remain. This applies to literals and tokens, including JavaScript that bypasses typechecking. CSS side-style fields do not acquire native support by resolving a token.

Use explicit side width/color properties and the global `borderStyle` where the primitive supports it (View/Text). Image helpers retain their own narrower native property set. Literal broad `border` remains supported by generic authoring and keeps its physical width/color plus global style output. Direct upstream vanilla-extract inputs still receive native compiler diagnostics; Crumbs types do not rewrite upstream types. Replace unsupported side declarations before upgrading. No runtime behavior, compiled supported-style shape, dependency or new public API changes; no per-side border-style support or RTL mapping was added.

Runtime resolution treats native structured property values as opaque values, replaces them as whole values in ordered arrays, and resolves top-level token references only. It never evaluates animated nodes or recursively resolves nested token references. Primitive-specific view/text/image outputs survive direct resolution, hooks, namespace resolution and typed style arrays.

Native token references require exactly two own enumerable data fields: `$$type: "crumbs.css.theme-token"` and a string `varName` matching `--crumbs-[A-Za-z0-9_-]+`. Plain objects (including JSON-decoded and null-prototype objects) are accepted; arrays, inherited fields, accessors, extra fields and invalid names are rejected. The boolean guard returns false without executing accessors. Constructors and resolution of invalid tagged values fail with `CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE`. Accessor tags are treated as invalid candidates rather than evaluated. Resolution validates surviving top-level values after composition, so overridden invalid references and opaque nested values are not evaluated. Active theme lookup requires an own token property; absent or inherited tokens fail with `CRUMBS_CSS_MISSING_THEME_TOKEN`. These checks do not validate complete theme/artifact schemas or token semantic domains.

**Alpha token migration:** regenerate old or extended reference payloads into the exact data shape above. Metadata belongs outside the reference DTO; token names cannot contain whitespace, punctuation other than hyphen/underscore, or an empty suffix. Missing-token diagnostics now carry a stable code.

### Primitive references and generic composition types

`style` and `styleVariants` admit complete view/text/image style references, including valid view/text `overflow: "scroll"`, directly and through nested or repeated compositions. Results retain each referenced primitive type through theme resolution and hooks; variant entries infer independently. Literal-only generic rules retain the legacy `NativeStyle` return type. Mixed primitive references produce a conservative union, not an intersection claiming every primitive property.

Generic `NativeStyle` references support direct `style(base)` and direct `styleVariants({ state: base })` entries, as well as nested/repeated compositions. Results retain `NativeStyle`; View/Text/Image reference results retain their existing primitive inference. Inline overrides still require static authoring values, including transforms, while supported CSS border shorthand remains available with generic references. Complete native interfaces identify references structurally; this does not establish runtime provenance or permit compiling arbitrary animated native values. [Repair qualification](../../docs/evidence/2026-09-14-direct-generic-references/qualification.json) supersedes the known type gap in the historical closure audit.

Primitive references anchor inline overrides to their native property/value set, including nested generic compositions. Incompatible text/image fields on a view composition, invalid values, arbitrary browser class strings and direct inline animated transforms remain type errors. Existing primitive helpers keep their own inline checks. Complete native interface types identify structural references; no nominal/phantom brand or runtime marker is added. This does not validate provenance or make raw animated declarations compilable; actual compiler admission still applies.

**Alpha type migration:** keep references in their primitive types instead of widening them to `NativeStyleRule`. Intentional widening selects the legacy generic contract and erases the primitive distinction. Generic forwarders can explicitly select that contract with `style<NativeStyleRule>(rule)` or `styleVariants<Record<string, NativeStyleRule>>(rules)`. The default reference type in `NativeStyleComposition` is now the primitive union; use its second type parameter for a target-specific composition alias when needed. Regenerate declarations together and retain target-specific annotations when consuming native props. Recipe input/selection APIs remain unchanged.

### Legacy contract ownership

The pre-M3 `createThemeContract` API remains path-scoped for migration. A token's owner is its exact raw path (the array of unsanitized key segments). Identical paths may be reused across contract definitions and produce independent theme value maps. Different paths that sanitize to the same `--crumbs-…` name fail with `CRUMBS_CSS_THEME_TOKEN_COLLISION`; registration validates the whole contract before publishing any metadata. Failed definitions cannot overwrite an existing owner or leave partially registered tokens. Exposed token paths are frozen.

`createTheme` requires registered leaves at their owning paths. Relocated, unregistered or invalid leaves fail with `CRUMBS_CSS_INVALID_THEME_CONTRACT`; they are never silently skipped. Generated contracts preserve own prototype-like keys. Clones at identical paths can reuse already registered tokens, but decoded contracts must be rebuilt in the owning authoring module when that registry is absent.

The legacy registry is shared across Crumbs package copies in one JavaScript realm, but exact-path reuse still deliberately shares legacy token identity. It does not establish provider compatibility or make unscoped tokens safe to exchange across independently versioned packages. Namespace legacy contract roots by design system/package, avoid sanitizer collisions, and regenerate dependent artifacts after changing paths. Use the identified domain contract API below for distributed design-system packages.

### Legacy token migration boundary (M3.7)

`createThemeContract` and `createTheme` remain a bounded compatibility path for
pre-M3 consumers. `ThemeValues<TContract>` and `NativeThemeValue` intentionally
retain the permissive `string | number` value shape, so an existing colour,
length, enum or other native value keeps working while its contract is being
migrated. Legacy values are opaque to the domain validator; this path does not
claim semantic token safety.

Keep those references with the contract that created them and resolve them with
the ordinary `ThemeProvider`/`useTheme` pair:

```tsx
const legacyVars = createThemeContract({color: {accent: null}})
const legacyTheme = createTheme(legacyVars, {color: {accent: "#2463eb"}})

<ThemeProvider theme={legacyTheme}><LegacyScreen /></ThemeProvider>
```

The legacy token DTO contains only its native variable name. Its path metadata
is an authoring-time registry detail, so a value copied from another package or
deep-cloned contract cannot prove provider ownership. Exact raw-path reuse is
kept for source compatibility, but it is not a cross-package compatibility
promise. Do not cast a legacy token into a domain contract or use a legacy token
as an external payload key.

Move a distributed design system to `createTokenContract` with explicit domains
and a stable identity, create themes with `createTokenTheme`, and use
`TokenThemeProvider`/`useTokenTheme`. A domain contract records token ownership
at construction and theme creation rejects a leaf from another domain contract.
Runtime resolution applies the same check: an old `var(--crumbs-…)` reference
under an identified theme fails with
`CRUMBS_CSS_TOKEN_THEME_TOKEN_CONTRACT_MISMATCH` instead of silently reading a
flat value with the same name. Legacy themes continue to resolve their own
references so applications can migrate one contract at a time.

### Domain token contracts and layered aliases (M3.1–M3.3)

Use `@opsydyn/crumbs-css/tokens` for new domain-aware contracts:

```ts
import { createTokenContract, defineToken, getTokenId } from "@opsydyn/crumbs-css/tokens"

export const vars = createTokenContract({
  color: { accent: defineToken("color") },
  space: { md: defineToken({ kind: "length" }) },
  display: { mode: defineToken({ kind: "enum", values: ["flex", "none"] as const }) },
})
```

Packages that distribute a contract should provide an explicit stable identity:

```ts
export const vars = createTokenContract({
  color: { accent: defineToken("color") },
  space: { md: defineToken({ kind: "length" }) },
}, {
  identity: { owner: "@acme/tokens", name: "foundation", version: 1 },
})
```

`getTokenId(vars.color.accent)` then returns the deterministic public ID
`@acme/tokens/foundation@1#5:color/6:accent`. The generated native variable
name is package-scoped and contains no evaluation-order counter or random
suffix. Re-evaluating the same contract during hot reload, or loading a
duplicate package copy with the same identity and shape, produces the same
IDs. The same path under a different identity produces different IDs. Reusing
an identity for a different path/domain shape fails with
`CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION`.

Bind identified themes through the contract-aware runtime entrypoint:

```tsx
import { TokenThemeProvider, useTokenTheme } from "@opsydyn/crumbs-css/theme"
import { createTokenTheme } from "@opsydyn/crumbs-css/tokens"

const theme = createTokenTheme(vars, { color: { accent: "#224466" }, space: { md: 8 } })

function Screen() {
  const active = useTokenTheme(vars)
  return <View style={{ backgroundColor: active.values.color.accent }} />
}

export function App() {
  return <TokenThemeProvider contract={vars} theme={theme}><Screen /></TokenThemeProvider>
}
```

`TokenThemeProvider` and `useTokenTheme` compare both the stable identity and
the contract-shape signature. A generic hook assertion cannot make an
incompatible provider valid. Unidentified legacy contracts continue to use
the ordinary `ThemeProvider`/`useTheme` migration path.

### Layered aliases (M3.3)

Use `defineAlias` (or its concise `alias` spelling) to connect foundation,
semantic and component tokens by exact contract paths:

```ts
import {
  createTokenContract,
  createTokenTheme,
  defineAlias,
  defineToken,
  getTokenOrigin,
} from "@opsydyn/crumbs-css/tokens"

export const vars = createTokenContract({
  foundation: {
    color: { blue500: defineToken("color") },
    space: { md: defineToken("length") },
  },
  semantic: {
    accent: defineAlias("foundation.color.blue500"),
    controlGap: defineAlias(["foundation", "space", "md"]),
  },
  component: {
    button: { background: defineAlias("semantic.accent") },
  },
}, {
  identity: { owner: "@acme/tokens", name: "layers", version: 1 },
})

const theme = createTokenTheme(vars, {
  foundation: { color: { blue500: "#2463eb" }, space: { md: 8 } },
})

getTokenOrigin(vars.component.button.background)
```

Alias leaves are derived and are omitted from `createTokenTheme` values. Every
`defineToken` leaf remains required. A target must exist in the contract unless
the alias explicitly declares both a domain and a fallback:

```ts
const vars = createTokenContract({
  semantic: {
    accent: defineAlias("foundation.color.missing", {
      domain: "color",
      fallback: "#7c3aed",
    }),
  },
})
```

Aliases are domain-checked, cycle-checked and immutable at the contract
boundary. `getTokenOrigin` returns the alias path, target and complete
foundation-to-component chain for diagnostics and impact tooling. Supplying an
alias value directly is rejected with `CRUMBS_CSS_TOKEN_ALIAS_OVERRIDE`.

Colour, length, duration, opacity and property-enum references keep the native
`var(--crumbs-…)` representation but carry a domain-aware authoring type.
`createTokenTheme` and `createTheme` validate the associated values before
publishing the flat token map. Length values are finite numbers, `auto`, or
finite percentages; negative values require `allowNegative: true`. Durations
are finite non-negative numbers, opacity is bounded to `[0, 1]`, and enum
values must belong to their declared non-empty set. Static style types reject
colour tokens in length and enum properties while preserving the legacy broad
token contract for migrations.

### Independent theme contexts (M3.4)

Create one complete base theme, then add sparse brand, colour-mode and density
layers with `createTokenThemeSnapshot`:

```ts
import {
  createTokenThemeSnapshot,
  type TokenThemeLayer,
} from "@opsydyn/crumbs-css/tokens"

const theme = createTokenThemeSnapshot(vars, {
  base: { color: { accent: "#2463eb" }, space: { md: 8 } },
  contexts: {
    brand: { color: { accent: "#7c3aed" } },
    mode: { color: { accent: "#a78bfa" } },
    density: { space: { md: 6 } },
  },
})
```

Context precedence is fixed and independent of object or provider order:

```text
base < brand < mode < density
```

Each layer is sparse and domain-checked. The base remains complete, aliases
remain derived, and the function publishes one complete values/token snapshot;
an invalid layer or missing base value fails before a replacement exists. Use
`createTokenThemeScopedSnapshot` when rebasing layers on an existing complete
theme.

For React trees, mount a complete `TokenThemeProvider` and compose independent
layers with `TokenThemeScopeProvider`:

```tsx
<TokenThemeProvider contract={vars} theme={baseTheme}>
  <TokenThemeScopeProvider contract={vars} context="brand" values={brand}>
    <TokenThemeScopeProvider contract={vars} context="mode" values={dark}>
      <Screen />
    </TokenThemeScopeProvider>
  </TokenThemeScopeProvider>
</TokenThemeProvider>
```

Nested providers replace the nearest layer for the same context while retaining
other contexts. The fixed precedence still decides collisions across contexts.
React portal children retain the provider chain of the tree that owns the
portal; a portal rendered into an independent React root must mount its own
complete provider chain. Missing providers and malformed layers report
`CRUMBS_CSS_TOKEN_THEME_SCOPE_PROVIDER_MISMATCH` or
`CRUMBS_CSS_TOKEN_THEME_SCOPE_INVALID`.

External or persisted token data should use the dedicated
`@opsydyn/crumbs-css/tokens/schema` entrypoint. It is the Effect 4 Schema
boundary; ordinary token authoring does not import Effect. Contract identity,
provider compatibility, layered aliases and independent context scopes use the
identified APIs above.

### Immutable theme patches and external themes (M3.5)

`applyTokenThemePatch(contract, current, patch)` accepts a sparse
`TokenThemeLayer` for one complete `NativeTheme`. It validates the contract,
every path and every domain before cloning and merging canonical definition
values. A successful result contains a new complete theme and frozen
`changedPaths`; the previous `values` tree and flat `tokens` map are not
modified. A failed result is `{ ok: false, error }` and does not publish a
partial snapshot. Identified contracts are checked by identity and shape
signature; legacy contracts must use the same contract object for patching.

Persisted or cross-process values use the versioned payload exposed by the
Effect 4 schema entrypoint:

```ts
import {
  decodeExternalTokenTheme,
  encodeExternalTokenTheme,
} from "@opsydyn/crumbs-css/tokens/schema"
import { createTokenThemeFromExternalPayload } from "@opsydyn/crumbs-css/tokens"

const decoded = decodeExternalTokenTheme(input)
if (decoded.ok) {
  const result = createTokenThemeFromExternalPayload(vars, decoded.value)
  if (result.ok) renderWithTheme(result.theme)
}
```

The external shape is tagged as `CrumbsTokenTheme`, carries version `1`, an
identified `{ owner, name, version }` contract and a flat map keyed by stable
public token IDs. The schema codec rejects unknown fields, unsupported
versions and non-finite numbers. The runtime mapper checks that identity,
required definition IDs and token domains still match the local contract;
aliases are derived locally and cannot be supplied as external values.
Encoding is available for already decoded payloads and remains in the schema
subpath. Effect is therefore paid at the ingress boundary, while ordinary
theme construction and patch application stay Effect-free.

### Reusable token focuses (M3.6)

Use the dedicated `@opsydyn/crumbs-css/tokens/optic` entrypoint when a theme
operation repeatedly targets a nested definition token:

```ts
import { createTokenThemeFocus } from "@opsydyn/crumbs-css/tokens/optic"

const accent = createTokenThemeFocus(vars, vars.color.accent)
const next = accent.modify(value => value.toUpperCase(), current)
```

`createTokenThemeFocus` accepts registered definition tokens and rejects aliases
or tokens owned by another contract. The focus is reusable outside render
loops. `getValues`, `replaceValues` and `modifyValues` are pure nested
transformations; they use path-copy updates, preserve the input and share
unaffected branches. `get`, `replace` and `modify` add contract and domain
validation, then publish through the same atomic patch boundary as
`applyTokenThemePatch`. A domain-changing result returns a structured
diagnostic and leaves the old `NativeTheme` untouched.

Effect 4 Optic is used internally by this subpath, while its declarations
expose only Crumbs plain-data focus and result types. The published theme
operation creates one coherent derived snapshot; identity sharing of resolved
theme outputs is covered by the M4.1 runtime cache below.

### Resolved output sharing (M4.1)

Theme resolution treats a module style export and a `NativeTheme` as immutable
snapshot inputs. Within one theme snapshot, repeated resolution of the same
object input is held by weak ownership: a static object style returns its
original reference, a tokenized style returns the same resolved object, and a
style map reuses unchanged entries while sharing its complete resolved map.
Flattened style arrays keep their existing last-entry semantics and are cached
as a separate resolved object; the input array is never returned as a style
object. Repeated recipe resolution follows the same identity rule.

The cache is keyed by both input object and theme object, so a new theme
snapshot cannot reuse values from an older snapshot. Weak keys allow entries to
be collected with the module or theme; there is no global unbounded strong cache
and no claim that this removes React renders or native work. Mutating a style or
theme after resolution violates the immutable snapshot contract and is not a
supported invalidation mechanism.

### Compiler dependency plans (M4.2)

Generated native modules now emit a version-2 `__crumbsModule` descriptor. Its
frozen `dependencyPlan` contains canonical path entries such as
`["button", "variants", "tone", "primary"]` and the token variable names
required by each resolved style leaf. The plan is derived after native
composition and lowering, so dead declarations are not included. Paths and
token lists are sorted, deduplicated and immutable.

`createThemeDependencyResolver(styles, dependencyPlan)` consumes that metadata
and returns a resolver whose transition receipt records `recomputations` and
`notifications`. An immutable theme transition compares the active contract
identity and only token values named by the plan, resolves affected paths and
keeps unaffected output references.
`notifications` counts changed output paths that a future subscription layer
could invalidate; it is not a React render or native-frame measurement.

Plan paths must match the supplied compiled export shape. Missing paths or an
unsupported plan version fail closed. The resolver assumes the style module and
themes are immutable snapshots; mutation is not an invalidation mechanism.

### Bounded recipe selection (M4.3)

`createRecipeResolver` builds one immutable selection plan for its recipe. The
plan records authored variant order, default values and compound requirements,
then derives a type-sensitive canonical key for each effective selection. It
does not eagerly expand the Cartesian product of variant values. Direct
`resolveRecipeStyle` calls use the same plan semantics without retaining a
resolver cache.

Resolver selection caching is local to the returned callable and uses a finite
least-recently-used bound. `cacheSize` defaults to `32`, accepts `0` to disable
retention and has a maximum of `1024`; non-finite or non-integral values fail
closed. `getCacheStats()` reports capacity, retained entries, hits, misses,
evictions and disposal state. `clearCache()` releases retained selections;
`dispose()` releases them permanently and later calls throw. This lifetime is
explicit and avoids a process-global strong selection cache.

The plan and selection outputs assume immutable recipe snapshots. Cache hits
preserve the same frozen style-array reference for an equivalent key. These
receipts and identity guarantees measure resolver work only; they do not claim
fewer React renders, native frames or device-memory retention.

Crumbs `styleVariants` artifacts now carry internal symbol metadata that distinguishes variant maps from native property values. String keys and TypeScript variant keys remain unchanged; object spread retains the marker. Regenerate artifacts to retain this identity when using native-property-like variant names. Legacy unmarked maps remain supported when unambiguous; a valid native structured-value shape takes precedence over an ambiguous unmarked map. JSON serialization drops the marker.

### Selective theme subscriptions (M4.4)

`ThemeProvider`, `TokenThemeProvider` and `TokenThemeScopeProvider` publish
immutable theme snapshots through a shared-symbol external store. The public
`useThemeSelector(selector)` hook and the themed style hooks use React's
`useSyncExternalStore` contract, so each consumer observes one complete
snapshot and is notified only when its selected reference changes. Provider
prop updates publish one snapshot during the layout commit; consumers cannot
resolve against a mixture of old and new token values.

Token theme scopes own independent stores. Updating a parent store does not
notify an unrelated scope, and unmounting a selector releases its parent
subscription. The store and React context identities are shared through
`Symbol.for` so duplicate or hot-reloaded package copies can continue to read
the same provider. Selectors should return a stable reference (primitives are
safe); allocating a new object for an unchanged snapshot defeats selective
invalidation. The store contract is covered by atomic publication, selector,
nested-scope, disposal and shared-identity tests. These checks do not claim
device frame, native rendering or retained-memory performance.

### Cached and uncached evaluator equivalence (M4.5)

Seeded property suites compare cached theme resolution with an independent
uncached oracle over generated literal/token styles and arrays. Repeated calls
for the same immutable input/theme retain the documented references; a new
theme scope or style artifact receives a new cache identity and cannot reuse a
stale resolved value. Dependency-plan transitions recompute and notify only
paths whose declared token changed, while static and unrelated outputs retain
their references.

Generated recipe cases compare the bounded resolver with its zero-capacity and
direct uncached forms. The plan retains authored variants and values linearly
and one selection does not materialize a Cartesian product. These are semantic,
identity and invalidation checks; they do not claim React render, native frame,
device-memory or Android performance.

### Static structured compiler boundary

Transform arrays accept exactly one operation per entry: finite numeric `perspective`, `scale`, `scaleX`, `scaleY`; finite numeric or percentage `translateX` / `translateY`; `rotate`, `rotateX`, `rotateY`, `rotateZ`, `skewX`, `skewY` with numeric `deg` / `rad` strings; or `matrix` with exactly 16 finite numbers. Empty transform arrays are preserved. Offsets require exactly finite numeric `width` and `height`. No nested merging, unit conversion or nested token evaluation occurs. CSS transform strings retain the existing CSS converter contract.

Static `boxShadow` arrays accept dense view-only lists of items with required finite numeric or percentage `offsetX` / `offsetY`, optional non-empty colour strings, non-negative finite `blurRadius`, finite `spreadDistance` and boolean `inset`. Empty lists replace the complete value. Item keys are closed, values are cloned and frozen, and nested tokens or arbitrary unit strings remain runtime concerns. CSS box-shadow strings retain the existing compatibility contract.

Static `filter` arrays accept dense view/text lists with one closed function per entry: non-negative finite numbers or finite bare/percentage/pixel strings for `brightness`, `contrast`, `grayscale`, `invert`, `opacity`, `saturate` and `sepia`; non-negative finite numbers or bare/pixel strings for `blur`; zero or finite `deg`/`rad` strings for `hueRotate`; and a closed `dropShadow` item with finite numeric/zero/pixel offsets, non-negative standard deviation and finite numeric or non-empty colour string. Empty lists replace the complete value. Function and item keys are closed, values are cloned and deeply frozen, and nested tokens, animated values and unsupported units remain runtime concerns. CSS filter strings retain the existing compatibility contract.

Direct primitive helpers exclude animated transform nodes by type. Runtime-native style types remain broader for resolved styles/composition references; the compiler validates actual structured values in all authoring paths. Animated nodes, nested tokens, malformed/sparse arrays and deferred array/object property families (including experimental background arrays) fail with `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE`, even with strict diagnostics disabled. Pass deferred values through React Native's runtime `style` prop. Rule containers such as `vars`, selectors and conditions retain their existing separate compatibility checks. Arbitrary non-style exports and browser-string conversion remain separate contracts.

**Alpha migration:** previously accepted structured shapes may now compile correctly or fail explicitly instead of being dropped or misconverted. Regenerate dependent artifacts together. This compiler evidence does not qualify native rendering or platform-specific transform/shadow behavior.

## Ordinary export contract

The `.css.ts` compiler preserves named identifier exports containing the data subset above, including own `undefined` fields and `__proto__` keys. Null-prototype records remain null-prototype records. Shared object identity, frozen status and writable/configurable descriptor flags are not part of the emitted data contract. Ordinary tag-shaped records are preserved as data; they do not become recipe class references or variant-map metadata. Internal authored metadata is captured separately before vanilla-extract serialization. Import ordinary constants directly; theme resolvers accept style inputs, so omit ordinary constants from namespaces passed to `useThemedStyles`.

Functions (including function serializers), bigint, symbols/symbol-keyed data, non-finite numbers, sparse/extended arrays, class/built-in instances, inherited data, accessors, non-enumerable fields, cycles and default/non-identifier exports fail with `CRUMBS_CSS_UNSUPPORTED_EXPORT`, file and export-path context, even with permissive declaration diagnostics. Move runtime values to regular `.ts` modules. Compiler-generated getters for module bindings are evaluated once; nested data accessors are rejected rather than evaluated. This is not a sandbox for untrusted authoring code.

**Legacy style-handle limitation:** build-time style handles remain strings. A string equal to a registered class/composition handle is interpreted as a style reference, including aliases or nested values. Arbitrary strings remain ordinary strings and composition cleanup cannot rewrite them. Provenance for deliberately identical ordinary strings awaits the M2 native IR. Internal symbol markers are reserved compiler metadata, not an authentication boundary. Regenerate dependent artifacts after upgrading; source-authored recipes acquire their reference metadata during compilation.

## Warn and drop

| Feature | Status | Native behavior |
| --- | --- | --- |
| vendor-prefixed properties | Dropped | Ignored because React Native has no browser vendor prefixes. |
| non-native CSS variables such as `var(--brand)` | Dropped with warning | Use `createThemeContract` or plain TypeScript constants instead. |
| unsupported individual CSS declarations | Best-effort drop by default, hard error in strict mode | Invalid declarations are skipped property-by-property. Enable strict diagnostics to fail with file/export/property context. |

## Hard diagnostics

These fail the transform with an actionable `NativeStylesCompatibilityError`.
Every hard diagnostic also carries a stable diagnostic code on the error object.

| Feature | Why unsupported | Recommended native alternative |
| --- | --- | --- |
| `@media` | React Native has no CSS media cascade. | Use component code, dimensions, or platform hooks to choose explicit style exports. |
| `@keyframes` | React Native has no CSS animation timeline. | Use React Native animation APIs. |
| `@supports`, `@font-face`, `@layer`, other at-rules | Browser-only CSS features. | Use platform/runtime APIs or explicit native configuration. |
| `selectors` / pseudo classes such as `&:hover` | React Native has no CSS selector matching. | Split stateful styles into explicit exports and select from props/state. |
| `globalStyle` / global selectors | React Native has no document/global cascade. | Apply styles at component boundaries. |
| nested selectors or selector lists | The transformer only supports one plain generated class rule. | Export separate native styles and compose or select them in component code. |

Strict diagnostics also turn dropped individual declarations into hard
`NativeStylesDeclarationError` failures:

```txt
@opsydyn/crumbs-css dropped "transition: all 0.3s" while transforming export "link" in fixtures/unsupported-declaration.css.ts.
```

## Diagnostic codes

Native theme references are checked against the same native property support
list used for literal declarations. An unsupported property such as
`transition` is dropped in default mode and fails with
`CRUMBS_CSS_DROPPED_DECLARATION` in strict mode even when its value is a native
token.

For repeated declarations targeting the same native property, later token or
literal values replace earlier values in declaration order. This does not yet
guarantee normalization of every shorthand family or semantic token domains;
physical spacing normalization is covered above, and other families remain roadmap work.

Diagnostic codes are stable package contract values exported from the package root
as `NativeStylesDiagnosticCode`. Tooling and CI should key on codes rather than
full message text.

| Code | Meaning |
| --- | --- |
| `CRUMBS_CSS_THEME_TOKEN_COLLISION` | Different raw paths claim the same legacy native token name; the contract is not registered. |
| `CRUMBS_CSS_TOKEN_CONTRACT_IDENTITY_COLLISION` | A stable contract identity is reused with a different path/domain/alias shape. |
| `CRUMBS_CSS_TOKEN_ALIAS_MISSING_TARGET` | An alias target is absent and no explicit domain-checked fallback was declared. |
| `CRUMBS_CSS_TOKEN_ALIAS_DOMAIN_MISMATCH` | An alias's declared domain differs from its target domain. |
| `CRUMBS_CSS_TOKEN_ALIAS_FALLBACK_DOMAIN_MISMATCH` | An alias fallback does not satisfy its target or declared domain. |
| `CRUMBS_CSS_TOKEN_ALIAS_CYCLE` | Alias traversal found a cycle instead of an acyclic foundation target. |
| `CRUMBS_CSS_TOKEN_ALIAS_OVERRIDE` | A derived alias leaf was supplied as a theme value. |
| `CRUMBS_CSS_TOKEN_THEME_PROVIDER_MISMATCH` | Identified provider and consumer contracts differ by identity or canonical shape. |
| `CRUMBS_CSS_TOKEN_THEME_SCOPE_PROVIDER_MISMATCH` | A scope provider has no complete identified provider for its contract. |
| `CRUMBS_CSS_TOKEN_THEME_SCOPE_INVALID` | A context layer is unknown, incomplete at its base, or violates a token domain. |
| `CRUMBS_CSS_TOKEN_THEME_PATCH_INVALID` | A sparse patch is malformed, unknown, incomplete or violates a token domain; the current snapshot is retained. |
| `CRUMBS_CSS_TOKEN_THEME_PATCH_CONTRACT_MISMATCH` | The patch contract and current theme contract are not compatible by identity, shape or legacy object ownership. |
| `CRUMBS_CSS_TOKEN_THEME_FOCUS_INVALID` | A focus target or pure focus path is unknown, derived, foreign to the supplied contract, or absent from the values tree. |
| `CRUMBS_CSS_TOKEN_THEME_EXTERNAL_CONTRACT_MISMATCH` | An external theme payload identifies a different or unidentified contract. |
| `CRUMBS_CSS_TOKEN_THEME_EXTERNAL_TOKEN_MISMATCH` | An external token ID is unknown/derived, missing, or carries a value outside its local domain. |
| `CRUMBS_CSS_TOKEN_THEME_TOKEN_CONTRACT_MISMATCH` | A token leaf or runtime reference belongs to a different domain contract; the theme is not resolved through an unrelated flat token name. |
| `CRUMBS_CSS_INVALID_THEME_CONTRACT` | A contract contains an invalid or misplaced/unregistered native token leaf. |
| `CRUMBS_CSS_UNSUPPORTED_EXPORT` | `.css.ts` export contains an unsupported value or export name; error includes file and data path. Always fatal. |
| `CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE` | Constructor or resolver rejected a malformed native token reference/name. |
| `CRUMBS_CSS_MISSING_THEME_TOKEN` | The active theme has no own value for a valid reference name. |
| `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE` | Compile-time rejection of an unsupported static native array/object shape, with property, file/class and runtime-style migration guidance. Always fatal. |
| `CRUMBS_CSS_UNSUPPORTED_MEDIA` | A `.css.ts` file authored a CSS media rule. |
| `CRUMBS_CSS_UNSUPPORTED_AT_RULE` | A `.css.ts` file authored another browser-only at-rule. |
| `CRUMBS_CSS_UNSUPPORTED_SELECTOR` | A `.css.ts` file authored selectors, pseudo classes, globals, or nested selectors. |
| `CRUMBS_CSS_DROPPED_DECLARATION` | A declaration could not be converted to a React Native style prop. |
| `CRUMBS_CSS_CSS_VARIABLE_DROPPED` | A browser CSS variable was used instead of a native theme token or TypeScript value. |
| `CRUMBS_CSS_PARTIAL_RECIPE_PAYLOAD` | Runtime received a partial transformed recipe and used the base fallback. |
| `CRUMBS_CSS_INVALID_RECIPE_VARIANT` | Runtime received a selected recipe variant value that is not declared. |

Enable it from Metro transformer config:

```js
config.transformer = {
  ...(config.transformer ?? {}),
  nativeStyles: {
    strictDiagnostics: true,
  },
}
```

It can also be enabled with `CRUMBS_CSS_STRICT=1`.

## Current non-goals

- Browser cascade parity.
- Global CSS.
- CSS-only responsive behavior.
- CSS keyframe animations.
- Pseudo-class state handling in `.css.ts`.
- Web vanilla-extract API completeness where React Native has no equivalent.

## Recommended native state pattern

Use explicit variants selected by component state:

```tsx
export const button = styleVariants({
  default: { opacity: 1 },
  pressed: { opacity: 0.8 },
})

const styles = useThemedStyles(s)

<Pressable style={({ pressed }) => [styles.button.default, pressed && styles.button.pressed]} />
```

## Typed helper pattern

Use the narrower helper when a style is intended for one React Native primitive:

```ts
viewStyle({
  backgroundColor: vars.color.canvas,
  padding: vars.space.md,
})

textStyle({
  color: vars.color.text,
  fontSize: vars.space.md,
  fontWeight: "700",
})

imageStyle({
  height: vars.image.size,
  resizeMode: "cover",
  tintColor: vars.color.text,
  width: vars.image.size,
})
```

These helpers reject obvious cross-kind props at typecheck time, such as
`resizeMode` on `textStyle` or `fontWeight` on `viewStyle`.

## Recipe pattern

Use `recipe` for reusable component surfaces with tone, size, pressed, disabled,
and compound state:

```ts
export const button = recipe({
  base: { borderRadius: 8 },
  defaultVariants: {
    disabled: false,
    pressed: false,
    size: "md",
    tone: "primary",
  },
  variants: {
    tone: {
      primary: { backgroundColor: vars.color.accent },
      danger: { backgroundColor: "#9f2f25" },
    },
    size: {
      sm: { padding: 8 },
      md: { padding: vars.space.md },
    },
    pressed: {
      false: {},
      true: { opacity: 0.82 },
    },
    disabled: {
      false: {},
      true: { opacity: 0.6 },
    },
  },
  compoundVariants: [
    {
      variants: { disabled: true, tone: "primary" },
      style: { opacity: 0.5 },
    },
  ],
})
```

Create a resolver for the themed recipe, then select recipe styles from
component state:

```tsx
import { createRecipeResolver, useThemedStyles } from "@opsydyn/crumbs-css/theme"
import { useMemo } from "react"
import * as s from "./button.css"

function Button({ disabled = false }) {
  const styles = useThemedStyles(s)
  const resolveButtonStyle = useMemo(() => createRecipeResolver(styles.button), [styles.button])

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) =>
        resolveButtonStyle({
          disabled,
          pressed,
          size: "md",
          tone: "primary",
        })
      }
    />
  )
}
```

Recipe merge order is stable: base, selected variants in author-defined variant
order, then matching compound variants in array order.
