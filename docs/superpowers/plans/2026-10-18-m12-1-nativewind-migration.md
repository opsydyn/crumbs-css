# M12.1 NativeWind Migration Guide and Agent Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Native/inline execution is retained. Steps use checkbox syntax; all tasks form one complete implementation slice and one outcome commit. Fresh agents are used for the explicitly required baseline/qualification exercises, not implementation delegation.

**Goal:** Ship a portable `crumbs-migrate` skill and checked NativeWind migration guides that let an agent complete supported migrations in one invocation and accurately report retained or unverified behavior.

**Architecture:** A compact migration skill routes by installed source version, with local target-API references and complete examples shared with the human guide. Isolated, pinned Expo fixtures establish source behavior, then qualify migrated output independently. A small repository-only verifier checks artifact identity, example/reference drift and receipt consistency; there is no universal codemod or app runtime adapter.

**Tech Stack:** Published Crumbs 1.3.0, NativeWind 4.2.7 and conditional 5.0.0-rc.0 profiles, Expo SDK 57, TypeScript 6, Bun test tooling, existing Metro export/source-map checks, Maestro or the retained idb/ADB native procedure.

**Spec:** [Approved M12 design](../specs/2026-10-18-m12-migration-guides-and-agent-skill-design.md), approved 2026-10-18. This plan is pending written review; implementation has not started.

## Global constraints

- “One shot” means one invocation can discover, convert, verify and report a supported migration without human repair prompts.
- No universal codemod or compatibility runtime in this scope. No new library runtime dependency.
- Preserve appearance, interaction, public component props and platform behavior. Preserve unrelated edits and retained/shared dependencies.
- Crumbs target is exactly 1.3.0 for this qualification; source profiles are exact installed versions, not ranges or tags. No implicit SDK upgrade or forced peers.
- Existing M9.5 tooling does not migrate CSS semantics. Do not change it to pretend otherwise.
- Physical/spoken-reader acceptance remains deferred. Source exports, native interactions and performance remain separate evidence classes.
- Each advertised profile requires three independent fresh-agent runs of a held-out supported migration, without human repair prompts.
- Stop after two unsuccessful repair rounds for a profile; record guided/partial coverage rather than weakening acceptance.
- One complete slice/outcome commit. No push, PR, npm publication, release-gate change or M12.2/M12.3 implementation in this plan.

## Review focus

1. Utility/important/inline precedence and customized rem/spacing: a property-name rewrite must not change winning values. Task1 source oracle and Task3 target comparison.
2. NativeWind v4 interop versus v5 returned wrappers: preserve rendered component, forwarded props, refs and non-style destinations. Tasks1–3 interop cases.
3. Nested themes, initial condition values and live updates: source/target must agree before and after changes, including existing web behavior. Tasks1/3 state matrix.
4. Mixed or interrupted apps with unrelated edits: retain needed configuration/packages and avoid duplicate providers or stale replay. Tasks2/3 resume/partial cases.
5. A plausible completion receipt with absent evidence: missing native checks, wrong hashes or unexecuted cleanup cannot yield qualified status. Tasks2/3 negative verifier cases.

## Pinned qualification candidates

Registry metadata checked 2026-10-18; these are planning pins, not qualification results.

| Input | v4 profile | Conditional v5 profile |
| --- | --- | --- |
| Profile ID | `nativewind-4.2.7-expo57` | `nativewind-5.0.0-rc.0-expo57` |
| NativeWind | `4.2.7` | `5.0.0-rc.0` |
| Engine | `react-native-css-interop 0.2.7` (NativeWind exact dependency) | `react-native-css 3.1.0-rc.0` (exact peer) |
| Tailwind | `3.4.17` | `4.1.13` |
| PostCSS | source profile does not add it | `postcss 8.5.6`, `@tailwindcss/postcss 4.1.13` |
| Lightning CSS | retain engine's `~1.27.0` dependency, resolved in frozen lock | explicit `1.30.1`, retain actual dependency identities |

Common direct pins from `apps/playground/upgrade/expo-57.json`: Expo 57.0.27,
React/DOM 19.2.8, RN 0.86.3, RNWeb 0.21.2, `@expo/metro-runtime`57.0.16,
Reanimated 4.5.1, Worklets 0.10.1, safe-area5.7.0, Babel preset57.0.14,
TypeScript 6.0.3 and React types19.2.14. Include Reanimated/Worklets as actual app
dependencies where used. Do not copy unrelated playground demos/dependencies.
Use Node 24.15.0 and Bun 1.4.2 if still available; record actual executable identity.
Both profiles require a clean frozen-lock replay and Expo dependency checks before
baseline admission. Registry peers alone are insufficient compatibility evidence.

