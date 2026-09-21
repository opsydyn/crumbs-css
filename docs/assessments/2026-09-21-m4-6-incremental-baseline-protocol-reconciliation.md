# M4.6 incremental baseline protocol reconciliation

## Decision

Admit the expanded M2.7-aware Metro protocol as the current
`incremental-rebuild` baseline contract. The retained run proves three
dependency invalidation receipts before one excluded direct-edit warmup and
five direct `.css.ts` edits:

- plain-token, nested `.css.ts`, and workspace-source controls each rebuild the
  parent bundle and remove the previous compiled value;
- the five direct-edit samples are 123.9505 ms median, 122.8297 ms minimum,
  and 126.8268 ms maximum;
- all fixture hashes are restored and every direct receipt has the new value,
  no old value, and a changed bundle hash.

The new baseline is retained in
[Metro evidence](../evidence/2026-09-21-m4-6-incremental-baseline/metro-incremental.json),
with the protocol and review decision in
[decision evidence](../evidence/2026-09-21-m4-6-incremental-baseline/decision.json).
The old 125.005 ms baseline remains untouched as historical evidence.

## Threshold policy

The previously approved direct-edit ceiling is preserved explicitly at
137.506 ms absolute and 10% relative. The expanded controls change the
scenario contract, so the baseline is replaced through a reviewed decision;
the ceiling is not silently tightened from one new run or relaxed to absorb a
regression. The approval is recorded as Alan Currie’s session approval at
2026-09-21T20:31:50Z.

The focused reconciliation compares the current run against the new baseline
under the expanded protocol and passes with zero delta. Its result is retained
in [reconciliation evidence](../evidence/2026-09-21-m4-6-incremental-baseline/reconciliation.json).
The earlier full-host report remains preserved with its original
fail-closed mismatch; it is historical evidence from before this registry
decision, not rewritten output.

## Qualification and limits

`budgets:validate` re-derives the new 123.9505 ms baseline with no evidence
issues. Focused budget-contract tests cover the expanded controls, baseline
path, exact median and preserved ceiling. Whole-registry readiness remains
false because release-device frame, allocation and retained-memory domains are
still missing or diagnostic.

This is Expo/Metro development-host evidence. It does not qualify release
Hermes, physical iOS, Android, frame time, allocation or retained memory.

Next recommended slice: **M4.6 historical compatibility budget disposition** —
decide whether the old 11,307-byte compatibility metric remains a legacy
diagnostic, is retired in favour of the admitted split graphs, or requires a
same-functionality `theme` graph reduction plan. Keep the current split gates
and whole-registry fail-closed boundaries intact.
