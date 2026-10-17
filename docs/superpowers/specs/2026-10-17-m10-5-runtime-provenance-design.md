# M10.5 — bind runtime admission to artifact provenance

Date: 2026-10-17. Design base: `d98361e`. **Written design approved on 2026-10-17 after `10438f5`; implementation plan awaits review.** The user approved preparing this design after the [provenance assessment](../../assessments/2026-10-17-m10-5-runtime-provenance-contract.md). Implementation requires a separately reviewed plan; native/inline execution is retained. The [proposed ADR](../../decisions/bind-runtime-admission-to-artifact-provenance.md) records the decision and alternatives.

## 1. Intent and scope

Replace emitted filename families as the authority for admitting Crumbs code into ordinary-runtime qualification with artifact-bound, reviewed build provenance. Keep the existing independent import auditor, platform-map requirements, dependency restrictions and release gates. The users of this contract are Crumbs maintainers and release tooling; application authors keep their existing APIs and imports.

Success means that a reviewed, import-free generated CJS helper can be distinguished from compiler code bundled under an allowed-looking filename and from a helper that imports a Node builtin. Missing, stale, inconsistent or unknown provenance must stop qualification. Renaming code cannot grant admission.

This is a correctness improvement. It does not revive the rejected kernel, adopt staged authoring packaging, supply a performance hypothesis, or waive the recorded cold/warm/incremental failures. Do not rebuild or benchmark the parked candidate. Public exports, runtime dependencies, canonical bindings, registry protocols, declarations, Node22.0.0 and SDK56/57/58 remain unchanged. No per-render, Metro-transform or application-startup receipt validation is added.

## 2. Starting evidence and constraints

The [stopped kernel proof](../../evidence/2026-10-17-m10-5-pure-contract-kernel/README.md) passes 59 emitted import rows but fails one of 30 ordinary-runtime filename checks. Its token CJS closure reaches a 554-byte generated helper. The source-list contract rejects the filename, while recorded membership identifies only the synthetic `\0rolldown/runtime.js` module and direct inspection shows object/CJS interop code with no imports. The candidate's behavioral, identity, cache and timing stages never ran.

The two retained helper artifacts illustrate why a name prefix is insufficient:

| Archived artifact | Bytes | SHA-256 | Observation |
| --- | ---: | --- | --- |
| `rolldown-runtime-9BSl_Epz.cjs` | 554 | `ebf00b404775b437ace729fb112c17869280b27fbd61743c86d912e5ba20cadc` | CJS interop; no imports |
| `rolldown-runtime-TCmg55xp.mjs` | 79 | `5448745440b069a67d351fcdf228e642ffd67e9bd12b8f392a9d14d0196fd89d` | Imports `node:module`; not reached by token ESM |

These are retained test fixtures, not newly approved shipping artifacts or helper policy entries.

[tsdown.config.ts](../../../packages/css/tsdown.config.ts) has ten JavaScript configuration owners with two formats each, and one separate source-based declaration owner. Configurations can run concurrently. The declaration owner writes the existing `.d.cts` stubs. Preserve these graphs and their cleanup settings; adding provenance must not recreate the rejected kernel driver or change grouping.

Local installed declarations confirm tsdown0.21.10 exposes awaitable `build`, and Rolldown1.0.0-rc.17 exposes `OutputChunk.modules`, `moduleIds`, final chunk `code`, `imports`, `dynamicImports`, and output hooks. `RenderedModule.code` may be null. These APIs are a design input, not evidence that capture is complete in an actual build. The first implementation gate must establish capture completeness against the unchanged layout and stop if that fails.

## 3. Trust boundary and independent checks

The trusted boundary is the reviewed source revision, lockfile, build configuration/plugins, source-classification policy and qualification toolchain. Build membership is a report from that toolchain. A digest binds recorded bytes; it does not prove semantic purity or defend against a malicious compiler, a malicious trusted plugin, or a deliberately falsified source-build attestation.

Three checks remain independent:

