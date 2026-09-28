# M9.4 Versioned Design-System Policies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add deterministic, versioned design-system policy checks over explicitly supplied Crumbs evidence, with visible incremental adoption, reasoned exceptions, and a local CLI.

**Architecture:** Keep the public API on a tooling-only `@opsydyn/crumbs-css/tooling/policy` subpath. Validate plain typed policy, M9.1 manifest, M9.3 style metadata, measurement inputs, and reports at the boundary with Effect 4 Schema; evaluate rules in focused modules and return deterministic canonical reports. Reuse M9.2 private-token analysis and M9.3 metadata decoding rather than duplicating their contracts.

**Tech Stack:** TypeScript, Bun, Effect 4 Schema, fast-check, tsdown, packed ESM/CommonJS/type consumers.

**Spec:** `docs/superpowers/specs/2026-09-28-m9-4-policy-presets-design.md`

## Global Constraints

- Preserve M9.1 manifest v1 and M9.2 compatibility-report v1; policy and policy-report each have independent versions.
- Read only explicitly supplied manifests, style-explanation metadata, policy, and measurements; do not crawl source, discover files, inspect Git, or use hosted services.
- Keep Effect 4 Schema and policy implementation outside ordinary styling, theme, and React Native runtime graphs; exported data is plain TypeScript.
- Map a style token only when both deterministic contract identity and variable name match a token in the supplied manifest; unknown references reduce coverage and are never guessed.
- Use only explicit target profiles and explicit numeric output measurements; absent evidence is a coverage limit, never a pass or inferred platform result.
- Rule levels are `info`, `warning`, or `error`; no `off` level, automatic release decision, system clock, or arbitrary suppression is permitted.
- Exceptions match one known rule and one stable subject, require a reason, may expire, and remain visible; expiry uses caller-supplied `evaluatedOn` only.
- Each task ends in an independently verified commit. After each commit, report evidence and recommend the next M9.4 task. Do not publish; Android and device acceptance remain parked.

## Review Focus

- Malformed versions, extra fields, duplicate semantic token/target/exception IDs, and an expiry without `evaluatedOn` must fail with stable input errors; pin in Task 1 and Task 4.
- Token variable-name collisions, foreign contract identities, opaque values, and missing metadata must never become a guessed semantic token; pin in Task 2.
- A target with no compiler-observed capability evidence and a budget with no matching measurement must produce coverage limits rather than passes; pin in Task 3.
- Exceptions on the exact expiry boundary, duplicate keys, unknown rules, and exceptions that match no finding must remain explicit and deterministic; pin in Task 4.
- Repeated CLI inputs and malformed/unreadable files must not cause file discovery or partial success; pin in Task 5.

## File Map

| Path | Responsibility |
| --- | --- |
| `packages/css/src/tooling/policy/model.ts` | Plain policy, input, finding, exception, coverage, and report types with stable format/rule identifiers. |
| `packages/css/src/tooling/policy/schema.ts` | Effect 4 Schema decoders for policy, measurement input, and policy report. |
| `packages/css/src/tooling/policy/presets.ts` | Independently versioned `migration` and `enforce` defaults and severity resolution. |
| `packages/css/src/tooling/policy/canonical-json.ts` | Stable recursively key-sorted report serialization. |
| `packages/css/src/tooling/policy/check.ts` | Public `checkDesignSystemPolicy` boundary and deterministic report composition. |
| `packages/css/src/tooling/policy/style-rules.ts` | Literal, semantic-token, and reused M9.2 private-token rules. |
| `packages/css/src/tooling/policy/manifest-rules.ts` | Explicit target capability, lifecycle/deprecation, and output-budget rules. |
| `packages/css/src/tooling/policy/exceptions.ts` | Severity application, exact exception matching, expiry, and exception diagnostics. |
| `packages/css/src/tooling/policy.ts` | Public tooling-only exports and ordinary TypeScript API types. |
| `packages/css/test/policy-*.test.ts` | Schema, rules, property, exception, CLI, package-export, and qualification coverage. |
| `packages/css/fixtures/m9-4-policy/` | Small checked-in policy, manifest, sidecar, consumer, and measurement fixtures. |
| `scripts/m9-4-policy-check.ts` | Explicit-file `policy:check` CLI and text/JSON rendering. |
| `scripts/m9-4-policy-qualification.ts` | Deterministic fixture qualification and digest evidence. |
| `packages/css/package.json`, `packages/css/tsdown.config.ts` | Publish and build the isolated `./tooling/policy` ESM, CommonJS, and declaration targets. |
| `docs/evidence/2026-09-28-m9-4-design-system-policies/` | Canonical policy report and qualification receipt without machine-specific paths or implicit time. |
| `docs/assessments/2026-09-28-m9-4-design-system-policies.md`, `packages/css/README.md`, `docs/src/content/docs/how-to/check-design-system-policy.mdx` | Observed behavior, limits, adoption guide, and CLI usage. |
| `docs/roadmap.md`, root `package.json` | M9.4 completion record and `policy:check` script. |

