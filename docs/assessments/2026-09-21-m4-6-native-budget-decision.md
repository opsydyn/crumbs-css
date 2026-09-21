# M4.6: native budget decision and physical-device gate

This slice reviewed the M4.6 host/editor regressions and established the
proposed native probe contract. The current revision is `c93dd87`; the three
pre-existing release/version edits remain outside the slice. Android was not
inspected.

The target inventory contains the Mac mini and the `Crumbs Acceptance` iOS
26.5 simulator, but no connected iPhone or iPad. M1.6 therefore remains
incomplete and M4.6 cannot close on this host. Instruments exposes `Allocations`
and `Animation Hitches`, but a disposable simulator attach did not produce an
exportable trace in this session, so no frame or allocation number was admitted.

The exact M4.6 comparison has three deterministic zero-growth failures:

| Metric | Baseline | Current median | Change | Decision |
| --- | ---: | ---: | ---: | --- |
| CJS theme graph bytes | 11,307 | 44,764 | +295.9% | keep failed; investigate runtime graph |
| tsc 10,000-token instantiations | 490,410 | 834,137 | +70.1% | keep failed; run type ablation |
| tsgo 10,000-token instantiations | 490,508 | 834,235 | +70.1% | keep failed; run type ablation |

The runtime graph review finds no accidental Effect use-land bundle: the
ordinary runtime policy externalises Effect and the current CJS theme graph
lists only React as an external. The graph grew because the public theme
entrypoint now carries token-domain metadata, dependency plans, recipe plans
and selective theme stores. The editor trace repeatedly names
`NativeStyleInput`, `NativeStyleValueInput`, `NativeStyleTokenForProperty`,
`TokenDomainForProperty` and `DomainThemeVar`; this identifies a likely
domain-aware conditional type cost, but an ablation is required before any
public type change.

The native decision is to keep the registry fail-closed, leave all missing
frame/allocation thresholds pending, and use Xcode Instruments traces plus the
existing GC-backed memory receipt for the next physical-device run. The
contract requires a plain React Native comparison, five measured repetitions,
one excluded cold launch, recorded thermal/toolchain identity, exportable
`Animation Hitches` and `Allocations` traces, and six retained-memory
checkpoints. Simulator evidence remains diagnostic. No threshold, dependency,
runtime policy or native package changed.

Evidence: [target inventory](../evidence/2026-09-21-m4-6-native-budget/native-target-inventory.json),
[regression review](../evidence/2026-09-21-m4-6-native-budget/regression-review.json),
and [native probe contract](../evidence/2026-09-21-m4-6-native-budget/native-probe-contract.json).

M4.6 remains unchecked. Physical iOS qualification is explicitly backlogged to
the final device-enabled platform move alongside Android. The active next
bounded slice is host-only ablation that slims the theme runtime graph and
isolates the domain-aware type-instantiation cost; device access must not block
that work.
