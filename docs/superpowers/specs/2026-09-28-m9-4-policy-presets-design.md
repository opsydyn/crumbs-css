# M9.4 Versioned Design-System Policies

**Status:** Draft for user review; implementation is not approved yet.

**Date:** 2026-09-28

**Roadmap:** M9.4 in [roadmap.md](../../roadmap.md)

**Governing decisions:** D5, D9, D10, D11 and D12 in the [design-system ADR](../../decisions/adopt-native-design-system-compiler.md)

**Depends on:** [M9.1 deterministic manifests](2026-09-27-m9-1-deterministic-manifest-design.md), [M9.2 manifest compatibility checks](2026-09-27-m9-2-manifest-compatibility-design.md), and [M9.3 style explanations](2026-09-27-m9-3-style-explanations-design.md)

## Intent

Let design-system teams define and adopt machine-checkable local policies over explicitly supplied Crumbs evidence. Policies cover semantic-token use and literals, private surfaces, platform capabilities, deprecations, and measured output budgets. Teams can begin with visible low-severity findings and raise selected rules over time. Exceptions remain typed, reasoned, scoped, and visible.

The policy engine is a development and release-review tool. It does not decide whether a release is safe, and it does not inspect files beyond the inputs the caller names.

## Approved understanding

- M9.4 is the next roadmap item and the user approved a separate tooling API and local CLI design.
- Preserve M9.1 manifest v1 and M9.2 compatibility-report v1. Policy and policy-report schemas have their own versions.
- Keep policy code and Effect 4 Schema outside ordinary styling, theme, and React Native runtime graphs. Consumer-facing data remains plain typed records.
- Read only explicitly supplied manifests, M9.3 style-explanation metadata sidecars, policy files, and output measurements. Do not crawl source trees, discover consumers, inspect Git, contact registries, or infer device state.
- Android and physical-device acceptance remain parked.

## Goals

- Define a versioned policy document with named built-in `migration` and `enforce` presets, per-rule severity overrides, and explicit rule configuration.
- Support stable rule IDs for semantic-token requirements, literal values, private-token use, unsupported platform capabilities, deprecated entities, and output-budget overruns.
- Consume M9.3 declaration metadata to inspect authored values. Join a token reference to a manifest token only through its deterministic contract identity and variable name; unknown references reduce coverage and never become guessed token identities.
- Reuse the established M9.2 consumer analysis for private-token findings rather than reimplementing its dependency semantics.
- Accept output measurements as explicit numeric input. A budget finding must identify the supplied metric and scope; the policy checker does not claim to measure a native app bundle itself.
- Support incremental adoption through visible `info`, `warning`, and `error` levels. A lower level remains in reports; policy rules are not silently disabled.
- Support exact-entity exceptions with a required non-empty reason and optional expiry. Expiry is evaluated against an explicit date supplied by the caller, never the machine clock.
- Produce deterministic structured reports and a local command suitable for CI use without hosted services.

## Non-goals

- Do not mutate or version-bump the M9.1 manifest or M9.2 report formats.
- Do not crawl source, infer semantic token classifications from names, discover policy files, inspect repository history, or resolve external packages.
- Do not turn findings into automatic release blocks, SemVer advice, or accessibility/visual claims.
- Do not permit arbitrary code, TypeScript casts, glob exceptions, wildcard entity matches, or unreasoned suppression.
- Do not compile apps, measure runtime performance, inspect native bundle formats, or add Android/device qualification.
- Do not add policy imports to ordinary runtime entrypoints or change production style output.

## Selected architecture

Add a tooling-only `@opsydyn/crumbs-css/tooling/policy` package subpath. It consumes the existing schema-v1 manifest and M9.3 versioned style metadata as explicit plain-data inputs. Keep the policy API, policy/report schemas, canonical serializer, rule evaluator, and CLI in separate focused modules. Effect 4 Schema validates policy, metadata, and reports internally; exported values remain ordinary TypeScript data.

Keep policy findings in their own report instead of extending `manifest:check`: compatibility and governance rules have different versioning and exception semantics. Do not embed policy in manifest v1, which would put team-specific governance in an interchange artifact and break the approved manifest boundary.

The public API is conceptually:

```ts
const report = checkDesignSystemPolicy({
  policy,
  current,
  consumers,
  styleMetadata,
  measurements,
  evaluatedOn,
})
```

`current` is one decoded design-system manifest. `consumers`, `styleMetadata`, and `measurements` are explicit optional arrays. `evaluatedOn` is an ISO calendar date and is required when an exception has an expiry. Inputs are detached and validated before evaluation. Unknown or malformed versions fail with stable input errors; missing evidence produces explicit coverage limits.

The version-1 policy document contains a stable policy ID and positive integer version, a reference to the built-in preset and preset version, per-rule severity overrides, explicit semantic token IDs and property scopes, target capability profiles, output-budget definitions, and exact-subject exceptions. Preset definitions set the initial severity for each rule: `migration` assigns warning to enabled checks, while `enforce` assigns error. A policy may override a rule with `info`, `warning`, or `error`; the rule remains visible at every level. Both preset versions are pinned independently from the policy and report schemas. No `off` level silently suppresses evidence.

## Rule semantics

