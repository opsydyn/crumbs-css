import type { Animated, ViewStyle } from 'react-native';
import { NativeStylesDiagnosticCode as Code } from '../diagnostics';
import { admitMotionDefinition, motionChannels, motionError } from './definition';
import { admitMotionOptions, admitMotionTarget } from './policy';
import { createMotionMachine, reduceMotion, currentMotionRun, inspectMotionMachine, motionOperationIsCurrent } from './machine';
import type { MotionToken, MotionEvent, MotionCommand, MotionResult } from './machine';
import type { AdmittedMotionOptions, MotionPolicy, NativeMotionDefinition, NativeMotionState, NativeMotionChannel } from './model';
import type { NativeMotionController, NativeMotionRun, NativeMotionResult } from './native-model';
export type MotionValue = object;
export type MotionAnimation = {
    start(callback: (finished: unknown) => void): void;
    stop(): void;
};
export type MotionDriver = {
    createValue(initial: number): MotionValue;
    createStyle(values: Readonly<Partial<Record<NativeMotionChannel, MotionValue>>>): Animated.WithAnimatedValue<ViewStyle>;
    stop(value: MotionValue, onValue?: (value: unknown) => void, onStopped?: () => void): true | void;
    set(value: MotionValue, next: number): void;
    timing(value: MotionValue, next: number, policy: MotionPolicy): MotionAnimation;
};
export type MotionOwner<D extends NativeMotionDefinition> = Readonly<{
    controller: NativeMotionController<D>;
    activate(options: AdmittedMotionOptions<D>): void;
    commitOptions(options: AdmittedMotionOptions<D>): void;
    deactivate(): void;
    inspect(): ReturnType<typeof inspectMotionMachine> & {
        values: number;
        retainedSettlements: number;
        frameListeners: 0;
    };
}>;
export function createMotionOwner<D extends NativeMotionDefinition>(definition: D, initial: NativeMotionState<D>, driver: MotionDriver): MotionOwner<D> {
    const d = admitMotionDefinition(definition);
    admitMotionTarget(d, initial);
    let state = createMotionMachine(d, initial), epoch: MotionToken = {}, processing = false;
    const channels = motionChannels(d), values: Partial<Record<NativeMotionChannel, MotionValue>> = Object.create(null);
    for (const channel of channels)
        values[channel] = driver.createValue(d.states[initial]![channel]!);
    const style = driver.createStyle(Object.freeze(values));
    const settlements = new Map<MotionToken, {
        run: NativeMotionRun<D>;
        resolve: (result: NativeMotionResult<D>) => void;
    }>();
    type StopAck = { type: 'stopAcknowledged'; epoch: MotionToken; operation: MotionToken; channel: NativeMotionChannel };
    type OperationWork = { epoch: MotionToken; token: MotionToken; waiting: Set<NativeMotionChannel>; corrections: Extract<MotionCommand, { type: 'set' }>[]; delayed: boolean };
    const events: (MotionEvent | StopAck)[] = [];
    let pending: OperationWork | undefined;
    function acknowledge(work: OperationWork): boolean {
        // Only a corrective write depends on the native acknowledgement. Stop/read cleanup is synchronously admitted.
        if (!work.corrections.length) work.waiting.clear();
        if (work.waiting.size || !motionOperationIsCurrent(state, work.epoch, work.token)) return false;
        let failed = false;
        if (work.delayed) {
            for (const correction of work.corrections) {
                try { driver.set(values[correction.channel]!, correction.value); }
                catch { failed = true; break; }
            }
        }
        pending = undefined;
        events.unshift({ type: failed ? 'driverFailed' : 'operationSucceeded', epoch: work.epoch, operation: work.token });
        return failed;
    }
    function send(event: MotionEvent | StopAck): boolean {
        events.push(event);
        if (processing)
            return false;
        processing = true;
        let anyFailure = false;
        try {
            while (events.length) {
                const nextEvent = events.shift()!;
                if (nextEvent.type === 'stopAcknowledged') {
                    const work = pending;
                    if (work && work.epoch === nextEvent.epoch && work.token === nextEvent.operation && motionOperationIsCurrent(state, work.epoch, work.token)) {
                        work.waiting.delete(nextEvent.channel);
                        anyFailure = acknowledge(work) || anyFailure;
                    }
                    continue;
                }
                const reduction = reduceMotion(state, nextEvent);
                state = reduction.state;
                if (pending && !motionOperationIsCurrent(state, pending.epoch, pending.token)) pending = undefined;
                let work: OperationWork | undefined, failed = false;
                for (const c of reduction.commands) {
                    if (c.type === 'settle') {
                        const record = settlements.get(c.run);
                        if (record) {
                            settlements.delete(c.run);
                            record.resolve(Object.freeze(c.result) as NativeMotionResult<D>);
                        }
                        continue;
                    }
                    if (!motionOperationIsCurrent(state, c.epoch, c.operation))
                        continue;
                    work ??= { epoch: c.epoch, token: c.operation, waiting: new Set(), corrections: [], delayed: false };
                    pending = work;
                    // Continue every stop after a failure. Skip dependent reads/writes/starts.
                    if (failed && c.type !== 'stop')
                        continue;
                    try {
                        const value = values[c.channel]!;
                        switch (c.type) {
                            case 'stop':
                                work.waiting.add(c.channel);
                                if (driver.stop(value, undefined, () => { send({ type: 'stopAcknowledged', epoch: c.epoch, operation: c.operation, channel: c.channel }); }) === true) work.delayed = true;
                                else work.waiting.delete(c.channel);
                                break;
                            case 'read':
                                driver.stop(value, sample => { send({ type: 'read', epoch: c.epoch, cohort: c.cohort, channel: c.channel, value: sample }); });
                                break;
                            case 'set':
                                work.corrections.push(c);
                                driver.set(value, c.value);
                                break;
                            case 'start':
                                driver.timing(value, c.value, c.policy).start(finished => { send({ type: 'completed', epoch: c.epoch, run: c.run, channel: c.channel, finished }); });
                                break;
                        }
                    }
                    catch {
                        failed = true;
                        anyFailure = true;
                    }
                }
                // Acknowledge first, before processing callbacks buffered by synchronous drivers.
                if (work) {
                    if (failed) {
                        pending = undefined;
                        events.unshift({ type: 'driverFailed', epoch: work.epoch, operation: work.token });
                    } else anyFailure = acknowledge(work) || anyFailure;
                }
            }
        }
        finally {
            processing = false;
            events.length = 0;
        }
        return anyFailure;
    }
    function assertActivated() { if (inspectMotionMachine(state).phase === 'created')
        motionError(Code.MotionNotActive, 'motion', 'commands require committed activation'); }
    const controller: NativeMotionController<D> = Object.freeze({ style, animateTo(target: NativeMotionState<D>) {
            admitMotionTarget(d, target);
            assertActivated();
            const current = currentMotionRun(state);
            if (current?.target === target)
                return settlements.get(current.token)!.run;
            const token = {};
            let resolve!: (result: NativeMotionResult<D>) => void;
            const result = new Promise<NativeMotionResult<D>>(done => { resolve = done; });
            const run = Object.freeze({ result, cancel() { send({ type: 'cancel', epoch, run: token }); } });
            settlements.set(token, { run, resolve });
            send({ type: 'request', epoch, run: token, target, cohort: {} });
            return run;
        }, set(target: NativeMotionState<D>) { admitMotionTarget(d, target); assertActivated(); if (send({ type: 'set', epoch, target }))
            motionError(Code.MotionDriverFailed, 'motion.set', 'native driver operation failed'); }, cancel() { assertActivated(); const current = currentMotionRun(state); if (current)
            send({ type: 'cancel', epoch, run: current.token }); } });
    return Object.freeze({ controller, activate(options: AdmittedMotionOptions<D>) { const admitted = admitMotionOptions(definition, options); if (inspectMotionMachine(state).phase === 'active')
            return; epoch = {}; send({ type: 'activate', epoch, options: admitted }); }, commitOptions(options: AdmittedMotionOptions<D>) { const admitted = admitMotionOptions(definition, options); send({ type: 'options', epoch, options: admitted }); }, deactivate() { if (inspectMotionMachine(state).phase !== 'active')
            return; send({ type: 'deactivate', epoch }); }, inspect() { return { ...inspectMotionMachine(state), values: channels.length, retainedSettlements: settlements.size, frameListeners: 0 as const }; } });
}
