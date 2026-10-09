import { NativeStylesDiagnosticCode as Code } from '../diagnostics';
import { admitMotionDefinition, motionChannels, motionError, validateMotionChannel } from './definition';
import { admitMotionTarget } from './policy';
import type { AdmittedMotionOptions, MotionPolicy, NativeMotionChannel, NativeMotionDefinition } from './model';
export type MotionToken = object;
export type MotionResult = {
    readonly status: 'finished';
    readonly target: string;
    readonly mode: 'animated' | 'immediate';
} | {
    readonly status: 'cancelled';
    readonly target: string;
    readonly reason: 'cancelled' | 'superseded' | 'set' | 'deactivated' | 'driver-stopped';
} | {
    readonly status: 'failed';
    readonly target: string;
    readonly code: 'CRUMBS_CSS_MOTION_DRIVER_FAILED';
};
type Terminal = Readonly<{
    run: MotionToken;
    result: MotionResult;
}>;
type Run = Readonly<{
    token: MotionToken;
    target: string;
    policy: MotionPolicy;
    stage: 'reading' | 'running' | 'immediate';
    done: readonly NativeMotionChannel[];
}>;
type Cohort = Readonly<{
    token: MotionToken;
    samples: Readonly<Partial<Record<NativeMotionChannel, number>>>;
}>;
type Operation = Readonly<{
    token: MotionToken;
    terminals: readonly Terminal[];
    reached?: string | undefined;
    failedCleanup: boolean;
}>;
export type MotionMachine = Readonly<{
    definition: NativeMotionDefinition;
    channels: readonly NativeMotionChannel[];
    phase: 'created' | 'active' | 'inactive';
    epoch?: MotionToken | undefined;
    options?: AdmittedMotionOptions | undefined;
    reached?: string | undefined;
    run?: Run | undefined;
    cohort?: Cohort | undefined;
    operation?: Operation | undefined;
}>;
type Authority = {
    epoch: MotionToken;
    operation: MotionToken;
};
export type MotionCommand = Authority & ({
    type: 'stop';
    channel: NativeMotionChannel;
} | {
    type: 'read';
    channel: NativeMotionChannel;
    cohort: MotionToken;
} | {
    type: 'set';
    channel: NativeMotionChannel;
    value: number;
} | {
    type: 'start';
    channel: NativeMotionChannel;
    run: MotionToken;
    value: number;
    policy: MotionPolicy;
} | {
    type: 'settle';
    run: MotionToken;
    result: MotionResult;
});
export type MotionEvent = {
    type: 'activate';
    epoch: MotionToken;
    options: AdmittedMotionOptions;
} | {
    type: 'options';
    epoch: MotionToken;
    options: AdmittedMotionOptions;
} | {
    type: 'request';
    epoch: MotionToken;
    run: MotionToken;
    target: string;
    cohort: MotionToken;
} | {
    type: 'read';
    epoch: MotionToken;
    cohort: MotionToken;
    channel: NativeMotionChannel;
    value: unknown;
} | {
    type: 'completed';
    epoch: MotionToken;
    run: MotionToken;
    channel: NativeMotionChannel;
    finished: unknown;
} | {
    type: 'cancel';
    epoch: MotionToken;
    run: MotionToken;
} | {
    type: 'set';
    epoch: MotionToken;
    target: string;
} | {
    type: 'deactivate';
    epoch: MotionToken;
} | {
    type: 'driverFailed' | 'operationSucceeded';
    epoch: MotionToken;
    operation: MotionToken;
};
export type MotionReduction = Readonly<{
    state: MotionMachine;
    commands: readonly MotionCommand[];
}>;
const result = (state: MotionMachine, commands: readonly MotionCommand[] = []): MotionReduction => ({ state: Object.freeze(state), commands: Object.freeze(commands) });
const cancelled = (run: Run, reason: Extract<MotionResult, {
    status: 'cancelled';
}>['reason']): Terminal => ({ run: run.token, result: { status: 'cancelled', target: run.target, reason } });
const finished = (run: Run, mode: 'animated' | 'immediate'): Terminal => ({ run: run.token, result: { status: 'finished', target: run.target, mode } });
function settle(state: MotionMachine, terminals: readonly Terminal[], operation: MotionToken = {}): MotionCommand[] { return terminals.map(t => ({ type: 'settle', epoch: state.epoch!, operation, ...t })); }
type Effect = Exclude<MotionCommand, {
    type: 'settle';
}> extends infer C ? C extends Authority ? Omit<C, keyof Authority> : never : never;
function transaction(state: MotionMachine, effects: readonly Effect[], terminals: readonly Terminal[] = [], reached?: string | undefined, failedCleanup = false): MotionReduction {
    if (!effects.length)
        return result(state, settle(state, terminals));
    // A replaced operation loses write authority but must not lose its settlements.
    const carried = new Map<MotionToken, Terminal>();
    for (const t of state.operation?.terminals ?? []) carried.set(t.run, t);
    for (const t of terminals) carried.set(t.run, t);
    const pending = [...carried.values()], retired: Terminal[] = [];
    while (pending.length > 2) retired.push(pending.shift()!);
    const token = {}, operation: Operation = Object.freeze({ token, terminals: Object.freeze(pending), failedCleanup, ...(reached === undefined ? {} : { reached }) });
    return result({ ...state, operation }, [...settle(state, retired), ...effects.map(effect => ({ ...effect, epoch: state.epoch!, operation: token } as MotionCommand))]);
}
const stops = (state: MotionMachine): Effect[] => state.channels.map(channel => ({ type: 'stop', channel }));
const writes = (state: MotionMachine, target: string): Effect[] => state.channels.map(channel => ({ type: 'set', channel, value: state.definition.states[target]![channel]! }));
function immediate(state: MotionMachine, run: Run, retiring: readonly Terminal[] = []): MotionReduction { const next = { ...state, run: Object.freeze({ ...run, stage: 'immediate' as const }), cohort: undefined, reached: undefined }; return transaction(next, [...stops(state), ...writes(state, run.target)], [...retiring, finished(run, 'immediate')], run.target); }
function failure(state: MotionMachine): MotionReduction {
    const op = state.operation, terminals = [...(op?.terminals ?? [])];
    if (state.run && !terminals.some(t => t.run === state.run!.token))
        terminals.push({ run: state.run.token, result: { status: 'failed', target: state.run.target, code: 'CRUMBS_CSS_MOTION_DRIVER_FAILED' } });
    const failed = terminals.map(t => ({ run: t.run, result: { status: 'failed' as const, target: t.result.target, code: 'CRUMBS_CSS_MOTION_DRIVER_FAILED' as const } }));
    const next = { ...state, run: undefined, cohort: undefined, operation: undefined, reached: undefined };
    return op?.failedCleanup ? result(next, settle(next, failed)) : transaction(next, stops(state), failed, undefined, true);
}
function progress(state: MotionMachine): MotionReduction {
    const run = state.run;
    if (!run || state.operation)
        return result(state);
    if (run.stage === 'reading' && state.cohort && state.channels.every(k => Object.hasOwn(state.cohort!.samples, k))) {
        const samples = state.cohort.samples;
        return transaction({ ...state, cohort: undefined, run: Object.freeze({ ...run, stage: 'running' }) }, [...state.channels.map(channel => ({ type: 'set' as const, channel, value: samples[channel]! })), ...state.channels.map(channel => ({ type: 'start' as const, channel, run: run.token, value: state.definition.states[run.target]![channel]!, policy: run.policy }))]);
    }
    if (run.stage === 'running' && run.done.length === state.channels.length)
        return transaction({ ...state, run: undefined, reached: undefined }, stops(state), [finished(run, 'animated')], run.target);
    return result(state);
}
export function createMotionMachine(definition: NativeMotionDefinition, initial: string): MotionMachine { const d = admitMotionDefinition(definition); admitMotionTarget(d, initial); return Object.freeze({ definition: d, channels: motionChannels(d), phase: 'created', reached: initial }); }
export function currentMotionRun(state: MotionMachine): Readonly<{
    token: MotionToken;
    target: string;
}> | undefined { return state.run && Object.freeze({ token: state.run.token, target: state.run.target }); }
export function inspectMotionMachine(state: MotionMachine) { return Object.freeze({ phase: state.phase, activeRuns: state.run ? 1 as const : 0 as const, readCohorts: state.cohort ? 1 as const : 0 as const }); }
export function motionOperationIsCurrent(state: MotionMachine, epoch: MotionToken, operation: MotionToken): boolean { return state.epoch === epoch && state.operation?.token === operation; }
export function reduceMotion(state: MotionMachine, event: MotionEvent): MotionReduction {
    if (event.type === 'activate') {
        if (state.phase === 'active')
            return result(state);
        return result({ ...state, phase: 'active', epoch: event.epoch, options: event.options, run: undefined, cohort: undefined, operation: undefined }, settle(state, state.operation?.terminals ?? []));
    }
    if (event.type === 'request' || event.type === 'set')
        admitMotionTarget(state.definition, event.target);
    if (state.phase === 'created')
        return motionError(Code.MotionNotActive, 'motion', 'commands require committed activation');
    if (state.epoch !== event.epoch)
        return result(state);
    if (event.type === 'driverFailed' || event.type === 'operationSucceeded') {
        if (state.operation?.token !== event.operation)
            return result(state);
        if (event.type === 'driverFailed')
            return failure(state);
        const op = state.operation, next: MotionMachine = { ...state, operation: undefined, ...(state.run?.stage === 'immediate' ? { run: undefined } : {}), ...(op.reached === undefined ? {} : { reached: op.reached }) }, p = progress(next);
        return result(p.state, [...settle(next, op.terminals, event.operation), ...p.commands]);
    }
    if (state.phase !== 'active') {
        if (event.type === 'request')
            return result(state, settle(state, [{ run: event.run, result: { status: 'cancelled', target: event.target, reason: 'deactivated' } }]));
        return result(state);
    }
    switch (event.type) {
        case 'options': {
            const next = { ...state, options: event.options };
            return state.run && event.options.motion === 'reduced' ? immediate(next, state.run) : result(next);
        }
        case 'request': {
            if (state.run?.target === event.target)
                return result(state);
            const retiring = state.run ? [cancelled(state.run, 'superseded')] : [], policy = Object.freeze({ duration: state.options!.duration, easing: state.definition.transition.easing, motion: state.options!.motion });
            const run: Run = Object.freeze({ token: event.run, target: event.target, policy, stage: 'reading', done: Object.freeze([]) });
            if (!state.run && state.reached === event.target)
                return result(state, settle(state, [finished(run, 'immediate')]));
            if (policy.motion === 'reduced' || policy.duration === 0)
                return immediate(state, run, retiring);
            const cohort = state.cohort ?? Object.freeze({ token: event.cohort, samples: Object.freeze({}) });
            const next = { ...state, run, cohort, reached: undefined };
            if (state.cohort)
                return result(next, settle(next, retiring));
            return transaction(next, [...stops(state), ...state.channels.map(channel => ({ type: 'read' as const, channel, cohort: cohort.token }))], retiring);
        }
        case 'read': {
            if (state.cohort?.token !== event.cohort || !state.run || !state.channels.includes(event.channel) || Object.hasOwn(state.cohort.samples, event.channel))
                return result(state);
            let value: number;
            try {
                value = validateMotionChannel(event.channel, event.value);
            }
            catch {
                return failure(state);
            }
            return progress({ ...state, cohort: Object.freeze({ ...state.cohort, samples: Object.freeze({ ...state.cohort.samples, [event.channel]: value }) }) });
        }
        case 'completed': {
            const run = state.run;
            if (run?.token !== event.run || run.stage !== 'running' || !state.channels.includes(event.channel) || run.done.includes(event.channel))
                return result(state);
            if (event.finished !== true) {
                if (event.finished !== false)
                    return failure(state);
                return transaction({ ...state, run: undefined, cohort: undefined, reached: undefined }, stops(state), [cancelled(run, 'driver-stopped')]);
            }
            return progress({ ...state, run: Object.freeze({ ...run, done: Object.freeze([...run.done, event.channel]) }) });
        }
        case 'cancel': {
            if (state.run?.token !== event.run)
                return result(state);
            return transaction({ ...state, run: undefined, cohort: undefined, reached: undefined }, stops(state), [cancelled(state.run, 'cancelled')]);
        }
        case 'set': return transaction({ ...state, run: undefined, cohort: undefined, reached: undefined }, [...stops(state), ...writes(state, event.target)], state.run ? [cancelled(state.run, 'set')] : [], event.target);
        case 'deactivate': return transaction({ ...state, phase: 'inactive', run: undefined, cohort: undefined, reached: state.run ? undefined : state.reached }, stops(state), state.run ? [cancelled(state.run, 'deactivated')] : []);
    }
}
