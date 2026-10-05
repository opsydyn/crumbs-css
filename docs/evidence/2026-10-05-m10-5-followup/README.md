# M10.5 consolidated follow-up evidence

This archive qualifies per-capture receipt IO deduplication and token/tooling build-group minification against source content `44d199d915f965cfcab53377cfeaa4a8688c8fe8df700ff74ac4d35aeb889c25`, based on local main `c5278d2`. Documentation changes and the final commit do not change that identity. The previous completion archive is historical after this follow-up.

Run from the repository root:

```sh
bun docs/evidence/2026-10-05-m10-5-followup/verify.ts
bun docs/evidence/2026-10-05-m10-5-followup/verify.ts tamper
```

The verifier reuses the existing shipping/packed/host/native inventory checks, validates the full evidence manifest and original native source/artifact continuity, and checks retained positive preference/restoration logs. Negative controls replace collection identity, truncate graph/frame inventories and remove restoration proof even after rehashing the manifest. This is evidence consistency verification, not rerunning a device.

Native replay used an isolated iPhone 17 / iOS 26.4 and owned Android API 36 ARM emulator. Maestro direct Android host/port bypassed unrelated offline transport discovery; localhost Metro routing used an owned ADB reverse removed afterwards. All temporary accessibility preferences were restored; owned processes and temporary simulator were cleaned up. Failed first UI attempts are retained, with corrected passes separate. The Android reference/direction flow later failed a motion tap below the viewport; its successful subset is qualified explicitly, with motion separately verified by corrected visible-control flows.

`native/context-qualification.json` records coverage and harness limitations. Full Storybook controls warn about missing `queueMicrotask`; they are not qualified. Spoken VoiceOver/TalkBack and exhaustive variant coverage remain unperformed; all physical-device work is deferred. Unchanged frames and CSS probe restoration do not establish animation-state retention or broad visual equivalence.

Host results remain 11 pass / 9 fail / 1 incompatible environment, with all five legacy smoke runs passing. Both token graph budgets now pass; four theme initialisation, four theme graph-size and warm transform limits remain failed. Ceilings and baselines were not changed. M10.5 is not performance-qualified.