---

### Task 1: Define policy and report contracts, schemas, presets, and serialization

**Files:**
- Create: `packages/css/src/tooling/policy/model.ts`
- Create: `packages/css/src/tooling/policy/schema.ts`
- Create: `packages/css/src/tooling/policy/presets.ts`
- Create: `packages/css/src/tooling/policy/canonical-json.ts`
- Test: `packages/css/test/policy-schema.test.ts`
- Test: `packages/css/test/policy-schema.property.test.ts`

**Interfaces:**
- Policy format/version: `crumbs.css.design-system-policy` / `1`; report format/version: `crumbs.css.design-system-policy-report` / `1`.
- `PolicyRuleId` is exactly `style.literal-value | style.semantic-token-required | consumer.private-token | capability.not-supported | entity.deprecated | output.budget-exceeded`.
- `DesignSystemPolicy` contains `policyId`, positive integer `version`, `{ name: "migration" | "enforce", version: 1 }` preset, partial `severityOverrides`, explicit `literalValueScopes`, `semanticTokenScopes`, `semanticTokenIds`, `targetProfiles`, `outputBudgets`, and `exceptions`.
- A property scope is `{ property: string, domain?: NativePrimitiveDomain }`; a target profile is `{ id: string, supportedCapabilities: ReadonlyArray<{ property: string, primitive: string }> }`; a budget is `{ metricId: string, scopeId: string, unit: string, maximum: number }`; a measurement is `{ metricId: string, scopeId: string, unit: string, value: number }`.
- An exception is `{ ruleId, subjectId, reason, expiresOn? }`; `evaluatedOn` is optional input but required by validation whenever any exception has `expiresOn`.
- `DesignSystemPolicyReport` contains provider package identity, policy/preset identity, explicit supplied consumer identities, optional `evaluatedOn`, stable findings (`ruleId`, effective `level`, stable `subjectId`, `fieldPath`, `message`, JSON-safe evidence, `disposition`, and applied exception reason/expiry when excepted), exception diagnostics (`exception.expired` warning or `exception.unused` info), and sorted analysis limits.
- Analysis-limit codes are `consumer-coverage`, `style-metadata-missing`, `style-metadata-incomplete`, `token-identity-unknown`, `target-profile-missing`, and `measurement-missing`; emit only limits relevant to configured checks and supplied evidence.
- `decodeDesignSystemPolicy`, `decodeDesignSystemPolicyReport`, and `encodeCanonicalDesignSystemPolicyReport` validate or serialize the exact versioned records. `getBuiltInPolicyPreset(name)` returns immutable v1 preset metadata; both presets set all six rule defaults to warning (`migration`) or error (`enforce`).

- [ ] **Step 1: Write failing schema and preset tests** named `accepts-exact-v1-policy-and-report-tags`, `rejects-unknown-versions-fields-and-invalid-levels`, `rejects-duplicate-semantic-token-target-and-exception-ids`, `pins-both-preset-v1-severity-maps`, and `canonicalizes-nested-record-key-order`. Assert policy/report tags and versions, all six rule IDs, malformed-date rejection, duplicate rejection, and identical canonical strings for key-order permutations. The `evaluatedOn`-required-when-expiry-exists condition is pinned in Task 4 because it spans policy and check input.
- [ ] **Step 2: Run** `bun test packages/css/test/policy-schema.test.ts packages/css/test/policy-schema.property.test.ts`. Expected: FAIL because policy modules and exports do not exist.
- [ ] **Step 3: Implement** the exact model, strict Effect 4 Schema decoders, immutable preset records, and stable JSON serializer in the four source files. Keep schemas private to the tooling module; exported records remain normal TypeScript objects.
- [ ] **Step 4: Run** `bun test packages/css/test/policy-schema.test.ts packages/css/test/policy-schema.property.test.ts`. Expected: PASS, including generated nested-key-order permutations.
- [ ] **Step 5: Run** `git diff --check`; stage only the four source files and two tests; commit as `feat: define versioned policy contracts`.

