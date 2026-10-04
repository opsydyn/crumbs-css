# M10.5 Warm-Transform Identity Repair Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure warm transforms under the historical package-root working-directory protocol and compare them to the existing approved baseline only when that exact protocol is selected.

**Architecture:** Keep standalone benchmark behavior at its current fixture-root default. Add an explicit validated working-directory mode, have the full host-budget runner select the historical package-root mode, and normalize only that precise current protocol to the retained legacy identity. Keep raw host, fixture, and workload identity checks intact.

**Tech Stack:** Bun, TypeScript, `bun:test`, M10.5 budget comparison adapter.

**Spec:** `docs/assessments/2026-10-04-m10-5-host-budget-result-triage.md`; `packages/css/bench/PERFORMANCE_BUDGETS.md`.

## Global Constraints

- Preserve every approved threshold, baseline value, and registry entry.
- Keep the current fixture-root behavior as the standalone benchmark default.
- Run five sequential independent host benchmark repetitions and retain all identities.
- Treat host results as host evidence only; Android and device budgets remain separate.

## Review Focus

- Default mode must retain the fixture-root cwd and remain non-comparable with the legacy baseline.
- The explicit package-root mode must use package-root cwd for the timed warm transform and report that identity.
- The cold transform retains its fixture-root cwd; record cold/warm output parity, require parity when their cwd matches, and retain a differing-cwd mismatch as diagnostic evidence.
- Invalid mode values must fail before measurement rather than silently selecting a protocol.
- Comparator normalization must apply only to the exact documented package-root protocol; environment, fixtures, sampling, and other protocol changes must still fail closed.
- Raw benchmark source fingerprints must include the protocol helper and first-transform worker.
- Working-directory restoration must occur when a transform operation rejects.

---

### Task 1: Match the approved warm-transform measurement protocol

**Files:**
- Create: `packages/css/bench/benchmark-protocol.ts`
- Modify: `packages/css/bench/native-styles.bench.ts`
- Modify: `scripts/measure-current-host-budgets.ts`
- Modify: `packages/css/bench/budget-contract.ts`
- Test: `packages/css/test/benchmark-protocol.test.ts`
- Test: `packages/css/test/budget-contract.test.ts`
- Update: `packages/css/bench/PERFORMANCE_BUDGETS.md`
- Update: `docs/roadmap.md`
- Create: `docs/assessments/2026-10-04-m10-5-warm-transform-identity.md`
- Create: `docs/evidence/2026-10-04-m10-5-warm-transform-identity/`

**Interfaces:**
- Consumes: the recorded legacy ordering string `Sequential scenarios in listed order; warmup excluded; filesystem caches uncontrolled` and current benchmark reports with exact environment and fixture identities.
- Produces: `parseWarmTransformCwdMode(value)` and a comparison adapter that accepts only the exact explicit package-root warm-transform protocol.

- [x] Write tests for the default fixture-root mode, explicit package-root mode, invalid values, exact historical comparison normalization, and fail-closed behavior for a different cwd or changed fixture.
- [x] Run the focused tests and confirm the new package-root comparison case fails because the mode/parser/normalization is absent.
- [x] Implement the smallest mode selector; keep the default unchanged and make the M10.5 host runner explicitly select package-root mode.
- [x] Run focused tests and the package test suite; confirm the package-root protocol compares as exact while fixture-root and mutated identities remain incomplete.
- [x] Fresh-build the package and run the full exact Node v22.0.0 host-budget suite into the evidence directory, preserving limits and baselines.
- [x] Record the repaired warm-transform result and remaining comparison failures, update the M10.5 handoff, run documentation validation, and prepare the slice for commit.
