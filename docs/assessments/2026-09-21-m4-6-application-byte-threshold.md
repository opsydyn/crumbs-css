# M4.6 application-byte threshold re-evaluation

## Decision

Do not reopen or rebase the approved runtime-byte threshold from the repaired
Storybook application maps. The current evidence proves a useful before/after
boundary repair, but it is not an approved application performance baseline.
Keep `packages/css/bench/budgets.json` unchanged and fail-closed.

The retained package metric remains a separate deterministic gate: the
ordinary compatibility CommonJS graph is 44,764 bytes against the approved
11,307-byte zero-growth baseline, a +295.9% failure. The new token boundary
does not change that compatibility graph's measured size, so it cannot be used
to hide or reinterpret the existing failure.

## Repair delta

The machine-readable review is in
[review.json](../evidence/2026-09-21-m4-6-application-byte-threshold/review.json).
It compares the retained pre-repair Storybook evidence with the fresh graph
evidence from the token boundary repair:

| Measure | Before | After | Delta | Interpretation |
| --- | ---: | ---: | ---: | --- |
| Crumbs source-content modules | 122,242 | 117,301 | −4.04% | Boundary repair diagnostic |
| Workspace web bundle | 4,217,218 | 4,132,121 | −2.02% | App repair delta |
| Workspace iOS Hermes bundle | 5,063,016 | 4,945,416 | −2.32% | App repair delta |
| Workspace Android Hermes bundle | 5,072,484 | 4,954,788 | −2.32% | JS artifact only |
| Packed web bundle | 4,634,136 | 4,539,994 | −2.03% | App repair delta |
| Packed iOS Hermes bundle | 5,564,296 | 5,446,132 | −2.12% | App repair delta |
| Packed Android Hermes bundle | 5,573,776 | 5,455,444 | −2.12% | JS artifact only |

The prior maps failed the runtime boundary at `tokens.mjs`; the current maps
pass workspace and packed guards on all four map sets, with zero
`@vanilla-extract/*` and Effect source entries. That difference makes the
comparison evidence of a corrected dependency boundary, not a stable
pre-adoption workload against which a product budget can be approved.

## Why the threshold stays closed

- The retained `runtime-emitted-bytes` selector measures a package CommonJS
  graph, while the Storybook values measure application bundles and source
  maps. They are different scenarios and cannot share a threshold.
- The retained pre-repair Storybook maps were generated from a different
  source revision and an intentionally failing graph. They are a repair
  comparator, not an approved baseline.
- Source-map `sourcesContent` and filesystem bundle bytes do not establish
  Hermes startup, JavaScript/UI frame time, allocation or retained-memory
  behaviour. The budget registry still lacks qualifying device evidence for
  those domains.
- The packed Storybook run used npm legacy peer resolution and a current
  range-resolved Storybook package, so its absolute bytes are packaging
  evidence rather than a locked-workspace regression baseline.

No budget threshold, registry status, dependency, native target or Android
state changed. Physical iOS and Android remain backlogged to the final
device-enabled move.

## Admission protocol for a future application budget

Before adding an application-byte metric, retain an exact baseline and current
run for the same app, dependency lock, Expo/React Native/Hermes versions,
platform, build mode, source-map protocol and artifact identity. Run at least
five independent repetitions per scenario and keep application bundle bytes,
Hermes bytecode, source-map diagnostics and native performance metrics as
separate measures. Only then can a reviewer approve an absolute ceiling and a
regression policy without confusing graph repair with product performance.

Next recommended slice: **M4.6 runtime emitted-byte budget decision** — either
reduce the compatibility graph against a same-functionality baseline or record
an explicitly approved split budget for `theme/core`, `tokens` and the
compatibility entrypoint. Keep the registry fail-closed and physical iOS and
Android qualification backlogged.
