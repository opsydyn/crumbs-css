# M10.5 Consolidated Host-Budget Remediation Design

- **Status:** Proposed; scope approved, concrete architecture awaiting review
- **Date:** 2026-10-08
- **Roadmap:** [M10.5](../../roadmap.md)
- **Base:** `c5206d1` — host-budget release gate
- **Execution:** Inline; one production implementation batch and one final implementation commit

## Outcome and fixed contract

Attempt to close all nine remaining host-budget failures together, preserving the existing public API and the release gate. This is an architecture experiment with a strict admission rule, not a promise that the proposed implementation can fit the limits. A failed experiment must leave the shipping implementation unchanged and M10.5 open.

Keep every existing value/type export, import path, declaration relationship, synchronous return, diagnostic, descriptor version, validation boundary, cache guarantee, and supported platform. Keep compatibility/focused binding identity and the existing cross-entry React contexts and registries. Add no dependency or public subpath. Effect remains in its current tooling/opt-in domains; current theme graphs already exclude it.

Keep all 21 approved metric IDs, selectors, baselines, limits, environment comparisons and workload identities unchanged. No exception, reclassification, new baseline, benchmark special case or release bypass is permitted. Physical-device and spoken-reader work remain deferred. Dedicated GitHub runner registration is a separate external prerequisite.

## Evidence and required reduction

The latest matched release-gate collection records 12 passes, nine failures and zero incomplete comparisons. Its comparison names base revision `011e34d2f02df0ae49c2aed37a79a19185b648be`, with stable before/after source digest `2f8020b05dbd58fd2afc4cff57a5d5244b51b855be57a3fe0e63397e2e328d3f`. It predates the amended release-gate commit and is diagnostic context, not qualification of `c5206d1` or this proposal. Raw reports currently reside at `/private/tmp/crumbs-m10-5-host-budget-release-gate`; retain a new independently verifiable packet for the candidate.

| Failed metric | Retained result | Unchanged ceiling |
| --- | ---: | ---: |
| Node 22 ESM initialisation | 9.094 ms | 7.553 ms |
| Node 22 CJS initialisation | 5.642 ms | 4.083 ms |
| Current Node ESM initialisation | 5.169 ms | 3.067 ms |
| Current Node CJS initialisation | 3.981 ms | 2.444 ms |
| Warm full transform | 9.948 ms | 6.514 ms |
| `theme/core` ESM graph | 64,549 B | 17,271 B |
| `theme/core` CJS graph | 65,408 B | 17,641 B |
| Compatibility `theme` ESM graph | 164,215 B | 44,017 B |
| Compatibility `theme` CJS graph | 171,842 B | 44,764 B |

Rounded timings above are for review only; the registry and comparator retain exact values. The graph ceilings require approximately 73–74% reductions, and warm transformation approximately 35%. Startup profiling mostly captured loader frames and does not establish a specific expensive Crumbs function.

Current-source [runtime attribution](../../assessments/2026-10-07-m10-5-runtime-attribution-and-reduction-feasibility.md) locates generic resolution, component/extension validation and conditions in the core graph. [Static extraction](../../assessments/2026-10-06-m10-5-runtime-boundary.md), [minification alone](../../assessments/2026-10-07-m10-5-current-theme-minification-candidate.md), and a [focused React entry](../../assessments/2026-10-07-m10-5-theme-react-entrypoint.md) failed the binding limits. [Retained compiler contexts](../../assessments/2026-10-07-m10-5-compiler-session-requalification.md) failed correctness and performance; [debug-ID caching](../../assessments/2026-10-07-m10-5-debug-id-cache-candidate.md) was insufficient. Do not repeat these candidates as stand-alone remedies.

## Approaches considered

1. **Shared runtime semantics plus verified compiled-text reuse — recommended experiment.** Reduce duplicated implementation while retaining every capability, and avoid a fresh esbuild build only when its complete compilation identity is proven unchanged. This is distinct from moving source files or retaining an esbuild context. Its feasibility remains unproven.
2. **Build-only optimisation or additive narrow entrypoints.** Lower implementation risk, but existing probes miss the fixed graph and timing ceilings. New entrypoints cannot satisfy metrics attached to existing paths. Reject for this batch.
3. **Change the compatibility contract or budget policy.** Potentially makes a smaller runtime attainable, but conflicts with the approved API and limit constraints. Exclude from this work; no implicit fallback to this option.

## Runtime candidate

Use one canonical implementation of reusable record/array admission and recursive traversal mechanics across component contracts, extensions and theme resolution. Keep boundary-specific policies and error formatting explicit: the current readers disagree about accepted shapes and message punctuation, so blindly replacing them with one existing reader is incorrect. Preserve enumeration order, first-error selection, getter avoidance, null prototypes, symbols, sparse arrays, cyclic data, freezing and identity-registration timing.

Consolidate repeated selection, state-constraint and slot-merge mechanics in `runtime/component-recipe-resolution-plan.ts` and `components/extension-contract.ts` only where differential tests prove identical behaviour. Keep the generic theme resolver's component/extension dispatch. Preserve order-sensitive composition, private/public permissions and recursive nested-slot handling.

For expression evaluation and folding, share child traversal where the node algebra permits it. Preserve lazy branches and fallbacks, evaluation errors, domain validation and dependency traces; a generic eager traversal would change semantics. Keep exported constructor/evaluator functions and their identities intact.

Retain the independently built core graph and canonical compatibility/focused feature ownership. Minification may be combined with measured semantic reductions in the theme build groups, with source readability maintained in TypeScript. Admit it only as part of a complete passing candidate; minification alone remains rejected. No feature or diagnostic is removed to meet a byte target, and no runtime implementation is hidden in an external package or dynamically loaded outside the graph audit.

