# iOS native scroll acceptance

The dedicated Crumbs Acceptance iPhone 17 / iOS 26.5 simulator ran the workspace `@opsydyn/crumbs-css` `0.1.2-alpha.2` consumer at `4221803 (working tree)` in official Expo Go 56.0.4. Maestro 2.10.0 and Java 17.0.20.1 performed actual native swipes. No programmatic scroll command or app scrolling repair was used.

| Run | Fresh list | Forward swipe | Theme change | Reverse swipe | Result |
| --- | --- | --- | --- | --- | --- |
| Negative control | y=0, row=1, drags=0 | Deliberately omitted | — | — | Final scrolling assertion failed as intended |
| Positive 1 | y=0, row=1, drags=0 | y=259, row=5, moves=62, drags=1 | y=259, row=5 exactly | y=8, row=1, moves=111, drags=2 | Passed, 22 seconds |
| Positive 2 | y=0, row=1, drags=0 | y=261, row=5, moves=63, drags=1 | y=261, row=5 exactly | y=14, row=1, moves=113, drags=2 | Passed, 21 seconds |

Each flow stopped Expo Go and reopened the consumer. The decoder admitted all measurements before assertions. The negative flow successfully completed startup and the fresh-list assertion, then failed the deliberately unsatisfied scroll assertion. The two positive runs independently preserved their exact rounded offset and first half-visible row across the light-to-dark change. Reverse scrolling advanced native drag counts and returned to row 1; reaching an exact zero offset was not required.

The [structured result](result.json) contains the full measurements, identity, runner versions and SHA-256 hashes of retained artifacts. JUnit reports retain the intended [negative failure](negative.xml) and passing [first](positive-1.xml) and [second](positive-2.xml) runs. The negative report is intentionally red and is not part of a passing suite.

Raw screenshots were retained from both positive runs: [first light](positive-1-forward-light.png), [first dark](positive-1-forward-dark.png), [first reverse](positive-1-reverse-dark.png), [second light](positive-2-forward-light.png), [second dark](positive-2-forward-dark.png), [second reverse](positive-2-reverse-dark.png). Visual inspection of the first dark and reverse captures confirmed the displayed row identities, theme state, package identity and native probe measurements.

## Reproduction and runner prerequisites

Follow the [flow instructions](../../../apps/playground/e2e/README.md). Maestro is an external development tool, with no library or consumer dependency added. The official `cli-2.10.0` archive digest matched `29b675e10cc12080e445e9bfb2e2b4e4dfb9c0f2e30d5884120d258b5e1cd991`. The CLI runs locally; no cloud flow, login or AI analysis was requested.

On this host, Maestro first hung in Dadb's unconditional Android discovery, probing an unrelated Native Instruments IPv4 service on localhost:5563. Explicit iOS selection and the discovery host override did not avoid all fallback scans. The process-local `JAVA_OPTS=-Djava.net.preferIPv6Addresses=true` resolved the collision without changing the service or system networking. Initialization hangs were not classified as app/test failures and produced no acceptance evidence.

## Qualification boundary

This closes the native scrolling gap from the [earlier input investigation](../2026-09-14-scroll/README.md) for this iOS development consumer. Earlier [iOS acceptance](../2026-09-14-ios/README.md) covers startup, themes, form state, keyboard visibility, scopes and explicitly bridged portals. M0.9 remains incomplete because Android native acceptance has not run: this host has no configured SDK/emulator executables.

The opt-in probe changes rendering through state updates. This is functional evidence, not a release frame-time, startup, standalone-app, physical-device or screen-reader qualification.

Package build/typechecking and all 130 tests / 5,263 assertions passed. `bun run playground:check` passed consumer typechecking and production exports for iOS, Android and web; those exports do not constitute Android native acceptance. Docs built 20 pages. Artifact hashes and local documentation links were checked. The test Metro/watcher processes were stopped and only the dedicated Crumbs simulator was shut down; the unrelated iOS 26.4 simulator remained booted.
