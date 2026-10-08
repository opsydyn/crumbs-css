# M10.5 remaining runtime graph costs

- Roadmap: M10.5
- Status: attribution assessment complete; no production candidate selected
- Source: `48d3efb69795421fe584226032e30d4e5947ca18`
- Constraints: preserve the public API, synchronous capabilities, all approved limits and release enforcement

## Finding

Another local deduplication or diagnostic-only change has no evidenced route to the four fixed theme graph limits. The rejected consolidated candidate saved only **131–139 B in core and 425–428 B in compatibility beyond minification alone**. Its remaining gaps are **17,646–17,803 B** and **42,551–44,522 B**. They span admission, resolution, conditions, expressions and planning.

A compact shared runtime representation is worth a non-shipping feasibility experiment, but these measurements do **not** establish that it can preserve behaviour or meet the limits. Do not start another production implementation batch from this attribution alone. **M10.5 remains open; publication remains blocked.**

## Reproduction and measurement boundary

The [retained diagnostic packet](../evidence/2026-10-08-m10-5-runtime-architecture-attribution/README.md) uses the previous rejection's complete control and candidate source/artifact archives. It compares three scratch cohorts: unchanged production control, that control with only the existing core/theme build groups minified, and the already-rejected consolidated candidate. No installed dependency, shipping source or package output was changed.

Hidden-source-map builds reproduced **20 runtime artifacts per cohort, 60 total, byte-for-byte** against their reference output. Control and rejected-candidate references also match their frozen package archives. Unlike the earlier unminified attribution summary, this packet retains the generated code and maps. The existing canonical graph scanner cross-checked all **12 graphs** and their artifact hashes. A separate Python VLQ decoder independently derives the source/declaration byte allocations and literal-span totals for 42 unique reachable artifacts, and checks every graph sum and counterfactual.

These are static emitted-byte observations, not CPU, memory, startup, Metro or Hermes measurements. Source maps assign generated spans to source origins; declaration allocations can include binding glue anchored to a declaration. They are not exact callable-body sizes or removable-byte estimates. Literal spans include quoted strings and template text/delimiters, excluding interpolation expressions; they are not a diagnostic-message-only measure. The probe self-check distinguishes template text from the embedded expression.

Tooling: Node 24.15.0, tsdown 0.21.10, TypeScript 6.0.3, existing `node22` build target and original build groups/dependency policy. The source identity remained `8fe7d6c28c26c9d4214549790d504c62f87c24f6886d7da40e031dd7e9fb4a76`, matching the prior commit's receipt. All probing stayed in owned temporary directories. The rejected candidate's changing-proxy diagnostic regression remains rejected; byte attribution does not rehabilitate its semantics.

## Controlled comparison

| Graph | Production control | Minification only | Rejected consolidation | Consolidation saving | Fixed ceiling | Remaining gap |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Core ESM | 64,549 | 35,205 | 35,074 | 131 | 17,271 | 17,803 |
| Core CJS | 65,408 | 35,426 | 35,287 | 139 | 17,641 | 17,646 |
| Compatibility ESM | 164,215 | 86,996 | 86,568 | 428 | 44,017 | 42,551 |
| Compatibility CJS | 171,842 | 89,711 | 89,286 | 425 | 44,764 | 44,522 |

All values are bytes. The consolidated mechanics account for less than **0.5%** reduction from the minification-only graph in each case. The next representation must deliver another **49.2–50.8%** reduction from the rejected candidate. These deltas do not predict the four failed startup metrics or the separate warm-transform metric.

## Where the bytes originate

| Source family in rejected candidate | Core ESM | Compatibility ESM |
| --- | ---: | ---: |
| Theme runtime | 9,818 | 17,239 |
| Component contracts | 6,597 | 6,571 |
| Component extension admission/chain | 6,321 | 13,712 |
| Shared admission helper | 1,107 | 1,107 |
| Component resolution plan | Not reachable | 10,072 |
| Expressions | Not reachable | 13,871 |
| Conditions and conditional values | 6,560 | 6,881 |
| Other sources and unmapped output | 4,671 | 17,115 |
| **Total** | **35,074** | **86,568** |

