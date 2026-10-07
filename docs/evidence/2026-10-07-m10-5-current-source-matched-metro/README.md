# M10.5 current-source matched Expo/Metro evidence

This packet requalifies incremental rebuild using the approved Expo/Metro stack and current Crumbs CSS runtime artifacts. The [five-run report](metro-incremental.json), machine-readable [qualification](qualification.json), and [runtime artifact hashes](runtime-artifacts.sha256) retain the workload and artifact identities.

The isolated dependency scaffold resolves Expo 56.0.4, Metro 0.84.4, React Native 0.85.3, Expo Metro config and runtime 56.0.12, React and React DOM 19.2.5, and babel-preset-expo 56.0.12. Its lockfile is the approved 43c5ece baseline. Current Crumbs dist files were overlaid from compiler revision `dbf491d12c5700f50c77d646873bece3bf341f20`. The current Metro config and all five benchmark fixture hashes match that source snapshot. The disposable app adds the current source app's direct Vanilla Extract resolver edge at the lockfile's 1.20.1 version; the release-gate scaffold keeps the Crumbs package's runtime dependency links from the same frozen baseline install so the transformer adapter resolves there as well. No Expo, Metro, React, or React Native version changed.

## Result

| Sample | Edit-to-receipt |
| --- | ---: |
| 1 | 130.280208 ms |
| 2 | 130.756042 ms |
| 3 | 130.363208 ms |
| 4 | 132.359291 ms |
| 5 | 129.653541 ms |
| **Median** | **130.363208 ms** |

The approved baseline median is 123.950500 ms. This is a 5.17% increase, below both the 136.345550 ms relative maximum and the 137.506 ms absolute maximum. The three dependency invalidation controls, persistent `strictDiagnostics` cache control, and fixture restoration checks passed.

## Reproduction

Use a disposable checkout of the approved lock scaffold at `43c5ece39360cf321fdb074d82cee41d5daaba23`. Install its Playground dependencies and confirm the resolved versions above. Overlay the current `packages/css/dist`; the current Metro config and five fixtures are identified in `qualification.json`. Run the benchmark from the current Crumbs source checkout using an unused localhost port:

```sh
CRUMBS_INCREMENTAL_REPO_ROOT=<baseline-lock-checkout> \
CRUMBS_INCREMENTAL_APP_ROOT=<baseline-lock-checkout>/apps/playground \
CRUMBS_METRO_PORT=<unused-local-port> \
bun packages/css/bench/metro-incremental.ts <output.json> 5
```

The raw runner revision identifies the locked consumer scaffold. The qualification separately pins the current product source, runtime artifacts, benchmark inputs, and exact tool versions. `SHA256SUMS.txt` covers the raw measurement and artifact manifest.
