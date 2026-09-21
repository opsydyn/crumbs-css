# M4.6 split-budget review and admission

## Decision

Admit six deterministic emitted-graph metrics for the current runtime
entrypoint contract:

- ESM and CJS `theme-core` graphs;
- ESM and CJS ordinary `tokens` graphs, including their local chunks; and
- ESM and CJS compatibility `theme` graphs.

Each metric uses the five sequential scans retained in
[admission evidence](../evidence/2026-09-21-m4-6-runtime-byte-budget-admission/admission.json),
sets its absolute maximum to the recorded graph size, and permits zero
percent growth. This follows the performance protocol for deterministic byte
counters. The approval is recorded as Alan Currie’s session approval with a
UTC timestamp and review evidence in this document.

The historical `runtime-emitted-bytes` metric remains in the registry. It
continues to represent the old compatibility graph and remains a separate
fail-closed comparison against 11,307 bytes; admitting the split metrics does
not rewrite that result.

## Admitted metrics

| Metric | Scenario | Baseline / ceiling | Growth |
| --- | --- | ---: | ---: |
| `runtime-theme-core-esm-graph-bytes` | `theme-core` ESM local graph | 17,271 bytes | 0% |
| `runtime-theme-core-cjs-graph-bytes` | `theme-core` CJS local graph | 17,641 bytes | 0% |
| `runtime-tokens-esm-graph-bytes` | `tokens` ESM graph and chunks | 56,013 bytes | 0% |
| `runtime-tokens-cjs-graph-bytes` | `tokens` CJS graph and chunks | 63,308 bytes | 0% |
| `runtime-theme-compatibility-esm-graph-bytes` | compatibility `theme` ESM graph | 44,017 bytes | 0% |
| `runtime-theme-compatibility-cjs-graph-bytes` | compatibility `theme` CJS graph | 44,764 bytes | 0% |

The ordinary token graph has no external imports and remains separate from
the Effect-backed `tokens/schema` and `tokens/optic` entrypoints. `theme` and
`theme-core` retain only React as a direct external. All six scans report zero
nonliteral loads.

## Registry state

`packages/css/bench/budgets.json` now contains 26 metrics. Twenty-two have
recorded baselines and approved thresholds; the four remaining frame,
allocation and retained-memory entries keep the registry at
`thresholds-pending-review`. `budgets:validate` remains the integrity gate;
`budgets:readiness` must continue to fail until the missing release-device
domains are admitted. Whole-registry performance qualification remains
`not-run`.

The old compatibility metric is deliberately still visible. Its current
44,764-byte graph is +295.9% against the historical 11,307-byte zero-growth
baseline. The new split metrics establish current-functionality budgets; they
do not claim that the old baseline is comparable or passing.

## Qualification and limits

The five scans were made after `bun run build` on the current macOS arm64
host. They establish reproducible emitted artifacts and hashes, not Hermes
startup, frame time, allocation or retained-memory behaviour. No dependency,
public API, runtime graph, native target or Android qualification state
changed in this slice. Physical iOS and Android remain backlogged.

Next recommended slice: **M4.6 current split-budget comparison run** — add a
current-checkout adapter that scans these six entrypoints, compares each
format-specific graph against the admitted baselines and reports both the
split results and the retained historical compatibility failure. Keep the
whole registry fail-closed until release-device frame, allocation and
retained-memory evidence is available.
