<p align="center">
  <img src="https://raw.githubusercontent.com/opsydyn/crumbs-css/main/crumbs-css-header.png" alt="Crumbs CSS" width="100%" />
</p>

# crumbs-css

Monorepo for `@opsydyn/crumbs-css` — React Native style authoring with a familiar vanilla-extract-shaped API.

## Package

| Package | Version | Description |
|---|---|---|
| [`@opsydyn/crumbs-css`](./packages/css) | [![npm](https://img.shields.io/npm/v/@opsydyn/crumbs-css)](https://www.npmjs.com/package/@opsydyn/crumbs-css) | Metro transformer, style authoring API, theme runtime |

## What it does

Compiles `.css.ts` files to React Native `StyleSheet.create` output at Metro transform time. The authoring API mirrors vanilla-extract — `style`, `styleVariants`, `recipe`, `createThemeContract`, `createTheme` — so the mental model is familiar if you already use vanilla-extract on web.

At runtime, `ThemeProvider` and `useThemedStyles` resolve token references into concrete values without re-running the transform.

## Development

```sh
bun install
```

Build the transformer:

```sh
bun run build
```

Run tests and typecheck:

```sh
bun test
bun run typecheck
```

### Workspace layout

```
packages/
  css/          # @opsydyn/crumbs-css — transformer, style API, theme runtime

apps/
  storybook/    # Expo Storybook — component development and visual testing
```

### Storybook

```sh
bun run app:storybook
```

Runs the Expo Storybook app. Requires a connected device or simulator.

### Releasing

Releases are managed by [release-please](https://github.com/googleapis/release-please). Merge the release PR to tag and publish automatically.

To publish manually:

```sh
bun run --filter @opsydyn/crumbs-css release:check
```

Then trigger the publish workflow from GitHub Actions.

## Acknowledgements

Directly inspired by [vanilla-extract](https://vanilla-extract.style/) — the zero-runtime CSS-in-TypeScript library by [Mark Dalgleish](https://github.com/markdalgleish) and the team at [Seek](https://github.com/seek-oss). The authoring API, theme contract model, and recipe abstraction are all shaped by vanilla-extract's design. If you work on web, use vanilla-extract.

## License

MIT
