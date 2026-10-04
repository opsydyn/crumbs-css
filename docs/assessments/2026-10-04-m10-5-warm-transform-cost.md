# M10.5 warm-transform cost candidate review

No production optimization was justified by the focused measurements. The current host comparison records a README warm-transform median of 8.033 ms and a package-owned consumer median of 7.372 ms, above the unchanged 6.514 ms ceiling (5.664 ms baseline). The profile shows several possible costs, but the scratch candidates did not produce a repeatable improvement across both fixtures.

The one-millisecond Bun CPU profile covered 100 repeated strict transforms of `packages/css/examples/recipe.css.ts` from the package root. It attributed 11.5% total sampled time to `sourceIdentity`, 9.4% to `readFileSync` (7.3% self), 14.7% to Effect `SchemaParser.parseLocal`, and 34.1% to `vm.runInNewContext` (3.1% self). A scratch count found ten local CSS rules with one distinct file path in that fixture.

Three scratch candidates were evaluated with alternating fresh-process A/B runs. Hoisting the Effect 4 decoder factories preserved both output hashes but was slightly slower by the median of process medians. A per-transform source-identity map showed a small reduction, but the ranges overlapped, both fixtures remained above 6.514 ms, and its output differed only in the `@crumbs-native-cache` marker. An unbounded scratch `vm.Script` cache did not improve both fixtures and is not a viable production design. None of these changes was copied into the repository.

The existing benchmark workload, cold/warm parity assertion, thresholds, and baselines remain unchanged. The full Node 22 matrix was not rerun because no candidate had sufficiently clear focused evidence for production qualification. The exact profiles and per-process medians are in [the retained qualification](../evidence/2026-10-04-m10-5-warm-transform-cost/qualification.json).

M10.5 remains open; Android remains last. Next recommended slice: **M10.5 exact-workload phase attribution inside Vanilla Extract integration compilation and generated-module evaluation**, then test one bounded candidate at that boundary before rerunning the full Node 22 matrix.
