# Typed component pattern (Crumbs 1.1.0 / 1.1.1 / 1.2.0 / 1.3.0)

Use identified typed contracts for shared design-system domains. Keep brand, mode
and density as independent `TokenThemeScopeProvider` layers when the app needs
those axes; the owning complete provider must exist first. Keep interaction and
accessibility behaviour in native components. Later entries in a style array win.

## Complete themed ActionCard

These files use normal React Native props, typed slots, finite padding utilities
and an immutable per-card border accent. An absent accent returns to the active
theme; assignment snapshots replace previous values rather than patching them.

```ts
// foundation.ts — ordinary TypeScript, not .css.ts
import {createTokenContract, createTokenTheme, token} from '@opsydyn/crumbs-css/tokens';

export const vars = createTokenContract({
  color: {accent: token.color(), panel: token.color(), copy: token.color()},
  space: {sm: token.length(), md: token.length()},
}, {identity: {owner: '@acme/ui', name: 'foundation', version: 1}});

export const theme = createTokenTheme(vars, {
  color: {accent: '#185adb', panel: '#ffffff', copy: '#18202b'},
  space: {sm: 8, md: 16},
});
```

```ts
// card.css.ts
import {
  componentRecipe, createSprinklesLookupPlan, createVar, defineProperties,
  fallbackVar, viewStyle,
} from '@opsydyn/crumbs-css/style';
import {vars} from './foundation';

export const card = componentRecipe({
  contract: {
    identity: {owner: '@acme/ui', name: 'ActionCard', version: 1},
    public: {slots: ['root', 'label'], variants: {tone: ['primary', 'secondary']}},
  },
  slots: {root: 'view', label: 'text'} as const,
  base: {
    root: {borderRadius: 12, borderWidth: 2, minHeight: 48},
    label: {color: vars.color.copy, fontSize: 16, fontWeight: '600'},
  },
  variants: {
    tone: {
      primary: {root: {backgroundColor: vars.color.panel}},
      secondary: {root: {backgroundColor: '#eef3ff'}},
    },
  },
  defaultVariants: {tone: 'primary'},
}, 'ActionCard');

const padding = defineProperties({
  primitives: ['view'] as const,
  properties: {padding: {sm: vars.space.sm, md: vars.space.md}},
});
export const paddingPlan = createSprinklesLookupPlan(padding, 'cardPadding');

export const accent = createVar('color', {
  owner: '@acme/ui', name: 'ActionCard.accent', version: 1,
});
// Local operands belong to a separate primitive row, not the recipe.
export const accentStyle = viewStyle({borderColor: fallbackVar(accent, vars.color.accent)});
```

```tsx
// ActionCard.tsx
import {useMemo} from 'react';
import {Pressable, Text, type PressableProps} from 'react-native';
import type {NativeComponentPublicProps} from '@opsydyn/crumbs-css/style';
import {useThemedStyles} from '@opsydyn/crumbs-css/theme/core';
import {createComponentRecipeResolver} from '@opsydyn/crumbs-css/theme/recipes';
import {createSprinklesResolver} from '@opsydyn/crumbs-css/theme/sprinkles';
import {assignVars, useAssignedStyles} from '@opsydyn/crumbs-css/theme/vars';
import {accent, accentStyle, card, paddingPlan} from './card.css';

const sharedStyles = Object.freeze({card, paddingPlan});
const localStyles = Object.freeze({accentStyle});
type Selection = NativeComponentPublicProps<typeof card>;
type Props = Pick<PressableProps, 'testID' | 'accessibilityLabel' | 'disabled'> & {
  label: string;
  tone?: Selection['tone'];
  compact?: boolean;
  accentColor?: string;
  onActionPress: NonNullable<PressableProps['onPress']>;
};

export function ActionCard({
  label, tone = 'primary', compact = false, accentColor, onActionPress, ...nativeProps
}: Props) {
  const themed = useThemedStyles(sharedStyles);
  const resolveCard = useMemo(() => createComponentRecipeResolver(themed.card), [themed.card]);
  const resolvePadding = useMemo(() => createSprinklesResolver(themed.paddingPlan), [themed.paddingPlan]);
  const assignments = useMemo(() => accentColor === undefined
    ? assignVars({}, {})
    : assignVars({accent}, {accent: accentColor}), [accentColor]);
  const local = useAssignedStyles(localStyles, assignments);
  const selected = resolveCard({tone});
  const spacing = resolvePadding({padding: compact ? 'sm' : 'md'});

  return <Pressable {...nativeProps} accessibilityRole="button" onPress={onActionPress}
    style={[...selected.root, ...spacing, local.accentStyle]}>
    <Text style={[...selected.label]}>{label}</Text>
  </Pressable>;
}
```