| Rule ID | Evidence and behavior |
| --- | --- |
| `style.literal-value` | Reads authored declaration candidates in supplied M9.3 metadata and flags non-token values only for configured property/domain scopes. Opaque or incomplete metadata creates a coverage limit. |
| `style.semantic-token-required` | For configured properties, requires a token reference whose manifest stable ID is explicitly classified as semantic by the policy. Do not infer semantic meaning from token paths or names. |
| `consumer.private-token` | Reuses M9.2's explicit consumer-manifest analysis and preserves its direct-edge and coverage limits. |
| `capability.not-supported` | Compares manifest compiler-observed primitive/property capabilities against each explicitly named target profile in the policy. No implicit Android or platform support is assumed. |
| `entity.deprecated` | Reports manifest entities carrying M9.1 lifecycle metadata, including supplied reason and replacement. The rule level is policy-controlled; no wall-clock grace period is inferred. |
| `output.budget-exceeded` | Compares a policy budget with a matching explicitly supplied measurement and unit. Missing measurements produce a coverage limit rather than a pass. |

Every finding carries a stable rule ID, effective level, entity or metric identity, field path, concise message, and the evidence needed to reproduce the decision. Findings are sorted by stable ordinal keys. Coverage limits identify missing manifests, missing style sidecars, unresolved token identities, incomplete declaration metadata, absent target profiles, and absent output measurements as applicable.

## Incremental adoption and exceptions

A policy may override a preset's rule level with `info`, `warning`, or `error`. `info` is the lowest visible level; it does not discard a finding. The CLI exits 1 when an unexcepted finding remains at `error`, 0 when no effective error remains, and 2 for invalid arguments or malformed/incompatible inputs.

An exception identifies exactly one known rule ID and one stable subject ID (a manifest entity, declaration, capability, or measured output), includes a non-empty reason, and may include `expiresOn` in `YYYY-MM-DD` form. It cannot match every entity or an arbitrary source pattern. When `evaluatedOn` is on or before `expiresOn`, the finding remains in the report with an explicit excepted disposition and its reason. After the expiry date, the original finding is active and an `exception.expired` diagnostic is reported. An exception that matched no finding is reported as `exception.unused`. These two exception diagnostics are report codes, not suppressible policy rules; expiry is a warning and unused exceptions are informational. Duplicate exception keys and unsupported rule IDs fail closed. If a policy contains an expiry but omits `evaluatedOn`, input validation fails rather than consulting the system clock.

## Report and command behavior

The report has a distinct format identifier and schema version and records the policy identity, selected preset/version, provider identity, supplied consumers, deterministic findings, applied/expired/unused exceptions, and analysis limits. It contains no absolute paths, machine identity, or implicit timestamps. If `evaluatedOn` was supplied, it is recorded as an explicit input. Identical validated inputs produce byte-identical canonical JSON.

Add a repository-local `policy:check` command. It requires an explicit policy file and current manifest, accepts repeatable consumer manifests and style metadata sidecars, accepts explicit measurement data, and supports text or canonical JSON output. The command reads only the named files and writes the report to stdout. It does not discover defaults by walking the checkout or contact an external service.

## Acceptance evidence

1. Policy and report schema tests cover exact tags/versions, valid and invalid rules, duplicate IDs, unknown fields, invalid levels, and malformed dates.
2. Preset tests pin each built-in preset version and prove per-rule overrides retain visible findings while changing effective levels.
3. Style-policy fixtures cover semantic and non-semantic token references, raw literals in configured scopes, non-matching scopes, opaque values, missing metadata, unknown token mappings, and deterministic source-relative evidence.
4. Private-token tests reuse M9.2 behavior for explicitly supplied consumers and preserve its analysis limits.
5. Capability, deprecation, and output-budget tests cover supported/unsupported targets, lifecycle annotations, units and thresholds, missing measurements, and no inferred platform support.
6. Exception tests cover exact matching, required reasons, expiry boundary dates, expired and unused exceptions, duplicates, and the required explicit evaluation date without consulting the clock.
7. Property tests establish report stability under input/finding permutations and independent agreement for threshold comparisons and exception matching.
8. CLI tests invoke the real command with explicit files and cover text/JSON equivalence, repeated inputs, exit codes 0/1/2, unreadable files, malformed inputs, unsupported versions, and absent required inputs.
9. Packed ESM/CommonJS/type consumers and runtime-graph checks prove the new tooling entrypoint remains isolated from ordinary theme/style/runtime imports.
10. Documentation explains the presets, severity migration, each evidence source, exception visibility/expiry, output measurement responsibility, report limits, and local command.
11. A fixture-backed qualification receipt records policy/fixture/report digests and passing gates without absolute paths or timestamps. Android and device acceptance remain not-run and parked.

## Risks and mitigations

- A name-based token classification could silently misclassify a token. Require explicit stable token IDs in the policy and a deterministic match from the supplied manifest/style metadata; report unknown mappings as incomplete coverage.
- Teams could mistake a migration preset for a clean bill of health. Keep low-level findings visible and state that policy output is evidence from supplied inputs only.
- Exceptions could become permanent undocumented bypasses. Require reasons, scope them to one stable entity and rule, report use and expiry, and make date evaluation explicit.
- A missing artifact measurement could look like a passing budget. Treat it as incomplete coverage and never as zero.
- Policy findings could be mistaken for release decisions. Keep exit codes mechanical and document that release ownership remains with maintainers.
