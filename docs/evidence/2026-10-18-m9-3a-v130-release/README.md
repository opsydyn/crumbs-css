# M9.3a — v1.3.0 publication

Published `@opsydyn/crumbs-css@1.3.0` as npm `latest`, verified 2026-10-18. [GitHub release](https://github.com/opsydyn/crumbs-css/releases/tag/v1.3.0), [npm package](https://www.npmjs.com/package/@opsydyn/crumbs-css/v/1.3.0) and [successful normal publication workflow](https://github.com/opsydyn/crumbs-css/actions/runs/39148889833).

- Exact source: `eefe7da702db02aea14f346afa7459cefa93dda5`.
- Exact tarball SHA-256: `13ad1d818d3754fc60418fe5c7a253dff53da444bfdf7668bad80323f45c3d58`.
- [Qualification manifest](qualification-manifest.json), [SDK matrix](sdk-matrix.json), [SDK receipt summary](sdk-summary.json) and [registry/publication verification](publication.json).
- [Host comparison](host-comparison.json): all 11 blocking budgets pass under the previously accepted fixed baseline. Cold 73.528 ms; warm 9.665 ms; incremental 136.641 ms. Two advisory metrics pass and eight fail; whole-registry performance qualification remains false. No new exception or baseline amendment.
- SDK56/57/58 checks pass strict installation, installed bytes, types, motion, all-platform exports and runtime provenance for the same release tarball. The Ubuntu publication job independently verifies the transferred bundle before npm publication with provenance.
- Registry version and `latest` tag verified; downloaded tarball SHA-256 and npm SHA-512 integrity match the qualified bytes. Its export map contains the ESM/CJS native inspector entry. A fresh npm SDK58 consumer passes types and iOS/Android/web exports with three runtime source maps verified.

[PR #14](https://github.com/opsydyn/crumbs-css/pull/14) merged the feature and qualification, and [PR #13](https://github.com/opsydyn/crumbs-css/pull/13) changed only version/changelog metadata. The initial feature CI found floating Clipboard/safe-area ranges in retained SDK profiles; an actual-profile regression reproduced it, the existing compatible versions were pinned, and [fresh full CI](https://github.com/opsydyn/crumbs-css/actions/runs/39147423917) passed 1,932 package tests (one existing opt-in skip) and 34 Storybook tests. The exact-version validator was retained. npm acknowledged publication before its public metadata became visible; publication was not retried.

The one-job Mac runner deregistered and its owned temporary checkouts were removed after retrieving the sealed bundle. Full hosted report/log/receipt bytes are in the workflow's `crumbs-release-qualification-v1.3.0` artifact (14-day retention); the committed manifest preserves their hashes, and the compact receipt summary avoids machine-specific paths. The separately retained local sealed bundle remains available.

The [native qualification packet](../2026-10-18-m9-3a-qualification-closure/README.md) and [screenshot guide](../../src/content/docs/how-to/explain-native-styles.mdx) retain their scope. Physical devices, spoken readers, independent usability and release frame/heap benchmarks remain deferred. Development source cost results do not become exact-release device performance evidence.
