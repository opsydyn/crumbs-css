# Crumbs Expo playground

This public-API consumer complements the internal Storybook. It uses the existing Expo 56 / React Native 0.85 / React 19 baseline. Upgrade that baseline separately from qualifying a Crumbs artifact.

From the repository root:

```sh
bun run playground --web
bun run playground --ios
bun run playground --android
bun run playground:check
bun run playground:packed --check
bun run playground:published --version=alpha --check
```

Workspace mode resolves Crumbs' exported `dist` files. The runner builds first, watches library source, and restarts Metro after build-output changes to reload the Node compiler. App edits use normal Expo refresh. Ctrl-C stops both processes. Use port 8091; Storybook remains on 8090.

Packed mode builds, runs `npm pack` against the working tree and installs the tarball into a new temporary app outside the monorepo. Published mode defaults to `alpha`, resolves the requested registry version or tag to one exact version and installs it into a separate temporary app. Neither mode links workspace Crumbs. `--prepare-only` installs and prints the directory without launching. Keep the printed directory and its npm lockfile for reproducing feedback; delete it when finished. The separate packed-artifact directory and temporary npm cache can also be removed after use.

On 2026-09-14, `alpha` resolved to `0.1.2-alpha.1` and bundled against this baseline. `latest` resolved to `0.1.0-alpha.1`, which requires React Native `>=0.83 <0.84`; `--version=latest` correctly failed dependency installation. No peer dependency override is applied. Registry tags can change; use an exact version to reproduce a previous run.

The runner checks the installed package name, version and real entry path, records `.expo-consumer-identity.json`, and injects mode/version/revision into the app. A workspace revision explicitly represents a dirty working tree, not a release. Direct `expo start` without the runner can show an unrecorded identity. To reopen a staged app, run `EXPO_NO_METRO_WORKSPACE_ROOT=1 npm start` in its directory.

Try scrolling the 1,000-row list while toggling themes, editing the form and switch, and comparing parent and nested scopes. The portal explicitly wraps its content in the source ThemeProvider because the portal host renders outside the source context. This probes integration with an explicit theme bridge; it does not assert automatic context propagation.

`--check` typechecks and exports production JavaScript bundles for iOS, Android and web. That does not verify device rendering, keyboard behavior, scrolling frame time, native startup, or accessibility. Record platform/device, package identity, journey and observed behavior with feedback. Use Expo's `run:ios` / `run:android` from the consumer directory for native builds; generated native projects and device acceptance remain separate qualification steps.

The [2026-09-14 iOS simulator acceptance report](../../docs/acceptance/2026-09-14-ios/README.md) retains direct evidence for startup, themes, form state, keyboard layout, scopes and explicitly bridged portals. The subsequent [Maestro native scroll report](../../docs/acceptance/2026-09-14-maestro/README.md) qualifies native swipes, theme position preservation and reverse scrolling. Android remains unverified; these are functional checks, not device performance qualification.

For native input diagnosis, run `EXPO_PUBLIC_CRUMBS_SCROLL_PROBE=true bun run playground`. The development-only probe shows native touch/drag counts, scroll offset, first half-visible row, viewport height and reported content height. Its state updates affect rendering; leave it disabled for performance measurements. The [scroll investigation](../../docs/acceptance/2026-09-14-scroll/README.md) records the earlier computer-use input-delivery gap. Run the [Maestro flows](e2e/README.md) for native gesture acceptance.
