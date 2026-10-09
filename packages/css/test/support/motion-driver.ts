import type { MotionDriver, MotionValue } from '../../src/motion/owner';
import type { MotionPolicy, NativeMotionChannel } from '../../src/motion/model';
type Value = {
    js: number;
    native: number;
    channel?: NativeMotionChannel;
    completion?: (finished: unknown) => void;
};
export function controlledMotionDriver() {
    const values: Value[] = [], reads: {
        value: Value;
        reply: (value: unknown) => void;
    }[] = [], timings: {
        channel: NativeMotionChannel;
        from: number;
        to: number;
        policy: MotionPolicy;
        finish: (success: unknown) => void;
    }[] = [], stops: Value[] = [], writes: {
        value: Value;
        next: number;
    }[] = [];
    const faults = { stop: undefined as NativeMotionChannel | undefined, read: undefined as NativeMotionChannel | undefined, set: undefined as NativeMotionChannel | undefined, start: undefined as NativeMotionChannel | undefined, stopCompletes: false, synchronousReads: false, synchronousFinish: undefined as boolean | undefined };
    const driver: MotionDriver = { createValue(initial) { const v: Value = { js: initial, native: initial }; values.push(v); return v; }, createStyle(nodes) { for (const [channel, value] of Object.entries(nodes))
            (value as Value).channel = channel as NativeMotionChannel; return nodes as never; }, stop(value, reply) { const v = value as Value; stops.push(v); if (faults.stopCompletes)
            v.completion?.(false); if (faults.stop === v.channel)
            throw Error('stop failure'); if (reply) {
            if (faults.read === v.channel)
                throw Error('read failure');
            reads.push({ value: v, reply });
            if (faults.synchronousReads)
                reply(v.native);
        } }, set(value, next) { const v = value as Value; writes.push({ value: v, next }); if (faults.set === v.channel)
            throw Error('set failure'); v.js = next; v.native = next; }, timing(value, to, policy) { const v = value as Value; return { start(callback) { if (faults.start === v.channel)
                throw Error('start failure'); v.completion = callback; const record = { channel: v.channel!, from: v.js, to, policy, finish(success: unknown) { if (success === true) {
                    v.js = to;
                    v.native = to;
                } callback(success); } }; timings.push(record); if (faults.synchronousFinish !== undefined)
                record.finish(faults.synchronousFinish); }, stop() { v.completion?.(false); } }; } };
    return { driver, values, reads, timings, stops, writes, faults, sample() { for (const read of [...reads])
            read.reply(read.value.native); }, setPresentation(channel: NativeMotionChannel, n: number) { values.find(v => v.channel === channel)!.native = n; }, lastTiming(channel: NativeMotionChannel) { return timings.filter(t => t.channel === channel).at(-1)!; }, finish(success: unknown = true) { for (const t of [...timings])
            t.finish(success); } };
}