Core's generic synchronous resolvers reach component contract and extension validation even when the importing consumer wants an ordinary token style. Existing accepted raw descriptor versions and recursive slot resolution require that capability. Compatibility additionally exposes extension chains, component plans, expressions, recipe/sprinkles controls and token scopes. New narrow entries or moving source between files cannot remove those capabilities from the existing full-graph selectors.

The largest single declaration-origin allocations are component-plan creation (3,209 B in compatibility), extension-chain validation (2,518 B), extension normalization (1,929 B in core), component theme resolution (1,825 B), and the diagnostic code object (1,788 B). No one of these is close to the required gap. The full ESM/CJS tables and declaration locations are retained in the raw report.

## Counterfactuals that rule out small isolated routes

These calculations zero selected attributed spans and hold **every other emitted byte fixed**. They are intentionally unrealistic, are not runnable builds, and are not global lower bounds after rebundling. The two columns are separate experiments; their savings overlap and must not be added.

| Graph | Remainder if every string/template span cost zero | Remainder if selected component admission/planning files cost zero | Ceiling |
| --- | ---: | ---: | ---: |
| Core ESM | 24,769 | 21,049 | 17,271 |
| Core CJS | 24,974 | 21,284 | 17,641 |
| Compatibility ESM | 61,934 | 55,106 | 44,017 |
| Compatibility CJS | 64,534 | 57,825 | 44,764 |

The selected files are exactly `components/contracts.ts`, `components/extension-contract.ts`, `runtime/data-admission.ts` and `runtime/component-recipe-resolution-plan.ts`. Component resolution code inside `theme-runtime.ts` remains in the remainder; the column does not claim to remove an entire feature. Error text, tags and protocol strings are required behaviour and cannot actually be discarded. Even free literal text or free code in those selected files would leave all four graphs above their limits under the stated fixed-remainder model.

## Options and next numbered item

| Route | Evidence and constraint | Disposition |
| --- | --- | --- |
| More local helper extraction, message factoring or minification | The measured consolidation saves under 0.5%; the large fixed-remainder gaps span multiple families. Small improvements may be useful independently but do not form a complete M10.5 admission route. | Do not begin another production batch on this basis. |
| Narrow entries, prevalidated-only DTOs or feature registration | Additive entries do not pass existing full-graph selectors. Dropping raw/legacy descriptors, or requiring users to register a synchronous handler before generic resolution, changes current behaviour. | Excluded from this API-preserving remediation. |
| Shared compact instruction representation | Ordered admission, recursive traversal and expression operations might share a small interpreter and immutable policy/message tables. This could reduce repeated control flow across several families; table/dispatch costs and slower first use could instead erase the benefit. | Unproven; test in scratch before architectural or implementation approval. |

**Next: M10.5 — non-shipping compact-runtime feasibility spike.** Ask whether a private typed instruction engine with ordered immutable programs can satisfy all four unchanged graph ceilings while preserving the full synchronous API. The probe must retain each boundary's exact proxy enumeration/error precedence, lazy expression evaluation, freezing/aliases, validation and registry-commit timing, canonical focused bindings and provider identity. The newly discovered changing-proxy case must be characterised explicitly.

Build the complete existing core/compatibility groups with no removed feature, new dependency, externalised implementation, dynamic load or public option. Reject the idea unless all four actual graph ceilings and independent control parity pass. A successful static prototype would permit a written architecture design and implementation plan; it would not qualify production or replace the complete 21-row host gate, import-plus-first-use checks, consumer types, Metro and eligible native acceptance. Compiler warm-transform work remains a separate unresolved part of that later complete batch. Physical-device and spoken-reader work remains deferred.