1. **Build provenance:** determine which reviewed source/vendor/generated modules contributed to each exact artifact. A policy in reviewed source decides which members may appear in ordinary runtime. The generated receipt cannot choose its own policy or classify an unknown member as safe.
2. **Packed import graph:** run the existing [AST auditor](../../../scripts/packed-runtime-graph.ts) over actual installed bytes. Preserve public entry classification, local-path confinement, external peer restrictions, unsupported-loader rejection and ordinary-runtime denial of compiler, advanced-runtime and Node dependencies. Provenance cannot grant an external-import exception.
3. **Consumer maps:** resolve each Crumbs source in retained iOS/Android/web maps to the actual selected package instance and a verified artifact. Preserve Storybook's additional package-presence requirements and dependency denial in the controlled qualification fixtures.

Release tooling pins the expected receipt digest outside the installed package, alongside the exact tarball/file inventory and source identity. A modified installed file plus a rewritten receipt must fail that external pin. A package that merely agrees with its own rewritten receipt is not source-qualified. Workspace receipts can prove local build consistency against reviewed local inputs; their reports must not claim sealed-release identity.

## 4. Reviewed policy and generated receipt

Add a build/qualification-only policy at `packages/css/build/runtime-provenance-policy.json`. The policy has an exact schema version, an enumerated set of package-relative original runtime source paths, and reviewed generated-helper profiles. It has no directory wildcard that admits compiler sources. Vendor members are recorded by exact package name/version/subpath and source digest; none is admitted to ordinary runtime by default. The existing allowed React/React Native peers remain external dependencies governed by the import auditor, not bundled-vendor exceptions.

Establish the initial source-path set from captured unchanged-build membership and source review. Never generate an allowlist merely by labeling everything currently reachable as runtime. Record every member the bundler reports, including zero-length members; do not silently discard unfamiliar IDs because their rendered length is zero. If the current tool cannot supply an auditable cut, stop and retain the old guard rather than inventing names or pruning evidence.

Generated helpers require a pinned toolchain identity, exact synthetic ID and reviewed code digest. If rendered helper code is available, bind that digest and the enclosing artifact membership. If it is null or not independently extractable, admit only a reviewed exact enclosing-artifact digest with its complete membership. No unknown-helper fallback is permitted. Profiles describe the evidence actually reviewed, not a claim that any module named `rolldown/runtime.js` is safe. A toolchain or helper-content change requires a reviewed policy change.

Emit one internal sidecar, `dist/runtime-provenance.json`, with schema identity `crumbs.runtime-provenance.v1`. It is packaged through the existing `files: ["dist", ...]` rule, adds no public export, and is never imported by product JavaScript. Required content:

| Field group | Required binding |
| --- | --- |
| Identity | Schema version; package name/version; exact package.json digest; reviewed policy digest |
| Inputs | Canonical digest inventory of original source/build configuration, capture/finalizer code, policy, lockfile and relevant tool versions |
| Generation | SHA-256 of the canonical identity/input inventory; shared by every owner receipt |
| Artifacts | Sorted package-relative path, format/kind, byte length and SHA-256 for every emitted JS artifact and declaration |
| Membership | Each JS artifact's owner, complete normalized member IDs, original source digests or vendor/helper identities, and reported rendered lengths |
| Entries | Actual export-target/class/format rows and reachable local artifact paths, rederived by the independent packed auditor |

Use exact-field decoding and reject duplicate JSON keys, duplicate artifact paths or duplicate member IDs within one artifact, unsupported versions, invalid lengths/digests and duplicate output ownership. The same original module may legitimately contribute to several artifacts/configurations; its normalized source identity and digest must agree everywhere. Paths use package/repository-relative POSIX spelling, no home/temp prefixes, traversal, URL escaping or case-folded collisions. Canonical receipt encoding is compact UTF-8 JSON with recursively sorted object keys and set-like arrays ordered by raw UTF-8 byte comparison, followed by one newline; preserve order for any sequence whose meaning depends on it. Require incoming receipt bytes to equal their canonical reserialization as well as passing schema checks, so duplicate JSON keys or alternate encodings cannot be hidden by parsing. Hash complete bytes without mtime, absolute host path, timestamp or random session nonce. The input inventory excludes generated dist/receipt files, lock/session state and the receipt itself. The receipt does not contain its own digest or the final tarball digest; external qualification records bind both after packaging, avoiding a hash cycle.

