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
- Keep the repository [consumer skill](../.agents/skills/crumbs-css/SKILL.md) aligned with the installed public export map and current guides; validate its example when the APIs it uses change. [Installation and usage](./src/content/docs/how-to/use-agent-skill.mdx) belong to consumer docs, while the portable skill remains self-contained.
- Prefer linking from READMEs into the docs site rather than duplicating long examples.
- Treat package naming, Metro setup, theme/runtime terminology, and release wording as contract text.

## Architecture and planning

Repository planning documents live outside the site's `src/content/docs/` collection:

- [Architecture decision index](./decisions/README.md)
- [Native design-system compiler ADR](./decisions/adopt-native-design-system-compiler.md)
- [Design-system roadmap](./roadmap.md)
- [2026-09-06 assessment](./assessments/2026-09-06-design-system-assessment.md)

The roadmap records delivered work and parked proposals separately. M11.1–M11.5 are included in published `1.1.0`, with qualified Expo 56/57 compatibility. The [1.1.0 release disposition](./releases/1.1.0.md) retains the admitted host-budget failure; generic future gates are unchanged. Physical acceptance remains deferred and M11.6 is parked. Keep historical evidence labelled with its exact artifact and expose current APIs in consumer pages.
