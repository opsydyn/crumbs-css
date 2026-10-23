# M10.5 identity/runtime probe preparation

Status: prepared-not-run; stopped before helper implementation or execution.

The parent task reported that the unchanged runtime-source provenance guard rejected the candidate `./tokens` ESM and CJS closures because generated shared chunk names use `crumbs-authoring~...`. The semantic package graph audit reportedly passed all 59 rows. These are separate results. The approved stop condition was reached; this directory contains no executable helper and no candidate identity, runtime-load, provider, declaration, timing, SDK, or native result.

Intended package roots, not executed:

- Candidate: `/private/tmp/crumbs-m105-entry-aware-20261017/candidate/packages/css`
- Control: `/private/tmp/crumbs-m105-entry-aware-20261017/control/packages/css`

Preparation inspected current source contracts in `/Users/alancurrie/.codex/worktrees/crumbs-main-merge/crumbs-css`:

- `packages/css/test/runtime-isolation.test.ts`: ESM loader and CJS `Module._load` denial of Node/compiler dependencies for ordinary runtime entries.
- `packages/css/test/theme-runtime-boundaries.test.ts`: real React/ReactDOM server provider interoperability across `theme`, `theme/core`, and `theme/token`; canonical compatibility-to-focused resolver bindings.
- `packages/css/test/theme-runtime-resolver-identity.test.ts`: canonical recipe/Sprinkles resolver re-exports.
- `packages/css/test/token-contract-identity.property.test.ts`: deterministic token IDs, shared contract metadata protocol, identity collision rejection, and compatibility checks.
- `packages/css/test/token-contract-identity-types.ts` and `packages/css/test/primitive-reference-types.ts`: nominal token and primitive consumer declaration checks.
- `packages/css/test/pack-consumer-contract.test.ts`: outside-repository package consumer fixtures and Node16/Bundler TypeScript checks.
- `scripts/packed-runtime-graph.ts`: authoritative export classifications and peer allowances.

If a separately approved future experiment reaches the identity gate, the planned checks are:

1. Fresh processes under exact Node v22.0.0 and the current Node, ESM and CJS, with root-first/style-first orders. Compare root/style strict binding equality only across the actual common runtime export names; do not invent a root `componentRecipe` export.
2. Fresh denial probes for all 15 ordinary runtime export paths in both formats (30 rows per Node). Only peers admitted by `scripts/packed-runtime-graph.ts` are permitted. `theme/motion/native` may use a recorded load-only React Native fixture; that is not native execution. Keep `tokens/optic` under the advanced-runtime classification and its existing Effect allowance.
3. Both actual ESM-first/CJS-first orders for token registry and real React provider interoperability. Preserve shared `Symbol.for`/`globalThis` protocols; do not demand strict equality across intentionally independent entries or formats.
4. Reuse existing packed primitive and token identity type fixtures, plus cross-entry nominal-brand assignments, against the artifact's unchanged canonical declarations. Record this separately from runtime identity.

No repository files, dependencies, build outputs, guards, or chunk names were changed by this subtask. No dependency install, build, benchmark, or network action was run.