### Task 2: Evaluate style rules and reuse consumer privacy analysis

**Files:**
- Create: `packages/css/src/tooling/policy/style-rules.ts`
- Test: `packages/css/test/policy-style-rules.test.ts`
- Test: `packages/css/test/policy-style-rules.property.test.ts`
- Reuse: `packages/css/src/tooling/manifest/consumer-check.ts`, `packages/css/src/devtools/style-explanation-schema.ts`, `packages/css/src/tokens/identity.ts`

**Interfaces:**
- `evaluateStylePolicyRules(input)` consumes a decoded current `DesignSystemManifest`, decoded M9.3 `StyleExplanationMetadata[]`, `DesignSystemPolicy`, and decoded consumer manifests; it returns unsorted candidate findings and analysis limits for the three style/consumer rules.
- Match a style token only when `tokenPublicId(manifestToken.contract, manifestToken.path) === manifestToken.id` and `tokenVariableName(manifestToken.contract, manifestToken.path) === declaration.value.identity.varName`; when metadata includes a contract identity it must also equal `manifestToken.contract`.
- `style.literal-value` flags only non-token declaration values in configured literal scopes. `style.semantic-token-required` accepts only mapped IDs present in `semanticTokenIds` for configured semantic scopes. `consumer.private-token` adapts M9.2 code `consumer.private-token-dependency` and preserves its exact affected-consumer evidence and analysis limits.

- [ ] **Step 1: Write failing tests** named `flags-literals-only-in-configured-property-scopes`, `requires-explicitly-classified-semantic-token-ids`, `maps-tokens-by-contract-id-and-variable-name`, `reports-colliding-or-unknown-token-identities-as-limits`, `reports-opaque-and-missing-sidecar-coverage`, and `reuses-supplied-consumer-private-token-evidence`. Include same `varName` under different contracts and property-domain scope mismatches.
- [ ] **Step 2: Run** `bun test packages/css/test/policy-style-rules.test.ts packages/css/test/policy-style-rules.property.test.ts`. Expected: FAIL because the evaluator does not exist.
- [ ] **Step 3: Implement** the style-rule evaluator with deterministic stable subject IDs derived from supplied metadata module/export/declaration identity. Decode each metadata sidecar with M9.3's `decodeStyleExplanationMetadata`; call `checkManifestConsumers` once for the explicit consumer set and adapt its existing findings instead of reimplementing dependency edges.
- [ ] **Step 4: Run** `bun test packages/css/test/policy-style-rules.test.ts packages/css/test/policy-style-rules.property.test.ts packages/css/test/manifest-consumer-check.test.ts packages/css/test/style-explanation-schema.test.ts`. Expected: all style decisions match configured scopes, M9.2 evidence is preserved, and unknown inputs reduce coverage without guessed identities.
- [ ] **Step 5: Run** `git diff --check`; stage only the evaluator and two tests; commit as `feat: check style and private-token policies`.

### Task 3: Evaluate capability, lifecycle, and output-budget rules

**Files:**
- Create: `packages/css/src/tooling/policy/manifest-rules.ts`
- Test: `packages/css/test/policy-manifest-rules.test.ts`
- Test: `packages/css/test/policy-manifest-rules.property.test.ts`
- Reuse: `packages/css/src/tooling/manifest/model.ts`

