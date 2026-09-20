# M2.7 dependency-aware Metro invalidation

M2.7 adds the compiler and Metro boundaries needed to invalidate baked native style modules when a project-authored dependency changes. The compiler records the resolved dependency inputs once, hashes their current source, and emits a private identity marker. Metro cache stores retain ordinary hits but return a miss when a recorded dependency hash no longer matches.

## Dependency boundary

The analysis includes project-authored plain modules, nested `.css.ts` modules and workspace sources. It excludes the entry file, `node_modules`, generated `dist` output and the Crumbs compiler bundle. Inputs are real-path resolved, deduplicated and sorted. The identity includes the compiler key, platform, dev mode, strict diagnostics, stylesheet mode, ident option and dependency hashes.

The transform result carries private cache metadata for the Metro adapter. `withNativeStyles` wraps configured Metro cache stores and keeps the existing public transform output unchanged. No persistent cache format or userland Effect requirement is introduced.

## Qualification

The focused dependency-analysis, emission, transformer, cache-store and evidence-admission tests pass. The cache-store contract returns a hit for unchanged inputs and a miss after a dependency edit; transform output changes after a plain dependency edit; and the evidence admission tests cover plain-token, nested and workspace fixture receipts.

The real Expo/Metro measurement was attempted with a cleared server and the three dependency families. On this host, Metro's live graph did not observe the dependency-only edit during the measurement window, so the required baked-value receipt was rejected rather than treating stale output as success. M2.7 therefore remains open until the live gate is rerun on a host where the Metro watcher delivers the dependency event. The failed run produced no qualification artifact and all fixtures were restored by the runner.

## Boundaries

This slice does not add persistent caching, runtime token resolution, atomic utilities, a public metadata API, native-device acceptance or Android qualification. Direct compiler and cache contracts are qualified independently from the pending live Metro gate.
