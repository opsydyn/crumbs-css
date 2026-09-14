# Crumbs design-system assessment — 2026-09-06

## Scope and evidence status

Assessment of the current vanilla-extract-shaped React Native/Expo styling library, with particular attention to performance, native correctness, type safety, API coverage, functional architecture, and large-team design-system needs.

The reviewed checkout was `64f9934`. Existing uncommitted changes were present in `.release-please-manifest.json`, `apps/storybook/package.json`, `bun.lock`, `packages/css/package.json`, and `packages/css/test/expo-sdk-56-contract.test.ts`. Those changes were not made by the assessment. The package version in the working tree was `0.1.2-alpha.2`; this is not a statement about what was published.

Source files, tests, build outputs, and documentation were inspected. Additional disposable probes ran outside the repository's tracked sources. The assessment did not implement fixes, install Effect, publish the package, or run native device acceptance.

The subsequent [ADR](../decisions/adopt-native-design-system-compiler.md) and [roadmap](../roadmap.md) distinguish proposed decisions from current behavior.

Current promotion status: [M0 regression and composition closure audit](2026-09-14-m0-closure-audit.md). The findings and measurements below remain the original historical snapshot.

## Existing strengths

- Familiar `.css.ts` authoring, Metro integration, and explicit native state selection.
- View/text/image helpers, recipes with defaults and compounds, typed variant selections, and exact theme-shape checks.
- Stable diagnostic codes, strict conversion mode, compatibility documentation, and an Expo Storybook consumer.
- `fast-check` property suites, packed-consumer tests, and a benchmark harness with budgets.

These provide a useful base. They do not yet establish semantic native preservation or a complete enterprise design-system contract.

## Checks performed

| Check | Observed result | Limit |
| --- | --- | --- |
| `bun run typecheck` | Passed | Package types currently permit some inputs that conversion cannot preserve. |
| `bun run test` | 117 pass, 0 fail; 5,030 assertions across 16 files | Some integration tests return early when old native fixtures are absent. |
| `bun run --cwd packages/css bench:native-styles` | Passed current budgets | Bun on this Mac; not Hermes, React commits, or native frame-time evidence. |
| Disposable source/compiler probes | Reproduced E1–E3, E5–E8 below | Counterexamples were not yet committed as regressions. |
| Node module-load tracing of built CommonJS theme entry | Reproduced E4 | Establishes eager imports, not a demonstrated device crash. |
| `git diff --check` | Passed at the assessment | Does not validate runtime behavior. |

## Confirmed correctness and packaging findings

### E1 — Composition types and precedence disagree with the advertised API

[Crumbs `style`](../../packages/css/src/native-style.ts) accepts `StyleRule`, while the documented array composition form needs a composition-capable signature. A temporary typecheck rejected `style([base, { color: "blue" }])`.

The compiler still accepts transpiled authoring code without running TypeScript checks. For this fixture:

```ts
import { style } from "@opsydyn/crumbs-css/style"

const base = style({ color: "red" })
export const result = style([base, { color: "blue" }])
```

The transformed result contained `{"color":"red"}`. Under the intended ordered native composition contract, the later declaration should win. [Transformer composition](../../packages/css/src/transformer.ts) merges generated class-list entries in a sequence that restores the base value.

The existing composed fixture adds `fontWeight` to a base with `color` and `fontSize`; it does not exercise a conflicting property. Add explicit conflict cases and an independent reference model.

### E2 — Type-accepted native structured values fail conversion

These inputs passed the temporary typecheck:

```ts
viewStyle({ opacity: 0.5, transform: [{ scale: 2 }, { translateX: 10 }] })
viewStyle({ shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.5 })
```

Strict compilation rejected both with `CRUMBS_CSS_DROPPED_DECLARATION`. The diagnostic text contained malformed declarations such as `transform {\n    scale: 2` and `shadowOffset {\n    width: 1`.

The [typed helper](../../packages/css/src/native-style.ts) forwards native objects to vanilla-extract's CSS authoring through a cast. Native arrays and objects are not preserved as native values through that serialization path. Test the native input → emitted value boundary directly, including supported modern React Native property families.

### E3 — Runtime heuristics corrupt styles containing nested values

Given a valid theme, this direct runtime input:

```ts
resolveThemeStyles(
  { item: { opacity: 0.5, transform: [{ scale: 2 }] } },
  theme,
)
```

produced the JSON-equivalent value:

```json
{"item":{"transform":{"scale":2}}}
```

