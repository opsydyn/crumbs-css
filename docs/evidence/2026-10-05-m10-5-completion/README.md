# M10.5 consolidated evidence

One approved engineering and qualification slice, one commit. Android emulator work is included; all physical-device work is deferred. The archive does not establish release, publication, exhaustive native coverage or overall performance qualification.

## Replay

From the repository root:

```sh
bun scripts/m10-5-completion-evidence.ts verify
bun scripts/m10-5-completion-evidence.ts tamper-check
bun run guarantees:check
```

The verifier checks complete source-content identity, archive inventory/hashes, collection-time source continuity, production artifact continuity, the complete native static runtime graph, raw-to-summary Metro parity and unchanged-frame PNG hashes. Tamper controls reject both changed bytes and rehashed incomplete inventories. This detects drift and incomplete evidence; it is not an attestation against an author who fabricates all source and receipts.

Source identity includes tracked files outside `docs/` and new authored files in the six app/compiler/tool/test roots. Stage new files outside those roots before collecting. Replay after the final commit checks the committed inventory. Legacy matrix records without a content digest retain exact source-revision rules.

## Collection and scope

- `metro/`: copied shipping transformer through normal watched Expo CLI, disk cache enabled, iOS non-development bundle. Sixteen successful bundles match complete fresh-reference results; the seventeenth row is an expected syntax error. This is host correctness evidence.
- `packed-consumer/`: independently installed packages and iOS/Android/web export provenance, compatibility/migration, theme snapshots and second-brand journeys. Its selected-file receipts record collection-time documentation; the complete digest binds executable sources across the final documentation commit.
- `host-budgets/`: serial exact Node 22.0.0/current Node 24.15.0 reports, five smoke repetitions, editor measurements, unchanged production artifact inventory and unchanged complete source identity. `comparison.json` reports every approved-limit failure and environment-incompatible metric. Threshold review and diagnostics remain separate.
- `native/`: iPhone 17/iOS 26.4 simulator and API 36 ARM emulator running Expo Go SDK 56. Source files and seven complete static runtime entry graphs match their original collection inventory. Later tooling-only changes do not manufacture native requalification.
- `checks/`: retained regression, typecheck, production build, budget-registry and focused tooling logs. `aborted-host-smoke.log` retains an earlier failed smoke measurement, rather than hiding the failed attempt.

Native captures include light/dark and selected-action journeys, direction restoration, font scaling and supported contrast contexts. Android reports reduced motion from the installed adapter's transition-animation setting. ADB replay uses observed UI bounds; it is not a successful Android Maestro run. Both platforms show authored CSS edit/restore without a reload command. iOS local animation state reset during refresh; `native/hmr-final/screenshot-diff.json` retains that failed edit/restore comparison. Independent unchanged-frame repeatability is separately successful on both platforms.

Spoken VoiceOver/TalkBack, iOS reduced-motion switching and exhaustive variant screenshots remain unperformed. Physical rendering, release Hermes performance, frame budgets, allocation and retained memory gates are deferred. Worker process absence does not establish explicit retained-context disposal or memory qualification.

## Recollection

Run collection windows serially against a frozen source and production build:

```sh
bun packages/css/bench/context-reuse/graph-chain-diagnosis.ts /private/tmp/crumbs-owned-empty-root --watch --shipping
CRUMBS_NORTHSTAR_OUTPUT=docs/evidence/owned-packed-output bun run northstar:qualify
CRUMBS_AUDIT_NODE_FLOOR=/absolute/path/to/node-v22.0.0 bun scripts/measure-current-host-budgets.ts /private/tmp/crumbs-owned-host-output
```

Do not run builds, package packing, tests that prepack, or consumer typecheck rebuilds alongside Metro/native or host measurement. Preserve failed reports. Restore native preferences and authored files, shut down owned processes, update the matrix, then freeze and replay the final archive. Frozen evidence reflects observed results; failing ceilings must be resolved or left explicitly failed. Raw process logs preserve their emitted whitespace; source and authored documentation pass whitespace checks separately.
