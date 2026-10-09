import { writeFileSync } from 'node:fs';
import { defineMotion } from '../src/motion/definition';
import { createMotionOwner } from '../src/motion/owner';
import type { MotionDriver } from '../src/motion/owner';
import { admitMotionOptions } from '../src/motion/policy';
const output = process.argv[process.argv.indexOf('--output') + 1];
if (!process.argv.includes('--output') || !output)
    throw Error('Usage: native-motion.bench.ts --output file');
const rows: any[] = [];
for (const channelCount of [1, 6])
    for (const workload of ['same-target', 'immediate', 'pending-coalescing', 'completed-cancelled-cycles']) {
        type Value = {
            value: number;
            completion?: ((finished: unknown) => void) | undefined;
        };
        let creations = 0, starts = 0, reads = 0, writes = 0, stops = 0;
        let pending = new Map<Value, (v: unknown) => void>();
        const nodes: Value[] = [];
        const driver: MotionDriver = { createValue(value) { creations++; const node = { value }; nodes.push(node); return node; }, createStyle(values) { return values as never; }, stop(value, reply) { stops++; const node = value as Value; const completion = node.completion; node.completion = undefined; completion?.(false); if (reply) {
                reads++;
                if (workload === 'pending-coalescing')
                    pending.set(node, reply);
                else
                    reply(node.value);
            } }, set(value, next) { writes++; (value as Value).value = next; }, timing(value, next) { return { start(callback) { starts++; const node = value as Value; node.completion = (ok) => { if (ok === true)
                    node.value = next; callback(ok); }; }, stop() { } }; } };
        const d = channelCount === 1
            ? defineMotion({states:{resting:{opacity:.6},selected:{opacity:1}},transition:{duration:180,easing:'ease-out'}})
            : defineMotion({states:{resting:{opacity:.6,translateX:0,translateY:0,scale:1,scaleX:1,scaleY:1},selected:{opacity:1,translateX:112,translateY:-4,scale:1.1,scaleX:.9,scaleY:1.2}},transition:{duration:180,easing:'ease-out'}});
        const owner = createMotionOwner(d, 'resting', driver);
        owner.activate(admitMotionOptions(d, { initial: 'resting', motion: workload === 'immediate' ? 'reduced' : 'full' }));
        const promises: Promise<unknown>[] = [];
        const finish = () => { for (const node of nodes) {
            const f = node.completion;
            node.completion = undefined;
            f?.(true);
        } };
        const at = performance.now();
        let identityChecks = 0, cycles = workload === 'completed-cancelled-cycles' ? 10000 : 100;
        if (workload === 'pending-coalescing') {
            for (let i = 0; i < cycles; i++)
                promises.push(owner.controller.animateTo(i % 2 ? 'resting' : 'selected').result);
            if (owner.inspect().readCohorts !== 1 || pending.size !== channelCount)
                throw Error('Unbounded pending cohort');
            for (const [v, reply] of pending)
                reply(v.value);
            pending.clear();
            finish();
        }
        else if (workload === 'same-target') {
            const run = owner.controller.animateTo('selected');
            promises.push(run.result);
            for (let i = 0; i < cycles; i++) {
                if (owner.controller.animateTo('selected') !== run)
                    throw Error('Active target not reused');
                identityChecks++;
            }
            finish();
        }
        else
            for (let i = 0; i < cycles; i++) {
                const run = owner.controller.animateTo(i % 2 ? 'resting' : 'selected');
                promises.push(run.result);
                if (workload === 'completed-cancelled-cycles' && i % 3 === 0)
                    run.cancel();
                else
                    finish();
            }
        await Promise.all(promises);
        owner.deactivate();
        const stats = owner.inspect();
        if (stats.values !== channelCount || stats.activeRuns || stats.readCohorts || stats.retainedSettlements || stats.frameListeners || pending.size)
            throw Error('Owner did not drain');
        if (workload === 'same-target' && starts !== channelCount || workload === 'immediate' && (reads || starts) || workload === 'pending-coalescing' && starts !== channelCount)
            throw Error('Unexpected driver work');
        rows.push({ channelCount, workload, cycles, elapsedMs: performance.now() - at, creations, starts, reads, writes, stops, identityChecks, final: stats });
    }
writeFileSync(output, JSON.stringify({ schema: 'crumbs.m11.3.cost.v1', classification: 'diagnostic host fake-driver samples; no native FPS or release/device guarantee', environment: { bun: Bun.version, platform: process.platform, architecture: process.arch }, rows }, null, 2) + '\n');
console.log(JSON.stringify({ output, rows: rows.length }));
