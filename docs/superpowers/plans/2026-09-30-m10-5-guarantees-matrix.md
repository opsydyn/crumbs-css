# M10.5 Guarantees Matrix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use TDD and verification instructions for every code change.

**Goal:** Publish a versioned, evidence-linked reference for Crumbs CSS support and measured outcomes, while keeping incomplete budgets and unavailable platform checks visibly incomplete.

**Architecture:** A strict Effect Schema v1 JSON contract is the source of truth. A small repository-local CLI validates contract and evidence references, then deterministically renders the public MDX page or checks it for drift. Existing repository, package, and budget gates remain authoritative; a retained receipt binds their results to source revision, environment, commands, artifacts, and hashes. No new runtime API, runtime dependency, budget threshold, umbrella qualification runner, or publication step is introduced.

**Tech Stack:** Bun, TypeScript, Effect 4 Schema, existing `makeDataCodec`, repository performance-budget registry, Expo / React Native consumer checks, Astro and Starlight documentation build.

**Spec:** [M10.5 Guarantees Matrix Design](../specs/2026-09-30-m10-5-guarantees-matrix-design.md)

## Global Constraints

- Do not add or change React Native styling APIs, runtime dependencies, compiler behavior, or package exports.
- Do not automatically approve budgets, select thresholds from observed maxima, or treat host measurements as Hermes or device measurements.
- Do not infer unsupported behavior from absent tests, missing evidence, a skipped command, or an unavailable device.
- Do not claim WCAG conformance, universal React Native compatibility, visual fidelity, or device performance from static review, contract stories, web exports, or host tests.
- Do not unpark Android, publish a package, deploy the documentation site, or record device/screen-reader acceptance without the corresponding environment and evidence.
- Keep contract support separate from measurement status. Test presence alone cannot establish support or a guarantee.
- Use only the seven required domains and status vocabularies in the approved spec. Unsupported rows require an explicit contract or policy reference.
- Reject unsupported schema versions, duplicate IDs, missing required domains, absolute or parent-relative paths, source references resolving outside the repository, evidence paths resolving outside `docs/evidence/`, mismatched evidence hashes, and stale generated documentation. Resolve filesystem references so symlinks cannot escape their permitted root.
- Require passed/failed evidence outcomes to agree with row status and evidence source revisions to equal the latest Git commit touching a path outside `docs/`. This lets docs-only qualification receipts preserve the measured source identity; a later change outside `docs/` makes those measurements historical. Historical evidence retains its original revision and must stay stale. Refuse generated-page paths or parents that resolve through symlinks.
- Preserve historical evidence with its original source revision and environment. Never relabel it as a current run.
- A passing host sample with a pending threshold is measured host evidence, not a performance guarantee.
- Keep simulator, physical-device, Android, screen-reader, visual-diff, and device-performance states independent. The current device and simulator limitations are environment observations, not unsupported product contracts.
- Keep M10.5 open while required gates remain incomplete; Android remains parked.
- Preserve the existing untracked local paths `apps/storybook/ios/`, `node_modules`, and `packages/css/node_modules`.
- Commit each implementation slice separately and recommend the next roadmap slice after each commit.

## Review Focus

- Can an absolute, traversal, symlink, or evidence-root escape be represented or accepted by the matrix validator?
- Can absent, stale, failed, or uncalibrated evidence render as a passing guarantee?
- Can a passed/failed row contradict its evidence outcome or use a historical source revision?
- Can the generated-page check or renderer follow a symlink outside its designated destination?
- Can a passing host measurement with a pending threshold be described as a performance guarantee?
- Are MDX-sensitive values escaped and repeated rendering byte-for-byte deterministic?
- Do historical receipts preserve their actual revision/environment and avoid being presented as current?
- Are unavailable simulator/device checks recorded as not-run without converting them into unsupported API claims or marking M10.5 complete?

---

### Task 1: M10.5.1 — Add the matrix contract, validator, and generated reference

**Files:**
- Create: `packages/css/src/tooling/guarantees-matrix/schema.ts` (internal, not exported from package entry points)
- Create: `scripts/guarantees-matrix/model.ts`
- Create: `scripts/guarantees-matrix/validate.ts`
- Create: `scripts/guarantees-matrix/render.ts`
- Create: `scripts/guarantees-matrix.ts`
- Create: `docs/guarantees/matrix.v1.json`
- Create: `docs/src/content/docs/reference/guarantees.mdx`
- Modify: root `package.json` with `guarantees:check` and `guarantees:render`
- Create: `packages/css/test/guarantees-matrix.test.ts`

