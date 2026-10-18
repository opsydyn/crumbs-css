# M9.3a — Native developer widget and dogfooding

**Date:** 2026-10-18\
**Status:** Specification and implementation plan approved on 2026-10-18; implementation and automated qualification completed. Live results and remaining gaps are recorded in the [outcome](../../evidence/2026-10-18-m9-3a-native-devtools/README.md).\
**Roadmap:** [M9.3a](../../roadmap.md), additive follow-up to shipped M9.3.\
**Baseline:** npm 1.2.0; source documentation commit `383dd844c4d26c34c2bab6d09c83234e9f3816b0`.\
**Execution:** Native/inline, retained from the user's preference. One implementation slice including Playground and Storybook dogfooding; commit its outcome.

## Intent and accepted direction

Help a design-system developer answer “why does this component look like this?” without manually assembling an `explainStyle` call. Provide an opt-in native launcher, registered-target list, property explanations and a copyable report. Reuse M9.3's typed reports and development metadata. Preserve authoring/runtime isolation and keep production artifacts free of the widget.

The user approved specification and roadmap work followed by dogfooding in Playground and Storybook. This document specifies that first slice. Its acceptance evidence is maintained separately in the linked outcome; specification text alone is not proof of a passing native check. A two-engineering-day dogfooding appetite was proposed in discussion; it is a stop-and-assess boundary, not a delivery estimate or permission to lower correctness gates.

## Current evidence and alternatives

- `packages/css/src/devtools/explain-style.ts` already accepts a compiled module, exact export path and explicit current/previous input snapshots. The model exposes resolved values, override winners, branches, conditions, token dependencies and coverage. It does not observe mounted components or native final layout.
- `apps/playground/src/App.tsx` supplies real theme switches, nested scopes and portals. SDK 58 is already configured.
- `apps/storybook/src/components/ShowcaseCard.tsx` applies compiled styles and an action recipe with disabled/pressed variants. Its Pressable callback selects transient pressed styles; that state cannot be inferred from the exported recipe alone.
- `apps/storybook/.rnstorybook/preview.tsx` hosts native stories under brand/mode/density scopes and existing theme controls. `AppThemeProvider.tsx` supplies explicit native conditions.

Three routes were considered: render the existing JSON report in a fixture only; create a native widget over an explicit registration layer; or start with a desktop Expo plugin. Choose the native widget because it tests the actual in-app diagnosis flow in both requested hosts. The existing headless API remains the manual alternative. Desktop transport and automatic native element picking would add independent work before the core explanation flow is proven.

## First-slice experience

1. A development-only Crumbs button opens a sheet. The launcher has an accessible name, a minimum 44-by-44 logical-unit target, and configurable corner/insets so it can avoid existing app controls. Dragging and position persistence are deferred.
2. The sheet lists explicitly registered mounted targets by label, instance identity and export path. Selection is from this list, not arbitrary tapping on native views. Multiple instances with the same label remain distinguishable.
3. Selecting a target captures its latest committed supplied inputs and generates one explanation. Show capture revision and a clear “supplied Crumbs inputs” label; this is not a computed-native-style inspector.
4. Properties show resolved value, token identity when available, winning declaration and overridden declarations. Recipe/slot branches and supplied conditions are inspectable. Preserve complete/partial/unavailable coverage and reasons at both report and property level.
5. An input update marks the displayed report stale. Refresh explicitly replaces it. No background report generation, polling, render history or automatic snapshot comparison in this slice.
6. Copy report shows a preview of the exact payload before an explicit copy action. It exports `{ type: "crumbs.devtools.capture", version: 1, target: { instanceId, label }, revision, report }`, with the versioned M9.3 report in `report`, not component props, the entire theme, module objects, absolute paths or environment data. Style values may be sensitive; provide an optional application redactor and never copy automatically.
7. Closing discards the report and selection. An unmounted target clears selection immediately. Missing metadata, invalid export paths, unsupported values, capture errors and clipboard rejection produce recoverable messages without crashing the app.

