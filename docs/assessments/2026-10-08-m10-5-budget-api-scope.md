# M10.5 budget and API feature-scope review

- Roadmap: **M10.5**
- Status: review complete; no architecture, budget or release-policy change admitted
- Reviewed checkout: `cf51ea2920beb818ebcae020135505710ce4428a`
- Shipping content: `8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76` (694 files)

## Finding

The four fixed theme ceilings were admitted for an earlier, smaller API. They are valid approved limits, but the supported functionality has since expanded. **Meeting them now means fitting the entire present synchronous API into the earlier API's unminified footprint.** Minification alone leaves another **49.4–50.9%** reduction necessary. Neither the previous local consolidation nor the two compact-program experiments established a qualifying route.

This review explains the scope difference; it does not invalidate an approval, establish impossibility, or authorise a higher limit. **M10.5 remains open and publication remains blocked.** The existing release gate and all selectors, limits, APIs and dependencies remain intact. The [diagnostic packet](../evidence/2026-10-08-m10-5-budget-api-scope/README.md) retains historical source/build reproduction, current source bindings, export observations, source history and arithmetic.

## What was admitted

The [M4.6 admission](2026-09-21-m4-6-runtime-byte-budget-admission.md) names source `fefdf2aa84b2d2cd607ffa5cfc41919d6f59ba3e` and admission source `8130d1a3504973efdc451b328faaa0784eb47897`. Their complete `packages/css/src` trees, `build-policy.ts` and `tsdown.config.ts` are identical. The source manifests retained here make that comparison explicit; it is not a claim that every repository file was identical.

A fresh scratch rebuild of the historical runtime groups using tsdown 0.21.10 and their original configuration reproduced **all four admitted artifact sizes and SHA-256 hashes exactly**. A second scratch build applied only minification to those same historical groups. Both use the original `node22` target. Node 24.15.0 and Bun 1.4.2 are the collector hosts, not claims of a fresh Node 22 runtime qualification.

The admitted core exposed ten values: provider, theme/selector hooks, themed-style hooks, generic style/token resolution and token-reference helpers. Compatibility exposed those values plus token scopes, compatibility checking, dependency plans/resolution and single-style recipe resolution with bounded cache controls. Those existing features are included in the baseline; they must not be described as later additions.

The four current graph failures use the admitted 17,271/17,641-byte core and 44,017/44,764-byte compatibility limits. The older 11,307-byte compatibility comparison is now a historical diagnostic, not one of these four binding gates. Token graph budgets are separate and passed in the prior consolidated measurement.

## Scope added after admission

| Roadmap / capability | Baseline | Current emitted/runtime obligation | Source-history anchor |
| --- | --- | --- | --- |
| M5.3 runtime Sprinkles | No lookup-plan resolver | Selection/shorthand plan validation, lookup, bounded cache/disposal and token resolution of lookup-plan styles | `a080b7a` |
| M6.1–M6.2 conditions | No condition module or condition exports | Bounded native snapshots/subscriptions, normalisation, responsive names, conditional mapping helpers and hook | `468c756`, `6bf5c94` |
| M6.3–M6.4 expressions | No expression module or expression exports | Portable expression contract, evaluation errors, folding and dependency-selective runtime evaluation | `1aa2638`, `8140d80` |
| M7.1–M7.2 component recipes | Single-style recipes only | Typed slots, shared selection, state constraints, component plans/resolvers and component token resolution | `ba9b9ed`, `5d6e7ff`, `863cff4` |
| M7.3 public contracts | No component contract reader | Identity registration, public slot/variant validation and extension permissions | `aca9f3d` |
| M7.4 component extensions | No extension reader | Descriptor/chain validation, inherited/default/state/override behaviour and extension token resolution | `e9c1580`, `f77b0b9` |

The packet records full commit IDs, changed source files and ancestry checks for these anchors. The table describes required capability; it does not claim to isolate each feature's marginal byte cost. Later hardening, shared diagnostic growth and output layout also contribute to the total change.

Fresh Node import observations find **10 → 22 core exports and 18 → 39 compatibility exports**, identical between ESM/CJS, with no removed names. Core adds twelve condition/conditional-value exports; compatibility adds those plus expression, component and Sprinkles functions. Namespace presence establishes neither consumer type compatibility nor behavioural parity.

Core also gains behaviour without new component-named exports: `resolveThemeTokens` accepts component and extension descriptors, and generic themed-style resolution traverses component slots. Its validators are reachable through existing synchronous entrypoints. Removing named exports or encouraging focused imports would not remove this obligation while preserving existing behaviour.

## Matched static comparison

| Graph | Admitted / current ceiling | Historical, minified | Current shipping | Current, minification only | Gap to unchanged ceiling |
| --- | ---: | ---: | ---: | ---: | ---: |
| Core ESM | 17,271 | 9,138 | 64,549 | 35,205 | 17,934 |
| Core CJS | 17,641 | 9,282 | 65,408 | 35,426 | 17,785 |
| Compatibility ESM | 44,017 | 21,775 | 164,215 | 86,996 | 42,979 |
| Compatibility CJS | 44,764 | 22,082 | 171,842 | 89,711 | 44,947 |

