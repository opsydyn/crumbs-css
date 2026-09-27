# M9.2 Local Manifest Compatibility Checks Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add deterministic local and release-time compatibility checks for M9.1 manifests, including proven token consumers and private-token references.

**Architecture:** Keep manifest v1 unchanged and add a versioned report model, schema, and canonical encoder under the tooling-only manifest module. Implement pure contract comparison and consumer checking, then expose them through one explicit-file Bun command and the existing tooling entrypoint.

**Tech Stack:** TypeScript, Bun, Effect 4 Schema, fast-check, existing packed ESM/CommonJS/type qualification.

**Spec:** docs/superpowers/specs/2026-09-27-m9-2-manifest-compatibility-design.md

## Global Constraints

- Preserve manifest schema v1 and keep M9.2 reports in their own format and schema version.
- Compare only explicitly supplied baseline, current, and consumer manifests; do not crawl source files or infer dynamic use.
- Attribute consumers only through stable dependency edges in supplied manifests; report component slot/variant usage as unavailable.
- Use Effect 4 Schema at the tooling boundary; public results remain JSON-compatible plain TypeScript data.
- Do not assign SemVer impact or decide whether a release may proceed.
- Do not change release automation, publication configuration, Android gates, device claims, authoring APIs, or ordinary runtime entrypoints.
- The repository command reads explicit files only, performs no Git/network lookup, and writes reports to stdout.
- Keep each implementation task independently tested and committed. After each commit, report the evidence and recommend the next M9.2 task.

## Review Focus

- Reordered report objects/findings or input arrays must produce byte-identical JSON; pin this in Task 1 property tests.
- A baseline/current package-name mismatch or unsupported manifest version must fail with an input diagnostic rather than produce a comparison; pin this in Task 2 and Task 4 tests.
- Removed component contracts must not cascade into duplicate slot/variant removals, while retained components must identify removed axes and values; pin this in Task 2 tests.
- Stable external IDs in supplied consumers should match; unresolved, omitted, or partial evidence must not fabricate consumer attribution; pin this in Task 3 tests and report analysis limits.
- Invalid command arguments, unreadable files, and malformed JSON must use exit code 2; findings use the documented 0/1 behavior; pin this with real CLI processes in Task 4.

## File Map

| Path | Responsibility |
| --- | --- |
| packages/css/src/tooling/manifest/comparison-report-model.ts | Versioned plain-data report, finding, consumer-reference, and analysis-limit types. |
| packages/css/src/tooling/manifest/comparison-report-schema.ts | Effect Schema decoder and cross-record report validation. |
| packages/css/src/tooling/manifest/comparison-report-canonical-json.ts | Stable report normalization and compact JSON encoding. |
| packages/css/src/tooling/manifest/comparison.ts | Public contract comparison API and stable structural findings. |
| packages/css/src/tooling/manifest/consumer-check.ts | Private-token checks and direct consumer attribution from manifest edges. |
| packages/css/src/tooling/manifest.ts | Existing opt-in tooling entrypoint extended with the M9.2 API. |
| scripts/m9-2-manifest-check.ts | Explicit-file local/release command, text formatter, and exit behavior. |
| packages/css/fixtures/m9-2-manifest/ | Checked-in baseline, current, and consumer manifest fixtures. |
| packages/css/test/manifest-*.test.ts | Schema, property, comparison, consumer, CLI, and packed-export tests. |
| scripts/m9-2-manifest-qualification.ts | Deterministic fixture comparison and hash-linked evidence receipt. |
| docs/evidence/2026-09-27-m9-2-manifest-compatibility/ | Canonical report and qualification receipt without absolute paths. |
| docs/assessments/2026-09-27-m9-2-manifest-compatibility.md | Observed results and analysis limits. |
| packages/css/README.md and docs/src/content/docs/how-to/generate-design-system-manifests.mdx | Consumer workflow, report semantics, and analysis boundary. |
| docs/assessments/2026-09-27-m9-2-manifest-compatibility.md and docs/roadmap.md | Observed qualification, milestone completion, and next item. |

