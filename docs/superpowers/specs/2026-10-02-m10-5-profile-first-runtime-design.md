# M10.5 Profile-First Runtime Diagnostic Design

- **Status:** Proposed; conversational design approved; written-spec review pending
- **Date:** 2026-10-02
- **Roadmap:** M10.5 in [roadmap.md](../../roadmap.md)
- **Extends:** [M10.5 Runtime Footprint Remediation Design](2026-10-01-m10-5-runtime-footprint-design.md)
- **Evidence:** [M10.5 budget failure triage](../../assessments/2026-10-02-m10-5-budget-failure-triage.md) and [minification qualification](../../evidence/2026-10-02-m10-5-minification/qualification.md)

## Goal

Determine whether the remaining theme/core and compatibility theme Node initialization and emitted-graph failures have a behavior-preserving source-level optimization target. This is a diagnostic slice: it identifies and substantiates a target, but does not change production runtime code.

## Constraints

- Preserve every public value and type export, synchronous behavior, diagnostic, and import path.
- Keep the approved thresholds, baselines, workload identities, and registry membership unchanged.
- Keep minification out of the default build; the qualified candidate still failed the theme graph and all four runtime-initialization limits.
- Keep source-map byte attribution, profile samples, and exact host-budget results distinct. A diagnostic profile is not an approved budget result.
- Keep Metro/editor comparability and visual, accessibility, native/device, and Android gates separate.

## Existing evidence

The minification qualification reports eight failures, three passes, and ten incomplete comparisons. The token graph passes its unchanged limits, while theme/core, compatibility theme, and all four runtime-initialization metrics fail. Source-map attribution locates large contributors, but mapped bytes do not establish runtime cost. The earlier single-entry diagnostic also increased measured import time and did not establish focused-entry identity.

The initial CPU-profile probe in this worktree captured only 51 and 60 samples; most were Node loader frames. Temporary emitted-module timing instrumentation changed the artifacts and is not comparable with the admitted host-budget protocol. These probes do not justify removing validation or changing entrypoint behavior. Existing tests explicitly require malformed serialized component contracts and unsupported extension versions to fail during theme resolution.

## Diagnostic method

Build the package with the current default, unminified configuration and record the source revision, build-tool versions, artifact hashes, and graph report. Profile only theme/core and compatibility theme, in ESM and CJS, on exact Node v22.0.0 and the current Node executable recorded at run time.

Use fresh processes for every retained sample, with one excluded warmup and fifteen retained samples per runtime, format, and entrypoint. Start the CPU profiler after the probe harness is ready and bracket only module loading. Use the existing resolveThemeTokens behavior receipt after the timed region. Run the existing uninstrumented host-budget suite against the default build; it remains the authority for threshold comparisons.

Build a separate source-map-enabled diagnostic copy from the exact same source revision and runtime entry configuration. Use it only to map sampled call frames back to TypeScript; do not compare its bytes or timings with approved thresholds. Retain this copy and raw CPU profiles under /private/tmp. Produce a committed assessment containing the run identity, default and diagnostic artifact hashes, source hashes, profile method, sampled call-frame attribution, the uninstrumented host-budget result, and limitations. Report unassigned samples as loader, parse/compile/link, or profiler overhead only when the profile supports that classification; otherwise label them unattributed. Do not present the difference between total import time and sampled source frames as a measured parse-time value.

## Decision rule

A source target is eligible for a follow-up design only when repeated profile evidence points to a Crumbs-owned path and an A/B candidate can preserve the existing public behavior and validation. A candidate must be evaluated with the uninstrumented ESM/CJS graph and host-budget harness at the same source revision. No threshold or baseline is adjusted to obtain a pass.

If profiling does not establish a safe causal target, stop the optimization attempt at this slice, record that result, and recommend the next roadmap action. Any production-code change requires its own concrete design review and implementation plan.

## Scope boundary

This diagnostic does not change package source, exports, type declarations, React context identity, compiler behavior, budget policy, release settings, or the M10.5 guarantees matrix. It does not qualify device rendering, screen readers, Android, or release-device performance. M10.5 remains open while required approved gates are failed, incomplete, or unrun.
