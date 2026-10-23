# M12 — Migration guides and an agent migration skill

Date: 2026-10-18
Status: design approved 2026-10-18; M12.1 implementation plan prepared for review; implementation not started
Target: the published Crumbs API, currently 1.3.0; inspect the installed version before applying any migration

## Outcome and recommendation

Help an Expo/React Native team move an existing screen or design system to Crumbs
with one agent request, while preserving appearance, interaction, public component
props and platform behavior. NativeWind is the first route. Supply human-readable
migration guides and a portable agent skill using the same checked examples.

Proceed with a bounded, NativeWind-first delivery. “One shot” means one invocation
can discover, convert, verify and report a supported migration without human repair
prompts. It does not mean a universal lossless converter, a single model response,
or skipping verification. A mixed/unsupported app can finish with an explicit
partial migration and retained dependencies; that is useful but is not counted as
a completed one-shot migration.

Assumptions: native Expo apps are the initial audience; preserve existing web
behavior when the app supports web. No source-library popularity ranking or demand
volume has been established. The additional candidates below are selected for
coverage of utility, object, theme-prop and tagged-template styles, not a claimed
market-share order. Real consumer success rates remain unknown.

## Current evidence

- The existing portable consumer skill covers published Crumbs authoring/runtime
  boundaries, themes, recipes, Sprinkles, local variables and the native inspector.
  Reuse those contracts; a migration must not invent a new Crumbs API.
- M9.5's existing source migration tool renames Crumbs token/component references.
  Its guide explicitly excludes CSS-semantics migration and arbitrary data flow.
  It is not an existing NativeWind converter.
- NativeWind v4 documents CSS-derived specificity, including important declarations
  and inline/remapped styles. Class-string order is not a sufficient translation
  rule. Its current v5 RC docs remove v4's cssInterop/remapProps exports in favor
  of explicitly rendered styled wrappers. Version discovery must precede edits.
- Unistyles combines themes, variants and runtime dependencies; Restyle composes
  theme-backed style props and variant defaults. Those dependencies/defaults need
  explicit preservation, not merely equivalent-looking property names.
- styled-components documentation currently mixes stable and v7-alpha material;
  Tamagui documentation also exposes evolving APIs. Installed declarations and
  exact source-version fixtures take precedence over an unversioned latest guide.

Sources checked 2026-10-18:

