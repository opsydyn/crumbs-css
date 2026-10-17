# M10.5 repeated package-compilation cost attribution

**Decision: do not start another fresh-packaging implementation from this evidence.** Repeated unchanged package inputs are confirmed, but their exclusive removable cost is not established. The enclosing compilation interval is large enough that it cannot rule out a reuse mechanism. That is an opportunity envelope, not a measured saving or a release pass.

Assessment base: `cbf1fd6`. The user approved a bounded read-only attribution on the existing compiler graph and provenance guard. No shipping source, dependency, build grouping, cache, public API, guard or budget changed. This packet records one diagnostic cohort, not another compiler candidate.

## Measurement

Five serial alternating control/profile process pairs use Bun 1.4.2, integration 8.0.10 and esbuild 0.27.7 over the actual unchanged compiled CJS transformer. Each fixture has two setup calls and six retained complete transforms. Pair order and fixture order alternate; process cwd remains the actual `packages/css` directory for both fixtures. All 120 retained and 40 setup transforms are preserved. One earlier observer pilot is retained separately and excluded from the cohort by protocol.

Control calls the stock transformer with no observers. Profile wraps the existing integration compile, esbuild build, existing onLoad callbacks and synchronous host reads **in process memory**. It does not edit installed modules, replace a loader result, add a metafile callback, retain an esbuild context, externalize package code or replay a result. Hashing and input inventory reads happen after the full-transform timer and after observers are disabled. Observers perturb execution; variant differences are not optimization gains.

The selector is derived per process as the worse fixture's nearest-rank p50, then the median across five processes. It is **9.754 ms control / 9.687 ms profile**; ranges are 9.221–10.232 / 9.428–11.387 ms. This diagnostic uses compiled CJS, not the official source-import host protocol, and cannot qualify the unchanged ceiling or be subtracted from an older release run.

| Median of five process p50s, milliseconds | README | Consumer |
| --- | ---: | ---: |
| Control full transform | 9.221 | 8.489 |
| Profile full transform | 9.510 | 8.736 |
| Profile integration compile | 5.589 | 4.997 |
| Profile esbuild build, nested in compile | 5.554 | 4.981 |
| Profile authored CSS callback interval union, nested in build | 0.914 | 1.315 |
| Profile synchronous host-read interval union, across transform | 0.569 | 0.481 |

Do not add these nested intervals. Native package processing can overlap callback waits; subtracting callback time from build time does not establish package-exclusive CPU or removable wall time. Synchronous host-read observation excludes native esbuild filesystem work and asynchronous CSS reads.

## What is repeated, and what could be saved

All 60 observed retained transforms perform one fresh compilation each. The first setup for each fixture performs two for existing stable-resolution confirmation; other setup calls perform one. The 90 observed compilations retain the same ten-input graph per fixture: eight identical Crumbs `dist` files totaling **78,679 metafile input bytes**, plus two authored inputs. There are no bundled vendor inputs; Vanilla Extract externals remain external. Metafile bytes are input-size observations, not parse time, physical read counts or removable emitted bytes.

All 160 final output hashes agree by fixture between variants and processes. Observed compiled source hashes, full metafiles, input hashes and watch inventories agree by fixture across the 90 observed compilations. Inputs were not observed in the uninstrumented control, so no control-side compiler-inventory claim is made. The 948 tracked non-document product files and all 181 shipping artifacts preserve their original bytes; modes are also checked for tracked files.

The broadest simple fixed-remainder model makes the **entire integration compile free**, including necessary authored work. Its per-sample remainder, summarized without subtracting unrelated medians, is 3.945 / 3.642 ms. That envelope could cover the local diagnostic gap. Reaching the reference ceiling would require removing a median **54.44% / 44.48% of that entire compile interval** in the paired samples. There is no measurement assigning that fraction to avoidable package work. This is neither a realizable candidate nor a universal speed limit after architectural changes.

A separate model makes **every observed synchronous host read free** while holding other spans fixed. Its remainders are 8.994 / 8.222 ms, still above the reference ceiling. It rules out those measured spans alone in this fixed-remainder model, not all filesystem work or a larger architectural change. These two hypothetical savings overlap and must not be added.

The retained release result remains 12.346250 ms against an effective 6.513743750000014 ms warm ceiling, requiring 47.24% less time. That result and policy are copied byte-for-byte for context; do not compare its absolute durations with this diagnostic. Cold, warm and incremental failures remain unchanged. No registry or hosted state was refreshed in this slice.

## Recommendation and stop boundary

Park further file-count/grouping/kernel changes as release remediation. They still compile the package bodies and no qualifying effect size has been demonstrated. Keep the current provenance guard; the rejected metadata replacement adds no release prerequisite.

**Next proposed M10.5 slice: one compiler-reuse architecture decision**, comparing content-addressed reuse of immutable package-compilation work with retaining fresh compilation. Define fresh resolution and package/configuration verification, exact content invalidation, request-owned authored CSS/evaluation, canonical bindings/adapter state, bounded ownership/disposal and concurrency before any code experiment. Earlier context reuse missed the warm limit and did not prove Metro lifecycle ownership; this is not permission to revive it. If no concrete safe mechanism and end-to-end saving hypothesis can be specified, park the route and return to an explicit release decision rather than another speculative prototype. This assessment does not begin that design or waive any gate.

## Reproduce and verify

`repro/measure.cjs <absolute-css-package-root> control|profile <pair-number> <output.json>` runs one process. Use the existing dependencies; no install/build is needed. Odd pair numbers run README then consumer; even numbers reverse. Run pairs 1–5 serially, control/profile in odd pairs and profile/control in even pairs. `commands.json`, `protocol.json` and `environment.json` retain the exact local invocation and identity. Paths and tool versions are local context; this is not a portable timing baseline.

Run `PYTHONDONTWRITEBYTECODE=1 python3 verify.py --self-test --repository <absolute-repository-root>` to rederive all summaries, interval unions, graph/output agreement, preservation and unchanged reference policy/report. Omit `--repository` for relocated packet integrity/derivation only. Self-tests cover relocation, overlapping intervals, changed output, missing package input, false qualification and corrupt raw evidence. Semantic controls update the affected integrity pin before verification so a digest mismatch cannot be the sole rejection.

The inventory establishes integrity and derivation, not independent execution attestation. Full source-host qualification, dependency edit/restore, cold/incremental, SDK/Metro/native/device checks and publication were not run. Physical acceptance remains deferred. No public push or publication is authorized by this packet.
