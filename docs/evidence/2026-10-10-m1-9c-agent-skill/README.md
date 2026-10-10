# M1.9c — Crumbs consumer agent skill

The repository skill at [`.agents/skills/crumbs-css`](../../../.agents/skills/crumbs-css/SKILL.md)
targets verified npm `1.1.0`. The [consumer guide](../../src/content/docs/how-to/use-agent-skill.mdx)
explains copying the whole folder into an app and invoking `$crumbs-css`.
It is not part of the published npm tarball.

## Qualification

[Machine-readable receipt](qualification.json) records the downloaded registry
tarball SHA-256, skill hashes, environment and outcomes. The four reference files
were extracted directly from the Markdown example and checked against that tarball:

- Strict TypeScript 6.0.3 consumer checking and three negative type fixtures pass.
- The public compiler transforms `card.css.ts`; pure host assertions pass for both
  slot variants, resolved text tokens, padding scales, cached recipe identity,
  independent local assignments, clearing and unchanged shared theme values.
- Copying the whole skill into another temporary app preserves every relative reference.
- The bundled skill validator passes; UI metadata uses normal implicit discovery.
- The Starlight build produces 34 pages. Current consumer pages no longer claim
  these v1 APIs are unpublished or that M10.5's authorised release scope remains open.
- Independent read-only review reports no actionable findings.

The [baseline exercise](baseline-findings.md) encountered four traps before repairing
its sample: callable token namespace assumptions, typed theme metadata exported from
`.css.ts`, relative extension paths, and branded recipe arguments. The initial
[compiler failures](baseline-transform.json) were observed before skill authoring.
The skill supplies the working structure and exact import boundaries.

The [forward exercise](forward-report.md) used the skill for the same task and a
container/motion/unsupported-SDK variation. Its generated types, strict production
iOS host transform and host assertions were independently rerun against the verified
registry tarball and passed. Factory linkage is an outline in this forward sample;
the baseline separately compiled a real temporary explicit package export. These
bounded samples do not establish a quantitative improvement in agent effectiveness.

## Evidence boundaries and maintenance

Example verification reuses existing frozen React 19.2.3 / RN 0.85.3 dependencies.
It does not repeat fresh SDK 57 installation or native acceptance; those release
checks remain in [M1.9b](../2026-10-10-m1-9b-expo57/README.md). `skipLibCheck` is true.
No package code, public API, export map, dependency, lockfile or release gate changes.
Physical-device, spoken-reader and release-performance acceptance remain deferred.

Update the skill's version target and rerun its example when changing APIs it uses.
Current repository/site README corrections reach npm's displayed README only in a
subsequent package publication: recommended **M1.9d**, not performed by this slice.
