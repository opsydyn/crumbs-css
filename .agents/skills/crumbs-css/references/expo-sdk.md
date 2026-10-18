# Expo SDK setup and worker routing

Check the installed Crumbs version first. Crumbs 1.1.0/1.1.1 qualify SDK 56/RN 0.85 and SDK 57/RN 0.86; they do not declare RN 0.88. Crumbs 1.2.0 adds SDK 58/RN 0.88; 1.3.0 retains these SDK profiles and adds the optional native inspector. A source candidate or matching version label does not establish npm publication: check the release status and installed artifact. Never fix an unsupported SDK by forcing peers.

| SDK | Matched qualification inputs | Tooling Node |
| --- | --- | --- |
| 56 | Expo 56.0.4, React/DOM 19.2.8, RN 0.85.3 | >=22.13.0 |
| 57 | Expo 57.0.27, React/DOM 19.2.8, RN 0.86.3 | >=22.13.0 |
| 58 | Expo 58.0.14, React/DOM 19.3.1, RN 0.88.0, Metro 0.87.1 | ^22.13.0 or ^24.3.0 or ^26.0.0 or >=27.0.0 |

The library's own Node floor stays >=22.0.0 and React peer stays >=19<20. Its RN union is>=0.85<0.87 or>=0.88<0.89; RN 0.87 is unqualified. React patches and optional Expo CLI/Router/Worklets peers must form a matching cohort; do not copy the SDK 58 animation versions into SDK 57. Current internal apps use SDK 58; the library keeps SDK 56 development peers.

## Preserve Metro and use Babel by default

Wrap the app's existing Expo config, including existing customisations:

```js
// metro.config.js
const {getDefaultConfig} = require('expo/metro-config');
const {withNativeStyles} = require('@opsydyn/crumbs-css/metro-plugin');
module.exports = withNativeStyles(getDefaultConfig(__dirname));
```

SDK 58's qualified default preset uses Expo's own physical preset identity:

```js
// babel.config.js — merge required app customisations after inspecting them
module.exports = function(api) {
  api.cache(true);
  return {presets: [require('expo/internal/babel-preset')]};
};
```

In the matched Expo 58 cohort this canonical preset preserves upstream default-config eligibility under Bun. Different physical copies of an equivalent preset can cause all-Babel fallback. Expo supplies required Worklets transforms for the matched installation. Remove a redundant explicit plugin only after confirming the app's real transform still works; custom required transforms take precedence over Rust eligibility.

## Optional genuine Expo Rust worker — SDK 58 only

Babel is the default when the Rust flag is absent. To opt in, merge this experiment into the existing Expo app config:

```js
// app.config.js — Rust opt-in; leave the flag out for the Babel control
module.exports = ({config}) => ({
  ...config,
  experiments: {...config.experiments, noxcturnalTransformWorker: true},
});
```

Restart Metro after changing its worker or Babel configuration. Use separate fresh caches when comparing backends. The Crumbs repository apps expose the same choice as `CRUMBS_METRO_WORKER=rust`; that name is their app-config convenience, not a Crumbs public environment API. Existing SDK 56/57 apps retain their supported worker setup.

Crumbs still compiles `.css.ts` through Vanilla Extract. It delegates generated and ordinary JavaScript to Expo's supervising worker. This integration does not replace the Crumbs compiler or promise a speedup. No direct Rust binary/package dependency is required by Crumbs.

Expo chooses a backend per file. Codegen uses Babel; Animated/Worklets candidates and Worklets can use Babel; custom Babel/parser configuration can use Babel. The repository Storybook's legacy `react-native-modal-datetime-picker` contains unannotated Flow and retains a narrow parser override for that package only. Do not remove required transforms, patch Expo's eligibility checks, or silently accept all-Babel fallback as Rust qualification.

A flag-on build/export proves functional compilation, not actual Rust execution. Retain upstream `transform:noxcturnal:full` events with `status: complete` for an eligible app module and dependency module, plus explicit fallback file/reason pairs. Record these outside performance timing. The repository qualifies eligible app and React JSX modules and requires native-codegen/Animated plus Storybook Worklets/legacy-Flow fallbacks. Keep ordinary runtime bundles free of authored `.css.ts`, compiler and Effect imports.

Source maps provide authored export/import anchors, not property-level precision. Normal Expo consumer types pass; the minimal skipLibCheck:false RN 88 probe retains three upstream declaration errors. Workspace Doctor duplicate-peer warnings, Storybook's preexisting native-folder warning and the internal Rust flag's remote-schema warning are explicit limitations; do not suppress diagnostics or infer physical peer identity from a version label.

Both repository apps have owned iOS 26.5 and Android 16 functional development-client evidence under Babel and Rust. That evidence does not establish another app's native behavior, physical-device/spoken-reader acceptance, release FPS or compiler throughput. Use the consuming app's own target and report the checks actually run.