The scalar sibling disappeared and the transform array changed shape. `isNestedStyleMap` in [theme-runtime.ts](../../packages/css/src/theme-runtime.ts) treats an object containing any non-token object as a map of style exports. Explicit export/IR tags should replace this inference. Top-level-only token replacement is also insufficient for any future supported nested token references.

### E4 — A runtime entrypoint eagerly imports compiler dependencies

The built `dist/theme.cjs` required `style.cjs` and `transformer.cjs`. The built `style.cjs` also required the transformer. A Node module-load trace observed `node:fs`, `node:vm`, `node:crypto`, vanilla-extract integration, and `css-to-react-native` when requiring only the theme entrypoint.

The ESM theme output imported `NativeRecipeType` from the authoring module. The relevant source edge is in [theme-runtime.ts](../../packages/css/src/theme-runtime.ts), and the output boundaries are controlled by [tsdown.config.ts](../../packages/css/tsdown.config.ts).

This is a confirmed import-isolation defect. Bundle impact and behavior under the actual Metro-selected entrypoint need separate consumer verification. Move shared runtime tags away from authoring and audit emitted graphs in both formats; public export-name tests alone cannot prove isolation.

### E5 — Token declarations bypass strict validation and lose order

Direct conversion probes against [css-to-rn.ts](../../packages/css/src/css-to-rn.ts):

```ts
cssDeclarationsToRN(
  [["transition", "var(--crumbs-color-accent)"]],
  { strictDiagnostics: true },
)
// Returned a transition token reference instead of throwing.

cssDeclarationsToRN([
  ["color", "var(--crumbs-color-accent)"],
  ["color", "blue"],
])
// Returned the token reference instead of the later literal.
```

The token branch exits before native property filtering, and themed declarations are accumulated separately and merged after converted literals. Use one validation/ordering model for both value kinds.

### E6 — Separate contracts can collide and overwrite metadata

```ts
const first = createThemeContract({ "a-b": null })
const before = getThemeTokenPath(first["a-b"])
const second = createThemeContract({ a: { b: null } })
const after = getThemeTokenPath(first["a-b"])
```

Observed: the two token strings were equal; `before` was `["a-b"]`; `after` was `["a", "b"]`.

[Token naming and the global registry](../../packages/css/src/native-style.ts) use sanitized paths without distinct contract identity. Collision checking is local to one creation call. Existing tests cover within-contract collisions, which do not establish isolation across contracts or package copies.

### E7 — Ordinary top-level string exports become undefined

A `.css.ts` fixture exporting `result = "hello"` compiled to `export const result = undefined`. [Top-level export serialization](../../packages/css/src/transformer.ts) treats strings absent from the style map as missing styles, while nested strings are preserved.

The export contract needs explicit distinctions between style references and ordinary values. Preserve supported value exports or reject them with an actionable diagnostic; silent corruption is not an acceptable contract.

### E8 — Theme shape safety does not establish token-domain safety

The following cases passed a separate temporary typecheck:

```ts
const vars = createThemeContract({
  color: { accent: null },
  space: { md: null },
})

createTheme(vars, { color: { accent: 123 }, space: { md: "red" } })
viewStyle({ padding: vars.color.accent, opacity: vars.color.accent })
textStyle({ fontWeight: vars.space.md })
```

The current [theme types](../../packages/css/src/native-style.ts) use one token brand and `string | number` values. The examples illustrate lack of declared domains; token names alone cannot serve as a validator. Add explicit domains and property-aware types in M3 rather than guessing domain semantics from names.

The current generic `useTheme<TContract>()` also casts the context to a caller-selected type. It does not bind that type to the provider's contract. A scoped contract API needs both static association and runtime identity checks.

## Performance observations

### E9 — Resolution repeats work and changes references

[Theme hooks](../../packages/css/src/theme-runtime.ts) memoize per consumer. `resolveThemeStyles` visits every export, and recipe theme resolution visits every variant and compound. `resolveThemeTokens` creates an object even when no token exists; a probe confirmed a static style's result was not the original reference.

`createRecipeResolver` currently delegates directly to `resolveRecipeStyle`. Each selection merges defaults, enumerates variants, scans compounds, and creates arrays. This is a clear optimization opportunity, not evidence that current device performance is unacceptable.

Shared immutable-snapshot caches, static identity preservation, generated dependency plans, precomputed recipe matchers, and bounded selection caches are proposed. Selective React subscriptions require additional design and tests beyond caching.

### E10 — Current benchmark results and interpretation

