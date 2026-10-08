# M10.5 complete descriptor/recursive-resolution program spike

- Roadmap: M10.5
- Status: complete selected-body prototype rejected; no production architecture selected
- Source: `0cefdd32c38579856c0363cadac41a64f0099de8`
- Constraints: unchanged public API, synchronous capabilities, dependencies, build groups and all four graph ceilings

## Finding

The complete generic source-to-program representation is substantially larger than minified JavaScript. Core grows from **35.2–35.4 KB to 87.8–88.1 KB**; compatibility grows from **87.0–89.7 KB to 186.3–189.3 KB**. All four actual graph gates fail. A concrete public-method parity counterexample also fails in both emitted formats. This candidate cannot be selected for production.

This finishes the approved complete-body experiment, rather than extending the previous helper interpreter. It rules out this measured generic encoding, not every possible bespoke schema representation. **There is still no evidenced API-preserving route under the current fixed constraints. M10.5 remains open and publication remains blocked.** Further optimisation should follow a deliberate feasibility/constraint review, not another automatic sequence of small interpreter experiments.

## What was implemented in scratch

The [diagnostic packet](../evidence/2026-10-08-m10-5-descriptor-program-feasibility/README.md) retains a complete control and candidate. Both start from the frozen production source used by the earlier rejection. All **20 independently rebuilt minified control artifacts match the prior attribution references byte-for-byte**. The prototype also has 20 clean runtime artifacts, with every original core/theme group entry present.

The compiler replaces **98 complete function bodies**: 19 in component contracts, 26 in extension contracts, 13 in component resolution planning, and 40 in theme runtime. Theme coverage includes all functions from `resolveThemeStyles` onward: dependency resolution, style/recipe/component/extension traversal, cloning/freezing, scope materialisation, token validation, caches and registry helpers. Earlier providers/hooks and module-level state remain in their original form. The three descriptor/planning modules have every top-level function body replaced. This is complete within that explicitly selected scope, not a rewrite of every runtime feature in the package.

Each body becomes deeply frozen instruction data with a function-local string pool and a wrapper retaining its original function signature. The shared evaluator handles expressions, property references/calls, short-circuiting, optional chains, arrays/objects/spreads, closures, destructuring, loops, conditionals, returns/throws, switch and try/finally. Lexical inputs are resolved through frames and late-bound callbacks. No original selected body remains as a callback fallback; unsupported syntax aborts collection. Rerunning the lowering reproduces all five changed/added source files byte-for-byte. The AST coverage check confirms every selected body is replaced, every original function signature is retained, and unselected function bodies remain unchanged.

This is deliberately throwaway code, not an accepted typed DSL. Its evaluator uses dynamic `any` types; strict checking of that one module does not validate opcode contracts, public declarations or consumer compatibility. No package dependency, output target, public registration option, dynamic load, externalised implementation or shipping file was introduced.

## Actual byte result

| Graph | Minified control | Prototype | Growth | Fixed ceiling | Remaining gap |
| --- | ---: | ---: | ---: | ---: | ---: |
| Core ESM | 35,205 | 87,848 | 52,643 | 17,271 | 70,577 |
| Core CJS | 35,426 | 88,062 | 52,636 | 17,641 | 70,421 |
| Compatibility ESM | 86,996 | 186,341 | 99,345 | 44,017 | 142,324 |
| Compatibility CJS | 89,711 | 189,279 | 99,568 | 44,764 | 144,515 |

All values are bytes in the complete reachable local graph, including shared chunks. The canonical scanner measured all eight graphs; React is the only external and nonliteral load count is zero. The original configuration, manifest and build-policy files are byte-identical in both cohorts. Node 24.15.0 runs tsdown 0.21.10 with the unchanged `node22` target; TypeScript is 6.0.3.

The encoding preserves general source structure as explicit instruction arrays, environments and binding callbacks. Those structures add enough representation and dispatch cost to outweigh any sharing in this implementation. That explanation follows from the representation and observed growth; it is not a measurement of CPU cost or a lower bound for a future domain-specific schema encoding.

## Concrete parity failure and qualification boundary

For `createThemeDependencyResolver({}, {$$type: "crumbs.css.theme-dependency-plan", version: 1, entries: []}).resolve`, the ordinary control method has name `resolve`, arity 1 and cannot be used as a constructor. The interpreted method has an empty name, arity 0 and is constructible. Both ESM and CJS reproduce the difference. Constructibility is checked with `Reflect.construct` using the method as `newTarget`, without invoking its body. Retaining the top-level TypeScript signatures and export names therefore does **not** establish API parity.

Eight basic import/token/cache/identity/array-flattening smoke receipts pass across both cohorts and both formats; export-name sets match. They demonstrate that the evaluator runs the basic resolution path, not that all accepted descriptors or behaviours are equivalent. The known method counterexample independently prevents API-preserving admission. It was retained rather than repaired after byte rejection.

Full behavioural/property-based qualification, declaration/consumer checks, Node 22 floor, the 21-row host report, startup, warm transform, Metro, Hermes and native acceptance were not run. Physical-device and spoken-reader work remains deferred. The Python verifier rederives archive bindings, encoded-program bindings and byte arithmetic; it does not execute or authenticate historical behaviour or independently reparse TypeScript signatures/JavaScript graph reachability.

Shipping source identity remains `8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76` over 694 files. All prototype mutation stayed in owned temporary directories; the repository change is documentation/evidence only. Budgets and release enforcement remain unchanged.

## Next numbered item

**Recommended next: M10.5 — review the fixed budget's feature scope and feasible architecture constraints before further remediation.** Compare the admitted baseline's capabilities with today's full synchronous API and document the trade-off explicitly. This review must not change thresholds, selectors, exports, dependencies or release enforcement.

Keep the current API and ceilings as the active contract while that review proceeds. The evidence currently supports continued release blockage, not adoption of either interpreter. A future bespoke schema candidate would need a materially different encoding and all four actual byte gates plus independent full parity before architectural approval. Any proposed change to budget scope or capabilities must be presented as a separate decision, not inferred from these failed probes. Any eventual production remediation remains one complete batch.
