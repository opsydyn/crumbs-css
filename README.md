<p align="center">
  <img src="https://raw.githubusercontent.com/opsydyn/crumbs-css/main/crumbs-css-header.png" alt="Crumbs CSS" width="100%" />
</p>

# crumbs-css

Monorepo for `@opsydyn/crumbs-css` — React Native style authoring with a familiar vanilla-extract-shaped API.

## Where to read what

- **Docs site workspace:** [`docs/`](./docs) is the primary consumer documentation surface and follows a Diataxis structure.
- **npm quickstart:** [`packages/css/README.md`](./packages/css/README.md) is the concise package-level entrypoint.
- **Repository overview:** this README covers workspace layout, development commands, and release operations.

## Package

| Package | Version | Description |
|---|---|---|
| [`@opsydyn/crumbs-css`](./packages/css) | [![npm](https://img.shields.io/npm/v/@opsydyn/crumbs-css)](https://www.npmjs.com/package/@opsydyn/crumbs-css) | Metro transformer, style authoring API, theme runtime |

## What it does

Compiles `.css.ts` files to React Native `StyleSheet.create` output at Metro transform time. The authoring API mirrors vanilla-extract — `style`, `styleVariants`, `recipe`, `createThemeContract`, `createTheme` — so the mental model is familiar if you already use vanilla-extract on web.

At runtime, `ThemeProvider` and `useThemedStyles` resolve token references into concrete values without re-running the transform.

## Development

| Command | Purpose |
| --- | --- |
| `bun install` | Install workspace dependencies. |
| `bun run build` | Build the published package. |
| `bun run test` | Run the package test suite. |
| `bun run typecheck` | Typecheck the published package. |
| `bun run app:storybook` | Start the Expo Storybook app for component development. |
| `bun run docs:dev` | Run the Starlight docs site locally. |
| `bun run docs:build` | Build the docs site. |
| `bun run release:check` | Build, typecheck, test, bench, and pack the package. |

### Workspace layout

```
packages/
  css/          # Published package: transformer, style API, theme runtime

apps/
  storybook/    # Expo Storybook — component development and visual testing

docs/
  # Starlight consumer documentation site
```

### Storybook

```sh
bun run app:storybook
```

Runs the Expo Storybook app. Use it for visual checks, component examples, and Expo Dev Client smoke testing.

### Releasing

- [release-please](https://github.com/googleapis/release-please) manages version PRs, changelog updates, tags, and GitHub releases.
- npm publication is a **separate workflow gate**, not an automatic consequence of merging a release PR.
- Release operations require repository secrets and permissions:
  - `RELEASE_PLEASE_TOKEN` for reliable release PR creation
  - `NPM_TOKEN` for npm publication
- Before publishing, run:

```sh
bun run release:check
```

Then trigger the dedicated publish workflow in GitHub Actions for the release tag or approved ref.

## Acknowledgements

Directly inspired by [vanilla-extract](https://vanilla-extract.style/) — the zero-runtime CSS-in-TypeScript library by [Mark Dalgleish](https://github.com/markdalgleish) and the team at [Seek](https://github.com/seek-oss). The authoring API, theme contract model, and recipe abstraction are all shaped by vanilla-extract's design. If you work on web, use vanilla-extract.

## License

MIT
