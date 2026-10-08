# M10.5 budget/API scope diagnostic packet

This packet compares the exact M4.6 admitted source/build scope with the expanded synchronous API. It does not admit code, change a budget or qualify a release.

Run from the repository root:

```sh
python3 docs/evidence/2026-10-08-m10-5-budget-api-scope/verify.py
```

The offline verifier checks local/reference hashes, source/config bindings, all twelve retained graph totals, historical artifact identity against admission, export-count/set arithmetic, source-origin totals and the four failures against unchanged limits. It does not execute a build/import, independently parse import closures, reproduce Git ancestry, prove behavioural/type parity or authenticate an approval. The canonical scanner and Node import collectors produced those raw observations; the source-history collector checked ancestry against Git.

- `baseline-package.tar.gz`: all historical CSS sources, package/build configuration and freshly built core/theme ESM/CJS artifacts. Every admitted runtime artifact hash matches.
- `baseline-minified-package.tar.gz`: the same historical inputs and a separate minification-only scratch build. Neither archive includes dependencies or modifies shipping output.
- `sources.json`: full manifests for baseline, admission and current source/config; relevant full commit IDs and changed paths. Only the explicitly listed source/build scope is compared between baseline/admission.
- `graphs.json`: twelve fresh canonical scans over historical, historical-minified and frozen current artifacts.
- `exports.json`: eight Node namespace observations. Presence-only, not declaration/behaviour parity.
- `review.json`: derived comparison rows and current minification-only source-origin allocations from the earlier attribution packet.
- `packet.json`: hashes of retained collectors/raw records and referenced historical admission, frozen current package, attribution/maps and unchanged budget registry.

Current source/artifacts are referenced through the previous frozen control archive instead of duplicated. The current minification-only artifact cohort lives in the prior mapped-artifact archive's `minified-control/reference/` directory. The full current source/config manifest was compared with the reviewed Git revision and the frozen current archive. Shipping identity was captured before and after this documentation slice separately; the offline verifier's source-manifest checks are narrower than the 694-file shipping identity capture.

`build.mjs`, `measure.ts`, `exports.mjs` and `collect.py` are the exact temporary collectors used on this host. They contain absolute paths to owned scratch directories, this worktree, the existing tsdown 0.21.10 cache and original artifacts. Adapt paths when reproducing elsewhere; link an owned scratch `node_modules/tsdown` and `node_modules/react` to matching dependencies. Rebuild the two historical packages with their archived configuration and separate clean output directories, first original, then `--minify`, both with `--reference`; run the scanner with the archived current package as the third cohort and run Node namespace collection. Do not run these collectors against shipping `dist` or mutate shared dependency caches.

Node v24.15.0, Bun 1.4.2, tsdown 0.21.10, original target `node22`. Four exact historical hash matches establish reproduction of the relevant historical runtime outputs, not complete historical build or Node 22/native qualification. Current minification-only results are verified reuse, not freshly collected timings or a new build in this slice.
