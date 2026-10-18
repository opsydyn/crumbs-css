# M9.3a qualification closure

Continuation of implementation commit `3a795b4`. This packet separates the
remaining native checks from the [original implementation evidence](../2026-10-18-m9-3a-native-devtools/README.md).
No release, push or version bump is included.

## Native replay

SDK58 Expo Go 58.0.4 on the owned Android 16 emulator. The fresh read-only emulator
has 8 GB available internally. ADB reverse routes Metro8095/8096 to emulator
loopback; an isolated ADB5038 server/temporary IPv6 relay keeps Maestro 2.11 away
from an unrelated offline transport. No shared ADB reset or saved AVD deletion.

Storybook now reaches the actual widget. The first current run passed the action
assertions but its launcher tap did not open the panel; a separate direct tap
succeeded. Recipes now assert panel opening, with one conditional retry only
while still closed. This is a bounded harness accommodation, not proof of the
underlying tap-loss cause or a production widget change. Variant assertions use
the resolved JSON rather than scanning the full, long provenance list.

[Eleven passing Android replay receipts](native-replays.json) now cover Storybook's
main journey, both apps' causes and theme/variant updates, plus edit, restore and
back/reopen in each app. All original fixture files were restored. Earlier iOS
main/Fast Refresh evidence remains in the original packet. The one native focus
guard change below is also exercised by the native cost screen on both platforms.

## Native cost protocol

The committed `scripts/fixtures/m9-3a-native-cost.tsx` is a qualification-only
screen, temporarily copied into each SDK58 app. It mounts the **same source
provider, hook, registry, capture function and React Native widget**, with the
app's real compiled override fixture. It does not claim to measure an npm
release build or whole-application production performance.

- Disabled and mounted/closed each commit 100 target updates after mount. Both
  mount the provider/context; disabled switches off the probe and widget. This
  is not a comparison against an app with every tooling component removed.
- Count target renders, every getter call, every explanation call, admitted
  targets and retained reports. A temporary observer at the actual capture
  function counts explanations from the widget as well as the test controller.
- Twenty explicit captures use the registered getter and explanation function;
  each must independently resolve opacity 0.8 overriding 0.4. The widget renders
  the resulting report through its normal subscription. Capture calls are driven
  by the test controller; touch interaction is qualified separately by Maestro.
- Unmount each provider; wait for native frame/cleanup turns; assert no registry
  targets or reports remain. This checks registry-held references, not a JS heap
  graph or process-memory leak test.
- Record raw explanation durations and 100-update elapsed times using native
  Hermes `performance.now()`. Development/host noise and frame scheduling are
  included. No budget, speedup, causal overhead ratio or release frame/memory
  claim is derived from these single diagnostic runs.

Reproduce on an owned checkout, with package artifacts already built, SDK58
Metro8095/8096 available, and the actual target devices explicitly selected:

```sh
python3 scripts/m9-3a-native-cost-host.py stage --out /tmp/crumbs-cost-stage --run-id YOUR_RUN
python3 scripts/m9-3a-native-cost-host.py serve --out /tmp/crumbs-cost-results --run-id YOUR_RUN
# Android: reverse8095,8096,8099 on the explicitly owned emulator.
# Open each app URL on iOS and Android; wait for "Native cost passed".
bun scripts/m9-3a-native-cost-verify.ts /tmp/crumbs-cost-results YOUR_RUN
python3 scripts/m9-3a-native-cost-host.py restore --out /tmp/crumbs-cost-stage
```

Use a fresh staging output directory for each run: a successful restore retains
its audit manifest, so restaging into that directory is intentionally refused.
The current refusal message still says to restore even after restoration; this
minor diagnostic issue is deferred.

Do not build/package/commit while staged. The staging manifest records original
and instrumented digests. Restoration refuses to overwrite concurrent edits and
restores the original entry/capture bytes before deleting generated screens.
The receipt verifier rejects wrong run/platform identities, missing counts,
closed inspection work, target-parent rerenders and retained references.

## Documentation screenshots

The explanation guide now contains actual iOS override and Android recipe
screenshots with coverage-specific captions and alt text. They are unchanged
captures from the original accepted native runs, not generated illustrations.
Image URLs respect the docs deployment base. [Rendered gallery](docs-gallery.png)
was inspected in the browser through Astro preview with `/crumbs-css` routing.

