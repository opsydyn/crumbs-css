# M10.5 compact-runtime feasibility spike

- Roadmap: M10.5
- Status: tested representative interpreter rejected; no production architecture selected
- Source: `f9a6c5a9af860134af202a79362cb6a95fd9a941`
- Scope: throwaway prototype, unchanged API/dependencies/build groups/graph ceilings

## Finding

An ordered instruction interpreter for shared admission mechanics and arithmetic evaluation does **not** close the graph gaps. After eliminating unused tables, core saves **390–400 bytes** against minification alone, compatibility ESM saves **352 bytes**, and compatibility CJS **grows by 389 bytes**. All four actual graphs fail their existing limits. Do not adopt this prototype or begin production implementation from it.

This tests a representative mechanics-level representation, not a complete rewrite of descriptor normalization and recursive resolution. It rejects the measured candidate; it does not prove that every possible compact runtime is infeasible. No credible qualifying production route has yet been demonstrated. **M10.5 remains open and publication remains blocked.**

## Probe and provenance

The [retained diagnostic packet](../evidence/2026-10-08-m10-5-compact-runtime-feasibility/README.md) contains complete scratch source/configuration and emitted runtime groups for both cohorts. Both start from the prior frozen production control, rather than the previously rejected consolidation. The unchanged control is minified independently using the existing core/theme build groups and `node22` target. Its **20 runtime artifacts match the prior minification-only references byte-for-byte**.

The prototype changes five source files and adds one private module. Typed instruction tuples control record shape/prototype checks, descriptor reads, array enumeration/snapshots and dense-value reads. Immutable boundary programs preserve each existing validation order and exact message policy. Required/optional key checks share immutable message policies. Four arithmetic cases use operand-read/evaluation programs; fallback and match retain their existing lazy control flow. Eight admission helpers delegate to the engine.

The probe preserves the contract boundary's symbol enumeration plus validated key snapshot, the extension boundary's second descriptor enumeration, the contract's repeated prototype lookup where originally present, and descriptor assertions that ignore symbol-valued keys via `Object.values`. Program creation is private and pure; unused program tables are eliminated by explicit purity annotations. Arithmetic dispatch captures `kind` once at the original switch boundary, avoiding an additional observable property read.

Only owned temporary source/output directories were changed. Shipping source identity remains `8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76` across 694 files. Public source, installed dependencies, manifests, limits and release enforcement are unchanged.

## Actual emitted graphs

| Graph | Minified control | Prototype | Saving (negative means growth) | Fixed ceiling | Remaining gap |
| --- | ---: | ---: | ---: | ---: | ---: |
| Core ESM | 35,205 | 34,815 | 390 | 17,271 | 17,544 |
| Core CJS | 35,426 | 35,026 | 400 | 17,641 | 17,385 |
| Compatibility ESM | 86,996 | 86,644 | 352 | 44,017 | 42,627 |
| Compatibility CJS | 89,711 | 90,100 | -389 | 44,764 | 45,336 |

Values are bytes in the complete emitted local graph, measured by the canonical scanner, including reachable shared chunks. All eight control/prototype graphs have only React external and zero nonliteral loads. Existing group ownership, focused entries and dependency policy remain intact. No implementation was externalised or dynamically loaded.

Dead-table elimination removes another 295 bytes from each core graph compared with the first fully frozen program build. It does not change the compatibility result. The measured benefit is at most about 1.1% of the minified control; the unresolved gaps remain about half the prototype's output. Interpreter dispatch and program tables consume much of the duplicated helper saving. This is static byte evidence, not a CPU or startup improvement.

## Focused behaviour checks and their limits

The retained harness compares **1,454 cases per host**, under both Bun 1.4.2 and Node 24.15.0. Each host includes 1,200 successful seeded expression evaluations across compatibility/focused entries and ESM/CJS, 16 successful lazy-branch/property-order cases, domain-error cases, and admission/key-policy cases. Descriptor/prototype/property-read traces, values and exact error details match control. Matching exceptions alone are insufficient: the harness requires successful execution of every generated and lazy/order case.

Admission cases include ordinary/null-prototype records, symbols, accessors, hidden properties, sparse/extended/subclass arrays, revoked proxies and changing enumeration. A deliberate single-enumeration mutation fails the independent extension-boundary trace comparison. The newly discovered enumeration distinction is characterised by the probe, not promoted into a shipping test or silently changed. Program and instruction immutability is checked. TypeScript 6.0.3 strict checking passes for the private interpreter module only.

These checks do **not** establish complete public parity, public declaration compatibility, alias/freezing behaviour throughout descriptors, registry-commit timing, provider identity, Node 22 floor acceptance, the complete 21-row host report, startup/warm transform, Metro, Hermes or native acceptance. Those gates were not run after static rejection. Physical-device and spoken-reader work remains deferred. The Python verifier checks archive integrity and arithmetic; it does not independently execute or authenticate historical behavioural receipts.

## Next numbered item

**Recommended next: M10.5 — one complete high-level descriptor/recursive-resolution feasibility prototype.** The previous attribution located most costs in semantic normalization, extension-chain validation and component planning; this interpreter leaves those algorithms in place. A meaningful further experiment must replace those repeated high-level structures with complete ordered programs, rather than extend this helper interpreter a few functions at a time.

Keep that experiment non-shipping. Check all four unchanged actual graph ceilings first, retain the entire candidate and control, and require independent full behavioural parity before proposing an architecture specification. Do not infer savings by subtracting source spans or loosen the limits. If another complete representation cannot demonstrate sufficient static headroom, report that M10.5 has no evidenced API-preserving route under the current constraints instead of selecting a failing architecture. Any eventual production remediation remains one complete batch; no partial admission or publication follows from a spike.
