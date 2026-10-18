# M9.3a execution decisions

Archived execution ledger, including the historical incomplete outcome and the approved closure. Later entries supersede earlier status.

# SDD ledger — plan: docs/superpowers/plans/2026-10-18-m9-3a-native-devtools-widget.md

Task 1: in progress. BASE bbb455742d353d9c994d3716a019d832da5b5cca.
Execution started 2026-10-18; Node 24.15.0, Bun 1.4.2, isolated branch codex/m9-3a-widget-spec.
Pre-flight: one task; registry/capture/provider/widget interfaces share the approved model. No conflicting signatures.
Owned frozen install completed; only this task's five dependency symlinks were unlinked. Prior worktree untouched.
Ruling: retain the existing isolated worktree, with its own dependencies — no additional checkout needed.

Steps 2–8: registry, safe serializer, provider/hook and native UI implemented against RED tests. 12 focused functional/property tests now pass; package build/types and ESM/CJS graph tests pass. Existing baseline suite passed (CSS and 33 Storybook tests).
Ruling: use matched react-test-renderer 19.2.3 as isolated commit-capable test harness; SSR cannot prove layout-effect registration. Host peer mock is confined to a child process; live native remains separate.
Ruling: package export test used a dotted-property matcher on a literal slash/dot export key; corrected to Object.hasOwn after verifying export manifest/build output. No graph gate weakened.
Steps 9–10: development adapters and fixtures integrated in both apps; app typechecks pass. Expo Clipboard 58.0.3 added only to apps. Native/packed/UI evidence remains outstanding.

Live web RED: Metro exports are accessor bindings; explainStyle correctly rejects them as unsafe own-data exports. Ruling: explicit consumer probes snapshot trusted compiled namespaces with {...module} inside getInput only, retaining __crumbsDev/__crumbsModule and original un-resolved values. Headless safety contract is unchanged. Docs must show this boundary. Temporary error instrumentation removed after diagnosis.
Packed first run failed closed on sectioned Metro maps. Ruling: recursively inspect actual embedded sources; missing sections/sources still fail. No platform/production gate relaxed.

Native iOS: Expo Go 58.0.4 used because pre-existing custom clients lack Clipboard. Storybook action once/disabled never, overrides, scoped dark token, copy checksum readback, close/reopen, unmount and Fast Refresh edit/restore observed live. Playground scoped tokens/override/variant/copy observed; final reopen replay outstanding.
Ruling: native Modal already restores saved accessibility focus in RN's Fabric implementation; removed duplicate onDismiss restoration after live reopen produced an empty AX tree. Closed native modal is unmounted (RED/GREEN harness); Storybook reopening is now accessible. Cost if wrong: native focus acceptance needs another fix, not a release waiver.
Ruling: initial Maestro iOS hierarchy attempts stalled and Android discovery fails despite ADB device/boot and successful SDK58 bundle. Use CUA for available live iOS/web checks and preserve Android live gap until resolved. No automated native pass claimed.
Ruling: actual command runtime differs between normal and escalated shell; packed receipts record Node26.3.0. Do not label those runs Node24. Library supported Node floor unchanged.
Ruling: Storybook fixture expectations must cross the compiled boundary; raw authoring exports are not explanation input. Test uses real published transformer subpath and independently expects opacity0.8 overriding0.4.

Final review: three P2 findings, all fixed in one RED/GREEN pass: recovery notice, sticky bounded overflow warning, positive production runtime evidence. Additional closed/reentrant capture tests fixed. 13 focused checks passed; final full suite1931 CSS pass/1 existing skip,34 Storybook pass.
Final verification: library build/types/tests, app:check Babel and Rust, Playground types,34-page docs build pass. Final packed Babel/Rust receipts match tarSHA344c25078066cfcb84b1fa362dc71a7124800f9e6fcdc711b01f5c30813e526c and sourceDigeste88be55c13b2ea6cf0e412f88a52a5e934dd088d51cf918e0da95c5f31bb7f1e.
Native: both iOS app flows and Android Playground flow pass. Android Storybook harness refinements: lower-half list swipe, case-sensitive Light story selector, foreground client before deep link. Remaining replay in progress. Both iOS app fixtures pass0.8→0.7→restore0.8 Fast Refresh staleness/Refresh; source restored.
Ruling: no clean package rebuild during watched native session; one initial Android run observed transient missing dist exports during qualification build. Restarted Metro after builds and replayed; failed run retained, not accepted.
Ruling: shared ADB's phantom offline transport aborts Dadb enumeration and instantly reconnects after disconnect. Used temporary owned5038 ADB plus IPv6 loopback relay; no shared daemon/device reset. Stop owned relay/server at finish.
Final minors: none. Physical/spoken and independent usability evidence remain explicitly deferred; synthetic cost counts are not native memory/frame claims.

