# M10.5 Expo/Metro mixed-entry interoperability qualification

- Date: 2026-10-04
- Roadmap: M10.5
- Source revision: 3e04b80c52323a537ccadfe5b79db7bce0ff6bae
- Status: Expo/Metro host qualification; no package API or production source change
- Evidence: [qualification](../evidence/2026-10-04-m10-5-expo-metro/qualification.json)

## Metro resolution

The CSS package was rebuilt from the measured source. The internal Storybook app's Metro configuration used its normal Crumbs native-styles transformer with strict diagnostics enabled. Expo source maps for both platforms resolve the compatibility theme and theme/core exports to their .mjs files, and each map contains one React 19.2.3 package root.

| Expo export | Modules | Bundle size | Theme entry modules | React package roots | Result |
| --- | ---: | ---: | --- | ---: | --- |
| Default Storybook, web | 913 | 2,482,198 B | theme.mjs, theme-core.mjs | 1 | Bundled |
| Mixed-entry probe, web | 730 | 1,643,022 B | theme.mjs, theme-core.mjs | 1 | Bundled and rendered |
| Mixed-entry probe, iOS | 1,019 | 2,123,471 B | theme.mjs, theme-core.mjs | 1 | Bundled; no device execution |
| Default Storybook, iOS | 1,102 | 2,662,632 B | theme.mjs, theme-core.mjs | 1 | Bundled; no device execution |

The web probe rendered all four checks: compatibility ThemeProvider with the theme/core useTheme hook; the inverse pairing; the Storybook TokenThemeProvider with the theme/core hook; and distinct ThemeProvider function references across the two entries. The mixed imports therefore behaved through Metro's separate modules in this React Native Web runtime. This is consistent with the shared global-symbol theme-store context, not a reference-equality guarantee.

## Full-app web limitation

The default Storybook web bundle also compiled, but its browser render stopped in AppThemeProvider with TypeError: isRTL must be a boolean. I recorded this separately; it is not evidence of mixed-entry failure because the isolated probe rendered successfully with the same Expo/Metro setup. I did not change AppThemeProvider or promote this browser-specific result into the package interoperability decision.

## Scope and next gate

Metro selected the ESM exports; its CJS require branch was not exercised. The iOS exports are bundles only: bytecode was disabled, and there was no Hermes, simulator, or device execution. Android remains parked and last.

The exact Node v22.0.0 host-budget gate has since been completed against the same non-documentation source revision; see the [host-budget assessment](2026-10-04-m10-5-node-22-host-budget.md) and [qualification evidence](../evidence/2026-10-04-m10-5-node-22-host-budget/qualification.json). M10.5 remains open. The next recommended slice is to investigate the measured initialization and graph-size failures, then reconcile the warm-transform, Metro, and editor measurement identities. Preserve approved limits and baselines; keep device-facing qualification separate and Android last.