---

### Task 1: Define and canonicalize compatibility reports

**Files:**
- Create: packages/css/src/tooling/manifest/comparison-report-model.ts
- Create: packages/css/src/tooling/manifest/comparison-report-schema.ts
- Create: packages/css/src/tooling/manifest/comparison-report-canonical-json.ts
- Test: packages/css/test/manifest-comparison-schema.test.ts
- Test: packages/css/test/manifest-comparison-canonical-json.property.test.ts

**Interfaces:**
- Produces the plain-data report format crumbs.design-system-compatibility-report, schema version 1.
- Produces ManifestCompatibilityReport with format crumbs.design-system-compatibility-report, schemaVersion 1, mode check|compare, provider { name, baselineVersion?, currentVersion }, supplied consumers { name, version }, sorted findings, and sorted analysisLimits.
- Produces ManifestCompatibilityFinding with code, level, entityId, fieldPath, message, optional before/after JSON, and affectedConsumers.
- Produces ManifestAnalysisLimit { code, message } with codes explicit-coverage, unresolved-references, component-use-unavailable, and consumer-manifests-not-supplied.
- Produces ManifestConsumerReference { package: { name, version }, dependency: { from, to, kind, origin? } }; produces recursive finite-number ManifestReportJson.
- Produces decodeManifestCompatibilityReport(input: unknown): ManifestCompatibilityReport.
- Produces encodeCanonicalManifestCompatibilityReport(input: unknown): string.
- Finding codes are token.removed, token.domain-changed, token.visibility-reduced, token.added, component.removed, component.slot-removed, component.variant-removed, component.default-changed, component.added, component.slot-added, component.variant-added, and consumer.private-token-dependency.
- Finding levels are error, warning, and info. Every finding carries entityId, fieldPath, message, and affectedConsumers; before and after are optional JSON values.

- [ ] Step 1: Write failing schema tests for valid check and compare reports; assert format/version, modes, allowed finding codes/levels, all four analysis-limit codes, consumer references, optional before/after JSON, and rejection when a token finding's consumer target differs from its entity ID.
- [ ] Step 2: Run bun test packages/css/test/manifest-comparison-schema.test.ts. Expected: FAIL because report model/schema exports do not exist.
- [ ] Step 3: Implement the report model and Effect 4 Schema decoder. Reject unsupported versions, unknown fields, invalid codes/levels, malformed IDs/references, non-JSON values, and non-finite numbers.
- [ ] Step 4: Rerun the schema test. Expected: PASS, including each invalid-input diagnostic.
- [ ] Step 5: Write a fast-check property test that permutes object-key order and finding order and asserts identical canonical report bytes, including nested before/after data and Unicode IDs.
- [ ] Step 6: Run bun test packages/css/test/manifest-comparison-canonical-json.property.test.ts. Expected: FAIL because the canonical encoder is not implemented.
- [ ] Step 7: Implement canonical report normalization with the documented ordinal ordering, fixed key order, compact UTF-8 JSON, and one trailing newline.
- [ ] Step 8: Run bun test packages/css/test/manifest-comparison-schema.test.ts packages/css/test/manifest-comparison-canonical-json.property.test.ts and git diff --check. Expected: PASS with no whitespace errors.
- [ ] Step 9: Commit only the report model/schema/encoder and tests as feat: add manifest compatibility report schema.

### Task 2: Compare public token and component contracts

**Files:**
- Create: packages/css/src/tooling/manifest/comparison.ts
- Test: packages/css/test/manifest-comparison.test.ts
- Reuse: packages/css/src/tooling/manifest/model.ts and comparison-report-model.ts

