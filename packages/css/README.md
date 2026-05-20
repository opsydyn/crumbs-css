<p align="center">
  <img src="https://raw.githubusercontent.com/opsydyn/crumbs-css/main/packages/css/crumbs-css-header.png" alt="Crumbs CSS" width="100%" />
</p>

# @opsydyn/crumbs-css

React Native style authoring with a familiar vanilla-extract-shaped API.

Full consumer documentation lives in the Starlight docs workspace in this repo:
[github.com/opsydyn/crumbs-css/tree/main/docs](https://github.com/opsydyn/crumbs-css/tree/main/docs)

## What it is

`@opsydyn/crumbs-css` compiles `.css.ts` modules into React Native style payloads at Metro transform time. It gives React Native apps a familiar authoring surface for:

- `style`
- `styleVariants`
- `recipe`
- `createThemeContract`
- `createTheme`

## Current guarantees

- React Native focused, not a browser CSS runtime
- Metro-transform based
- Typed authoring helpers for view, text, and image styles
- Runtime theme token resolution with `ThemeProvider` and `useThemedStyles`
- Explicit state handling through `styleVariants` and `recipe`

## Current limits

- No browser cascade, selectors, globals, or pseudo classes
- No CSS media queries or keyframes
- No web vanilla-extract completeness where React Native has no equivalent

See the full compatibility matrix in
[COMPATIBILITY.md](https://github.com/opsydyn/crumbs-css/blob/main/packages/css/COMPATIBILITY.md).

## Install

```sh
bun add @opsydyn/crumbs-css
# or
npm install @opsydyn/crumbs-css
```

Peer dependencies: `react`, `react-native`, and `metro`.

## Minimal Metro setup

For an Expo app, wrap the default Metro config:

```js
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeStyles } = require("@opsydyn/crumbs-css/metro-plugin")

const config = getDefaultConfig(__dirname)

module.exports = withNativeStyles(config)
```

The package ships with a pre-built transformer. Metro cache invalidation is based on the transformer file, so package updates invalidate stale `.css.ts` output automatically.

## Minimal theme example

```ts
// theme.ts
import { createTheme, createThemeContract } from "@opsydyn/crumbs-css/style"

export const vars = createThemeContract({
  color: {
    canvas: null,
    text: null,
  },
})

export const darkTheme = createTheme(vars, {
  color: {
    canvas: "#0a0a0a",
    text: "#f5f5f5",
  },
})
```

```ts
// screen.css.ts
import { style } from "@opsydyn/crumbs-css/style"
import { vars } from "./theme"

export const screen = style({
  backgroundColor: vars.color.canvas,
  flex: 1,
  justifyContent: "center",
})

export const title = style({
  color: vars.color.text,
  fontSize: 24,
  fontWeight: 700,
})
```

```tsx
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme"
import { Text, View } from "react-native"
import { darkTheme } from "./theme"
import * as s from "./screen.css"

function Screen() {
  const styles = useThemedStyles(s)

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Hello</Text>
    </View>
  )
}

export function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <Screen />
    </ThemeProvider>
  )
}
```

## Minimal recipe example

```ts
// button.css.ts
import { recipe } from "@opsydyn/crumbs-css/style"

export const button = recipe({
  base: {
    alignItems: "center",
    borderRadius: 8,
    padding: 12,
  },
  defaultVariants: {
    pressed: false,
    tone: "primary",
  },
  variants: {
    pressed: {
      false: {},
      true: { opacity: 0.82 },
    },
    tone: {
      primary: { backgroundColor: "#c8aa6e" },
      danger: { backgroundColor: "#9f2f25" },
    },
  },
})
```

```tsx
import { createRecipeResolver, useThemedStyles } from "@opsydyn/crumbs-css/theme"
import { useMemo } from "react"
import { Pressable } from "react-native"
import * as s from "./button.css"

export function Button() {
  const styles = useThemedStyles(s)
  const resolveButtonStyle = useMemo(() => createRecipeResolver(styles.button), [styles.button])

  return <Pressable style={({ pressed }) => resolveButtonStyle({ pressed, tone: "primary" })} />
}
```

## Diagnostics

Unsupported browser-only features fail fast with actionable diagnostics such as:

```txt
@opsydyn/crumbs-css does not support @media rules in React Native styles.
```

For stricter declaration-level failures, enable Metro strict diagnostics:

```js
config.transformer = {
  ...(config.transformer ?? {}),
  nativeStyles: {
    strictDiagnostics: true,
  },
}
```

## Learn more

- Docs workspace: [github.com/opsydyn/crumbs-css/tree/main/docs](https://github.com/opsydyn/crumbs-css/tree/main/docs)
- Compatibility matrix: [COMPATIBILITY.md](https://github.com/opsydyn/crumbs-css/blob/main/packages/css/COMPATIBILITY.md)
- Repository: [github.com/opsydyn/crumbs-css](https://github.com/opsydyn/crumbs-css)
