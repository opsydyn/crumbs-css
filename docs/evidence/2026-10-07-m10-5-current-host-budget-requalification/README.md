# M10.5 current-host budget requalification

The final clean-install host collection is in [`host-budgets/`](host-budgets/). It is bound to source content SHA-256 `db9a02ecd57c1c0c11f96ea19640fb975f447ae03bf52117ef2dcc3c349f9894`, captured before and after collection, and to 145 built package artifacts whose hashes also remained unchanged. The source-content hash matches the managed `main` worktree at collection time. The measurement ran from a disposable clean clone of base revision `3db9ac787de7456897949001d5b297e7b806b9c3` with the final tracked source and lockfile changes applied; this avoided the managed worktree's pre-existing `node_modules` symlink into another checkout. Its ignored `dist` directory was not used or overwritten. The report records the clean clone's fresh build artifacts.

The measured host was macOS arm64 on an Apple M4 Pro, with Bun 1.4.2, Node 22.0.0 as the exact floor binary (SHA-256 `9507031f6769f2381eae353b3614bafa871c957dc6f2ae86a3af948acdf9b178`) and Node 24.15.0 as the current runtime. Expo Metro ran on verified-free localhost port 8093. The final collection completed after allowing local loopback for Metro; it did not need external network access.

The report contains 21 metrics: 11 pass, nine fail, and one incomplete because the current Expo/Metro versions differ from the approved comparison baseline. It does not change or replace any baseline or threshold. See [`qualification.json`](qualification.json) for the machine-readable summary and the [assessment](../../assessments/2026-10-07-m10-5-current-host-budget-requalification.md) for findings and next work.

## Reproduction

From a clean checkout with the retained source changes and frozen lockfile:

```sh
bun install --frozen-lockfile
bun run check
CRUMBS_AUDIT_NODE_FLOOR=/Users/alancurrie/.local/share/fnm/node-versions/v22.0.0/installation/bin/node \
CRUMBS_METRO_PORT=8093 \
bun scripts/measure-current-host-budgets.ts docs/evidence/2026-10-07-m10-5-current-host-budget-requalification/host-budgets
```

The measurement requires a local Metro listener. In this session, the default sandbox denied socket binding, so the completed collection was run with local loopback permission after verifying port 8093 was free. The denied partial attempt is preserved under [`host-budgets-incomplete-sandbox-loopback/`](host-budgets-incomplete-sandbox-loopback/).

## Superseded attempts

- `host-budgets-before-final-clean-install-fixes/` is a complete earlier run before the final clean-install dependency and consumer-fixture fixes.
- `host-budgets-cross-checkout-symlink/` is not admitted because Metro resolved packages through the managed worktree's cross-checkout `node_modules` symlink.
- `host-budgets-incomplete-no-css-adapter/` and `host-budgets-incomplete-no-root-tsc/` preserve clean-install failures that exposed undeclared adapter and editor-tool dependencies.
- `host-budgets-incomplete-sandbox-loopback/` preserves the final run's partial output before sandboxed Metro could bind locally.

These attempts are retained for diagnosis. Only `host-budgets/` is the final host-budget collection used by the assessment.