**Interfaces:**
- `evaluateManifestPolicyRules(input)` consumes a decoded current manifest, policy target profiles/output budgets, and explicit measurements; it returns candidate findings and coverage limits for `capability.not-supported`, `entity.deprecated`, and `output.budget-exceeded`.
- Capability comparisons use only `manifest.capabilities` with `evidence: "compiler-observed"` against each policy profile's explicit `{ property, primitive }` entries. Every configured profile is identified in finding evidence; no platform name receives implicit support.
- Deprecation findings use M9.1 token/component lifecycle metadata and preserve `deprecatedSince`, reason, and replacement. Budgets match all of metric ID, scope ID, and unit; compare `value > maximum`; a missing or mismatched measurement is a coverage limit.

- [ ] **Step 1: Write failing tests** named `compares-only-explicit-target-capabilities`, `ignores-no-implicit-android-profile`, `reports-token-and-component-deprecations-with-replacement`, `flags-budget-only-above-matching-unit-threshold`, and `missing-or-mismatched-measurements-create-limits`. Add fast-check properties proving exact-threshold values pass and every larger finite value fails.
- [ ] **Step 2: Run** `bun test packages/css/test/policy-manifest-rules.test.ts packages/css/test/policy-manifest-rules.property.test.ts`. Expected: FAIL because the evaluator does not exist.
- [ ] **Step 3: Implement** the three manifest rule evaluators with stable subjects for capability/profile pairs, lifecycle entities, and metric/scope measurements; preserve evidence from supplied records.
- [ ] **Step 4: Run** `bun test packages/css/test/policy-manifest-rules.test.ts packages/css/test/policy-manifest-rules.property.test.ts packages/css/test/manifest-schema.test.ts`. Expected: supported capability pairs do not report, unsupported explicit pairs report, and incomplete inputs produce limits.
- [ ] **Step 5: Run** `git diff --check`; stage only the evaluator and two tests; commit as `feat: check capability lifecycle and output policies`.

### Task 4: Compose reports, apply severity, and evaluate exact exceptions

**Files:**
- Create: `packages/css/src/tooling/policy/exceptions.ts`
- Create: `packages/css/src/tooling/policy/check.ts`
- Modify: `packages/css/src/tooling/policy/schema.ts`
- Test: `packages/css/test/policy-check.test.ts`
- Test: `packages/css/test/policy-exceptions.property.test.ts`

**Interfaces:**
- Public `checkDesignSystemPolicy(input: { policy: DesignSystemPolicy; current: DesignSystemManifest; consumers?: ReadonlyArray<DesignSystemManifest>; styleMetadata?: ReadonlyArray<StyleExplanationMetadata>; measurements?: ReadonlyArray<PolicyMeasurement>; evaluatedOn?: string }): DesignSystemPolicyReport` validates detached inputs, composes Tasks 2 and 3, applies preset defaults and severity overrides, applies exceptions, and sorts all output by stable ordinal keys.
- Preset severity is the default for every rule; a severity override changes the visible level but never removes a finding. Finding dispositions are `active` or `excepted`.
- An exact valid exception keeps the finding in the report with its reason. If `evaluatedOn <= expiresOn`, it is applied; after expiry, the original finding is active and `exception.expired` is reported as warning. An exception matching no candidate is `exception.unused` at info. Both diagnostics are report codes, not suppressible rule IDs.
- Unknown rule IDs, duplicate exception keys, empty reasons, malformed dates, or missing `evaluatedOn` when required fail before evaluation. Never read the machine clock.

- [ ] **Step 1: Write failing tests** named `uses-preset-severity-and-preserves-overridden-findings`, `applies-only-an-exact-rule-and-subject-exception`, `uses-expiry-date-inclusively-without-reading-clock`, `rejects-expiry-without-evaluated-date`, `reactivates-expired-finding-and-emits-expired-diagnostic`, `reports-unused-exceptions`, `rejects-unknown-duplicate-or-unreasoned-exceptions`, and `sorts-report-independent-of-input-order`. Property tests permute finding/input order and assert byte-identical canonical report output.
- [ ] **Step 2: Run** `bun test packages/css/test/policy-check.test.ts packages/css/test/policy-exceptions.property.test.ts`. Expected: FAIL because the public checker and exception evaluator do not exist.
- [ ] **Step 3: Implement** the explicit-date exception evaluator and `checkDesignSystemPolicy`; revalidate each public API input, collect all six rule candidates, retain analysis limits, apply effective levels/dispositions, and use the Task 1 canonical serializer for determinism tests.
- [ ] **Step 4: Run** `bun test packages/css/test/policy-*.test.ts`. Expected: all schema, rule, severity, exception, and permutation properties pass; incomplete evidence remains visible.
- [ ] **Step 5: Run** `git diff --check`; stage only exception/check modules, schema updates, and the two new tests; commit as `feat: compose policy reports and exact exceptions`.