Keep complete source inventories and raw module IDs in private build evidence, using normalized identities in the package. The sidecar is internal metadata, not a supported consumer serialization API. No Effect or other dependency is introduced into runtime imports; validation lives in build/repository tooling and uses existing dependencies only.

## 5. Capture, finalization and failure lifecycle

Use a small Node-hosted build wrapper with the installed public awaited tsdown `build` API. The wrapper delegates the existing configuration unchanged apart from adding a non-mutating capture plugin and stable configuration-owner identifiers. Normal build, skip-clean development build and prepack route through the same wrapper. This is an observation/finalization barrier, not a new staged code layout.

At start, acquire exclusive ownership of this package output using a task-scoped lock; a concurrent build fails rather than sharing receipts. Remove any prior final provenance sidecar before building, even in skip-clean mode. Create a fresh owner-marked temporary session outside `dist`, pass its absolute path through a wrapper-only `CRUMBS_INTERNAL_PROVENANCE_SESSION` environment value, and restore the prior environment in `finally`. Session nonces remain outside packaged metadata. A direct CLI build without a valid wrapper handoff must fail before modifying outputs; it cannot mint or refresh a receipt.

Each configuration/format gets a separate capture owner. A final ordered output hook snapshots final JS bytes, complete membership and dependency metadata by value; do not retain native-backed output handles beyond the hook. The capture plugin must not transform code, change chunk hashes, create JS imports or mutate emitted module contents. Each owner writes only its own temporary receipt. Declaration output retains one owner and its existing stub hook.

The Node22.0.0 wrapper must not import repository TypeScript directly. Invoke the existing TypeScript auditor through an awaited repository-tooling subprocess using the already-required Bun executable, capture its actual version and JSON result, and propagate failures. This adds no dependency to the installed library.

After the awaited whole build resolves, the finalizer verifies all expected owners completed, each actual emitted JS file has exactly one owner, all captured byte digests match the files on disk, declaration inventory is complete and the independent import auditor agrees with recorded dependency/entry observations. Compare source/config/lock inventories before and after; reject a changed input. Reject stale unowned JS left in skip-clean output, rather than silently deleting or ignoring it.

Validate ordinary-runtime membership against reviewed policy, then atomically write the one final sidecar. A missing owner, late code mutation, failed declaration/stub phase or any audit error leaves no usable final sidecar. Remove the owned session and lock in `finally`; preserve failure evidence separately. A crashed process may leave an owner marker, but there is no automatic adoption of a leftover lock/session. Cleanup must verify ownership before removing it.

The implementation must demonstrate that the hook really observes final bytes for this pinned toolchain. If later hooks or build steps modify JS, reject finalization; do not normalize a mismatch or simply rehash it into success. Repeated successful builds with identical input/output bytes must produce identical sidecar bytes. Fresh, failed and skip-clean builds need separate lifecycle tests.

## 6. Installed artifact and platform-map admission

Add a strict repository qualification function, `verifyProvenancedRuntimeBundles`, alongside the existing legacy function. It requires an explicit context containing consumer/workspace roots, selected package instance, expected receipt digest or local build-input identity, and qualification mode. It never switches to legacy based on a missing file, package version or failed validation.

Before reading platform maps, verify the complete package JS/declaration inventory and receipt against the externally supplied identity; rerun the packed import audit and ordinary membership policy. Installed consumers retain the existing no-symlink/no-worktree package rules. Workspace mode permits only the explicitly selected linked workspace instance and reports that narrower scope. Do not search the current repository to fill missing installed metadata.

