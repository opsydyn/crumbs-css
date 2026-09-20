# M2.7 dependency-aware Metro invalidation

M2.7 adds the compiler and Metro boundaries needed to invalidate baked native style modules when a project-authored dependency changes. The compiler records the resolved dependency inputs once, hashes their current source, and emits a private identity marker. Metro cache stores retain ordinary hits but return a miss when a recorded dependency hash no longer matches.

## Dependency boundary

The analysis includes project-authored plain modules, nested `.css.ts` modules and workspace sources. It excludes the entry file, `node_modules`, generated `dist` output and the Crumbs compiler bundle. Inputs are real-path resolved, deduplicated and sorted. The identity includes the compiler key, platform, dev mode, strict diagnostics, stylesheet mode, ident option and dependency hashes.

The transform result carries private cache metadata for the Metro adapter. `withNativeStyles` wraps configured Metro cache stores and keeps the existing public transform output unchanged. The Metro adapter also scans live graph metadata before bundle requests, emits project-root-relative importer changes when a recorded input is stale, and decorates the private bundler transform result key so Metro commits the rebuilt importer even when its authored source hash is unchanged. No persistent cache format or userland Effect requirement is introduced.

## Qualification

The focused dependency-analysis, emission, transformer, cache-store and evidence-admission tests pass. The cache-store contract returns a hit for unchanged inputs and a miss after a dependency edit; transform output changes after a plain dependency edit; and the evidence admission tests cover plain-token, nested and workspace fixture receipts.

The real Expo/Metro measurement passed with a cleared server, Expo 56.0.4, Metro 0.84.4 and React Native 0.85.3. Plain-token, nested `.css.ts` and workspace-source edits each produced the new baked value and excluded the old value; the five retained direct edits also produced ordered new/old-absent receipts. The run used a canonical disposable package copy so the workspace control exercised real watched paths rather than a symlinked package topology. All fixture hashes were restored by the runner. The retained report is [metro-incremental.json](../evidence/2026-09-20-m2-7-dependency-invalidation/metro-incremental.json); the full qualification record is [qualification.json](../evidence/2026-09-20-m2-7-dependency-invalidation/qualification.json).

## Boundaries

This slice does not add persistent caching, runtime token resolution, atomic utilities, a public metadata API, native-device acceptance or Android qualification. The Metro adapter uses private 0.84-era server/bundler hooks and should be rechecked when the supported Expo/Metro matrix changes. M2.7 is closed for the recorded iOS development-bundle gate; platform/device acceptance remains separate.