The sheet handles scrolling, large text, safe-area insets supplied by its host, Android back dismissal, web Escape and return of accessibility/keyboard focus to the launcher. Only the launcher receives touches while closed. Opening/closing must not trigger underlying action callbacks or intercept unrelated app gestures.

## API and package boundaries

Introduce the proposed isolated `@opsydyn/crumbs-css/devtools/native` entry. Leave existing `devtools`, root, theme, style and token exports unchanged. Names below describe the intended contract; detailed TypeScript signatures belong in the implementation plan.

- `CrumbsDevtoolsProvider`: owns one registry and panel state per mounted provider. Multiple app roots do not share state. Exposes no process-wide singleton.
- `useCrumbsInspectorTarget`: registers a label and a getter returning the existing `ExplainStyleInput` without `previous`. Returns a stable opaque instance identity. Registration, getter replacement and cleanup happen after commit, never during speculative React rendering. Getters must return immutable inputs and perform no side effects; they are invoked only on selection/Refresh.
- `CrumbsDevtoolsWidget`: renders the launcher and sheet inside the matching provider. Accepts placement/insets plus a host `copyText(text): Promise<void>` adapter and optional report-redaction callback. The adapter lets Expo consumers use their own clipboard facility without adding an unconditional Expo dependency to Crumbs.

A provider retains at most 200 admitted targets and one report. Further targets receive a visible capacity diagnostic rather than evicting a selected entry or silently claiming full coverage. Freed slots can be claimed on a later registration attempt; no timer retries. Copy is limited to 256 KiB of UTF-8 JSON after redaction; oversized reports remain viewable and cannot be silently truncated or copied as complete. Validate that redaction returns JSON data within that limit; failure preserves the app and leaves the clipboard untouched.

Widget UI uses basic React Native components and local static styles, avoiding a recursive dependency on the styles under inspection. Keep the registry/presentation separate from the explanation adapter. Loading the widget must not load compiler, Vanilla Extract authoring, esbuild or Node-only modules. Effect stays internal to the existing explanation implementation; consumers use plain TypeScript/React APIs.

Consumer setup uses a development-only import boundary with a production no-op adapter. Guarding only JSX while retaining an unconditional import is insufficient proof of removal. Show the exact working pattern in the delivered documentation and verify it against packed Metro exports. Do not re-export the widget through ordinary runtime entrypoints. No release/version bump or npm publication is part of this slice.

## Correct input capture and lifecycle

The registered module must be the original compiled namespace with its development sidecar, not a destructured or resolved style subset. Capture the theme from the same provider scope used by the target, and pass the same selection, conditions and ordered extensions used for resolution. Never fall back silently to the app-root theme for nested scopes.

Use small development-only probe components in the design-system examples to read the relevant theme/condition context and register targets. Keep any extra debug subscriptions inside those probes rather than changing production styling hooks. A probe may update its committed getter while the panel is closed; “closed” guarantees zero explanation/schema work, not zero pointer bookkeeping or debug subscriptions. Measure that distinction explicitly.

A capture is coherent within one committed revision. Abandoned renders cannot publish getters. A new commit invalidates the visible capture before another copy is allowed. Hot replacement invalidates old module references and requires a fresh capture; setup/cleanup replay must not duplicate targets. A capture taken just before unmount must not resurrect the target. Different providers and repeated labels cannot collide.

The first slice does not claim pressed-state or animation sampling, post-Crumbs inline override provenance, native layout, React render counts or cache-hit observation. Storybook action captures cover deterministic idle/disabled selections; the panel explicitly excludes transient Pressable callbacks. Report coverage continues to describe the supplied export, not all styling applied to a host view.

## Dogfooding fixtures and decision

Add a dedicated “Devtools” journey to Playground and focused native Storybook stories. Use public built package exports; include one packed consumer check so workspace access cannot hide a missing export or dependency. Fixtures contain deliberate styling choices, not defects in production components.

