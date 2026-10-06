---
status: proposed
date: 2026-10-06
decision-makers: Alan P Currie
---

# Separate mandatory theme resolution from optional runtime state

## Decision summary

For M10.5, propose static internal modules that separate generic token/descriptor resolution, style-map resolution, React integration, token scopes and dependency planning. Retain mandatory serialized-descriptor validation and existing build groups. Evaluate this as a private candidate before admitting production restructuring. No plugin registration, asynchronous resolver, new public API or runtime dependency is proposed.

Detailed module ownership and qualification contract: [M10.5 runtime-boundary design](../superpowers/specs/2026-10-06-m10-5-runtime-boundary-design.md). This record is **proposed**. Authorisation to write and commit this design does not accept the decision or qualify an implementation.

## Context and drivers

At `d637fa7`, the current comparison has four theme graph failures, three theme startup failures, warm-transform failure and one incomparable Metro metric. The core entry re-exports a shared source containing optional token-scope state. However, core's generic token resolver must accept and validate serialized component/extension descriptors. Dropping those paths would break shipped behaviour. Source separation can remove avoidable module reachability; it cannot remove semantics the public API requires.

The existing [compiler architecture](adopt-native-design-system-compiler.md), decisions D2/D3/D6, governs native semantics, runtime isolation and measured performance. This proposal refines its runtime organisation and the approved [footprint design](../superpowers/specs/2026-10-01-m10-5-runtime-footprint-design.md); it does not supersede or accept the whole original proposed ADR.

Preserve published names/types/subpaths, synchronous returns, token ownership, deterministic errors, immutability/reference reuse, Symbol-keyed contexts/cache and single-React-peer interoperability. Compatibility/focused paths share canonical bindings. Core is independently built and does not promise reference equality with compatibility; preserve behaviour without inventing a stronger identity contract. Approved ceilings, baselines and workload identities remain unchanged.

## Alternatives

| Option | Advantages | Disadvantages / decision |
| --- | --- | --- |
| Static semantic modules, unchanged build groups | Deterministic synchronous dispatch; separates optional scope initialisation; allows local pure traversal characterization | Selected proposal. Required validators and compatibility exports remain in static graphs; improvement requires measurement. |
| New trusted compiled-only resolver with legacy fallback | Could isolate a smaller new consumer path | Would add artifact/API adoption work while old generic graph still fails. Outside this slice. |
| Register or load optional feature handlers | Could defer loading | Load-order, refresh and missing-handler hazards; asynchronous loading conflicts with API. Rejected. |
| Rebundle compatibility into one file / group all theme entries | Historical probes reduced some loading cost or shared more references | Already rejected: focused identity or lean-core isolation fails. Do not repeat as an admission shortcut. |

## Implementation handoff

After written-design approval, prepare one consolidated plan with a private control/candidate build, independently characterised behaviour, extraction and paired qualification. Proposed affected paths:

- `packages/css/src/theme-runtime.ts`, `theme-core.ts`: preserve public facades while replacing internal ownership.
- `packages/css/src/runtime/`: token/style/component resolution, existing cache/context helpers, React integration, token scopes and dependency resolver; exact responsibilities are in the specification.
- `packages/css/src/components/contracts.ts`, `components/extension-contract.ts`: retain validators unchanged for the first extraction; any later helper sharing needs an independently characterised design.
- `packages/css/tsdown.config.ts`, `build-policy.ts`, `package.json`: record unchanged build/export/dependency policy; changes require a separate justified decision.
- `packages/css/test/runtime-isolation.test.ts`, `theme-runtime-resolver-identity.test.ts`, existing theme/component/extension tests: characterize parity and keep denial gates; supplement bounded property tests and package-shaped consumer checks.
- Existing graph/initialisation/host-budget collectors and `scripts/measure-current-host-budgets.ts`: preserve official protocols; private first-use diagnostics supplement rather than replace them.

No dependency installation, consumer migration, runtime feature flag, environment setting or serialized version change is required by the proposal. Avoid public wrappers that copy canonical functions, dynamic registries, validation bypasses and import-only timing wins caused by deferred work. Source owners must not create import cycles; internal component handlers receive the existing generic resolver synchronously for recursive slot resolution.

## Consequences and risks

- Mandatory descriptor admission remains reachable in core, limiting possible byte reductions. An extraction can fail its performance objective; reject it rather than presenting structure as a pass.
- More internal modules can add loader overhead or expose initialization cycles. Keep current build groups, use static ownership and measure emitted artifacts/fresh processes.
- Shared cache/context state can affect mixed-entry and hot-refresh behaviour. Preserve exact symbol keys, weak lifetime, registration timing and provider/hook checks.
- Optional costs must not silently move past the startup timing window. Pair import and first-use totals and preserve synchronous diagnostics.
- Any admitted runtime change invalidates previous native/package evidence for that source. Recollect current software windows; all physical work remains deferred.

## Verification and disposition

- [ ] Published exports/types and synchronous semantics remain compatible in package-shaped ESM/CJS consumers.
- [ ] Compatibility/focused reference equality, core mixed-entry interoperability and runtime denial gates pass.
- [ ] Independent valid/malformed serialized-input characterization, error contracts, cache/reference relations and property checks pass.
- [ ] Candidate reduces core emitted bytes without mandatory feature loss or material first-use regression; paired evidence distinguishes effect from control spread.
- [ ] Unchanged host comparison, packed exports and current shipping/native receipts are retained after any production admission.
- [ ] M10.5 remains open while approved gates fail, are incomparable or unperformed. No budget, baseline or physical acceptance is promoted by this decision.

If the proposed extraction does not demonstrate an admissible benefit, keep the measured rejection and current production structure. Any legacy API/budget incompatibility then requires a separate explicit decision. Review the written design before creating an execution plan; this ADR does not authorise production implementation.
