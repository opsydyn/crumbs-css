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
- `defineProperties` and `createSprinkles`
- `createThemeContract`
- `createTheme`

## Current guarantees

- React Native focused, not a browser CSS runtime
- Metro-transform based
- Typed authoring helpers for view, text, and image styles
- Finite, primitive-scoped utility scales with typed shorthands
- Utility outputs compose with native helpers and recipe branches; mapped `styleVariants(values, mapper)` preserves the native result type
- Generated Sprinkles lookup plans keep runtime utility selection finite and non-Cartesian
- Bounded runtime Sprinkles and recipe resolvers expose cache statistics and lifecycle controls
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

Peer dependencies: `react`, `react-native`, and `metro`. TypeScript `>=5.9 <7` is an optional peer only for consumers that import the source migration tooling.

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

## Dynamic utility selection

`createSprinkles` is the static authoring path. For state-driven choices,
export a `createSprinklesLookupPlan` from the `.css.ts` module and create a
`createSprinklesResolver` in component code. The generated plan has one
compiled reference per property and scale, so it does not enumerate every
possible combination. Resolve the plan through `useThemedStyles` when its
scales contain theme tokens:

```ts
// spacing.css.ts
import { createSprinklesLookupPlan } from "@opsydyn/crumbs-css/style"

export const sprinklesPlan = createSprinklesLookupPlan(viewProperties, "spacing")
```

```tsx
import { createSprinklesResolver } from "@opsydyn/crumbs-css/theme"
import { useThemedStyles } from "@opsydyn/crumbs-css/theme/core"
import { useMemo } from "react"

const themed = useThemedStyles({ sprinklesPlan })
const resolve = useMemo(
  () => createSprinklesResolver(themed.sprinklesPlan),
  [themed.sprinklesPlan],
)
const style = resolve({ px: compact ? "sm" : "lg" })
```

The resolver preserves selection and shorthand target order and returns a
readonly style array. Its resolver-local cache defaults to 32 entries, accepts
`0..1024`, and exposes `getCacheStats()`, `clearCache()`, and `dispose()`.
`NativeSprinklesLookupPlan` and `NativeSprinklesResolver` keep authored static
selection separate from runtime selection in the public type surface.

## Runtime structured values