Resolve source references using `sourceRoot`, map location and consumer root, building on [packed-distribution-contract.ts](../../../scripts/packed-distribution-contract.ts). Support version3 regular maps and embedded/indexed sections. Local section URLs must stay inside the supplied output and be cycle checked; no remote fetching. Normalize supported relative/absolute/file references, check both lexical and real paths, and reject ambiguous or unsupported Crumbs references. Preserve rejection of repository escapes and authored `.css.ts` paths for installed consumers. Never accept a path merely because a substring resembles `node_modules/@opsydyn/crumbs-css`.

For every Crumbs map source, require the selected package's exact artifact row, ordinary-runtime-safe member set and byte digest. Require its `sourcesContent` string to match the installed artifact bytes decoded as UTF-8; a missing/nonmatching content item is incomplete provenance and fails. This requirement must be verified with real exports before admission. Do not silently rewrite source content to accommodate a backend. A declared source path alone does not prove which bytes were transformed.

Metro may remove unused artifacts or combine many modules. Require admission for every represented Crumbs artifact, not equality between a platform source list and the entire import closure. Do not infer precise retained source-member bytes or runtime execution from map membership. Require Crumbs presence on each of iOS/Android/web; preserve Storybook addon checks. Report platform/map/artifact/format/receipt identities, and hash retained maps in the qualification result.

If a backend maps original library source instead of the installed emitted artifact, it does not satisfy v1. Stop and retain that limitation for design review; do not enable new library source maps, ship source files, rewrite the map or add a permissive virtual-source rule in this slice.

## 7. Migration and release integration

Keep `assertRuntimeBundleSources` and the legacy verifier available to replay historical evidence, including the original rejected kernel outcome. New strict admission uses verified membership for Crumbs artifact acceptance instead of its filename-family regex, while retaining dependency denial and the independent packed auditor. The archived rejected packet must continue to reject under its original guard; do not rewrite its result after introducing a new contract. Replay its self-contained verifier without `--repository` after product changes: its optional live-preservation check correctly rejects a changed shipping tree and cannot qualify the new artifact.

Migrate current qualification callers: `scripts/playground.ts`, `scripts/playground-sdk-candidate.ts`, `scripts/qualify-sdk56-tarball.ts` and `scripts/expo-app-workers.ts`. Packed/current release callers supply a source-bound expected receipt identity; workspace calls use the explicit workspace context. Keep historical M8–M11 qualification scripts on the legacy replay path unless they are used to make a new release claim, in which case they must opt into strict qualification. Reuse existing installed-package and retained-map inventories rather than creating a second root/path resolver with weaker rules.

Existing published tarballs have no sidecar. Their legacy qualification requires an explicit historical profile pinned to an exact tarball digest and previously verified file inventory outside that package. No semver range, generic "old version" check or failed-v1 fallback selects this profile. Historical replay reports its legacy contract and cannot satisfy current-release qualification. Existing recorded evidence remains unchanged.

Advance the normal release-qualification manifest from formatVersion2 to formatVersion3; keep v2 decoding only on explicit historical replay. Update assembly and verification to require a derived `runtimeProvenanceQualified: true`, with a required `runtimeProvenance` record containing receipt/policy/generation digests and a hashed inventory of the successful required platform qualification reports. Bind these to the exact source/tarball identity before sealing. The creator and independent verifier must rederive the result from actual files; a caller-supplied true flag cannot qualify it. A legacy source-list result cannot fill that field. Preserve all existing host, SDK, package integrity, types and workflow requirements. Include the sidecar in both source-side and unpacked artifact inventories, updating their shared collection/validation consistently. The sidecar creates a new artifact identity even if JS/declarations are unchanged; no old report is automatically rebound to it. Publishing or changing an immutable release tag is outside this slice.

## 8. Validation and stop conditions

