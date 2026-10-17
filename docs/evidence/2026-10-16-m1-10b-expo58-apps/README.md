# M1.10b — SDK 58 internal apps

Status: local qualification passed. Both app upgrades, four worker exports, four native development-client builds, final sequential source checks and independent review pass. Playground and Storybook journeys pass on the owned iOS and Android targets under both Babel and Rust. Hosted clean CI remains required before M1.10b closure. This packet is not release or physical-device acceptance. See [acceptance receipt](acceptance.json).

## Inputs and changes

Both apps use Expo 58.0.14, React/DOM 19.3.1, RN 0.88.0 and web0.21.4; the observed matching template is58.0.23. Storybook also pins Gesture Handler3.3.0, Reanimated4.7.1, Worklets0.13.0 and safe-area5.10.1. Expo dev-client58.0.14 is app-only. The library's SDK56 development peers and installed56/57 profiles remain. [Source inventory and candidate hash](source-inputs.json) binds the current source to the retained unpublished1.1.1 development tarball under [artifact](artifact/pack.json); it is distinct from registry1.1.1. The source commit is the Git commit containing this packet; hosted CI remains pending.

Babel is the default. `CRUMBS_METRO_WORKER=rust` selects Expo's actual supervising worker experiment; typos fail. The canonical `expo/internal/babel-preset` avoids two physically different preset identities under Bun, without bypassing upstream eligibility. Expo adds the required Worklets transform. Storybook's legacy modal datetime-picker contains unannotated Flow: a narrowly scoped parser override selects Babel for that dependency; normal app modules remain Rust-eligible. No custom Rust adapter or new library dependency is added.

The actual native run exposed RN88's public `nativeEvent` prototype getter. Container onLayout now reads that host API once, normalizes thrown access to the existing diagnostic and keeps layout/axis configuration descriptor-only. Retired events return before reading. Tests retain RED/GREEN plus real measured native geometry. Metro 0.87's optional CacheStore.name also needs an exactOptionalPropertyTypes-compatible input; the existing runtime wrapper still supplies a concrete name. The linked app declarations explicitly resolve each app's public RN88 type entry; installed consumers remove that workspace mapping for all explicit SDKs. Retained SDK56/57 staging preserves its prior Node >=22.13.0 contract; SDK58 alone receives the stricter app engine range.

## Worker evidence

Each row uses the real app entry, a fresh app/mode cache, actual worker events and runtime-graph checks for iOS/Android/web. Flags or all-Babel fallback cannot satisfy Rust acceptance.

| App | Babel | Rust |
| --- | --- | --- |
| Playground | [passed](playground-babel/qualification.json) | [passed](playground-rust/qualification.json) |
| Storybook | [passed](storybook-babel/qualification.json) | [passed](storybook-rust/qualification.json) |

Raw events/export logs are compressed beside each receipt. Native transport events are retained separately; UI screenshots and AX text establish interactions independently. An export is not native UI evidence or a performance result.

## Native evidence

Owned iOS target2D09BD16-681D-49BF-B01C-B73D6F53BF95 is iPhone17e/iOS26.5. Both independent staged Xcode builds passed. Retained native commands, command results and binary identities accompany screenshots/AX.

Playground Babel/Rust passed theme, form/switch, nested themed portal, generated/control callback counters, measured176→288 narrow/column→wide/row, running animation cancellation and unmount with the sibling intact. Controlled public I18nManager setup and a fresh launch enable RTL; unchanged real app entries then report wide-row chip x216/144 versus LTR8/80 in both modes. The owned app's forceRTL preference was restored to false, with requested:false/isRTL:false logged. The test setup entry is not presented as a product entry.

Storybook Babel/Rust UI-lite passed actual Controls label edit/restore, rendered card action, onActionPress Actions event, light/disabled/dark variants and native modal open/dismiss. A real native long press opens Context Menu's quick actions; selecting Pin updates the rendered card to Pinned to favourites. This establishes the planned gesture interaction; a drag-specific claim is not made. CUA diff snapshots can lag: full current AX and visible screenshots are retained; changing aggregate telemetry labels alone is not treated as proof. Spoken-reader acceptance stays deferred.

