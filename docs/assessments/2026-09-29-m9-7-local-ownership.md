# M9.7 Local Ownership Reports Qualification

**Status:** qualified for local source/tooling inputs. This does not qualify
package publication, visual acceptance, native device behavior, or Android.

## Result

M9.7 adds a tooling-only `@opsydyn/crumbs-css/tooling/ownership` entrypoint
and the explicit-file `ownership:annotate` command. Teams can keep owner IDs
and assignments in a versioned local JSON map without changing manifest v1 or
adding owner metadata to the portable design-system contract.

The annotator accepts compatibility, policy, source-migration,
style-explanation, and DTCG import reports. It uses exact stable manifest IDs;
style variable names are accepted only when they identify exactly one token
in the supplied manifests. The command reads only the ownership map,
manifests, and report named by its flags. It prints canonical JSON or a text
summary with counts and source JSON Pointers; it does not discover files or
write an output file.

Assigned, unassigned, and unresolved references remain distinct. Unresolved
reasons identify missing stable IDs, entities absent from the supplied
manifests, or ambiguous style variable names. Valid reports exit `0` even when
coverage is partial; malformed or incompatible inputs exit `2`. The output
retains the explicit-manifest and report-subject coverage limits.

## Fixture qualification

The checked-in matrix covers compatibility, policy, migration,
style-explanation, DTCG success, and DTCG failure reports. The successful
fixtures produced 5 assigned, 5 unassigned, and 5 unresolved attributions;
the DTCG failure fixture added one unresolved document diagnostic. Totals are
5 assigned, 5 unassigned, and 6 unresolved. The receipt stores relative
fixture paths, byte counts, fixture SHA-256 digests, canonical owned-report
output digests, report family/version values, and attribution counts.

The repeated qualification runs produced identical receipt bytes with SHA-256
`c422976b5a7e4d7b3395aac45a7f32a6d1d437e05c75f1864361f2211538cf1d`. See the
[qualification receipt](../evidence/2026-09-29-m9-7-ownership/qualification.json).

## Verification

- `bun run check` — passed: package build and typecheck; 1,267 CSS package
  tests across 204 files with 47,558 expectations; one Storybook test with
  seven expectations.
- `bun run docs:build` — passed; all 26 documentation pages built, including
  the local ownership guide.
- `bun run ownership:qualify` — passed on repeated runs; fixture and output
  digests remained stable.
- `bun test packages/css/test/ownership-*.test.ts
  packages/css/test/pack-consumer-contract.test.ts
  packages/css/test/metro-tree-shaking-contract.test.ts` — passed: 63 tests
  across 11 files and 789 expectations.
- `bun scripts/playground-distribution.ts --m8-3-check` — passed packed
  exports, runtime graphs, consumer typecheck, iOS and web production exports,
  and the paired tree-shaking canary. This was an interim dirty-source run at
  HEAD `e900076`; Android was `not-run`. It does not establish a clean-source
  release receipt or device acceptance.
- `git diff --check` — passed.

The public tooling API returns ordinary TypeScript values and JSON. Effect 4
Schema remains internal to the opt-in tooling graph; application consumers do
not add an Effect dependency or runner. The adapter contract requires no
editor selection, hosted account, or telemetry service.

## Boundaries

Attribution covers only the manifests explicitly supplied to an operation and
the source references in the selected report. It does not find missing
manifests or consumers, apply ownership policy, infer identity from names, or
make release decisions. Package publication, visual acceptance, native device
behavior, and Android remain not-run. Android stays parked.

## Next roadmap item

The next numbered roadmap item is **M10.1**: complete packed public-API
reference design-system examples for typography, button, input, selection
controls, card, and dialog integration. Android/device acceptance remains
parked.
