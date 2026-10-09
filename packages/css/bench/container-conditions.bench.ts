import type {NativeContainerValues} from '../src/containers/model';
import { writeFileSync } from 'node:fs';
import { defineContainer, getContainerBucket } from '../src/containers/definition';
import { admitContainerValues } from '../src/containers/values';
import { createContainerOwner } from '../src/containers/owner';
import { createContainerSelector } from '../src/containers/selector';
const output = process.argv[process.argv.indexOf('--output') + 1];
if (!output || !process.argv.includes('--output'))
    throw Error('Usage: container-conditions.bench.ts --output file');
const rows: unknown[] = [];
const warmups = 20, repetitions = 100;
for (const bucketCount of [1, 4, 16])
    for (const ownerCount of [1, 16, 64])
        for (const consumerCount of [1, 16, 64]) {
            const d = defineContainer({ owner: '@fixture/bench', name: 'card', version: 1, axis: 'width', buckets: Object.fromEntries(Array.from({ length: bucketCount }, (_, i) => ['b' + i, i * 25])) });
            const table:NativeContainerValues<typeof d,{readonly name:string}>=Object.fromEntries(['unmeasured',...d.buckets.map(b=>b.name)].map(name=>[name,Object.freeze({name})]));
            const values=admitContainerValues(d,table);
            for (const kind of ['classification', 'same-bucket', 'crossing', 'selector-hit', 'first-measurement', 'mount-unmount']) {
                if (kind === 'crossing' && bucketCount === 1) {
                    rows.push({ bucketCount, ownerCount, consumerCount, kind, status: 'not-applicable', reason: 'one measured bucket has no measured-to-measured crossing' });
                    continue;
                }
                const owners = Array.from({ length: ownerCount }, () => createContainerOwner(d)), selectors = owners.flatMap(owner => Array.from({ length: consumerCount }, () => createContainerSelector(owner, values)));
                const stops = selectors.map(s => s.subscribe(() => { }));
                for (const owner of owners)
                    owner.updateSize(0);
                let toggle = false;
                let checks = 0;
                const operation = () => { switch (kind) {
                    case 'classification':
                        for (let i = 0; i < ownerCount; i++) {
                            if (getContainerBucket(d, 0) !== 'b0')
                                throw Error('classification mismatch');
                            checks++;
                        }
                        break;
                    case 'same-bucket':
                        for (const owner of owners) {
                            if (owner.updateSize(1))
                                throw Error('same-bucket publication');
                            checks++;
                        }
                        break;
                    case 'crossing':
                        toggle = !toggle;
                        for (const owner of owners) {
                            if (!owner.updateSize(toggle ? (bucketCount - 1) * 25 : 0))
                                throw Error('missed crossing');
                            checks++;
                        }
                        break;
                    case 'selector-hit':
                        for (const selector of selectors) {
                            const a = selector.getSnapshot();
                            if (selector.getSnapshot() !== a)
                                throw Error('unstable selected reference');
                            checks++;
                        }
                        break;
                    case 'first-measurement':
                        for (let i = 0; i < ownerCount; i++) {
                            const owner = createContainerOwner(d);
                            if (!owner.updateSize(0))
                                throw Error('first measurement missing');
                            owner.deactivate();
                            checks++;
                        }
                        break;
                    case 'mount-unmount':
                        for (let i = 0; i < ownerCount; i++) {
                            const owner = createContainerOwner(d);
                            const ss = Array.from({ length: consumerCount }, () => createContainerSelector(owner, values));
                            const releases = ss.map(s => s.subscribe(() => { }));
                            for (const release of releases)
                                release();
                            owner.deactivate();
                            if (owner.inspect().listeners || ss.some(s => s.inspect().parentSubscriptions))
                                throw Error('leaked subscription');
                            checks++;
                        }
                        break;
                } };
                for (let i = 0; i < warmups; i++)
                    operation();
                const before = owners.map(o => o.inspect()), selectionBefore = selectors.map(s => s.inspect());
                const samplesMs = [];
                for (let i = 0; i < repetitions; i++) {
                    const start = performance.now();
                    operation();
                    samplesMs.push(performance.now() - start);
                }
                const after = owners.map(o => o.inspect()), selectionAfter = selectors.map(s => s.inspect());
                for (const o of owners)
                    if (o.inspect().internedSnapshots > bucketCount + 1)
                        throw Error('unbounded snapshots');
                for (const off of stops)
                    off();
                for (const owner of owners) {
                    owner.deactivate();
                    if (owner.inspect().listeners || owner.inspect().providerClaims)
                        throw Error('owner leak');
                }
                const publications = after.reduce((n, s, i) => n + s.publications - before[i]!.publications, 0), notifications = selectionAfter.reduce((n, s, i) => n + s.notifications - selectionBefore[i]!.notifications, 0);
                if (kind === 'same-bucket' && (publications || notifications))
                    throw Error('same-bucket work published');
                if (kind === 'crossing' && (publications !== ownerCount * repetitions || notifications !== ownerCount * consumerCount * repetitions))
                    throw Error('crossing counts differ');
                rows.push({ bucketCount, ownerCount, consumerCount, kind, status: 'passed', constructionIncluded: kind === 'first-measurement' || kind === 'mount-unmount', warmups, repetitions, samplesMs, operationsIncludingWarmups: checks, publications, selectorNotifications: notifications, maxInternedSnapshots: Math.max(...after.map(s => s.internedSnapshots)), finalListeners: 0, finalClaims: 0 });
            }
        }
writeFileSync(output, JSON.stringify({ schema: 'crumbs.m11.2.cost.v1', classification: 'diagnostic host samples, no numerical/device guarantee', environment: { bun: Bun.version, bunNodeCompatibility: process.version, platform: process.platform, architecture: process.arch }, rows }, null, 2) + '\n');
console.log(JSON.stringify({ output, rows: rows.length }));