- [NativeWind v4 specificity](https://www.nativewind.dev/docs/core-concepts/style-specificity)
- [NativeWind v5 RC interop](https://www.nativewind.dev/v5/api/css-interop)
- [NativeWind preview-to-RC version boundary](https://www.nativewind.dev/v5/guides/migrate-from-preview)
- [Unistyles StyleSheet](https://unistyl.es/v3/references/stylesheet/)
- [Restyle variants/defaults](https://shopify.github.io/restyle/fundamentals/variants/)
- [styled-components native](https://styled-components.com/docs/basics#react-native)
- [Tamagui styled components](https://tamagui.dev/docs/core/styled)
- [Uniwind migration reference](https://docs.uniwind.dev/migration-from-nativewind)

These sources establish migration concerns, not Crumbs compatibility or superiority.
Recheck exact source versions during implementation. Do not upgrade a source library
just to fit a migration fixture or force incompatible React Native peers.

## Approaches considered

| Approach | Benefit | Cost / limitation |
| --- | --- | --- |
| Guides alone | Fastest useful documentation | Each agent rediscovers inventory, verification and difficult cases |
| Dedicated skill plus checked guides and small deterministic helpers — recommended | One request orchestrates the whole bounded migration; shared examples reduce drift | Needs real source-version fixtures and independent agent qualification |
| Universal codemod / Tailwind runtime interpreter | Broad mechanical conversion is attractive | New compiler/runtime project, large semantic surface, maintenance and parity risk |

No universal codemod or compatibility runtime in this scope. Add a helper only
when observed agent failures justify a deterministic inventory or edit. Reuse
existing project/package tools wherever possible. No new library runtime dependency.

## Proposed delivery batches

Each batch is one complete slice: guide, skill route, checked examples, qualification,
roadmap outcome and commit. Do not split each source library into repetitive
planning/wording micro-slices.

| Item | Scope | Admission boundary |
| --- | --- | --- |
| **M12.1** | Common migration workflow, NativeWind guide, new `crumbs-migrate` skill, baseline/forward exercises and Expo dogfood | NativeWind v4 first; a separate v5 RC profile only after its exact installed API and native baseline pass. Unqualified source versions receive explicit assessment-only guidance. |
| **M12.2** | React Native StyleSheet/inline styles, Unistyles 3, Restyle and styled-components/native guides and skill routes | Each profile pins source versions and covers theme/default/dynamic behavior. No automatic claim for styled-components v7 alpha or older Unistyles majors. |
| **M12.3** | Uniwind and Tamagui styling routes, plus mixed-library migration scenarios | Preserve behavior-owning UI components. Full Tamagui component-system replacement is excluded; unsupported versions/features remain visible. |

Suggested first appetite: one complete M12.1 implementation/qualification batch,
limited to the common workflow, NativeWind profiles and the fixtures below. Review
its outcome before funding the other two batches. If it needs a new CSS engine or
new public Crumbs behavior, stop and reshape the route instead of expanding scope.

## Migration contract

The agent operates on the user's named scope, defaulting to the requested screen or
component rather than silently rewriting the whole repository. An explicit whole-app
request permits the full inventory and migration. Existing user authorization covers
routine reversible edits/checks; only a genuinely unresolved behavior decision or
unavailable required prerequisite needs intervention.

1. **Discover and establish the baseline.** Inspect manifests, lockfile, source
   versions, theme/config files, Metro/Babel, platform files, existing component
   wrappers and tests. Detect mixed libraries, interrupted migrations, aliases and
   generated code. Record the touched-file baseline and protect unrelated changes.
   Run existing checks before editing; separate pre-existing failures.
2. **Classify uses.** Inventory styling sites and classify each as direct conversion,
   explicit adaptation, or unresolved. Include the source file, construct, actual
   value/precedence dependencies and intended Crumbs destination. Counts alone are
   not proof of complete discovery; record dynamic/generated/package-owned limits.
3. **Convert in dependency order.** Preserve existing token identities/names where
   sensible, then themes, reusable styles/recipes, and component call sites. Retain
   component APIs, refs, event handlers, accessibility props and style override
   ordering. Preserve valid native runtime styles when an unnecessary abstraction
   would introduce risk; disclose retained styles instead of calling them converted.
4. **Integrate build configuration.** Merge withNativeStyles into the existing Metro
   configuration. Preserve other wrappers/plugins. Qualify any source/Crumbs
   coexistence before describing it as supported; otherwise retain an isolated
   rollback boundary and do not remove source configuration speculatively.
5. **Verify and repair within scope.** Run types, existing relevant tests, production
   exports and runtime graph checks, then native/visual comparisons where available.
   Use the inspector as supplementary Crumbs evidence, not proof of source parity.
6. **Clean up with evidence.** Remove source-specific configuration/dependencies only
   when no remaining app/package consumer needs them and post-removal checks pass.
   Keep Reanimated, safe-area and other shared dependencies if anything else uses
   them. Preserve web/global styling and behavior libraries that remain in use.
7. **Report and resume.** Produce a concise human report plus a JSON receipt recording
   versions, scope, converted/retained/unresolved sites, checks and unperformed checks.
   On rerun, recognize already-migrated files and current hashes; avoid duplicate
   providers/tokens or stale plan replay. Revert only migration-owned edits if needed.

## Semantic mapping policy

| Source concern | Crumbs destination / preservation rule |
| --- | --- |
| Literal view/text/image styles | Correct primitive authoring in .css.ts; literal compiled output can be used directly |
| Named semantic scales and themes | Identified typed token contract/theme in ordinary .ts; preserve values, theme switching and nested scopes |
| Finite prop variants / compound variants | recipe/componentRecipe, exact defaults and selection precedence; explicit native event state |
| Repeated finite utility scales | Native Sprinkles/lookup plans where useful; do not enumerate a cross-product or mechanically create a recipe for every class |
| Important/inline/remapped style precedence | Derive the winning source behavior before ordering explicit native styles; class order alone is insufficient |
| Dynamic values / interpolations | Finite selection, supported local scalar assignment, or retained runtime style logic; arbitrary closures do not move into .css.ts |
| Responsive/platform/accessibility conditions | Explicit same-threshold native inputs; check custom thresholds against target capabilities; preserve initial and update behavior |
| Container queries | Existing Crumbs container API only for its supported measured bucket contract; no blind translation into recipe conditions |
| CSS variables, rem, font/line-height/shadow scales | Resolve from the installed source engine/config, including inheritance and platform defaults; never assume every p-4 is 16 or rem is 16 |
| cssInterop/remapProps/styled/attrs and custom wrappers | Preserve prop destinations, forwarding/ref/default semantics and actual rendered wrapper; style props may map to non-style component props |
| Animation / gestures / UI state machines | Retain existing ownership; Crumbs motion is not an automatic replacement for Reanimated or a full UI component library |
| CSS selectors, browser globals, layout/cascade features without parity | Explicit unresolved or retained platform implementation; no silent drop, fake approximation or automatic removal of web styling |

Do not weaken types with blanket any/casts, change component APIs, or hide diagnostics
to get a green migration. Performance benefits are hypotheses until measured under
matched inputs. Avoid render-time definition construction and preserve production
isolation of authoring/tooling/inspector code.

## Deliverables and distribution

Proposed paths (not created by this planning slice):

- `docs/src/content/docs/how-to/migrate-to-crumbs.mdx`: entry guide, scope/readiness,
  decision table, common workflow and one-prompt invocation.
- Source-specific guides: `migrate-from-nativewind.mdx`, then guides for the admitted
  profiles in M12.2/M12.3. Each includes complete before/after files and an exception
  table rather than a large table of assumed one-to-one class replacements.
- `.agents/skills/crumbs-migrate/SKILL.md`: explicit migration trigger and compact
  orchestration, with relevant source-profile references loaded on demand.
- Bundled target-API reference/examples, generated or synchronized from the existing
  consumer skill with a drift check. Copying the migration skill alone must work;
  do not require another agent skill to happen to be installed. Link the existing
  consumer skill for ongoing development after migration.
- Only needed deterministic helpers and fixture contracts; initially a JSON receipt
  shape and inventory/check protocol, not a new npm CLI product. If helpers emerge,
  they are developer tooling and never app runtime imports.
- Repo docs/README discovery links and qualification receipts. Skill installation is
  a reviewed whole-folder copy from a recorded Git revision; no npm release is needed
  for documentation/skill distribution alone.

Proposed user invocation:

```text
Use $crumbs-migrate to migrate this Expo app from NativeWind to Crumbs.
Preserve appearance, themes, responsive rules, interactions and public component APIs.
Inspect our installed versions and config first. Complete the supported migration,
run our checks and production exports, and verify iOS and Android where available.
Keep shared dependencies and any behavior that cannot yet be replaced safely.
Report unresolved cases precisely; do not describe a partial migration as complete.
```

## Qualification and one-shot admission

M12.1 starts with three bounded source fixtures: (1) static utilities and existing
style overrides, (2) themed/variant/responsive Pressable with observable callbacks,
(3) interop plus dynamic/unmapped behavior requiring honest retained cases. Include
important precedence, a non-default spacing/rem configuration, nested text/theme,
and shared dependencies across those fixtures. Record exact installed source and
Crumbs artifacts and a compatible Expo/RN environment; old SDKs must be diagnosed,
not upgraded without including and authorizing that separate work.

Run a baseline agent before drafting skill instructions. Qualify each advertised
source-version profile on both a guide fixture and a held-out fixture. For each
admitted profile, use three independent fresh-agent runs of the held-out supported
migration, without human repair prompts. Record success denominator, intervention
count, unsupported decisions and diffs; this is bounded fixture evidence, not a
population success claim. If cost is disproportionate, narrow advertised coverage
rather than lower correctness criteria.

Admission requires all supported-case runs to preserve expected public types,
state/precedence outcomes and native callback behavior; pass strict types, relevant
existing tests, actual production graphs, and the requested iOS Simulator/Android
emulator checks. Compare captured before/after scenes under matched theme, platform,
viewport and font-scale inputs, with explicit tolerances for rendering variance.
A successful export alone cannot establish visual/native parity. If an environment
is unavailable, report that check as unperformed and do not advertise full native
qualification for that profile. Physical/spoken-reader acceptance remains deferred.

Unsupported-case runs must retain the behavior/dependency and explain the exact
remaining work. Validate repeated execution without duplicate edits and an
interrupted-migration resume with unrelated user changes. The small fixture set
must cover these outcomes without becoming a general CSS conformance project.

Failure response: fix a concrete reference/recognizer gap and rerun the affected
scenario; stop after two unsuccessful repair rounds for that profile. Downgrade it
to guided/partial coverage and document the evidence. Do not manufacture a “one-shot”
label by rehearsing the same held-out fixture or silently changing its acceptance.

## Decision and next slice

The user approved this NativeWind-first design on 2026-10-18. Review the
[M12.1 implementation plan](../plans/2026-10-18-m12-1-nativewind-migration.md)
with fixture version pins, files and commands before execution. The user's retained
preference is native/inline execution, one complete slice and a commit with the
next numbered recommendation. No product code, migration skill, app dependencies,
CI settings or publication changes are implemented by this planning commit.
