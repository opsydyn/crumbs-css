import { expect, test } from 'bun:test';
import fc from 'fast-check';
import { defineMotion } from '../src/theme-motion';
import { createMotionMachine, reduceMotion, currentMotionRun, inspectMotionMachine } from '../src/motion/machine';
import type { MotionMachine, MotionEvent, MotionToken, MotionCommand } from '../src/motion/machine';
import { motionOracle, type MotionAction } from './oracles/motion';
const definition = defineMotion({ states: { resting: { opacity: .6, translateX: 0 }, selected: { opacity: 1, translateX: 112 } }, transition: { duration: 180, easing: 'linear' } });
const actions = fc.constantFrom<MotionAction>('resting', 'selected', 'cancel', 'set', 'reduced', 'full', 'finish', 'deactivate', 'activate');
test('independent_terminal_and_two_owner_sequence_law', () => fc.assert(fc.property(fc.array(fc.tuple(fc.integer({ min: 0, max: 1 }), actions), { maxLength: 120 }), sequence => {
    const owners = [0, 1].map(() => ({ state: createMotionMachine(definition, 'resting'), epoch: {}, oracle: motionOracle(), tokens: new Map<MotionToken, number>(), cohort: undefined as MotionToken | undefined, results: [] as {
            id: number;
            result: unknown;
        }[], motion: 'full' as 'full' | 'reduced' }));
    function dispatch(o: typeof owners[number], event: MotionEvent) { let reduction = reduceMotion(o.state, event); o.state = reduction.state; const commands: MotionCommand[] = [...reduction.commands]; for (let i = 0; i < commands.length; i++) {
        const c = commands[i]!;
        if (c.type === 'settle')
            o.results.push({ id: o.tokens.get(c.run)!, result: c.result });
        else if (c.type === 'read')
            o.cohort = c.cohort;
    } const effect = commands.find(c => c.type !== 'settle'); if (effect) {
        reduction = reduceMotion(o.state, { type: 'operationSucceeded', epoch: effect.epoch, operation: effect.operation });
        o.state = reduction.state;
        for (const c of reduction.commands)
            if (c.type === 'settle')
                o.results.push({ id: o.tokens.get(c.run)!, result: c.result });
    } }
    for (const o of owners)
        dispatch(o, { type: 'activate', epoch: o.epoch, options: { initial: 'resting', motion: 'full', duration: 180 } });
    sequence.forEach(([which, action], id) => {
        const o = owners[which]!;
        o.oracle.step(action, id);
        const epoch = o.epoch;
        if (action === 'resting' || action === 'selected') {
            const token = {};
            o.tokens.set(token, id);
            dispatch(o, { type: 'request', epoch, run: token, target: action, cohort: {} });
        }
        if (action === 'cancel') {
            const run = currentMotionRun(o.state);
            if (run)
                dispatch(o, { type: 'cancel', epoch, run: run.token });
            dispatch(o, { type: 'cancel', epoch, run: {} });
        }
        if (action === 'set')
            dispatch(o, { type: 'set', epoch, target: 'resting' });
        if (action === 'reduced' || action === 'full') {
            o.motion = action === 'full' ? 'full' : 'reduced';
            dispatch(o, { type: 'options', epoch, options: { initial: 'resting', motion: o.motion, duration: 180 } });
        }
        if (action === 'finish') {
            if (o.cohort) {
                dispatch(o, { type: 'read', epoch, cohort: o.cohort, channel: 'translateX', value: 42 });
                dispatch(o, { type: 'read', epoch, cohort: o.cohort, channel: 'opacity', value: .75 });
            }
            const run = currentMotionRun(o.state);
            if (run) {
                dispatch(o, { type: 'completed', epoch, run: run.token, channel: 'translateX', finished: true });
                dispatch(o, { type: 'completed', epoch, run: run.token, channel: 'opacity', finished: true });
            }
        }
        if (action === 'deactivate')
            dispatch(o, { type: 'deactivate', epoch });
        if (action === 'activate' && inspectMotionMachine(o.state).phase === 'inactive') {
            o.epoch = {};
            o.motion = 'full';
            dispatch(o, { type: 'activate', epoch: o.epoch, options: { initial: 'resting', motion: 'full', duration: 180 } });
        }
        const before = o.results.length;
        dispatch(o, { type: 'read', epoch: {}, cohort: {}, channel: 'opacity', value: NaN });
        dispatch(o, { type: 'completed', epoch: o.epoch, run: {}, channel: 'opacity', finished: true });
        expect(o.results.length).toBe(before);
        expect(o.results).toEqual(o.oracle.results);
        expect(new Set(o.results.map(r => r.id)).size).toBe(o.results.length);
        expect(inspectMotionMachine(o.state).activeRuns).toBeLessThanOrEqual(1);
        expect(inspectMotionMachine(o.state).readCohorts).toBeLessThanOrEqual(1);
    });
}), { seed: 20261009, numRuns: 300 }));