**Interfaces:**
- Produces compareManifestContracts(baseline: unknown, current: unknown): ManifestContractComparison.
- ManifestContractComparison is { provider: { name: string; baselineVersion: string; currentVersion: string }; findings: ReadonlyArray<ManifestCompatibilityFinding>; analysisLimits: ReadonlyArray<ManifestAnalysisLimit> }.
- Both inputs decode through decodeManifest. The package.name values must match; package.version may differ.

- [ ] Step 1: Write failing tests for public token removal/domain change/visibility reduction/addition; component removal/slot removal/variant axis and value removal/default change/additions; input array permutation; enum domain order equivalence; package-name mismatch; and unsupported manifest version.
- [ ] Step 2: Run bun test packages/css/test/manifest-comparison.test.ts. Expected: FAIL because comparison logic does not exist.
- [ ] Step 3: Implement stable-ID maps and compareManifestContracts. Ignore record/input array order; compare domain/default JSON values structurally; emit one component.removed finding rather than cascaded slot/variant findings when the whole component disappears.
- [ ] Step 4: Rerun the focused test. Expected: PASS for all contract changes and levels.
- [ ] Step 5: Run bun test packages/css/test/manifest-comparison.test.ts packages/css/test/manifest-schema.test.ts. Expected: PASS; mismatched or invalid manifests fail before any report is returned.
- [ ] Step 6: Commit only comparison logic and its tests as feat: compare manifest contracts.

### Task 3: Check private dependencies and attach proven consumers

**Files:**
- Create: packages/css/src/tooling/manifest/consumer-check.ts
- Modify: packages/css/src/tooling/manifest/comparison.ts
- Test: packages/css/test/manifest-consumer-check.test.ts
- Test: packages/css/test/manifest-comparison.test.ts

**Interfaces:**
- Produces checkManifestConsumers(input: { current: unknown; consumers?: ReadonlyArray<unknown> }): ManifestCompatibilityReport.
- Extends compareManifests(input: { baseline: unknown; current: unknown; consumers?: ReadonlyArray<unknown> }): ManifestCompatibilityReport.
- check mode reports private dependencies against current; compare mode combines structural findings with private-token checks and attaches matching consumer references to token findings.
- Consumer identity is package name plus version. Reject duplicate identities and a consumer with the provider's package name.

- [ ] Step 1: Write failing consumer tests for external style-token and token-alias edges to a current private token; assert error code, consumer package/version, stable target, and compiler origin when available. Also assert provider-owned style edges are allowed, duplicate/provider consumer identities fail, and empty input reports missing consumer coverage.
- [ ] Step 2: Run bun test packages/css/test/manifest-consumer-check.test.ts. Expected: FAIL because consumer checking is not implemented.
- [ ] Step 3: Implement checkManifestConsumers by decoding all supplied manifests and matching stable dependency to IDs against current private token records. Do not flag the provider's own style dependencies.
- [ ] Step 4: Rerun the focused tests. Expected: PASS for private checks and valid consumer references.
- [ ] Step 5: Add failing compare tests proving consumer references attach to removed/domain-changed token findings, unresolved or absent edges do not produce consumer identities, and both report modes expose the correct coverage limits.
- [ ] Step 6: Run bun test packages/css/test/manifest-comparison.test.ts. Expected: FAIL because compareManifests and consumer attribution are not implemented.
- [ ] Step 7: Implement compareManifests by combining Task 2 findings with consumer checks; include explicit-root, unresolved-reference, component-use-unavailable, and consumers-not-supplied limits as applicable.
- [ ] Step 8: Run bun test packages/css/test/manifest-consumer-check.test.ts packages/css/test/manifest-comparison.test.ts packages/css/test/manifest-comparison-schema.test.ts. Expected: PASS with no fabricated component slot/variant consumer attribution.
- [ ] Step 9: Commit only API logic and tests as feat: check manifest consumer impact.

### Task 4: Add the explicit-file manifest:check command

**Files:**
- Create: scripts/m9-2-manifest-check.ts
- Modify: package.json
- Test: packages/css/test/manifest-check-cli.test.ts

