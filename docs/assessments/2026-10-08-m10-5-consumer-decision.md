# M10.5 consumer performance decision

Date: 2026-10-08. Approved scope: one bounded, non-shipping consumer diagnostic, capped at one working day.

## Decision

**Park speculative runtime rewrites.** The fresh release-Hermes probe exposes small synchronous styling costs and an extra theme-change commit, but does not identify a consumer problem that justifies another broad remediation attempt. This is an investment decision, not a claim that Crumbs has no overhead or that performance qualification is complete.

Withdraw the selective public-function/method name-preservation spike proposed after the expanded-runtime rejection. Keep the public API, dependencies, current budget registry and active release gate unchanged. M10.5 remains open with the existing host failures; this assessment does not waive them.

**Next M10.5 decision:** explicitly review whether the current host import budgets should remain release-blocking for this mobile styling library. Any revised metric, threshold, runner scope or enforcement must be proposed and approved separately, with a consumer rationale. The present probe does not authorise a policy revision or establish replacement limits. Physical-device and spoken-reader acceptance remain deferred.

## Fresh evidence

The [small retained packet](../evidence/2026-10-08-m10-5-consumer-decision/README.md) contains 15 retained fresh-process launches: plain React Native, Crumbs theme/core, and compatibility theme, five launches each. Three successful warm-ups are excluded. Variant order rotates between rounds. All receipts report production mode, Hermes, iOS, React 19.2.3 and React Native 0.85.3. Expo exports used 56.0.23.

The fixture mirrors the existing playground list workload: one stable-module styling hook per list, 100 and 1,000 requested rows, five mount/rerender/theme-switch/unmount cycles per size, 250 ms dwell, and FlatList settings 10/10/5. It uses two token-bearing style objects. This is a deliberately small workload, not a large enterprise theme or recipe/conditions stress test.

All values below are milliseconds. Startup, import and first-call values are medians of five retained launches. Repeated-action values are medians of five per-launch medians. Theme-switch styling totals include both committed calls.

| Metric | Plain | Core | Compatibility |
| --- | ---: | ---: | ---: |
| JS entry to first positive-size root layout | 20.306 | 20.804 | 20.995 |
| Timed entrypoint require after common Expo/RN imports | 0.000 | 0.033 | 0.065 |
| First styling call / plain style selection | 0.0002 | 0.0263 | 0.0282 |
| Styling call total per mount step | 0.0010 | 0.0457 | 0.0454 |
| Styling call total per stable rerender step | 0.0023 | 0.0355 | 0.0373 |
| Styling call total per theme-switch step | 0.0008 | 0.0522 | 0.0525 |

Paired within-round startup deltas versus plain are positive in this cohort: core median +0.465 ms (range +0.368 to +0.975), compatibility +0.813 ms (+0.320 to +0.993). These are observed differences, not an isolated causal attribution to the library. Five repeats in one Simulator cohort do not establish a portable startup regression or a numerical acceptance target. The [earlier B/C/D mobile study](2026-10-06-m10-5-mobile-target-calibration.md), on a different frozen source and fixture, showed sign-changing launch deltas; do not pool the studies or present that older study as current qualification.

Fresh Hermes bundle sizes are 1,257,852 B plain, 1,307,612 B core and 1,384,900 B compatibility: whole-bundle contributions of 49,760 and 127,048 B respectively. These are artifact sizes, not measurements of allocation or execution cost. Core remains the smaller consumer entrypoint; no API/import migration is included here.

## Behaviour and attribution

Every retained launch completed all 40 steps, returned correct final light/dark colours and stable rerender references, and balanced 310 row mounts with 310 unmounts. Virtualisation means requested data size is not mounted row count. The hook sits outside rows, so this probe cannot establish the cost of one hook per row or a full unvirtualised list.

Both Crumbs variants recorded two list commits for each theme switch: one retaining the prior light styles, then one with changed dark styles. Plain recorded one. This matches `useThemeStore` updating its external-store snapshot in a layout effect. The extra commit is a concrete future profiling hypothesis; it does not prove a visible flash, missed frame or user-perceived latency. Do not change store semantics solely to remove it without concurrent-rendering and selector-isolation evidence.

Parent request-to-layout-effect medians were roughly 4–7 ms for mount/rerender/theme-switch across variants. That timer observes the parent commit and does not include final themed readiness. It cannot be interpreted as React CPU, a theme-switch speed advantage, paint, frame rate or end-to-end interaction latency. Timed styling calls include hook overhead and timer perturbation; plain performs direct selection, so the comparison measures the cost of these consumer paths rather than an equivalent hook implementation.

## Environment and limits

The probe reused copies of one retained iOS release shell, replacing each copy's embedded bundle with fresh Metro-produced Hermes bytecode and assigning temporary app IDs. All copies retained the identical native executable hash. This controlled embedding avoids rebuilding native projects; it is not an ordinary distribution-build or native integration qualification.

The owned Crumbs M105 Expo Consumer Simulator (`61DFB462-1FBF-4632-8302-1DD067E15D57`, iOS 26.5) was used. Android's retained emulator was offline and was not reset or measured. Physical hardware, thermal behaviour, frames, scroll performance, retained memory, accessibility and complex design-system workloads remain outside this diagnostic. No claim of best-in-class performance follows from it.

The first scratch fixture used invalid `--probe-` token names. Crumbs correctly rejected that warm-up; it and the preceding plain warm-up are retained separately as rejected fixture evidence and excluded from all results. Corrected fixtures use `--crumbs-probe-` names. There were no collection failures in the corrected 18-launch set.

The frozen shipping source digest remained `8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76` across 694 files. All 149 copied package artifacts matched current built artifacts; source maps identify only built Crumbs modules and one React root. Temporary app IDs were removed; the existing playground and original release shell were preserved. The primary checkout's three dirty files were untouched. No production implementation, baseline, target or release-gate change was made.
