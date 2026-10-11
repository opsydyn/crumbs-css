# M1.9g — SDK 57 Storybook qualification

**Host checks and selected iOS/Android native checks pass. M1.9g is complete for this upgrade scope.** Earlier emulator startup failures due to disk pressure remain retained in [logs](logs/); later Android interaction was independently executed after storage recovered. See [qualification](qualification.json).

Storybook adopts Expo 57.0.27 / RN 0.86.3 / React 19.2.8 with Reanimated 4.5.1, Worklets 0.10.1 and Gesture Handler 2.32.0. Metro restores physical transitive lookup and selects app-owned renderer peers; native type paths stay out of Metro web aliases. The factory harness loads app-owned React with the built library. Public library code, APIs, SDK 56 development peers and release gates are unchanged.

`bun run app:check` checks strict types, clears the Metro export cache, exports enabled Storybook on iOS/Android/web, then verifies runtime isolation and LiteUI/Controls/Actions on each platform. CI adds this command alongside retained SDK 56/57 playground coverage. The showcase entry also exports on all platforms. [Physical peers and map hashes](export-peer-versions.json) record final outputs; [input hashes](input-hashes.json) pin tested changes against base `672ba963fc35ddb0625a9100451ec35a75c9194c`.

## Verification and failed attempts

Node 24.15.0 / Bun 1.4.2 were used. Frozen install, dependency check, types and 14 SDK-focused checks pass. The isolated full suite passes 1,858 library tests with one expected skip and 33 Storybook tests. The later export-guard change passes six focused regression tests, library types, final `app:check` and a 34-page documentation build. [Logs](logs/) retain output. Doctor reports **19/21**: SDK 56 library development-peer duplicates and preserved untracked generated iOS configuration warnings. Custom native builds/autolinking are unqualified. SDK 56 fixture/CI remains; no fresh packed SDK 56 run is claimed.

The first export hid physical `expo-modules-core` under disabled hierarchical lookup; restoring transitive traversal resolved it. The first suite exposed three mixed-React harness failures; app-owned React resolved them. A later suite overlapped native startup and another export: a 5-second timeout terminated shared esbuild and caused follow-on failures. An isolated rerun passed with unchanged timeouts.

Auditing caught a cached showcase entry in the first final check. Clean export fixes entry selection; the optional `--storybook` source-map guard rejects the actual showcase output and missing addons on any platform. Cached output and RED/GREEN regression remain retained. Final maps explicitly contain LiteUI/Controls/Actions. Independent review reports no findings. No timing resampling or release-budget exception is claimed.

## Native scope and cleanup

[iOS observations](ios-observations.json), hierarchies and screenshots establish actual LiteUI story browsing, action-label editing/restoration, `onActionPress` after tapping the rendered action, and Light/Disabled/Dark Showcase Card visits in official Expo Go 57.0.9. Disabled carries `NotEnabled`. This is selected interaction coverage, not full story acceptance.

The temporary iOS simulator/companion were removed, downloaded client assets deleted after installation, and owned Metro stopped. [Ownership](native-ownership.json), [client identity](client-identity.json), [cleanup](client-cleanup.json) and simulator inventories retain boundaries. Unrelated simulators/native files remain preserved. Four exact failed-run fixtures were removed; see [receipt](test-fixture-cleanup.json). [Primary hashes](primary-preservation.json) are unchanged.

[Android observations](android-observations.json), XML hierarchies, tap records and viewed screenshots establish the same native LiteUI Controls edit/restore and `onActionPress` event, plus Light/Disabled/Dark visits. Android reports the disabled button as `enabled=false`. The exact official Expo Go 57.0.9 APK SHA-256 is `14c18828a3d04e43922245920bd941b978fd1c7a5aec88a0188032f0bb4972ce`, independently rechecked before installation. The owned `crumbs_m113` session was read-only; [ownership](android-session-ownership.json) records reverse removal and emulator/Metro shutdown. Original AVD and unrelated emulator sessions remain preserved.

The user authorised CoreSimulator cleanup. [The cleanup receipt](core-simulator-cleanup.json) records 577,617,920 allocated bytes of `Library/Caches` removed from the shut-down iPhone 17, preserving its app/user data. The iPhone 17e had become active and was skipped. The user's previously requested Finder Trash operation timed out; no Trash-emptying success is claimed.

No custom native build, physical, spoken-reader, HMR or release-performance acceptance, push or publication is claimed. M11.6 remains parked.
