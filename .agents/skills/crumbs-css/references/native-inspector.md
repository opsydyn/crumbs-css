# Native style inspector (Crumbs 1.3.0+)

Check the installed package and export map. Version 1.3.0 adds
`@opsydyn/crumbs-css/devtools/native`; 1.2.0 has only the headless
`explainStyle` API at `/devtools`. On 1.2.0, use that API for explicit reports or
propose an upgrade within the user's scope; do not invent a widget entry.

## Add a recipe probe

This extends the four files in [the ActionCard example](design-system.md).
It inspects only `card`, not the separately composed padding/local accent or the
final native style. Keep the existing `Pressable.onPress={onActionPress}`.

All inspector **value imports** belong to the development module. Conditional JSX
around unconditional imports does not isolate the production graph. For Metro:

```tsx
// inspector.tsx — safe for ordinary components to import
import type {ComponentType, ReactNode} from 'react';

const development: typeof import('./inspector.dev') | null =
  __DEV__ ? require('./inspector.dev') : null;

export const InspectorHost: ComponentType<{children: ReactNode}> =
  development?.InspectorHost ?? (({children}) => <>{children}</>);
export const CardProbe = development?.CardProbe ?? (() => null);
```

```tsx
// inspector.dev.tsx — reached only in development
import type {ReactNode} from 'react';
import * as Clipboard from 'expo-clipboard';
import type {NativeComponentPublicProps} from '@opsydyn/crumbs-css/style';
import {useTheme} from '@opsydyn/crumbs-css/theme/core';
import {
  CrumbsDevtoolsProvider, CrumbsDevtoolsWidget, useCrumbsInspectorTarget,
} from '@opsydyn/crumbs-css/devtools/native';
import * as cardStyles from './card.css';

type Selection = NativeComponentPublicProps<typeof cardStyles.card>;

export function InspectorHost({children}: {children: ReactNode}) {
  return <CrumbsDevtoolsProvider>
    {children}
    <CrumbsDevtoolsWidget placement="bottom-right" insets={{bottom: 32, right: 16}}
      copyText={async text => { await Clipboard.setStringAsync(text); }} />
  </CrumbsDevtoolsProvider>;
}

export function CardProbe({tone}: {tone: Selection['tone']}) {
  const theme = useTheme();
  useCrumbsInspectorTarget({
    label: 'ActionCard recipe',
    exportPath: ['card'],
    getInput: () => ({
      module: {...cardStyles},
      exportPath: ['card'],
      current: {theme, selection: {tone}},
    }),
  });
  return null;
}
```

For the companion example, replace `App.tsx` with this scoped root. In an existing
app, preserve its providers/layout and add the host around them:

```tsx
// App.tsx
import {TokenThemeProvider, TokenThemeScopeProvider} from '@opsydyn/crumbs-css/theme';
import {ActionCard} from './ActionCard';
import {InspectorHost} from './inspector';
import {theme, vars} from './foundation';

const darkMode = {color: {panel: '#172133', copy: '#f2f5ff'}};

export function App({onActionPress}: {onActionPress: () => void}) {
  return <InspectorHost>
    <TokenThemeProvider contract={vars} theme={theme}>
      <ActionCard label="Continue" onActionPress={onActionPress} />
      <TokenThemeScopeProvider contract={vars} context="mode" values={darkMode}>
        <ActionCard label="Nested theme" onActionPress={onActionPress} />
        <ActionCard label="Preview" tone="secondary" onActionPress={onActionPress} />
      </TokenThemeScopeProvider>
    </TokenThemeProvider>
  </InspectorHost>;
}
```

In `ActionCard.tsx`, import `CardProbe` from `./inspector` and wrap its existing
Pressable return in a fragment with `<CardProbe tone={tone} />` as a sibling.
Keep the original Pressable and children unchanged. The probe then reads the
same nearest theme as `useThemedStyles`, including nested `TokenThemeScopeProvider`
overrides. Do not move it to the global host. Call Hooks unconditionally inside
the probe; its production implementation returns null. Mount the host above all
probes; registration without a provider throws.

Install Expo Clipboard with `npx expo install expo-clipboard` only if choosing
this adapter, and rebuild a dev client missing its native module. Clipboard is an
app dependency, not a Crumbs dependency. For an existing host adapter, replace
that import/callback with the host's `(text: string) => Promise<void>`. Adapt insets
to the app's existing safe-area values in logical units; fixed example offsets
are not safe-area measurement. No Effect imports or services are needed.

## Supply the inputs actually rendered

- Keep the **whole original compiled namespace** in `module: {...cardStyles}`,
  including `__crumbsDev` and `__crumbsModule`. Metro namespaces can expose
  accessors; explicitly snapshot the trusted namespace inside `getInput`.
  Resolved styles, a selected recipe result or StyleSheet IDs are not substitutes.
- Use the same `exportPath` in the target and its input. Supply committed current
  theme and recipe selection. For a conditional or extended recipe, also supply
  the same `current.conditions` snapshot and ordered `current.extensions` chain
  used by its resolver. Do not mutate input objects behind React's back.
- Keep explanation work in the deferred getter. Do not call `explainStyle` on
  render, on registration or on each press. Closed updates do not call getters.
  Each mounted probe has its own identity; duplicate labels are allowed.

## Diagnose and share

| Observation | Next check |
| --- | --- |
| No target | Is the probe mounted below this inspector provider? Check capacity: 200 targets per provider. An overflow warning remains until provider remount. |
| Wrong theme/variant | Check nearest theme scope, exact export path and supplied selection/conditions/extensions against the component resolver. |
| `unavailable` / `metadata-missing` | Check original namespace and development metadata. Metro dev transforms include it by default; production omits it. `transformer.nativeStyles.includeStyleExplanations: false` disables it. Restart Metro after config changes. |
| `partial` | Read limitations: compatibility-only metadata, opaque values or a metadata/value mismatch. Preserve the label; do not claim complete provenance. |
| Stale report | Select the target or press Refresh after committed inputs change. Capture is on demand, not continuous. Closing clears selection/report; unmount releases registration. |
| Copy fails | Check the host callback and native module. Preview prepares the exact bounded JSON sent to copy; do not implement a second serializer. |

Review Preview before sharing: reports can contain source paths and private values.
Optional `redactReport(capture)` returns the JSON value for preview/copy, without
changing the on-screen explanation. Cycles, accessors, non-JSON values, throwing
redactors and payloads over 256 KiB UTF-8 are rejected before clipboard writes.
Stale captures and late copy completions cannot become fresh successful captures.

The widget explains supplied Crumbs inputs. It does not pick native elements,
inspect final host styles, sample pressed/animated state or edit tokens. `complete`
coverage is about captured metadata for this export, not all styles on the screen.

## Verify the consuming app

Typecheck the integration. Export a production target and inspect its source map
for absence of the debug module and `/devtools` implementation; conditional
rendering alone is not evidence. Keep the default production metadata exclusion.
Exercise selection, input-change/Refresh, Preview/Copy and Close/native Back on the
requested platform when available. Distinguish these from static checks and from
physical-device, spoken-reader and performance acceptance.

The [full guide and screenshots](https://opsydyn.github.io/crumbs-css/how-to/explain-native-styles/)
and [API index](https://opsydyn.github.io/crumbs-css/reference/package-entrypoints-and-apis/)
provide the complete report model. This copied reference requires no repository
source paths or unpublished APIs.