The later implementation plan must deliver this contract as one complete correctness slice. First qualify capture against the unchanged current build layout. Stop at an incomplete membership trace, unexplained artifact-byte change, unknown helper/source or unsafe path/format transition. Do not change code splitting, dependencies, runtime sources or the source-based declaration graph to force the new guard to pass.

Required validation:

- Red/green cases for an inline compiler member hidden behind an accepted-looking chunk name, renamed compiler chunks, direct/transitive external compiler imports, Node-dependent glue, unknown helpers and disallowed advanced members. Test real emitted contamination as well as fabricated metadata.
- Positive reviewed CJS-glue fixture with exact membership/byte/toolchain bindings; negative ESM Node-glue fixture. These fixtures do not reopen the kernel or claim its remaining gates passed.
- Missing/stale/duplicate/partial owner receipts, late JS mutations, wrong formats, policy/hash mismatches, changed sources, symlink/path escapes and concurrent builds. A failed or interrupted build cannot leave a valid sidecar. Test tampered bytes plus a rehashed forged receipt against an external expected identity.
- Exact JS/declaration-byte comparison between the baseline build and the capture-only build under the same source/toolchain; canonical public-binding/registry/declaration tests remain green. Compare clean, repeated and skip-clean outputs. Metadata addition must not change executed JS or declaration ownership.
- Real independent packed SDK56/57/58 iOS/Android/web exports with strict receipt/map-content validation, plus both current workspace apps under their existing SDK58 Babel/Rust worker contexts. Backend/platform failures remain failures; no native UI/device acceptance is inferred from exports.
- Existing legacy runtime-source tests and the archived stopped-kernel verifier continue to reproduce their original outcomes. A relocated packed consumer passes without original home/worktree/temp paths. A legacy profile, missing receipt or incomplete platform cannot satisfy the new release-qualification field.
- Current source/type/package tests pass. No benchmark result, full-host release replay, new native interaction, public push or npm publication is claimed by these correctness checks. Any later release still needs all11 blocking host rows and all existing independent checks; advisory results remain recorded.

The implementation outcome must archive failure/unrun stages, exact source/artifact/toolchain identities and the externally pinned receipt identity, commit once, and recommend the next numbered roadmap slice. If this design proves infeasible without changing runtime bytes or weakening evidence, retain the old guard and commit the rejected outcome rather than admitting a subset.

## 9. Risks, non-goals and review status

The costs are a packaged metadata file, build-session lifecycle, a reviewed source/helper policy and stricter map-content requirements. Toolchain upgrades can require helper-profile review; skip-clean output can fail until a clean build removes stale files. These are deliberate costs, not a speed improvement. Exact helper/artifact hashes are intentionally conservative; they cannot promise compatibility with arbitrary future bundler output.

This contract detects drift relative to a reviewed, source-bound artifact. It is not a general JavaScript security analysis or a new npm supply-chain attestation service. It cannot defend against malicious trusted build inputs, prove exhaustive runtime behavior or infer native performance from source maps. Cryptographic registry provenance, source review, identity/behavior/cache tests and host gates retain their separate roles.

No guard or schema has been implemented, no candidate or consumer has been built, and no new qualification result is recorded by this document. The proposed ADR supersedes no accepted release policy. The kernel remains parked; the three original M1.10c host failures and deferred physical acceptance remain.

**Current next M10.5:** review the [prepared native/inline implementation plan](../plans/2026-10-17-m10-5-runtime-provenance.md). The written-design approval permits planning, not execution or publication.


### Written-design review (2026-10-17)

The user approved this written design after `10438f5`. The [single-slice implementation plan](../plans/2026-10-17-m10-5-runtime-provenance.md) is prepared for separate review; native/inline execution is retained. No product implementation or new qualification accompanies this planning update.

Planning verification confirms installed Rolldown declares Node `^20.19.0 || >=22.12.0`. Full builds use current Node24.15.0; genuine Node22.0.0 compatibility remains required for emitted Crumbs code and applicable standalone helpers. No full-build support for Rolldown on Node22.0.0 is claimed or added.