**Interfaces:**
- Produces parseManifestCheckArgs(args: ReadonlyArray<string>): ManifestCheckOptions.
- ManifestCheckOptions requires currentPath, accepts optional baselinePath, repeatable consumerPaths, and format text or json (default text).
- Produces formatManifestCompatibilityText(report: ManifestCompatibilityReport): string.
- The CLI reads only the requested files, writes report output to stdout, and does not perform Git/network lookups or write files.

- [ ] Step 1: Write failing argument-parser tests for required current, optional baseline, repeated consumers, supported format values, a leading Bun argument separator, duplicate/unknown flags, and missing flag values.
- [ ] Step 2: Run bun test packages/css/test/manifest-check-cli.test.ts. Expected: FAIL because the parser and command do not exist.
- [ ] Step 3: Implement strict argument parsing and register manifest:check in root package.json.
- [ ] Step 4: Rerun parser tests. Expected: PASS for valid and invalid argument sets.
- [ ] Step 5: Add real-process CLI tests using temporary valid, breaking, private-dependency, malformed, and missing-path fixture files. Assert text/JSON parity and exit codes 0 for clean/warning-only, 1 for error findings, and 2 for invocation/read/decode/identity failures.
- [ ] Step 6: Run bun test packages/css/test/manifest-check-cli.test.ts. Expected: FAIL because file loading, reporting, and exit behavior are not implemented.
- [ ] Step 7: Implement file loading, API dispatch, deterministic formatters, and error handling. Errors identify the input label/path and schema diagnostic; JSON mode encodes valid reports canonically.
- [ ] Step 8: Rerun bun test packages/css/test/manifest-check-cli.test.ts. Expected: PASS with no file writes beyond test temporary roots.
- [ ] Step 9: Commit only CLI, package script, and tests as feat: add local manifest compatibility check.

### Task 5: Qualify the packed API and reproducible fixture evidence

**Files:**
- Create: packages/css/fixtures/m9-2-manifest/baseline.json
- Create: packages/css/fixtures/m9-2-manifest/current.json
- Create: packages/css/fixtures/m9-2-manifest/consumer.json
- Create: scripts/m9-2-manifest-qualification.ts
- Create: packages/css/test/manifest-comparison-export.test.ts
- Create: packages/css/test/manifest-comparison-qualification.test.ts
- Modify: packages/css/src/tooling/manifest.ts
- Reuse: packages/css/test/packed-runtime-graph.test.ts and scripts/packed-runtime-graph.ts

**Interfaces:**
- Public tooling exports expose both comparison operations, report types, report decoder, and canonical report encoder through the existing tooling/manifest subpath.
- The fixture produces deterministic expected findings for removals, domain changes, changed defaults, and a private consumer edge.
- Produces buildManifestQualificationEvidence(input: { baseline: unknown; current: unknown; consumers: ReadonlyArray<unknown> }): ManifestQualificationEvidence for deterministic fixture and report hashes.
- ManifestQualificationEvidence contains canonical report JSON, report SHA-256, fixture path/SHA-256 pairs, finding counts by level, supplied consumer identities, and analysis-limit codes.
- The qualification receipt records fixture/report SHA-256 values, command modes, finding counts, supplied consumer identities, and analysis limits without absolute paths.

