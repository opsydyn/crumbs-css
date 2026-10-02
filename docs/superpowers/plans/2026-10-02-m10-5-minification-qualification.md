# M10.5 Minified Package Qualification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct static module-path discovery in the emitted-graph audit and qualify a minified build of the existing package entry groups against current API, package, Expo/Metro, and host gates.

**Architecture:** Teach the AST graph scanner to follow no-substitution template literals in dynamic-import/require calls while continuing to report interpolated loads as nonliteral. Temporarily enable `minify: true` on the existing JavaScript output groups to build and test the real package artifacts. Keep minification out of the default build unless the exact unchanged budgets pass; retain evidence and restore the default build after qualification.

**Tech Stack:** TypeScript, Bun, tsdown, Node ESM/CJS, Expo/Metro, package export and performance-budget harnesses.

**Spec:** [M10.5 Runtime Footprint Remediation Design](../specs/2026-10-01-m10-5-runtime-footprint-design.md)

## Global Constraints

- Preserve every current value export, type export, runtime behavior, and import path from `@opsydyn/crumbs-css/theme` and `@opsydyn/crumbs-css/theme/core`.
- Preserve every current value export, type export, runtime behavior, and import path from `@opsydyn/crumbs-css/tokens` and all existing token subpaths.
- Keep synchronous APIs synchronous and keep React Native, Node ESM, and Node CJS behavior aligned.
- Preserve all approved budget thresholds, recorded baselines, registry membership, and workload identities.
- Do not make platform-conditional export maps or introduce Node-only lazy loading into React Native runtime paths.
- Do not claim tree-shaking or consumer bundle savings from source splitting or package build output alone.
- Do not publish the package or claim device, rendering, accessibility, screenshot, or release-device acceptance from host and Metro checks.

## Review Focus

- CJS `require`/`__require` and dynamic `import()` calls with a relative no-substitution template-literal path must include the child artifact and count no nonliteral load; the scanner regression test owns this case.
- CJS `require`/`__require` with an external no-substitution template-literal path must report the external, while an interpolated template remains nonliteral; the scanner regression test owns both cases.
- Minified ESM and CJS artifacts must retain the exact public runtime and declaration surfaces; public API tests and package typecheck own this case.
- Exports shared by compatibility and focused theme entries must retain reference identity in both formats; manifest export tests own this case.
- The packed Expo/Metro graph and exact Node 22.0.0/current-Node host comparisons must retain their existing external and workload contracts; the packed consumer and host-budget runs own these cases.

---

### Task 1: Follow static template-literal module paths in graph audits

**Files:**
- Modify: `packages/css/bench/effect-boundary-audit.ts`
- Test: `packages/css/test/effect-boundary-build.test.ts`
- Create: `docs/superpowers/plans/2026-10-02-m10-5-minification-qualification.md`

**Interfaces:**
- Consumes: exported `readEmittedGraph(entry: string)` and its current result fields `files`, `externals`, `bytes`, and `nonliteralLoads`.
- Produces: the same audit API, with local and external module specifiers accepted when represented by `StringLiteral` or `NoSubstitutionTemplateLiteral`; interpolated expressions remain counted as nonliteral.

- [x] **Step 1: Add a regression test for minified-style CJS loads.**

Add a test that writes CJS source with `__require` calls for a relative child and `react`, a dynamic `import()` for a second relative child, and an interpolated template in another `__require` call. Use no-substitution template literals for the first three paths. Assert both child files are traversed, `react` is reported as external, and exactly one interpolated load is counted as nonliteral.

- [x] **Step 2: Run the test and confirm it exposes the scanner bug.**

Run from `packages/css`: `bun test test/effect-boundary-build.test.ts`.
Expected: FAIL because the scanner returns only `entry.cjs`, omitting both relative template-literal children.

- [x] **Step 3: Implement the smallest AST-node acceptance change.**

Update `readEmittedGraph` to accept `ts.isNoSubstitutionTemplateLiteral` alongside `ts.isStringLiteral` for the first argument of dynamic import, `require`, and `__require` calls. Do not accept a `TemplateExpression` with substitutions as static.

- [x] **Step 4: Run the scanner regression and existing audit tests.**

Run from `packages/css`: `bun test test/effect-boundary-build.test.ts`.
Expected: PASS; the relative child is in `files`, `externals` is exactly `["react"]`, and `nonliteralLoads` is `1` for the interpolated template.

- [x] **Step 5: Commit the scanner slice.**

Run `git diff --check`, then commit the test, scanner fix, and this plan as `fix: scan static template literal module paths`.

### Task 2: Qualify minification on real package entry groups

**Files:**
- Temporarily modify: `packages/css/tsdown.config.ts` (candidate build only; restore before commit)
- Create: `docs/evidence/2026-10-02-m10-5-minification/` (qualification reports and summary)
- Modify: `docs/roadmap.md` (record the result and next M10.5 slice)

**Interfaces:**
- Consumes: Task 1's corrected `readEmittedGraph`, the current production ESM/CJS entry groups, packed-consumer check, approved M10.5 budgets, and the exact Node v22.0.0 executable.
- Produces: retained minified-candidate evidence with every comparison labeled against the unchanged thresholds and workload identities; no default minification or budget-registry change unless all relevant approved gates pass.

- [ ] **Step 1: Temporarily enable minification for each JavaScript artifact group.**

Set `minify: true` on the existing theme, theme-core, tool, and devtools JavaScript configurations only. Leave the declaration-only configuration and all entry maps unchanged.

- [ ] **Step 2: Build and verify public API, package, and packed Expo/Metro behavior.**

Run from the repository root: `bun run build`, `bun run typecheck`, `bun run test`, and `bun run playground:packed --check`.
Expected: all commands pass; package API and ESM/CJS identity checks remain green, and the packed Expo/Metro check completes against the minified `dist` artifacts.

- [ ] **Step 3: Run the exact host-budget suite against the minified package outputs.**

Run from the repository root with `CRUMBS_AUDIT_NODE_FLOOR=/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node`: `bun run measure:host-budgets docs/evidence/2026-10-02-m10-5-minification/host-budgets`.
Expected: retain the full suite report and comparison even if an unchanged approved budget fails or a comparison is incomplete; do not alter thresholds, baselines, or workload identifiers to produce a pass.

- [ ] **Step 4: Record qualification and restore the normal package build.**

Write a concise evidence summary with the measured entry graphs, runtime comparisons, API/packed checks, exact host-suite statuses, and limitations. If any approved gate fails, explicitly leave minification out of the default config and M10.5 open. Restore `tsdown.config.ts`, rebuild the unminified package, run `bun run budgets:validate`, `bun run docs:build`, and `git diff --check`.

- [ ] **Step 5: Commit the qualification evidence.**

Commit only the retained minification evidence, roadmap update, and any final plan/ledger progress as `docs: record M10.5 minification qualification`.
