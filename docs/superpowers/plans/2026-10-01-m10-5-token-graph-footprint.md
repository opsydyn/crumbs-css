# M10.5 Token Runtime Graph Footprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce duplicated token-path encoding in the published token runtime graph without changing token identities, visibility, aliases, or public APIs.

**Architecture:** Keep `@opsydyn/crumbs-css/tokens` and its full current export set intact. The bounded optimization candidate is duplicated length-prefixed path encoding shared by token identity signatures and domain path indexes; triage identifies growth in the domains and identity artifacts but does not isolate this candidate's byte contribution. Prove equivalence with property-based tests, then measure the packed ESM/CJS graph against unchanged M4.6 limits and retain a failure if the change is not sufficient.

**Tech Stack:** TypeScript, Bun, fast-check, tsdown, Node ESM/CJS.

**Spec:** [M10.5 Runtime Footprint Remediation Design](../specs/2026-10-01-m10-5-runtime-footprint-design.md)

## Global Constraints

- Preserve every current value export, type export, runtime behavior, and import path from `@opsydyn/crumbs-css/theme` and `@opsydyn/crumbs-css/theme/core`.
- Preserve every current value export, type export, runtime behavior, and import path from `@opsydyn/crumbs-css/tokens` and all existing token subpaths.
- Preserve token contract identity, public/private visibility, DTCG behavior, and nominal type relationships.
- Preserve all approved budget thresholds, recorded baselines, registry membership, and workload identities.
- Keep runtime token validation service-free and do not add Effect or another dependency to `@opsydyn/crumbs-css/tokens`.
- Do not make any existing API asynchronous or change token ID, CSS variable, alias resolution, or collision semantics.
- Do not report source reduction as a graph-size pass; use the packed ESM/CJS graph budget evidence.
- If the existing token graph ceilings still fail, retain the failure and keep M10.5 open.

## Review Focus

- Segment boundaries must remain unambiguous, including a slash inside one segment versus two adjacent segments; pin the expected length-prefixed string and property-check arbitrary paths in `packages/css/test/token-contract-identity.property.test.ts`.
- Contract and visibility signatures must remain order-independent; test the existing generated reorder laws in `packages/css/test/token-contract-identity.property.test.ts`.
- Aliases must continue inheriting visibility from their terminal definition and must preserve cycle/missing-target errors; test `packages/css/test/token-contract-identity.property.test.ts` and `packages/css/test/token-contract-aliases.property.test.ts`.
- Public token IDs and variable names must remain stable across evaluation order and Unicode path segments; assert generated length-prefixed IDs and a known `tokenVariableName` suffix in the focused encoder property.
- The package `tokens` export list and its no-Effect runtime boundary must remain unchanged; test `packages/css/test/public-api.test.ts`, `packages/css/test/runtime-isolation.test.ts`, and the packed graph report.

---

### Task 1: Share canonical token path encoding

**Files:**
- Modify: `packages/css/src/tokens/identity.ts`
- Modify: `packages/css/src/tokens/domains.ts`
- Modify: `packages/css/test/token-contract-identity.property.test.ts`
- Regression tests: `packages/css/test/token-domains.property.test.ts`, `packages/css/test/token-contract-aliases.property.test.ts`, `packages/css/test/token-contract-identity-types.ts`

**Interfaces:**
- Consumes: existing length-prefixed path encoding used by `tokenPublicId`, `tokenContractShapeSignature`, `tokenContractVisibilitySignature`, and the private `pathKey` index helper.
- Produces: internal `encodeTokenPath(path: ReadonlyArray<string>): string`, used by all those calculations and not re-exported from `tokens/index.ts` or the package API.

- [ ] **Step 1: Add the failing encoder properties.**

