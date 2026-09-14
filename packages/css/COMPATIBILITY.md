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
| Host Bun benchmarks | Five runtime operations and two warm compiler fixtures, including the required consumer button. | Missing required consumer fixtures fail before measurements; all seven metrics have budgets. Batch-average runtime quantiles are not individual operation tails. |
| Production Expo bundle qualification | Workspace and isolated packed consumers retain iOS, Android and web source maps and reject compiler code in runtime bundles. | This is JavaScript bundle/type qualification, separate from native startup and device rendering. See the M0.7 retained evidence in the repository roadmap. |
| iOS native functional acceptance | Retained playground/Maestro reports cover the documented simulator journeys. | Not rerun by package tests or host benchmarks; no physical-device or release-performance claim. |
| Android native acceptance | Not run; user deferred it until last. | Android production JavaScript exports do not qualify native Android behavior. |
| Native/device performance | Not run by this harness; reported explicitly as `not-run` with a reason in benchmark JSON. | Hermes, rendering/frame time, memory and device measurements require separate qualification. |

Compiler fixtures live under `packages/css/fixtures/consumer`, with a shared required-file admission check used by tests and benchmarks. They are test assets and are excluded from the published tarball. Removing an application directory cannot turn these scenarios into silent passes. Optional native capabilities remain visibly unqualified; they are not substitutes for mandatory compiler coverage.

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
| Structured values in runtime styles | Supported at resolution | Transform arrays/order, shadow offsets, font variants, filters, shadows, background arrays and opaque native values retain their shape/reference and scalar siblings. This does not qualify their `.css.ts` conversion. |
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

**Known generic-reference gap:** direct `NativeStyle` references returned by generic `style` currently fail typechecking in `style(base)` and direct `styleVariants` entries. Wrap them in arrays (`style([base])`, `styleVariants({ state: [base] })`) until repaired. Complete View/Text/Image direct references have separate positive contracts. [Closure audit and reproducer](../../docs/assessments/2026-09-14-m0-closure-audit.md) keep M0.2 open for this gap.

Primitive references anchor inline overrides to their native property/value set, including nested generic compositions. Incompatible text/image fields on a view composition, invalid values, arbitrary browser class strings and direct inline animated transforms remain type errors. Existing primitive helpers keep their own inline checks. Complete native interface types identify structural references; no nominal/phantom brand or runtime marker is added. This does not validate provenance or make raw animated declarations compilable; actual compiler admission still applies.

**Alpha type migration:** keep references in their primitive types instead of widening them to `NativeStyleRule`. Intentional widening selects the legacy generic contract and erases the primitive distinction. Generic forwarders can explicitly select that contract with `style<NativeStyleRule>(rule)` or `styleVariants<Record<string, NativeStyleRule>>(rules)`. The default reference type in `NativeStyleComposition` is now the primitive union; use its second type parameter for a target-specific composition alias when needed. Regenerate declarations together and retain target-specific annotations when consuming native props. Recipe input/selection APIs remain unchanged.

### Legacy contract ownership

Until M3 introduces explicit package/contract identities, a token's owner is its exact raw path (the array of unsanitized key segments). Identical paths may be reused across contract definitions and produce independent theme value maps. Different paths that sanitize to the same `--crumbs-…` name fail with `CRUMBS_CSS_THEME_TOKEN_COLLISION`; registration validates the whole contract before publishing any metadata. Failed definitions cannot overwrite an existing owner or leave partially registered tokens. Exposed token paths are frozen.

`createTheme` requires registered leaves at their owning paths. Relocated, unregistered or invalid leaves fail with `CRUMBS_CSS_INVALID_THEME_CONTRACT`; they are never silently skipped. Generated contracts preserve own prototype-like keys. Clones at identical paths can reuse already registered tokens, but decoded contracts must be rebuilt in the owning authoring module when that registry is absent.

The registry is local to an authoring module instance (or a bundled compilation graph), not a cross-package manifest. Exact-path reuse deliberately shares legacy token identity; it does not establish distinct provider compatibility or prevent independently compiled graphs from choosing the same names. Namespace contract roots by design system/package now, avoid sanitizer collisions, and regenerate dependent artifacts after changing paths. Wrong-provider detection, semantic domains and stable package identity remain M3 work. No counter/random suffix or evaluation-order-dependent naming is introduced; existing non-colliding token strings remain unchanged.

Crumbs `styleVariants` artifacts now carry internal symbol metadata that distinguishes variant maps from native property values. String keys and TypeScript variant keys remain unchanged; object spread retains the marker. Regenerate artifacts to retain this identity when using native-property-like variant names. Legacy unmarked maps remain supported when unambiguous; a valid native structured-value shape takes precedence over an ambiguous unmarked map. JSON serialization drops the marker.

### Static structured compiler boundary

Transform arrays accept exactly one operation per entry: finite numeric `perspective`, `scale`, `scaleX`, `scaleY`; finite numeric or percentage `translateX` / `translateY`; `rotate`, `rotateX`, `rotateY`, `rotateZ`, `skewX`, `skewY` with numeric `deg` / `rad` strings; or `matrix` with exactly 16 finite numbers. Empty transform arrays are preserved. Offsets require exactly finite numeric `width` and `height`. No nested merging, unit conversion or nested token evaluation occurs. CSS transform strings retain the existing CSS converter contract.

Direct primitive helpers exclude animated transform nodes by type. Runtime-native style types remain broader for resolved styles/composition references; the compiler validates actual structured values in all authoring paths. Animated nodes, nested tokens, malformed/sparse arrays and other array/object property families (including structured filters, box shadows, font variants and transform origins) fail with `CRUMBS_CSS_UNSUPPORTED_STRUCTURED_VALUE`, even with strict diagnostics disabled. Pass these values through React Native's runtime `style` prop. Rule containers such as `vars`, selectors and conditions retain their existing separate compatibility checks. Arbitrary non-style exports and browser-string conversion remain separate contracts.

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
