<p align="center">
  <img src="https://raw.githubusercontent.com/opsydyn/crumbs-css/main/packages/css/crumbs-css-header.png" alt="Crumbs CSS" width="100%" />
</p>

# @opsydyn/crumbs-css

React Native style authoring with a familiar vanilla-extract-shaped API.

Full consumer documentation lives in the Starlight docs workspace in this repo:
[github.com/opsydyn/crumbs-css/tree/main/docs](https://github.com/opsydyn/crumbs-css/tree/main/docs)

Published docs are also available at
[opsydyn.github.io/crumbs-css](https://opsydyn.github.io/crumbs-css/).

Validated consumer baseline:

- Expo SDK 56
- React 19.2
- React Native 0.85

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

Current `react-native` peer range: `>=0.85 <0.86`.

## Minimal Metro setup

For an Expo app, wrap the default Metro config:

```js
const { getDefaultConfig } = require("expo/metro-config")
const { withNativeStyles } = require("@opsydyn/crumbs-css/metro-plugin")

const config = getDefaultConfig(__dirname)

module.exports = withNativeStyles(config)
```

The package ships with a pre-built transformer. Metro cache invalidation is based on the transformer file, so package updates invalidate stale `.css.ts` output automatically.

Runtime APIs belong in `@opsydyn/crumbs-css/theme/core` for common provider, hook and token-resolution consumers. It is the lean runtime graph and imports only React externally. Use `@opsydyn/crumbs-css/theme` when you need token scopes, dependency plans or recipe resolver controls; that compatibility graph also imports only React externally. The package root, `/style` and Metro tooling remain build-time entrypoints. See the [runtime dependency boundary](./COMPATIBILITY.md#runtime-dependency-boundary).

## Minimal theme example

```ts
// theme.css.ts
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
import { vars } from "./theme.css"

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
import { ThemeProvider, useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import { Text, View } from "react-native"
import { darkTheme } from "./theme.css"
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

## Ordered native composition

```ts
import { textStyle } from "@opsydyn/crumbs-css/style"

const copy = textStyle({ color: "black", fontSize: 16 })
export const title = textStyle([copy, { fontSize: 24, fontWeight: "700" }])
```

Later authored entries override the same canonical native property. Compositions accept multiple bases, repeated bases and nested readonly arrays, and `styleVariants` accepts composed values. Inline properties retain each primitive helper's type checks. Crumbs preserves this sequence explicitly; importing `style` directly from vanilla-extract does not provide this native ordering guarantee. Token and literal physical padding/margin, horizontal/vertical aliases and gap normalize before merging. Compiled artifacts expose longhands; other shorthand families remain unqualified. See the migration notes in [compatibility](./COMPATIBILITY.md).

## Runtime structured values

Legacy token ownership uses exact raw paths: repeated identical paths can share a token name, while different paths that sanitize to the same name fail atomically. Theme creation rejects misplaced/unregistered leaves and exposed token paths are frozen. Namespace contract roots by package/design system until explicit package identities arrive; see [compatibility](./COMPATIBILITY.md#legacy-contract-ownership).

Named `.css.ts` exports can include ordinary finite primitives, dense arrays and plain data records alongside styles. These values survive compilation; unsupported runtime values fail with `CRUMBS_CSS_UNSUPPORTED_EXPORT`. Import constants directly and keep them outside style namespaces passed to theme resolvers. See [compatibility](./COMPATIBILITY.md#ordinary-export-contract) for identity limits and migration guidance.

Token-reference payloads require exactly own enumerable `$$type` and `varName` data fields and a `--crumbs-[A-Za-z0-9_-]+` name. Malformed tagged values fail with a stable diagnostic; guards never evaluate reference accessors. Theme resolution uses own token values and reports missing values with `CRUMBS_CSS_MISSING_THEME_TOKEN`. See [compatibility](./COMPATIBILITY.md) for migration details.

Runtime theme resolution preserves supplied native structured arrays/objects, their references and scalar siblings. Typed view/text/image results retain their primitive types. Compiled variant maps carry internal metadata with unchanged string keys, including through object spread; ambiguous legacy maps should be regenerated.

Static transform arrays and numeric `shadowOffset` / `textShadowOffset` now compile directly as native values, preserving transform order and whole-value composition replacement. Animated values, nested tokens and other unsupported structured shapes fail explicitly; pass them through React Native's runtime `style` prop. See the exact supported operations and migration notes in [compatibility](./COMPATIBILITY.md#static-structured-compiler-boundary).

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
import { createRecipeResolver } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
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


Required consumer regression fixtures and both compiler benchmark fixtures belong to the package. Missing required coverage fails rather than disappearing when an app is absent. Host benchmark JSON explicitly reports native/device performance as unmeasured; see [coverage and qualification](./COMPATIBILITY.md#coverage-and-qualification).


Compiled physical border widths/colors now normalize to four sides for tokens, literals and literal CSS `border` output. Later broad/side declarations preserve authored order across compositions. Regenerate compiled artifacts together; raw runtime styles retain native behavior. See [alpha border migration](./COMPATIBILITY.md#supported) for the physical-only boundary.


Generic `style` compositions and `styleVariants` now preserve complete primitive references and enforce compatible native inline overrides. Literal-only rules keep the legacy generic result; mixed references return a union. See [primitive-reference types and migration](./COMPATIBILITY.md#primitive-references-and-generic-composition-types), including explicit legacy type selection for generic forwarding functions.

Compiled physical border radii now expand to four corners for tokens and literals, preserving broad/corner authored order. Regenerate dependent artifacts together. See [alpha radius migration](./COMPATIBILITY.md#supported) for the physical-only boundary and unsupported elliptical CSS expressions.

Numeric `flex` now stays a native field for tokens and literals; explicit grow/shrink/basis siblings survive. CSS flex strings require migration to explicit native properties. Regenerate compiled artifacts together; see [alpha flex migration](./COMPATIBILITY.md#supported).

Spacing Inline/Block aliases now normalize before ordered merging; direction-dependent Start/End fields remain native. Four existing logical radius fields now pass compilation. Regenerate compiled artifacts together; see [spacing-alias migration and native precedence](./COMPATIBILITY.md#supported).

Inset aliases now normalize to native sides/start/end before ordered merging for tokens and literals. Unsupported multi-value CSS forms require explicit side properties. Regenerate compiled artifacts together; see [alpha inset migration](./COMPATIBILITY.md#supported).

Generic authoring now rejects unsupported side compound/style borders with actionable compiler migration guidance. Use side width/color plus global borderStyle where the native primitive supports it; literal broad border remains supported. See [side-border admission](./COMPATIBILITY.md#supported).
