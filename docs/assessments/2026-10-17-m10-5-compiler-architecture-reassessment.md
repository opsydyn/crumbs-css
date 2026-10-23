# M10.5 compiler architecture reassessment

Date: 2026-10-17. Assessment base: `7d2131a`. **Assessment only: no new candidate, accepted ADR, dependency change, benchmark, release exception or publication.**

## Outcome and release status

Recommend testing **entry-aware authoring packaging with protected runtime reachability** before committing to another production remediation batch. The installed library build tool exposes a directly relevant partitioning option that the rejected candidate did not use. Its declaration is a feasibility lead, not proof of a correct or fast package.

There is still no npm release of the SDK 58 surface. Live checks confirm [GitHub v1.2.0](https://github.com/opsydyn/crumbs-css/releases/tag/v1.2.0) exists, npm `latest` is `1.1.1`, and [run 39020184159](https://github.com/opsydyn/crumbs-css/actions/runs/39020184159) failed qualification and skipped publishing. See [live status receipt](../evidence/2026-10-17-m10-5-architecture-reassessment/release-status.json). The unchanged [final release report](../evidence/2026-10-17-m1-10c-expo58-release/final-release/README.md) retains three blocking failures: cold 84.664042 ms versus 83.006 ms; warm 12.346250 ms versus 6.514 ms; incremental +10.4324% versus +10%. Incremental passes its separate absolute limit. Eight editor comparisons pass. Ten runtime proxies remain advisory under the accepted policy; missing/invalid evidence still blocks.

The user chose remediation before publication. This assessment does not reopen that choice or inherit an earlier version-specific exception. Keep the v1.2.0 tag immutable. Any shipping remediation has a new source/artifact identity and follows the normal release process, expected next patch 1.2.1; qualification of the old bytes cannot qualify it.

## What failed, and what the current package proves

The [previous complete batch](../evidence/2026-10-17-m10-5-fresh-pipeline-remediation/README.md) recursively grouped the native authoring closure into one chunk. Pure functions shared with `tokens` moved into that chunk too. A token import then loaded authoring dependencies despite no token source import being added. That is a real emitted dependency edge; tree shaking, externalizing Vanilla Extract or renaming the chunk does not make it safe. The entire four-part candidate was restored.

The fresh [boundary audit](../evidence/2026-10-17-m10-5-architecture-reassessment/boundary-audit.json) uses the existing `auditPackedRuntimeEntrypoints` and `readEmittedGraph` on the restored dist. All **59 export targets** audit successfully, including **30 ordinary-runtime format/subpath rows**. Both token formats reach six local files and zero external specifiers. ESM style reaches eight local files; CJS reaches nine, including its shim. Both style formats legitimately use Vanilla Extract authoring imports.

Four emitted chunks are shared between tokens and style: domain values, token identity, theme contract and theme-token registry helpers. These are the concrete protected boundary. The tool build in `packages/css/tsdown.config.ts` currently contains ordinary `tokens` alongside root/style/compiler/tooling and advanced token entries. Configuration names do not establish runtime isolation; the graph reachable from each public entry does.

Source inspection of `theme-token.ts` also shows existing versioned `Symbol.for`/`globalThis` registries. This makes a blanket claim that every separately emitted copy creates an independent registry incorrect. It does **not** prove reference equality of copied exported functions, scope/context identity, VM realm sharing or compatibility of arbitrary duplicate versions. Preserve existing behavior and tests rather than introducing a new global registry or promising new equality across independently built entries.

## Alternatives

| Approach | Benefit | Cost and disposition |
| --- | --- | --- |
| **Entry-aware grouping in the current tool graph** | Can retain canonical root/style bindings and distinguish modules shared with tokens from modules used only by authoring. Uses the installed build dependency. | Recommended hypothesis. More safe chunks may remain; output membership, imports, side effects and timing need real proof. |
| Separately emit a pure contract kernel, then have authoring/tooling consume those exact artifacts | Makes the one-way dependency boundary explicit at build level. | Larger packaging/linking change: staged outputs, cleanup/order, ESM/CJS routing, declarations, state/function identity and provenance all need a design. Moving token entries into a second build alone is insufficient. Reserve if entry-aware packaging is infeasible. |
| Retain compiler contexts or introduce a compiler service | Could avoid more repeated compiler work than packaging alone. | Changes resource lifetime, fresh resolution, invalidation, concurrency and memory contracts. Existing experimental context-reuse code is not shipping approval. Separate architectural decision; no automatic fallback from this assessment. |

A compiler backend swap is not the recommended next experiment: the bounded Rolldown compile spike already missed full-transform timing and cache/edit parity. The build-time Rolldown option discussed here belongs to **tsdown packaging the library**. Fresh `.css.ts` compilation remains the existing Vanilla Extract/esbuild path. These are different uses of the tool.

## Recommended boundary and data flow

Keep the existing public entrypoints and declarations. Native authoring may depend on pure contract/token data. Ordinary runtime entries may depend on pure data and their currently permitted runtime peers. Ordinary entries must never reach authoring, compiler, Node builtins or compiler-only Effect code, through static imports, re-exports, dynamic imports or loader shims. Advanced schema/optic/devtools paths retain their separately classified dependency contracts; Effect is not newly admitted into ordinary runtime.

The installed Rolldown `1.0.0-rc.17` type documentation states that `CodeSplittingGroup.entriesAware: true` partitions matching modules by the set of entries using them. It also exposes `entriesAwareMergeThreshold`; the proposed proof uses zero to avoid merging distinct usage sets. The retained audit pins that declaration file by SHA-256. This is local installed API evidence, not a claim about every tool version or a built candidate.

A future proof should try one exact authoring group using entry-aware partitioning, retaining current runtime feature graphs and the single declaration graph. Retain actual source-module-to-chunk membership from the build. Determine whether recursively included dependencies obey the partition in practice; do not assume priority, a filename regex or the documented option proves it. If grouping captures an ordinary runtime entry facade or creates an authoring edge in any protected closure, reject it.

Do not coalesce all pure runtime helpers into one universal chunk merely to reduce file count: that could force style to load token-domain/theme operations it does not currently use. Do not duplicate root/style authoring implementations, move ordinary token APIs behind an opt-in import, change registry keys, or hide work after a measured boundary.

The functional architecture remains an effectful request boundary around pure validated data passes. Fresh reads/resolution and VM evaluation stay effectful; normalization, lowering and fingerprint construction stay explicit pure operations. Effect 4 remains internal. The previous request-owned IR/map/fingerprint optimizations are archived candidates, not admitted building blocks; reusing any needs fresh justification and proof.

## Proposed next M10.5 proof and stop condition

This is a recommendation for a separately approved **throwaway feasibility proof**, not an implementation plan or authority to edit shipping code. The broader architectural direction still needs a written design/ADR and plan before production adoption.

1. Use one owned scratch artifact and the exact recovered v1.2.0 control. Try only entry-aware authoring partitioning, with no dependency/backend/floor/public API changes and no retained compiler context. Preserve every other production file. Do not quietly replay the rejected four-part batch.
2. Before timing, audit **all real artifact export graphs**, then load ordinary token/theme/runtime entries with compiler dependencies denied. Check ESM/CJS, actual Node 22.0.0/current Node, root/style shared binding identity in both import orders, existing provider/registry interoperability and canonical declaration brands. Include direct and transitive authoring-edge negative controls. The real token case comes before generic auditor fixtures.
3. Record source-module membership, emitted graph inventories, raw errors, tool versions and artifact hashes. Preserve original control versus control agreement, actual dependency/edit/restore behavior, deterministic cache receipts and existing map/diagnostic contracts. Do not normalize unexpected differences away.
4. Only if behavior and identity pass, collect five independent uninstrumented complete transforms using the existing source/package-root warm protocol and unchanged selector, fixtures and limits. Counts/bytes, build time and nested stage medians cannot substitute for it. A standalone layout win does not qualify the three failing release metrics.
5. Stop after this one layout. Reject and archive on a boundary/identity/parity failure or a warm selector that misses either bound. No repeated grouping variations, production subset, full host/native replay or automatic compiler-service work. If it passes, use the evidence to write the production design and a single complete admission plan; expensive SDK/native/full-host qualification belongs after that decision.

The main uncertainty is economic as well as technical: protecting shared helpers reduces possible consolidation, and there is no measured evidence that packaging alone can close a roughly 47% warm-time reduction from the failed release result. Do not promise that this proof will unblock npm. If it fails, present the remaining service/freshness trade-off explicitly instead of continuing speculative packaging tweaks.

## Verification and scope

The audit is read-only over current artifacts and is not a source-membership trace of a new build. It establishes the starting boundary, not candidate parity, fresh native qualification or performance improvement. No fresh library full-suite pass is claimed here; the prior restored 1,907-pass result remains evidence of that earlier restoration.

Reproduce the graph observation by calling `auditPackedRuntimeEntrypoints` from `scripts/packed-runtime-graph.ts` on the absolute `packages/css` root, then intersect each format's token files with `readEmittedGraph` of its style entry from `packages/css/bench/effect-boundary-audit.ts`. Both helpers were used without changing their guards. The receipt records all graphs, source-file hashes and installed build API identity.

Related decisions: [native compiler D1/D3/D5/D6/D11](../decisions/adopt-native-design-system-compiler.md) remains proposed as a whole; [consumer-scoped M10.5 release policy](../decisions/anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md#2026-10-08--consumer-scoped-host-policy-implemented) is accepted and implemented; [the earlier runtime-boundary split](../decisions/separate-mandatory-theme-resolution-from-optional-runtime-state.md) was rejected. This assessment supersedes none of them.

**Next numbered item: M10.5 — review one entry-aware packaging feasibility proof. M1.10c npm publication remains blocked.**


## 2026-10-17 — bounded proof executed

The approved [entry-aware packaging proof](../evidence/2026-10-17-m10-5-entry-aware-packaging-proof/README.md) is closed at the unchanged source-list provenance preflight: all 59 import graphs pass, but two token format rows reject generated chunk names. This is not the earlier authoring dependency leak. No file-count consolidation, identity/parity qualification or timing improvement was established. Production remains unchanged. Next proposed M10.5 decision is an explicit pure-contract kernel design; no further grouping variation or retained service starts automatically.
