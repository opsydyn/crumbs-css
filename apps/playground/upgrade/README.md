# Expo SDK upgrade candidate

This nested configuration is outside the root `apps/*` workspace. It records the newest stable Expo stack observed from npm and is used only by `bun run playground:sdk-candidate`. The runner verifies the live `latest` and official blank-template metadata, packs the current Crumbs working tree, and asks npm to resolve that tarball against the candidate.

The 2026-09-15 candidate is Expo 57.0.22 / React Native 0.86.3. Its expected result is an npm peer-dependency block because the supported Crumbs range remains React Native `>=0.85 <0.86`. A matching block proves the upgrade is isolated and support was not broadened; it does not qualify Expo 57. When Expo publishes a new stable line, refresh the exact configuration and evidence together. When Crumbs intentionally supports the candidate React Native line, change the expected outcome and extend the runner to require typechecking and all-platform export before updating compatibility documentation.

Pass an output path to retain the machine-readable receipt:

```sh
bun run playground:sdk-candidate docs/evidence/YYYY-MM-DD-expo-sdk-candidate/qualification.json
```
