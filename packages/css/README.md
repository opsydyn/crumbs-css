<p align="center">
  <img src="https://raw.githubusercontent.com/opsydyn/crumbs-css/main/packages/css/crumbs-css-header.png" alt="Crumbs CSS" width="100%" />
</p>

# @opsydyn/crumbs-css v1

Typed React Native style authoring, themes and design-system tooling with a familiar vanilla-extract-shaped API.

Version `1.2.0` adds Expo SDK 58 / React Native 0.88 compatibility and optional genuine Expo Rust worker routing, retaining SDK 56/57 and the v1 API. See the [release status](https://github.com/opsydyn/crumbs-css/blob/main/docs/releases/1.2.0.md) for publication and release-gate status. Earlier version-specific performance exceptions are not carried forward.

Full consumer documentation lives in the Starlight docs workspace in this repo:
[github.com/opsydyn/crumbs-css/tree/main/docs](https://github.com/opsydyn/crumbs-css/tree/main/docs)

Published docs are also available at
[opsydyn.github.io/crumbs-css](https://opsydyn.github.io/crumbs-css/).

Validated consumer baseline:

- Expo SDK 56 / React Native 0.85
- Expo SDK 57 / React Native 0.86
- Expo SDK 58 / React Native 0.88, React / React DOM 19.3.1 (requires Crumbs 1.2.0)
- React 19.2 on the retained SDK 56/57 lines

React Native peers are bounded to `>=0.85 <0.87 || >=0.88 <0.89`; RN 0.87 remains unqualified. Crumbs tooling requires Node `>=22.0.0`; SDK 56/57 tooling needs `>=22.13.0` and SDK 58 needs `^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`. Packed consumers pass types, motion contracts and production Metro exports for iOS, Android and web. Physical-device and performance acceptance are separate.

## Coding agents

The repository provides a [Crumbs consumer skill](https://github.com/opsydyn/crumbs-css/tree/main/.agents/skills/crumbs-css) for the versioned v1 APIs and SDK 56/57/58 setup, including typed theme/slot patterns and native boundaries. [Copy the whole skill into your app](https://opsydyn.github.io/crumbs-css/how-to/use-agent-skill/) and invoke `$crumbs-css` in Codex. It is repository content; the npm tarball does not contain the skill.

## What it is

`@opsydyn/crumbs-css` compiles `.css.ts` modules into React Native style payloads at Metro transform time. It provides native style composition, component recipes, finite atomic utilities, typed/scoped tokens, standalone variables, container conditions, native motion, colour/typography algebra, and typed runtime factories. Optional tooling covers token codecs/optics, manifests, policy, ownership, migrations, DTCG import and style explanations.

## API map

| Need | Import suffix | APIs to start with |
| --- | --- | --- |
| Native style authoring | `/style` | `style`, `styleVariants`, `viewStyle`, `textStyle`, `imageStyle` |
| Component variants and typed slots | `/style`, `/theme/recipes` | `recipe`, `componentRecipe`, `componentRecipeFromRecipe`, `extendComponentRecipe`, `createRecipeResolver`, `createComponentRecipeResolver` |
| Atomic utility scales | `/style`, `/theme/sprinkles` | `defineProperties`, `createSprinkles`, `createSprinklesLookupPlan`, `createSprinklesResolver` |
| Theme contracts and React resolution | `/style`, `/theme/core` | `createThemeContract`, `createTheme`, `ThemeProvider`, `useThemedStyle`, `useThemedStyles`, `useThemeSelector` |
| Typed design tokens and scoped themes | `/tokens`, `/theme` | `token`, `alias`, `createTokenContract`, `createTokenTheme`, `applyTokenThemePatch`, `TokenThemeProvider`, `TokenThemeScopeProvider`, `useTokenTheme` |
| Token-only runtime styles | `/theme/token` | `themeToken`, `createTokenStyles`, `resolveTokenStyles`, `useTokenStyles` |
| Standalone variables and local assignment | `/style`, `/theme/vars` | `createVar`, `fallbackVar`, `assignVars`, `resolveAssignedStyles`, `useAssignedStyles` |
| Responsive and accessibility conditions | `/theme/conditions` | `createNativeConditionStore`, `createNativeConditionResolver`, `useNativeConditionSnapshot`, `traceNativeConditionBranches` |
| Named container conditions | `/theme/containers` | `defineContainer`, `useContainerLayout`, `ContainerProvider`, `useContainerValue`, `getContainerBucket`, `resolveContainerValue` |
| Native motion | `/theme/motion`, `/theme/motion/native` | `defineMotion`, `useNativeMotion` |
| Functional token expressions | `/theme/expressions` | `createNativeExpressionLiteral`, `createNativeExpressionTokenReference`, `createNativeExpressionAdd`, `createNativeExpressionClamp`, `createNativeExpressionMatch`, `evaluateNativeExpression`, `foldNativeExpression` |
| Immutable token lookup and codecs | `/tokens/optic`, `/tokens/schema`, `/tokens/schema/value` | `createTokenThemeFocus`, `externalTokenThemeCodec`, `decodeExternalTokenTheme`, `encodeExternalTokenTheme`, `decodeTokenValue` |
| Colour and typography algebra | `/tokens/algebra` | `createColor`, `mixColor`, `setColorAlpha`, `multiplyColorAlpha`, `toNativeColor`, `createTypography`, `scaleTypography`, `createTypographyScale`, `toNativeTypography` |
| Typed runtime factories | `/extensions` | `defineExtension`, `ExtensionError` |
| Design-system manifests | `/tooling/manifest` | `assembleManifest`, `projectTokenContract`, `projectComponentRecipe`, `compareManifests`, `checkManifestConsumers` |
| Policy and governance | `/tooling/policy`, `/tooling/ownership` | `checkDesignSystemPolicy`, `getBuiltInPolicyPreset`, `annotateDesignSystemReport` |
| DTCG import and source migrations | `/tooling/dtcg`, `/tooling/migrations` | `importDtcgTheme`, `planSourceMigration` |
| Explain styles | `/devtools` | `explainStyle`, `StyleExplanationInputError` |
| Metro integration and diagnostics | `/metro-plugin`, package root | `withNativeStyles`, `createNativeStylesCacheStore`, `NativeStylesDiagnosticCode`, `formatNativeStylesDiagnostic` |

Every public value and type is listed in the [complete API index](https://github.com/opsydyn/crumbs-css#complete-public-api) and the [API reference](https://opsydyn.github.io/crumbs-css/reference/package-entrypoints-and-apis/).

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

Check the release status above for availability, then install the compatibility release in your Expo app:

```sh
bun add @opsydyn/crumbs-css@1.2.0
# or
npm install @opsydyn/crumbs-css@1.2.0
```

Peer dependencies: `react`, `react-native`, and `metro`. TypeScript `>=5.9 <7` is an optional peer only for consumers that import the source migration tooling.

Current `react-native` peer range: `>=0.85 <0.87`.

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

## Import DTCG tokens

The opt-in `@opsydyn/crumbs-css/tooling/dtcg` API imports an explicitly supplied
DTCG Format/Resolver snapshot into the version-1 Crumbs theme payload. It
requires the target manifest and contract identity, uses only the in-memory
absolute-URI document map you provide, and returns stable source diagnostics
plus a provenance sidecar. Its sRGB, dimension, duration, opacity, font-family,
and stroke-style conversions are documented in the [DTCG import guide](https://opsydyn.github.io/crumbs-css/how-to/import-dtcg-tokens/).

The adapter is synchronous and tooling-only; Effect 4 is an internal bundled
implementation detail and is not a userland import requirement. Its 100,000
JSON-node input/traversal guards are not a token-count promise. On the retained
host run, 1,000 generated tokens imported successfully while 10,000 and 50,000
were rejected by the guard. Device performance and Android acceptance remain
unmeasured/parked. Regenerate the deterministic fixture receipt with
`bun run dtcg:qualify` and run host timings from `packages/css` with
`bun run bench:dtcg-import`.

## Local design-system ownership reports

The opt-in `@opsydyn/crumbs-css/tooling/ownership` entrypoint attaches a local
owner map to compatibility, policy, source-migration, style-explanation, and
DTCG import reports. The owner map is a separate versioned JSON document keyed
by exact token or component IDs from explicitly supplied manifests; it does not
change the portable manifest schema. `ownership:annotate` reads only the
ownership map, manifests, and report named by its flags. Assigned, unassigned,
and unresolved references remain visible with source JSON Pointer locations.

```sh
bun run ownership:annotate -- \
  --ownership .crumbs/design-system-ownership.json \
  --manifest .crumbs/current-manifest.json \
  --report .crumbs/policy-report.json \
  --format text
```

Effect 4 Schema stays bundled behind the tooling subpath. Consumers do not
need an Effect dependency; no editor account or telemetry service is involved.
See the [ownership guide](https://opsydyn.github.io/crumbs-css/how-to/annotate-design-system-ownership/).
Repository maintainers can rebuild the package and regenerate fixed qualification
evidence with `bun run ownership:qualify`.

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

## Typed local assignment (M11.1)

Declare `createVar` and `fallbackVar` through `/style` in `.css.ts`; use immutable `assignVars` snapshots and `useAssignedStyles` through `/theme/vars`. Clearing replaces a complete instance snapshot and restores its literal or typed theme defaults. The existing provider supplies reached theme fallbacks. See the [local-variable guide](https://opsydyn.github.io/crumbs-css/how-to/use-local-variables/).

Published `1.1.1` includes matching local plan v1 compiler/runtime support. The [M11.1 packet](https://github.com/opsydyn/crumbs-css/tree/main/docs/evidence/2026-10-08-m11-1-local-vars) records earlier feature checks; the [1.1.1 release status](https://github.com/opsydyn/crumbs-css/blob/main/docs/releases/1.1.1.md) records publication and Expo 56/57 compatibility.

## Named native container conditions (M11.2)

The optional `@opsydyn/crumbs-css/theme/containers` entry exports `defineContainer`, `getContainerBucket`, `resolveContainerValue`, `useContainerLayout`, `ContainerProvider` and `useContainerValue`. Define named width/height buckets in ordinary `.ts` files, attach one handle to one independently constrained View, and select an exhaustive map with an explicit `unmeasured` branch. Thresholds are lower-inclusive and fractional; zero is measured. Siblings are independent and nearest matching nested owners shadow ancestors.

Same-bucket events publish nothing; selected references use `Object.is`. Stable frozen maps reuse admission; mutable maps refresh on the next render. Key the hook owner when replacing a native View. Sequential layout feedback still needs independent axis constraints. Native portal adapters that re-render children at a host require a source-value prop bridge or a fresh destination owner.

The entry builds independently with React as its only runtime dependency. It adds no compiler syntax, recipe/Sprinkles condition or theme/window axis. Published `1.1.1` includes this entry. See the [container guide](https://opsydyn.github.io/crumbs-css/how-to/use-container-conditions/) and the M11.2 evidence packet for examples and qualification limits; historical alpha artifacts may lack the entry.

## Typed native motion (M11.3)

The additive `/theme/motion` entry exports only `defineMotion`; `/theme/motion/native` exports only `useNativeMotion`. Define immutable named opacity/translation/scale states in ordinary `.ts`; the optional Hook owns public Animated nodes with safe interruption, scoped cancellation, committed preferences and lifetime cleanup. Pass `motion: 'full' | 'reduced'` explicitly from the application accessibility source, starting reduced until resolved. Numeric duration is milliseconds in `[0,60000]`. Returned transforms replace the whole field; put static transforms on a wrapper.

The pure graph has no runtime peers; the native graph uses public React/React Native only. Existing exports, compiler payloads, dependencies and token durations remain unchanged. See the [native-motion guide](https://opsydyn.github.io/crumbs-css/how-to/use-native-motion/) for result/lifetime semantics and `docs/evidence/2026-10-09-m11-3-native-motion` for exact artifact and distinct host/native acceptance. Published `1.1.1` includes both entries with qualification inherited byte-for-byte from 1.1.0. Physical devices, spoken readers, live authored-style HMR and release performance remain separate; historical alpha artifacts may lack the entries.

### Pure colour and typography algebra (M11.4)

Import `createColor`, `mixColor`, alpha operators and `toNativeColor` from
`@opsydyn/crumbs-css/tokens/algebra` to derive explicit sRGB/linear-light
colours. `createTypography`, `scaleTypography`, `createTypographyScale`
and `toNativeTypography` retain exact named scales and ordinary unscaled
native metrics. The optional entry has no runtime externals. Derive once
or memoise design inputs; let native Text own accessibility font scaling.
See the [guide](https://opsydyn.github.io/crumbs-css/how-to/use-token-algebra/)
and [M11.4 evidence](../../docs/evidence/2026-10-09-m11-4-token-algebra/README.md)
for admission, precision, qualification and release limits.

## Typed runtime extensions (M11.5)

Library authors can pair a type-only runtime namespace with
`defineExtension<typeof Runtime>().factory({importPath, importName})` from
`@opsydyn/crumbs-css/extensions`. A stylesheet exports the typed component result;
an app imports it directly. Literal wrappers need no provider; themed wrappers
use the existing `ThemeProvider`. Arguments become bounded, immutable module
snapshots and named factories reconstruct once per module evaluation. Aliases
share results; separate calls stay distinct. No arbitrary closures are serialised.

See the [runtime-extension guide](https://opsydyn.github.io/crumbs-css/how-to/create-runtime-extensions/)
for a complete library/app example, portable data and endpoint limits. Published
`1.1.1` includes this API; historical alpha artifacts may lack it. Publication
and physical-device/performance acceptance have separate evidence.

Runtime-extension linkage uses stock Expo/Node conditions without synthetic platform
or development/production branches. Version 1 refuses ambiguous platform/native
sibling files and mixed static ESM-to-CommonJS imports/reexports; use explicit
variant export targets and a pure ESM graph or direct static CommonJS facade.
Missing sibling candidates remain receipt inputs, so later file creation invalidates
linkage. Custom resolver conditions/aliases are outside this integration contract.

For Node factory graphs, version 1 also refuses package export maps containing
`module-sync` or `node-addons` conditions. Those built-in branches cannot share a
reliable proof across the qualified Node floor/current versions and the integration
compiler. Use the supported `node`/`import`/`require`/`default` export branches.
