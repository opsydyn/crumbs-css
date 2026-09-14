# @opsydyn/crumbs-css native compatibility matrix

`@opsydyn/crumbs-css` intentionally implements a React Native subset of
vanilla-extract authoring. It is not a browser CSS runtime.

## Validated native baseline

The current published contract is validated against:

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

## Supported

| Feature | Status | Native behavior |
| --- | --- | --- |
| `style({...})` | Supported subset | Compiles flat declarations and the static native structured subset below to `StyleSheet.create`. |
| Crumbs `style([base, extra])` composition | Supported subset | Later authored entries win for the same canonical native property; multiple/repeated bases and nested arrays preserve order. Primitive helpers and `styleVariants` accept compositions. Physical padding/margin and gap normalize identically for tokens and literals. Other shorthand families remain unqualified. |
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

Crumbs composition is ordered native authoring, not a browser cascade. It captures inline declarations separately and retains repeated bases: `style([a, b, a])` applies `a` again after `b`. Physical padding/margin, their horizontal/vertical aliases, and gap normalize before merging, so later token or literal declarations replace overlapping longhands. Direct `@vanilla-extract/css` compositions retain upstream class-list processing and do not carry the same authored-order guarantee. Use Crumbs helpers for ordered native composition.

**Alpha artifact migration:** compiled spacing styles now expose canonical physical sides (`paddingTop`/`Right`/`Bottom`/`Left`, and margin equivalents); horizontal/vertical aliases expand to two sides, and `gap` expands to `rowGap`/`columnGap`. This also applies to token-backed values. Pass the complete style to React Native rather than inspecting a shorthand field on the compiled artifact. Regenerate dependent compiled modules together; composing older shorthand artifacts with newer longhands is not qualified. Raw runtime styles are not normalized by the theme resolver. Multi-value literal CSS padding/margin remains supported. Logical/RTL declarations, border/flex families and mixed multi-value token expressions are outside this normalization contract.

Runtime resolution treats native structured property values as opaque values, replaces them as whole values in ordered arrays, and resolves top-level token references only. It never evaluates animated nodes or recursively resolves nested token references. Primitive-specific view/text/image outputs survive direct resolution, hooks, namespace resolution and typed style arrays.

Native token references require exactly two own enumerable data fields: `$$type: "crumbs.css.theme-token"` and a string `varName` matching `--crumbs-[A-Za-z0-9_-]+`. Plain objects (including JSON-decoded and null-prototype objects) are accepted; arrays, inherited fields, accessors, extra fields and invalid names are rejected. The boolean guard returns false without executing accessors. Constructors and resolution of invalid tagged values fail with `CRUMBS_CSS_INVALID_THEME_TOKEN_REFERENCE`. Accessor tags are treated as invalid candidates rather than evaluated. Resolution validates surviving top-level values after composition, so overridden invalid references and opaque nested values are not evaluated. Active theme lookup requires an own token property; absent or inherited tokens fail with `CRUMBS_CSS_MISSING_THEME_TOKEN`. These checks do not validate complete theme/artifact schemas or token semantic domains.

**Alpha token migration:** regenerate old or extended reference payloads into the exact data shape above. Metadata belongs outside the reference DTO; token names cannot contain whitespace, punctuation other than hyphen/underscore, or an empty suffix. Missing-token diagnostics now carry a stable code.

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
