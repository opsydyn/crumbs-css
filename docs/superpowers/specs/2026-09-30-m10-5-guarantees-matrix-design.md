# M10.5 Guarantees Matrix and Qualification Design

- **Status:** Design approved; written specification awaiting review
- **Date:** 2026-09-30
- **Roadmap:** M10.5 in [roadmap.md](../../roadmap.md)
- **Depends on:** M10.4 packed North Star journey qualification and the existing performance-budget registry

## Intent

Give design-system maintainers and enterprise adopters one evidence-linked view of what Crumbs supports, what has been measured, and what remains unsupported or unqualified. The matrix must make incomplete budgets visible rather than turn test presence, a valid registry, or a documentation statement into a performance or platform guarantee.

## Approved understanding

- Build an evidence-first, versioned guarantees matrix and render it into the repository’s public documentation source.
- Rerun existing gates and add only deterministic checks needed to bind claims to their contracts and evidence.
- Keep contract support separate from observed measurements. Show unsupported behavior separately from checks that were not run or could not be calibrated.
- Do not invent numeric thresholds or promote a measurement to a performance guarantee without an approved threshold and the required environment.
- Keep M10.5 open while required gates remain incomplete. Record the device and simulator limitations explicitly; Android remains parked.
- Commit work in reviewable slices and recommend the next M10.5 slice after each commit.

## Current baseline and evidence gaps

The existing `packages/css/bench/budgets.json` registry contains 26 metrics across nine domains. On 2026-09-30, `bun run budgets:validate` returned `valid: true`, `registryReady: false`, and `performanceQualification: "not-run"`. Five thresholds are pending review; three baselines are missing and two are diagnostic. The readiness command exits non-zero while those gaps remain. M10.5 must preserve this distinction.

M10.4 retains packed-package and iOS/web JavaScript-export evidence for the Expo 56 / React Native 0.85.3 fixture. It does not establish native rendering, native performance, screen-reader acceptance, or publishing. A focused inventory of `apps/storybook` and its package scripts found generated contract stories and accessibility review cases, but no screenshot or image-diff gate in that surface. On 2026-09-30, `simctl` could not connect to CoreSimulatorService or discover simulator runtimes. The user has no physical device available, and Android remains parked. These are unavailable measurements, not unsupported API declarations.

## Goals

- Cover compatibility, property-based behavior, type and editor behavior, packed packages/runtime, documentation, visual review, and device budgets.
- Link each published claim to its exact contract or test, evidence artifact, command, source revision, environment, and known scope limit.
- Preserve the distinction between API support, an observed pass/fail result, uncalibrated thresholds, unavailable execution, and explicit non-support.
- Render a readable reference matrix from a versioned machine-readable source and validate both the source and generated page in repository checks.
- Retain qualification evidence with repository-relative paths and enough artifact identity to reproduce or audit every measured result.

## Non-goals

- Do not add or change React Native styling APIs, runtime dependencies, compiler behavior, or package exports.
- Do not automatically approve budgets, select thresholds from observed maxima, or treat host measurements as Hermes or device measurements.
- Do not infer unsupported behavior from absent tests, missing evidence, a skipped command, or an unavailable device.
- Do not claim WCAG conformance, universal React Native compatibility, visual fidelity, or device performance from static review, contract stories, web exports, or host tests.
- Do not unpark Android, publish a package, deploy the documentation site, or record device/screen-reader acceptance without the corresponding environment and evidence.

## Selected architecture

Use a strict, versioned JSON matrix as the source of truth, a small repository-local validator/renderer, a generated documentation reference page, and a retained qualification receipt. The matrix is an evidence index; it does not replace existing contract schemas, budget thresholds, feature tests, or per-roadmap qualification reports.

Expected paths are:

- `docs/guarantees/matrix.v1.json` — curated claims and evidence references.
- `scripts/guarantees-matrix.ts` — strict validation and deterministic Markdown rendering/checking.
- `docs/src/content/docs/reference/guarantees.mdx` — generated public reference page.
- `docs/evidence/2026-09-30-m10-5-guarantees/qualification.json` — source revision, matrix digest, gate results, and open limitations.
- Root `guarantees:check` command — verify the matrix and that the committed page matches its renderer.

The matrix format has its own version and stable row IDs. It has explicit domains for the seven goals above and distinct fields for:

| Field | Values and meaning |
| --- | --- |
| `supportStatus` | `supported`, `conditional`, `unsupported`, or `unspecified`; describes the declared public contract, not whether a particular test ran. |
| `measurementStatus` | `passed`, `failed`, `not-run`, `not-calibrated`, `stale`, or `not-applicable`; describes evidence for this exact row and environment. |
| `basis` | One or more repository-relative contract, policy, or test-source references with the role each plays in the claim. These explain the declared support status; they are not measurements. |
| `evidence` | Zero or more retained `docs/evidence/` artifact paths with SHA-256, source revision, command, environment/version identity, a structured `resultStatus` (`passed` or `failed`), a concise result summary, and a scope limit. |
| `budget` | The existing registry metric ID and threshold state when a quantitative budget applies; no replacement limit is allowed here. |

