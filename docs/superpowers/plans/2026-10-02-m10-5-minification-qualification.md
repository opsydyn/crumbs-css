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
- Modify: `scripts/packed-runtime-graph.ts`
- Test: `packages/css/test/packed-runtime-graph.test.ts`
- Modify: `packages/css/test/runtime-isolation.test.ts`
- Temporarily modify: `packages/css/tsdown.config.ts` (candidate build only; restore before commit)
- Create: `docs/evidence/2026-10-02-m10-5-minification/` (qualification reports and summary)
- Modify: `docs/roadmap.md` (record the result and next M10.5 slice)

**Interfaces:**
- Consumes: Task 1's corrected `readEmittedGraph`, the current production ESM/CJS entry groups, packed-consumer check, approved M10.5 budgets, and the exact Node v22.0.0 executable.
- Produces: retained minified-candidate evidence with every comparison labeled against the unchanged thresholds and workload identities; no default minification or budget-registry change unless all relevant approved gates pass.

- [x] **Step 1: Temporarily enable minification for each JavaScript artifact group.**

Set `minify: true` on the existing theme, theme-core, tool, and devtools JavaScript configurations only. Leave the declaration-only configuration and all entry maps unchanged.

- [x] **Step 2: Add a failing regression for the minifier-renamed Metro loader.**

Extend `packed-runtime-graph.test.ts` with a minified-shape transformer fixture whose local identifier is initialized from `config.upstreamTransformerPath`, plus negative fixtures for a different identifier, wrong property origin, a shadowed binding, and reassignment. Run from `packages/css`: `bun test test/packed-runtime-graph.test.ts`.
Expected: FAIL because the currently admitted source-level name is `upstreamPath` and the minified fixture calls `require(a)`.

- [x] **Step 3: Preserve the strict allowlist through identifier mangling.**

Resolve the call argument to its actual lexical symbol. Match a minified identifier only when that symbol has one local variable declaration initialized from the exact `upstreamTransformerPath` property and no writes, while the existing transformer importer/subpath/format/callee constraints match. Keep the canonical exception result as `upstreamPath`; do not allow arbitrary identifiers or relax the other dynamic-loader checks. Run `bun test test/packed-runtime-graph.test.ts`.
Expected: the minified-shape fixture is admitted, the different-identifier fixture remains rejected, and all packed graph audit tests pass.

- [x] **Step 4: Use the AST graph scanner for runtime-isolation checks.**

Replace the quote-only regex graph helper in `runtime-isolation.test.ts` with the shared `readEmittedGraph` audit. Run `bun test test/runtime-isolation.test.ts`.
Expected: all runtime-isolation checks pass on minified ESM/CJS outputs, including the React external boundary.

- [x] **Step 5: Commit the minified graph-audit correction.**

Run `git diff --check` and commit `scripts/packed-runtime-graph.ts`, `packages/css/test/packed-runtime-graph.test.ts`, `packages/css/test/runtime-isolation.test.ts`, and this plan as `fix: audit minified runtime graphs`.

- [x] **Step 6: Run API, package, and packed Expo/Metro gates serially.**

Run from the repository root, in order: `bun run build`, `bun run typecheck`, `bun run test`, `bun run playground:packed --check`.
Expected: all commands pass against minified artifacts; do not run the package tests concurrently with the packed check because the packed check rebuilds `dist`.

- [x] **Step 7: Run the exact host-budget suite against the minified package outputs.**

Run from the repository root with `CRUMBS_AUDIT_NODE_FLOOR=/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node`: `bun run measure:host-budgets docs/evidence/2026-10-02-m10-5-minification/host-budgets`.
Expected: retain the full suite report and comparison even if an unchanged approved budget fails or a comparison is incomplete; do not alter thresholds, baselines, or workload identifiers to produce a pass.

- [x] **Step 8: Record qualification and restore the normal package build.**

Write a concise evidence summary with measured entry graphs, runtime comparisons, API/packed checks, exact host-suite statuses, and limitations. If any approved gate fails, leave minification out of the default config and M10.5 open. Restore `tsdown.config.ts`, rebuild the unminified package, and run `bun run budgets:validate`, `bun run docs:build`, and `git diff --check`.

- [x] **Step 9: Commit the qualification evidence.**

Commit only the retained minification evidence, roadmap update, and plan progress as `docs: record M10.5 minification qualification`.

- [x] **Step 10: Close review findings on the Metro loader exception.**

Resolve the loader argument to its TypeScript lexical symbol; accept only a single variable declaration initialized from `upstreamTransformerPath` with no writes. Add real packed-graph regressions for a wrong canonical-name origin, a shadowed binding, and reassignment. Confirm each new rejection test fails before the matcher change.

- [x] **Step 11: Requalify and correct retained evidence.**

Re-run the minified build, package typecheck, and packed Expo/Metro check with the hardened audit, then restore the unminified build and rerun build, typecheck, full tests, budget validation, docs build, and diff checks. Correct the patch digest and retain the packed check log in the evidence commit.
