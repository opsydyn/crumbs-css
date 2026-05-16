# @crumbs/css

React Native style authoring with a familiar vanilla-extract-shaped API.

This package compiles `.css.ts` files to React Native `StyleSheet.create` output
for Metro. It supports a native subset of vanilla-extract authoring: flat styles,
composition, typed native style helpers, theme contracts, runtime theme resolution,
and explicit state variants.

It is not a browser CSS runtime. See [COMPATIBILITY.md](./COMPATIBILITY.md) for
the supported matrix and hard diagnostics.

## Metro setup

Build the transformer before starting Expo/Metro:

```sh
cd packages/native-styles
bun run build
```

In the native app, the Metro config should point at the built transformer:

```js
const { withNativeStyles } = require("@crumbs/css/dist/metro-plugin")

module.exports = withNativeStyles(config)
```

The app dev script should rebuild the transformer before Expo starts. This repo's
native app uses:

```json
{
  "dev": "cd ../../packages/native-styles && bun run build && cd ../../apps/native && expo start --clear"
}
```

`--clear` is useful while developing the transformer itself. The transformer cache
key also hashes the built transformer file so Metro invalidates stale `.css.ts`
output when transformer behavior changes.

## Author native styles

Import authoring helpers from `@crumbs/css/style`, not the package root.
This keeps Metro/plugin code out of `.css.ts` evaluation.

```ts
import { style } from "@crumbs/css/style"

export const screen = style({
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
})

export const title = style({
  color: "#c8aa6e",
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 8,
})
```

This example is backed by [examples/basic.css.ts](./examples/basic.css.ts).

## Themes

Create a contract and concrete themes in plain TypeScript:

```ts
import { createTheme, createThemeContract } from "@crumbs/css/style"

export const vars = createThemeContract({
  color: {
    accent: null,
    canvas: null,
    text: null,
  },
  space: {
    screen: null,
  },
})

export const darkTheme = createTheme(vars, {
  color: {
    accent: "#c8aa6e",
    canvas: "#0a0a0a",
    text: "#f5f5f5",
  },
  space: {
    screen: 24,
  },
})
```

Use the contract in `.css.ts` files:

```ts
import { style } from "@crumbs/css/style"
import { vars } from "./theme"

export const screen = style({
  flex: 1,
  backgroundColor: vars.color.canvas,
  padding: vars.space.screen,
})

export const title = style({
  color: vars.color.accent,
  fontSize: 28,
  fontWeight: 700,
})
```

These examples are backed by [examples/theme.ts](./examples/theme.ts) and
[examples/themed.css.ts](./examples/themed.css.ts).

## Runtime resolution

Wrap the app in `ThemeProvider`, then resolve imported style modules with
`useThemedStyles`.

```tsx
import { ThemeProvider } from "@crumbs/css/theme"
import { Slot } from "expo-router"
import { darkTheme } from "../styles/theme"

export default function RootLayout() {
  return (
    <ThemeProvider theme={darkTheme}>
      <Slot />
    </ThemeProvider>
  )
}
```

```tsx
import { useThemedStyles } from "@crumbs/css/theme"
import { Text, View } from "react-native"
import * as s from "./screen.css"

export function Screen() {
  const styles = useThemedStyles(s)

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Army Builder</Text>
    </View>
  )
}
```

Raw themed `StyleSheet` entries intentionally contain token references. Components
must call `useThemedStyles`, `useThemedStyle`, `resolveThemeStyles`, or
`resolveThemeTokens` before rendering themed styles.

## Pressable variants

React Native has no CSS pseudo-class selector matching. Use explicit variants and
select them from component state:

```ts
import { style, styleVariants } from "@crumbs/css/style"
import { vars } from "./theme"

export const button = styleVariants({
  default: {
    backgroundColor: vars.color.accent,
    borderRadius: 8,
    paddingBottom: 10,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 10,
  },
  pressed: {
    opacity: 0.8,
  },
})

export const buttonLabel = style({
  color: vars.color.canvas,
  fontSize: 14,
  fontWeight: 700,
})
```

```tsx
import { useThemedStyles } from "@crumbs/css/theme"
import { Pressable, Text } from "react-native"
import * as s from "./button.css"

export function Button() {
  const styles = useThemedStyles(s)

  return (
    <Pressable style={({ pressed }) => [styles.button.default, pressed && styles.button.pressed]}>
      <Text style={styles.buttonLabel}>Create roster</Text>
    </Pressable>
  )
}
```

