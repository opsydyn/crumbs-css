# M10.5 bounded compiled-text identity revision

Status: **approved for prerequisite investigation; identity premise not established**. This is a revision of the compiler portion of the previously approved consolidated design, under the accepted consumer-scoped policy. It does not approve dropping compiler checks, implementing a partial cache, or changing any numerical contract.

## Intent and success

Make repeated React Native style authoring fast without stale compilation, hidden diagnostics or breaking public behaviour. Preserve all public exports/types/options, generated code and legacy metadata; preserve authoring execution and ambient reads on every call. Keep the 6.514 ms absolute / 15% relative warm limit, every baseline and all 21 retained metrics. Require all eleven blocking comparisons to pass and every advisory comparison to be complete, honest and independently rederived under the current policy. No runtime graph rewrite, new dependency, hosted-runner registration, publication or physical/spoken-reader acceptance belongs to this slice.

The 5.80 ms grouped partial probe is a feasibility signal only. Complete proof checks, actual evaluation fencing and the unchanged official workloads must be timed before admission. There is approximately 0.714 ms of apparent headroom in that diagnostic; the official result may differ. Avoid another complete host run until complete-transform controls demonstrate eligibility, parity and sufficient timing headroom.

## Alternatives and recommendation

1. Retain repeated full installed-compiler file scans in the memo proof. This is conservative, but the tested partial representation is already too slow. A more efficient representation remains possible; no universal lower bound was proved.
2. **Recommended investigation: prove a process-scoped identity for the actual loaded compiler**, separate from mutable source/resolution witnesses. Only after that argument is established may redundant installed-file reads be removed from text-memo hits. Changes that affect the fresh compiler must still invalidate reuse. This demands source inspection and adversarial qualification; it is not yet proven or shipping authority.
3. Keep fresh compilation and work on upstream integration cost. Earlier context reuse remained above the limit and required disposal ownership. This remains the fallback if a safe memo cannot qualify; do not weaken the warm budget to admit a cache.

## Compiler identity: proof prerequisite

Start by inventorying the exact functions/module instances used by the fixed default integration, esbuild, debug-ID Babel transform and syntax parser, including late loads, environment-dependent selection and internal mutable state. Distinguish executed module identity from on-disk files: reading an installed file after its module loaded does not itself establish the bytes that executed. Do not label observed disk hashes as executed-code provenance without an actual binding argument.

A process-scoped identity is eligible only where inspection proves that unchanged loaded bindings and the captured compile environment determine compiler behaviour, and that every disk input still consulted by a fresh compile is represented in the mutable proof. Define and test guards for module replacement/cache invalidation, callable or namespace mutation and any late executable selection. If a complete guard cannot be enumerated, keep fresh compilation and the existing checks. Identity may not be inferred solely from version strings, package paths, function names or object equality of one top-level compile function.

Before removing any repeated compiler-file validation, compare against independently fresh compilation after edits/restoration of compiler files and lazy helper files, module replacement and environment changes. Require correct invalidation/restart behaviour whenever fresh compilation would change. Preserve existing package-scope/restart diagnostics and fail closed for an unknown compiler/resolver form. Do not add new public configuration or turn a previously supported transform into a cache-admission error; unsupported caching uses fresh compilation.

Keep observed artifact hashes and exact versions in evidence. A process-local opaque identity must never be mistaken for portable disk-cache or release provenance. Repeated artifact reads may only be removed after their redundancy is demonstrated for the admitted compiler path. If this premise fails, reject this approach before integrating a memo.

## Mutable input proof and grouped checks

Retain the previous plan's conservative grammar: literal static import/export/require; witnessed relative/absolute file/directory requests and ordinary exact package exports; default loaders/options and internally owned collector only; supported local JSON/JSONC configuration chains; bounded logical/canonical links. Dynamic/glob imports, unknown conditions/loaders/plugins, aliases, package-based extends, wildcard exports, incomplete metadata or unbounded graphs remain fresh unless separately designed and approved.