- [ ] Step 1: Add packed-consumer assertions for ESM, CommonJS, and declarations importing compareManifests, checkManifestConsumers, decodeManifestCompatibilityReport, encodeCanonicalManifestCompatibilityReport, and the ManifestCompatibilityReport type from the installed package artifact.
- [ ] Step 2: Run bun test packages/css/test/manifest-comparison-export.test.ts. Expected: FAIL because the comparison API is not exported from the packed artifact.
- [ ] Step 3: Export the approved public API from the existing tooling entrypoint; do not add a runtime/root export or package dependency.
- [ ] Step 4: Rerun the packed export test. Expected: PASS in ESM, CommonJS, and typechecking modes.
- [ ] Step 5: Create the baseline, current, and consumer JSON fixtures. Add a failing test of buildManifestQualificationEvidence that asserts expected finding counts, fixture/report digests, reordered-consumer byte equality, and no absolute path, timestamp, or theme value.
- [ ] Step 6: Run bun test packages/css/test/manifest-comparison-qualification.test.ts. Expected: FAIL because the qualification helper is not implemented.
- [ ] Step 7: Implement buildManifestQualificationEvidence and scripts/m9-2-manifest-qualification.ts; save the versioned receipt and canonical report under docs/evidence/2026-09-27-m9-2-manifest-compatibility/.
- [ ] Step 8: Run bun test packages/css/test/manifest-comparison-qualification.test.ts packages/css/test/manifest-comparison-export.test.ts. Expected: PASS and hashes match the checked-in fixtures/report.
- [ ] Step 9: Run bun run build and bun test packages/css/test/manifest-comparison-export.test.ts packages/css/test/packed-export-contract.test.ts packages/css/test/packed-runtime-graph.test.ts. Expected: ESM, CommonJS, types, and runtime graph gates pass.
- [ ] Step 10: Run bun run manifest:check -- --baseline packages/css/fixtures/m9-2-manifest/baseline.json --current packages/css/fixtures/m9-2-manifest/current.json --consumer packages/css/fixtures/m9-2-manifest/consumer.json --format json. Expected: exit code 1 for its intentional blocking findings; the qualification helper must assert those findings and return successfully. Scan checked-in evidence for absolute paths.
- [ ] Step 11: Commit only public exports, fixtures, tests, qualification script, and evidence as feat: expose and qualify manifest compatibility tooling.

### Task 6: Document, close, and merge M9.2 locally

**Files:**
- Modify: packages/css/README.md
- Modify: docs/src/content/docs/how-to/generate-design-system-manifests.mdx
- Create: docs/assessments/2026-09-27-m9-2-manifest-compatibility.md
- Modify: docs/roadmap.md

**Interfaces:**
- Documentation uses the command and finding semantics from Tasks 1-5 exactly.
- The roadmap marks M9.2 complete only after qualification passes and recommends M9.3 next. Android remains parked.

- [ ] Step 1: Update README and the manifest guide with local check/compare examples, report levels, explicit consumer inputs, and component usage/coverage limitations.
- [ ] Step 2: Create docs/assessments/2026-09-27-m9-2-manifest-compatibility.md summarizing proven checks, report and fixture digests, analysis limits, and unrun platform/release acceptance without claiming SemVer or device results.
- [ ] Step 3: Update docs/roadmap.md to mark M9.2 complete and recommend M9.3 only after all gates below pass.
- [ ] Step 4: Run bun test packages/css/test/manifest-*.test.ts packages/css/test/packed-export-contract.test.ts packages/css/test/packed-runtime-graph.test.ts. Expected: all focused manifest and packed graph tests pass.
- [ ] Step 5: Run bun run typecheck; bun run check; bun run docs:build; bun run manifest:qualify; and bun run playground:distribution --m8-3-check. Separately run bun run manifest:check -- --current packages/css/fixtures/m9-2-manifest/current.json --consumer packages/css/fixtures/m9-2-manifest/consumer.json --format json and assert exit code 1 for the fixture's private-token error. Record actual results.
- [ ] Step 6: Run git diff --check; confirm git -C /Users/alancurrie/Projects/crumbs-css status --short still shows only the three pre-existing release paths and their 0.1.2-alpha.2 values, and the managed worktree only has the known dependency symlinks untracked.
- [ ] Step 7: Commit docs, roadmap, and assessment as docs: qualify M9.2 manifest compatibility checks.
- [ ] Step 8: Fast-forward local main to codex/m9-2-manifest-compat after all commits and gates pass. Do not push or publish. Verify main and the feature branch resolve to the final commit.
