import { NativeStylesDiagnosticCode as Code } from '../diagnostics';
import { admitMotionDefinition, motionError, motionRecord, validateMotionDuration } from './definition';
import type { NativeMotionDefinition, NativeMotionState, AdmittedMotionOptions } from './model';
export { validateMotionChannel, validateMotionDuration } from './definition';
export function admitMotionTarget<D extends NativeMotionDefinition>(definition: D, input: unknown): NativeMotionState<D> { const d = admitMotionDefinition(definition); if (typeof input !== 'string' || !Object.hasOwn(d.states, input))
    return motionError(Code.InvalidMotionTarget, 'motion.target', 'expected known state name'); return input as NativeMotionState<D>; }
export function admitMotionOptions<D extends NativeMotionDefinition>(definition: D, input: unknown): AdmittedMotionOptions<D> {
    const d = admitMotionDefinition(definition), code = Code.InvalidMotionOptions, x = motionRecord(input, undefined, code, 'motion.options');
    if (Object.keys(x).some(k => !['initial', 'motion', 'duration'].includes(k)) || !Object.hasOwn(x, 'initial') || !Object.hasOwn(x, 'motion') || typeof x.initial !== 'string' || !Object.hasOwn(d.states, x.initial) || (x.motion !== 'full' && x.motion !== 'reduced'))
        return motionError(code, 'motion.options', 'expected known initial state and full/reduced motion');
    let duration = d.transition.duration;
    if (Object.hasOwn(x, 'duration')) {
        try {
            duration = validateMotionDuration(x.duration);
        }
        catch {
            return motionError(code, 'motion.options.duration', 'expected finite milliseconds from 0 to 60000');
        }
    }
    return Object.freeze({ initial: x.initial as NativeMotionState<D>, motion: x.motion, duration });
}
