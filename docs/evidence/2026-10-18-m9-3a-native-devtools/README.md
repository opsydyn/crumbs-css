# M9.3a native developer widget evidence

> Historical implementation outcome. The approved [qualification continuation](../2026-10-18-m9-3a-qualification-closure/README.md) closes the Android and native-cost gaps below. These original receipts and failed attempts remain unchanged.


Implementation and automated qualification passed. Native qualification is
incomplete: both iOS main journeys and Android Playground passed, while Android
Storybook failed to reach the launcher. Native app cost comparison remains unrun. This is an unreleased source-build candidate.
Published npm v1.2.0 is unchanged.

## Identity and automated checks

The implementation starts at `bbb455742d353d9c994d3716a019d832da5b5cca`.
The containing commit records its final source; each packed receipt additionally
pins the relevant source-file digest and exact tarball, including uncommitted
implementation files at qualification time. Both worker configurations produced:

- Source digest: `e88be55c13b2ea6cf0e412f88a52a5e934dd088d51cf918e0da95c5f31bb7f1e`.
- Tar SHA-256: `344c25078066cfcb84b1fa362dc71a7124800f9e6fcdc711b01f5c30813e526c`.
- SDK58, Node26.3.0, Bun1.4.2 for packed commands. Library Node>=22.0.0 support is unchanged.

[Qualification index](qualification.json), [Babel](packed-babel.json),
[Rust](packed-rust.json), and [synthetic cost](synthetic-cost.json) keep distinct
claims. Each worker exports web/iOS/Android in development and production.
Development contains the widget/provenance; production requires actual Crumbs
runtime sources and excludes debug code, clipboard, Effect and authoring code.
Worker identity is Expo configuration, not a per-file routing claim. Storybook
production exports also pass its existing provenance verifier with both workers.

`bun run check`: 1,931 CSS tests pass, one existing optional Node22-floor skip;
34 Storybook tests pass. `bun run app:check` passes for Babel and Rust;
Playground typecheck and the 34-page docs build pass. Focused review regressions
pass. The first full run rejected the unclassified native entry; its explicit
advanced-runtime classification now allows only React, React Native and Effect.
The original headless entry still excludes React Native.

## Live observations

Live sessions use SDK58 Expo Go58.0.4, iOS26.5 Simulator and Android16 emulator,
Babel default worker, on this workspace's apps. Existing custom clients lacked
Expo Clipboard, so they were not used as evidence for this feature.

The iOS Playground panel resolved parent `#ffffff` and nested dark `#243149`
tokens, opacity0.8 overriding0.4, selected/default recipe branches and unavailable
metadata. Storybook resolved a dark card token to `#17120e`; its disabled action
reported opacity0.55 with honest partial/compatibility coverage. Its enabled
action incremented the count once; disabled tapping left it at one. Preview/copy
and the app's readback matched the prepared report (length+FNV-1a checksum).
The checksum is a functional check, not a security primitive; the unit harness
asserts exact preview/clipboard-argument string equality.

Both apps passed iOS Fast Refresh edit/restore. Storybook iOS: edit the owned opacity fixture0.8→0.7; the old report
became stale and Preview disabled; Refresh showed0.7. Restoring the file repeated
the stale transition and Refresh showed0.8. Files restored byte-for-byte after each check; final packed qualification source digest remains unchanged.
Web smoke in both apps observed selection, Refresh, preview, successful clipboard
adapter completion, Escape and focus returning to the launcher. Browser clipboard
readback was not accepted as separate evidence.

The first native reopen exposed an empty accessibility tree. Unmounting a closed
modal alone did not fix it. Removing the duplicate `onDismiss` focus notification
resolved Storybook reopen; React Native Fabric Modal already saves/restores focus.
This is accessibility-tree/control evidence, not spoken screen-reader acceptance. After Maestro/XCTest sessions, CUA also temporarily exposed an empty AX tree for the plain app screen without a modal; the tool observation is not proof of a widget-only root cause. Maestro reopen assertions passed independently.

The initial Android replay failed during a workspace build/watch race (temporary
missing dist export). It is not counted as a product pass. Native replays run after
package builds finish, against restarted Metro servers. Subsequent Storybook
startup failures showed Expo Go still downloading (88.8% at 45 seconds; 66.1%
at 120 seconds). [Failure digests](android-startup-failures.json) and a
[screenshot](android-storybook-startup-failed.png) preserve those attempts;
no widget crash was established by the sampled error log. Do not run a package clean
build while testing a watched workspace consumer.

Maestro2.11 discovery initially failed: Dadb aborts when the shared ADB server
lists an unrelated offline transport. Removing the stale connection was transient;
no device or background service was stopped. An owned ADB server on port5038 and
an ephemeral IPv6-loopback relay let unmodified Maestro see only the owned Android
emulator. This is a host test-tool workaround, not an application prerequisite.

