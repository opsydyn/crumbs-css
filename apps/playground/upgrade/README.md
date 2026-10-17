# Expo SDK compatibility profile (M1.9b)

This nested configuration is outside the root `apps/*` workspace. Both internal apps default to Expo 58/RN 0.88. Retained installed profiles cover SDK 56/RN 0.85 and SDK 57/RN 0.86. The candidate runner deliberately keeps SDK 57 as its default; use `--sdk=58` explicitly for the new line. SDK 58 pins Expo 58.0.14, React/DOM 19.3.1, RN 0.88.0 and TypeScript6.0.3, with Node `^22.13.0 || ^24.3.0 || ^26.0.0 || >=27.0.0`. Existing SDK 56/57 staging keeps its prior Node>=22.13.0 range.

The 2026-10-10 profile pins Expo 57.0.27, React / React DOM / react-test-renderer 19.2.8, React Native 0.86.3 and TypeScript 6.0.3. The official blank template 57.0.29 uses React 19.2.3; current Expo CLI/router optional peers require 19.2.8. The runner permits compatible React patches within the template's major/minor and exact SDK/RN pins. It uses strict npm peers, with no force or legacy-peer overrides.

```sh
# Check against live npm latest and official template metadata.
bun run playground:sdk-candidate /tmp/crumbs-sdk-57/qualification.json
# Repeat the committed profile in CI after npm latest moves.
bun run playground:sdk-candidate --pinned /tmp/crumbs-sdk-57/qualification.json
# Qualify the exact already-built release tarball; no rebuild or repack.
bun run playground:sdk-candidate --pinned --tarball /tmp/crumbs.tgz /tmp/crumbs-sdk-57/qualification.json
```

A passing supported profile requires strict resolution and install, complete installed package inventory and byte identity, consumer typechecking, motion renderer/import-order and peer-free ESM/CommonJS probes, production iOS/Android/web exports, and ordinary runtime source maps free of compiler/Effect dependencies. The app's explicit runtime factory imports remain inside the staged consumer. Logs and receipt survive success/failure; the runner removes its owned install/cache/artifact staging directory.

Use a separate output directory per run. A dirty-source receipt is diagnostic; clean CI and exact release-tarball checks establish their own qualification identities. Physical-device, spoken-reader and performance acceptance are not inferred from these checks. SDK 57 requires Node 22.13.0 or newer.

M1.9a's earlier peer-block receipt remains historical evidence for the original `>=0.85 <0.86` contract. The new `>=0.85 <0.87` range admits only the two tested React Native lines. Refresh exact pins and evidence before broadening support again.

## SDK 58 checks

```sh
bun run playground:sdk-candidate --sdk=58 --pinned /tmp/crumbs-sdk-58/qualification.json
bun run playground:sdk-candidate --sdk=58 --pinned --tarball /tmp/crumbs.tgz /tmp/crumbs-sdk-58/qualification.json
```

The native peer union is `>=0.85 <0.87 || >=0.88 <0.89`; RN 0.87 remains unqualified. SDK 58's Babel control and optional genuine Expo Rust worker are qualified separately, including actual eligible-file completions and explicit per-file Babel fallbacks. See the current app/native packet and release status for source, native and publication boundaries. Historical M1.9b rows above retain their original scope.