| Diagnosis | Playground | Storybook | Expected proof |
| --- | --- | --- | --- |
| Wrong token/scope | Same registered card under parent and nested themes | ShowcaseCard in dark/light and brand scopes | Report points to the actual scoped token and fixture value |
| Unexpected override | Small composed style with a deliberate later declaration | Dedicated override story | Winning and overridden declarations match the applied fixture |
| Unexpected variant | Explicit selected/default recipe controls | ShowcaseCard idle/disabled action, root and label slots | Branch/selection and slot values match the resolver |

For each case, compare the on-screen report with independently asserted resolved fixture properties. Exercise theme/selection updates, stale marking, Refresh, missing metadata, duplicate labels, unmount/remount and Fast Refresh. Verify app actions still fire once, disabled actions remain disabled, and theme controls remain usable.

Record live UI journeys on iOS Simulator and Android emulator for both apps, including opening, selecting, refreshing and copying/report-preview behavior. Smoke web behavior separately. Record SDK, worker mode, source/package identity, screenshots or automation receipt and limitations. Packed development/production exports cover web/iOS/Android with Babel and Rust; live native dogfooding may use the default worker, and must name it. Do not equate exports with live UI acceptance. Physical devices and spoken screen-reader acceptance remain deferred; record accessibility structure/focus checks separately.

Measure diagnosis success and effort against the manual `explainStyle` workflow using the three cases. Record correct cause identified, steps and elapsed time with the operator and order disclosed; this is internal dogfooding, not independent user research. No baseline or speed improvement is assumed. If no independent operator is available, report that usability evidence gap rather than treating an authored automated script as unassisted success.

Stop after the proposed two-day effort window and record complete/incomplete evidence. Continue toward productization only if all three causes can be explained correctly, registration stays confined to dev adapters/shared components, and isolation/lifecycle checks pass. If the widget does not reduce effort versus the raw report, simplify the UI or retain the headless workflow. Do not extend the window or expand scope silently.

## Verification and completion gates

- Registry tests cover commit/update/unmount races, setup-cleanup replay, duplicate labels, provider isolation, target capacity and reference release. Property-based event sequences are appropriate for lifecycle invariants.
- Real compiled-fixture integration tests prove target/input/report agreement, stale capture refusal, partial/missing metadata and recovery after invalid selection. UI tests exercise selection, refresh, dismissal, focus and copy success/rejection/redaction/size limits.
- Assert zero calls to `explainStyle` during closed-panel render/update sequences. Opening/Refresh generates one report per user request; widget renders and copy do not regenerate explanations. No unbounded report or input history.
- Compare disabled, mounted/closed and selected/refresh runs on the same fixture and host. Record render counts, retained target/report counts and explanation duration as diagnostics. Existing M10.5 policies remain unchanged; this spec introduces no unmeasured performance claim or numerical waiver.
- Packed consumer types and source-map/import-graph checks prove the new public entry resolves, ordinary entries do not reach it, and production apps exclude widget implementation and provenance by default. Merely returning a production no-op is not sufficient.
- Run package build/typecheck/tests, affected app checks and docs build; run named native/packed checks above. Preserve not-run states and exact failure reasons.
- Update the consumer guide, README API inventory, agent guidance only if its current instructions require a changed call pattern, and roadmap with actual implementation and dogfooding evidence. Proposed APIs stay out of shipped-reference docs until implemented.

## Deferred capabilities

Automatic touch picking/highlighting, draggable launcher, desktop Expo plugin, live style editing, token catalog navigation, audit rules, history/diff timelines, transient pressed/animation capture and plugin extensions are outside M9.3a. They require separate evidence and scope decisions. The existing headless `explainStyle` API remains supported throughout.

## Sources

- [Existing M9.3 specification](2026-09-27-m9-3-style-explanations-design.md)
- [Current explanation guide](../../src/content/docs/how-to/explain-native-styles.mdx)
- [Astro dev toolbar](https://docs.astro.build/en/guides/dev-toolbar/): interaction inspiration, not native integration code.
- [Expo devtools plugins](https://docs.expo.dev/debugging/create-devtools-plugins/): optional later desktop transport.