Accepted replay receipts:

| Platform/app | Accepted checks | Receipt |
| --- | --- | --- |
| iOS Playground | Override, copy/readback, missing metadata, close/reopen, target unmount/remount | [JUnit](ios-playground.xml) |
| iOS Storybook | Action once/disabled never, override, copy/readback, missing metadata, close/reopen, target unmount/remount | [JUnit](ios-storybook.xml) |
| Android Playground | Override, copy/readback, missing metadata, close/reopen, target unmount/remount | [JUnit](android-playground.xml) |
| Android Playground causes | Parent/nested tokens and recipe default | [JUnit](android-playground-causes.xml) |

Replay recipe refinements after the first accepted main flows add explicit Expo Go
foregrounding and a longer Storybook startup timeout. Older accepted receipts prove
their recorded assertions, not execution of a later recipe revision.

## Cost and usefulness boundaries

In the isolated React harness, disabled and mounted/closed each had101 target-parent
renders for the same100 updates. Closed: zero getters, zero explanations, one
registered target and no report. Twenty explicit captures called the getter and
explainer20 times, retained one report and caused zero target-parent renders.
Disposal left zero targets/reports. Raw timings are in `synthetic-cost.json`;
these are neither native frame timings nor proof of whole-process leak freedom.

The operator was the implementing agent, already aware of the expected causes.
Scoped token, later override and deterministic variant causes were identified
correctly from the widget and agree with independent compiled-fixture expectations.
This is functional dogfooding. No valid independent raw-report/widget timing study
was performed, and no speedup or usability superiority is claimed. Native cost,
physical devices, spoken screen readers and independent usability remain gaps.

## Review and execution decisions

One fresh whole-slice review found three P2 issues, all reproduced RED then fixed:
failed-capture notice persistence, conservative overflow warning retention, and
rejecting production maps without Crumbs runtime sources. Additional regressions
cover closing/reentrant selection during capture; getters cannot start after the
panel closes and old work cannot replace the newer selection.

Execution rulings:

- Reused the existing isolated worktree with owned dependencies. Cost if wrong:
  dependency contamination; frozen install and packed consumers provide separate checks.
- Used matched React test renderer for commit/replay behavior; native peers mocked
  only in isolated child processes. Cost: synthetic proof cannot replace device proof.
- Corrected a dotted-key export matcher to `Object.hasOwn`; no graph gate relaxed.
- Snapshotted trusted Metro accessor namespaces inside capture getters; arbitrary
  accessor rejection remains intact. Cost: consumers must follow the documented boundary.
- Traversed sectioned Metro maps, then required positive runtime evidence for every
  production cohort. Missing maps/cohorts still fail closed.
- Removed duplicate native focus restoration; retain explicit physical/spoken gaps.
- Used CUA for available live checks and isolated ADB for Maestro. No shared daemon
  reset, permanent hosts change or device reset was needed.
- Recorded actual command runtimes; escalated packed commands used Node26.3.0.
- Compiled the Storybook fixture before explanation; raw authoring definitions are
  not accepted as runtime module evidence.
- Native cost and independent usability are unverified rather than inferred from
  harness timings or an implementer's knowledge. Cost: product-value claims stay limited.

No review findings were deferred as minor. No version bump, push or publication
belongs to this slice.

## Effort and closure boundary

The ledger records one inline implementation/review session on 2026-10-18. Exact
active engineering hours were not instrumented, so this packet does not claim a
measured time-to-completion or an independent usability result. Native startup
retries are bounded; a failed replay remains a failure even when exports pass.
The roadmap stays unchecked while a required live or native-cost gate is incomplete.

## Final disposition and next action

Commit the implemented widget and its verified evidence as the bounded M9.3a
outcome, keeping M9.3a unchecked. The final transport comparison used an
emulator-specific ADB reverse mapping to the same Metro server; Maestro then
failed during driver installation with `java.net.SocketException: Broken pipe`.
It supplied no evidence about widget behavior. Further retries were stopped.

Remaining required checks: complete Android Storybook journey, Android Fast
Refresh edit/restore and native back, the remaining theme/variant live updates,
and disabled/closed/selected cost comparison in the native apps. The pure React
harness does not close that last requirement. Independent usability, physical
devices and spoken screen readers retain their separately declared gaps.

**Next roadmap action: M9.3a qualification closure**, beginning with a stable
owned Android/ADB session and the recorded replay recipes, then the native app
cost comparison. Reuse this implementation and packed receipts unless source
changes invalidate them. Do not release, waive a gate or expand the feature scope.
