<p align="center">
  <img src="https://raw.githubusercontent.com/opsydyn/crumbs-css/main/packages/css/crumbs-css-header.png" alt="Crumbs CSS" width="100%" />
</p>

# @opsydyn/crumbs-css

React Native style authoring with a familiar vanilla-extract-shaped API.

Compiles `.css.ts` files to React Native `StyleSheet.create` output for Metro. Supports flat styles, composition, typed native style helpers, theme contracts, runtime theme resolution, and explicit state variants.

It is not a browser CSS runtime. See [COMPATIBILITY.md](https://github.com/opsydyn/crumbs-css/blob/main/packages/css/COMPATIBILITY.md) for the supported property matrix and hard diagnostics.

## Install

```sh
bun add @opsydyn/crumbs-css
# or
npm install @opsydyn/crumbs-css
```

Peer dependencies: `react`, `react-native`, and `metro` (provided by Expo).

## Metro setup

Build the transformer before starting Expo/Metro:

```sh
cd node_modules/@opsydyn/crumbs-css && bun run build
```

Or add a prebuild step to your app's `package.json`:

```json
{
  "scripts": {
    "prebuild": "cd node_modules/@opsydyn/crumbs-css && bun run build",
    "dev": "expo start --clear"
  }
}
```

In `metro.config.js`, wrap your config with `withNativeStyles`:

```js
const { withNativeStyles } = require("@opsydyn/crumbs-css/metro-plugin")

module.exports = withNativeStyles(config)
```

The transformer cache key hashes the built transformer file so Metro invalidates stale `.css.ts` output when transformer behavior changes.

## Author native styles

Import from `@opsydyn/crumbs-css/style`, not the package root — this keeps Metro/plugin code out of `.css.ts` evaluation.

```ts
import { style } from "@opsydyn/crumbs-css/style"

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

Full example: [examples/basic.css.ts](https://github.com/opsydyn/crumbs-css/blob/main/packages/css/examples/basic.css.ts)

## Themes

Create a contract and concrete themes in plain TypeScript:

```ts
import { createTheme, createThemeContract } from "@opsydyn/crumbs-css/style"

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
import { style } from "@opsydyn/crumbs-css/style"
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

Full examples: [examples/theme.ts](https://github.com/opsydyn/crumbs-css/blob/main/packages/css/examples/theme.ts), [examples/themed.css.ts](https://github.com/opsydyn/crumbs-css/blob/main/packages/css/examples/themed.css.ts)

## Runtime resolution

Wrap the app in `ThemeProvider`, then resolve imported style modules with `useThemedStyles`:

```tsx
import { ThemeProvider } from "@opsydyn/crumbs-css/theme"
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
import { useThemedStyles } from "@opsydyn/crumbs-css/theme"
import { Text, View } from "react-native"
import * as s from "./screen.css"

export function Screen() {
  const styles = useThemedStyles(s)

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Hello</Text>
    </View>
  )
}
```

Raw themed `StyleSheet` entries intentionally contain token references. Always call `useThemedStyles`, `useThemedStyle`, `resolveThemeStyles`, or `resolveThemeTokens` before rendering themed styles.

## Pressable variants

React Native has no CSS pseudo-class selector matching. Use explicit variants and select them from component state:

```ts
import { style, styleVariants } from "@opsydyn/crumbs-css/style"
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
import { useThemedStyles } from "@opsydyn/crumbs-css/theme"
import { Pressable, Text } from "react-native"
import * as s from "./button.css"

export function Button() {
  const styles = useThemedStyles(s)

  return (
    <Pressable style={({ pressed }) => [styles.button.default, pressed && styles.button.pressed]}>
      <Text style={styles.buttonLabel}>Press me</Text>
    </Pressable>
  )
}
```

Full example: [examples/pressable-variants.css.ts](https://github.com/opsydyn/crumbs-css/blob/main/packages/css/examples/pressable-variants.css.ts)

## Typed native helpers

Use `viewStyle`, `textStyle`, and `imageStyle` when a style targets a specific React Native primitive. Inputs are token-aware and catch cross-kind props at typecheck:

```ts
import { imageStyle, textStyle, viewStyle } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme"

export const panel = viewStyle({
  backgroundColor: vars.color.canvas,
  padding: vars.space.screen,
})

export const title = textStyle({
  color: vars.color.text,
  fontSize: 18,
  fontWeight: "700",
})

export const crest = imageStyle({
  height: 48,
  resizeMode: "cover",
  tintColor: vars.color.text,
  width: 48,
})
```

Use `style` for deliberately mixed style exports and `styleVariants` for grouped state styles.

Full example: [examples/typed-helpers.css.ts](https://github.com/opsydyn/crumbs-css/blob/main/packages/css/examples/typed-helpers.css.ts)

## Recipes

Use `recipe` for reusable native component surfaces with base styles, variants, defaults, and compound variants:

```ts
import { recipe } from "@opsydyn/crumbs-css/style"
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

Resolve the themed recipe once, then select state in component code:

```tsx
import type { NativeRecipeProps } from "@opsydyn/crumbs-css/style"
import { createRecipeResolver, useThemedStyles } from "@opsydyn/crumbs-css/theme"
import { useMemo } from "react"
import { Pressable } from "react-native"
import * as s from "./button.css"

type ButtonProps = NativeRecipeProps<typeof s.button> & {
  readonly disabled?: boolean
}

export function Button({ disabled = false, size = "md", tone = "primary" }: ButtonProps) {
  const styles = useThemedStyles(s)
  const resolveButtonStyle = useMemo(() => createRecipeResolver(styles.button), [styles.button])

  return (
    <Pressable
      disabled={disabled}
      style={({ pressed }) => resolveButtonStyle({ disabled, pressed, size, tone })}
    />
  )
}
```

Full example: [examples/recipe.css.ts](https://github.com/opsydyn/crumbs-css/blob/main/packages/css/examples/recipe.css.ts)

Recipe style arrays are ordered for predictable React Native override behavior: base first, variants in author-defined order, then matching compound variants. Later entries override earlier ones using React Native's style-array merge semantics.

## Diagnostics

Unsupported browser CSS features fail the transform with actionable diagnostics:

```
@opsydyn/crumbs-css does not support @media rules in React Native styles.
```

Use component code, dimensions, or platform hooks to choose explicit native style exports instead.

```
@opsydyn/crumbs-css does not support @keyframes rules in React Native styles.
```

Use React Native animation APIs instead.

```
@opsydyn/crumbs-css does not support selectors, global styles, or pseudo classes in React Native styles.
```

Use explicit exports or `styleVariants`, then select styles from component props or state.

Plain browser CSS variables such as `var(--brand)` are dropped with a warning. Use `createThemeContract` or plain TypeScript constants instead.

Enable strict diagnostics in Metro to fail on individual declarations that would otherwise be silently dropped:

```js
config.transformer = {
  ...(config.transformer ?? {}),
  nativeStyles: {
    strictDiagnostics: true,
  },
}
```

Strict output includes the dropped declaration, export name, and source file:

```
@opsydyn/crumbs-css dropped "transition: all 0.3s" while transforming export "link" in src/button.css.ts.
```

For one-off checks, set `CRUMBS_CSS_STRICT=1` before running Metro.

## Performance

Run the package perf harness:

```sh
bun run bench:native-styles
```

Covers recipe selection, `createRecipeResolver`, themed recipe selection, theme-module resolution, and transformer cost for representative fixtures.

## Acknowledgements

`@opsydyn/crumbs-css` is directly inspired by [vanilla-extract](https://vanilla-extract.style/) — the zero-runtime CSS-in-TypeScript library by [Mark Dalgleish](https://github.com/markdalgleish) and the team at [Seek](https://github.com/seek-oss). The authoring API, theme contract model, and recipe abstraction are all shaped by vanilla-extract's design. If you work on web, use vanilla-extract.

## Repository

[github.com/opsydyn/crumbs-css](https://github.com/opsydyn/crumbs-css)