**Interfaces:** Define `GuaranteesMatrix`, a stable row ID, the seven required domains (`compatibility`, `property`, `type-editor`, `package-runtime`, `documentation`, `visual`, and `device`), `supportStatus` (`supported`, `conditional`, `unsupported`, `unspecified`), and `measurementStatus` (`passed`, `failed`, `not-run`, `not-calibrated`, `stale`, `not-applicable`), plus `basis`, `evidence`, and optional existing-registry `budget` linkage exactly as specified. Evidence carries repository-relative artifact path, SHA-256, source revision, command, environment/version identity, structured `resultStatus` (`passed` or `failed`), descriptive result, and scope limit. Passed rows require all evidence outcomes to be passed; failed rows require at least one failed evidence outcome. Passed and failed measurements must match the latest Git commit touching a path outside `docs/`. Export `validateGuaranteesMatrix(matrix, repositoryRoot, currentSourceRevision)` returning structured issues, and `renderGuaranteesMatrix(matrix)` returning deterministic MDX. The CLI exposes `check` (strictly decode, validate references/hashes and current revisions, compare generated output) and `render` (write only the generated MDX to a symlink-checked destination). Use Effect 4 Schema and the existing data-codec boundary; do not export the contract as a runtime package API. Seed rows only from the approved inventory and existing records. Historical references must retain their historical revision/environment and remain stale; rows requiring new M10.5 runs start incomplete.

- [x] Write focused failing tests named `acceptsCompleteMatrix`, `rejectsUnknownVersionAndFields`, `rejectsDuplicateIdsAndMissingDomains`, `rejectsInvalidStatusCombinations`, `requiresBasisForUnsupported`, `rejectsAbsoluteTraversalWindowsSeparatorsAndSymlinkEscape`, `requiresEvidenceIdentityAndScope`, `detectsEvidenceHashMismatch`, `doesNotPromoteIncompleteEvidence`, `keepsPendingBudgetOutOfPerformanceGuarantees`, `escapesMdxAndPreservesDeclaredOrder`, `rendersByteIdentically`, and `checkDetectsStaleGeneratedMdx`. Assert that absent, stale, failed, not-run, and not-calibrated evidence never renders as a passed guarantee; a passed host sample with a pending budget remains explicitly non-guaranteed; historical evidence retains its revision/environment/scope; contradicting outcomes or revisions are rejected; and symlinked output cannot escape its destination.
- [x] Run `bun test packages/css/test/guarantees-matrix.test.ts` and confirm the new contract/renderer assertions fail before implementation.
- [x] Implement the strict Effect Schema model using the existing `makeDataCodec` validation behavior; add filesystem checks that resolve references beneath their permitted roots and verify evidence SHA-256 digests.
- [x] Implement stable-order MDX rendering with explicit escaping for all user-authored strings. Do not emit machine-specific absolute paths.
- [x] Add the curated v1 matrix and render the checked-in MDX from it; include all seven domains and explicit unsupported/not-run/not-calibrated distinctions without claiming fresh results.
- [x] Add `bun run guarantees:check`; verify it rejects invalid references and stale generated MDX and passes for the committed source/page pair.
- [x] Run `bun test packages/css/test/guarantees-matrix.test.ts`, `bun run guarantees:check`, and `bun run docs:build`; expected: all exit 0, with deterministic output and no generated-page diff after the check.
- [x] Run `git diff --check`, review the matrix claims against the spec, and commit as `feat(docs): add M10.5 guarantees matrix`.

**After this commit:** Recommend M10.5.2, the fresh host/package/type/editor/docs qualification run.

### Task 2: M10.5.2 — Capture current host, package, type, editor, and docs results

**Files:**
- Modify: `docs/guarantees/matrix.v1.json` and regenerate `docs/src/content/docs/reference/guarantees.mdx`
- Create: `docs/evidence/2026-09-30-m10-5-guarantees/qualification.json`
- Create: retained fresh host-budget/editor reports under `docs/evidence/2026-09-30-m10-5-guarantees/`
- Add tests only if needed to validate the receipt shape or prevent a status/evidence mismatch

**Interfaces:** The qualification receipt records source revision, host/runtime/tool versions, exact commands and exit outcomes, artifact paths and SHA-256 digests, budget-registry readiness, and explicit scope limits. Do not modify prior M10.4 evidence. Each matrix update must be supported by a current command result; a result from a different source revision remains historical.