Legacy token ownership uses exact raw paths: repeated identical paths can share a token name, while different paths that sanitize to the same name fail atomically. Theme creation rejects misplaced/unregistered leaves and exposed token paths are frozen. Namespace contract roots by package/design system until explicit package identities arrive; see [compatibility](./COMPATIBILITY.md#legacy-contract-ownership).

Named `.css.ts` exports can include ordinary finite primitives, dense arrays and plain data records alongside styles. These values survive compilation; unsupported runtime values fail with `CRUMBS_CSS_UNSUPPORTED_EXPORT`. Import constants directly and keep them outside style namespaces passed to theme resolvers. See [compatibility](./COMPATIBILITY.md#ordinary-export-contract) for identity limits and migration guidance.

Token-reference payloads require exactly own enumerable `$$type` and `varName` data fields and a `--crumbs-[A-Za-z0-9_-]+` name. Malformed tagged values fail with a stable diagnostic; guards never evaluate reference accessors. Theme resolution uses own token values and reports missing values with `CRUMBS_CSS_MISSING_THEME_TOKEN`. See [compatibility](./COMPATIBILITY.md) for migration details.

Runtime theme resolution preserves supplied native structured arrays/objects, their references and scalar siblings. Typed view/text/image results retain their primitive types. Compiled variant maps carry internal metadata with unchanged string keys, including through object spread; ambiguous legacy maps should be regenerated.

Static transform arrays and numeric `shadowOffset` / `textShadowOffset` now compile directly as native values, preserving transform order and whole-value composition replacement. Animated values, nested tokens and other unsupported structured shapes fail explicitly; pass them through React Native's runtime `style` prop. See the exact supported operations and migration notes in [compatibility](./COMPATIBILITY.md#static-structured-compiler-boundary).

## Style explanations

For development debugging, import `explainStyle` and its report types from the
isolated `@opsydyn/crumbs-css/devtools` subpath. It explains one explicit
export path from a transformed module using the current and optional previous
theme, selection, condition, and component-extension inputs. Reports include
resolved values, branch decisions, declaration winners and overridden
declarations, token dependencies, coverage, and plan-derived input changes.

Development transforms include the versioned `__crumbsDev` provenance sidecar
by default. Production transforms omit it unless explicitly enabled. To set
the Metro behavior, add `includeStyleExplanations` under
`config.transformer.nativeStyles`; `false` disables development metadata and
`true` opts production transforms in. Production inclusion increases emitted
module data, so enable it only for builds that need those explanations.

`explainStyle` returns typed ordinary data and uses Effect 4 Schema internally;
consumers do not need an Effect import. Missing provenance is reported as
unavailable coverage, compatibility and opaque values remain partial, and
malformed metadata fails with a stable input error. A transition compares only
the explicit snapshots and dependency plan. It does not report a React render,
cache hit, or device observation. See the [style explanation guide](https://opsydyn.github.io/crumbs-css/how-to/explain-native-styles/) for examples and limits.

## Design-system manifests

Packages can build a deterministic JSON manifest from explicitly selected token
contracts, component recipes, and compiled style modules. Import the opt-in
tooling API from `@opsydyn/crumbs-css/tooling/manifest`; it is not re-exported
from the package root or runtime theme entrypoints. Supply package-relative
source origins and lifecycle annotations with the roots you own. The manifest
records unresolved references and compiler-observed capabilities without
including resolved theme values or machine paths. Effect 4 Schema stays behind
the tooling entrypoint, so ordinary consumers do not need an Effect import.

The M9.1 repository fixture and packed-export/runtime qualification can be
repeated with:

```sh
bun run manifest:qualify
```

### Check and compare manifests

`manifest:check` reads only the files you name. Without a baseline it checks
the current provider manifest for references to private tokens. Add a baseline
to compare public token and component contracts:

```sh
bun run manifest:check -- --current design-system-manifest.json
bun run manifest:check -- --current design-system-manifest.json \
  --consumer apps/web/design-system-manifest.json \
  --consumer apps/mobile/design-system-manifest.json --format json
bun run manifest:check -- --baseline releases/1.2.0/design-system-manifest.json \
  --current design-system-manifest.json \
  --consumer apps/web/design-system-manifest.json --format text
```

Pass one `--consumer` for each consumer manifest you want considered. The
checker does not discover workspaces or infer omitted consumers. It attributes
token findings only from explicitly supplied external dependency edges with a
stable target ID. Reports use `error`, `warning`, and `info` finding levels;
they do not assign a SemVer version or make a release decision. Exit status is
`0` when there are no error-level findings, `1` when the report contains an
error, and `2` for invalid arguments, unreadable files, or invalid manifests.

Every report states its analysis limits. Coverage is restricted to the roots
declared in the supplied manifests, and manifest v1 cannot attribute consumer
usage of component slots or variants. With no consumer files, the report marks
consumer impact unknown; unresolved references are also called out. Treat a
clean report as evidence about those inputs only, not proof that every consumer
or visual impact was analyzed.

Repository maintainers can regenerate the deterministic M9.2 fixture report
and receipt with `bun scripts/m9-2-manifest-qualification.ts`. This command is
specific to the checked-in qualification fixtures; it is not the general
consumer command.

See the [manifest generation guide](https://opsydyn.github.io/crumbs-css/how-to/generate-design-system-manifests/)
for the assembly workflow, lifecycle metadata, and interpretation limits.

### Check design-system policy

The tooling-only `@opsydyn/crumbs-css/tooling/policy` API checks explicitly
supplied manifests, style metadata, policy, and measurement files. Start with
`migration@1` warnings, then promote rules with severity overrides or use
`enforce@1` errors when your evidence is ready. The six rules cover scoped
literals, semantic tokens, supplied-consumer private-token edges, explicit
target capabilities, deprecations, and measured output budgets. Findings stay
visible when their level changes or an exact exception applies.

```sh
bun run policy:check -- --policy policy.json --current manifest.json \
  --consumer apps/mobile/manifest.json \
  --style-metadata .crumbs/card.style-metadata.json \
  --measurement .crumbs/output-measurements.json --format json
```

Inputs are never discovered. Missing evidence appears as an analysis limit; a
budget uses only a measurement matching its metric, scope, and unit. Expiring
exceptions use a caller-supplied `--evaluated-on` date. Policy reports do not
make release decisions, and Android/device support is not inferred. See the
[policy guide](https://opsydyn.github.io/crumbs-css/how-to/check-design-system-policy/)
for rule behavior, exception handling, and report limits.

## Safe design-system source migrations

The local `migrate:source` command plans explicit token and recipe-slot source
migrations from a versioned map and baseline/current manifests. It defaults to
dry-run; `--write` applies only reviewed edits to explicitly named files. One
blocking or ambiguous edit prevents writes to every file in that invocation.
The tool does not scan for consumers, so teams must supply and review the full
file list they intend to migrate.

See the [source migration guide](https://opsydyn.github.io/crumbs-css/how-to/migrate-design-system-sources/)
for the v1 map format, recognized syntax, optional TypeScript peer, and
qualification limits. Repository maintainers can run `bun run migrations:qualify`
to regenerate the checked-in fixture evidence.

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
