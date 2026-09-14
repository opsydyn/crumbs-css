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
| `style({...})` | Supported | Compiles flat declarations to `StyleSheet.create`. |
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
| Metro dependency imports | Supported | Side-effect imports keep hot reload aware of dependent `.css.ts` files. |

Crumbs composition is ordered native authoring, not a browser cascade. It captures inline declarations separately and retains repeated bases: `style([a, b, a])` applies `a` again after `b`. Physical padding/margin, their horizontal/vertical aliases, and gap normalize before merging, so later token or literal declarations replace overlapping longhands. Direct `@vanilla-extract/css` compositions retain upstream class-list processing and do not carry the same authored-order guarantee. Use Crumbs helpers for ordered native composition.

**Alpha artifact migration:** compiled spacing styles now expose canonical physical sides (`paddingTop`/`Right`/`Bottom`/`Left`, and margin equivalents); horizontal/vertical aliases expand to two sides, and `gap` expands to `rowGap`/`columnGap`. This also applies to token-backed values. Pass the complete style to React Native rather than inspecting a shorthand field on the compiled artifact. Regenerate dependent compiled modules together; composing older shorthand artifacts with newer longhands is not qualified. Raw runtime styles are not normalized by the theme resolver. Multi-value literal CSS padding/margin remains supported. Logical/RTL declarations, border/flex families and mixed multi-value token expressions are outside this normalization contract.

Runtime resolution treats native structured property values as opaque values, replaces them as whole values in ordered arrays, and resolves top-level token references only. It never evaluates animated nodes or recursively resolves nested token references. Primitive-specific view/text/image outputs survive direct resolution, hooks, namespace resolution and typed style arrays.

Crumbs `styleVariants` artifacts now carry internal symbol metadata that distinguishes variant maps from native property values. String keys and TypeScript variant keys remain unchanged; object spread retains the marker. Regenerate artifacts to retain this identity when using native-property-like variant names. Legacy unmarked maps remain supported when unambiguous; a valid native structured-value shape takes precedence over an ambiguous unmarked map. JSON serialization drops the marker. Compiler support for typed structured inputs such as `transform` and `shadowOffset` remains a separate, incomplete compatibility boundary; this runtime fix does not repair CSS conversion.

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
guarantee normalization of token-backed shorthands against their longhands or
semantic token domains; those are separate roadmap work.

Diagnostic codes are stable package contract values exported from the package root
as `NativeStylesDiagnosticCode`. Tooling and CI should key on codes rather than
full message text.

| Code | Meaning |
| --- | --- |
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
