# M4.6 full host comparison rerun

## Result

The updated `measure:host-budgets` adapter completed the Effect boundary,
runtime initialization, Metro incremental, benchmark, editor, and split graph
scenarios. The combined report contains 22 recorded metric comparisons:

- 20 pass, including all six admitted split graph budgets;
- one expected historical compatibility failure: `runtime-emitted-bytes` is
  44,764 bytes against its old 11,307-byte zero-growth baseline (+295.9%);
- one fail-closed incomplete comparison: `incremental-rebuild` has an
  environment mismatch because the current protocol is broader than the
  retained baseline.

The full report is retained in
[comparison evidence](../evidence/2026-09-21-m4-6-full-host-comparison/comparison.json),
with raw reports for each scenario in the same directory. The six current
runtime graph metrics remain exact and pass at zero growth. Whole-registry
performance qualification remains `not-run` because the registry still has
pending or diagnostic release-device domains.

## Incremental protocol boundary

The incremental mismatch is intentional fail-closed behaviour. The retained
baseline records one excluded direct-edit warmup and five direct `.css.ts`
edits. The current harness additionally proves three dependency controls
(plain token, nested `.css.ts`, and workspace source), uses an expanded fixture,
and records the corresponding fixture hashes. Its current direct-edit timing
is not comparable until that protocol change receives a reviewed baseline
decision.

This keeps a protocol change from being misreported as a regression. The next
slice should either re-admit the expanded protocol with a new baseline or
restore the old measurement contract; it should not mutate the old evidence in
place.

## Host and qualification boundaries

The exact Node v22.0.0 floor was restored in the existing temporary cache. The
Metro run used a local server on port 8093 with local binding permitted. The
current graph scan records Node v26.3.0 for traceability while its deterministic
emitted-byte comparison uses the explicit Bun/build-tool/host equivalence
defined by the split-budget adapter.

This is host and emitted-artifact evidence. It does not qualify Hermes frame
time, allocation or retained-memory behaviour, physical iOS, or Android. Those
gates remain backlogged.

Next recommended slice: **M4.6 incremental baseline protocol reconciliation**
— decide whether the dependency-control and expanded-fixture contract is the
new admitted scenario, then retain a new five-repetition baseline and update
the registry only through a reviewed evidence decision.
