# M10.5 Profile-First Runtime Diagnosis Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Determine whether the current theme/core and compatibility theme initialization and emitted-graph failures have a behavior-preserving, Crumbs-owned source optimization target, without changing production runtime code.

**Architecture:** Add a Bun-driven diagnostic harness that profiles fresh Node processes around only ESM/CJS module loading, then maps frames through a source-map-enabled scratch build that uses the existing tsdown runtime entry configuration. Keep both diagnostic builds and raw CPU profiles under /private/tmp. Run the unchanged host-budget suite against the default unminified build as the threshold authority. Commit only the harness, its tests, and an evidence-backed assessment/roadmap update. If profiles reveal a narrow candidate, test it only as a disposable scratch A/B; do not port production changes in this slice.

**Tech Stack:** TypeScript, Bun, Node inspector CPU profiler, Node's built-in SourceMap API, tsdown, the existing theme runtime contracts and M10.5 host-budget harness.

**Spec:** [M10.5 Profile-First Runtime Diagnostic Design](../specs/2026-10-02-m10-5-profile-first-runtime-design.md)

## Global Constraints

- Preserve every public value and type export, synchronous behavior, diagnostic, and import path. Do not change package runtime source, build defaults, declaration output, compiler behavior, budget policy, thresholds, baselines, workload identities, or registry membership.
- Profile only theme/core and compatibility theme, in ESM and CJS, on exact Node v22.0.0 and the current Node executable recorded at run time. Use one excluded warmup plus fifteen retained fresh-process samples for each of the eight runtime/format/entry combinations.
- Start the profiler after the child harness is ready and stop it immediately after module loading. Run the existing resolveThemeTokens behavior receipt after the timed region.
- Treat CPU profiles, mapped source spans, source-map build bytes, and profiled timings as diagnostic only. The unchanged, uninstrumented host-budget suite on the default build remains the only host threshold comparison.
- Reuse the entry maps, output target, shims, and runtime dependency policy from packages/css/tsdown.config.ts. Emit all source-map-enabled artifacts to scratch storage, and map default-build frames only when the diagnostic and default generated files match after removing sourceMappingURL comments. If parity or mapping is absent, retain the frame as unattributed.
- Report loader, parse/compile/link, and profiler-overhead samples only when the profile directly supports that classification; otherwise use unattributed. Do not infer parse time by subtracting sampled frames from total import timing.
- If a source target is considered for follow-up, require repeated Crumbs-owned profile evidence and a disposable, behavior-preserving A/B against the same baseline source revision using uninstrumented ESM/CJS graph and host-budget runs. A profile hotspot alone is not an approved optimization.
- Keep Metro/editor comparability and native, visual, accessibility, Android, and release-device gates separate. Do not claim M10.5 is complete.
- Preserve unrelated untracked worktree entries and the dirty primary checkout. Do not store raw CPU profiles or scratch maps in the repository; use /private/tmp.

## Review Focus

- Does the timed interval contain only dynamic import or require of the selected built entry, with harness setup and behavior receipts outside it?
- Are all eight scenarios sampled in fresh processes with exact runtime identity, one excluded warmup, and fifteen retained profiles?
- Can a default emitted file be mapped only when its normalized generated content matches the corresponding diagnostic file?
- Are missing, unmapped, Node-internal, and profiler-related frames classified conservatively without invented source attribution?
- Does the committed assessment keep source maps, CPU profiles, exact host-budget comparisons, and native/device gates distinct?
- Does any proposed follow-up satisfy the unchanged public behavior and validation contract before it is called an eligible optimization target?

---

### Task 1: Add the isolated theme runtime profiling harness

**Files:**
- Create: packages/css/bench/runtime-import-profile.ts
- Create: packages/css/test/runtime-import-profile.test.ts
- Create: scripts/profile-theme-runtime.ts
- Modify: package.json

**Interfaces:**
- Consumes: the existing emitted theme-core.mjs/.cjs and theme.mjs/.cjs entries, the two matching configurations from packages/css/tsdown.config.ts, and the exact Node v22.0.0 plus current Node executable.
- Produces: raw per-process CPU profiles, a run manifest, and a conservative mapped-frame summary under a newly created /private/tmp directory. No output is admitted into budgets.json.

- [ ] **Step 1: Specify the analyzer contracts with fixture tests.**

Add focused tests for profile-sample aggregation, mapping a generated frame to its original source and line, and preserving a frame as unattributed when a map is absent or the position has no mapping. Cover supported Node-loader classification separately from generic Node-internal frames. Use small synthetic profile and source-map fixtures; do not test implementation by duplicating the same code path.

- [ ] **Step 2: Run the new tests and verify they fail for missing analyzer behavior.**

From the repository root, run:

    bun test packages/css/test/runtime-import-profile.test.ts

Expected: FAIL because the analyzer module and its aggregation/mapping contracts do not exist.

- [ ] **Step 3: Implement the analyzer and fresh-process profiler runner.**

Implement the pure aggregation and conservative frame-classification helpers in packages/css/bench/runtime-import-profile.ts. Add scripts/profile-theme-runtime.ts to read the actual theme-core and compatibility-theme configs from the existing tsdown configuration, build a source-map-enabled scratch copy into /private/tmp, and profile the default unminified entries without overwriting dist.

