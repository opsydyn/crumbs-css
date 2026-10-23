---
status: proposed
date: 2026-10-17
decision-makers: Alan P Currie
---

# Stage a private compiler-free contract kernel

## Context and drivers

M10.5 needs faster complete native stylesheet transforms without breaking public APIs or pulling authoring dependencies into ordinary runtime imports. Recursive authoring chunk grouping leaked Vanilla Extract into tokens. A subsequent entry-aware layout preserved dependency isolation but failed the unchanged runtime source-name guard, retained 8/9 style files and added bytes. Neither supplied a speed result. The [closed proof](../evidence/2026-10-17-m10-5-entry-aware-packaging-proof/README.md) and [proposed design](../superpowers/specs/2026-10-17-m10-5-pure-contract-kernel-design.md) preserve these limits.

The approved intent is to design an explicit kernel boundary, preserve canonical bindings/runtime isolation, and state a falsifiable performance hypothesis before another prototype. This proposed record does not approve implementation or supersede the accepted [consumer-scoped release policy](anchor-m10-5-runtime-budget-revisions-in-expo-consumer-evidence.md). The broad [native compiler ADR](adopt-native-design-system-compiler.md) remains proposed; its D3/D5/D6/D11 contracts inform this bounded design.

## Proposed decision and alternatives

Prefer one private same-format contract artifact, named by SHA-256 of its actual emitted bytes, owning exactly diagnostics, token identity, theme-token metadata, theme contracts and domain-value helper implementations. Keep their existing source logic and global-symbol registry protocol. “Compiler-free” is a dependency boundary, not a claim that the existing registry initialization is pure.

| Option | Benefit | Cost and disposition |
| --- | --- | --- |
| Explicit five-source kernel, then one combined tool graph consuming it | Protects runtime-shared implementations before consolidating authoring; preserves within-format canonical bindings | Preferred hypothesis. Adds staged build/linking machinery; every fresh authoring compile still parses the bodies. No demonstrated effect size closes the release gap. |
| Entry-aware grouping or naming adjustment in the existing graph | Simpler packaging and demonstrated safe token dependency partition | The one approved proof is closed with no consolidation and incompatible provenance names. A rename does not supply the missing performance mechanism. |
| Four separate pure artifacts or a kernel containing all token-domain operations | Separate artifacts preserve boundaries; a broad kernel simplifies linkage | Four artifacts retain more module overhead; including domain operations forces unnecessary code into style. Neither is the minimal proposed cut. |
| Retained compiler session/service | Could avoid repeated compiler work | Prior session variants were slower or had lifecycle/identity gaps. A materially different lifetime/freshness design needs its own decision; no automatic fallback. |

Public exports and consumer imports stay unchanged. Root/style share one authoring implementation within each format. Separately configured runtime graphs and the single source-based declaration graph keep their current ownership. No new runtime dependency, engine floor, public feature flag or public serialized schema is introduced. Fixed private kernel filenames are not safe: require kernel-only equal-length changes to invalidate the actual compiled transformer key and native output/marker, with exact restoration and loaded-artifact provenance, without changing the existing cache algorithm.

## Concrete hypothesis and consequences

The structural prediction is style closure **8→at most 3 ESM files**, **9→at most 4 CJS files**, with one real five-source kernel and one authoring capsule behind the existing facade. This removes five file/module boundaries, not the function bodies. The unchanged full warm gate is effectively **6.513743750000014 ms**. The retained failed release selector **12.346250000000055 ms** would require **5.832506250000041 ms / 47.2411157%** less time. Current evidence does not establish savings on that scale.

A later proof must pass structure, all current provenance/import guards, packed binding/registry/declaration and behavioral/cache/map contracts before five unchanged complete warm processes. Reject the whole candidate at the first failed condition or either warm-bound failure. No source, declaration or naming workaround is admitted merely because its graph is smaller. The user approved the written design on 2026-10-17 after `d10e504`; this permits preparing the separately reviewed [feasibility plan](../superpowers/plans/2026-10-17-m10-5-pure-contract-kernel.md), not executing it or adopting the architecture.

