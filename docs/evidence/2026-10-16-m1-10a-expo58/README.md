# M1.10a — Expo SDK 58 library qualification

Status: M1.10a complete locally; independent review fixes verified and included in this slice. This packet does not establish npm publication, native interaction acceptance or a performance pass.

The single candidate tarball SHA-256 is `91a6b47f9e5f1a93c05e952870bf0b2fe9687fbc738a92fbf88181957b668c6f`. Its development version label is still `1.1.1`; it is distinct from registry artifacts. [Pack metadata](artifact/pack.json) and [complete installed file inventory](artifact/installed-files.json) identify its bytes. The source inventory identifies qualification inputs. Final review requalification reuses each owned cohort, resolves strictly, then reinstalls from its lockfile; each SDK retains a separate lock/tarball integrity check.

## Installed consumers

| SDK | Expo | React / DOM / renderer | React Native | Strict npm, installed bytes, consumer types, motion and exports |
| --- | --- | --- | --- | --- |
| 56 | 56.0.4 | 19.2.8 | 0.85.3 | [Passed](sdk56-qualified/qualification.json) |
| 57 | 57.0.27 | 19.2.8 | 0.86.3 | [Passed](sdk57-qualified/qualification.json) |
| 58 | 58.0.11 | 19.3.1 | 0.88.0 | [Passed](sdk58-qualified/qualification.json) |

Every row checks the same tarball, actual installed package files, both motion module orders, peer-free motion, iOS/Android/web exports and runtime source inventories. Node is 24.15.0 and Bun is 1.4.2. No forced or legacy peer resolution is used. The proposed candidate peer range is `>=0.85 <0.87 || >=0.88 <0.89`; RN 0.87 remains unqualified. The [unchanged original artifact](original-peer-block/qualification.json) reproduces its expected RN 0.88 [strict-peer rejection](original-peer-block/npm-resolution.log.gz).

Fresh npm resolution of the old SDK cohorts now selects incompatible newer optional Router/server/Worklets packages unless matching peers are explicit. The retained 56/57 profiles constrain those optional peers. SDK 56 preserves Expo/RN and moves React only within its 19.2 patch line. SDK 58 uses the matching 19.3.1 patch to satisfy its current server peer. These are installed qualification profiles; checked-in app manifests remain SDK 57. The final review requalification receipts bind each SDK to the corrected candidate.

## Genuine Rust interoperability

[Full routing receipt](routing/qualification.json), [summary](summary.json) and compressed raw worker events retain actual backend evidence. App-owned Metro is 0.87.1, using Expo's worker and the installed Crumbs transformer. Expo's default Babel-transformer identity and Rust eligibility checks remain intact. There is no new Rust binary dependency or production Metro adapter.

- Babel control: zero Rust completions; eight live mutations pass.
- Rust cohort: 875 distinct development and 1,263 production Rust-completed files, including eligible app/dependency modules and generated `rust-probe.css.ts`.
- Explicit fallbacks include the worklet probe, actual Reanimated/Worklets imports, RN codegen and Flow parser cases. Fallback is not counted as Rust completion.
- Both cohorts pass token edits, nested CSS edits, theme-value edits, candidate creation/deletion, direct edits, runtime-factory edits and restoration. Pre-upstream Crumbs payloads match across backends. Warm requests do not repeat compilation; primed public-env changes and restoration update development and production output in **both** Babel and Rust with source/configuration bytes unchanged. Retained hashes and fail-closed input comparisons rule out the prior changed-entry confound. Cache-only cohorts report observed completions without claiming fresh eligible-module qualification.
- Generated native styles and factory callback forwarding match in a separately labelled host control using real React elements and a controlled RN host. This does not establish native event delivery or UI-thread Worklets execution.
- Production exports for all three platforms exclude development style explanations and pass the runtime graph checks. Source-map locations pass in development and all production platforms.

The live probe uses its own cache directory with Expo's original cache-store implementation, preserving primed backend switches without resetting shared caches. It must run with watch mode enabled: Expo disables reloads and new-file discovery in CI mode. Production exports still use CI mode. The initial CI-mode failure was a fixture error, not evidence of a broken Crumbs invalidation bridge.

## Source-map repair and type boundary

The retained failing regressions exposed generated source coordinates outside the authored `.css.ts` file. Metro's older tuple maps and SDK 58's nested encoded VLQ maps are now remapped to authored export/import anchors. Synthetic helpers point to file start. This supplies **export-level provenance**, not property-level precision for evaluated/composed values. Ordinary-module maps are unchanged. Babel parser and the source-map codec are explicit compiler dependencies; ordinary runtime graphs continue rejecting them. Filename-aware parsing preserves decorators, legacy import assertions, import attributes, JSX/TSX and TypeScript angle assertions accepted by the existing compiler. No authoring API changed. Destructured export bindings currently receive file-start provenance; this minor follow-up does not prevent compilation.

[Strict declaration probe](strict-qualified/qualification.json): consumer code and all positive/negative API checks pass. With `skipLibCheck:false`, exactly three RN 0.88 generated declaration failures remain, reproduced identically in the no-Crumbs control: AnimatedProps, VirtualizedList and ReactNativeDocument. They remain failures in the raw logs. No Crumbs-owned declaration errors remain. The normal Expo strict consumer retains Expo's `skipLibCheck:true`; this packet does not claim a fully clean upstream declaration graph.

Build and typecheck pass; the complete test suite reports 1,885 library passes, one pre-existing exact-Node-22 skip and 33 Storybook passes. [Retained logs](checks/tests.log.gz). Frozen lockfile installation also passes.

The [whole-slice review disposition](review.md) records both repaired Important findings, the deferred Minor and execution rulings.

## Reproduction and limits

Build once, then use the same tarball with `bun scripts/playground-sdk-candidate.ts --sdk=58 --pinned --keep --tarball /absolute/candidate.tgz /absolute/output/qualification.json`, and repeat with `--sdk=57`. SDK 56 staging remains available through `stage(specifier, parent, {sdk:56})` and `playground:packed --sdk=56 --check`; the retained [three-SDK review requalification transcript](replay/requalify.ts) records the exact-artifact run. Replay transcripts contain the original owned host paths and are evidence, not portable application entry points.

For the live fixture, install the SDK-matched Reanimated 4.7.1 / Worklets 0.13.0 cohort in an owned SDK 58 stage, then run `bun packages/css/fixtures/sdk-58/rust-routing.mjs /absolute/crumbs-playground-stage /absolute/output`. The fixture restores touched source/config files and stops only its own Metro child. It requires real Rust completion events; enabling the flag alone cannot pass.

M1.10b owns Playground/Storybook promotion and actual iOS/Android development-client interaction. M1.10c owns docs/skill promotion, clean three-SDK hosted CI, matched performance cohorts and release review. M10.5's unchanged host budget gate and unresolved exact consumer 2.5x report remain open. Physical-device, spoken-reader and release-FPS acceptance remain deferred. There is no release exception or publication authorization in this packet.
