# M10.5 consumer compiler slowdown reproduction

Date: 2026-10-12. Status: known regression reproduced; reported consumer 2.5× ratio unverified.

Five fresh processes of the unchanged source benchmark reproduce warm compilation at **9.562208 ms**, **68.821%** above its historical **5.664125 ms** baseline. Cold compilation also fails locally at **93.114542 ms**, **40.223%** above **66.404584 ms**. The existing comparator accepts recorded environment and measurement identity for both scoped rows. These are fresh host observations, not a complete release gate or a same-session historical-source A/B.

A separate isolated consumer uses retained verified npm **1.1.1** bytes and locked dependencies. Its compiled transformer takes **9.161750 / 8.806041 ms** warm under Node 24.15.0 for the recipe/button fixtures. Five Node/Bun cohort pairs retain exact output parity across 240 cold/warm samples. Independent diagnostic profiles locate the largest measured boundary in fresh Vanilla Extract compilation; no profile is substituted for an uninstrumented timing result.

[Raw samples, identity, comparator, reproduction worker and verifier](../evidence/2026-10-12-m10-5-consumer-compiler-reproduction/README.md) retain the evidence and protocol differences. The consumer's comparator, versions and app have not been supplied, so **2.5× is not established** and the known regression's precise causal change is not isolated. Published-workload timings cannot replace the historical source benchmark.

No product source, API, dependency, budget, baseline, release policy or publication changes. Earlier experimental caches remain unshipped. Native/device performance and deferred physical work are outside this investigation.

**Next recommended roadmap slice: M10.5 — obtain the consumer workload and comparator, reproduce the reported ratio in a matched environment, then profile compilation and Metro invalidation before selecting an API-preserving fix.** Include the newly observed cold source-budget failure in attribution.