For every runtime, format, and entry combination, launch a fresh child process for one warmup and fifteen retained samples. Enable CPU profiling only after harness setup, bracket only module loading, save each raw profile under /private/tmp, and run the resolveThemeTokens behavior receipt after profiling stops. Use the built-in Node SourceMap API; do not add a runtime or development dependency.

Before mapping default-build frames, compare corresponding default and diagnostic generated files after removing only their sourceMappingURL comment. Refuse source attribution for files that do not match. Record source revision, exact executable/version, build-tool versions, entry/artifact hashes, profile hashes, sampling protocol, and map-parity results in the temporary manifest. Keep diagnostic durations visibly separate from the host-budget data.

Add a root package script named profile:theme-runtime that invokes the runner.

- [ ] **Step 4: Run the analyzer and package checks.**

Run the focused profile test, package typecheck, complete package tests, and package build:

    bun test packages/css/test/runtime-import-profile.test.ts
    bun run --filter @opsydyn/crumbs-css typecheck
    bun run --filter @opsydyn/crumbs-css test
    bun run build

Also run git diff --check. Confirm the runtime package source and tsdown defaults are unchanged.

- [ ] **Step 5: Commit the harness slice.**

Commit only the test, analyzer, runner, and root script change as:

    feat(bench): add theme runtime profiling harness

Keep unrelated worktree entries out of the commit.

### Task 2: Run the diagnostic matrix and retain the M10.5 assessment

**Files:**
- Create: docs/assessments/2026-10-02-m10-5-source-profile.md
- Create: docs/evidence/2026-10-02-m10-5-source-profile/profile-summary.json
- Create: docs/evidence/2026-10-02-m10-5-source-profile/host-budgets/ (raw unchanged host-suite reports)
- Modify: docs/roadmap.md

**Interfaces:**
- Consumes: Task 1's committed profiler harness, the default unminified package build, unchanged M10.5 budgets and baselines, and the existing host-budget command.
- Produces: a reproducible profile summary and assessment that distinguishes mapped source evidence, uninstrumented host-budget results, and unresolved gates. Raw CPU profiles and scratch source maps remain in /private/tmp.

- [ ] **Step 1: Build the default package and run the profile matrix.**

Run bun run build, then run:

    bun run profile:theme-runtime

Verify that Node v22.0.0 is exactly the declared floor and that the current Node executable/version are captured from the environment. Confirm each of the eight combinations has one warmup plus fifteen retained child-process profiles, every behavior receipt passes, raw profiles and scratch maps remain under /private/tmp, and attribution is withheld when generated-file parity or source mapping fails.

- [ ] **Step 2: Run the unchanged uninstrumented host-budget suite.**

Run the existing suite against the default unminified build, retaining all reports at the evidence path:

    CRUMBS_AUDIT_NODE_FLOOR=/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node bun run measure:host-budgets docs/evidence/2026-10-02-m10-5-source-profile/host-budgets

This suite includes the existing runtime graph and initialization comparisons, Metro direct-edit run, native-style benchmarks, and editor measurements. Preserve failures, incomplete comparisons, or environment blocks as returned; do not alter thresholds or substitute profiled measurements.

- [ ] **Step 3: Evaluate any repeated source-level candidate conservatively.**

If repeated mapped profiles identify a narrow Crumbs-owned target, test at most one behavior-preserving candidate as a disposable scratch A/B from the same baseline source revision. Run the relevant contract tests and the unchanged uninstrumented ESM/CJS graph and host-budget harness against the candidate. Do not edit or commit production runtime source. If no narrow candidate exists, or the scratch A/B cannot satisfy the existing behavior and comparison protocol, record that no eligible optimization target was established.

- [ ] **Step 4: Write the assessment, summary, and roadmap update.**

The assessment must include source revision and source hashes, Node/build-tool identity, default and diagnostic artifact hashes, normalized generated-file parity, raw profile hashes and scratch directory, sample protocol, mapped call-frame counts and top Crumbs-owned locations, explicitly unattributed samples, behavior receipts, and the uninstrumented host-budget outcome. State whether a source candidate passed the scratch A/B or why none was established. Do not infer parse/link duration, compare diagnostic bytes/timings with thresholds, or claim device, native, accessibility, screenshot, or Android acceptance.

Update the current M10.5 roadmap entry with the measured result and the recommended next M10.5 slice. Keep Android/device gates and the M10.5 completion state unchanged.

- [ ] **Step 5: Validate the evidence and documentation.**

Run:

    bun run budgets:validate
    bun run guarantees:check
    bun run docs:build
    git diff --check

Review every retained host report and profile-summary value against its source file before recording conclusions. If a command is blocked or incomplete, preserve that exact status in the assessment rather than weakening the gate.

- [ ] **Step 6: Commit the evidence slice.**

Commit only the assessment, profile summary, host-budget evidence, and roadmap update as:

    docs: retain M10.5 source profile diagnosis

After this commit, report the observed M10.5 result and recommend the next numbered M10.5 slice. Do not begin that next slice without the user's direction.