### Task 5: Add the explicit-file local CLI

**Files:**
- Create: `scripts/m9-4-policy-check.ts`
- Create: `packages/css/test/policy-check-cli.test.ts`
- Modify: root `package.json`

**Interfaces:**
- Export `parsePolicyCheckArgs(args)` returning required `policyPath` and `currentPath`, repeatable `consumerPaths`, `styleMetadataPaths`, and `measurementPaths`, optional `evaluatedOn`, and `format: "text" | "json"`.
- CLI syntax: `bun run policy:check -- --policy policy.json --current manifest.json [--consumer consumer.json] [--style-metadata styles.json] [--measurement measurements.json] [--evaluated-on YYYY-MM-DD] [--format text|json]`.
- CLI reads only named files, emits deterministic report text or canonical JSON to stdout, exits `0` with no active error finding, `1` with an active error finding, and `2` for arguments, unreadable files, malformed data, or incompatible versions.

- [ ] **Step 1: Write failing tests** named `requires-explicit-policy-and-current-files`, `accepts-repeatable-evidence-paths`, `rejects-duplicate-singleton-and-unknown-options`, `text-and-json-carry-the-same-findings`, `returns-zero-one-and-two-for-defined-outcomes`, and `reads-only-explicit-input-files`. Invoke the real Bun command for end-to-end cases.
- [ ] **Step 2: Run** `bun test packages/css/test/policy-check-cli.test.ts`. Expected: FAIL because the CLI and `policy:check` script do not exist.
- [ ] **Step 3: Implement** strict argument parsing, named-file JSON reading/decoding, text rendering, and exit behavior in `scripts/m9-4-policy-check.ts`; register root script `policy:check` without adding discovery or defaults.
- [ ] **Step 4: Run** `bun test packages/css/test/policy-check-cli.test.ts packages/css/test/manifest-check-cli.test.ts`. Expected: M9.4 CLI cases pass and M9.2 command behavior remains unchanged.
- [ ] **Step 5: Run** `git diff --check`; stage only the CLI, its test, and root script change; commit as `feat: add local design-system policy check`.

### Task 6: Publish and qualify the tooling-only package subpath

**Files:**
- Create: `packages/css/src/tooling/policy.ts`
- Create: `packages/css/test/policy-export.test.ts`
- Modify: `packages/css/tsdown.config.ts`
- Modify: `packages/css/package.json`
- Modify: `packages/css/test/packed-export-contract.test.ts`
- Modify: `packages/css/test/pack-consumer-contract.test.ts`
- Modify: `packages/css/test/runtime-isolation.test.ts`
- Modify: `scripts/packed-runtime-graph.ts` and `packages/css/test/packed-runtime-graph.test.ts` only if the current graph classifier needs an explicit tooling classification.

**Interfaces:**
- `@opsydyn/crumbs-css/tooling/policy` exports the checker, policy/report decoders, canonical report encoder, preset identifiers/types, and ordinary data input/output types; it does not export Effect Schema objects.
- `./tooling/policy` resolves `dist/tooling-policy.mjs`, `.cjs`, and `.d.mts`, built in the existing compiler/tooling graph with `compilerDependencies`. Ordinary root, style, theme, theme/core, tokens, and optic graphs remain free of Effect and policy modules.
- Packed consumer test resolves and type-checks the API in ESM, CommonJS, Node16 and Bundler TypeScript modes; runtime graph audit classifies the policy path as tooling and proves ordinary runtime graphs cannot reach it.