Physical devices, spoken screen readers and independent usability testing remain
deferred; this continuation does not convert them into native emulator evidence.

## Native results

All four [native cost runs](native-cost/matrix.json) passed, with independently
recorded UI success receipts. Each run had 101 parent renders for 100 disabled and
closed updates, zero getters/explanations while closed,20 getters/explanations
for 20 captures, zero inspector-caused target-parent renders, one target/report
while active and zero retained targets/reports after unmount.

| App / platform | Disabled 100 updates | Closed 100 updates | Explanation median / max |
| --- | ---: | ---: | ---: |
| Playground / iOS 26.5 | 1638.24 ms | 1659.42 ms | 2.11 / 19.61 ms |
| Playground / Android 16 | 1711.83 ms | 1701.40 ms | 2.40 / 32.71 ms |
| Storybook / iOS 26.5 | 1641.59 ms | 1661.34 ms | 1.19 / 18.83 ms |
| Storybook / Android 16 | 1659.74 ms | 1653.18 ms | 1.21 / 23.07 ms |

Updates await native frame callbacks, so these elapsed times are largely frame
pacing. Twenty capture samples include initial warmup. Do not interpret the
small differences as causal overhead or the medians as a release performance
budget. The source screen uses React Native 0.88 and Hermes in SDK58 Expo Go.
An automatic Fast Refresh run could occur when staging; accepted per-platform
receipts are the final runs with matching explicit Maestro success receipts.

## SDK58 focus guard

Checking against the installed SDK58 native declarations found that
`findNodeHandle` can return `undefined`. The helper previously excluded only
`null`. A native-platform test reproduced an invalid undefined focus request
(RED); the helper now forwards only a numeric handle. The test checks both
missing-handle cases and a valid handle (GREEN), and the strict native typecheck
passes. `tsconfig.native-devtools-qualification.json` retains that extra check.
Reproduce the strict SDK58 check with:

```sh
bunx --no-install tsc -p packages/css/tsconfig.native-devtools-qualification.json
```

No public API or supported peer range changed.

The full [execution decision record](execution-decisions.md) preserves the historical
rulings, their costs if wrong and the approved closure.

## Review and evidence boundaries

The closure review found no critical or important defects. Its one minor finding
is the staging-directory diagnostic documented above; no further implementation
change was made for it. The review verified native receipt identities/digests,
restoration, the focus regression, strict SDK58 types and the screenshot guide.

The following judgments are retained explicitly:

- Native cost evidence is source instrumentation, not exact packed-artifact timing.
  The final packed matrix independently verifies package types and bundle isolation.
- Functional Android replays preceded the numeric focus guard. Native source cost
  runs on both platforms and the RED/GREEN regression exercise that guard; the
  functional replay receipts are not relabelled as the final package.
- Disabled still mounts the provider/context. Counts establish the requested
  closed/captured/retained-reference behavior, not whole-app causal overhead.
- A conditional launcher retry establishes a completed journey; it does not diagnose
  why the initial tap was discarded.
- Functional diagnosis remains implementing-agent dogfooding with known expected
  answers. Independent usability, raw-report/widget timing superiority, physical
  accessibility, release frame budgets and heap-leak freedom are not established.

## Disposition

M9.3a's required functional/native-cost qualification is complete. The fresh
package matrix and final review are recorded in [qualification.json](qualification.json). Physical
acceptance, spoken screen readers, independent usability and release frame/heap
benchmarks remain outside this closure. No speedup or final-host-style claim is
made. The new widget remains a source-build/next-release API.

Next recommended slice: **M9.3a release preparation**—choose the additive version,
prepare release notes and run the existing release workflow against its exact
artifact. This outcome authorizes no push or publication and changes no M10.5 gate.

Final verification: 1,931 library tests passed (one existing Node-floor skip),
34 Storybook tests and five qualification/regression tests passed. Fresh packed
Babel/Rust checks cover all six development/production platform cohorts each,
with identical tarball SHA-256 `3e27843f07c5dfdddb170e46c49f00aef105896f81525484716cb20e8cb6ba54`.
Both Storybook worker exports/production graphs, Playground types, strict SDK58
native types and the 34-page docs build passed. Owned emulator, isolated ADB
relay/server and temporary preview/Metro servers were stopped; no saved device
data or unrelated processes were removed.
