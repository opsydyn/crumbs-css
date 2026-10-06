# M10.5 packed Expo/Hermes consumer evidence

The complete six-cell software-device study has five retained cold-process launches and one excluded warm-up per cell. Structural completeness is not a performance-budget pass. The timing boundary is JavaScript entry to the first positive-size root onLayout callback, excluding native startup, bundle prelude, frame presentation and receipt transport. Physical-device work remains deferred.

The authoritative local artifact archive is `/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/.superpowers/artifacts/m105-expo-hermes-20261006-h`. It retains exact packed package, staged fixtures/locks, JavaScript/maps/Hermes, release apps/APKs, generated native projects and command stdout/stderr/exit records. [proof-inventory.json](proof-inventory.json) hashes required inputs, command proof and raw transport; [artifacts.json](artifacts.json) hashes native binaries and exact matching embedded/exported bytecode. Binary and map files remain local, not committed; preserve this archive before deleting or archiving the worktree. Missing or changed files invalidate report admission.

The source digest is `c8ad650a919c98ebe6a9f5ae26eabe5af95d1d8307908e981e3b68e190518ff8`, preparation revision `90895610029c3fa9b95043b7a47133efa4d6cd82`, study `1cd1bcbe-77e6-4b99-8ed7-129faf21cebc`. Initial revision has uncommitted harness changes; exact harness files are retained in [harness-source.tar.gz](harness-source.tar.gz), with actual inputs and package identity in [study.json](study.json). [dependency-graphs.json](dependency-graphs.json) proves shared package/version/integrity/resolved-edge equality and records the permitted Crumbs-only closure. Physical hoisting is normalized; Metro is explicitly pinned to 0.84.4 in every fixture.

[attempts.jsonl](attempts.jsonl) retains excluded warm-ups, every native attempt, identities and timings; [collector.jsonl](collector.jsonl) retains actual HTTP receipt bodies. Public launch logs redact the single-use authentication token. The scope ledger and cleanup receipt prove owned app/mapping cleanup; device creation/restart/transfer receipts remain in the local ownership directory. The protected Simulator was not operated.

## Reproduction

Use this committed harness and unchanged production source. Set `ANDROID_HOME=/private/tmp/crumbs-m105-native/sdk` and `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home` on this host. Preparation needs an absolute new archive and at least 8 GiB free; collection checks 6 GiB and each release build checks 3 GiB. These checks do not reserve space against other processes. Dedicated software devices require recorded creation/ownership and explicit selectors; no physical device, generic booted target or protected UUID is accepted.

```sh
bun run measure:expo-consumer-runtime prepare --archive /absolute/new/archive
bun run measure:expo-consumer-runtime collect --archive /absolute/new/archive --ios-uuid OWNED_UUID --android-serial emulator-PORT
bun run measure:expo-consumer-runtime report --archive /Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css/.superpowers/artifacts/m105-expo-hermes-20261006-h
```

A new source, bundle or native binary requires new preparation and fresh samples. Native builds intentionally embed the measured production Expo-exported Hermes bytes. This qualifies the controlled embedding workflow, not every consumer bundling configuration. Generated iOS apps are unsigned Simulator Release products; disposable Android Release APKs use the generated debug signing configuration. This is not distribution-signing qualification. Expo prebuild emitted recommendation warnings for Expo 57/React Native 0.86; actual installed/locked dependencies remained Expo 56.0.23/React Native 0.85.3 across all cells. No input hash was refreshed to waive native-generation differences.

The seven preceding incomplete cohorts are retained and summarized in [prior-cohorts.json](prior-cohorts.json). Cohort f's ENOSPC interrupted command/failure/cleanup writes before any timing sample. Its apps were subsequently cleaned with recorded recovery. Prior cohort g's first preflight stopped because the owned Simulator was shut down; it performed no native build or timing. The failed preflight/cleanup receipts and logs are retained; the unchanged preparation was retried after booting that exact device. The previous first iOS warm-up timed out at an OS Open-in-app URL confirmation. Native UI consent was resolved for the three owned schemes; separate diagnostic receipts were verified and excluded. Fresh cohort h samples start after that setup. No failed timing was replaced with zero.

## Results

| Platform | Variant | Retained attempts | Valid | Excluded warm-ups | Min ms | Median ms | Max ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ios | plain | 5 | 5 | 1 | 22.367 | 22.684 | 22.857 |
| ios | core | 5 | 5 | 1 | 22.456 | 22.795 | 22.885 |
| ios | compatibility | 5 | 5 | 1 | 22.476 | 23.112 | 23.537 |
| android | plain | 5 | 5 | 1 | 43.835 | 54.442 | 65.168 |
| android | core | 5 | 5 | 1 | 27.090 | 49.425 | 53.579 |
| android | compatibility | 5 | 5 | 1 | 39.046 | 47.866 | 52.420 |

| Platform | Variant vs plain | Median delta ms | Median ratio |
| --- | --- | ---: | ---: |
| ios | core | +0.111 | 1.005 |
| ios | compatibility | +0.428 | 1.019 |
| android | core | -5.017 | 0.908 |
| android | compatibility | -6.576 | 0.879 |

| Cell | JS bytes | Mapped Crumbs JS bytes | Unmapped JS bytes | Hermes bytes | Hermes delta vs plain |
| --- | ---: | ---: | ---: | ---: | ---: |
| ios/plain | 1021224 | 0 | 82654 | 1256940 | 0 |
| ios/core | 1055579 | 33860 | 82696 | 1307012 | 50072 |
| ios/compatibility | 1114623 | 92687 | 82904 | 1384328 | 127388 |
| android/plain | 1026207 | 0 | 83084 | 1260796 | 0 |
| android/core | 1060562 | 33860 | 83126 | 1311124 | 50328 |
| android/compatibility | 1119606 | 92687 | 83334 | 1388196 | 127400 |

Full JavaScript groups and source names are in [bundle-attribution.json](bundle-attribution.json). UTF-16 mapping columns are converted to UTF-8 byte spans, indexed boundaries reset attribution and CRLF separators are unmapped; group and unmapped totals conserve exact bundle bytes. Mapping ownership is attribution, not per-source causal execution cost. Hermes is only total bundle size/delta; no per-source Hermes attribution is claimed.

Existing host failures and Expo baseline mismatch remain unchanged. Next numbered slice: **M10.5 — consumer-evidence review and explicit performance-target policy decision**. The ADR remains proposed, M10.5 remains open, and no thresholds/baselines/public API/dependencies change in this measurement slice.

`supplemental-toolchain.json` distinguishes Bun’s Node compatibility field from the actual executable. Retained iOS Xcode environment files establish historical Node 24.15.0; npm 11.12.1 is a post-run observation only. H fingerprints are unchanged.
