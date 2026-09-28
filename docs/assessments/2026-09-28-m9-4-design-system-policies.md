# M9.4 Versioned Design-System Policies Assessment

**Disposition:** M9.4 is qualified for the checked-in explicit-fixture policy
contract, package entrypoint, repository checks, and available packed iOS/web
export matrix. Android and physical-device acceptance remain not-run and
parked.

## Delivered behavior

The tooling-only `@opsydyn/crumbs-css/tooling/policy` entrypoint provides
schema-v1 policies and canonical reports with independently versioned
`migration@1` and `enforce@1` presets. It evaluates scoped literal use,
semantic-token classification, private-token references from supplied
consumers, compiler-observed capabilities against explicit target profiles,
token/component lifecycle metadata, and exact output-budget measurements.
Findings retain their identity when severity changes or an exact exception is
applied. Exceptions require reasons, can use a caller-supplied expiry date, and
remain visible alongside expired or unused-exception diagnostics.

The local `policy:check` command accepts only explicitly named files. No source
or workspace discovery, hosted service, automatic release decision, or
application-runtime policy import was added. Effect 4 Schema remains behind the
tooling boundary; the public API returns ordinary TypeScript records.

## Qualification evidence

The deterministic fixture set contains a provider manifest, one consumer
manifest, one style metadata sidecar, one measurement list, and one policy.
The canonical report records seven findings across all six rules: six active
and one excepted. All seven have warning severity under `migration@1`. It also
retains one `exception.unused` diagnostic and two `consumer-coverage` analysis
limits. The receipt hash-links every fixture and the report, records an
explicit evaluation date, and contains only repository-relative paths.
See the [policy report](../evidence/2026-09-28-m9-4-design-system-policies/policy-report-v1.json)
and [qualification receipt](../evidence/2026-09-28-m9-4-design-system-policies/qualification.json).

- `bun run check` passed: build and typecheck passed; CSS reported 1,062 tests
  and 44,358 expectations across 176 files; Storybook reported 1 test and 7
  expectations.
- `bun run docs:build` passed with 23 pages, including the [policy how-to](../src/content/docs/how-to/check-design-system-policy.mdx).
- `bun scripts/m9-4-policy-qualification.ts` regenerated the report and
  receipt; repeat evaluation produced byte-identical output.
- `bun run playground:distribution --m8-3-check` passed for 16 packed export
  targets and 31 runtime graphs. Packed consumer typechecking, iOS/web
  production exports, and the paired tree-shaking canary passed. The command's
  interim qualification was written under its temporary build directory.
- The focused policy, packed-export, consumer-contract, runtime-isolation,
  and packed-runtime-graph command passed: 94 tests and 1,082 expectations
  across 15 files.
- `git diff --check` passed.

## Limits

The fixture is intentionally synthetic. Its 11,000-byte measurement exercises
a 10,000-byte budget; it is not a measured application bundle. The manifest
and style metadata cover selected roots, and the one supplied consumer does
not establish complete consumer coverage. The report retains manifest-v1
limits for component slot/variant attribution. The explicit `ios` profile does
not establish Android capability support.

The packed distribution check provides package/export and iOS/web production
bundle evidence for this run. It does not establish native rendering, physical
device performance, accessibility, release safety, publication, or deployment.
No package was published or release changed. Android and device acceptance
remain not-run and parked.

## Result

The planned M9.4 implementation, deterministic fixture evidence, documentation,
full repository checks, packed distribution check, and focused tooling/runtime
gates passed. This closes M9.4 only. The next roadmap item is M9.5: replacement
metadata and safe token/recipe-slot codemods. Android/device acceptance stays
parked.