```tsx
// App.tsx
import {TokenThemeProvider} from '@opsydyn/crumbs-css/theme';
import {ActionCard} from './ActionCard';
import {theme, vars} from './foundation';

export function App({onActionPress}: {onActionPress: () => void}) {
  return <TokenThemeProvider contract={vars} theme={theme}>
    <ActionCard label="Continue" onActionPress={onActionPress} />
    <ActionCard label="Preview" compact tone="secondary" accentColor="#087f8c"
      onActionPress={onActionPress} />
  </TokenThemeProvider>;
}
```

Configure Metro with the [published quickstart](https://opsydyn.github.io/crumbs-css/tutorials/get-started/).
`createSprinkles` calls belong to static authoring. Export a lookup plan for prop-driven
selection; never export the static utility function as an ordinary `.css.ts` value.
Plans store finite scale entries without enumerating combinations. Keep resolvers
for their descriptor lifetime; dispose explicitly owned long-lived resolvers when
retiring them. Repeatedly allocating definitions or increasing cache sizes without
measurement is not a performance improvement.

For an opt-in development probe of the `card` recipe, use the [native inspector reference](native-inspector.md).

## Runtime factories

Prefer an ordinary component wrapper when it already solves the task. For a repeated
library wrapper exported from `.css.ts`, use `defineExtension<typeof Runtime>()`
from `/extensions`, a **type-only** runtime namespace, and a literal named synchronous
factory endpoint such as `@acme/ui/runtime`. Publish a real package export with its
implementation and declarations; relative paths and arbitrary closure serialization
are unsupported. Factory component props come from the named runtime function.

Use the [complete runtime extension example](https://opsydyn.github.io/crumbs-css/how-to/create-runtime-extensions/)
when implementing that library boundary. Define Hooks inside the returned component;
create components at module scope. Pass supported plain data or genuine non-local
primitive style handles. Keep recipes and lookup plans owned by the runtime wrapper;
authoring descriptors can carry metadata rejected by the argument contract. The
ActionCard's local variables/plans above cannot be handed to an extension as arguments; keep their ownership in an ordinary wrapper, or have the
runtime module import and own them separately. Generic/overloaded functions need
named monomorphic adapters. Use explicit export targets and a pure ESM graph or a
direct static CommonJS facade; ambiguous platform siblings and static ESM-to-CJS
linkage fail closed. Custom Metro conditions/aliases need separate qualification.

## Optional APIs: read the guide for the task

- [Native conditions and runtime guarantees](https://opsydyn.github.io/crumbs-css/reference/runtime-model-and-guarantees/): source application dimensions, RTL and accessibility preferences explicitly; styling does not listen to native services automatically.
- [Containers](https://opsydyn.github.io/crumbs-css/how-to/use-container-conditions/): ordinary `.ts` definitions, `onLayout`, an exhaustive bucket map including `unmeasured`, and an independently constrained View. Containers are not recipe/Sprinkles or compiler conditions.
- [Motion](https://opsydyn.github.io/crumbs-css/how-to/use-native-motion/): pure `/theme/motion` definitions, optional `/theme/motion/native` Hook, and explicit full/reduced preferences. Returned transforms replace the field; use a wrapper for static transforms.
- [Colour and typography](https://opsydyn.github.io/crumbs-css/how-to/use-token-algebra/): derive once, convert descriptors with `toNativeColor` / `toNativeTypography`, and let Text perform accessibility font scaling.
- [Design-system architecture](https://opsydyn.github.io/crumbs-css/how-to/build-a-reference-design-system/): scope axes, portal ownership and contracts; adapt the app's existing behaviour components.
- [API index](https://opsydyn.github.io/crumbs-css/reference/package-entrypoints-and-apis/): token expressions, optics/codecs, manifests, policy, ownership, DTCG and migrations. `/tooling/*` belongs to build/CI tooling rather than normal screen imports.

Validate the consumer's types and a relevant Metro export. Exercise interaction on
the platform actually requested when available. Distinguish static/host/export checks
from native rendering, screen-reader and release-performance acceptance.
