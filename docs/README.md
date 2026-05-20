# docs workspace

This workspace contains the Starlight documentation site for `@opsydyn/crumbs-css`.

## Purpose

- Primary consumer-facing documentation surface
- Diataxis structure: tutorials, how-to guides, reference, and explanation
- Local workspace for iterating on docs before the site is deployed elsewhere

## Commands

Run these from the repo root:

```sh
bun run docs:dev
bun run docs:build
```

Or from this directory:

```sh
bun dev
bun build
```

## Content layout

```txt
src/content/docs/
  tutorials/    hands-on learning paths
  how-to/       task-oriented procedures
  reference/    APIs, compatibility, guarantees, diagnostics
  explanation/  architecture and tradeoffs
```

## Maintenance notes

- Keep the docs site aligned with the published package surface, not future plans.
- Prefer linking from READMEs into the docs site rather than duplicating long examples.
- Treat package naming, Metro setup, theme/runtime terminology, and release wording as contract text.
