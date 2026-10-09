# M11.3 native motion — implementation qualification

Status: complete in the implementation commit containing this record. One fresh whole-slice review and its single Important repair pass are complete. Functional acceptance covers the exact recorded development artifact; releasePolicyQualified remains false.

Two additive independent entries expose `defineMotion` through `/theme/motion` and `useNativeMotion` through `/theme/motion/native`. Immutable closed v1 definitions and inferred state names feed a finite reducer, an instance owner and public Animated operations committed through React layout effects. Existing public exports/aliases retain their meanings. No product dependency, lock, package version, compiler payload, global provider, frame listener or theme-resolution-per-frame change.

## Accepted cohort and verification

- Source digest: `63d07cf36deec3352f05636f60d3f300a5ad6f749bc8e3613c1b5ea465e00f79`.
- Permanent packed artifact SHA256: `b99a6ae51e6faeeed20b164828558cde417579df96aaf2e66fe4afab5d960f5a`.
- [Host receipt](../evidence/2026-10-09-m11-3-native-motion/host/qualification.json): frozen reproduction, installed exact types, old value/alias/denial controls, twelve real React/synthetic RN tests with actual ESM→CJS and CJS→ESM initial load sequences, four genuine Node22/current ESM/CJS pure processes consuming two package copies, and three real Expo exports. Native acceptance uses the separately installed packed React19.2.3/RN0.85.3/Expo56.0.4 cohort; its Metro resolves0.87.1.
- [Native receipt](../evidence/2026-10-09-m11-3-native-motion/native-attempt-17/qualification.json): all28 iOS and27 Android phases,311 command records, real native reduced-motion settings/events, rendered intermediate/endpoint pixels, stable terminal samples, cancellation/replacement/lifetime checks and restored preferences/mapping/Metro. Eight cancellation/stale-cancel/reduced/remount images were directly inspected.
- [Final integrity](../evidence/2026-10-09-m11-3-native-motion/final-integrity.json):839 source/artifact/input/command/image/raw/bundle/map/cleanup bindings. Scoped external cleanup separately stops only owned qemu/idb/socket and Simulator; protected/unrelated targets remain untouched.
- Full suite:1,732 CSS tests and28 Storybook tests pass; one existing optional exact-floor skip remains separate from the genuine packed Node22 proof. Strict CSS/playground/Storybook types and the final package build pass.
- Byte-identical docs source/config builds31 pages inside the frozen owned installation. The linked-worktree Astro command remains unqualified because external dependency symlinks break virtual-style metadata; both logs are retained.
- Original five dependency roots are restored by the audited ownership records. Root lock SHA remains `61543a5d560ebdcb4ca5ce565ef650c76589c8ad38d972034812b3cab72b87bd`.

## Review repairs and costs

The one fresh reviewer found two Important issues, no Critical issues and no Minors. The native stop callback previously corrected a value after reporting success and could throw outside owner handling. A required correction now waits for the public stop acknowledgement and runs under owner authority/error handling before success. Delayed failures fail the associated retained run, invalidate reached-state knowledge and attempt every cleanup channel. Synchronous imperative set failures still throw the bounded diagnostic. Stop/read-only cleanup keeps prompt settlement. Repeated pending commands retain at most two settlements and one hardware acknowledgement per channel; old epochs cannot write. The isolated public-peer regression reproduces premature success RED and passes success/fault/retirement/coalescing/Strict lifecycle GREEN.

The purported CJS-first test previously imported ESM first. Its loader now selects the actual sequence before any native-entry import, and export assertions share that loader. The observed CJS-first trace reproduces RED and the two fresh installed processes pass GREEN. Both repairs are followed by the complete green suite and this fresh exact host/native cohort; there is no second review.

Diagnostic concatenated graphs exclude public peer bytes: pure ESM7,700B raw/2,450B gzip, CJS7,785B/2,491B; native ESM27,484B/7,049B, CJS27,700B/7,092B. Existing affected JavaScript graphs add407–428B raw/103–126B gzip from the bounded diagnostics;18 old graphs have zero delta. Metadata adds350B/33B. Full55 graph rows and20 independent cold pure-entry processes are retained. Two separate source-owner benchmark processes pass eight1/6-channel rows each, including100 pending-target coalescings and10,000 completed/cancelled cycles, with zero retained work after drain. These are diagnostic host results, not native FPS.

## Host-budget and release boundary

The unchanged matched collector runs once for the reviewer-repaired source/artifact: all21 environment/measurement rows are exact; source/artifacts/policy remain stable. Ten blocking metrics pass; only the existing warm-transform metric fails at9.219709ms. Cold transform75.426750ms, editor TypeScript599.885708ms and incremental135.575042ms pass their unchanged caps. Two advisory metrics pass and eight fail, with zero incomplete rows. releasePolicyQualified remains false.

The pre-review valid failed report remains in `pre-review-cohort-15/host-budgets`: cold127.872042ms, editor TypeScript1072.942ms and warm19.661542ms failed. Its candidate bytes were superseded by required review repairs. The fresh exact final report resolves cold/editor gating for this artifact; the earlier requested deferral is superseded, without assuming user approval, changing policy or attributing the numerical improvement to the repair. No collection is repeated to chase a pass. Earlier M11.2 incremental failures and the existing warm blocker remain retained in M10.5 release closure.

The collector uses the verified baseline Expo56.0.4/Metro0.84.4/React19.2.5 via an owned temporary read-only dependency overlay, separately from native qualification. Fourteen selected hashes remain unchanged and the temporary link is restored. Mismatched and pre-measurement attempts remain explicitly failed/unqualified.

Physical devices, spoken screen readers, interactive browser acceptance, live authored-style HMR, release-Hermes/FPS and other peer/platform combinations are unperformed. Discrete captures and sampled commits do not quantify instantaneous frames or continuous trajectories. No push, tag or publication. Next: **M11.4 — richer token algebra**.