Run deterministic ESM/CJS graph screens during development. If the complete semantics-preserving runtime candidate cannot meet all four existing graph ceilings, reject the batch before costly native acceptance. Smaller source files or approximate mapped-byte reductions are not admission evidence.

## Compiler candidate: reuse text, repeat evaluation

Cache only Vanilla Extract's compiled source text and immutable compiler-input metadata. Each transform still evaluates that source and performs capture, native lowering, diagnostics, explanations, manifest work and emission. Do not cache evaluated exports, native results, authoring side effects or failures. Ambient reads and authoring side effects must occur as they do in the fresh path.

Use an internal bounded memo with at most 16 entries globally, an 8 MiB aggregate UTF-8 payload cap, and a 1 MiB per-entry payload cap. Charge source text and serialised retained metadata; these are payload bounds, not a claim about JavaScript heap bytes. Oversized, unsupported or uncertain inputs use the existing fresh path. Evict least recently used entries deterministically. Own no esbuild contexts, watchers, timers, worker processes or disposal hooks; retain no in-flight cache entry after failure. A private harness can disable reuse for independent fresh controls without adding a public option.

A hit requires the same canonical project/entry identity, compiler artifact and tool versions, effective compilation options, package scope, debug-ID mode, and compile-relevant environment. Verify source contents and canonical paths for **every** bundled metafile input, including `node_modules` and `dist`; authored-only dependency receipts are insufficient. Include configuration/extends chains, lockfiles, package manifests, logical symlinks and negative resolution candidates. Never use mtime/size alone or a cached `require.resolve` result as identity.

Add a separate compiled-text admission proof rather than treating `ResolutionIdentity.cacheable` as sufficient. Existing receipts omit third-party/dist source contents and do not certify all of esbuild's resolution precedence. Reuse is limited to resolution forms for which the implementation can enumerate the complete decision witnesses; any unsupported import kind, candidate extension, package condition/exports form, configuration, dynamic/glob resolution or missing witness must select fresh compilation. Admission is structural and general, never based on benchmark fixture names or hashes. The implementation plan must specify this supported grammar before coding the memo.

Verify witnesses before accepting a hit and again before returning a transform. A drift invalidates the entry and invokes the existing bounded fresh/retry behaviour. Populate only after successful stable compilation. Preserve current restart-required diagnostics for package-scope or loaded-tool changes; do not convert them into silent cache hits. Concurrent calls must not share mutable metadata or let an older compilation overwrite a newer admitted identity.

## Parity and adversarial verification

Capture an immutable control built from the base source. Test the candidate against that independent control, rather than only against candidate code with its cache disabled.

- Characterise runtime exports, declaration compatibility, focused binding identity, both provider/hook import orders and synchronous descriptor resolution in ESM/CJS and genuine Node 22.0.0.
- Differentially compare values, frozen/result identity relationships, mutation effects, diagnostics and first-error timing. Add generated valid/invalid descriptor and expression cases, including side-effecting getters, proxies, symbols, sparse arrays, cycles, state constraints and extension permissions. Do not normalise away error or ordering differences.
- Compare compiler source, resolved inputs, native metadata, complete output and thrown diagnostics. Exercise unchanged input; entry/dependency edits; import removal/replacement/restoration; aliases and newly higher-priority candidates; symlink/export/configuration retargets; lock-only and installed bundled-source changes; errors and repair; two project roots; concurrent edits and capacity churn.
- Use actual matched Expo/Metro bundles for entry-edit/import-removal/restore and dependency/alias/symlink controls. Require fresh-reference parity, new value present and old value absent. Observe shutdown without global service termination. Prove authoring execution still occurs on hits and environment changes are not hidden.
- Run cache tests with isolated dependency copies. Never edit shared user-installed dependencies or reuse candidate/control processes where that would hide module-cache differences.

## Final admission and one-batch delivery

After correctness and deterministic graph screens pass, run build, all relevant type/contract/property tests, the full repository check, packed-consumer ESM/CJS/types and production iOS/Android/web Metro exports. Dogfood existing Storybook journeys on the Simulator/emulator only after the candidate is eligible. Use an owned isolated Simulator and emulator; physical devices remain deferred.

Collect the full 21-row host gate serially on the exact approved M4 Pro host, Node 22.0.0/24.15.0 and pinned Expo 56.0.4/Metro 0.84.4 scaffold. Include receipt validation and all full-transform work in timings; retain the existing warmup, repetitions and fixture selector. Do not time only a cache hit helper, mix cohorts or discard unfavourable runs. Registry/baseline integrity and `release:check` must pass against the same source and artifact identities. Keep whole-registry readiness and live Actions runner verification separate.

Accept production changes only if all 21 rows pass with no incomplete comparisons and all behavioural checks pass. Retain raw reports, hashes, exact candidate diff, control identity and an offline derivation/verification packet. Record measured import-plus-first-use behaviour as a diagnostic guard against shifting work outside the import timer; it does not replace an approved metric.

On any unsolved semantic, graph or timing failure, retain a precise assessment and reproducible private evidence, remove the entire candidate from shipping source, and leave publication blocked. Do not ship one passing portion as an extra remediation slice without a separate user decision. No push or publication belongs to this batch.

Once this written design is approved, prepare one inline implementation plan covering the entire batch. After qualification, make one production commit and recommend the next numbered roadmap item. If feasibility fails, make one evidence-only commit and state which unchanged contract prevents admission.
