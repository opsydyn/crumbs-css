# M1.7a: editor and typechecker scale fixtures

M1.7a adds deterministic public-API projects at exactly 100, 1,000 and 10,000 flat token leaves. Each project creates a complete contract and theme, representative style variants, and a two-axis recipe with defaults and a compound variant. Generated source hashes and byte/line counts are committed in the fixture manifest. Conditions and slot recipes are recorded as unsupported and unmeasured because Crumbs does not yet expose either API.

`bun run measure:editor <output> [repetitions]` first rejects stale generated fixtures. It then starts a fresh process for each compiler, scale and repetition with extended diagnostics. A separate fresh process creates the TypeScript language service, performs semantic analysis, requests the first token-member completion, and repeats the same completion against the warm service. Completion admission requires the exact number of generated token members. The dedicated fixture projects and the routine package project exclude one another so normal typechecking does not silently absorb the scale workload.

## Recorded baseline

The [raw evidence](../evidence/2026-09-15-editor-scale/raw.json) contains five independent repetitions on an Apple M4 Pro host with macOS kernel 25.6.0, Bun 1.4.2, Node 26.3.0, TypeScript 6.0.3 and TypeScript native preview 7.0.0-dev.20260519.1. These are medians; the raw file retains every duration and diagnostic.

| Tokens | Compiler | Wall ms | Check ms | Memory KiB | Types | Instantiations |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 100 | tsc | 510.4 | 100 | 164,711 | 5,752 | 15,210 |
| 100 | tsgo | 133.2 | 26 | 83,055 | 7,159 | 15,308 |
| 1,000 | tsc | 558.4 | 140 | 160,918 | 16,552 | 58,410 |
| 1,000 | tsgo | 148.3 | 36 | 88,548 | 18,859 | 58,508 |
| 10,000 | tsc | 882.1 | 430 | 285,025 | 124,552 | 490,410 |
| 10,000 | tsgo | 332.9 | 203 | 140,013 | 135,859 | 490,508 |

| Tokens | Semantic analysis ms | First completion ms | Warm completion ms | Exact token entries |
| ---: | ---: | ---: | ---: | ---: |
| 100 | 351.2 | 5.2 | 0.8 | 100 |
| 1,000 | 395.2 | 8.7 | 3.2 | 1,000 |
| 10,000 | 744.2 | 39.3 | 30.4 | 10,000 |

## Qualification and limits

Package build, typecheck and all 292 tests pass, including deterministic generation, exact scale metadata, compiler-diagnostic parsing, unsupported-scale rejection and fixture isolation. The documentation build also passes. No dependency, runtime behavior or public library API changes are introduced. Preexisting release version edits remain excluded; no push or publication occurs.

This is an uncontrolled-host baseline without an approved M1.8 budget. It does not qualify editor UI latency, keystroke-to-paint behavior, incremental edits/rebuilds, native runtime performance, thermal behavior, conditions or slot recipes. TypeScript and tsgo diagnostic counters are retained per engine and are not assumed to be directly equivalent. Parent M1.7 remains open until the missing APIs exist and their editor costs are measured. Native Android remains last.

Next recommended slice: M1.8a, define the versioned machine-readable budget schema and measurement protocol around the existing M1 baselines, leaving numeric thresholds explicitly pending reviewer approval. Begin only after approval.
