# Crumbs Storybook

Internal design-system authoring and review on **Expo 57.0.27 / React Native 0.86.3 / React 19.2.8**. Use Node **>=22.13.0** and the root frozen Bun lockfile.

From the repository root:

```sh
bun install --frozen-lockfile
bun run app:storybook       # native LiteUI, port 8090
bun run app:storybook:web   # web LiteUI
bun run app:dev             # showcase app without the Storybook browser
bun run app:check           # strict types and iOS/Android/web Storybook exports
```

The supported LiteUI includes story browsing, Controls and Actions. `storybook:native:reference` opens the reference preview without browser UI. The animated FullUI remains unqualified.

SDK 57 uses Reanimated 4.5.1, Worklets 0.10.1 and Gesture Handler 2.32.0, matching Expo's bundled native modules. React/react-dom 19.2.8 retain the separately qualified patch profile; only those two version recommendations are excluded from `expo install --check`. Other dependency checks remain active.

Metro resolves transitive dependencies within Bun's physical package graph and pins React and its renderers to this app. Native type mappings also target this app; `experiments.tsconfigPaths: false` keeps them out of Metro's web aliases. The library keeps its SDK 56 development peers, and `bun run playground:packed --sdk=56 --check` retains independent SDK 56 regression coverage.

Expo Doctor can report the library's distinct development React/native copies. The three-platform exports and native checks establish the selected app runtime; they do not qualify duplicate modules in a custom native build. If a local generated `ios/` or `android/` directory exists, Doctor also warns about unsynchronised app configuration. Regenerate it and rebuild a custom client before testing that context; this upgrade preserves existing untracked native projects.

The Metro wrapper preserves strict Crumbs diagnostics, on-device addons and runtime factory imports. `app:check` clears Metro’s export cache, verifies LiteUI/Controls/Actions in every platform’s source maps, and checks runtime source isolation after exporting the actual Storybook entry. Tests run through `bun run test`; interaction and device performance require their own checks.

The [M1.9g qualification packet](../../docs/evidence/2026-10-11-m1-9g-storybook57/README.md) records each platform’s current status. Selected iOS and Android LiteUI interactions pass; exports and native interaction are recorded separately.