All values are bytes summed over the complete local import graph. The historical and current source groups retain their respective original packaging layouts; this is not an experiment holding every packaging choice constant. Historical graphs are fresh builds; current shipping artifacts come from the frozen control archive and were rescanned here. Current minification-only artifacts and source-origin allocations are reused from the independently verified [attribution packet](2026-10-08-m10-5-runtime-architecture-attribution.md), with its inputs and artifact hashes bound into this packet. Minification is not admitted to production by this review.

On a minified basis, the net increase is 26,067/26,144 bytes for core and 65,221/67,629 bytes for compatibility. These are whole-graph deltas, not sums of independent feature costs.

| Current minification-only source origins | Core ESM | Compatibility ESM |
| --- | ---: | ---: |
| Theme runtime | 9,821 | 17,239 |
| Component contract and extension readers; component plan where reachable | 14,153 | 31,600 |
| Conditions and conditional values | 6,560 | 6,881 |
| Expressions | Not reachable | 14,162 |
| Recipe/Sprinkles resolvers and plans | Not reachable as separate source files | 9,652 |
| Other sources and unmapped output | 4,671 | 7,462 |
| **Total** | **35,205** | **86,996** |

These are source-map span allocations, including associated generated glue. They are not exact function-body sizes, removable savings or a historical marginal attribution. Core's theme-runtime row includes single-style recipe token handling and component token traversal. Its separate contract/extension readers account for roughly 40% of the graph. Conditions account for roughly 19%. Compatibility adds expressions and component planning as well as existing scopes/dependency controls.

All twelve rescanned graphs retain React as the only external and zero nonliteral loads. The source-origin tables contain no Effect implementation; Effect-backed Schema/Optics and development explanations remain behind separate opt-in entries. Adding Effect to the ordinary runtime is not a demonstrated remedy for this gap.

## Feasible constraints and decisions

| Option | What it preserves / changes | Assessment |
| --- | --- | --- |
| Keep all current limits and the full synchronous API | Preserves the entire approved contract. Requires a substantially smaller representation/algorithm plus successful startup and compiler remediation. | Valid policy; no qualifying architecture is evidenced. The rejected generic encodings do not prove every bespoke representation impossible. A new production batch needs a materially different, measured route. |
| Preserve the API and propose versioned budgets for the expanded feature scope | Requires a separate explicit budget-policy approval. Keeps historical evidence visible and measures complete core/compatibility closures. | Recommended next decision to prepare. Do not silently replace baselines, rename selectors to escape failures, or use current unminified sizes as automatic new ceilings. Define concrete candidate, scope, headroom, samples and migration/enforcement rules first. |
| Add or promote narrow consumer paths | Can improve an individual consumer's footprint while keeping existing imports available. Focused conditions/expressions/recipe/Sprinkles and token-only entries already exist. | Useful supplementary architecture and DX; does not pass the existing full core/compatibility selectors. Token-only input restrictions are not a drop-in replacement for generic resolution. |
| Remove legacy/raw descriptors, require handler registration, move synchronous work behind async loads or externalise implementation | Changes supported inputs, initialisation/lifetime or synchronous behaviour; externalisation also shifts cost outside the counted closure. | Excluded from this API-preserving task. No breaking change or accounting bypass is recommended. |

Any future API-preserving design must retain accepted descriptor versions, recursive traversal, ordered proxy observations/error precedence, freezing and alias behaviour, registry timing, provider identity, lazy expressions, bounded cache lifetimes and public consumer declarations. Compile-time prevalidation may optimise compiler-owned inputs, but raw public inputs still require their current admission path. A pure data representation is valuable only if its complete graph and execution costs improve; generic interpreter abstraction has already increased measured size and exposed public method-shape differences.

## Remaining performance and qualification boundary

Four byte failures are only part of the nine retained host failures. Four runtime-initialisation comparisons and warm transform also remain unresolved. This static review makes no causal attribution of their timing to a particular feature and supplies no new CPU, memory, Metro, Hermes, Simulator/emulator, screen-reader or physical-device acceptance. It does not rerun the complete 21-row gate or `release:check`; earlier host receipts remain historical. Physical-device and spoken-reader work remains deferred.

## Next numbered roadmap item

**M10.5 — prepare a concrete budget-scope decision proposal for the expanded API, before another production remediation batch.** Recommend preserving the complete API and historical evidence. The proposal must specify whether the original limits remain binding or a separately approved versioned full-feature budget is introduced, with exact graphs/selectors, numeric limits, regression/headroom rules, qualification environment and release enforcement. Keep the four startup and warm-transform gates independently binding; a byte-policy decision must not reset them or declare M10.5 complete. No policy change takes effect without separate explicit approval and subsequent implementation/qualification.
