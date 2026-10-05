# M10.5 Task 4 — complete-transform receipt candidate

Date: 2026-10-05. Base: `4b5c101`. Governing [Task 4 qualification plan](../superpowers/plans/2026-10-05-m10-5-cache-qualification.md) and [admission/lifecycle spec](../superpowers/specs/2026-10-05-m10-5-cache-admission-lifecycle-design.md). Private benchmark tooling only. Shipping source, authoring artifacts, build policy, public API, dependencies and defaults remain unchanged.

## Candidate boundary

`buildCandidate(outputRoot)` creates an owned package copy with the existing package-relative source/artifact layout and installed dependency resolution. It copies authoring artifacts unchanged and builds one additional CommonJS transformer using the installed tsdown/compiler build policy. TypeScript AST checks require one native helper, capture block, compile call and Metro native invocation. Six recorded surgical edits replace only the compile/capture seam, pass the current receipt into the original native helper, wrap all native entry points with the resource session and supply the Metro entry buffer. The later lowering/emission text remains verbatim. Missing, duplicate or expanded compile-option shapes reject the patch.

The copied module reads its private qualification configuration once. Absence stays fresh. All CSS compilation and native evaluation uses the same serial gate, including direct stylesheet and manifest-sidecar calls. Every hit rebuilds and evaluates native styles; no result is cached. A bounded private receipt log records actual/evaluated receipts for qualification. It adds no shipping export or flag. Tooling awaits owned close and never calls global esbuild stop or installs a WorkerFarm replacement.

A Node build exposed a private Task 3 tooling issue: the local `require` binding collided with tsdown's generated CommonJS `import.meta.url` shim and caused a temporal-dead-zone error. Renaming that binding to `integrationLoader` fixes the candidate under Node without changing shipping code.

## Recorded outcomes

The [collection receipt](../evidence/2026-10-05-m10-5-full-transform-candidate/collection.json) archives 16 gzip reports with complete generated source, input receipts, native metadata, controlled upstream results and diagnostics. One candidate artifact and the same fixture paths serve every variant. Current Node v24.15.0 and exact Node v22.0.0 each exercise fresh, immediate and repeat modes. The candidate's genuine compiler key is compared exactly within those modes; shipping uses its own different key and separate semantic checks.

Both runtime matrices pass all 14 intended successes and exactly two intended errors. Alternating/concurrent entries, plain token edits, workspace token edits, nested stylesheet edits, import replacement and queued syntax-failure/repair have explicit outcome checks. Golden widths change 24 → 54 → 84 → 7, nested opacity changes 0.5 → 0.75, and repaired output returns width 31. Web/development/strict/explanation options and direct/sidecar entry points are exercised. All retained matrix variants show actual hits.

The verifier establishes **88 exact result comparisons**: 64 retained matrix comparisons, eight direct/sidecar comparisons and 16 absent-configuration comparisons. Full compile/evaluation receipts match across fresh/retained modes. Sixteen shipping requests separately match diagnostics and semantic exports/native dependency metadata. These are controlled upstream transformer results, not actual Metro AST/serializer or application bundle acceptance.

The stale-input negative control reuses the prior dependency map while keeping the rebuilt source identical. Native dependency metadata and final transform results diverge, proving source-only parity cannot admit that defect. Buffer/disk mismatch and unknown options select fresh bypass; observed source instability retains no context. Installed package-info or loaded-artifact changes disable retention and identify a module/worker restart requirement. Fresh compilation in that process is not represented as reloading cached code.

Each candidate process restores authored fixture bytes and closes with no live, retained, creating, disposing, quarantined or pending resources and no cleanup failures. Hash verification covers original source/dist/fixtures/package/build policy, the candidate artifacts, unchanged copied authoring artifacts and copied source provenance. Only the copied transformer and added private adapter differ from original source; private tooling and runtime executable hashes are recorded.

## Verification and limits

Initial builder/parity stubs failed. Fresh review reproduced two qualification-harness defects: completion-order result storage made concurrent shipping comparisons flaky; weak outcome admission could accept an unexpected repaired-transform failure. Stable invocation IDs now preserve request order. A deliberately corrupted repair report failed its new rejection regression before explicit success/error/golden assertions were implemented. Both fixes pass the final focused suite; no further review was requested.

Final checks: nine focused tests with exact Node floor enabled; **1,429 package tests across 218 files**, zero failures; package typecheck; documentation build; the archived verifier including live restoration hashes. The earlier full-transform evidence verifier also passes with its 161-file shipping/input inventory unchanged. Tooling runs under Bun 1.4.2 with installed esbuild 0.27.7, Vanilla Extract integration 8.0.10 and tsdown 0.21.10. Effect 4.0.0-rc.115 is unchanged.

A typecheck invocation initially reported unresolved Metro types; an immediate rerun and final check passed without code/dependency changes. This transient result is not attributed to the candidate or treated as a dependency upgrade.

No timing, memory-budget, production cache capacity/default, actual incremental Expo/Metro, worker-exit disposal, host-budget or device-performance claim follows from this slice. The capacity-four and 120-second settings are qualification controls. Original source preservation and controlled full-transform parity do not close M10.5.

Reproduce focused checks with `CRUMBS_AUDIT_NODE_FLOOR=/absolute/path/to/node-v22.0.0 bun test packages/css/test/context-reuse-transformer.test.ts`. Recollect intentionally with the same environment and `bun docs/evidence/2026-10-05-m10-5-full-transform-candidate/collect.ts`; this overwrites this evidence directory with a new owned artifact/path set. Replay archived observations with `node docs/evidence/2026-10-05-m10-5-full-transform-candidate/verify.cjs`; add `--live` while the recorded owned temporary copy exists to verify current inventories too.

Next: **M10.5 Task 5 — incremental Metro qualification**, using this private candidate in actual Expo/Metro edit/invalidation and lifecycle trials. Production admission remains a later decision. Android remains last.