Hash every bundled input, including installed/dist files, and every applicable package/configuration/lockfile. Enumerate negative and higher-priority resolution candidates and logical/canonical symlink routes. Use directory entry names, kinds and targets as witnesses. A checked directory inventory can prove an absent child; do not repeat a failed read of that child merely to establish the same absence. The grouping must preserve the complete logical receipt, detect creation/removal/retargeting and be checked again after consumption. No mtime/size-only fast path or benchmark fixture allowlist.

Validate before consumption and after all authoring/capture/lowering/emission. On detected drift, preserve the existing changed-during-compilation diagnostic and bounded fresh/retry behaviour. Do not silently execute authoring twice after consumption. First discovery is not reusable: a confirming stable fresh compile must agree on complete inputs and proof. Tests must include same-length/mtime edits, installed bundled sources, nearer packages, extension/directory additions, condition order, config/lock changes, symlink retargets, errors/repair and edit/remove/restore histories.

## Memo, authoring and concurrency

Keep the previously approved caps: sixteen entries, eight MiB aggregate UTF-8 source/serialised-metadata payload, one MiB per entry; deterministic LRU. Retain only immutable compiled text and compiler-input metadata. No esbuild contexts, watchers, timers, owned workers, evaluated exports, native outputs or failures. Each call evaluates and emits anew, including manifest/explanation variants. Unsupported or oversized inputs remain fresh. Preserve request generations and eviction on failure; an older completion cannot overwrite a newer proof or return stale output across an edit/restore. Two project roots cannot share an entry. Private stats/controls add no public API.

Return exact full compiler inputs explicitly; do not depend on a collector callback that a hit skips. Independent control/candidate processes must agree on complete code, inputs, legacy native metadata, diagnostics, ambient reads/side effects and exported result topology.

## Metro and final admission

Keep a separate serialisable private Metro receipt for mutable bundled inputs and resolution decisions. Validate it on cache reads/result keys; malformed, incomplete or unprovable receipts miss. Define its compiler binding independently: a main-process cache reader cannot assert the loaded identity of a separate transformer worker. If portable proof cannot be established, that outer cache must miss for affected results; neither a process-local token nor a metadata flag can waive validation. Quantify any cold/restart/cache-hit regression in the unchanged Metro and cold-transform gates.

After the compiler identity premise passes, write one inline implementation plan covering proof/memo/transformer/Metro integration, independent control and property tests, genuine Node 22 checks, packed iOS/Android/web export/type checks and complete matched host evidence. One whole-candidate review precedes final qualification. Prepare the matched scaffold only after all builds complete; no concurrent builds/tests while collecting timings.

Admission requires all software/public contracts, exact unchanged workloads, all eleven blocking passes and zero incomplete rows across 21 metrics. Advisory numerical failures stay visible. Any failed premise, correctness or timing gate removes the entire production candidate; retain one reproducible rejection packet. Make one implementation or rejection commit and recommend the next numbered item. The development report cannot qualify a later release SHA/tag. Physical-device/spoken-reader checks remain deferred.

## 2026-10-08 — prerequisite disposition

The user approved this investigation. The [owned three-runtime counterexample](../../assessments/2026-10-08-m10-5-compiler-identity-prerequisite.md) shows that loaded namespace identity and post-load executable hashes cannot certify the native service that supplied compiled text. No complete lifetime/origin guard has been established. The existing specification requires: “If this premise fails, reject this approach before integrating a memo.” That prerequisite has not passed, so no memo implementation plan or production candidate is admitted. The counterexample rejects the tested predicates, not every conceivable identity design. Fresh compilation and all numerical/API contracts remain in force.


## 2026-10-18 — narrow contract supersession

After the failed prerequisite and later root-cause investigation, the owner approved the [worker-lifetime contract amendment](../../decisions/adopt-native-design-system-compiler.md#approved-worker-lifetime-compiler-contract--2026-10-18). A fixed compiler installation now requires process/Metro restart to upgrade; a validated compiled-text hit need not reproduce compiler-service-start failures. This supersedes that exact error-equivalence premise above, not the historical rejection result or the mutable-input, fresh-execution, isolation and numerical requirements.

The replacement [written design](2026-10-18-m10-5-worker-scoped-compiled-text-design.md) is proposed for review. It introduces a session-bound outer-cache proposal rather than claiming portable worker identity. No implementation or release admission follows from this amendment; original evidence remains unchanged.
