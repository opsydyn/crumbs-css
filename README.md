<p align="center">
  <img src="https://raw.githubusercontent.com/opsydyn/crumbs-css/main/crumbs-css-header.png" alt="Crumbs CSS" width="100%" />
</p>

# crumbs-css

Monorepo for `@opsydyn/crumbs-css` — React Native style authoring with a familiar vanilla-extract-shaped API.

## Where to read what

- **Docs site workspace:** [`docs/`](./docs) is the primary consumer documentation surface and follows a Diataxis structure.
- **npm quickstart:** [`packages/css/README.md`](./packages/css/README.md) is the concise package-level entrypoint.
- **Repository overview:** this README covers workspace layout, development commands, and release operations.
- **Architecture and future work:** [decision records](./docs/decisions/README.md), the [design-system roadmap](./docs/roadmap.md), and the [2026-09-06 assessment](./docs/assessments/2026-09-06-design-system-assessment.md) capture proposed direction and its evidence. Roadmap features are not current package guarantees.

## Package

| Package | Version | Description |
|---|---|---|
| [`@opsydyn/crumbs-css`](./packages/css) | [![npm](https://img.shields.io/npm/v/@opsydyn/crumbs-css)](https://www.npmjs.com/package/@opsydyn/crumbs-css) | Metro transformer, style authoring API, theme runtime |

## What it does

Compiles `.css.ts` files to React Native `StyleSheet.create` output at Metro transform time. The authoring API mirrors vanilla-extract — `style`, `styleVariants`, `recipe`, `defineProperties`, `createSprinkles`, `createThemeContract`, `createTheme` — so the mental model is familiar if you already use vanilla-extract on web.

At runtime, `ThemeProvider` and `useThemedStyles` resolve token references into concrete values without re-running the transform.

## Development

| Command | Purpose |
| --- | --- |
| `bun install --frozen-lockfile` | Reproduce the committed workspace dependency graph. |
| `bun run build` | Build the published package. |
| `bun run test` | Run the package and Storybook test suites. |
| `bun run typecheck` | Typecheck the published package. |
| `bun run app:storybook` | Start the Expo Storybook app for component development. |
| `bun run app:typecheck` | Typecheck the Storybook consumer against the workspace package. |
| `bun run playground` | Run the Expo consumer with Crumbs build watching and Metro restarts. |
| `bun run playground:packed --check` | Typecheck and bundle an isolated consumer of the working-tree tarball. |
| `bun run playground:distribution --check` | Qualify packed Crumbs, token, and component packages in Expo on iOS and web. |
| `bun run playground:published --version=alpha --check` | Qualify an exact registry artifact in an isolated consumer. |
| `bun run docs:dev` | Run the Starlight docs site locally. |
| `bun run docs:build` | Build the docs site. |
| `bun run release:check` | Build, typecheck, test, bench, and pack the package. |
| `bun run release:preflight --tag v<version>` | Verify a release tag matches the package version and checked-out commit; print its npm dist-tag without publishing. |

### Workspace layout

See the [Expo playground guide](apps/playground/README.md) for consumer modes and feedback journeys.

### CI checks

Pull requests that change `apps/` run the same CI workflow as package changes;
docs-only pull requests remain path-ignored. CI uses Bun 1.3.11, Node 24, and
`bun install --frozen-lockfile` across all workspaces. `bun run test` covers the
package and Storybook test suites, `bun run app:typecheck` checks the Storybook
consumer, and `bun run playground:distribution --check` builds packed package
artifacts, typechecks an independent Expo consumer, and requires iOS and web
bundle provenance. Missing required compiler fixtures or consumer maps fail
the gate. This CI coverage does not include Android or device acceptance.

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
- release-please never publishes to npm. npm publication is a separate, manually dispatched workflow after a published GitHub Release exists.
- The package is pre-1.0 alpha; prerelease versions publish under their named channel (for example, `alpha`), while stable versions publish to `latest`.
- Release operations require repository secrets and permissions:
  - `RELEASE_PLEASE_TOKEN` for reliable release PR creation
  - `NPM_TOKEN` for the manual npm publish workflow
- On the exact release tag checkout, run:

```sh
bun install --frozen-lockfile
bun run release:check
PACKAGE_VERSION=$(node -p "require('./packages/css/package.json').version")
bun run release:preflight --tag "v$PACKAGE_VERSION"
```

Then, from the `main` branch, trigger the `publish` workflow in GitHub Actions and enter that exact `v<version>` tag. The workflow verifies the published GitHub Release, checks that the tag matches the package version and checked-out commit, repeats the frozen install and release checks, and publishes with npm provenance. Branches, raw SHAs, draft releases, and arbitrary refs are not publish targets.

## Acknowledgements

Directly inspired by [vanilla-extract](https://vanilla-extract.style/) — the zero-runtime CSS-in-TypeScript library by [Mark Dalgleish](https://github.com/markdalgleish) and the team at [Seek](https://github.com/seek-oss). The authoring API, theme contract model, and recipe abstraction are all shaped by vanilla-extract's design. If you work on web, use vanilla-extract.

## License

MIT