| Operation | Mean | Reported p95 | Throughput |
| --- | ---: | ---: | ---: |
| Raw style-array selection | 0.000021 ms | 0.000062 ms | 46,675,956 ops/s |
| `resolveRecipeStyle` selection | 0.000261 ms | 0.000278 ms | 3,835,173 ops/s |
| `createRecipeResolver` selection | 0.000259 ms | 0.000276 ms | 3,859,876 ops/s |
| Themed recipe resolver selection | 0.000254 ms | 0.000314 ms | 3,937,047 ops/s |
| Resolve a module with 240 exports | 0.048986 ms | 0.083588 ms | 20,414 ops/s |
| Transform the recipe fixture | 4.177514 ms | 5.384416 ms | 239 ops/s |

Source: the session run of [native-styles.bench.ts](../../packages/css/bench/native-styles.bench.ts). These numbers are a historical local snapshot, not a portable performance promise.

- The raw selector does not execute the compound matching performed by the recipe selector. Their ratio is not an equivalent-work comparison.
- Runtime quantiles in [perf-harness.ts](../../packages/css/bench/perf-harness.ts) are calculated from batch averages. They do not expose individual operation/GC tails.
- Transform measurements follow a warmup and exercise a small repeated fixture; they do not establish cold startup, large dependency-graph cost, or Metro incremental behavior.
- The optional native application benchmark uses an absent `apps/native` path and did not run.
- No Hermes frames, React commits, bundle initialization, retained memory, or editor latency were measured in this assessment.

Follow-up — 2026-09-14 M1.4: the [host workload repair](2026-09-14-benchmark-workloads.md) now labels batch-mean quantiles, equalizes static raw/recipe defaults/compounds/filter work and separates fresh-process first transforms from warmed transforms. The historical table above is preserved; its old raw/recipe ratio is not comparable to the new workload. React memo lifecycle and release-device performance remain unmeasured.

Current React Native describes `StyleSheet.create` as an identity function. Emitting it does not itself establish a speed advantage; useful comparisons measure removed work, identity stability, updates, bytes, and allocation. [React Native StyleSheet](https://reactnative.dev/docs/stylesheet.html).

## Enterprise assurance gaps

### E11 — Test/CI/release contracts need stronger evidence

- [Transformer tests](../../packages/css/test/transformer.test.ts) return early when old `apps/native` fixtures are missing, allowing reported passes without exercising those consumer scenarios.
- [PR CI](../../.github/workflows/ci.yml) excludes app/docs-only changes from its package workflow, narrows installed workspaces, and runs package build/typecheck/tests but not the benchmark. App typechecking, actual native builds, editor budgets, and native performance are not established by that workflow.
- Packed-consumer tests provide useful packaging/type evidence but should also check actual Metro runtime import graphs and independent token/component package distribution.
- Shared-dependency import emission is tested; correct rebuild of baked importer values after actual edits still needs direct evidence.
- The root README describes npm publication as a separate workflow gate, while [release-please.yml](../../.github/workflows/release-please.yml) contains an automatic publish path after release creation when a token exists. This is a documentation/automation discrepancy. The assessment did not change either policy or workflow; reconcile it under an explicit release-policy decision.

## API coverage and differentiation opportunities

Useful upstream concepts include native Sprinkles, mapped variants, conditional normalization/mapping, recipe composition, explicit standalone/local tokens, fallbacks, scoped assignments, and a constrained serialization extension point. See the [roadmap API ledger](../roadmap.md#api-coverage-ledger) for ownership and non-goals.

Atomic native output must be compared against fused and hybrid alternatives. The browser's class-matching behavior does not apply directly to React Native style arrays.

Functional differentiation centers on typed token algebra, immutable inspectable programs, exhaustive state/slot recipes, dependency-aware resolution, and explainable styling. Enterprise differentiation adds semantic ownership, public/private contracts, manifests, change-impact reports, codemods, policies with explicit escape hatches, package compatibility, and an executable reference system.

Responsive support alone is not a distinctive claim: [Restyle](https://github.com/Shopify/restyle/blob/master/documentation/docs/fundamentals/responsive-values.md) documents responsive values, [NativeWind](https://www.nativewind.dev/docs) documents media/container capabilities, and [Unistyles](https://unistyl.es/v3/start/how-unistyles-works/) documents dependency-driven native updates. Those references informed positioning; no comparative device benchmark was performed here.

## Evidence promotion

Temporary probes are summarized above so their conclusions do not depend on disposable local files. M0 must turn the confirmed cases into committed failing regressions before repair. Future measurements must record exact dependency versions and tested artifacts, and future guarantees must link to completed roadmap evidence rather than this historical snapshot.