- [ ] Capture the source revision and environment before running the gates. Retain raw output/artifacts needed to reproduce the receipt; exclude transient logs that carry machine-specific secrets or paths.
- [ ] Create `docs/evidence/2026-09-30-m10-5-guarantees/` for this run's reports and receipt; verify the target paths are new so no historical evidence is overwritten.
- [ ] Run `bun run check`; expected: build, package typecheck, CSS tests, and Storybook tests pass with zero failures.
- [ ] Run `bun run app:typecheck`; expected: exit 0.
- [ ] Run `bun run release:check`; expected: package build/typecheck/tests, native-style smoke check, and dry-run pack pass; this does not publish.
- [ ] Run `bun scripts/m9-2-manifest-check.ts --current packages/css/fixtures/m10-4-north-star/current.json --baseline packages/css/fixtures/m10-4-north-star/baseline.json --consumer packages/css/fixtures/m10-4-north-star/consumer.json --format json > docs/evidence/2026-09-30-m10-5-guarantees/manifest-compatibility-report.json`; expected report: one `token.alias-changed` warning, one `token.removed` error, and the declared-coverage analysis limits. The CLI's exit 1 is expected for this intentionally breaking fixture and demonstrates detector behavior; do not call it a package compatibility pass. If the normalized findings differ, record the discrepancy and investigate. Keep the result fixture-scoped; do not overwrite M9.2 or M10.4 evidence.
- [ ] Run `CRUMBS_AUDIT_NODE_FLOOR=22 bun scripts/measure-current-host-budgets.ts docs/evidence/2026-09-30-m10-5-guarantees/host-budgets`; retain the host reports with exact environment and hash. Do not interpret host timings as Hermes/device performance.
- [ ] Run `bun run measure:editor docs/evidence/2026-09-30-m10-5-guarantees/editor-scale.json 5`; record repetitions, TypeScript/tool versions, and raw reports. No approved editor threshold means no editor budget pass.
- [ ] Run `bun run budgets:validate`; expected: valid registry structure, while `registryReady` and performance qualification remain incomplete if pending thresholds/baselines/diagnostics remain.
- [ ] Run `bun run budgets:readiness`; if it exits non-zero because thresholds or baselines remain incomplete, record that exact incomplete result rather than changing thresholds or treating the gate as passed.
- [ ] Update only rows justified by these results; retain missing, stale, unsupported, and not-calibrated distinctions. Write the receipt and artifact hashes, regenerate the page, and confirm `bun run guarantees:check` passes.
- [ ] Run `bun run docs:build` and `git diff --check`; expected: exit 0. Review that host-only passes and pending budgets remain clearly non-guarantees.
- [ ] Commit as `test(css): record M10.5 host and package budgets`.

**After this commit:** Recommend M10.5.3, the visual/device disposition and roadmap status update.

### Task 3: M10.5.3 — Record visual/device disposition and honest roadmap status

**Files:**
- Modify: `docs/guarantees/matrix.v1.json` and regenerate `docs/src/content/docs/reference/guarantees.mdx`
- Modify: `docs/evidence/2026-09-30-m10-5-guarantees/qualification.json`
- Create: any directly captured visual/native evidence beneath `docs/evidence/2026-09-30-m10-5-guarantees/` (only when the relevant service/device is available)
- Modify: `docs/roadmap.md` M10.5 status and next action to match the verified matrix state

**Interfaces:** Keep separate rows for generated structural contract/accessibility stories, screenshot/image-diff coverage, simulator, physical device, Android, screen-reader, and device budgets. Record command, environment, artifact and hash for every run. If a gate cannot run, use `not-run` with the observed reason and leave M10.5 unchecked while it is required.

- [ ] Run `bun run --filter @crumbs/storybook contracts:check` and `bun run --filter @crumbs/storybook accessibility:check`; `bun run check` also runs their test suites. Record this as structural/story coverage only, not screenshot or native accessibility acceptance.
- [ ] Probe simulator availability once with `xcrun simctl list devices booted`; if CoreSimulatorService or runtimes are unavailable, preserve the exact failure and do not retry indefinitely. Run visual/native checks only in an available, named target environment.
- [ ] Record simulator, physical-device, Android, screen-reader, and device-budget outcomes independently. Keep Android parked and physical-device acceptance not-run until a device is available; do not infer unsupported API status from those constraints.
- [ ] Update matrix and receipt with direct evidence hashes or `not-run` dispositions, then regenerate and verify using `bun run guarantees:check` and `bun run docs:build`.
- [ ] Update only the M10.5 roadmap status and next action. Mark complete only if every required budget/platform gate is directly satisfied under the approved criteria; otherwise leave open and name the next environment/evidence needed.
- [ ] Run `git diff --check`, review each published claim against its attached evidence, and commit as `docs: record M10.5 visual and device disposition`.

**After this commit:** Recommend the remaining M10.5 device/native visual gate when its environment is available if the roadmap item remains open; otherwise recommend the next unchecked roadmap item from `docs/roadmap.md`.

## Final self-review

- The three implementation tasks map one-to-one to the M10.5.1, M10.5.2, and M10.5.3 slices in the approved spec.
- Every code or evidence change has a named validation command, expected interpretation, commit, and next-slice recommendation.
- The plan explicitly preserves the no-threshold/no-runtime-API boundary and records missing hardware as incomplete evidence.
- The plan does not mutate or overwrite the historical M10.4 report and preserves unrelated untracked local paths.
- No implementation begins until the user reviews and approves this plan.