Crumbs tarball SHA-256:
`13ad1d818d3754fc60418fe5c7a253dff53da444bfdf7668bad80323f45c3d58`.
Verify downloaded bytes and installed files against the public1.3.0 release receipt.
Never substitute a current workspace build with the same version label.

Source metadata integrity pins:

- NativeWind4.2.7: `sha512-h/tdccn3FCotFxZtpBSGCQOK9DcfMrD2YdVnw2PiDhTzE6VGdAw+aDMruaxCXjJq5W/lfCZuBSdhS0enl8BN+w==`
- NativeWind5.0.0-rc.0: `sha512-CrESAPb428+EVNvGhUaMfbNllyk6lOnX1ZlVlNktCeae/4mIbb6x4SxN62Rg3cLHNRrRLYZEPYGmqkZ8fVIRZQ==`
- react-native-css3.1.0-rc.0: `sha512-/wfPJ8pXiPxvHUs0QcocN3ViV4QJdnXpKukNirZJcJ/MeZKrStSEHm2rBq+KuZm8/2XDl4GfeuaVvJctYGtdgA==`

NativeWind's [v4 installation](https://www.nativewind.dev/docs/getting-started/installation)
explicitly describes4.2.7/SDK 57. Its [v5 RC guide](https://www.nativewind.dev/v5/guides/migrate-from-preview)
requires the exact engine pair; it is a prerelease. Baseline failures must remain
visible. A blocked v5 profile does not prevent useful v4 delivery but excludes v5
from supported/one-shot claims. SDK 58 and older source versions get an assessment
route until separately qualified; do not advertise inferred migration support.

## File map

Create:

- `.agents/skills/crumbs-migrate/SKILL.md`: workflow, installed-version routing and outcome contract.
- `.agents/skills/crumbs-migrate/agents/openai.yaml`: discoverable migration-specific metadata.
- `.agents/skills/crumbs-migrate/references/nativewind-v4.md`: complete checked migration and exception table.
- `.agents/skills/crumbs-migrate/references/nativewind-v5.md`: exact RC differences and its actual qualification status.
- `.agents/skills/crumbs-migrate/references/report.md`: JSON receipt shape and short human outcome example.
- `.agents/skills/crumbs-migrate/references/target/`: byte-identical bundled copies of the existing consumer skill and references, preserving their relative links. Copy its `SKILL.md` and `references/*.md`; no nested discovery metadata. These are read as references, not an installed-skill prerequisite.
- `docs/src/content/docs/how-to/migrate-to-crumbs.mdx` and `migrate-from-nativewind.mdx`: human entry and source-specific guide.
- `scripts/fixtures/m12-1/profiles.json`: exact profiles, integrity pins and admission status.
- `scripts/fixtures/m12-1/{v4,v5}/`: small source fixture projects, exact manifests/locks and guide examples.
- `scripts/fixtures/m12-1/oracles/`: source observations, case definitions and native journeys, outside agent-visible fixture copies.
- `scripts/m12-1-migration-qualification.ts` and `scripts/test/m12-1-migration-qualification.test.ts`: repository-only checks described below.
- `docs/evidence/2026-10-18-m12-1-nativewind/`: reproducible commands, receipts, raw failed attempts and native before/after evidence.

Modify: root `README.md`, `docs/astro.config.mjs`, `docs/src/content/docs/how-to/use-agent-skill.mdx`, existing consumer `SKILL.md` (one absolute GitHub migration-routing link, so a copied consumer skill has no broken sibling-folder dependency), `docs/roadmap.md` and this plan's checkboxes. Do not modify package implementation, exports, CI policy or workspace lockfile. Fixture installs stay outside workspace roots and hold their own locks. No npm CLI is added.

## Task1 — Establish source fixtures and a real baseline

**Interfaces:** Produces profile manifests/locks, artifact hashes and oracle observations. Source fixtures expose testIDs `m12-card`, `m12-action`, `m12-count`, `m12-theme-toggle` and `m12-mode`; the expected callback count progresses 0→1→2 after two presses. A source oracle is captured before the target exists.

- [ ] Preflight the checkout, disk and native tool/device inventory. The planning host has only 5.9 GiB available and adb/Maestro are not on the default PATH. Resolve existing installed tools and owned devices by identity; do not reset shared devices or delete unrelated caches. Establish enough capacity before installation/builds. If native access is blocked, continue independent docs/host work and retain incomplete status.
- [ ] Stage each source profile in a task-owned temporary directory, using the common pins above. Check in only fixture source, exact manifests and generated frozen locks. Run `bun install`, then a fresh `bun install --frozen-lockfile`, `bunx expo install --check` and `bunx tsc --noEmit` in that isolated fixture. Preserve full failure output; do not bypass peers. Probe v4 first, then v5 once v4 is viable.
- [ ] Build three scenarios per admitted profile: A/static guide (non-default spacing, important versus inline override and nested text); B/stateful held-out (themes, finite variants, breakpoint edges, native callback and shared animation dependency); C/interop/partial (v4 cssInterop/remapProps or v5 styled wrapper, non-style destination/ref, unresolved dynamic/plugin case and web-only styling). Source B must not be a renamed copy of A.
- [ ] In A use a deliberately customized spacing token (e.g. `4: '18px'`) rather than assume p-4=16. Add a separate rem-dependent value and capture its actual native/web resolution. In B test the source breakpoint at threshold−1, threshold, threshold+1; light/dark and pressed/disabled; initial render and subsequent theme/width changes. Do not assert target-derived expected values.
- [ ] Capture actual source iOS/Android interactions and screenshots, and web output when present. Use the same device/app build and scene dimensions for later comparison. Fix geometry tolerance at≤1 logical unit; colors, selected variants and callback counts must match exactly. Record a text-edge-only antialiasing mask before target captures; do not approve broad pixel drift from an average screenshot score.
- [ ] Run one fresh baseline agent per source profile on a disposable copy of A before writing migration guidance. It may inspect installed public APIs/current ordinary consumer skill but not future migration instructions or hidden oracles. Record its attempted changes, errors and interventions. If it already succeeds, record that result without inventing a failure; target guidance at demonstrated retrieval or scope gaps.

## Task2 — Deliver the portable workflow, examples and deterministic checks

**Interfaces:** `MigrationReceipt` is plain JSON with `format: 'crumbs.migration.v1'`, `profile`, `scope`, source/target package versions and integrity, baseline/current file hashes, `sites` (path/location/construct/action/reason), `checks` (name/status/evidence path/hash), `remainingDependencies`, and `outcome: 'complete' | 'partial' | 'blocked'`. Site action is `converted | retained | unresolved`; check status is `pass | fail | not-run`. A complete outcome requires all requested mandatory checks to pass and no unresolved
sites; completed edits with unperformed native checks remain partial. A profile is
one-shot-qualified only after all three independent supported runs pass. These
describe observed evidence, not a new public package API.

Repository verifier exports `validateReceipt(input: unknown): MigrationReceipt`,
`verifyTargetReferenceCopies(sourceRoot: string, bundledRoot: string): Promise<void>`
and `verifyEvidence(receipt: MigrationReceipt, evidenceRoot: string): Promise<void>`.
It also supplies CLI modes `references`, `host`, `receipt`; it does not launch agents,
rewrite consumer code or own devices. `host --consumer <dir> --out <empty-dir>` runs
strict types/fixture assertions/production export; `receipt --file <json> --evidence-root <dir>`
checks required rows, referenced evidence/hashes and outcome consistency. It must not
accept a self-reported `pass` as independent semantic proof.

- [ ] Write failing tests for receipt consistency (complete+unresolved, missing required checks, not-run native mislabeled qualified), changed evidence hash, escaping evidence path and drifted bundled reference. Run `bun test scripts/test/m12-1-migration-qualification.test.ts`; observe the intended missing/incorrect behavior before implementing these small helpers.
- [ ] Implement the verifier with ordinary Node/Bun facilities and existing repo runtime-map checker. Keep validation small, reject malformed/missing data, and distinguish completed edits from native qualification. Receipt evidence cannot escape its declared root. Rerun the focused tests; test a valid receipt and each rejection, not documentation-heading regexes.
- [ ] Create the migration skill and local references. Detection reads lockfile/exports/config before selecting v4/v5 guidance. Preserve config composition, scopes, prop forwarding, source precedence and shared dependencies. Bundle the consumer target references with `verifyTargetReferenceCopies` enforcing byte equality. Keep the user-facing workflow local and usable when copied alone.
- [ ] Develop a complete source→target A example against the exact public Crumbs artifact. Keep themes in ordinary .ts, native authoring in .css.ts and runtime imports specific. Explain arbitrary dynamics, browser-only constructs, containers/motion limits and explicit retained native styles. No unconditional class-order conversion or blanket type casts.
- [ ] Document partial operation and dependency cleanup: retain the source runtime/config when needed, qualify coexistence before editing a dependent group, and stop that group when composition fails. Add interrupted-migration recovery using current file hashes; never reset unrelated edits or blindly replay stale receipts.
- [ ] Write the two human guides from the same example blocks/artifacts; extract/typecheck the blocks rather than manually maintaining near-identical snippets. Add sidebar/README/consumer-skill routing and one-prompt invocation. State exact tested profiles, publication identity and limits; v5 remains assessment-only until Task3 admission.
- [ ] Validate: `bun test scripts/test/m12-1-migration-qualification.test.ts`; `bun scripts/m12-1-migration-qualification.ts references`; isolated PyYAML `quick_validate.py .agents/skills/crumbs-migrate`; copied-folder relative-link checks; `bun run docs:build`. Expected: no fixture/reference drift, valid skill and two new rendered guide pages (36 total unless baseline changes independently).

## Task3 — Qualify single-invocation migrations and native parity

**Interfaces:** Consumes Task1 locked source projects/oracles and Task2 portable skill.
Produces hash-bound before/after diffs, command logs, separate source/target native
receipts, agent-run outcomes and final profile admission. Only test workspace files,
installed dependencies and the copied skill are visible to exercise agents.

- [ ] Freeze supported held-out B and oracle hashes before any forward run. For each eligible profile, run three fresh agents in separate source copies with the same migration prompt. They implement without human hints and without the oracle/target example implementation. The inline parent independently validates their output; agent self-assessment is not the verdict.
- [ ] For each target, execute the host verifier (`bun scripts/m12-1-migration-qualification.ts host --consumer <owned-target> --out <new-output>`). It runs the consumer's `tsc --noEmit`, fixture behavioral assertions and `expo export --platform all --source-maps`. Reuse `verifyRuntimeBundles`; for completed migrations additionally reject NativeWind/CSS-engine paths and debug/authoring code in production graphs; separately inspect generated production
  style output for absent development provenance. Partial fixtures legitimately retain source paths and must label them.
- [ ] Replay each target's iOS Simulator/Android Emulator journeys against the frozen source oracle: native presses 0→1→2, disabled no-op, same refs/non-style prop destinations, theme and width updates, geometry and actual screenshot comparison. Record device/tool/client identities. Reuse existing native control patterns with fresh M12 ownership/testIDs; do not invoke older M11/M10 runners with their hard-coded app/device ownership. Report web parity separately and retain needed web CSS.
- [ ] Run C through the skill and independently assert that unresolved behavior and its packages survive, required wrappers remain rendered and the report is partial. Test a window where Crumbs/source composition is deliberately unsupported: no misleading complete receipt or removal of source setup is allowed.
- [ ] On one successful B target, rerun the same request. Expect no duplicate providers/tokens, no changed app behavior and no extra semantic source edits (report timestamps may change). Simulate an interruption before cleanup on another disposable B copy with an unrelated user edit; resume must preserve it and refuse stale hash assumptions. Verify post-cleanup install/exports still pass.
- [ ] Compare all three supported runs per profile against the actual source outcomes, and validate all receipt evidence. After at most two repair rounds, retain failures and narrow to guided/partial if needed. Once a held-out fixture informed a repair, label it diagnostic; any renewed blind claim uses a separately frozen variant. Missing devices/failed source baseline are incomplete, never passes.

## Task4 — Close the complete slice and recommend the next batch

- [ ] Record the exact admitted profile(s), 3-run denominator/interventions, retained cases, false-success checks, source and target artifacts, native comparisons, copy portability, verifier results and failed attempts in the evidence packet. Audit committed screenshots/logs for unintended private app/path content; exclude credentials and unrelated files.
- [ ] Run `bun test scripts/test/m12-1-migration-qualification.test.ts`, reference/receipt checks and `bun run docs:build` on final content. Run `bun run check` once after the completed change; investigate/report any failure before claiming repository checks pass. This does not trigger host-budget measurement or npm release.
- [ ] Complete one independent final review focused on source-version routing, semantic preservation, honest partial status and evidence-to-claim consistency; address actionable findings and rerun only affected checks. Confirm no source/target app runtime changes leaked into the library or internal apps.
- [ ] Update roadmap/spec/plan with actual outcomes. M12.1 may deliver useful guidance with a profile explicitly unqualified; it may not advertise that profile as one-shot supported. Commit the complete slice as `docs(m12.1): add qualified NativeWind migration workflow`. Keep all unperformed native checks visible if external prerequisites prevented completion.
- [ ] Recommend **M12.2** only if the NativeWind workflow is qualified enough to justify expansion; otherwise recommend the single concrete M12.1 blocker/repair. Do not start the next batch without authorization.

## Self-review and handoff

Spec coverage: scope discovery, mapping, configuration, verification, cleanup,
resume, portability and outcome reporting all have tasks; M12.2/M12.3 remain excluded.
All five review-focus failure modes have concrete checks. No package API or runtime
feature is required. Candidate dependency pins were read from registry/repo evidence;
install, source baseline, migration and native qualification are explicitly future work.

Please review this plan before implementation. Native/inline execution and the
single complete slice preference are retained; no execution-method question is needed.
