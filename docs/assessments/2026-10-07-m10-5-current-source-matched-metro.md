# M10.5 current-source matched Metro requalification

- Date: 2026-10-07
- Roadmap: M10.5
- Status: incremental-rebuild comparison passed
- Product source revision: `dbf491d12c5700f50c77d646873bece3bf341f20`
- Source identity: `4e519e759379541fbdc557e61e3968e59c94c6f3e617508271f4ace56d6ef70d` (675 files)

## Decision

The latest full host-budget run marked Metro incremental rebuild incomplete because its consumer resolved Expo 56.0.23 and Metro 0.84.5 instead of the approved Expo 56.0.4 and Metro 0.84.4. I reran the same five-sample workload in an isolated scaffold with the approved Expo 56.0.4, Metro 0.84.4, React Native 0.85.3, React 19.2.5, and Expo Metro packages. I overlaid the current Crumbs runtime artifacts and verified the current Metro config and fixture hashes.

The median was **130.363208 ms**, or **5.17%** above the approved 123.950500 ms baseline. It passes the unchanged 136.345550 ms relative cap and 137.506 ms absolute maximum. Dependency invalidation, persistent `strictDiagnostics` behavior, and fixture restoration all passed. See the [evidence packet](../evidence/2026-10-07-m10-5-current-source-matched-metro/README.md).

This resolves the prior incomplete Metro comparison. Across the 21 host metrics, the previous 11 pass, nine fail, and one incomplete state now has **12 passing metrics and nine failures**, with no incomplete environment comparison. The nine remaining failures are four runtime-initialisation metrics, warm transform, and four theme graph-size metrics. No source code, package dependency, API, limit, baseline, or selector changed. This host development-bundle result does not claim release Hermes, device rendering, or physical-device acceptance.

## Next item

**M10.5 — select one API-preserving remediation candidate for the remaining runtime-initialisation, warm-transform, and theme graph-size failures.** Keep every approved budget fixed and require exact output parity before production admission.
