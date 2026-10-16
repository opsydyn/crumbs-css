# M1.10 — SDK 58 assessment receipts

Date: 2026-10-16. This is read-only discovery for the [assessment](../../assessments/2026-10-16-m1-10-expo58-assessment.md) and [plan](../../superpowers/plans/2026-10-16-m1-10-expo58-upgrade.md), not SDK 58 qualification.

- `registry-metadata.json`: exact public npm manifests for Expo 58.0.11, blank template 58.0.20, RN 0.88.0, @expo/metro 58.0.0 and @expo/metro-config 58.0.14. No installation occurred. Integrity fields identify published upstream packages; no upstream tarball verification is claimed.
- `checkout-snapshot.json`: source aaed07c, current app/library pins and hashes, Node/Bun/Xcode versions and locally resolved Metro. This task changes only assessment/planning documents. Existing untracked native/workflow data remains.
- `current-runner-probe.json`: unchanged helper rejects RN 0.88 through the declared peer range and does not recognise SDK 58 selection. Its older Node predicate accepts versions excluded by SDK 58; the new profile must enforce its own observed engines.
- `existing-contract-tests.log`: `bun test packages/css/test/playground-sdk-candidate.test.ts packages/css/test/expo-sdk-56-contract.test.ts` — 16 pass, 0 fail, 89 assertions. This tests current contracts, not SDK 58.
- `upstream-source-receipts.json` / `worker-source-receipts.json`: SHA-256 receipts and official URLs inspected for SDK 58 Metro default/upstream selection and supervising dispatch. Two guessed RN generated-type URLs returned 404; no RN 0.88 declaration compatibility is inferred from them. The actual strict-consumer typecheck remains in M1.10a. Full upstream source copies remain in temporary storage; use the linked official sources for review.

Additional primary references: [Expo changelog](https://expo.dev/changelog/sdk-58), [technical matrix](https://docs.expo.dev/versions/v58.0.0/), [RN strict types](https://reactnative.dev/docs/strict-typescript-api), [SDK 58 bundled modules](https://github.com/expo/expo/blob/800752bfaa06d46f724cfdd221da6c1fb8453087/packages/expo/bundledNativeModules.json), [Noxcturnal proposal](https://github.com/expo/expo/pull/48443).

No SDK 58 dependency install, compiler/export run, strict app typecheck, Metro invalidation run, native build, device check or performance measurement occurred. No support range or publication changed. Failure to establish those contexts is an explicit next-step boundary, not an implicit compatibility claim.