Consequences: a deterministic contract boundary becomes independently auditable; build sequencing, cleanup and per-format linkage become maintenance obligations; full internal export retention may increase parse bytes; no reduction in validation, authored evaluation or CSS/Babel work follows automatically. The kernel remains parked as a promised release fix until the full selector passes. Any separate architecture-only adoption after a failed performance proof needs a new explicit decision.

## Implementation outline for the later approved plan

- **Affected paths:** proposed `packages/css/src/internal/contract-kernel.ts`, `tsdown.kernel.config.ts`, `build.mjs` and a focused build-link helper; existing `tsdown.config.ts`, `build-policy.ts`, build commands and associated package/identity tests. The [design](../superpowers/specs/2026-10-17-m10-5-pure-contract-kernel-design.md) defines exact owners, linking and stop order.
- **Mechanism:** use public awaitable tsdown `build`, driver-owned cleanup, raw kernel in an owned temporary stage first, actual-byte content addressing and publication next, all later configs `clean:false`. Pass the exact selected files through one validated generation-scoped build-only manifest; do not choose among old skip-clean hashes by a directory scan. Use per-format ordered Rolldown resolution with canonical five-source matching and `external:"relative"`. Never call private bundler APIs or infer ordering from the concurrent config array.
- **Declarations:** keep the original source-based DTS graph and CJS stubs; the JavaScript linker never handles type generation. Do not create a second nominal declaration owner.
- **Dependencies/configuration:** add no package dependency or public configuration. Add only the driver-scoped `CRUMBS_INTERNAL_KERNEL_MANIFEST` handoff, restored/cleaned in `finally` and absent from emitted/package metadata. Keep the existing skip-clean build mode; route normal build/dev/prepack through the driver. No consumer option, public subpath or engine change.
- **Migration and validation:** one owned scratch candidate against the exact independent control first. Preserve current source/runtime graphs and registries; record actual candidate provenance and all failed/unrun stages. Review the written plan before any implementation. An admitted candidate later requires normal next-release identities, full host/SDK/native software-context qualification and publication approval.

### Verification

- [ ] Exactly five implementation modules plus export-only facade produce one zero-external kernel per format; no compiler/Effect/node_modules source enters it.
- [ ] Literal same-format private links, one combined tool owner, unchanged public exports and all 59 export/30 ordinary source-list rows pass.
- [ ] Packed Node22.0.0/current ESM/CJS binding, provider, registry, declaration and behavioral/cache/map checks pass, including contamination negatives.
- [ ] Compiled ESM/CJS kernel-only equal-length edits change the loaded artifact, actual owning transformer key, native output and existing marker; restoration restores every identity/output. No new marker algorithm is used.
- [ ] Structural closure targets and all five complete warm processes satisfy the unchanged selector/bounds; otherwise archive/remove the whole candidate.
- [ ] Clean/skip-clean build and prepack outputs are complete, correctly ordered and include both private files without changing the public type graph.
- [ ] Any later production admission passes the unchanged 11 blocking release rows with valid complete evidence; no version-specific exception is inherited.

## Status and revisit conditions

Production adoption remains proposed. The written design is approved for feasibility-plan preparation; the resulting plan requires review before execution. No prototype or production changes accompany this design. Reject/park on an unsafe cut, unsupported linking/lifetime assumption, missing canonical identity proof, inability to consolidate or warm-budget failure. No release gate is waived, and M1.10c npm publication remains blocked by the original three host failures.


### Bounded proof disposition (2026-10-17)

The separately approved [feasibility plan](../superpowers/plans/2026-10-17-m10-5-pure-contract-kernel.md) produced one [retained scratch outcome](../evidence/2026-10-17-m10-5-pure-contract-kernel/README.md). Kernel purity/membership and H1 consolidation pass; the current ordinary-runtime provenance guard rejects a newly reachable pure CJS interop helper. The whole candidate is rejected and removed before downstream identity/parity/cache/timing, with no production code admitted. This record remains a proposed architectural adoption, and this implementation is parked as release remediation; architecture-only adoption or a changed provenance contract requires its own decision. No runtime guard, host gate or release constraint is waived.