Import `encodeTokenPath` and `tokenVariableName` from `../src/tokens/identity`. Assert `encodeTokenPath(["color", "accent"]) === "5:color/6:accent"`, assert `encodeTokenPath(["a/b"]) !== encodeTokenPath(["a", "b"])`, and use fast-check to compare generated paths with `path.map(segment => `${segment.length}:${segment}`).join("/")`. Use a fixed seed and at least 100 runs. Also assert `tokenVariableName({owner: "acme", name: "foundation", version: 1}, ["😀"])` ends in `-01f600`, proving this refactor leaves variable-name encoding unchanged.

- [ ] **Step 2: Run the property test and confirm the helper is missing.**

Run from `packages/css`: `bun test test/token-contract-identity.property.test.ts`.
Expected: FAIL because `encodeTokenPath` is not yet exported from the internal identity module.

- [ ] **Step 3: Implement the minimal shared encoder and replace duplicate encoders.**

Implement `encodeTokenPath` as the existing length-prefix operation: `path.map(segment => segment.length + ":" + segment).join("/")`. Use it in `tokenPublicId`, `tokenContractShapeSignature`, `tokenContractVisibilitySignature`, and `domains.ts` path indexing. Keep contract-shape `=`, alias/fallback framing, public visibility suffix, ordering, variable-name encoding, and error messages unchanged.

- [ ] **Step 4: Run identity, token, alias, public API, and type checks.**

Run from `packages/css`: `bun test test/token-contract-identity.property.test.ts test/token-domains.property.test.ts test/token-contract-aliases.property.test.ts`; then from the repository root run `bun run typecheck` and `bun test packages/css/test/public-api.test.ts`.
Expected: PASS for generated path distinctions, order independence, visibility inheritance, alias resolution, collision checks, public export parity, and nominal token-brand types.

- [ ] **Step 5: Commit the output-equivalent refactor.**

Run: `git diff --check`
Expected: no whitespace errors. Commit as `refactor: share canonical token path encoding`.

### Task 2: Measure token ESM/CJS graph results without moving the budget

**Files:**
- Create: `docs/evidence/2026-10-01-m10-5-runtime-footprint/token-after/`
- Read: `docs/evidence/2026-10-01-m10-5-final/host-budgets/runtime-graph.json`
- Read: `docs/evidence/2026-09-21-m4-6-runtime-graph-split/graphs.json`
- Read: `packages/css/bench/budgets.json`

**Interfaces:**
- Consumes: current token graphs of 60,959 B ESM and 68,485 B CJS against unchanged limits of 56,013 B ESM and 63,308 B CJS, plus the retained M4.6 evidence.
- Produces: a post-change ESM/CJS graph report and per-artifact byte/hash inventory. Existing theme-core and theme compatibility metrics remain independently visible.

- [ ] **Step 1: Build and run required checks.**

Run from the repository root: `bun run check` and `bun run budgets:validate`.
Expected: PASS without changing budget thresholds, baselines, or registry membership.

- [ ] **Step 2: Measure emitted package graphs.**

Run: `bun run measure:runtime-graph-budgets docs/evidence/2026-10-01-m10-5-runtime-footprint/token-after`.
Inspect `runtime-graph.json` and `comparison.json` for the exact `tokens` ESM and CJS results, artifact bytes, and hashes. The command may exit nonzero for unchanged theme or theme-core failures; do not hide those failures.

- [ ] **Step 3: Record the token result and stop at the approved evidence boundary.**

Compare tokens only with the existing ceilings of 56,013 B ESM and 63,308 B CJS. State whether each passes or fails; do not infer React Native bundle size or runtime speed from the Node artifact graph. If either ceiling still fails, record the remaining delta and keep M10.5 open for separately justified optimization.

- [ ] **Step 4: Commit the measurement evidence.**

Run: `git diff --check`
Expected: no whitespace errors. Commit as `test: record M10.5 token graph results`.

The full M10.5 host-budget gate remains the last acceptance run after the remediation slices. It does not qualify device, screenshot, screen-reader, or release-device requirements.
