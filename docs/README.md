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

## Architecture and planning

Repository planning documents live outside the site's `src/content/docs/` collection:

- [Architecture decision index](./decisions/README.md)
- [Native design-system compiler ADR](./decisions/adopt-native-design-system-compiler.md)
- [Design-system roadmap](./roadmap.md)
- [2026-09-06 assessment](./assessments/2026-09-06-design-system-assessment.md)

The roadmap records delivered work and parked proposals separately. M11.1–M11.5 are the delivered feature scope for the v1 source release; M10.5 release qualification remains open and M11.6 is parked. Keep historical evidence labelled with its exact artifact and expose current APIs in consumer pages.
