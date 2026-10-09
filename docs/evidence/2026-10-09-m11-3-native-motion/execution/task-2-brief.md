## Task 2: Pure run/read/lifecycle state machine

**Interfaces:**

- `MotionToken = object`, fresh opaque identities supplied by the owner, not global counters. `MotionPolicy` is readonly effective duration/easing/motion; `MotionMachine` is opaque immutable state for definition, reached target/unknown presentation, committed options, activation epoch, current run and current read cohort.
- `createMotionMachine(definition:NativeMotionDefinition,initial:string):MotionMachine`; `reduceMotion(machine:MotionMachine,event:MotionEvent):MotionReduction`; `MotionReduction` is readonly state plus commands. `currentMotionRun(machine): {token:MotionToken;target:string}|undefined`; `inspectMotionMachine(machine):{phase:'created'|'active'|'inactive';activeRuns:0|1;readCohorts:0|1}`. Task3 consumes these functions, not machine internals.
- Closed MotionEvent members: activate(epoch,options); options(epoch,options); request(epoch,run,target,cohort); read(epoch,cohort,channel,value:unknown); completed(epoch,run,channel,finished:unknown); cancel(epoch,run); set(epoch,target); deactivate(epoch); driverFailed(epoch,operationToken). All token-bearing replies verify current authority before touching payload data. operationToken identifies the current effect transaction, not a retired completion callback.
- Closed bounded MotionCommand members: stop, read, set, start, settle. Each carries its activation/operation token; read carries cohort+channel; start carries run+channel+target number+captured policy; settle carries exact run token and terminal result. A transaction's stop/read/set/start outcome must reach the reducer before any dependent success settlement. Retire old authority before interpreting effects; cleanup failure overrides pending terminal intent to failed. No unbounded event/run history or publicly extensible command registry.
- `test/oracles/motion.ts` supplies a test-owned event/target oracle and adversarial generators; it imports no production reducer/admission to compute expected results.

- [ ] Write `late_cohort_cannot_write_after_set`, `same_pending_target_reuses_run`, `pending_targets_share_one_stopped_cohort`, `all_channels_must_finish`, `cancel_does_not_mark_target_reached`, `reduced_motion_finishes_latest_target`, `deactivate_retires_every_token`. Assertions include replacing 100 pending targets with one cohort, stale reads/completions producing no node commands, one false among six completions never producing finished, exactly one terminal per token, zero-duration/reduced no read/start, and activation replay never reviving a retired run.
Representative reducer assertions after applying test-owned activation/request/read/completion events:

```ts
expect(terminalResults.filter(x => x.token === firstRun)).toEqual([
  { token: firstRun, result: { status: 'cancelled', target: 'selected', reason: 'superseded' } },
]);
expect(inspectMotionMachine(machine).readCohorts).toBe(1);
expect(commandsFromRetiredRead).toEqual([]);
```

- [ ] Run `bun test packages/css/test/motion-machine.test.ts`. Expected: RED before reducer code, with absent machine interface as the first cause.
- [ ] Implement the exact reducer/query interfaces, copied finite state and bounded transactional commands. Easing/duration are captured per request; duration-only commits do not rewrite a pending run, while reduced commits finish it immediately. Preserve stopped samples for a newer request in the same cohort, retiring that cohort before any immediate writes/deactivation.
- [ ] Add seeded independent sequence laws for cancellation, late/duplicate/out-of-order replies, option commits, two instances and reactivation. Run `bun test packages/css/test/motion-machine.test.ts packages/css/test/motion-machine.property.test.ts`. Expected: GREEN, one current run/cohort, terminal-once and retired-authority laws for 300 generated sequences per law. No timer or native fake is necessary for reducer correctness.

**Checkpoint:** Pure decision core, including operation failure gates. Retain for the final slice commit.

