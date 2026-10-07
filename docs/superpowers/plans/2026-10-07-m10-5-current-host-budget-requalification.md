# M10.5 Current-Checkout Host Budget Requalification and Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Requalify the existing host-budget gates against current `main` and remediate only confirmed failures without changing approved limits, baselines, public APIs, or historical evidence.

**Architecture:** Preserve prior measurements and collect the full existing 21-metric suite into a new dated evidence directory. Bind the run to current source and built-artifact identities, exact Node v22.0.0 floor, configured current Node v24.15.0, and the existing comparator. Investigate each current failure or mismatch; any code or harness change must have a focused failing regression test and pass the unchanged full gate before it is retained.

**Tech Stack:** Bun 1.4.2, Node v22.0.0, Node v24.15.0, TypeScript, existing Crumbs host-budget and evidence-verification scripts.

**Spec:** `docs/roadmap.md` M10.5 current-checkout host remediation item; existing approved metrics in `packages/css/bench/budgets.json` and the consumer-evidence policy in `docs/assessments/2026-10-06-m10-5-target-policy.md`.

## Global Constraints

- Keep the 21 recorded metrics, approved thresholds, baselines, allowed regressions, and enforcement unchanged.
- Use the exact installed Node v22.0.0 binary for the floor and current Node v24.15.0 for the configured runtime.
- Retain source, artifact, toolchain, dependency, and environment identities before and after each collection.
- Preserve all historical reports and collect into `docs/evidence/2026-10-07-m10-5-current-host-budget-requalification/`.
- Do not change public API semantics, production dependencies, or physical-device scope; all physical-device work remains deferred.
- Do not count environment-mismatched observations as passes or replace a baseline to make a failure disappear.
- Commit the complete M10.5 slice once, after verification and independent review.

## Review Focus

- Exact Node floor identity: verify v22.0.0 and its executable hash before collection.
- Current-runtime identity: bind Node v24.15.0 and Bun/toolchain versions to the report.
- Metro identity: compare Expo, Metro, React Native, cache, fixture, and source identities; keep any mismatch incomplete.
- Benchmark protocol: preserve cwd, ordering, warm/cold semantics, and report provenance against each approved baseline.
- Source and artifact continuity: prove current source and built package artifacts did not drift during collection.

---

### Task 1: Collect a fresh current-checkout host-budget qualification

**Files:**
- Create: `docs/evidence/2026-10-07-m10-5-current-host-budget-requalification/host-budgets/`
- Create: `docs/evidence/2026-10-07-m10-5-current-host-budget-requalification/qualification.json`
- Create: `docs/evidence/2026-10-07-m10-5-current-host-budget-requalification/README.md`

**Interfaces:**
- Consumes: `scripts/measure-current-host-budgets.ts`, the checked-in registry/baselines, Node v22.0.0, and configured Node v24.15.0.
- Produces: a source-pinned report for the current checkout, with a distinct status for pass, fail, and incomplete metrics.

- [x] **Step 1: Verify preflight identity and capacity.** The measured clean clone was based on `3db9ac7`; exact Node v22.0.0 and Node v24.15.0 identities, Bun 1.4.2, disk capacity and free localhost port 8093 were verified. The managed worktree source-content SHA matches the report.
- [x] **Step 2: Build and collect the unchanged host suite.** A frozen clean install passed `bun run check` and rebuilt the package before the unchanged host collector ran with the exact Node 22 floor and verified Metro port 8093.
- [x] **Step 3: Validate collection identity.** The final report retains 21 metrics and identical before/after source and 145 artifact identities. It reports 11 pass, nine fail and one incomplete; `performanceQualified` remains false.

### Task 2: Diagnose and remediate only confirmed current failures

**Files:**
- Modify only the relevant runtime, benchmark, or harness source if an isolated cause is demonstrated.
- Test: the owning package or harness test for each code change.
- Update: the dated evidence assessment and qualification record.

**Interfaces:**
- Consumes: Task 1 reports and existing baselines; historical triage is context only.
- Produces: a focused, regression-tested remediation candidate or a documented evidence-backed unresolved gate.

- [x] **Step 1: Classify every metric.** The assessment records all nine failures, the Metro environment mismatch, exact current medians, baselines and deltas, and distinguishes this run from earlier contaminated or incomplete attempts.
- [x] **Step 2: Trace each proposed fix to a measured cause.** Clean-install dependency and consumer-fixture gaps were corrected with regression coverage. Runtime graph growth is attributed to accumulated theme capabilities, but no isolated, safe production optimization was established; no speculative runtime change was made.
- [x] **Step 3: Keep Metro and other incomplete workloads incomplete until identities match.** The 5.20% observed rebuild delta is retained as incomplete because Expo/Metro differ from the approved baseline. No baseline or threshold changed.
- [x] **Step 4: Rebuild and rerun affected gates plus the full 21-metric suite.** The fresh clean build and full repository check passed; all host outcomes remain explicit and tied to stable source/artifact identities.

### Task 3: Publish the requalification result and close the slice

**Files:**
- Create: `docs/assessments/2026-10-07-m10-5-current-host-budget-requalification.md`
- Modify: `docs/roadmap.md`
- Modify: this plan's completed checkboxes.

**Interfaces:**
- Consumes: final current-checkout report and retained historical evidence.
- Produces: an auditable result and the next numbered M10.5 recommendation.

- [x] **Step 1: Verify evidence hashes and machine-readable qualification.** The final report's source and artifact identities were independently compared; all final numbers in `qualification.json` come from `comparison.json`.
- [x] **Step 2: Update the roadmap.** The latest M10.5 entry records all 21 outcomes, keeps thresholds unchanged and physical-device work deferred.
- [x] **Step 3: Run repository checks, inspect exact staged paths, and obtain independent review.** `bun run check`, `bun run budgets:validate`, targeted regressions and `git diff --check` passed; independent review found no Critical or Important issues. The staged file list is restricted to this M10.5 slice.
- [x] **Step 4: Commit the complete slice once.** Commit the complete requalification record after review and verification, then recommend the next numbered M10.5 item.