Final outcome: implementation and automatic qualification verified, required native gates incomplete. Android Playground causes pass; Android Storybook launcher never reached within45/120s (Expo Go download screenshots). Final reverse-route comparison failed during Dadb driver installation with Broken pipe. No product crash inferred. Android refresh/back and native app cost comparison remain unrun.
Ruling: stop repeated native host retries and commit the bounded incomplete outcome under plan step15 — do not waive gates or claim release readiness — cost: M9.3a needs qualification closure before release preparation.
Final verification: focused20/20 checks1112 assertions pass, docs34pages pass, git diff check passes; sourceDigest unchanged from final Babel/Rust receipts. No further product code changed after full1931+34 suite. Task1 remains incomplete at steps12–13; outcome commit records what is done and what is not.

Outcome commit: 3a795b4. Clean worktree verified. Required qualification gaps remain; retain this task ledger for closure. Owned Android emulator, reverse route, ADB5038 relay/server and four Metro servers stopped; shared ADB and other devices left alone.


## Approved qualification continuation — 2026-10-18

Task 1: complete. The approved continuation closes steps 12–13; no publication authority inferred.
Eleven Android replay receipts pass: Storybook main journey, both apps' causes/theme/variant changes, edit/restore and native Back/reopen. Four native source cost receipts pass in SDK58 Expo Go on iOS26.5/Android16, with zero closed inspection work, bounded one-report capture and zero registry references after disposal. Instrumented source and entry files restored byte-for-byte.
Ruling: permit one conditional launcher retry only while the panel remains closed, followed by an explicit open assertion — the independent tap succeeded; this is a harness accommodation — cost if wrong: a real intermittent first-tap defect may need separate investigation; no root-cause fix is claimed.
Ruling: measure actual source provider/hook/registry/widget in temporary native screens, with a real compiled override fixture — source instrumentation allows complete explanation-call accounting — cost if wrong: these timings cannot establish exact packed or production-build overhead, which remains unclaimed.
Ruling: retain the provider/context in the disabled baseline while disabling the probe/widget — this isolates target registration/capture behavior in the existing fixture — cost if wrong: no completely tooling-free baseline or causal whole-app overhead claim is available.
Ruling: close native functional/count qualification while explicitly retaining independent usability, physical/spoken-reader and release frame/heap gaps — accepted functional cases and counts answer the approved continuation; known-answer implementing-agent runs do not answer those other questions — cost if wrong: later usability/device acceptance can require changes before broader claims.
SDK58 types exposed undefined native focus handles. Reproduced RED, applied a numeric-handle guard, verified GREEN including null/undefined and numeric cases. No API or peer-range change.
Ruling: retain earlier functional replay identities and qualify the focus guard separately through regression/native-source cost/fresh packed matrix — no replay receipt is relabelled as a different artifact — cost if wrong: a package-specific live integration regression could require a new native replay during release preparation.
Fresh-context closure review: no Critical or Important findings. Final: minor (deferred): successful restore retains staging.json, but a repeated-stage refusal still says to restore; use a fresh staging directory. Documented, no new code pass.
Final checks: full check1931 CSS pass/1 existing exact-Node22 skip and34 Storybook pass; qualification/native regressions5pass; strict SDK58 native types; Playground types; both Storybook Babel/Rust production exports/graphs; docs34pages; fresh packed Babel/Rust6 cohorts each all pass. SourceDigest2363670387a4c03f860cde4c0fb9deb84a7e1d359816056edefd42cde2c87eff; tarSHA3e27843f07c5dfdddb170e46c49f00aef105896f81525484716cb20e8cb6ba54. No publication/version bump.
Screenshots: real accepted iOS override and Android variant captures added to the user guide, with captions, alt text and deployment-base URLs; rendered gallery inspected. Roadmap/spec/plan updated; original incomplete packet retained as history with a closure link.
Owned emulator transport, ADB5038/relay, Metro/collector and docs preview servers stopped. Individual reverse-removal commands returned nonzero before the successful emulator/server shutdown; no saved routes or devices were modified. Shared ADB/devices, saved AVD data and unrelated workloads untouched.
Next recommended slice: M9.3a release preparation — additive version, release notes and exact-artifact workflow. Keep branch/worktree as requested; no merge or push.