- [ ] **Step 1: Add failing package tests** named `packs-policy-api-for-esm-commonjs-and-types` and `keeps-policy-out-of-ordinary-runtime-graphs`. Assert report tag/version, decoder behavior, CJS/ESM import resolution, declaration names, and no policy/Effect specifier in ordinary graphs.
- [ ] **Step 2: Run** `bun test packages/css/test/policy-export.test.ts packages/css/test/packed-export-contract.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts packages/css/test/packed-runtime-graph.test.ts`. Expected: FAIL because the subpath is not exported or built.
- [ ] **Step 3: Implement** the public re-export module and add `tooling-policy` to the existing compiler/tooling build graph and package export map. Update the packed graph classifier only if tests show no existing tooling class covers this entry.
- [ ] **Step 4: Run** `bun run build` then the five focused package tests above. Expected: packed ESM/CommonJS/types resolve and ordinary graphs remain isolated.
- [ ] **Step 5: Run** `git diff --check`; stage only the public/build/export/test changes; commit as `feat: publish isolated policy tooling API`.

### Task 7: Document, fixture-qualify, close M9.4, and fast-forward local main

**Files:**
- Create: fixtures under `packages/css/fixtures/m9-4-policy/`
- Create: `scripts/m9-4-policy-qualification.ts`
- Create: `packages/css/test/policy-qualification.test.ts`
- Create: `docs/evidence/2026-09-28-m9-4-design-system-policies/policy-report-v1.json`
- Create: `docs/evidence/2026-09-28-m9-4-design-system-policies/qualification.json`
- Create: `docs/assessments/2026-09-28-m9-4-design-system-policies.md`
- Create: `docs/src/content/docs/how-to/check-design-system-policy.mdx`
- Modify: `packages/css/README.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Fixture qualification consumes checked-in fixtures only; emits canonical report and receipt with fixture/report SHA-256 values, preset/schema identities, findings/coverage counts, and passing gate names. It contains no absolute paths or implicit timestamps.
- The guide explains preset migration, all six rules, evidence/coverage, explicit measurements, exception expiry, and CLI behavior. The assessment records observed qualification and analysis limits without claiming release safety, bundle measurement, device acceptance, or Android support.
- Mark M9.4 complete only after all gates pass. Then fast-forward local `main` to `codex/m9-4-policy-presets`; do not push or publish, preserve the primary checkout, and leave Android/device acceptance parked.

- [ ] **Step 1: Write failing qualification tests** named `qualifies-checked-in-policy-fixtures-deterministically`, `records-stable-digests-and-evidence-counts`, and `omits-machine-paths-and-implicit-time`. Compare the produced canonical report and receipt against the checked-in policy inputs and assert repeat runs are byte-identical.
- [ ] **Step 2: Run** `bun test packages/css/test/policy-qualification.test.ts`. Expected: FAIL because qualification evidence does not exist.
- [ ] **Step 3: Implement** explicit fixtures and the qualification script; generate the policy report and receipt only from those fixture inputs.
- [ ] **Step 4: Document** the API, CLI, evidence sources, visible severity migration, exceptions, and limitations in README and the how-to guide; write the assessment from observed results.
- [ ] **Step 5: Run** `bun run check`; `bun run docs:build`; `bun scripts/m9-4-policy-qualification.ts`; `bun run playground:distribution --m8-3-check`; focused `bun test packages/css/test/policy-*.test.ts packages/css/test/packed-export-contract.test.ts packages/css/test/pack-consumer-contract.test.ts packages/css/test/runtime-isolation.test.ts packages/css/test/packed-runtime-graph.test.ts`; and `git diff --check`. Expected: all source, docs, fixtures, packed graphs, and distribution checks pass; Android remains not-run and parked.
- [ ] **Step 6: Update** `docs/roadmap.md` to mark M9.4 complete and link assessment/receipt only after the preceding commands pass. Verify the receipt has no absolute paths or implicit dates and the primary checkout still contains only its pre-existing release edits.
- [ ] **Step 7: Stage** only Task 7 fixtures, script, evidence, docs, assessment, and roadmap; commit as `docs: qualify M9.4 design-system policies`.
- [ ] **Step 8: Fast-forward local `main`** to `codex/m9-4-policy-presets`, verify both refs resolve to the final M9.4 commit, and retain the feature branch. Do not push or publish.

## Completion and handoff

After each implementation-task commit, report its hash, focused checks, and the next numbered M9.4 task. At milestone close, report full-gate results, exact receipt/assessment paths, and remaining limits. The next roadmap item after M9.4 is M9.5 token/recipe/slot migration metadata and codemods; Android/device acceptance stays parked.