`unsupported` requires an explicit contract or policy source. Missing or stale evidence must produce `not-run` or `stale`, never `unsupported` or `passed`. A `passed` row requires all evidence outcomes to be `passed`; a `failed` row requires at least one failed evidence outcome. Passed or failed measurements must reference the latest Git commit touching a path outside `docs/`. This allows docs-only evidence receipts to preserve the source identity they measure; any later change outside `docs/` makes that evidence historical. Historical evidence stays `stale` with its original revision. A recorded host measurement can be `measurementStatus: "passed"` while its budget is `pending-review`; the documentation must state that it is measured evidence and not an approved performance guarantee. Device and screen-reader rows remain `not-run` until directly exercised in the named environment.

The validator rejects unsupported schema versions, duplicate IDs, missing required domains, absolute or parent-relative paths, source references that resolve outside the repository, evidence paths that resolve outside `docs/evidence/`, mismatched evidence hashes, evidence outcomes or revisions that contradict current measurement status, and stale generated documentation. The renderer refuses a generated-page destination or parent that resolves through a symlink. Rows, basis references, and evidence render in stable declared order. Output contains no machine-specific absolute paths. The format does not claim that a listed row covers unlisted APIs, packages, versions, or applications.

## Qualification slices

1. **M10.5.1 — Matrix contract and inventory.** Define the strict v1 data model and validator, seed one row per required domain from existing records, add schema/path/determinism tests, and generate the reference page. Preserve current incomplete and unsupported states.
2. **M10.5.2 — Current host and package gates.** Rerun relevant repository, property, type/editor, compatibility, packed-package, and documentation gates. Bind fresh results to the exact source/environment. Run existing approved budgets only; leave pending thresholds and absent device baselines incomplete.
3. **M10.5.3 — Visual/device disposition and roadmap closeout.** Run visual and native-device checks only where the necessary services and devices are available. Retain direct artifacts, or leave the rows and M10.5 incomplete with explicit dependency reasons. Publish the resulting matrix in the docs source and close M10.5 only when its required gates pass or an explicit user-approved scope change changes the exit criteria.

Each implementation slice ends with focused verification and a commit. M10.5.1 and M10.5.2 can make progress without hardware; neither may mark device rows as accepted. The current CoreSimulatorService failure is an environment observation, not a permanent statement about simulator availability.

## Acceptance evidence

1. Schema tests accept a complete representative matrix and reject unknown versions/fields, duplicate row IDs, missing required domains, invalid status combinations, and invalid evidence metadata.
2. Path tests reject absolute paths, traversal, backslashes where disallowed, source references resolving outside the repository, and evidence paths resolving outside the repository evidence root.
3. Determinism tests prove repeated rendering produces byte-identical Markdown for the same JSON input and that semantically relevant row order follows the documented domain/ID order.
4. Status tests prove absent, stale, failed, and uncalibrated evidence cannot render as a passing guarantee; explicit `unsupported` rows require a cited contract/policy basis reference.
5. Existing budget validation is captured separately from budget readiness. Pending thresholds, missing baselines, or diagnostic baselines keep performance qualification incomplete.
6. Current compatibility/property/type/editor/package/docs checks are run from the selected source revision and their receipts record exact commands and environments. The matrix check requires passed/failed evidence to match the latest commit touching a path outside `docs/`; historical records retain their original revision and cannot be silently relabeled current. Docs-only receipt commits therefore do not invalidate the source they describe.
7. Visual and device entries carry direct screenshot/runtime evidence when available. Otherwise, they remain `not-run`; simulator discovery failure, no physical device, and the parked Android decision are recorded independently.
8. The generated reference page passes `bun run docs:build`, and `guarantees:check` detects stale output, invalid evidence references, and unsafe generated-page destinations.
9. M10.5 is not marked complete while a required budget is missing, uncalibrated, failed, or not run. If unavailable hardware leaves a required row open, the roadmap says so and identifies the next action without overstating qualification.

## Risks and mitigations

- **A matrix can make weak claims look authoritative.** Use separate support and measurement fields, exact scope limits, and evidence identities; do not label a row `supported` solely because a test passed.
- **Historical evidence can be mistaken for current qualification.** Keep source revision and environment on every evidence reference; mark it stale or historical when it does not apply to the current claim.
- **Host test success can be mistaken for a device budget.** Require the environment class and budget ID to match; device-frame, memory, allocation, and screen-reader claims stay open without their target environment.
- **Hand-maintained evidence references can drift.** Validate repository-relative paths, hashes, schema, and generated-page equality in the normal checks.
- **One matrix can imply exhaustive coverage.** State explicit roots, package/version matrix, and omitted dimensions on the page; unknown coverage remains `unspecified` or `not-run`.

## Design boundary

This is a repository documentation and qualification system. The JSON format is a versioned internal evidence contract, not a new public runtime API. The reference page is built by the existing documentation site; building it is not a deployment or package release. Existing performance approvals remain owned by the existing reviewer-recorded registry protocol.
