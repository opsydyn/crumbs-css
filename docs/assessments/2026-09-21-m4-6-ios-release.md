# M4.6: iOS release Hermes follow-up

This follow-up exercised the committed retained-memory workload in a disposable
Expo 56 iOS project using a Release Hermes build. The repository revision was
`81e6cc8` with Crumbs `0.1.2-alpha.2`; Android remained parked and no native
dependency or repository runtime file changed.

The host used Xcode 26.5 (17F42), CocoaPods 1.17.0, React Native 0.85.3 and
the dedicated booted iOS 26.5 simulator **Crumbs Acceptance**. Expo prebuild,
86-pod resolution, Xcode Release compilation, installation and launch all
passed. The final app embedded a Hermes framework and an embedded JavaScript
bundle. The first disposable bundle selected two React copies and failed in
`ThemeProvider`; app-local-first module resolution fixed that harness issue.
The temporary Metro fallback for `@vanilla-extract/css` was also kept outside
the repository.

The 100-row and 1,000-row runs each completed 25 mount/unmount cycles, six
post-unmount checkpoints and balanced all container and row cleanup counts.
Both runs reported six `performance.memory` readings with completed
`globalThis.gc` provenance and a single source. The captured summaries are:

| Rows | Retained bytes | Slope bytes/cycle | p95 delta | Admission |
| ---: | ---: | ---: | ---: | --- |
| 100 | 1,603,944 | 59,634.01 | 1,643,576 | diagnostic only |
| 1,000 | 8,052,824 | 230,125.03 | 8,052,824 | diagnostic only |

These numbers do not qualify retained memory. No approved M1.8 budget was
applied, and this target is a simulator rather than a physical release device.
The run also did not measure JS/UI frame time or native allocation bytes. The
performance registry therefore remains fail-closed. `budgets:validate` passed;
`budgets:readiness` correctly exited 1 with the existing pending frame,
allocation and retained-memory thresholds.

Evidence: [build receipt](../evidence/2026-09-21-m4-6-ios-release/build.json),
[100-row receipt](../evidence/2026-09-21-m4-6-ios-release/memory-100.json),
[1,000-row receipt](../evidence/2026-09-21-m4-6-ios-release/memory-1000.json),
and [qualification record](../evidence/2026-09-21-m4-6-ios-release/qualification.json).

M4.6 remains unchecked. The next bounded slice is to review the runtime-byte and
editor-instantiation regressions, settle the native probe and approved budget
contract, then collect physical-device frame/allocation and retained-memory
evidence. Android remains the final parked platform move.
