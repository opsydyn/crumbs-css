import { formatNativeStylesDiagnostic, NativeStylesDiagnosticCode as Code } from '../diagnostics';
import type { NativeMotionChannel, NativeMotionDefinition, NativeMotionDefinitionInput, NativeMotionEasing, ExactMotionInput } from './model';
const channels = Object.freeze(['opacity', 'translateX', 'translateY', 'scale', 'scaleX', 'scaleY'] as const);
const easings = new Set(['linear', 'ease-in', 'ease-out', 'ease-in-out']);
export function motionError(code: typeof Code[keyof typeof Code], path: string, message: string): never { throw new Error(formatNativeStylesDiagnostic(code, `${path}: ${message}`)); }
export function motionRecord(input: unknown, fields: readonly string[] | undefined, code: typeof Code[keyof typeof Code], path: string): Record<string, unknown> {
    if (typeof input !== 'object' || input === null || Array.isArray(input) || ![null, Object.prototype].includes(Object.getPrototypeOf(input)))
        return motionError(code, path, 'expected plain data record');
    const keys = Reflect.ownKeys(input);
    if (fields && (keys.length !== fields.length || fields.some(k => !Object.hasOwn(input, k))))
        return motionError(code, path, 'unexpected or missing fields');
    const data: Record<string, unknown> = Object.create(null);
    for (const key of keys) {
        const d = Object.getOwnPropertyDescriptor(input, key);
        if (typeof key !== 'string' || !d || !('value' in d) || !d.enumerable)
            return motionError(code, path, 'expected own enumerable data fields');
        Object.defineProperty(data, key, { value: d.value, enumerable: true });
    }
    return data;
}
export function validateMotionChannel(channel: NativeMotionChannel, input: unknown): number {
    if (typeof input !== 'number' || !Number.isFinite(input) || (channel === 'opacity' ? (input < 0 || input > 1) : !Number.isFinite(Math.fround(input))))
        return motionError(Code.InvalidMotionDefinition, `motion.channel.${channel}`, 'expected finite native channel value');
    return input === 0 ? 0 : input;
}
export function validateMotionDuration(input: unknown): number { if (typeof input !== 'number' || !Number.isFinite(input) || input < 0 || input > 60000)
    return motionError(Code.InvalidMotionDefinition, 'motion.duration', 'expected finite milliseconds from 0 to 60000'); return input === 0 ? 0 : input; }
function build(statesInput: unknown, transitionInput: unknown, frozen: boolean): NativeMotionDefinition {
    const code = Code.InvalidMotionDefinition, states = motionRecord(statesInput, undefined, code, 'motion.states'), names = Object.keys(states);
    if (names.length < 1 || names.length > 16)
        return motionError(code, 'motion.states', 'expected 1–16 states');
    const transition = motionRecord(transitionInput, ['duration', 'easing'], code, 'motion.transition');
    if (frozen && (!Object.isFrozen(statesInput) || !Object.isFrozen(transitionInput)))
        return motionError(code, 'motion', 'definition data must be completely frozen');
    if (typeof transition.easing !== 'string' || !easings.has(transition.easing))
        return motionError(code, 'motion.easing', 'unsupported easing');
    const duration = validateMotionDuration(transition.duration), copy: Record<string, Readonly<Partial<Record<NativeMotionChannel, number>>>> = Object.create(null);
    let keys: readonly string[] | undefined;
    for (const name of names) {
        if (name.length > 64 || !/^[A-Za-z][A-Za-z0-9._-]*$/.test(name) || ['__proto__', 'prototype', 'constructor'].includes(name))
            return motionError(code, 'motion.states', 'invalid state name');
        const raw = states[name], target = motionRecord(raw, undefined, code, `motion.states.${name}`), actual = Object.keys(target);
        if (frozen && !Object.isFrozen(raw))
            return motionError(code, `motion.states.${name}`, 'target must be frozen');
        if (actual.length < 1 || actual.some(k => !channels.includes(k as NativeMotionChannel)) || keys && (actual.length !== keys.length || keys.some(k => !Object.hasOwn(target, k))))
            return motionError(code, `motion.states.${name}`, 'states require the same nonempty supported channels');
        keys ??= actual;
        const next: Partial<Record<NativeMotionChannel, number>> = Object.create(null);
        for (const channel of channels)
            if (Object.hasOwn(target, channel))
                next[channel] = validateMotionChannel(channel, target[channel]);
        copy[name] = Object.freeze(next);
    }
    return Object.freeze({ $$type: 'crumbs.css.motion-definition', formatVersion: 1, states: Object.freeze(copy), transition: Object.freeze({ duration, easing: transition.easing as NativeMotionEasing }) }) as NativeMotionDefinition;
}
const admitted = new WeakMap<object, NativeMotionDefinition>();
export function defineMotion<const I extends NativeMotionDefinitionInput>(input: I & ExactMotionInput<I>): NativeMotionDefinition<I['states']> { const x = motionRecord(input, ['states', 'transition'], Code.InvalidMotionDefinition, 'motion'); const d = build(x.states, x.transition, false); admitted.set(d, d); return d as NativeMotionDefinition<I['states']>; }
export function admitMotionDefinition(input: unknown): NativeMotionDefinition {
    if (typeof input === 'object' && input !== null) {
        const found = admitted.get(input);
        if (found)
            return found;
    }
    const x = motionRecord(input, ['$$type', 'formatVersion', 'states', 'transition'], Code.InvalidMotionDefinition, 'motion');
    if (x.$$type !== 'crumbs.css.motion-definition')
        return motionError(Code.InvalidMotionDefinition, 'motion', 'invalid definition tag');
    if (x.formatVersion !== 1)
        return motionError(Code.MotionUnsupportedVersion, 'motion.formatVersion', 'unsupported definition format');
    if (!Object.isFrozen(input))
        return motionError(Code.InvalidMotionDefinition, 'motion', 'definition must be frozen');
    const d = build(x.states, x.transition, true);
    admitted.set(input as object, d);
    return d;
}
export function motionChannels(definition: NativeMotionDefinition): readonly NativeMotionChannel[] { const d = admitMotionDefinition(definition); const first = d.states[Object.keys(d.states)[0]!]!; return Object.freeze(channels.filter(k => Object.hasOwn(first, k))); }