Owned Android AVD `crumbs_m110b` uses the official API36 AOSP ATD arm64 image with normal animation scales1. It was selected after the unused Google-services image could not fit. Both independent Android Gradle builds passed. The installed Storybook base.apk SHA matches the successful build's APK. No Google-services, hardware renderer or performance acceptance is claimed.

ATD initially disables drawing with `debug.hwui.drawing_enabled=0`: those early runs establish hierarchy/events only. Drawing was enabled on this owned AVD and the clients restarted. Subsequent rendered screenshots and native hierarchy establish Playground theme/form/portal/factory counters, scrolling, measured176→288 containers and RTL geometry under both workers. Android RTL reports wide-row x216/144; restored LTR reports8/80. Both platform forceRTL preferences were restored to false.

The Maestro CLI's settling delays cannot reliably interrupt the five-second motion transition. The retained `native-replay/RapidMotion.java` uses the installed real Maestro AndroidDriver API to tap existing native control bounds, cancel/unmount within four seconds, and inspect rendered state after the original deadline. Both workers pass: cancellation is terminal, A unmounts with B intact, and no retired publication appears after5200ms. No app action, timing threshold or animation implementation was altered for this test.

Android Storybook Babel/Rust both pass Controls label edit/restore, rendered action and onActionPress Actions log, light/disabled/dark stories, native long press and pin state change, and modal open/dismiss. A fresh Android-only Rust server records actual ShowcaseCard and React JSX completions; iOS and aggregate streams remain separately labelled in native-worker-qualification.json. Public search is used to avoid a clipped tree row and background uppercase theme controls; fixture failures are retained, not treated as library fixes. Maestro targets only the owned emulator through `--host127.0.0.1 --port5581`; no global ADB reset is performed.

Native stages and caches are task-owned under `/private/tmp/crumbs-m110b-20261016`. The preexisting Storybook iOS project and protected M10.5 Simulator are untouched. Physical hardware, iOS27/Device Hub-specific behavior, spoken readers and release FPS remain deferred.

## Checks and retained limitations

- Frozen Bun install passed; both Expo install checks report current matching dependencies.
- Expo Doctor reports 19/20 Playground and 18/20 Storybook, retaining expected workspace duplicate React/RN dev-baseline warnings; physical app-owned peers are explicitly checked. Storybook also retains the preexisting unsynced native-folder warning. Rust's internal experimental flag is absent from the remote Doctor schema; that warning is not suppressed.
- Final library and Storybook tests pass 1899+33 with zero failures and one existing optional explicit Node22 probe skipped; strict source typecheck passes. The earlier full build/type/test check passes 1898+33 before the final staging-only Node-retention regression. Both app prescribed checks and all four final worker exports passed.
- `check-coherent-final.log.gz` is an **invalidated failed run**: executor overlap started npm prepack's rebuild while tests read dist, causing missing built exports. The subsequent command-scoped caffeinate sequential gate passes; this failure is not hidden or represented as a source regression fix.
- [Independent review disposition](review-disposition.md) records the required exact fallback assertions and their fresh Rust reruns.
- Host-sleep-invalidated timeout runs remain retained alongside the passing awake-host verification; test limits were not changed.
- CI is extended to explicit56/57/58 packed checks and four app/worker cohorts. Hosted clean frozen-install CI remains required before closure.
- M1.10a retains three independently reproduced upstream RN88 declaration errors under its minimal skipLibCheck:false probe; normal Expo strict consumer checks pass. Historical56/57/58 receipts are preserved and do not substitute for the fresh hosted checks on this slice.
- Performance thresholds, the historical consumer2.5x report and M10.5 are unchanged. No new exception or publication is authorized by this slice.
