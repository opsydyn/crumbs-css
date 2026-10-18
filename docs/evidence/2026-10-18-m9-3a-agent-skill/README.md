# M9.3a — published-inspector consumer skill refresh

The [portable skill](../../../.agents/skills/crumbs-css/SKILL.md) now covers the
published 1.3.0 inspector. Its new [native reference](../../../.agents/skills/crumbs-css/references/native-inspector.md)
adds a development-only import boundary, typed ActionCard probe, nested theme
example, host clipboard ownership and partial/stale report diagnosis. The root
README and consumer onboarding guide route to it. SDK 58's minimum remains 1.2.0;
that version has headless reports but no native widget.

## Qualification

The [receipt](qualification.json) pins all five skill files and example blocks to
public 1.3.0 tarball SHA-256
`13ad1d818d3754fc60418fe5c7a253dff53da444bfdf7668bad80323f45c3d58`.
All 189 installed package files match that retained registry tarball, whose
publication is independently recorded in [the release packet](../2026-10-18-m9-3a-v130-release/README.md).

- A baseline agent could not retrieve any inspector API/setup from the old portable
  reference. A separate forward agent built the integration and correctly retained
  normal press behavior, theme scope, deferred inputs, production isolation and
  clipboard ownership. See [the bounded exercise](agent-exercises.md).
- The final Markdown example blocks, extracted directly into the owned published
  SDK 58 consumer, pass strict TypeScript checking and two negative cases: an
  unsupported recipe selection and a synchronous clipboard callback.
- The actual installed compiler and headless API resolve the secondary recipe's
  background and theme text color. Development coverage is honestly `partial`
  (`compatibility-only`); the default production report is `unavailable`
  (`metadata-missing`). Original metadata is present only in the expected form.
- iOS, Android and web production exports pass the existing runtime-source-map
  checker. Recursive source-map inspection finds no `inspector.dev`, devtools or
  Expo Clipboard implementation. Compiler and Effect modules are excluded by the
  same runtime checker. These are production build checks, not native interaction.
- The forward agent's separately generated six-file integration passes an
  independent strict typecheck against the same published installation.
- Copying the complete skill preserves all five relative links inside its folder.
  The official skill validator passes. The documentation build produces 34 pages.

The [check harness](check.ts) takes repository, owned SDK58 consumer and output
directories as its three arguments. It extracts the examples, temporarily replaces
that consumer's entry and restores it/removes its test folder in `finally`.
It expects the retained registry tarball at the temporary path named in the harness;
use only a disposable task-owned consumer with the exact release installed.
The original four-file ActionCard example remains valid; the inspector reference
supplies its replacement scoped App and two additional modules.

The first source-map assertion in the temporary harness assumed a flat map and
failed after successful exports. It was corrected to recurse through sections,
then the complete final example checks were rerun successfully. The system Python
lacked PyYAML; the validator ran with an isolated `uv --with PyYAML` environment.
No project dependency was added. The final Metro export emitted an environment-only
warning that `NO_COLOR` was ignored because `FORCE_COLOR` was set; exports and
source-map checks still completed successfully.

## Boundaries and next slice

This is a reference/documentation change. It changes no package implementation,
API, export, dependency, lockfile, version or release gate. Native interaction,
spoken readers, physical devices and performance were not rerun. Existing native
qualification remains in the [widget closure](../2026-10-18-m9-3a-qualification-closure/README.md).
One baseline/forward exercise does not establish a statistical improvement in agent
performance. The skill remains Git-distributed, outside the npm tarball.

Next recommended slice: **M9.3a — documentation-only PR and integration**, so
consumers copying from main receive the refreshed skill. No npm release is needed.
Then collect actual consumer feedback; M11.6 integrations and deferred physical
acceptance are not restarted by this slice.
