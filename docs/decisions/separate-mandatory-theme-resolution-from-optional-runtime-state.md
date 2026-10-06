---
status: rejected
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
| Static semantic modules, unchanged build groups | Deterministic synchronous dispatch; separates optional scope initialisation; allows local pure traversal characterization | Tested as a private candidate and rejected for production: the candidate increased all four theme graphs and failed all four startup gates. |
| New trusted compiled-only resolver with legacy fallback | Could isolate a smaller new consumer path | Would add artifact/API adoption work while old generic graph still fails. Outside this slice. |
| Register or load optional feature handlers | Could defer loading | Load-order, refresh and missing-handler hazards; asynchronous loading conflicts with API. Rejected. |
| Rebundle compatibility into one file / group all theme entries | Historical probes reduced some loading cost or shared more references | Already rejected: focused identity or lean-core isolation fails. Do not repeat as an admission shortcut. |

## Candidate implementation record

The [consolidated candidate plan](../superpowers/plans/2026-10-06-m10-5-runtime-boundary.md) was executed as one admission/rejection slice. Package-shaped ESM/CJS contracts, resolver identity, mixed provider/hook order, nested slot recursion and runtime isolation passed. The exact candidate source is retained in [the evidence archive](../evidence/2026-10-06-m10-5-runtime-boundary/README.md), but production extraction was removed after the unchanged host-budget comparison failed. No public API or dependency changed.

The affected areas considered by the private experiment were:

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

- [x] Published exports/types and synchronous semantics remain compatible in package-shaped ESM/CJS consumers.
- [x] Compatibility/focused reference equality, core mixed-entry interoperability and runtime denial gates pass.
- [x] Descriptor, nested-recursion, cache/reference and property characterization passed for the tested candidate cases.
- [x] Paired first-use data distinguishes the result from control spread; it shows no qualifying improvement. Candidate graph growth and startup failures reject the production extraction.
- [ ] Candidate packed result was not retained; candidate Metro/native flows were not run after the official host gate rejected it. The restored-control packed export/source-map check passed; it is recorded separately and does not qualify candidate native behavior.
- [x] M10.5 remains open. No budget, baseline, public API or physical acceptance was promoted.

Keep the measured rejection and current production structure. The next recommended M10.5 work is a non-breaking startup and emitted-graph attribution and feasibility design; do not revisit the static split without a specific evidence-backed change that can meet the retained gates. Any legacy API/budget incompatibility still requires a separate explicit decision.
