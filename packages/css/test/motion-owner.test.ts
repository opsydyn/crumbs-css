import { expect, test } from 'bun:test';
import { defineMotion } from '../src/theme-motion';
import { createMotionOwner } from '../src/motion/owner';
import { controlledMotionDriver } from './support/motion-driver';
const definition = defineMotion({ states: { resting: { opacity: .6, translateX: 0 }, selected: { opacity: 1, translateX: 112 } }, transition: { duration: 180, easing: 'ease-in-out' } });
const options = { initial: 'resting', motion: 'full', duration: 180 } as const;
function setup() { const fake = controlledMotionDriver(), owner = createMotionOwner(definition, 'resting', fake.driver); owner.activate(options); return { fake, owner, c: owner.controller }; }
test('native_sample_beats_stale_js_value', async () => { const { fake, c, owner } = setup(); const first = c.animateTo('selected'); fake.sample(); fake.setPresentation('translateX', 42); const superseded = c.animateTo('resting'); const next = c.animateTo('selected'); fake.sample(); expect(fake.lastTiming('translateX').from).toBe(42); expect(fake.lastTiming('translateX').to).toBe(112); expect(await first.result).toEqual({ status: 'cancelled', target: 'selected', reason: 'superseded' }); expect(await superseded.result).toEqual({ status: 'cancelled', target: 'resting', reason: 'superseded' }); fake.finish(); expect(await next.result).toEqual({ status: 'finished', target: 'selected', mode: 'animated' }); expect(owner.inspect().retainedSettlements).toBe(0); expect(owner.inspect().frameListeners).toBe(0); });
test('stop_reentrancy_cannot_revive_old_run', async () => { const { fake, c } = setup(); const first = c.animateTo('selected'); fake.sample(); fake.faults.stopCompletes = true; const next = c.animateTo('resting'); fake.sample(); fake.finish(); expect(await first.result).toEqual({ status: 'cancelled', target: 'selected', reason: 'superseded' }); expect(await next.result).toEqual({ status: 'finished', target: 'resting', mode: 'animated' }); });
test('partial_success_never_finishes', async () => { const { fake, c } = setup(); const run = c.animateTo('selected'); fake.sample(); fake.lastTiming('opacity').finish(true); let settled = false; run.result.then(() => settled = true); await Promise.resolve(); expect(settled).toBe(false); fake.lastTiming('translateX').finish(false); expect(await run.result).toEqual({ status: 'cancelled', target: 'selected', reason: 'driver-stopped' }); });
test('cleanup_attempts_every_channel', async () => { const { fake, c } = setup(); const first = c.animateTo('selected'); fake.sample(); fake.faults.stop = 'opacity'; const count = fake.stops.length, starts = fake.timings.length, next = c.animateTo('resting'); expect(fake.stops.slice(count).some(v => v.channel === 'translateX')).toBe(true); expect(fake.timings.length).toBe(starts); expect((await first.result).status).toBe('failed'); expect((await next.result).status).toBe('failed'); });
test('stale_run_cancel_leaves_new_run', async () => { const { fake, c } = setup(); const first = c.animateTo('selected'), next = c.animateTo('resting'); const stops = fake.stops.length; first.cancel(); expect(fake.stops.length).toBe(stops); fake.sample(); fake.finish(); expect((await next.result).status).toBe('finished'); });
test('instances_do_not_share_values', async () => { const a = setup(), b = setup(), ar = a.c.animateTo('selected'), br = b.c.animateTo('selected'); ar.cancel(); b.fake.sample(); b.fake.finish(); expect((await ar.result).status).toBe('cancelled'); expect((await br.result).status).toBe('finished'); expect(a.fake.values[0]).not.toBe(b.fake.values[0]); expect(a.owner.inspect().values).toBe(2); });
test('immediate_failure_is_failed', async () => { for (const fault of ['set', 'stop'] as const) {
    const { owner, fake, c } = setup();
    owner.commitOptions({ ...options, motion: 'reduced' });
    fake.faults[fault] = 'opacity';
    const run = c.animateTo('selected');
    expect(await run.result).toEqual({ status: 'failed', target: 'selected', code: 'CRUMBS_CSS_MOTION_DRIVER_FAILED' });
    expect(fake.timings).toEqual([]);
} });
test('set_failure_throws_without_reached_state', async () => { const { fake, c } = setup(), run = c.animateTo('selected'); fake.faults.set = 'translateX'; expect(() => c.set('selected')).toThrow('CRUMBS_CSS_MOTION_DRIVER_FAILED'); expect((await run.result).status).toBe('failed'); fake.faults.set = undefined; const next = c.animateTo('selected'); expect(fake.reads.length).toBeGreaterThan(2); fake.sample(); fake.finish(); expect((await next.result).status).toBe('finished'); });
test('retired_reads_never_write_or_start', async () => { const { fake, owner, c } = setup(), run = c.animateTo('selected'); owner.deactivate(); const counts = [fake.writes.length, fake.timings.length]; fake.sample(); expect([fake.writes.length, fake.timings.length]).toEqual(counts); expect((await run.result).status).toBe('cancelled'); expect(await c.animateTo('selected').result).toEqual({ status: 'cancelled', target: 'selected', reason: 'deactivated' }); owner.activate(options); const next = c.animateTo('selected'); fake.sample(); fake.finish(); expect((await next.result).status).toBe('finished'); });
test('invalid_commands_leave_valid_work_and_same_target_reuses_run', async () => { const { fake, c } = setup(), run = c.animateTo('selected'); expect(c.animateTo('selected')).toBe(run); const count = fake.stops.length; expect(() => c.animateTo('bad' as never)).toThrow('CRUMBS_CSS_INVALID_MOTION_TARGET'); expect(fake.stops.length).toBe(count); fake.sample(); fake.finish(); expect((await run.result).status).toBe('finished'); expect(await c.animateTo('selected').result).toEqual({ status: 'finished', target: 'selected', mode: 'immediate' }); });
test('zero_duration_and_preference_commit_avoid_timing_and_replay', async () => { const { fake, owner, c } = setup(), run = c.animateTo('selected'); owner.commitOptions({ ...options, motion: 'reduced' }); fake.sample(); expect(await run.result).toEqual({ status: 'finished', target: 'selected', mode: 'immediate' }); expect(fake.timings).toEqual([]); owner.commitOptions(options); expect(fake.timings).toEqual([]); owner.commitOptions({ ...options, duration: 0 }); expect((await c.animateTo('resting').result).status).toBe('finished'); expect(fake.timings).toEqual([]); });
test('construction_is_quiet_and_commands_require_activation', () => { const fake = controlledMotionDriver(), owner = createMotionOwner(definition, 'resting', fake.driver); expect([fake.stops.length, fake.reads.length, fake.writes.length, fake.timings.length]).toEqual([0, 0, 0, 0]); expect(() => owner.controller.animateTo('selected')).toThrow('CRUMBS_CSS_MOTION_NOT_ACTIVE'); expect(() => owner.controller.set('selected')).toThrow('CRUMBS_CSS_MOTION_NOT_ACTIVE'); expect(() => owner.controller.cancel()).toThrow('CRUMBS_CSS_MOTION_NOT_ACTIVE'); });
test('synchronous_reads_completions_and_partial_start_failure_are_terminal_once', async () => { for (const fail of [false, true]) {
    const { fake, c, owner } = setup();
    fake.faults.synchronousReads = true;
    fake.faults.synchronousFinish = true;
    if (fail)
        fake.faults.start = 'translateX';
    const run = c.animateTo('selected');
    expect((await run.result).status).toBe(fail ? 'failed' : 'finished');
    fake.finish();
    expect(owner.inspect().retainedSettlements).toBe(0);
} });