This example is backed by
[examples/pressable-variants.css.ts](./examples/pressable-variants.css.ts).

## Typed native helpers

Use `viewStyle`, `textStyle`, and `imageStyle` when a style is intended for a
specific React Native primitive. Their inputs are token-aware React Native style
types, so theme contract values work without casts and obvious cross-kind props
are caught during typecheck.

```ts
import { imageStyle, textStyle, viewStyle } from "@crumbs/css/style"
import { vars } from "./theme"

export const panel = viewStyle({
  backgroundColor: vars.color.canvas,
  padding: vars.space.screen,
})

export const title = textStyle({
  color: vars.color.text,
  fontSize: vars.space.screen,
  fontWeight: "700",
})

export const crest = imageStyle({
  height: vars.space.screen,
  resizeMode: "cover",
  tintColor: vars.color.text,
  width: vars.space.screen,
})
```

Use `style` for deliberately mixed style exports and `styleVariants` for grouped
state styles.

## Recipes

Use `recipe` for reusable native component surfaces with base styles, variants,
defaults, and compound variants.

```ts
import { recipe } from "@crumbs/css/style"
import { vars } from "./theme"

export const button = recipe({
  base: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
  },
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
      md: { padding: vars.space.screen },
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

Resolve the themed recipe once, then select explicit state in component code:

```tsx
import type { NativeRecipeProps } from "@crumbs/css/style"
import { createRecipeResolver, useThemedStyles } from "@crumbs/css/theme"
import { useMemo } from "react"
import { Pressable } from "react-native"
import * as s from "./button.css"

type ButtonVariantProps = NativeRecipeProps<typeof s.button>

type ButtonProps = ButtonVariantProps & {
  readonly disabled?: boolean
}

export function Button({ disabled = false, size = "md", tone = "primary" }: ButtonProps) {
  const styles = useThemedStyles(s)
  const resolveButtonStyle = useMemo(() => createRecipeResolver(styles.button), [styles.button])

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) =>
        resolveButtonStyle({
          disabled,
          pressed,
          size,
          tone,
        })
      }
    />
  )
}
```

This example is backed by [examples/recipe.css.ts](./examples/recipe.css.ts).

Recipe style arrays are ordered for predictable React Native override behavior:
base first, variants in author-defined variant-object order, then matching
compound variants in array order. Later entries can override earlier entries using
React Native's normal style-array merge semantics.

## Diagnostics

Unsupported browser CSS features fail the transform with actionable diagnostics:

```txt
@crumbs/css does not support @media rules in React Native styles.
```

Use component code, dimensions, or platform hooks to choose explicit native style
exports instead.

```txt
@crumbs/css does not support @keyframes rules in React Native styles.
```

Use React Native animation APIs instead.

```txt
@crumbs/css does not support selectors, global styles, or pseudo classes in React Native styles.
```

Use explicit exports or `styleVariants`, then select styles from component props or
state. Do not use `selectors`, `globalStyle`, or pseudo classes in native `.css.ts`
files.

Plain browser CSS variables such as `var(--brand)` are dropped with a warning. Use
`createThemeContract` or plain TypeScript constants instead.

Enable strict diagnostics in Metro to fail on individual declarations that would
otherwise be dropped:

```js
config.transformer = {
  ...(config.transformer ?? {}),
  nativeStyles: {
    strictDiagnostics: true,
  },
}
```

Strict diagnostics include the dropped declaration, export name, and source file:

```txt
@crumbs/css dropped "transition: all 0.3s" while transforming export "link" in fixtures/unsupported-declaration.css.ts.
```

For one-off checks, set `CRUMBS_CSS_STRICT=1` before running Metro.

## Performance Benchmarks

Run the package perf harness with:

```sh
bun run bench:native-styles
```

The benchmark covers recipe selection, `createRecipeResolver`, themed recipe
selection, theme-module resolution, and transformer cost for representative
fixtures. Budgets are checked by the runner and output is printed as both text and
JSON for future CI capture.

## Verification

Before shipping native-styles changes, run:

```sh
cd packages/native-styles
bun test
bun run typecheck
bun run build
```

Then typecheck the consuming native app:

```sh
cd apps/native
bun run typecheck
```
